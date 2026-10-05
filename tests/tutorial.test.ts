import test from 'node:test';
import assert from 'node:assert/strict';
import { tutorialMessages, applyTutorialMessages } from '../public/tutorial-state.js';
import { defaultReservation, changeReservation, reservationDocument, reservationAction } from '../public/restaurant/booking.js';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog';

test('tutorial handles data-only updates while preserving the component tree and message history',()=>{
  const doc=reservationDocument(defaultReservation());
  const first=tutorialMessages(doc,'dinner');
  const current=applyTutorialMessages(first,'dinner');
  const next={...current,data:{...current.data,party:['3']}};
  const update=tutorialMessages(next,'dinner',current);
  assert.equal(update.length,1);assert.ok(update[0].updateDataModel);
  const result=applyTutorialMessages(update,'dinner',current);
  assert.deepEqual(result.components,current.components);assert.deepEqual(result.data.party,['3']);
  result.data.party[0]='8';assert.deepEqual(update[0].updateDataModel.value.party,['3']);
  assert.deepEqual(first[1].updateDataModel.value.party,['2']);
});
test('tutorial refuses cross-surface and incomplete exchanges without changing the previous state',()=>{
  const current=reservationDocument(defaultReservation());
  assert.throws(()=>applyTutorialMessages(tutorialMessages(current,'other'),'dinner',current));
  assert.throws(()=>applyTutorialMessages([{version:'v0.9',updateDataModel:{surfaceId:'dinner',path:'/party',value:['5']}}],'dinner',current));
  assert.throws(()=>applyTutorialMessages([],'dinner'));
  assert.deepEqual(current.data.party,['2']);
});
test('official message processor accepts the reservation lifecycle and rejects unknown component types',()=>{
  const processor=new MessageProcessor([basicCatalog],undefined,{validationConfig:{allowOrphanComponents:true,allowUnknownElements:false}});
  let state=changeReservation(defaultReservation(),{party:'4',seating:'patio',day:'tomorrow'}),current=reservationDocument(state);
  processor.processMessages(tutorialMessages(current,'sdk'));
  const surface=processor.getSurface('sdk');assert.ok(surface);
  for(const next of [changeReservation(state,{party:'6'}),reservationAction(state,'time:18:00'),reservationAction(reservationAction(state,'time:18:00'),'confirm')]){
    const doc=reservationDocument(next);processor.processMessages(tutorialMessages(doc,'sdk',current));current=doc;
    assert.equal(processor.getSurface('sdk'),surface);assert.equal(surface.dataModel.get('/stage'),next.stage);
  }
  assert.throws(()=>processor.processMessages([{version:'v0.9',updateComponents:{surfaceId:'sdk',components:[{id:'root',component:'Script',text:'bad'}]}}]));
  processor.dispose();
});
