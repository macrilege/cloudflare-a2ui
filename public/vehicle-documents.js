import { fordConfigurations } from './ford-configurations.js';
const text=(id,value,variant='body')=>({id,component:'Text',text:value,variant});
const column=(id,children)=>({id,component:'Column',children});
const button=(id,label,instruction)=>[
  {id,component:'Button',child:`${id}-label`,variant:'primary',action:{event:{name:'refine',context:{instruction}}}},
  text(`${id}-label`,label)
];
export function choiceDocument(ids,message){
  const builds=[...new Set(ids)].map(id=>fordConfigurations.find(build=>build.id===id));
  if(builds.some(build=>!build))throw new Error('Unknown configuration');
  return {components:[column('root',['reply',...builds.map(b=>b.id)]),text('reply',message),...builds.flatMap(b=>[
    {id:b.id,component:'Card',child:`${b.id}-content`},
    column(`${b.id}-content`,[`${b.id}-title`,`${b.id}-description`,`${b.id}-choose`]),
    text(`${b.id}-title`,b.name,'h3'),text(`${b.id}-description`,`${b.model}\n${b.wheels}\n${b.details}`),
    ...button(`${b.id}-choose`,'Choose this build',`select_build:${b.id}`)
  ])],data:{}};
}
export function engineDocument(){
  return {components:[column('root',['title','intro','ecoboost','v8']),text('title','Which Mustang suits you?','h2'),text('intro','Choose your engine. Each path leads to a real build with its own Ford configuration token.'),
    ...button('ecoboost','2.3L EcoBoost · Premium Fastback','engine:ecoboost'),...button('v8','5.0L V8 · GT Fastback','engine:v8')],data:{}};
}
export function transmissionDocument(){
  return choiceDocument(['blue-gt-manual','blue-gt-auto'],'The GT gives you the 5.0L V8. Choose manual or automatic. Both verified examples are Vapor Blue with 18-inch wheels and Black Onyx cloth seats.');
}
export function colorDocument(){
  return {components:[column('root',['title','intro','orange','blue']),text('title','Let’s build your Mustang.','h2'),text('intro','2026 EcoBoost Premium Fastback · Black Onyx ActiveX seats. Start with a color from our verified examples.'),
    ...button('orange','Orange Fury Metallic Tri-coat','color:orange'),...button('blue','Vapor Blue Metallic','color:blue')],data:{}};
}
export function wheelDocument(color){
  return choiceDocument(color==='blue'?['blue-rtr','blue-20']:['orange-rtr'],color==='blue'?'Vapor Blue it is. Keep the RTR wheels and MagneRide, or choose the 20-inch build. The 20-inch option removes RTR and MagneRide.':'Here is our verified Orange Fury build with RTR wheels and MagneRide. This demo includes one Orange Fury configuration.');
}
export function selectionDocument(id){
  const build=fordConfigurations.find(b=>b.id===id);if(!build)throw new Error('Unknown configuration');
  return {components:[column('root',['title','card','change','more']),text('title','Your Mustang is ready to explore.','h2'),
    {id:'card',component:'Card',child:'summary'},column('summary',['name','engine','color','wheels','interior']),
    text('name',build.model,'h3'),text('engine',build.engine),text('color',build.color),text('wheels',build.wheels),text('interior',`${build.interior} · ${build.transmission}`),
    text('change',build.change),...button('more','Compare the other builds','compare_builds')],data:{buildId:id}};
}
export function vehicleMessages(doc,surfaceId){
  return [
    {version:'v0.9',createSurface:{surfaceId,catalogId:'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'}},
    {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:doc.data}},
    {version:'v0.9',updateComponents:{surfaceId,components:doc.components}}
  ];
}
