import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultReservation, changeReservation, reservationAction, reservationDocument, availableTimes, seatingOptions } from '../public/restaurant/booking.js';
import { restaurantChatDocument } from '../src/restaurant-chat.ts';
import { validateDocument } from '../src/protocol.ts';

test('every offered restaurant combination has bookable demo slots and valid A2UI',()=>{
  for(const cuisine of ['italian','japanese','mexican'])for(const day of ['tonight','tomorrow','weekend'])for(const party of ['1','2','3','4','5','6','7','8']){
    let state=changeReservation(defaultReservation(),{cuisine,day,party});
    for(const seating of Object.keys(seatingOptions(state))){
      state=changeReservation(state,{seating});assert.ok(availableTimes(state).length>=2);
      validateDocument(reservationDocument(state));
      for(const time of availableTimes(state)){
        const review=reservationAction(state,`time:${time}`);assert.equal(review.stage,'review');validateDocument(reservationDocument(review));
        const confirmed=reservationAction(review,'confirm');assert.equal(confirmed.stage,'confirmed');validateDocument(reservationDocument(confirmed));
      }
    }
  }
});
test('confirmation requires a valid reviewed slot; arbitrary slots and actions fail',()=>{
  const state=defaultReservation();assert.throws(()=>reservationAction(state,'confirm'));assert.throws(()=>reservationAction(state,'time:03:00'));assert.throws(()=>reservationAction(state,'purchase'));
});
test('changing preferences clears stale times and confirmation, preserving other choices',()=>{
  let state=changeReservation(defaultReservation(),{cuisine:'mexican',party:'4',seating:'patio'});
  state=reservationAction(reservationAction(state,`time:${availableTimes(state)[0]}`),'confirm');
  const next=changeReservation(state,{party:'8'});assert.equal(next.time,'');assert.equal(next.stage,'choose');assert.equal(next.seating,'indoor');assert.equal(next.cuisine,'mexican');
});
test('unavailable requested time is not replaced with a different time',()=>{
  const state=changeReservation(defaultReservation(),{party:'8',time:'19:00'});
  assert.equal(state.time,'');assert.equal(state.stage,'choose');
});
test('model can prepare a review but cannot confirm or supply contact information',()=>{
  for(const raw of [{patch:{stage:'confirmed'}},{patch:{party:'20'}},{patch:{email:'me@example.com'}},{patch:{url:'https://example.com'}}])assert.throws(()=>restaurantChatDocument(raw,defaultReservation()));
  const doc=restaurantChatDocument({patch:{party:'4',cuisine:'mexican',seating:'patio'}},defaultReservation());
  assert.equal(doc.data.party[0],'4');assert.equal(doc.data.stage,'choose');assert.equal(doc.data.seating[0],'patio');
});

test('restaurant API keeps the shared cap and emits a review, never a confirmation',async()=>{
  const {default:worker}=await import('../src/index.ts');
  const env={RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>({calls:4})})})},AI:{run:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({patch:{cuisine:'italian',party:4,time:'19:00'}})}}]})}};
  const surfaceId=crypto.randomUUID();
  const response=await worker.fetch(new Request('https://example.com/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'restaurant',prompt:'Italian for four at 7pm',restaurant:defaultReservation(),surfaceId})}),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('x-daily-remaining'),'26');
  const wire=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(wire[0].updateDataModel.surfaceId,surfaceId);assert.equal(wire[0].updateDataModel.value.stage,'review');
});
