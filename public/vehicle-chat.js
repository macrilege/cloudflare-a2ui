import { inventoryExample, inventoryDocument } from './vehicle-inventory.js';
import { vehicleChoicePresentation } from './vehicle-visuals.js';
import { renderSurface } from './renderer.js';
import { vehicleMessages } from './vehicle-documents.js';
import { options, availableOptions, changeSelection, selectionMessage, fieldNames, emptyDraft, mergeDraft, draftDocument, draftFromData, matchingBuild } from './vehicle-draft.js';

export function initVehicleChat(){
  const $=s=>document.querySelector(s);
  let draft=emptyDraft(),busy=false,surfaceId,latestEvent,currentDocument,inventoryExpanded=false;
  function revealCar(){ $('#vehicle-answer').hidden=false;$('#inventory-answer').hidden=true;$('#chat-examples').hidden=true;$('#chat-suggestions').hidden=false; }
  function renderInventory(doc){
    renderSurface($('#inventory-card'),doc,{onAction:c=>{
      if(busy)return;
      inventoryExpanded=!inventoryExpanded;
      latestEvent={version:'v0.9',action:{name:'refine',surfaceId,sourceComponentId:c.id,timestamp:new Date().toISOString(),context:{instruction:'inventory:toggle'}}};
      local({...inventoryDocument(inventoryExpanded),data:currentDocument.data},'A2UI UPDATE · NO AI CALL',false);
      $('#chat-status').textContent='Equipment updated. No AI call used.';
      explain('The card responds immediately.','This button updates A2UI components locally. The trusted VIN and dealer link stay fixed; no AI or live inventory search is needed.');
    }});
    $('#inventory-link').href=inventoryExample.url;
  }
  function explain(title,detail){$('#chat-explain-title').textContent=title;$('#chat-explain-detail').textContent=detail;}
  function say(message,shopper=false){
    const p=document.createElement('p');p.className=shopper?'shopper-message':'assistant-message';p.textContent=message;$('#chat-thread').append(p);
    while($('#chat-thread').children.length>10)$('#chat-thread').firstElementChild.remove();
    $('#chat-thread').scrollTop=$('#chat-thread').scrollHeight;
  }
  function pending(value){busy=value;$('#chat-thread').setAttribute('aria-busy',String(value));$('#vehicle-chat-view').querySelectorAll('#inventory-card button,#chat-car button,#chat-car input,#chat-car select,#chat-examples button,#chat-suggestions button,#vehicle-chat-form input,#vehicle-chat-form button').forEach(el=>el.disabled=value||el.dataset.unavailable==='true');}
  function receive(wire,source,appendMessage=true){
    const create=wire.find(m=>m.createSurface)?.createSurface;
    const data=wire.find(m=>m.updateDataModel)?.updateDataModel;
    const update=wire.find(m=>m.updateComponents)?.updateComponents;
    if(!data||data.surfaceId!==surfaceId||(create&&create.surfaceId!==surfaceId)||(update&&update.surfaceId!==surfaceId))throw new Error('Incomplete vehicle response.');
    const doc={components:update?.components||currentDocument?.components,data:data.value};
    if(!doc.components)throw new Error('Missing vehicle controls.');
    currentDocument=doc;draft=draftFromData(doc.data);$('#chat-feedback').textContent='';
    if(appendMessage&&doc.data.message)say(doc.data.message);
    $('#chat-suggestions').querySelectorAll('button').forEach(button=>button.hidden=draft.vehicle==='explorer');
    $('#chat-source').textContent=source;
    if(doc.data.view==='inventory'){
      if(appendMessage)inventoryExpanded=false;
      renderInventory(doc);$('#vehicle-answer').hidden=true;$('#inventory-answer').hidden=false;$('#chat-examples').hidden=false;$('#chat-suggestions').hidden=true;
      $('#chat-wire').textContent=JSON.stringify({...(latestEvent?{shopperAction:latestEvent}:{}),a2uiMessages:wire},null,2);
      if(appendMessage)requestAnimationFrame(()=>$('#inventory-answer').scrollIntoView({block:'start'}));
      return;
    }
    $('#chat-car').dataset.color=draft.color;
    renderSurface($('#chat-car'),doc,{choicePresentation:vehicleChoicePresentation,onAction:c=>{
      if(busy)return;
      const instruction=c.action.event.context.instruction;
      latestEvent={version:'v0.9',action:{name:'refine',surfaceId,sourceComponentId:c.id,timestamp:new Date().toISOString(),context:{instruction}}};
      const [verb,field,value]=instruction.split(':');
      if(verb==='set'&&availableOptions(field,draft)?.[value]){
        choose(field,value);
      }else if(instruction==='clear:unsupported'){
        draft=mergeDraft(draft,{unsupported:''});local(draftDocument(draft,'Kept the supported choices. Complete any remaining fields.'),'A2UI UPDATE · NO AI CALL');
      }
    },onDataChange:(_data,change)=>{
      if(busy||change.component.component!=='ChoicePicker')return;
      const field=change.component.id.replace(/^select-/,'');
      const value=change.value[0];
      if(!availableOptions(field,draft)?.[value])return;
      latestEvent={dataBindingChange:{surfaceId,sourceComponentId:change.component.id,path:change.path,value:change.value}};
      choose(field,value);
      // Rendering the changed options replaces the DOM; keep keyboard focus on the field.
      const control=document.getElementById(`choice-select-${field}`);
      (control?.querySelector('input:checked')||control)?.focus({preventScroll:true});
    }});
    $('#chat-car').dataset.invalid=String(Boolean((draft.vehicle==='mustang'&&['engine','body','color','transmission','wheels'].every(key=>draft[key])&&!matchingBuild(draft))||draft.unsupported||draft.wheelRequest||(draft.vehicle==='mustang'&&draft.engine==='ecoboost'&&draft.transmission==='manual')||(draft.vehicle==='explorer'&&draft.explorerDrive==='rwd'&&draft.explorerWheels!=='standard')));
    $('#chat-car').querySelector('[data-component-id="status"]')?.setAttribute('role','status');
    revealCar();
    const build=matchingBuild(draft);$('#chat-handoff').replaceChildren();
    const handoffTitle=document.createElement('strong');handoffTitle.textContent=build?'Ready to take the next step?':'Continue to Ford with your build';$('#chat-handoff').append(handoffTitle);
    if(build){
      const a=document.createElement('a');a.className='a-button primary build-price-link';a.href=build.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Continue to Ford Build & Price ↗';
      const note=document.createElement('p');note.className='chat-purchase-note';note.textContent='Opens your selected vehicle on Ford.com with its configuration included. Review pricing and continue shopping there.';
      const details=document.createElement('details');details.className='chat-build-details';const heading=document.createElement('summary');heading.textContent='What’s in this Ford build?';const p=document.createElement('p');p.textContent=`${build.model}. ${build.interior}. ${build.equipment||''}${draft.vehicle!=='explorer'&&draft.wheels==='bronze'?' Includes the Bronze Appearance Package.':''} Review all equipment and current pricing on Ford.com.`;details.append(heading,p);$('#chat-handoff').append(a,details);
      a.after(note);
    }else{
      const missing=(draft.vehicle==='explorer'?['explorerColor','explorerDrive']:Object.keys(options)).filter(key=>!draft[key]).map(key=>fieldNames[key].toLowerCase());
      const note=document.createElement('p');note.className='chat-purchase-note';note.textContent=missing.length?`Choose your ${missing.join(', ')} above to unlock your configured Ford link.`:'Resolve the choice noted above to open your matching Ford build.';
      const button=document.createElement('button');button.className='a-button primary build-price-link';button.textContent='Continue to Ford Build & Price ↗';button.disabled=true;button.dataset.unavailable='true';$('#chat-handoff').append(button,note);
    }
    if(appendMessage)requestAnimationFrame(()=>$('#vehicle-answer').scrollIntoView({block:'start'}));
    $('#chat-wire').textContent=JSON.stringify({...(latestEvent?{shopperAction:latestEvent}:{}),a2uiMessages:wire,...(build?{applicationHandoff:{buildId:build.id,url:build.url}}:{})},null,2);
  }
  function choose(field,value){
    const before=draft;draft=changeSelection(draft,field,value);
    const message=selectionMessage(before,draft,field);
    local(draftDocument(draft,message),'A2UI UPDATE · NO AI CALL',false);
    $('#chat-feedback').textContent=message;
    $('#chat-status').textContent='Choices updated. No AI call used.';
    explain('Your selection updates the same car.',`The ${fieldNames[field].toLowerCase()} control changes its bound A2UI data. The app updates your draft, available choices and matching Ford link immediately.`);
  }
  function local(doc,source='A2UI UPDATE · NO AI CALL',appendMessage=true){
    let wire=vehicleMessages(doc,surfaceId);
    if(currentDocument){wire=wire.slice(1);if(JSON.stringify(currentDocument.components)===JSON.stringify(doc.components))wire=wire.filter(m=>!m.updateComponents);}
    receive(wire,source,appendMessage);
  }
  function reset(){
    if(busy)return;draft=emptyDraft();surfaceId=crypto.randomUUID();latestEvent=undefined;currentDocument=undefined;
    $('#chat-thread').replaceChildren();$('#chat-input').value='';
    local(draftDocument(draft,'Hi, how can I help you?'),'READY · CHOOSE A VEHICLE');
    $('#vehicle-answer').hidden=true;$('#inventory-answer').hidden=true;$('#chat-examples').hidden=false;$('#chat-suggestions').hidden=true;$('#chat-menu').hidden=true;$('#chat-menu-toggle').setAttribute('aria-expanded','false');$('#conversation-scroll').scrollTop=0;
    $('#chat-status').textContent='Suggestions and messages use live AI. Try Mustang or Explorer.';
    explain('Say it. See it. Change it.','AI reads your request. The app turns it into A2UI controls. Follow-up messages update this same car, so “make it orange” keeps your other choices.');
  }
  $('#chat-restart').onclick=reset;
  $('#chat-guided').onclick=()=>send('Build an orange Mustang GT V8 fastback with automatic transmission and Sinister Bronze wheels.');
  $('#chat-convertible').onclick=()=>send('Show me a 2026 Explorer Active in Space White with rear-wheel drive.');
  $('#chat-inventory').onclick=()=>send('Show me a real inventory example.');
  $('#chat-suggestions').querySelectorAll('button').forEach(b=>b.onclick=()=>send(b.textContent));
  $('#vehicle-chat-form').onsubmit=e=>{e.preventDefault();send($('#chat-input').value.trim());};
  async function send(prompt){
    if(busy||prompt.length<3)return;
    latestEvent=undefined;say(prompt,true);$('#chat-input').value='';pending(true);$('#chat-status').textContent='AI is reading your request…';
    try{
      const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,mode:'vehicle-chat',draft,surfaceId}),signal:AbortSignal.timeout(45000)});
      if(!response.ok){const result=await response.json();throw new Error(result.error||'Could not get a response.');}
      receive((await response.text()).trim().split('\n').map(line=>JSON.parse(line)),'LIVE AI · A2UI UPDATE');
      explain('Live AI chooses the next step. A2UI displays it.',currentDocument.data.view==='inventory'?'AI recognized an inventory request. The application retrieved its captured dealer record and sent an A2UI inventory card. This is not a live stock search.':'AI interpreted your message and returned preference changes. The application validated them, kept your other choices, and sent A2UI controls. The layout and available options come from the trusted application catalog.');
      $('#chat-status').textContent=`Done · ${response.headers.get('x-daily-remaining')} AI messages available today. Changing card controls uses no AI calls.`;
    }catch(error){$('#chat-status').textContent=error.name==='TimeoutError'?'The AI took too long. Your draft is unchanged; try again or use the card buttons.':`${error.message} Your draft is unchanged; you can still change the controls on an existing card.`;}
    finally{pending(false);}
  };
  reset();
}
