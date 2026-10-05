// Local inference only: never fall back to a hosted model or download a model.
export function localConfig(env=process.env) {
  const provider=env.LOCAL_AI_PROVIDER||'ollama';
  if(!['ollama','lmstudio'].includes(provider))throw new Error('LOCAL_AI_PROVIDER must be ollama or lmstudio');
  const base=new URL(env.LOCAL_AI_BASE_URL||(provider==='ollama'?'http://127.0.0.1:11434':'http://127.0.0.1:1234'));
  if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('Use a loopback HTTP model-server URL without a path');
  const model=env.LOCAL_AI_MODEL||(provider==='ollama'?'gemma4:12b':'');
  if(/cloud/i.test(model))throw new Error('Choose an installed local model, not a cloud model');
  return {provider,base:base.origin,model};
}
export function createLocalAI(config,fetchImpl=fetch) {
  let model=config.model;
  async function ready() {
    const response=await fetchImpl(config.base+(config.provider==='ollama'?'/api/tags':'/v1/models'),{signal:AbortSignal.timeout(5000),redirect:'error'});
    if(!response.ok)throw new Error('The local model server could not list its models');
    const body=await response.json();
    const names=config.provider==='ollama'?(body.models||[]).map(m=>m.name):(body.data||[]).map(m=>m.id);
    if(!model){if(names.length!==1)throw new Error('Set LOCAL_AI_MODEL to the exact LM Studio model identifier; multiple or no models are available');model=names[0];}
    if(!names.includes(model))throw new Error(`Local model ${model} is not installed/available in ${config.provider}`);
    if(/cloud/i.test(model))throw new Error('Cloud models are not allowed');
    return {provider:config.provider,model};
  }
  return {
    ready,
    get model(){return model;},
    async run(_cloudModel,input) {
      if(!model)await ready();
      const ollama=config.provider==='ollama';
      const body=ollama?{model,messages:input.messages,stream:false,think:false,format:'json',keep_alive:'10m',options:{num_ctx:16384,num_predict:input.max_tokens,temperature:0.1}}:{model,messages:input.messages,stream:false,max_tokens:input.max_tokens,temperature:0.1,response_format:{type:'json_schema',json_schema:{name:'a2ui_response',strict:true,schema:{type:'object'}}}};
      const response=await fetchImpl(config.base+(ollama?'/api/chat':'/v1/chat/completions'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000),redirect:'error'});
      if(!response.ok)throw new Error(`Local model server returned ${response.status}`);
      const result=await response.json();
      return ollama?{choices:[{message:{content:result.message?.content},finish_reason:result.done_reason}]}:result;
    }
  };
}
