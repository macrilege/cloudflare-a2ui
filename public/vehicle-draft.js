import { fordCatalog, expandedBuilds, mustangTrim } from './expanded-ford-catalog.js';
import { explorerBuilds, explorerDocument, explorerOptions } from './explorer-builds.js';
import { fordConfigurations } from './ford-configurations.js';
import { conversationBuilds } from './conversation-builds.js';
import { recommendPower } from './vehicle-value.js';
export const options={
  engine:{ecoboost:'2.3L EcoBoost',v8:'5.0L V8'},
  body:{fastback:'Fastback',convertible:'Convertible'},
  color:Object.fromEntries(Object.entries(fordCatalog.gtfastback.colors).map(([key,item])=>[key,item.label])),
  transmission:{automatic:'10-speed automatic',manual:'6-speed manual'},
  wheels:{...Object.fromEntries(Object.entries(fordCatalog).filter(([trim])=>trim!=='active').flatMap(([,catalog])=>Object.entries(catalog.wheels).map(([key,item])=>[key,item.label]))),standard:'Standard wheels',bronze:'Sinister Bronze + appearance package',rtr:'RTR wheels + package',twenty:'20-inch wheels'}
};
export const fieldNames={vehicle:'Vehicle',explorerColor:'Explorer color',explorerDrive:'Drive',explorerWheels:'Explorer wheels',engine:'Engine',body:'Body style',color:'Color',transmission:'Transmission',wheels:'Wheels'};
export const emptyDraft=()=>({vehicle:'mustang',explorerColor:'white',explorerDrive:'rwd',explorerWheels:'standard',engine:'',body:'',color:'',transmission:'',wheels:'',wheelRequest:'',unsupported:'',priority:'',budget:''});
const oldStates=[
  ['ecoboost','fastback','orange','automatic','rtr'],['ecoboost','fastback','blue','automatic','rtr'],['ecoboost','fastback','blue','automatic','twenty'],
  ['v8','fastback','blue','manual','standard'],['v8','fastback','blue','automatic','standard']
];
export const capturedBuilds=fordConfigurations.map((build,i)=>({...build,state:Object.fromEntries(Object.keys(options).map((key,j)=>[key,oldStates[i][j]]))})).concat(conversationBuilds,expandedBuilds.filter(build=>build.trim!=='active'));
export function mergeDraft(draft,patch){
  const next={...emptyDraft(),...draft,...patch};
  if(patch.vehicle&&patch.vehicle!==draft.vehicle){for(const key of ['unsupported','wheelRequest','priority','budget'])if(!Object.hasOwn(patch,key))next[key]='';}
  if(Object.hasOwn(patch,'wheels')&&!Object.hasOwn(patch,'wheelRequest'))next.wheelRequest='';
  if(Object.hasOwn(patch,'explorerWheels')&&!Object.hasOwn(patch,'wheelRequest'))next.wheelRequest='';
  if(next.wheelRequest&&next.vehicle!=='explorer')next.wheels='';
  if(patch.explorerWheels&&patch.explorerWheels!=='standard'&&!Object.hasOwn(patch,'explorerDrive'))next.explorerDrive='4wd';
  if(patch.explorerDrive==='rwd'&&!Object.hasOwn(patch,'explorerWheels'))next.explorerWheels='standard';
  if(patch.engine==='ecoboost'&&!Object.hasOwn(patch,'transmission')&&next.transmission==='manual')next.transmission='automatic';
  if((patch.engine||patch.body||patch.transmission||patch.color)&&!Object.hasOwn(patch,'wheels')&&next.wheels&&!availableOptions('wheels',next)[next.wheels])next.wheels='standard';
  return next;
}
export function matchingBuild(draft){
  if(draft.unsupported||draft.wheelRequest)return undefined;
  if(draft.vehicle==='explorer')return explorerBuilds.find(build=>build.color===draft.explorerColor&&build.drive===draft.explorerDrive&&(build.wheels||'standard')===(draft.explorerWheels||'standard'));
  if(draft.wheelRequest)return undefined;
  return capturedBuilds.find(build=>Object.keys(options).every(key=>draft[key]&&draft[key]===build.state[key]));
}
// Offer only wheel paths represented by the captured examples for this body/engine.
export function availableOptions(field,draft){
  if(field==='vehicle')return {mustang:'Mustang',explorer:'Explorer'};
  if(explorerOptions[field])return explorerOptions[field];
  if(field==='transmission'&&draft.engine==='ecoboost')return {automatic:options.transmission.automatic};
  if(field!=='wheels')return options[field];
  const catalog=fordCatalog[mustangTrim(draft)];
  return Object.fromEntries(Object.entries(catalog.wheels).filter(([key,item])=>item.verified&&(!draft.engine||!draft.body||capturedBuilds.some(b=>b.state.engine===draft.engine&&b.state.body===draft.body&&b.state.wheels===key&&(!draft.color||b.state.color===draft.color)&&(!draft.transmission||b.state.transmission===(draft.engine==='ecoboost'?'automatic':draft.transmission))))).map(([key,item])=>[key,options.wheels[key]||item.label]));
}
// User-driven dropdown changes also update dependent choices, just like a configurator.
export function changeSelection(draft,field,value){
  if(!availableOptions(field,draft)?.[value])throw new Error('Unavailable selection');
  const next=mergeDraft(draft,{[field]:value});
  if(next.engine==='ecoboost'&&next.transmission==='manual')next.transmission='automatic';
  if(next.wheels&&!availableOptions('wheels',next)[next.wheels])next.wheels='standard';
  return next;
}
export function selectionMessage(before,after,field){
  const adjusted=Object.keys(fieldNames).filter(key=>key!==field&&before[key]!==after[key]);
  const wheelInfo=field==='wheels'?fordCatalog[mustangTrim(after)].wheels[after.wheels]:field==='explorerWheels'?fordCatalog.active.wheels[after.explorerWheels]:null;
  const requirement=wheelInfo&&/Adds|Requires/.test(wheelInfo.note)?` ${wheelInfo.note}.`:'';
  return `${fieldNames[field]} updated.${requirement}`+(adjusted.length?' Also changed '+adjusted.map(key=>`${fieldNames[key].toLowerCase()} to ${availableOptions(key,after)[after[key]]}`).join(' and ')+' to match.':' Your other choices stay in place.');
}
export function draftStatus(draft){
  if(draft.wheelRequest)return availableOptions('wheels',draft).bronze?'Did you mean Sinister Bronze wheels? That adds the Bronze Appearance Package.':'Choose an available wheel option above to finish your build.';
  if(draft.unsupported)return `Needs clarification: ${draft.unsupported}. Your other choices are kept. This demo only has the options shown below.`;
  if(draft.engine==='ecoboost'&&draft.transmission==='manual')return 'Choose automatic for EcoBoost, or select V8 to keep a manual transmission.';
  if(draft.color&&draft.engine&&draft.body&&draft.transmission&&draft.wheels&&!matchingBuild(draft))return 'This paint, wheel and transmission combination is not verified. Choose one of the available options below.';
  const missing=Object.keys(options).filter(key=>!draft[key]);
  if(missing.length)return `Next: choose your ${fieldNames[missing[0]].toLowerCase()}.`;
  const build=matchingBuild(draft);
  return build?'Your choices match a verified Ford build.':'Choose a compatible transmission or wheel option above to finish your build.';
}
export function draftDocument(draft,message='Tell me what your Mustang should be like.',editing=''){
  if(draft.vehicle==='explorer')return explorerDocument(draft,message);
  const build=matchingBuild(draft);
  const data={...draft,message,status:draftStatus(draft),buildId:build?.id||''};
  const components=[{id:'root',component:'Column',children:['title','status','summary','choices']},{id:'title',component:'Text',text:'Your Mustang',variant:'h2'},
    {id:'summary',component:'Column',children:[]},{id:'status',component:'Text',text:{path:'/status'},variant:'body'},
    {id:'choices',component:'Column',children:[]}];
  const button=(id,label,instruction)=>{components.push({id,component:'Button',child:`${id}-label`,variant:'default',action:{event:{name:'refine',context:{instruction}}}},{id:`${id}-label`,component:'Text',text:label});return id;};
  for(const key of ['vehicle','engine','body','transmission','color','wheels']){
    data[`${key}Selection`]=draft[key]?[draft[key]]:[];
    components[2].children.push(`select-${key}`);
    components.push({id:`select-${key}`,component:'ChoicePicker',label:fieldNames[key],variant:'mutuallyExclusive',value:{path:`/${key}Selection`},options:Object.entries(key==='wheels'?Object.fromEntries(Object.entries(fordCatalog[mustangTrim(draft)].wheels).map(([value,item])=>[value,item.label])):availableOptions(key,draft)).map(([value,label])=>({value,label}))});
  }
  if(draft.unsupported)components[4].children.push(button('clear-unsupported','Keep only the supported choices','clear:unsupported'));
  const recommendation=recommendPower(draft);
  if(recommendation){
    components[0].children.splice(2,0,'recommendation');
    data.recommendation=recommendation.text;components.push({id:'recommendation',component:'Text',text:{path:'/recommendation'},variant:'body'});
    if(recommendation.model)components[4].children.push(button('use-recommendation',`Choose ${recommendation.model.engine==='v8'?'V8':'EcoBoost'}`,`set:engine:${recommendation.model.engine}`));
  }
  return {components,data};
}
export function draftFromData(data){return Object.fromEntries(Object.keys(emptyDraft()).map(key=>[key,data[key]||'']));}
