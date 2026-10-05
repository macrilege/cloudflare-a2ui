import { renderSurface } from '/renderer.js';
import { hostingMessages as messages } from '/hosting/plan.js';
import { defaultReservation, changeReservation, reservationAction, reservationDocument, reservationFromData, reservationReply } from './booking.js';
const $=s=>document.querySelector(s);
let reservation=defaultReservation(),surfaceId=crypto.randomUUID(),current,busy=false;
function say(text,user=false){const p=document.createElement('p');p.textContent=text;p.className=user?'user':'assistant';$('#thread').append(p);while($('#thread').children.length>8)$('#thread').firstElementChild.remove();$('#thread').scrollTop=$('#thread').scrollHeight;}
function receive(wire,source,event){
  const data=wire.find(m=>m.updateDataModel)?.updateDataModel,update=wire.find(m=>m.updateComponents)?.updateComponents;
  if(data?.surfaceId!==surfaceId||update?.surfaceId!==surfaceId)throw new Error('Incomplete reservation response.');
  current={components:update.components,data:data.value};reservation=reservationFromData(data.value);
  renderSurface($('#surface'),current,{onAction:c=>{
    if(busy)return;const instruction=c.action.event.context.instruction;
    const event={version:'v0.9',action:{name:'refine',surfaceId,sourceComponentId:c.id,timestamp:new Date().toISOString(),context:{instruction}}};
    reservation=reservationAction(reservation,instruction);
    const reply=reservation.stage==='confirmed'?'Demo confirmed. No actual table has been reserved.':reservation.stage==='review'?'Review your dinner plans, then confirm the demo reservation.':'Choose another demo time.';
    local(reply,event);$('#feedback').textContent=reply;$('#status').textContent='A2UI updated your booking card. No AI call used.';$('#surface .a-button')?.focus({preventScroll:true});
  },onDataChange:(_data,change)=>{
    if(busy)return;const before=reservation;reservation=changeReservation(reservation,{[change.path.slice(1)]:change.value[0]});
    const reply=reservationReply(before,reservation);local(reply,{dataBindingChange:{surfaceId,path:change.path,value:change.value}});$('#feedback').textContent=reply;document.getElementById(`choice-${change.component.id}`)?.focus({preventScroll:true});$('#status').textContent='Choices updated. No AI call used.';
  }});
  $('#source').textContent=source;$('#wire').textContent=JSON.stringify({...(event?{userEvent:event}:{}),a2uiMessages:wire},null,2);
}
function local(message,event){receive(messages(reservationDocument(reservation,message),surfaceId).slice(current?1:0),'Local booking interaction → A2UI update',event);}
function reset(){reservation=defaultReservation();surfaceId=crypto.randomUUID();current=undefined;$('#thread').replaceChildren();$('#feedback').textContent='';$('#prompt').value='';local('Choose a time.');say('Dinner for two, a patio with friends, or a bigger group? Tell me your plans and I’ll prepare an editable demo booking.');$('#status').textContent='Examples, time slots and controls use no AI calls.';}
function pending(value){busy=value;$('#thread').setAttribute('aria-busy',String(value));document.querySelectorAll('button,input,select').forEach(el=>el.disabled=value);}
const examples={date:{prompt:'Italian for two tonight.',patch:{cuisine:'italian',party:'2'}},patio:{prompt:'Mexican for four tomorrow on the patio.',patch:{cuisine:'mexican',party:'4',day:'tomorrow',seating:'patio'}},group:{prompt:'Japanese for eight this weekend.',patch:{cuisine:'japanese',party:'8',day:'weekend'}}};
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{reset();const ex=examples[b.dataset.example];say(ex.prompt,true);reservation=changeReservation(reservation,ex.patch);const reply=reservationReply(defaultReservation(),reservation);local(reply);say(reply);});
$('#restart').onclick=reset;
$('#chat-form').onsubmit=async event=>{
  event.preventDefault();const prompt=$('#prompt').value.trim();if(busy||prompt.length<3)return;say(prompt,true);pending(true);$('#status').textContent='Reading your dinner plans…';
  try{const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,mode:'restaurant',restaurant:reservation,surfaceId}),signal:AbortSignal.timeout(45000)});if(!response.ok){const error=await response.json();throw new Error(error.error||'Could not update the demo booking.');}receive((await response.text()).trim().split('\n').map(line=>JSON.parse(line)),'Live AI → validated A2UI booking');say(current.data.message);$('#feedback').textContent=current.data.message;$('#prompt').value='';$('#status').textContent=`Ready · ${response.headers.get('x-daily-remaining')} AI messages left today. Booking controls use no AI calls.`;}
  catch(error){$('#status').textContent=`${error.name==='TimeoutError'?'The AI took too long.':error.message} Your booking is unchanged. Try the controls or examples.`;}finally{pending(false);}
};
reset();
