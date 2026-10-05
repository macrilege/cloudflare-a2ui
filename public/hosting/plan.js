export const hostingOptions={
  site:{static:'HTML / static site',php:'PHP site'},
  email:{none:'No email needed',hosted:'Host email here',external:'Keep email elsewhere'},
  launch:{new:'New site',move:'Move an existing site'}
};
export const defaultHosting=()=>({site:'static',database:false,email:'none',launch:'new'});
export function mergeHosting(current,patch){
  const plan={...current,...patch};
  if(plan.site==='static')plan.database=false;
  return plan;
}
export function hostingTasks(plan){
  const tasks=[];
  if(plan.launch==='move')tasks.push({id:'backup',group:'move',label:'Back up the existing site and any databases before making changes.'},{id:'preview',group:'move',label:'Test a copy on the new host before switching website DNS.'});
  tasks.push({id:'domain',group:'site',label:'Add the domain to the correct DirectAdmin user account.'});
  if(plan.site==='php')tasks.push({id:'runtime',group:'site',label:'Check that the host’s PHP version and extensions support your application.'});
  tasks.push({id:plan.site==='php'?'phpfiles':'staticfiles',group:'site',label:plan.site==='php'?'Upload the application; keep private configuration outside public_html.':'Upload the built HTML, CSS and JavaScript to public_html.'});
  if(plan.database)tasks.push({id:'database',group:'site',label:'Create a database and user; import data and test the connection.'});
  tasks.push({id:'dns',group:'site',label:'Set website DNS at the authoritative DNS provider after testing.'},{id:'ssl',group:'site',label:'Issue a valid SSL certificate and verify the site over HTTPS.'});
  if(plan.email==='hosted')tasks.push({id:'mailbox',group:'email',label:'Create the required mailboxes in DirectAdmin.'},{id:'maildns',group:'email',label:'Set MX, SPF and DKIM at the active DNS host; review DMARC.'},{id:'mailtest',group:'email',label:'Test sending and receiving with the server’s valid TLS hostname.'});
  if(plan.email==='external')tasks.push({id:'externalmail',group:'email',label:'Preserve the current provider’s MX and email authentication records.'});
  return tasks;
}
export function hostingDocument(plan,done={},message='Your plan is ready to edit.'){
  const data={site:[plan.site],email:[plan.email],launch:[plan.launch],database:plan.database,message};
  const components=[{id:'root',component:'Column',children:['settings',...['move','site','email'].filter(group=>hostingTasks(plan).some(t=>t.group===group)).map(group=>`${group}-card`)]}];
  const fields=['site','email','launch'];
  components.push({id:'settings',component:'Card',child:'settings-body'},{id:'settings-body',component:'Column',children:['settings-title',...fields.map(f=>`select-${f}`),...(plan.site==='php'?['database-choice']:[])]},{id:'settings-title',component:'Text',text:'Your hosting setup',variant:'h2'});
  const labels={site:'Website',email:'Email',launch:'Starting point'};
  for(const field of fields)components.push({id:`select-${field}`,component:'ChoicePicker',label:labels[field],variant:'mutuallyExclusive',options:Object.entries(hostingOptions[field]).map(([value,label])=>({value,label})),value:{path:`/${field}`}});
  if(plan.site==='php')components.push({id:'database-choice',component:'CheckBox',label:'This site needs a MySQL database',value:{path:'/database'}});
  const titles={move:'Before you move',site:'Website & HTTPS',email:plan.email==='hosted'?'Business email':'Keep your existing email'};
  for(const group of ['move','site','email']){
    const tasks=hostingTasks(plan).filter(t=>t.group===group);if(!tasks.length)continue;
    components.push({id:`${group}-card`,component:'Card',child:`${group}-body`},{id:`${group}-body`,component:'Column',children:[`${group}-title`,...tasks.map(t=>`task-${t.id}`)]},{id:`${group}-title`,component:'Text',text:titles[group],variant:'h3'});
    for(const task of tasks){data[`done_${task.id}`]=done[task.id]===true;components.push({id:`task-${task.id}`,component:'CheckBox',label:task.label,value:{path:`/done_${task.id}`}});}
  }
  return {components,data};
}
export function hostingFromData(data){return mergeHosting(defaultHosting(),{site:data.site[0],email:data.email[0],launch:data.launch[0],database:data.database});}
export function hostingReply(before,after){
  const changes=[];
  for(const field of ['site','email','launch'])if(before[field]!==after[field])changes.push(hostingOptions[field][after[field]]);
  if(before.database!==after.database)changes.push(after.database?'database added':'database removed');
  return changes.length?`Plan updated: ${changes.join(' · ')}. Your checklist now matches these choices.`:'Your setup already matches. You can adjust the choices and check off tasks as you complete them.';
}
export function hostingMessages(doc,surfaceId){return [{version:'v0.9',createSurface:{surfaceId,catalogId:'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'}},{version:'v0.9',updateDataModel:{surfaceId,path:'/',value:doc.data}},{version:'v0.9',updateComponents:{surfaceId,components:doc.components}}];}
