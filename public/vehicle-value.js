// Starting prices observed in Ford Build & Price on October 3, 2026.
// Standard horsepower: ford.com/cars/mustang/ (93-octane test fuel).
export const powerBenchmarks=[
  {engine:'ecoboost',name:'EcoBoost Fastback',price:33490,hp:315},
  {engine:'v8',name:'GT Fastback',price:48795,hp:480}
];
export function recommendPower(draft){
  if(!draft.priority)return undefined;
  const budget=draft.budget?Number(draft.budget):Infinity;
  const candidates=powerBenchmarks.filter(model=>model.price<=budget);
  candidates.sort((a,b)=>draft.priority==='price'?a.price-b.price:draft.priority==='power'?b.hp-a.hp:b.hp/b.price-a.hp/a.price);
  const model=candidates[0];
  const comparison='EcoBoost: 315 hp · from $33,490\nGT V8: 480 hp · from $48,795';
  const reason=!model?'Neither fits this starting-price budget.':draft.priority==='price'?`${model.name} is the lower-price choice.`:draft.priority==='power'?`${model.name} gives you the most power within this starting-price budget.`:`${model.name} gives you the most horsepower per dollar within this starting-price budget.`;
  return {model,text:`${comparison}\n\n${reason}\n${draft.budget?'Budget: $'+Number(draft.budget).toLocaleString('en-US')+'. ':''}Comparing these two base fastbacks only—not the price of your draft. Options and other charges cost extra.`};
}
