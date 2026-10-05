import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vehicleChatDocument} from '../src/vehicle-chat.ts';
import {validateDocument} from '../src/protocol.ts';
import {fordConfigurations} from '../public/ford-configurations.js';
import {engineDocument,transmissionDocument,colorDocument,wheelDocument,selectionDocument,vehicleMessages} from '../public/vehicle-documents.js';
import {emptyDraft,mergeDraft,draftDocument,matchingBuild,options,availableOptions,changeSelection,selectionMessage,capturedBuilds} from '../public/vehicle-draft.js';
import {conversationBuilds} from '../public/conversation-builds.js';
import {recommendPower} from '../public/vehicle-value.js';
import {buildPriceLink} from '../public/lessons.js';

test('guided choices and summaries use supported A2UI components',()=>{
  for(const doc of [engineDocument(),transmissionDocument(),colorDocument(),wheelDocument('blue'),wheelDocument('orange'),...fordConfigurations.map(b=>selectionDocument(b.id))])assert.doesNotThrow(()=>validateDocument(doc));
});
test('each selected build resolves to its own exact Ford token as a string',()=>{
  const tokens=['-3207239800454935606','-2902778338316211630','-944828063865847798','4802528630802029094','3462880837913721354'];
  fordConfigurations.forEach((build,i)=>{
    assert.equal(buildPriceLink(build.url),build.url);
    assert.equal(new URL(build.url).searchParams.get('config'),tokens[i]);
    const wire=vehicleMessages(selectionDocument(build.id),'test');
    assert.equal(wire[1].updateDataModel.value.buildId,build.id);
  });
  assert.throws(()=>selectionDocument('invented'));
});

test('V8 summaries preserve GT-specific engine, transmission and seats',()=>{
  for(const id of ['blue-gt-manual','blue-gt-auto']){
    const doc=selectionDocument(id);
    const texts=doc.components.filter(c=>c.component==='Text').map(c=>c.text).join(' ');
    assert.match(texts,/5.0L Ti-VCT V8/);assert.match(texts,/GT Fastback/);assert.match(texts,/cloth bucket seats/);assert.doesNotMatch(texts,/ActiveX/);
    assert.match(texts,id==='blue-gt-manual'?/6-speed manual/:/10-speed SelectShift automatic/);
    const build=fordConfigurations.find(b=>b.id===id);
    assert.equal(new URL(build.url).searchParams.get('vehicleTrim'),'gtfastback');
  }
});


test('AI patches change only requested fields on the same Mustang',()=>{
  const initial={...emptyDraft(),engine:'ecoboost',body:'convertible',color:'blue',transmission:'automatic',wheels:'standard'};
  const doc=vehicleChatDocument({message:'Changed the color.',patch:{color:'orange'}},initial);
  for(const key of ['engine','body','transmission','wheels'])assert.equal(doc.data[key],initial[key]);
  assert.equal(doc.data.color,'orange');
  const v8=vehicleChatDocument({message:'V8 selected.',patch:{engine:'v8'}},initial);
  const manual=vehicleChatDocument({message:'Manual selected.',patch:{transmission:'manual'}},{...initial,engine:'v8'});
  assert.equal(v8.data.transmission,'automatic');assert.equal(manual.data.engine,'v8');
});
test('model cannot introduce URLs, token IDs or unrecognized choices',()=>{
  for(const raw of [{message:'hello',patch:{engine:'v10'}},{message:'hello',patch:{config:'123'}},{message:'hello',patch:{},url:'https://evil.test'},{message:'hello',patch:{budget:'50k'}}])assert.throws(()=>vehicleChatDocument(raw));
});
test('ambiguous wheels block a link until the shopper chooses a supported wheel',()=>{
  const draft={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'automatic',wheels:'',wheelRequest:'sinister orange'};
  assert.equal(matchingBuild(draft),undefined);
  const doc=draftDocument(draft);assert.match(doc.data.status,/Did you mean Sinister Bronze/);
  const resolved=mergeDraft(draft,{wheels:'bronze'});
  assert.equal(resolved.wheelRequest,'');assert.equal(matchingBuild(resolved)?.id,'orange-gt-bronze-auto');
  assert.equal(matchingBuild({...resolved,transmission:'manual'})?.id,'orange-gt-bronze-manual');
});
test('incomplete, unsupported and uncaptured combinations never inherit a different build link',()=>{
  const known=conversationBuilds.find(b=>b.id==='blue-ecoboost-convertible');
  const draft={...emptyDraft(),...known.state};assert.equal(matchingBuild(draft)?.id,known.id);
  for(const patch of [{transmission:'manual'},{wheels:''},{unsupported:'red interior'},{wheelRequest:'orange wheels'},{wheels:'rtr'}])assert.equal(matchingBuild({...draft,...patch}),undefined);
});
test('every draft state and editing panel stays within the supported catalog',()=>{
  const drafts=[emptyDraft(),...conversationBuilds.map(b=>({...emptyDraft(),...b.state})),{...emptyDraft(),wheelRequest:'orange',unsupported:'red interior',priority:'value',budget:'50000'}];
  for(const draft of drafts)for(const field of ['',...Object.keys(options)])assert.doesNotThrow(()=>validateDocument(draftDocument(draft,'Test response',field)));
});
test('all conversational links preserve Ford tokens exactly as strings',()=>{
  const expected={'orange-ecoboost-convertible':'-5676729430819682700','blue-ecoboost-convertible':'-8042217992878592907','orange-gt-bronze-auto':'3318653865103773248','orange-gt-bronze-manual':'-8981290196663605791','blue-gt-bronze-auto':'-2791968887798107590','blue-gt-bronze-manual':'-8339959803251767796','orange-gt-standard-manual':'-4528060124642856696','orange-gt-standard-auto':'4925640812802791481','blue-gt-convertible-manual':'-2401701613207416191','blue-gt-convertible-auto':'6222741810542961688','orange-gt-convertible-auto':'2609424365898942126','orange-gt-convertible-manual':'3664919416959922136','orange-ecoboost-twenty':'5900514147433706943','orange-ecoboost-standard':'-4258262549367269469','blue-ecoboost-standard':'-2659405159842199146'};
  for(const b of conversationBuilds){assert.equal(buildPriceLink(b.url),b.url);assert.equal(new URL(b.url).hash,'#summary');assert.equal(new URL(b.url).searchParams.get('config'),expected[b.id]);}
});
test('power recommendations respect starting-price budget and distinguish power from cheapest',()=>{
  assert.equal(recommendPower({...emptyDraft(),priority:'value',budget:'50000'}).model.engine,'v8');
  assert.equal(recommendPower({...emptyDraft(),priority:'power',budget:'40000'}).model.engine,'ecoboost');
  assert.equal(recommendPower({...emptyDraft(),priority:'price',budget:'50000'}).model.engine,'ecoboost');
  assert.equal(recommendPower({...emptyDraft(),priority:'power',budget:'30000'}).model,undefined);
  assert.equal(recommendPower(emptyDraft()),undefined);
  assert.match(recommendPower({...emptyDraft(),priority:'value',budget:'50000'}).text,/not the price of your draft/);
});

test('choice controls avoid offering uncaptured wheel paths for a convertible or GT',()=>{
  assert.equal(availableOptions('wheels',{...emptyDraft(),body:'convertible'}).rtr,undefined);
  assert.equal(availableOptions('wheels',{...emptyDraft(),engine:'v8'}).rtr,undefined);
  assert.ok(availableOptions('wheels',{...emptyDraft(),engine:'v8'}).d2vat);
  assert.deepEqual(Object.keys(availableOptions('transmission',{...emptyDraft(),engine:'ecoboost'})),['automatic']);
});

test('numeric model budgets are bounded and normalized to string data bindings',()=>{
  const doc=vehicleChatDocument({message:'Compare value.',patch:{priority:'value',budget:50000}});
  assert.equal(doc.data.budget,'50000');
  assert.throws(()=>vehicleChatDocument({message:'Compare value.',patch:{budget:1e12}}));
});

test('an ambiguous wheel request cannot also select a model-guessed wheel',()=>{
  const doc=vehicleChatDocument({message:'Did you mean bronze?',patch:{engine:'v8',wheels:'twenty',wheelRequest:'sinister orange'}});
  assert.equal(doc.data.wheels,'');assert.equal(doc.data.buildId,'');
});

test('the displayed reply describes validated changes rather than a misleading model claim',()=>{
  const doc=vehicleChatDocument({message:'Kept everything the same.',patch:{engine:'v8',body:'fastback',color:'orange',transmission:'manual',wheelRequest:'sinister orange'}});
  assert.match(doc.data.message,/Updated your engine, body style, color, and transmission/);
  assert.match(doc.data.message,/Did you mean Sinister Bronze/);
  assert.doesNotMatch(doc.data.message,/Kept everything/);
});

test('each Mustang field is an A2UI choice picker bound to its current selection',()=>{
  const draft={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'manual',wheels:'bronze'};
  const doc=draftDocument(draft);
  const pickers=doc.components.filter(c=>c.component==='ChoicePicker');
  assert.equal(pickers.length,6);
  for(const field of ['vehicle',...Object.keys(options)]){
    const picker=pickers.find(c=>c.id===`select-${field}`);
    assert.equal(picker.variant,'mutuallyExclusive');
    assert.deepEqual(doc.data[picker.value.path.slice(1)],[draft[field]]);
    assert.deepEqual(picker.options.map(o=>o.value),Object.keys(availableOptions(field,draft)));
  }
});

test('choice-picker bindings reject scalar values, multiple selections and duplicate options',()=>{
  for(const value of ['v8',['v8','ecoboost'],true]){
    const doc=draftDocument(emptyDraft());doc.data.engineSelection=value;
    assert.throws(()=>validateDocument(doc));
  }
  const doc=draftDocument(emptyDraft());const picker=doc.components.find(c=>c.id==='select-engine');
  picker.options.push(picker.options[0]);assert.throws(()=>validateDocument(doc));
});

test('every complete combination offered by the dropdowns has an exact Ford link',()=>{
  const missing=[];
  for(const engine of Object.keys(options.engine))for(const body of Object.keys(options.body))for(const color of Object.keys(options.color)){
    const base={...emptyDraft(),engine,body,color};
    for(const transmission of Object.keys(availableOptions('transmission',base)))for(const wheels of Object.keys(availableOptions('wheels',{...base,transmission}))){
      const draft={...base,transmission,wheels};if(!matchingBuild(draft))missing.push([engine,body,color,transmission,wheels].join('/'));
    }
  }
  assert.deepEqual(missing,[],'Every offered combination must finish with a build link');
});

test('changing any offered dropdown choice from a complete build still produces a working link',()=>{
  for(const build of capturedBuilds){
    const before={...emptyDraft(),...build.state};
    for(const field of Object.keys(options))for(const value of Object.keys(availableOptions(field,before))){
      const next=changeSelection(before,field,value);
      assert.ok(matchingBuild(next),`${build.id}: ${field}=${value} must finish`);
    }
  }
});
test('dependent changes are explicit and preserve unrelated preferences',()=>{
  const before={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'manual',wheels:'bronze'};
  const next=changeSelection(before,'engine','ecoboost');
  assert.equal(next.transmission,'automatic');assert.equal(next.wheels,'bronze');
  assert.equal(next.color,'orange');assert.equal(next.body,'fastback');
  assert.match(selectionMessage(before,next,'engine'),/transmission to 10-speed automatic/);
  assert.doesNotMatch(selectionMessage(before,next,'engine'),/wheels to/);
});

test('chat engine and body changes resolve dependent choices as well',()=>{
  const prior={...emptyDraft(),engine:'v8',body:'fastback',color:'orange',transmission:'manual',wheels:'bronze'};
  const doc=vehicleChatDocument({message:'EcoBoost please',patch:{engine:'ecoboost'}},prior);
  assert.equal(doc.data.transmission,'automatic');assert.equal(doc.data.wheels,'bronze');assert.equal(doc.data.color,'orange');
  assert.ok(doc.data.buildId);assert.match(doc.data.message,/transmission/);assert.doesNotMatch(doc.data.message,/wheels/);
});

test('visual choices preserve the A2UI catalog and use trim-correct local wheel assets',async()=>{
  const {vehicleChoicePresentation}=await import('../public/vehicle-visuals.js');
  const {existsSync}=await import('node:fs');
  for(const build of capturedBuilds){
    const doc=validateDocument(draftDocument({...emptyDraft(),...build.state}));
    const picker=doc.components.find(c=>c.id==='select-wheels');
    const visual=vehicleChoicePresentation(picker,doc.data);
    for(const option of picker.options){assert.ok(visual.items[option.value].image);assert.ok(existsSync(new URL('../public'+visual.items[option.value].image,import.meta.url)));}
    if(build.state.wheels==='standard')assert.match(visual.items.standard.image,new RegExp(build.state.engine==='ecoboost'?'ecostandard':build.state.body==='convertible'?'gtconvertible':'gtstandard'));
    assert.ok(matchingBuild({...emptyDraft(),...build.state}));
  }
});

test('all nine paints and all observed trim wheels stay visible, with unverified wheels disabled',async()=>{
  const {vehicleChoicePresentation}=await import('../public/vehicle-visuals.js');
  const draft={...emptyDraft(),engine:'v8',body:'convertible',color:'blue',transmission:'automatic',wheels:'standard'};
  const doc=validateDocument(draftDocument(draft));
  assert.equal(doc.components.find(c=>c.id==='select-color').options.length,9);
  const picker=doc.components.find(c=>c.id==='select-wheels');
  assert.equal(picker.options.length,11);
  const visual=vehicleChoicePresentation(picker,doc.data);
  for(const key of ['d2vl1','d2gck','d2gdr','d2gdq']){
    assert.ok(picker.options.some(o=>o.value===key));
    assert.equal(visual.items[key].disabled,true);
    assert.match(visual.items[key].note,/Not connected in this demo/);
    assert.throws(()=>changeSelection(draft,'wheels',key));
    assert.equal(matchingBuild({...draft,wheels:key}),undefined);
    assert.match(draftDocument({...draft,wheels:key}).data.status,/not verified/);
  }
  assert.equal(visual.items.bronze.disabled,false);
  const changed=changeSelection({...draft,transmission:'manual',wheels:'twenty'},'color','orange');
  assert.equal(changed.color,'orange');assert.equal(changed.wheels,'standard');assert.ok(matchingBuild(changed));
});
