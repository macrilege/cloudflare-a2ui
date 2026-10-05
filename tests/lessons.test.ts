import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../public/lessons.js';
import {validateDocument} from '../src/protocol.ts';
for(const lesson of lessons)test(`lesson validates: ${lesson.name}`,()=>{assert.doesNotThrow(()=>validateDocument(lesson.doc));assert.ok(lesson.answer>=0&&lesson.answer<lesson.options.length);});

import {buildPriceLink,fordExampleUrl} from '../public/lessons.js';
test('configuration handoff preserves exact token encoding and query order',()=>{const url='https://www.ford.com/build-price/mustang/choose-model/build?config=-12345&configId=USAMustang2026&encoded=a%2Bb%2Fc';assert.equal(buildPriceLink(url),url);});
test('configuration handoff rejects unsafe destinations and missing tokens',()=>{for(const url of ['javascript:alert(1)','https://evil.com/build-price/mustang?config=1','https://ford.com.evil.com/build-price/mustang?config=1','https://www.ford.com/build-price/mustang','http://ford.com/build-price/mustang?config=1','https://user:password@ford.com/build-price/mustang?config=1','https://ford.com/redirect?config=1'])assert.equal(buildPriceLink(url),null);});

test('Michael’s Ford configuration preserves its token, trim and interior destination',()=>{const link=buildPriceLink(fordExampleUrl);assert.equal(link,fordExampleUrl);const url=new URL(link);assert.equal(url.searchParams.get('config'),'-3207239800454935606');assert.equal(url.searchParams.get('trimConfig'),'3754605659390406444');assert.equal(url.searchParams.get('vehicleTrim'),'ecoboostpremiumfastback');assert.equal(url.hash,'#interior');});
