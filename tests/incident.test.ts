import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultIncident, changeIncident, actOnIncident, incidentMetrics, incidentDocument } from '../public/incident/simulation.js';
import { incidentChatDocument } from '../src/incident-chat.ts';
import { validateDocument } from '../src/protocol.ts';

test('each incident follows inspect, fix, test without claiming premature recovery',()=>{
  for(const scenario of ['latency','errors','auth'])for(const traffic of ['normal','high']){
    let state={...defaultIncident(),scenario,traffic};
    assert.throws(()=>actOnIncident(state,'fix'));
    assert.throws(()=>actOnIncident(state,'test'));
    state=actOnIncident(state,'inspect');assert.equal(state.inspected,true);
    const before=incidentMetrics(state);
    state=actOnIncident(state,'fix');assert.equal(state.tested,false);assert.match(incidentMetrics(state).health,/test/i);
    state=actOnIncident(state,'test');assert.equal(incidentMetrics(state).health,'Demo recovered');
    assert.ok(incidentMetrics(state).latency<before.latency);
    validateDocument(incidentDocument(state));
    state=actOnIncident(state,'restart');assert.equal(state.fixed,false);
  }
});
test('every reachable view validates as A2UI and keeps a working next action',()=>{
  for(const scenario of ['latency','errors','auth'])for(const traffic of ['normal','high']){
    let state={...defaultIncident(),scenario,traffic};
    for(const action of [null,'inspect','fix','test']){
      if(action)state=actOnIncident(state,action);
      const doc=validateDocument(incidentDocument(state));
      assert.ok(doc.components.some(c=>c.component==='Button'));
      assert.equal(doc.data.scenario[0],scenario);
    }
  }
});
test('new scenario resets diagnosis; changing traffic requires another test',()=>{
  let state=defaultIncident();for(const action of ['inspect','fix','test'])state=actOnIncident(state,action);
  const load=changeIncident(state,{traffic:'high'});assert.equal(load.fixed,true);assert.equal(load.tested,false);
  const next=changeIncident(state,{scenario:'auth'});assert.equal(next.inspected,false);assert.equal(next.fixed,false);assert.equal(next.tested,false);
  assert.deepEqual(changeIncident(state,{}),state);
});
test('model can select a simulation but cannot execute fixes or supply URLs',()=>{
  for(const raw of [{patch:{fixed:true}},{patch:{scenario:'real-production'}},{patch:{url:'https://example.com'}}])assert.throws(()=>incidentChatDocument(raw,defaultIncident()));
  const doc=incidentChatDocument({patch:{scenario:'errors',traffic:'high'}},defaultIncident());
  assert.equal(doc.data.scenario[0],'errors');assert.equal(doc.data.fixed,false);assert.equal(doc.data.traffic[0],'high');
});

test('incident API validates model output and updates the same surface',async()=>{
  const {default:worker}=await import('../src/index.ts');
  let aiCalls=0;
  const env={RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>({calls:6})})})},AI:{run:async(_model,input)=>{aiCalls++;assert.equal(input.max_tokens,600);return {choices:[{finish_reason:'stop',message:{content:JSON.stringify({patch:{scenario:'errors',traffic:'high'}})}}]};}}};
  const surfaceId=crypto.randomUUID();
  const response=await worker.fetch(new Request('https://example.com/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'incident',prompt:'Simulate a broken release under load',incident:defaultIncident(),surfaceId})}),env);
  assert.equal(response.status,200);assert.equal(aiCalls,1);assert.equal(response.headers.get('x-daily-remaining'),'24');
  const wire=(await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(wire.some(m=>m.createSurface),false);assert.equal(wire[0].updateDataModel.surfaceId,surfaceId);
  assert.equal(wire[0].updateDataModel.value.scenario[0],'errors');assert.equal(wire[0].updateDataModel.value.fixed,false);
});
