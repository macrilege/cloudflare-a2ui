export const restaurants={
  italian:{name:'Willow & Flour',description:'A fictional neighborhood Italian restaurant. Handmade pasta, warm lighting and a garden patio.',patio:true},
  japanese:{name:'Miso House',description:'A fictional Japanese dining room. Small plates, sushi and a relaxed indoor setting.',patio:false},
  mexican:{name:'Mesa Verde',description:'A fictional Mexican kitchen. Shared plates, bright flavors and open-air patio tables.',patio:true}
};
export const cuisines={italian:'Italian',japanese:'Japanese',mexican:'Mexican'};
export const days={tonight:'Tonight',tomorrow:'Tomorrow',weekend:'This weekend'};
export const timeLabels={'17:30':'5:30 PM','18:00':'6:00 PM','18:30':'6:30 PM','19:00':'7:00 PM','19:30':'7:30 PM','20:00':'8:00 PM'};
export const defaultReservation=()=>({cuisine:'italian',day:'tonight',party:'2',seating:'indoor',time:'',stage:'choose'});
export function seatingOptions(state){return restaurants[state.cuisine].patio&&Number(state.party)<=4?{indoor:'Inside',patio:'Patio'}:{indoor:'Inside'};}
export function availableTimes(state){
  if(Number(state.party)>4)return ['17:30','20:00'];
  if(state.day==='weekend')return ['17:30','18:30','20:00'];
  if(state.cuisine==='japanese')return ['18:00','19:00','20:00'];
  return ['18:00','18:30','19:00','19:30'];
}
export function changeReservation(current,patch){
  const next={...current,...patch};
  if(!seatingOptions(next)[next.seating])next.seating='indoor';
  if(['cuisine','day','party','seating'].some(key=>current[key]!==next[key])){next.time='';next.stage='choose';}
  if(Object.hasOwn(patch,'time')){next.time=availableTimes(next).includes(patch.time)?patch.time:'';next.stage=next.time?'review':'choose';}
  return next;
}
export function reservationAction(state,action){
  if(action.startsWith('time:')){const time=action.slice(5);if(!availableTimes(state).includes(time))throw new Error('Unavailable demo time');return {...state,time,stage:'review'};}
  if(action==='edit')return {...state,time:'',stage:'choose'};
  if(action==='confirm'&&state.stage==='review'&&availableTimes(state).includes(state.time))return {...state,stage:'confirmed'};
  throw new Error('Invalid booking step');
}
export function reservationSummary(state){return `${restaurants[state.cuisine].name} · ${days[state.day]} · ${state.party} ${state.party==='1'?'guest':'guests'} · ${state.seating==='patio'?'Patio':'Inside'}${state.time?` · ${timeLabels[state.time]}`:''}`;}
export function reservationDocument(state,message='Choose a table time to review your demo booking.'){
  const data={cuisine:[state.cuisine],day:[state.day],party:[state.party],seating:[state.seating],time:state.time,stage:state.stage,message};
  const components=[{id:'root',component:'Column',children:['venue','preferences','booking']},{id:'venue',component:'Card',child:'venue-body'},{id:'venue-body',component:'Column',children:['venue-label','venue-name','venue-description']},{id:'venue-label',component:'Text',text:`${cuisines[state.cuisine].toUpperCase()} · FICTIONAL RESTAURANT`,variant:'caption'},{id:'venue-name',component:'Text',text:restaurants[state.cuisine].name,variant:'h2'},{id:'venue-description',component:'Text',text:restaurants[state.cuisine].description},{id:'preferences',component:'Column',children:['select-cuisine','select-day','select-party','select-seating']}];
  const choices={cuisine:cuisines,day:days,party:Object.fromEntries(Array.from({length:8},(_,i)=>[String(i+1),`${i+1} ${i===0?'guest':'guests'}`])),seating:seatingOptions(state)};
  const labels={cuisine:'Cuisine',day:'When',party:'Party size',seating:'Seating'};
  for(const key of Object.keys(choices))components.push({id:`select-${key}`,component:'ChoicePicker',label:labels[key],variant:'mutuallyExclusive',options:Object.entries(choices[key]).map(([value,label])=>({value,label})),value:{path:`/${key}`}});
  const button=(id,label,instruction)=>{components.push({id,component:'Button',child:`${id}-label`,variant:instruction==='edit'?'default':'primary',action:{event:{name:'refine',context:{instruction}}}},{id:`${id}-label`,component:'Text',text:label});return id;};
  const children=['booking-title','booking-description'];
  components.push({id:'booking',component:'Card',child:'booking-body'},{id:'booking-body',component:'Column',children},{id:'booking-title',component:'Text',text:state.stage==='confirmed'?'Demo reservation confirmed':state.stage==='review'?'Review your table':'Choose a demo time',variant:'h3'},{id:'booking-description',component:'Text',text:state.stage==='choose'?`Sample availability, not live inventory.${Number(state.party)>4?' Larger parties have two demo time slots.':''}${Object.keys(seatingOptions(state)).length===1?' This selection offers indoor tables only.':''}`:reservationSummary(state)});
  if(state.stage==='choose'){
    children.push('times');components.push({id:'times',component:'Row',children:availableTimes(state).map((time,i)=>button(`time-${i}`,timeLabels[time],`time:${time}`))});
  }else{
    children.push('booking-note');components.push({id:'booking-note',component:'Text',text:state.stage==='confirmed'?'DEMO ONLY · No table was reserved. No restaurant was contacted.':'This confirms a simulation only. No name, email or payment is needed.',variant:'caption'});
    if(state.stage==='review')children.push(button('confirm','Confirm demo reservation','confirm'));
    children.push(button('edit',state.stage==='confirmed'?'Try another table':'Change time','edit'));
  }
  return {components,data};
}
export function reservationFromData(data){return {cuisine:data.cuisine[0],day:data.day[0],party:data.party[0],seating:data.seating[0],time:data.time,stage:data.stage};}
export function reservationReply(before,next,requestedTime=''){
  const notices=[];
  if(before.seating==='patio'&&next.seating==='indoor')notices.push('This selection offers inside seating only.');
  if(requestedTime&&!next.time)notices.push(`${timeLabels[requestedTime]} is not in the demo availability; choose one of the shown times.`);
  return `${reservationSummary(next)}. ${notices.join(' ')} ${next.time?'Review the details, then confirm the demo reservation.':'Choose a time on the card.'}`;
}
