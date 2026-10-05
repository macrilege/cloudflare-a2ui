import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDraft, changeSelection, draftDocument, draftFromData, matchingBuild } from '../public/vehicle-draft.js';
import { explorerBuilds } from '../public/explorer-builds.js';
import { inventoryDocument, inventoryExample } from '../public/vehicle-inventory.js';
import { vehicleChatDocument } from '../src/vehicle-chat.ts';
import { validateDocument } from '../src/protocol.ts';

test('each Explorer combination preserves its exact Ford configuration through every offered change',()=>{
  for(const build of explorerBuilds){
    const draft={...emptyDraft(),vehicle:'explorer',explorerColor:build.color,explorerDrive:build.drive,explorerWheels:build.wheels||'standard'};
    const doc=validateDocument(draftDocument(draft));
    assert.equal(matchingBuild(draftFromData(doc.data))?.url,build.url);
    assert.equal(new URL(build.url).searchParams.get('configId'),'USAExplorer2026');
    assert.equal(new URL(build.url).hash,'#summary');
    assert.equal(new URL(build.url).searchParams.get('trimConfig'),'-1238614964245882021');
    for(const [field,values] of Object.entries({explorerColor:['blue','white'],explorerDrive:['rwd','4wd']}))for(const value of values){
      const changed=changeSelection(draft,field,value);
      assert.ok(matchingBuild(changed));validateDocument(draftDocument(changed));
    }
  }
});
test('switching between vehicle types keeps each vehicle choices and uses the right link',()=>{
  const mustang={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'manual',wheels:'bronze'};
  const original=matchingBuild(mustang)?.url;
  const explorer=changeSelection(mustang,'vehicle','explorer');
  assert.match(matchingBuild(explorer)?.url||'',/USAExplorer2026/);
  assert.equal(matchingBuild(changeSelection(explorer,'vehicle','mustang'))?.url,original);
  assert.equal(draftDocument(explorer).components.some(c=>c.id==='select-transmission'),false);
});
test('Explorer model patches keep unmentioned drive and do not silently accept Mustang equipment',()=>{
  const current={...emptyDraft(),vehicle:'explorer',explorerDrive:'4wd'};
  const doc=vehicleChatDocument({message:'Blue.',patch:{explorerColor:'blue'}},current);
  assert.equal(doc.data.vehicle,'explorer');assert.equal(doc.data.explorerDrive,'4wd');
  assert.equal(doc.data.explorerColor,'blue');
  assert.throws(()=>vehicleChatDocument({message:'Manual.',patch:{transmission:'manual'}},current));
  const blocked=vehicleChatDocument({message:'Not available.',patch:{unsupported:'manual transmission'}},current);
  assert.equal(matchingBuild(draftFromData(blocked.data)),undefined);
  assert.ok(matchingBuild(draftFromData(vehicleChatDocument({message:'Keep automatic.',patch:{unsupported:''}},draftFromData(blocked.data)).data)));
});
test('inventory is a fixed real record rendered as A2UI, never a claim of a fresh exact match',()=>{
  for(const expanded of [false,true]){
    const doc=validateDocument(inventoryDocument(expanded));
    assert.match(JSON.stringify(doc),/not checked live/);
    assert.match(JSON.stringify(doc),new RegExp(inventoryExample.vin));
  }
  assert.equal(new URL(inventoryExample.url).hostname,'www.northcentralford.com');
});

test('AI inventory intent selects trusted A2UI and preserves the build for a follow-up',()=>{
  const current={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'automatic',wheels:'bronze'};
  const doc=vehicleChatDocument({intent:'inventory',message:'Available now!',patch:{}},current);
  assert.equal(doc.data.view,'inventory');
  assert.deepEqual(draftFromData(doc.data),current);
  assert.match(JSON.stringify(doc.components),new RegExp(inventoryExample.vin));
  assert.doesNotMatch(doc.data.message,/Available now/);
  const next=vehicleChatDocument({intent:'configure',message:'Manual.',patch:{transmission:'manual'}},draftFromData(doc.data));
  assert.equal(next.data.transmission,'manual');assert.equal(next.data.color,'orange');
  assert.ok(matchingBuild(draftFromData(next.data)));
});
test('AI inventory intent cannot supply listings or silently alter a configuration',()=>{
  for(const plan of [
    {intent:'purchase',message:'Done',patch:{}},
    {intent:'inventory',message:'Done',patch:{color:'blue'}},
    {intent:'inventory',message:'Done',patch:{},url:'https://example.com'},
    {intent:'inventory',message:'Done',patch:{vin:'fake'}}
  ])assert.throws(()=>vehicleChatDocument(plan));
});
test('inventory requests call AI and return the selected A2UI on the existing surface',async()=>{
  const {default:worker}=await import('../src/index.ts');let calls=0;
  const env={RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>({calls:4})})})},AI:{run:async()=>{calls++;return {choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:'inventory',message:'Show inventory',patch:{}})}}]};}}};
  const surfaceId=crypto.randomUUID();
  const response=await worker.fetch(new Request('https://example.com/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'vehicle-chat',prompt:'Show me a dealer listing',draft:emptyDraft(),surfaceId})}),env);
  assert.equal(response.status,200);assert.equal(calls,1);assert.equal(response.headers.get('x-daily-remaining'),'26');
  const wire=(await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(wire[0].updateDataModel.surfaceId,surfaceId);assert.equal(wire[0].updateDataModel.value.view,'inventory');
});

test('Explorer wheel dependencies adjust local selections and block explicit incompatible AI requests',()=>{
  const base={...emptyDraft(),vehicle:'explorer',explorerColor:'black'};
  const upgraded=changeSelection(base,'explorerWheels','d2fcy');
  assert.equal(upgraded.explorerDrive,'4wd');assert.ok(matchingBuild(upgraded));
  const rwd=changeSelection(upgraded,'explorerDrive','rwd');
  assert.equal(rwd.explorerWheels,'standard');assert.equal(rwd.explorerColor,'black');assert.ok(matchingBuild(rwd));
  const conflict=vehicleChatDocument({message:'Requested choices',patch:{explorerDrive:'rwd',explorerWheels:'d2fcy'}},upgraded);
  assert.match(conflict.data.status,/require 4WD/);assert.equal(matchingBuild(draftFromData(conflict.data)),undefined);
  const recolored=vehicleChatDocument({message:'White',patch:{explorerColor:'white'}},upgraded);
  assert.equal(recolored.data.explorerWheels,'d2fcy');assert.equal(recolored.data.explorerDrive,'4wd');
});
test('explicit manual EcoBoost keeps other choices and explains the conflict without a link',()=>{
  const base={...emptyDraft(),engine:'v8',body:'fastback',color:'red',transmission:'manual',wheels:'standard'};
  const doc=vehicleChatDocument({message:'Requested choices',patch:{engine:'ecoboost',transmission:'manual'}},base);
  assert.equal(doc.data.color,'red');assert.equal(doc.data.transmission,'manual');
  assert.match(doc.data.status,/Choose automatic/);assert.equal(matchingBuild(draftFromData(doc.data)),undefined);
});

test('switching from Mustang preserves new Explorer clarification and blocks the wrong build',()=>{
  const current={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'automatic',wheels:'bronze',unsupported:'old Mustang request'};
  const doc=vehicleChatDocument({message:'White Explorer with black wheels',patch:{vehicle:'explorer',explorerColor:'white',unsupported:'Black wheels are not in this demo’s Explorer Active catalog'}},current);
  assert.equal(doc.data.vehicle,'explorer');assert.equal(doc.data.explorerColor,'white');
  assert.match(doc.data.status,/Black wheels/);assert.equal(doc.data.buildId,'');
  assert.equal(matchingBuild(draftFromData(doc.data)),undefined);
  assert.equal(doc.components.some(c=>c.id==='select-engine'),false);
  const resolved=vehicleChatDocument({message:'Use standard wheels',patch:{explorerWheels:'standard'}},draftFromData(doc.data));
  assert.match(matchingBuild(draftFromData(resolved.data))?.url||'',/USAExplorer2026/);
});

test('Explorer switch accepts its automatic gearbox and keeps unavailable wheels as a clarification',()=>{
  for(const wheelPatch of [{explorerWheels:'black'},{explorerWheels:'',wheelRequest:'black wheels'},{wheelRequest:'black wheels'}]){
    const doc=vehicleChatDocument({message:'White Explorer',patch:{vehicle:'explorer',explorerColor:'white',transmission:'automatic',...wheelPatch}},emptyDraft());
    assert.equal(doc.data.vehicle,'explorer');assert.equal(doc.data.explorerColor,'white');
    assert.match(doc.data.status,/black/i);assert.equal(matchingBuild(draftFromData(doc.data)),undefined);
    assert.equal(doc.data.transmission,'');
  }
});


test('replacing an Explorer wheel request clears only that request and preserves paint and Mustang state',()=>{
  const current={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',wheels:'bronze',transmission:'manual'};
  const doc=vehicleChatDocument({message:'White Explorer',patch:{vehicle:'explorer',explorerColor:'white',wheelRequest:'black wheels'}},current);
  const draft=draftFromData(doc.data);assert.equal(draft.wheels,'bronze');
  assert.equal(matchingBuild(draft),undefined);
  for(const next of [changeSelection(draft,'explorerWheels','d2fcy'),draftFromData(vehicleChatDocument({message:'Gray wheels',patch:{explorerWheels:'d2fcy'}},draft).data)]){
    assert.equal(next.wheelRequest,'');assert.equal(next.explorerColor,'white');assert.equal(next.explorerDrive,'4wd');
    assert.match(matchingBuild(next)?.url||'',/USAExplorer2026/);assert.equal(next.wheels,'bronze');
  }
  const unresolved=changeSelection({...draft,unsupported:'red leather seats'},'explorerWheels','standard');
  assert.equal(unresolved.unsupported,'red leather seats');assert.equal(matchingBuild(unresolved),undefined);
});
