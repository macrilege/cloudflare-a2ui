import { renderSurface } from '/renderer.js';
import { hostingMessages as messages } from '/hosting/plan.js';
import { defaultIncident, scenarios, changeIncident, actOnIncident, incidentDocument, incidentFromData } from './simulation.js';
const $=s=>document.querySelector(s);
let incident=defaultIncident(),surfaceId=crypto.randomUUID(),current,busy=false;
function say(text,user=false){const p=document.createElement('p');p.textContent=text;p.className=user?'user':'assistant';$('#thread').append(p);while($('#thread').children.length>8)$('#thread').firstElementChild.remove();$('#thread').scrollTop=$('#thread').scrollHeight;}
function record(text){const li=document.createElement('li');li.textContent=text;$('#events').append(li);while($('#events').children.length>5)$('#events').firstElementChild.remove();}
function receive(wire,source,event){
  const data=wire.find(m=>m.updateDataModel)?.updateDataModel,update=wire.find(m=>m.updateComponents)?.updateComponents;
  if(data?.surfaceId!==surfaceId||update?.surfaceId!==surfaceId)throw new Error('Incomplete incident response.');
  current={components:update.components,data:data.value};incident=incidentFromData(data.value);$('#surface').dataset.recovered=String(incident.fixed&&incident.tested);
  renderSurface($('#surface'),current,{onAction:component=>{
    if(busy)return;const action=component.action.event.context.instruction;
    const event={version:'v0.9',action:{name:'refine',surfaceId,sourceComponentId:component.id,timestamp:new Date().toISOString(),context:{instruction:action}}};
    incident=actOnIncident(incident,action);
    const feedback={inspect:'Demo evidence revealed. A relevant fix is now available.',fix:'Simulated fix applied. Run the test to verify it.',test:'Simulated test passed: 1,000 requests, 2 failures.',restart:'Incident replayed. Start a fresh investigation.'}[action];
    local(feedback,event);record(feedback);$('#feedback').textContent=feedback;$('#status').textContent='A2UI action handled locally. No AI call used.';
    $('#surface .a-button')?.focus({preventScroll:true});
  },onDataChange:(_data,change)=>{
    if(busy)return;const field=change.path.slice(1);if(!['scenario','traffic'].includes(field))return;
    incident=changeIncident(incident,{[field]:change.value[0]});
    const event={dataBindingChange:{surfaceId,sourceComponentId:change.component.id,path:change.path,value:change.value}};
    const feedback=field==='scenario'?'New incident loaded. Investigation reset.':incident.fixed?'Traffic changed. Run another simulated test.':'Traffic changed. Continue the investigation, then test your fix.';
    local(feedback,event);record(feedback);$('#feedback').textContent=feedback;$('#status').textContent='Simulation updated. No AI call used.';document.getElementById(`choice-${change.component.id}`)?.focus({preventScroll:true});
  }});
  $('#source').textContent=source;$('#wire').textContent=JSON.stringify({...(event?{userEvent:event}:{}),a2uiMessages:wire},null,2);
}
function local(message,event){const wire=messages(incidentDocument(incident,message),surfaceId).slice(current?1:0);receive(wire,'Local simulation → A2UI update',event);}
function pending(value){busy=value;$('#thread').setAttribute('aria-busy',String(value));document.querySelectorAll('button,input,select').forEach(el=>el.disabled=value);}
function reset(scenario='latency'){
  incident={...defaultIncident(),scenario};surfaceId=crypto.randomUUID();current=undefined;$('#thread').replaceChildren();$('#events').replaceChildren();$('#feedback').textContent='';$('#prompt').value='';
  local('Start with the demo evidence.');say('Pick a scenario or describe an API problem. I’ll load an interactive incident you can investigate and fix inside this lab.');record(`${scenarios[scenario].label} loaded · fictional service`);$('#status').textContent='Scenarios and incident actions use no AI calls.';
}
$('#restart').onclick=()=>reset();
document.querySelectorAll('[data-scenario]').forEach(button=>button.onclick=()=>{reset(button.dataset.scenario);say({latency:'Simulate a slow catalog API.',errors:'Simulate a bad release breaking checkout.',auth:'Simulate login failures from an expired credential.'}[button.dataset.scenario],true);say('Scenario loaded. Inspect the demo logs on the card to start.');});
$('#chat-form').onsubmit=async event=>{
  event.preventDefault();const prompt=$('#prompt').value.trim();if(busy||prompt.length<3)return;say(prompt,true);pending(true);$('#status').textContent='Choosing a demo scenario…';
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,mode:'incident',incident,surfaceId}),signal:AbortSignal.timeout(45000)});
    if(!response.ok){const error=await response.json();throw new Error(error.error||'Could not update the simulation.');}
    const wire=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));receive(wire,'Live AI → validated A2UI scenario');say(current.data.message);record(`${scenarios[incident.scenario].label} · ${incident.traffic} traffic`);$('#feedback').textContent='';$('#prompt').value='';$('#status').textContent=`Ready · ${response.headers.get('x-daily-remaining')} AI messages left today. Incident actions use no AI calls.`;
  }catch(error){$('#status').textContent=`${error.name==='TimeoutError'?'The AI took too long.':error.message} Your incident is unchanged; the scenario buttons still work.`;}
  finally{pending(false);}
};
reset();
