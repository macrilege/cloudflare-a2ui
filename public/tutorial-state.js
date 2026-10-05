const catalogId='https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';
export function tutorialMessages(document,surfaceId,previous){
  const messages=[];
  if(!previous)messages.push({version:'v0.9',createSurface:{surfaceId,catalogId}});
  messages.push({version:'v0.9',updateDataModel:{surfaceId,path:'/',value:structuredClone(document.data)}});
  if(!previous||JSON.stringify(previous.components)!==JSON.stringify(document.components))messages.push({version:'v0.9',updateComponents:{surfaceId,components:structuredClone(document.components)}});
  return messages;
}
export function applyTutorialMessages(messages,surfaceId,previous){
  let components=previous?.components,data=previous?.data;
  for(const message of messages){
    const keys=['createSurface','updateDataModel','updateComponents'].filter(key=>Object.hasOwn(message,key));
    if(message.version!=='v0.9'||keys.length!==1)throw new Error('Unsupported interface message.');
    const [key]=keys,body=message[key];
    if(body.surfaceId!==surfaceId)throw new Error('Unexpected interface surface.');
    if(key==='createSurface'&&(previous||body.catalogId!==catalogId))throw new Error('Unexpected surface creation.');
    if(key==='updateDataModel'){if(body.path!=='/')throw new Error('Unsupported data path.');data=body.value;}
    if(key==='updateComponents')components=body.components;
  }
  if(!components||!data)throw new Error('Incomplete interface response.');
  return structuredClone({components,data});
}
