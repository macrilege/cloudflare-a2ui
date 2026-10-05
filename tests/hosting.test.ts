import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultHosting, mergeHosting, hostingTasks, hostingDocument } from '../public/hosting/plan.js';
import { hostingChatDocument } from '../src/hosting-chat.ts';
import { validateDocument } from '../src/protocol.ts';

test('all hosting combinations produce a valid, usable A2UI document',()=>{
  for(const site of ['static','php'])for(const email of ['hosted','external','none'])for(const launch of ['new','move'])for(const database of [true,false]){
    const plan=mergeHosting(defaultHosting(),{site,email,launch,database});
    const doc=validateDocument(hostingDocument(plan));
    assert.equal(doc.data.database,site==='php'&&database);
    assert.equal(doc.components.some(c=>c.id==='task-database'),plan.database);
    assert.equal(doc.components.some(c=>c.id==='task-mailbox'),email==='hosted');
    assert.equal(doc.components.some(c=>c.id==='task-backup'),launch==='move');
  }
});
test('follow-ups preserve unmentioned choices and common completed tasks',()=>{
  const before=mergeHosting(defaultHosting(),{site:'php',database:true,email:'hosted',launch:'move'});
  const after=mergeHosting(before,{email:'external'});
  const doc=hostingDocument(after,{domain:true,mailbox:true,database:true});
  assert.equal(after.site,'php');assert.equal(after.launch,'move');assert.equal(after.database,true);
  assert.equal(doc.data.done_domain,true);assert.equal(doc.data.done_database,true);
  assert.equal(doc.data.done_mailbox,undefined);
  assert.ok(hostingTasks(after).some(t=>t.id==='externalmail'));
});
test('static sites remove databases; new task completion defaults to unchecked',()=>{
  const plan=mergeHosting({...defaultHosting(),site:'php',database:true},{site:'static'});
  assert.equal(plan.database,false);
  assert.equal(hostingDocument({...plan,email:'hosted'}).data.done_mailbox,false);
});
test('model boundary rejects invalid fields and cannot mark tasks completed',()=>{
  for(const raw of [{patch:{site:'vps'}},{patch:{deploy:true}},{patch:{database:'yes'}},{patch:{},done:{domain:true}}]){
    assert.throws(()=>hostingChatDocument(raw,defaultHosting()));
  }
});
test('AI updates the plan through validated A2UI without inventing an executed action',()=>{
  const doc=hostingChatDocument({patch:{site:'php',database:true,email:'hosted'}},defaultHosting());
  assert.equal(doc.data.site[0],'php');assert.equal(doc.data.email[0],'hosted');
  assert.match(String(doc.data.message),/PHP site/);
  assert.equal(doc.data.done_domain,false);
});

test('hosting API reuses the surface, limits model tokens and reserves daily usage',async()=>{
  const {default:worker}=await import('../src/index.ts');
  let reservations=0,modelInput;
  const env={RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>{reservations++;return {calls:5};}})})},AI:{run:async(_model,input)=>{modelInput=input;return {choices:[{finish_reason:'stop',message:{content:JSON.stringify({patch:{email:'hosted'}})}}]};}}};
  const surfaceId=crypto.randomUUID();
  const response=await worker.fetch(new Request('https://example.com/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'hosting',prompt:'Add business email',hosting:defaultHosting(),surfaceId})}),env);
  assert.equal(response.status,200);assert.equal(reservations,1);assert.equal(modelInput.max_tokens,600);
  assert.equal(response.headers.get('x-daily-remaining'),'25');
  const wire=(await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(wire.some(m=>m.createSurface),false);
  assert.equal(wire[0].updateDataModel.surfaceId,surfaceId);
  assert.equal(wire[0].updateDataModel.value.email[0],'hosted');
});
test('hosting API honors the shared daily cap before calling AI',async()=>{
  const {default:worker}=await import('../src/index.ts');
  const env={RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>null})})},AI:{run:()=>{throw new Error('AI must not be called');}}};
  const response=await worker.fetch(new Request('https://example.com/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'hosting',prompt:'A PHP website',hosting:defaultHosting()})}),env);
  assert.equal(response.status,429);
});
