import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSendGate,isValidSenderName,receivedMessage} from '../src/utils/supportChat.js';
test('Support names accept Vietnamese text but reject empty/punctuation-only values',()=>{
 for(const value of ['', '   ', '/?!', null])assert.equal(isValidSenderName(value),false);
 for(const value of ['Nguyễn An','Khách 123'])assert.equal(isValidSenderName(value),true);
});
test('Support notices are classified by server identity without treating ordinary replies as system messages',()=>{
 assert.equal(receivedMessage('Hỗ trợ','hello','system').sender,'system');
 assert.equal(receivedMessage('🛟 Hỗ trợ','hello','id').sender,'system');
 const reply=receivedMessage('[Admin] Lan','hello','id');assert.equal(reply.sender,'admin');assert.equal(reply.senderName,'Lan');
});
test('Support submission gate prevents duplicate sends and releases after failure',async()=>{
 const gate=createSendGate();let release,calls=0;
 const first=gate(()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 assert.equal(await gate(async()=>{calls++;}),false);assert.equal(calls,1);release();assert.equal(await first,true);
 await assert.rejects(gate(async()=>{throw new Error('offline');}));
 assert.equal(await gate(async()=>{calls++;}),true);assert.equal(calls,2);
});
