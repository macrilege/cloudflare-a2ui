import { renderSurface } from '/renderer.js';
import { defaultHosting, mergeHosting, hostingOptions, hostingTasks, hostingDocument, hostingFromData, hostingReply, hostingMessages } from './plan.js';
const $=s=>document.querySelector(s);
let plan=defaultHosting(),done={},surfaceId=crypto.randomUUID(),current,busy=false;
function say(text,user=false){const p=document.createElement('p');p.textContent=text;p.className=user?'user':'assistant';$('#thread').append(p);while($('#thread').children.length>10)$('#thread').firstElementChild.remove();$('#thread').scrollTop=$('#thread').scrollHeight;}
function progress(){const tasks=hostingTasks(plan),count=tasks.filter(t=>done[t.id]).length;$('#progress').textContent=`${count} of ${tasks.length} tasks checked`;$('#progress-bar').max=tasks.length;$('#progress-bar').value=count;}
function trace(wire,source,event){$('#source').textContent=source;$('#wire').textContent=JSON.stringify({...(event?{dataBindingChange:event}:{}),a2uiMessages:wire},null,2);}
function show(doc,wire,source,event){
  current=doc;plan=hostingFromData(doc.data);
  renderSurface($('#surface'),doc,{onDataChange:(_data,change)=>{
    if(busy)return;
    const key=change.path.slice(1),event={surfaceId,sourceComponentId:change.component.id,path:change.path,value:change.value};
    if(key.startsWith('done_')){
      done[key.slice(5)]=change.value;progress();trace([{version:'v0.9',updateDataModel:{surfaceId,path:change.path,value:change.value}}],'Checkbox → bound A2UI data',event);return;
    }
    const before=plan;plan=mergeHosting(plan,{[key]:Array.isArray(change.value)?change.value[0]:change.value});
    // Keep only tasks that still apply. Reintroduced work starts unchecked.
    const active=new Set(hostingTasks(plan).map(t=>t.id));done=Object.fromEntries(Object.entries(done).filter(([id])=>active.has(id)));
    local(hostingReply(before,plan),false,event);$('#status').textContent='Checklist updated. No AI call used.';
    if(change.component.component==='ChoicePicker')document.getElementById(`choice-${change.component.id}`)?.focus({preventScroll:true});
    else $('#surface input[type="checkbox"]')?.focus({preventScroll:true});
  }});
  progress();trace(wire,source,event);
}
function local(message,append=true,event){const doc=hostingDocument(plan,done,message);show(doc,hostingMessages(doc,surfaceId).slice(current?1:0),'Prepared A2UI update · no AI call',event);if(append)say(message);}
function pending(value){busy=value;$('#thread').setAttribute('aria-busy',String(value));document.querySelectorAll('button,input,select').forEach(el=>el.disabled=value);}
function reset(){plan=defaultHosting();done={};current=undefined;surfaceId=crypto.randomUUID();$('#thread').replaceChildren();$('#prompt').value='';local('What are you putting online? Try an example, or describe your website. I’ll turn it into an editable hosting plan.');$('#status').textContent='Examples and controls use no AI calls.';}
const examples={
  simple:{prompt:'A simple HTML website. No database or email.',plan:{site:'static',database:false,email:'none',launch:'new'},reply:'A simple static site. Here’s your website and HTTPS checklist. Change a choice to see the plan adapt.'},
  app:{prompt:'A PHP site with a MySQL database and business email.',plan:{site:'php',database:true,email:'hosted',launch:'new'},reply:'PHP, a database and business email. I added the relevant setup steps. Try “keep email elsewhere” to change just the email part.'},
  move:{prompt:'Move my PHP database site to InterServer. Keep email at my current provider.',plan:{site:'php',database:true,email:'external',launch:'move'},reply:'A site move with email staying where it is. Start with a backup and test copy, then work through website setup.'}
};
document.querySelectorAll('[data-example]').forEach(button=>button.onclick=()=>{reset();const ex=examples[button.dataset.example];say(ex.prompt,true);plan=ex.plan;local(ex.reply);});
document.querySelectorAll('[data-followup]').forEach(button=>button.onclick=()=>{$('#prompt').value=button.dataset.followup;$('#prompt').focus();});
$('#restart').onclick=reset;
$('#download').onclick=async()=>{
  const lines=['InterServer hosting plan','Planning checklist — no account changes performed.',...['site','email','launch'].map(key=>hostingOptions[key][plan[key]]),'',...hostingTasks(plan).map(t=>`[${done[t.id]?'x':' '}] ${t.label}`)];
  try{await navigator.clipboard.writeText(lines.join('\n')+'\n');$('#status').textContent='Checklist copied. Paste it into your notes.';}
  catch{$('#status').textContent='Your browser blocked copying. You can select and copy the checklist text on the page.';}
};
$('#chat-form').onsubmit=async event=>{
  event.preventDefault();const prompt=$('#prompt').value.trim();if(busy||prompt.length<3)return;say(prompt,true);pending(true);$('#status').textContent='Reading your request…';
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,mode:'hosting',hosting:plan,surfaceId}),signal:AbortSignal.timeout(45000)});
    if(!response.ok){const error=await response.json();throw new Error(error.error||'Could not update your plan.');}
    const wire=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
    const data=wire.find(m=>m.updateDataModel)?.updateDataModel,components=wire.find(m=>m.updateComponents)?.updateComponents;
    if(data?.surfaceId!==surfaceId||components?.surfaceId!==surfaceId)throw new Error('Incomplete plan response.');
    const next=hostingFromData(data.value),active=new Set(hostingTasks(next).map(t=>t.id));
    done=Object.fromEntries(Object.entries(done).filter(([id])=>active.has(id)));
    // Model responses never complete work; carry forward only the user's checks.
    const displayData={...data.value};
    for(const key of Object.keys(displayData))if(key.startsWith('done_'))displayData[key]=done[key.slice(5)]===true;
    if(JSON.stringify(displayData)!==JSON.stringify(data.value))wire.push({version:'v0.9',updateDataModel:{surfaceId,path:'/',value:displayData}});
    show({components:components.components,data:displayData},wire,'Live AI response + local preservation of your checked tasks');say(data.value.message);$('#prompt').value='';
    $('#status').textContent=`Plan updated · ${response.headers.get('x-daily-remaining')} AI messages left today. Controls are free.`;
  }catch(error){$('#status').textContent=`${error.name==='TimeoutError'?'The AI took too long.':error.message} Your plan is unchanged. Try again or use the controls.`;}
  finally{pending(false);}
};
reset();
