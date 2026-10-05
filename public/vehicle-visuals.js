import { availableOptions } from './vehicle-draft.js';
import { fordCatalog, mustangTrim } from './expanded-ford-catalog.js';
// Trusted presentation assets captured from Ford Build & Price; never model-supplied URLs.
export const wheelPresentation={
  gtstandard:{image:'/assets/mustang/gtstandard.webp',title:'18-inch Ebony Black',note:'Standard · GT Fastback'},
  gtconvertible:{image:'/assets/mustang/gtconvertible.webp',title:'19-inch Shadow Silver',note:'Standard · GT Premium Convertible'},
  ecostandard:{image:'/assets/mustang/ecostandard.webp',title:'18-inch Shadow Silver',note:'Standard · EcoBoost Premium'},
  bronze:{image:'/assets/mustang/bronze.webp',title:'19-inch Sinister Bronze',note:'Includes Bronze Appearance Package'},
  rtr:{image:'/assets/mustang/rtr.webp',title:'19 × 9.5-inch Tarnished Dark',note:'Includes RTR Package + MagneRide'},
  twenty:{image:'/assets/mustang/twenty.webp',title:'20 × 9-inch Premium-painted',note:'Replaces RTR Package + MagneRide'}
};
export function vehicleChoicePresentation(component,data){
  if(component.id==='select-vehicle')return {kind:'model',items:{mustang:{title:'Mustang',note:'Sports car · EcoBoost or V8'},explorer:{title:'Explorer',note:'Active SUV · 2.3L EcoBoost'}}};
  const trim=data.vehicle==='explorer'?'active':mustangTrim(data);
  const catalog=fordCatalog[trim];
  if(component.id==='select-explorerColor'||component.id==='select-color')return {kind:'paint',items:Object.fromEntries(Object.entries(catalog.colors).map(([key,item])=>[key,{swatch:item.swatch,title:item.label,note:''}]))};
  if(component.id!=='select-wheels'&&component.id!=='select-explorerWheels')return undefined;
  const allowed=availableOptions(component.id==='select-explorerWheels'?'explorerWheels':'wheels',data);
  return {kind:'wheels',items:Object.fromEntries(Object.entries(catalog.wheels).map(([key,item])=>[key,{image:item.image,title:item.label,note:item.note+(!allowed[key]?(item.verified?' · Not verified with these choices.':' · Not connected in this demo.') :''),disabled:!allowed[key]}]))};
}
