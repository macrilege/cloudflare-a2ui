import { z } from 'zod';
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/);
const text = z.string().max(600);
const path = z.object({path: z.string().regex(/^\/[a-zA-Z][a-zA-Z0-9_]{0,49}$/)}).strict();
const common = {id};
export const componentSchema = z.discriminatedUnion('component', [
  z.object({...common, component:z.literal('Text'), text:z.union([text,path]), variant:z.enum(['h1','h2','h3','h4','h5','body','caption']).optional()}).strict(),
  z.object({...common, component:z.literal('Column'), children:z.array(id).max(32)}).strict(),
  z.object({...common, component:z.literal('Row'), children:z.array(id).max(8)}).strict(),
  z.object({...common, component:z.literal('Card'), child:id}).strict(),
  z.object({...common, component:z.literal('Divider')}).strict(),
  z.object({...common, component:z.literal('CheckBox'), label:text, value:path}).strict(),
  z.object({...common, component:z.literal('TextField'), label:text, value:path, variant:z.enum(['shortText','longText']).optional()}).strict(),
  z.object({...common, component:z.literal('ChoicePicker'), label:text, variant:z.literal('mutuallyExclusive'), options:z.array(z.object({label:text,value:z.string().min(1).max(100)}).strict()).min(1).max(12).refine(options=>new Set(options.map(o=>o.value)).size===options.length), value:path}).strict(),
  z.object({...common, component:z.literal('Button'), child:id, variant:z.enum(['primary','default','borderless']).optional(), action:z.object({event:z.object({name:z.literal('refine'), context:z.object({instruction:text}).strict()}).strict()}).strict()}).strict(),
]);
export const documentSchema = z.object({
  components:z.array(componentSchema).min(2).max(40),
  data:z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/),z.union([text,z.boolean(),z.array(text).max(1)])).refine(d=>Object.keys(d).length<=30),
}).strict();
export type Document = z.infer<typeof documentSchema>;
export function validateDocument(value:unknown):Document {
  const doc=documentSchema.parse(value);
  const nodes=new Map(doc.components.map(c=>[c.id,c]));
  if(nodes.size!==doc.components.length || !nodes.has('root')) throw new Error('Duplicate IDs or missing root');
  const visited=new Set<string>();
  function visit(key:string,ancestors:Set<string>,depth:number) {
    if(depth>10 || ancestors.has(key) || visited.has(key)) throw new Error('Invalid component tree');
    const c=nodes.get(key); if(!c) throw new Error('Missing component');
    visited.add(key); const next=new Set(ancestors).add(key);
    if('children' in c) for(const child of c.children) visit(child,next,depth+1);
    if('child' in c) visit(c.child,next,depth+1);
    if(c.component==='Button' && nodes.get(c.child)?.component!=='Text') throw new Error('Buttons require text labels');
    if('value' in c) {
      const value=doc.data[c.value.path.slice(1)];
      if(c.component==='ChoicePicker'){if(!Array.isArray(value))throw new Error('Invalid choice binding');}
      else if(typeof value!==(c.component==='CheckBox'?'boolean':'string')) throw new Error('Invalid data binding');
    }
    if(c.component==='Text' && typeof c.text!=='string' && typeof doc.data[c.text.path.slice(1)]!=='string') throw new Error('Invalid text binding');
  }
  visit('root',new Set(),0);
  if(visited.size!==nodes.size) throw new Error('Unreachable components');
  return doc;
}
export function messages(doc:Document, surfaceId:string) {
  return [
    {version:'v0.9',createSurface:{surfaceId,catalogId:'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'}},
    {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:doc.data}},
    {version:'v0.9',updateComponents:{surfaceId,components:doc.components}},
  ];
}
export const sample:Document={components:[
  {id:'root',component:'Column',children:['eyebrow','title','intro','card','note','button']},
  {id:'eyebrow',component:'Text',text:'2026 EXPLORER · VEHICLE GUIDE',variant:'caption'},
  {id:'title',component:'Text',text:'Meet the 2026 Ford Explorer.',variant:'h1'},
  {id:'intro',component:'Text',text:'Three-row seating for six or seven, depending on model and options. Choose what you want to learn next.'},
  {id:'card',component:'Card',child:'items'},
  {id:'items',component:'Column',children:['cardTitle','one','two','three']},
  {id:'cardTitle',component:'Text',text:'What matters to you?',variant:'h3'},
  {id:'one',component:'CheckBox',label:'Seating and interior space',value:{path:'/seating'}},
  {id:'two',component:'CheckBox',label:'Technology and driver-assist features',value:{path:'/technology'}},
  {id:'three',component:'CheckBox',label:'Towing requirements and configuration',value:{path:'/towing'}},
  {id:'note',component:'TextField',label:'What would you like to know?',value:{path:'/preferences'},variant:'shortText'},
  {id:'button',component:'Button',child:'buttonLabel',variant:'primary',action:{event:{name:'refine',context:{instruction:'Answer the shopper’s selected interests and follow-up using only supplied verified vehicle facts.'}}}},
  {id:'buttonLabel',component:'Text',text:'Explore my interests'},
],data:{seating:false,technology:false,towing:false,preferences:''}};
