import { fordCatalog, expandedBuilds } from './expanded-ford-catalog.js';
// Exact Ford configurations captured through Build & Price on October 3, 2026.
export const explorerBuilds=[
  {
    "id": "explorer-white-rwd",
    "model": "2026 Explorer Active (200A)",
    "interior": "Dark Space Gray cloth \u00b7 second-row captain\u2019s chairs \u00b7 18-inch Sparkle Silver wheels",
    "color": "white",
    "drive": "rwd",
    "url": "https://www.ford.com/build-price/explorer/2026/choose-model/build?configId=USAExplorer2026&config=-1238614964245882021&trimConfig=-1238614964245882021&vehicleTrim=active&intcmp=nfbcChooseModel-cta-color-explorer#summary"
  },
  {
    "id": "explorer-blue-rwd",
    "model": "2026 Explorer Active (200A)",
    "interior": "Dark Space Gray cloth \u00b7 second-row captain\u2019s chairs \u00b7 18-inch Sparkle Silver wheels",
    "color": "blue",
    "drive": "rwd",
    "url": "https://www.ford.com/build-price/explorer/2026/choose-model/build?configId=USAExplorer2026&config=1645316142945544180&trimConfig=-1238614964245882021&vehicleTrim=active&intcmp=nfbcChooseModel-cta-color-explorer#summary"
  },
  {
    "id": "explorer-white-4wd",
    "model": "2026 Explorer Active (200A)",
    "interior": "Dark Space Gray cloth \u00b7 second-row captain\u2019s chairs \u00b7 18-inch Sparkle Silver wheels",
    "color": "white",
    "drive": "4wd",
    "url": "https://www.ford.com/build-price/explorer/2026/choose-model/build?configId=USAExplorer2026&config=-6695532680803383399&trimConfig=-1238614964245882021&vehicleTrim=active&intcmp=nfbcChooseModel-cta-color-explorer#summary"
  },
  {
    "id": "explorer-blue-4wd",
    "model": "2026 Explorer Active (200A)",
    "interior": "Dark Space Gray cloth \u00b7 second-row captain\u2019s chairs \u00b7 18-inch Sparkle Silver wheels",
    "color": "blue",
    "drive": "4wd",
    "url": "https://www.ford.com/build-price/explorer/2026/choose-model/build?configId=USAExplorer2026&config=2520893704962589654&trimConfig=-1238614964245882021&vehicleTrim=active&intcmp=nfbcChooseModel-cta-color-explorer#summary"
  }
].concat(expandedBuilds.filter(b=>b.trim==='active').map(b=>({...b,color:b.state.explorerColor,drive:b.state.explorerDrive,wheels:b.state.explorerWheels}))).filter((b,i,all)=>all.findIndex(x=>x.color===b.color&&x.drive===b.drive&&(x.wheels||'standard')===(b.wheels||'standard'))===i);
export const explorerOptions={explorerColor:Object.fromEntries(Object.entries(fordCatalog.active.colors).map(([key,item])=>[key,item.label])),explorerDrive:{rwd:'Rear-wheel drive',"4wd":'4WD'},explorerWheels:Object.fromEntries(Object.entries(fordCatalog.active.wheels).map(([key,item])=>[key,item.label]))};
export function explorerDocument(draft,message){
  const build=explorerBuilds.find(item=>item.color===draft.explorerColor&&item.drive===draft.explorerDrive&&(item.wheels||'standard')===(draft.explorerWheels||'standard'));
  const invalid=draft.explorerDrive==='rwd'&&draft.explorerWheels!=='standard';
  const wheel=fordCatalog.active.wheels[draft.explorerWheels||'standard'];
  const data={...draft,message,buildId:draft.unsupported||draft.wheelRequest?'':build?.id||'',status:draft.wheelRequest?`Your request for ${draft.wheelRequest} is not in this demo’s Explorer Active wheel catalog. Choose one of the wheel options below.`:invalid?'These 20-inch wheels require 4WD and the Active Comfort Package. Choose 4WD or standard wheels.':draft.unsupported?`Please clarify: ${draft.unsupported}. Choose from the Explorer Active options shown.`:'Your choices match a verified Ford Explorer build.',vehicleSelection:['explorer'],explorerColorSelection:[draft.explorerColor],explorerDriveSelection:[draft.explorerDrive],explorerWheelsSelection:[draft.explorerWheels||'standard']};
  const components=[{id:'root',component:'Column',children:['title','status','summary','equipment','actions']},
    {id:'title',component:'Text',text:'Your Explorer Active',variant:'h2'},
    {id:'summary',component:'Column',children:['select-vehicle','select-explorerColor','select-explorerDrive','select-explorerWheels']},
    {id:'select-vehicle',component:'ChoicePicker',label:'Vehicle',variant:'mutuallyExclusive',value:{path:'/vehicleSelection'},options:[{label:'Mustang',value:'mustang'},{label:'Explorer',value:'explorer'}]},
    ...Object.entries(explorerOptions).map(([key,values])=>({id:`select-${key}`,component:'ChoicePicker',label:key==='explorerColor'?'Color':key==='explorerDrive'?'Drive':'Wheels',variant:'mutuallyExclusive',value:{path:`/${key}Selection`},options:Object.entries(values).map(([value,label])=>({label,value}))})),
    {id:'equipment',component:'Text',text:`2.3L EcoBoost · 10-speed automatic\n${wheel.label}\n${wheel.note}`,variant:'body'},
    {id:'status',component:'Text',text:{path:'/status'},variant:'body'},
    {id:'actions',component:'Column',children:draft.unsupported?['clear-unsupported']:[]}];
  if(draft.unsupported)components.push({id:'clear-unsupported',component:'Button',child:'clear-label',variant:'default',action:{event:{name:'refine',context:{instruction:'clear:unsupported'}}}},{id:'clear-label',component:'Text',text:'Keep these Explorer choices'});
  return {components,data};
}
