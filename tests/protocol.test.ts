import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sample,validateDocument,messages} from '../src/protocol.ts';
test('sample forms a valid v0.9 surface with data before components',()=>{const doc=validateDocument(sample);const m=messages(doc,'test');assert.equal(m[0].version,'v0.9');assert.equal(m[0].createSurface?.surfaceId,'test');assert.deepEqual(m[1].updateDataModel?.value,doc.data);});
test('rejects unsupported executable components',()=>{assert.throws(()=>validateDocument({components:[{id:'root',component:'HTML',html:'<script>alert(1)</script>'}],data:{}}));});
test('rejects cycles, missing children and duplicate nodes',()=>{for(const children of [['root'],['absent'],['title','title']]){const doc=structuredClone(sample);doc.components[0]={id:'root',component:'Column',children};assert.throws(()=>validateDocument(doc));}});
test('rejects invalid checkbox binding types',()=>{const doc=structuredClone(sample);doc.data.seating='false';assert.throws(()=>validateDocument(doc));});
test('rejects prototype paths and untrusted action names',()=>{const doc=structuredClone(sample);doc.components.push({id:'unsafe',component:'TextField',label:'Bad',value:{path:'/__proto__'}});assert.throws(()=>validateDocument(doc));});
