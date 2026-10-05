export const scenarios={
  latency:{label:'Slow responses',title:'The catalog API is dragging.',signal:'Repeated product reads are bypassing the demo cache.',evidence:'GET /demo/catalog → 1,800 ms · cache MISS\nRepeated reads: 92% · database wait: 1,620 ms',fix:'Enable demo cache',after:'The demo now serves repeated product reads from cache. Run the test to see the result.',latency:1800,errors:2.4},
  errors:{label:'Failed requests',title:'A release broke the checkout API.',signal:'The simulated errors began with release v2.',evidence:'POST /demo/checkout → 500\nRelease v1: 0.2% errors · v2: 18.0% errors',fix:'Roll back demo release',after:'The simulation is back on release v1. Run the test to check the result.',latency:850,errors:18},
  auth:{label:'Login failures',title:'The login API is rejecting requests.',signal:'An expired credential is causing the simulated login failures.',evidence:'POST /demo/login → 401\nDemo credential: expired · rejected requests: 96%',fix:'Renew demo credential',after:'The simulation now uses a valid demo credential. Run the test to check the result.',latency:320,errors:96}
};
export const defaultIncident=()=>({scenario:'latency',traffic:'normal',inspected:false,fixed:false,tested:false});
export function changeIncident(current,patch){
  const next={...current,...patch};
  if(next.scenario!==current.scenario){next.inspected=false;next.fixed=false;next.tested=false;}
  else if(next.traffic!==current.traffic)next.tested=false;
  return next;
}
export function actOnIncident(current,action){
  if(action==='restart')return {...current,inspected:false,fixed:false,tested:false};
  if(action==='inspect')return {...current,inspected:true};
  if(action==='fix'&&current.inspected)return {...current,fixed:true,tested:false};
  if(action==='test'&&current.fixed)return {...current,tested:true};
  throw new Error('That simulation step is not available yet.');
}
export function incidentMetrics(state){
  const scenario=scenarios[state.scenario],high=state.traffic==='high',recovered=state.fixed&&state.tested;
  return {latency:recovered?(high?240:90):scenario.latency*(high?2:1),errors:recovered?0.2:Math.min(100,scenario.errors*(high?1.25:1)),health:recovered?'Demo recovered':state.fixed?'Fix applied · test next':state.inspected?'Cause identified':'Needs investigation'};
}
export function incidentDocument(state,message='Choose an incident. Investigate it, try a fix, then test the result.'){
  const scenario=scenarios[state.scenario],metrics=incidentMetrics(state);
  const data={scenario:[state.scenario],traffic:[state.traffic],inspected:state.inspected,fixed:state.fixed,tested:state.tested,message,latency:`${metrics.latency.toLocaleString('en-US')} ms`,errors:`${metrics.errors.toFixed(1)}%`,health:metrics.health};
  const action=state.fixed?(state.tested?'restart':'test'):state.inspected?'fix':'inspect';
  const labels={inspect:'Inspect demo logs',fix:scenario.fix,test:'Run simulated test',restart:'Replay this incident'};
  const detail=state.fixed?(state.tested?`The simulated test passed at ${metrics.latency} ms with 0.2% errors. Try a different incident or change the load.`:scenario.after):state.inspected?scenario.signal:'Start with the evidence. Inspect the demo logs to reveal a cause and a relevant action.';
  const components=[
    {id:'root',component:'Column',children:['state','title','metrics','controls','investigation']},
    {id:'state',component:'Text',text:{path:'/health'},variant:'caption'},
    {id:'title',component:'Text',text:state.fixed&&state.tested?'The demo API is responding again.':scenario.title,variant:'h2'},
    {id:'metrics',component:'Row',children:['latency-card','errors-card']},
    ...['latency','errors'].flatMap(key=>[
      {id:`${key}-card`,component:'Card',child:`${key}-body`},
      {id:`${key}-body`,component:'Column',children:[`${key}-label`,`${key}-value`]},
      {id:`${key}-label`,component:'Text',text:(state.fixed&&!state.tested?'BASELINE · ':'')+(key==='latency'?'RESPONSE TIME':'FAILED REQUESTS'),variant:'caption'},
      {id:`${key}-value`,component:'Text',text:{path:`/${key}`},variant:'h1'}
    ]),
    {id:'controls',component:'Column',children:['select-scenario','select-traffic']},
    {id:'select-scenario',component:'ChoicePicker',label:'Incident',variant:'mutuallyExclusive',options:Object.entries(scenarios).map(([value,s])=>({value,label:s.label})),value:{path:'/scenario'}},
    {id:'select-traffic',component:'ChoicePicker',label:'Traffic',variant:'mutuallyExclusive',options:[{value:'normal',label:'Normal traffic'},{value:'high',label:'High traffic'}],value:{path:'/traffic'}},
    {id:'investigation',component:'Card',child:'investigation-body'},
    {id:'investigation-body',component:'Column',children:['step','detail',...(state.inspected?['evidence']:[]),'action']},
    {id:'step',component:'Text',text:state.tested?'Result':state.fixed?'03 / VERIFY':state.inspected?'02 / TRY A FIX':'01 / INVESTIGATE',variant:'h3'},
    {id:'detail',component:'Text',text:detail},
    ...(state.inspected?[{id:'evidence',component:'Text',text:state.tested?'DEMO TEST · 1,000 synthetic requests · 2 failures':`DEMO BASELINE EVIDENCE · ${scenario.evidence}${state.traffic==='high'?'\nHigh-load fixture: response times doubled; failure rate increased.':''}`,variant:'caption'}]:[]),
    {id:'action',component:'Button',child:'action-label',variant:'primary',action:{event:{name:'refine',context:{instruction:action}}}},
    {id:'action-label',component:'Text',text:labels[action]}
  ];
  return {components,data};
}
export function incidentFromData(data){return {scenario:data.scenario[0],traffic:data.traffic[0],inspected:data.inspected,fixed:data.fixed,tested:data.tested};}
