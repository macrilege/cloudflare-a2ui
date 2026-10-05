import { renderSurface } from './renderer.js';
import { defaultReservation, changeReservation, reservationAction, reservationDocument, reservationFromData, reservationReply, cuisines, days } from './restaurant/booking.js';
import { tutorialMessages, applyTutorialMessages } from './tutorial-state.js';
const $=selector=>document.querySelector(selector);
const lessons=[
  {title:'A useful answer can go further.',description:'A paragraph can suggest a restaurant. It cannot, by itself, let you change the guest count or choose a table time.',task:'Read the request. Then turn it into an interface.',takeaway:'A2UI carries descriptions of controls and data that your application can render.'},
  {title:'The answer becomes usable.',description:'The same request now has a restaurant card, editable choices, and time buttons. These controls are rendered from the A2UI messages returned after a real AI request.',task:'Look at the four choices. The opening request asks for: Italian, tomorrow, four people, patio.',takeaway:'The application controls the catalog and appearance. The assistant supplies the intent and preferences.'},
  {title:'A click becomes shared context.',description:'The controls are bound to reservation data. Changing one preference keeps the others and updates the interface immediately.',task:'Change Party size to 2 guests. Watch the shared data below the card. Cuisine, day, and patio stay in place.',takeaway:'No AI call is needed for a control change. The next AI request includes the updated reservation.'},
  {title:'A follow-up changes the options.',description:'“Actually, make it six.” Live AI interprets the follow-up and changes the guest count. The demo’s rules require indoor seating and offer two times for larger groups.',task:'Compare the new seating and times. Your cuisine and day were kept. Open the inspector to see the updated components.',takeaway:'One surface adapts to new context. Application rules determine availability; the model does not invent it.'},
  {title:'An action moves the task forward.',description:'A time button carries an action. The application handles it and updates this surface with a review card. Confirmation is a separate step.',task:'Choose 5:30 PM or 8:00 PM. Review the details, then click Confirm demo reservation.',takeaway:'A2UI describes the interaction. Your backend owns authorization, validation, and real-world effects.'}
];
let state=defaultReservation(),surfaceId=crypto.randomUUID(),current,wire=[],lastEvent=null,step=0,live=false,busy=false,inspect='messages';
function say(text,user=false){const p=document.createElement('p');p.className=user?'message user-message':'message assistant-message';p.textContent=text;$('#thread').append(p);while($('#thread').children.length>4)$('#thread').firstElementChild.remove();}
function inspectOutput(){return inspect==='data'?current?.data||{}:inspect==='event'?lastEvent||{note:'No control or button interaction yet.'}:wire;}
function updateInspector(){
  $('#wire').textContent=JSON.stringify(inspectOutput(),null,2);
  $('#wire-explanation').textContent=!current?'No A2UI has been sent yet. Render the interface to inspect its first messages.':wire.some(m=>m.createSurface)?'createSurface establishes the surface. updateDataModel supplies its state. updateComponents supplies its controls.':wire.some(m=>m.updateComponents)?'The same surface receives updated data and components. Its controls now reflect the current booking step and available choices.':'Only updateDataModel was needed. The existing components use the new bound values.';
  document.querySelectorAll('[data-inspect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inspect===inspect)));
}
function paintState(before){
  $('#state-strip').replaceChildren();
  for(const [key,label,value] of [['cuisine','Cuisine',cuisines[state.cuisine]],['day','When',days[state.day]],['party','Guests',state.party],['seating','Seating',state.seating==='patio'?'Patio':'Inside']]){
    const cell=document.createElement('div'),title=document.createElement('span'),text=document.createElement('strong');title.textContent=label;text.textContent=value;cell.append(title,text);if(before&&before[key]!==state[key]){cell.className='changed';const mark=document.createElement('small');mark.textContent='updated';cell.append(mark);}$('#state-strip').append(cell);
  }
}
function receive(messages,source,event=null){
  const previous=state;
  const next=applyTutorialMessages(messages,surfaceId,current);
  current=next;state=reservationFromData(next.data);wire=messages;lastEvent=event;
  $('#surface').hidden=false;$('#text-answer').hidden=true;$('#state-strip').hidden=false;$('#prepared-request').hidden=true;
  renderSurface($('#surface'),current,{onDataChange:(_data,change)=>{
    if(busy)return;
    const before=state,nextState=changeReservation(state,{[change.path.slice(1)]:change.value[0]});
    update(nextState,reservationReply(before,nextState),{dataBindingChange:{surfaceId,sourceComponentId:change.component.id,path:change.path,value:change.value}});
    $('#status').textContent='Choice updated locally. No AI call used.';
    document.getElementById(`choice-${change.component.id}`)?.focus({preventScroll:true});
  },onAction:component=>{
    if(busy)return;
    const instruction=component.action.event.context.instruction,nextState=reservationAction(state,instruction);
    const event={version:'v0.9',action:{name:'refine',surfaceId,sourceComponentId:component.id,timestamp:new Date().toISOString(),context:{instruction}}};
    const reply=nextState.stage==='confirmed'?'Demo confirmed. No table was reserved.':nextState.stage==='review'?'Your selected time is ready to review. Nothing has been booked.':'Choose another sample time.';
    update(nextState,reply,event);$('#status').textContent='Button action handled locally. No AI call used.';
    $('#surface [data-component-id="booking-title"]').setAttribute('tabindex','-1');$('#surface [data-component-id="booking-title"]').focus({preventScroll:true});
  }});
  $('#feedback').textContent=current.data.message;$('#surface').dataset.stage=state.stage;
  paintState(previous);updateInspector();$('#mode-label').textContent=source;
}
function update(next,message,event){receive(tutorialMessages(reservationDocument(next,message),surfaceId,current),'LOCAL A2UI UPDATE · NO AI CALL',event);}
function lessonUI(){
  const lesson=lessons[step];
  $('#lesson-kicker').textContent=live?'EXPLORE AT YOUR OWN PACE':`LESSON ${String(step+1).padStart(2,'0')} / 05`;
  $('#lesson-title').textContent=live?'Your words. The same working card.':lesson.title;
  $('#lesson-description').textContent=live?'Describe your dinner or change one detail. Live AI extracts preferences; the application validates them and returns an updated A2UI surface.':lesson.description;
  $('#lesson-task').textContent=live?'Try “Japanese for two this weekend,” then “make it four.” Or use the card controls without an AI call.':lesson.task;
  $('#lesson-takeaway').textContent=live?'The restaurants and times stay fictional. The model cannot confirm a booking.':lesson.takeaway;
  $('#lesson-nav').hidden=live;$('.lesson-controls').hidden=live;$('#previous').disabled=busy||step===0;
  $('#next').textContent=step===0?'See the interface →':step===4?'Replay tutorial ↺':'Next lesson →';
  document.querySelectorAll('[data-step]').forEach(button=>{if(Number(button.dataset.step)===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  $('#guided-mode').setAttribute('aria-pressed',String(!live));$('#live-mode').setAttribute('aria-pressed',String(live));$('#live-form').hidden=!live;
}
function fresh(){state=defaultReservation();surfaceId=crypto.randomUUID();current=undefined;wire=[];lastEvent=null;$('#thread').replaceChildren();$('#surface').replaceChildren();$('#surface').hidden=true;$('#state-strip').hidden=true;$('#text-answer').hidden=false;$('#feedback').textContent='';$('#prompt').value='';}
async function goStep(target){
  if(busy)return;
  live=false;lessonUI();
  if(target===0){
    step=0;fresh();say('Italian for four tomorrow. Somewhere with a patio.',true);
    $('#prepared-request').hidden=false;$('#mode-label').textContent='GUIDED TUTORIAL · REAL AI';
    $('#status').textContent='The opening request and follow-up use real AI. Card controls use no AI calls.';
    updateInspector();lessonUI();return;
  }
  if(!current){
    const success=await sendAI('Italian for four tomorrow. Somewhere with a patio.',false);
    if(!success){lessonUI();return;}
  }
  if(target===3||(target===4&&step<3)){
    if(!await sendAI('Actually, make it six.')){lessonUI();return;}
  }
  step=target;lessonUI();
}
function startLive(){
  if(busy)return;live=true;
  $('#prepared-request').hidden=true;$('#text-answer').hidden=true;
  $('#mode-label').textContent='LIVE PLAYGROUND · REAL AI';
  $('#status').textContent='Messages call real AI. Card controls are local. Submit a request to begin.';
  lessonUI();$('#lab').scrollIntoView({block:'start'});$('#prompt').focus({preventScroll:true});
}
function pending(value){busy=value;$('#surface').setAttribute('aria-busy',String(value));document.querySelectorAll('button, input, select').forEach(el=>el.disabled=value);lessonUI();}
async function sendAI(prompt,append=true){
  if(busy||prompt.length<3)return false;
  if(append)say(prompt,true);
  pending(true);$('#status').textContent='AI is reading your dinner plans…';
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,mode:'restaurant',restaurant:state,...(current?{surfaceId}:{})}),signal:AbortSignal.timeout(45000)});
    if(!response.ok){const result=await response.json();throw new Error(result.error||'Could not update your dinner plans.');}
    const messages=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
    const created=messages.find(message=>message.createSurface)?.createSurface;
    const nextSurfaceId=created?.surfaceId||surfaceId;
    // Check the complete exchange before replacing the current surface or state.
    applyTutorialMessages(messages,nextSurfaceId,current);
    surfaceId=nextSurfaceId;
    receive(messages,'LIVE AI · VALIDATED A2UI');say(current.data.message);$('#prompt').value='';
    $('#status').textContent=`Updated by real AI · ${response.headers.get('x-daily-remaining')} requests left today. Card controls use no AI calls.`;
    return true;
  }catch(error){
    $('#status').textContent=`${error.name==='TimeoutError'?'The AI took too long.':error.message} Your reservation is unchanged.${current?' Existing card controls still work.':' Please retry when the service is available.'}`;
    return false;
  }finally{pending(false);}
}
$('#live-form').onsubmit=async event=>{event.preventDefault();await sendAI($('#prompt').value.trim());};
$('#next').onclick=()=>goStep(step===4?0:step+1,true);$('#previous').onclick=()=>goStep(step-1);$('#prepared-request').onclick=()=>goStep(1,true);
$('#guided-mode').onclick=()=>goStep(0);$('#live-mode').onclick=startLive;document.querySelectorAll('[data-live]').forEach(b=>b.onclick=startLive);
$('#restart').onclick=()=>{if(live){fresh();startLive();}else goStep(0);};
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>goStep(Number(b.dataset.step)));
document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{inspect=b.dataset.inspect;updateInspector();});
$('#copy-wire').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(inspectOutput(),null,2));$('#copy-wire').textContent='Copied';}catch{$('#copy-wire').textContent='Select JSON to copy';}setTimeout(()=>$('#copy-wire').textContent='Copy JSON',2000);};
goStep(0);
