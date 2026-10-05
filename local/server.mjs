import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import worker from '../src/index.ts';
import {localConfig,createLocalAI} from './provider.mjs';
const publicDir=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const security={'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
async function asset(request) {
  if(!['GET','HEAD'].includes(request.method))return new Response('Use GET',{status:405});
  let path;
  try{path=resolve(publicDir,'.'+decodeURIComponent(new URL(request.url).pathname));if((await stat(path)).isDirectory())path=resolve(path,'index.html');path=await realpath(path);}catch{return new Response('Not found',{status:404});}
  if(!path.startsWith(publicDir+sep)||path.split(sep).some(p=>p.startsWith('.'))||!mime[extname(path)])return new Response('Not found',{status:404});
  let body=await readFile(path);
  if(extname(path)==='.html')body=Buffer.from(body.toString().replace('</head>','<meta name="local-ai" content="true"></head>'));
  return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':mime[extname(path)],'cache-control':'no-store'}});
}
export function createLocalServer(config=localConfig(),ai=createLocalAI(config)) {
  let calls=0,busy=false;
  // Reuse the Worker request validation and document builder, with local services.
  const env={AI:ai,ASSETS:{fetch:asset},DAILY_AI_LIMIT:'0',RATE_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({first:async()=>({calls:++calls})})})}};
  return http.createServer(async(req,res)=>{
    const allowed=new Set([`127.0.0.1:${res.socket.localPort}`,`localhost:${res.socket.localPort}`]);
    const respond=async(response)=>{for(const [k,v] of Object.entries(security))res.setHeader(k,v);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));};
    if(!allowed.has(req.headers.host))return respond(new Response('Invalid host',{status:403}));
    const origin=`http://${req.headers.host}`;
    if(req.headers.origin&&req.headers.origin!==origin)return respond(new Response('Origin not allowed',{status:403}));
    const url=new URL(req.url,origin);
    if(url.pathname==='/api/local-status'){
      try{return respond(Response.json({...await ai.ready(),local:true},{headers:{'cache-control':'no-store'}}));}
      catch{return respond(Response.json({error:`Start ${config.provider} and make the configured model available.`,local:true},{status:503}));}
    }
    const generating=url.pathname==='/api/generate';
    if(generating&&busy)return respond(Response.json({error:'The local model is answering another request. Please try again shortly.'},{status:503}));
    if(generating)busy=true;
    try{
      const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
      if(generating)await ai.ready();
      const response=await worker.fetch(request,env);
      if(generating){response.headers.set('x-model',ai.model);response.headers.set('x-ai-provider',config.provider);}
      await respond(response);
    }catch(error){
      console.error(error instanceof Error?error.message:"Local server failure");
      await respond(Response.json({error:`Cannot reach ${config.provider} or its configured local model. Check the local server window.`},{status:503}));
    }finally{if(generating)busy=false;}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=localConfig();
  const port=Number(process.env.LOCAL_PORT||8794);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('LOCAL_PORT must be 1024–65535');
  const server=createLocalServer(config);
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. If this demo is already running, open http://localhost:${port}/automotive/`:error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Local A2UI: http://localhost:${port}/automotive/\nProvider: ${config.provider} · Model: ${config.model||'single available LM Studio model'}\nInference stays on this Mac. Ford links open Ford online. Press Ctrl+C to stop.`));
}
