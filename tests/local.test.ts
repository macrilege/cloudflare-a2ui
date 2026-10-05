import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {localConfig,createLocalAI} from '../local/provider.mjs';
import {createLocalServer} from '../local/server.mjs';
import {emptyDraft} from '../public/vehicle-draft.js';

test('local configuration rejects remote endpoints, credentials and cloud models',()=>{
  for(const url of ['https://example.com','http://192.168.1.2:1234','http://localhost:1234/path','http://user:password@localhost:1234'])assert.throws(()=>localConfig({LOCAL_AI_BASE_URL:url}));
  assert.throws(()=>localConfig({LOCAL_AI_MODEL:'example:cloud'}));
  assert.equal(localConfig({}).model,'gemma4:12b');
});
for(const provider of ['ollama','lmstudio'])test(`${provider} adapter calls only its local structured-output API`,async()=>{
  const seen:any[]=[];
  const config=localConfig({LOCAL_AI_PROVIDER:provider,LOCAL_AI_MODEL:'test-model'});
  const ai=createLocalAI(config,async(url:any,init:any)=>{
    seen.push({url,init});
    if(!init.body)return Response.json(provider==='ollama'?{models:[{name:'test-model'}]}:{data:[{id:'test-model'}]});
    const content=JSON.stringify({message:'White Explorer',patch:{vehicle:'explorer',explorerColor:'white'}});
    return Response.json(provider==='ollama'?{message:{content},done_reason:'stop'}:{choices:[{message:{content},finish_reason:'stop'}]});
  });
  await ai.ready();
  const result=await ai.run('ignored-cloud-model',{messages:[{role:'user',content:'white Explorer'}],max_tokens:600});
  assert.equal(JSON.parse(result.choices[0].message.content).patch.vehicle,'explorer');
  const body=JSON.parse(seen[1].init.body);
  assert.equal(body.model,'test-model');assert.equal(body.stream,false);
  assert.equal(seen[1].url,config.base+(provider==='ollama'?'/api/chat':'/v1/chat/completions'));
  assert.equal(seen[1].init.redirect,'error');
  assert.ok(provider==='ollama'?body.format==='json':body.response_format.type==='json_schema');
});
test('unavailable models fail instead of downloading or falling back',async()=>{
  const ai=createLocalAI(localConfig({}),async()=>Response.json({models:[]}));
  await assert.rejects(ai.ready(),/not installed/);
});
test('local HTTP server reuses validation and A2UI, serves assets, and blocks cross-origin requests',async(t)=>{
  let output={message:'White Explorer',patch:{vehicle:'explorer',explorerColor:'white',explorerWheels:'d2fcy'}};
  const ai={model:'test-model',ready:async()=>({provider:'ollama',model:'test-model'}),run:async()=>({choices:[{message:{content:JSON.stringify(output)},finish_reason:'stop'}]})};
  const server=createLocalServer(localConfig({}),ai);server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>server.close());
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const page=await fetch(base+'/automotive/');assert.equal(page.status,200);assert.match(await page.text(),/meta name="local-ai"/);
  assert.equal((await fetch(base+'/package.json')).status,404);
  assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);
  const rejectedHost=await new Promise(resolve=>{http.get(base+'/api/local-status',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});});
  assert.equal(rejectedHost,403);
  const data=JSON.stringify({mode:'vehicle-chat',prompt:'White Explorer with gray wheels',draft:emptyDraft()});
  const request=()=>fetch(base+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:data});
  assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:data})).status,403);
  const response=await request();assert.equal(response.status,200);assert.equal(response.headers.get('x-ai-provider'),'ollama');assert.equal(response.headers.get('x-model'),'test-model');
  const messages=(await response.text()).trim().split('\n').map(JSON.parse);
  const draft=messages.find((m:any)=>m.updateDataModel).updateDataModel.value;
  assert.equal(draft.vehicle,'explorer');assert.equal(draft.explorerWheels,'d2fcy');assert.equal(draft.explorerDrive,'4wd');assert.ok(draft.buildId);
  output={message:'Invalid',patch:{vehicle:'invented-car'}} as any;
  assert.equal((await request()).status,502);
  assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(17000)})).status,400);
});
