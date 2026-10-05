import { A2uiSurface, basicCatalog } from '@a2ui/lit/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { emptyDraft, draftDocument, draftFromData, changeSelection, matchingBuild, selectionMessage, availableOptions } from '../public/vehicle-draft.js';
import { tutorialMessages } from '../public/tutorial-state.js';
void A2uiSurface;
const $=s=>document.querySelector(s);
let draft={...emptyDraft(),vehicle:'explorer'},current,surfaceId=crypto.randomUUID(),processing=false,busy=false,subscriptions=[],lastWire=[],actionCount=0;
const processor=new MessageProcessor([basicCatalog],action=>{
  if(busy)return;
  $('#sdk-event').textContent=JSON.stringify({version:'v0.9',action},null,2);actionCount++;
  if(action.name!=='refine')return;
  const instruction=action.context.instruction;
  if(instruction==='clear:unsupported'){draft={...draft,unsupported:''};local('Unsupported request cleared.');return;}
  const [verb,field,value]=String(instruction).split(':');
  if(verb==='set'&&availableOptions(field,draft)?.[value]){draft=changeSelection(draft,field,value);local('Choice applied.');return;}
  if(instruction==='review'){
    const build=matchingBuild(draft);
    $('#sdk-result').textContent=build?'Your choices match a captured configuration. Review current equipment and pricing on Ford.com.':'These choices do not match a captured build. Resolve the choice noted on the card.';
    $('#sdk-handoff').hidden=!build;if(build)$('#sdk-handoff').href=build.url;
    const update=[{version:'v0.9',updateDataModel:{surfaceId,path:'/sdkStatus',value:`Review action received (${actionCount}). ${build?'Captured configuration found.':'Resolve your choices.'}`}}];
    processor.processMessages(update);$('#sdk-wire').textContent=JSON.stringify(update,null,2);$('#sdk-data').textContent=JSON.stringify(processor.getSurface(surfaceId).dataModel.get('/'),null,2);
  }
},{validationConfig:{allowOrphanComponents:true,allowUnknownElements:false}});
function reviewDocument(doc){doc={...doc,components:doc.components.map(c=>c.id==='select-wheels'?{...c,options:c.options.filter(option=>availableOptions('wheels',draftFromData(doc.data))[option.value])}:c)};return {data:{...doc.data,sdkStatus:'Change a choice, then review the configuration.'},components:doc.components.map(c=>c.id==='root'?{...c,children:[...c.children,'sdk-status','sdk-review']}:c).concat([
  {id:'sdk-status',component:'Text',text:{path:'/sdkStatus'}},
  {id:'sdk-review',component:'Button',child:'sdk-review-label',variant:'primary',action:{event:{name:'refine',context:{instruction:'review'}}}},
  {id:'sdk-review-label',component:'Text',text:'Review configuration'}
])};}
function receive(messages){
  processing=true;
  try{
    subscriptions.forEach(s=>s.unsubscribe());subscriptions=[];
    const created=messages.find(m=>m.createSurface)?.createSurface;
    if(created)surfaceId=created.surfaceId;
    processor.processMessages(messages);
    const model=processor.getSurface(surfaceId);
    $('#sdk-surface').surface=model;
    const components=messages.find(m=>m.updateComponents)?.updateComponents.components||current.components;
    current={components,data:structuredClone(model.dataModel.get('/'))};draft=draftFromData(current.data);
    for(const c of components.filter(c=>c.component==='ChoicePicker'))subscriptions.push(model.dataModel.subscribe(c.value.path,value=>{
      if(processing||busy||!Array.isArray(value))return;
      const field=c.id.replace(/^select-/,''),selected=value[0];
      if(draft[field]===selected||!availableOptions(field,draft)?.[selected])return;
      const before=draft;draft=changeSelection(draft,field,selected);
      $('#sdk-event').textContent=JSON.stringify({binding:{surfaceId,path:c.value.path,value}},null,2);
      local(selectionMessage(before,draft,field));$('#sdk-status').textContent='Official SDK binding updated. No AI call.';
    }));
    lastWire=messages;$('#sdk-wire').textContent=JSON.stringify(messages,null,2);$('#sdk-data').textContent=JSON.stringify(current.data,null,2);
    $('#sdk-handoff').hidden=true;$('#sdk-result').textContent='';
  }finally{processing=false;}
}
function local(message){receive(tutorialMessages(reviewDocument(draftDocument(draft,message)),surfaceId,current));}
$('#sdk-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;$('#sdk-surface').inert=true;$('#sdk-submit').disabled=true;$('#sdk-status').textContent='Calling real AI…';
  const start=performance.now();
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'vehicle-chat',prompt:$('#sdk-prompt').value,draft,surfaceId}),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error((await response.json()).error||'AI request failed.');
    const wire=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
    const data=wire.find(m=>m.updateDataModel)?.updateDataModel.value,components=wire.find(m=>m.updateComponents)?.updateComponents.components;
    if(data?.view==='inventory')throw new Error('This spike covers configuration. Use the previous automotive example for inventory.');
    if(!data||!components)throw new Error('Missing configuration.');
    // The app adds one explicit review action to the validated server document.
    receive(tutorialMessages(reviewDocument({data,components}),surfaceId,current));
    $('#sdk-status').textContent=`Real AI + official renderer complete in ${((performance.now()-start)/1000).toFixed(1)}s · ${response.headers.get('x-daily-remaining')} requests left today.`;
  }catch(error){$('#sdk-status').textContent=`${error.message} Existing card controls remain available.`;}
  finally{busy=false;$('#sdk-surface').inert=false;$('#sdk-submit').disabled=false;}
};
local('Baseline Explorer example. Use a control or ask real AI to change it.');
$('#sdk-status').textContent='Official SDK rendered the baseline. No AI call yet.';
window.addEventListener('pagehide',()=>{subscriptions.forEach(s=>s.unsubscribe());processor.dispose();});
