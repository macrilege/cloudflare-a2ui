// A real listing observed on North Central Ford's vehicle detail page, October 3, 2026.
// Captured example only: no stock, price, location or exact-match promise.
export const inventoryExample={vin:'1FA6P8CF1T5413742',model:'2026 Mustang GT Fastback',dealer:'North Central Ford · Richardson, TX',interior:'Black Onyx interior',drive:'Rear-wheel drive',url:'https://www.northcentralford.com/new/Ford/2026-Ford-Mustang-95dacd4eac1814e012e1fffc0bb3b191.htm'};
export function inventoryDocument(expanded=false){
  return {components:[{id:'root',component:'Column',children:['label','title','dealer','vin','details','toggle','toggle-label-note']},
    {id:'label',component:'Text',text:'ONE REAL INVENTORY EXAMPLE',variant:'caption'},
    {id:'title',component:'Text',text:inventoryExample.model,variant:'h2'},
    {id:'dealer',component:'Text',text:inventoryExample.dealer,variant:'body'},
    {id:'vin',component:'Text',text:`VIN: ${inventoryExample.vin}`,variant:'caption'},
    {id:'details',component:'Text',text:expanded?`Vapor Blue Metallic · 5.0L V8\nAutomatic · ${inventoryExample.drive}\n${inventoryExample.interior}\nThis listing is a separate vehicle; changing your build does not change it.`:'Vapor Blue Metallic · V8 · Automatic. A separate vehicle with its own VIN and dealer.',variant:'body'},
    {id:'toggle',component:'Button',child:'toggle-text',variant:'default',action:{event:{name:'refine',context:{instruction:'inventory:toggle'}}}},
    {id:'toggle-text',component:'Text',text:expanded?'Hide equipment':'Show equipment'},
    {id:'toggle-label-note',component:'Text',text:'Listing captured Oct 3, 2026. Availability is not checked live.',variant:'caption'}],data:{}};
}
