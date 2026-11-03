import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isAccountEmail,isResetCode,authDestination,matchesSession,accountError} from '../src/utils/account.ts';
test('Recovery rejects missing/malformed email and non-six-digit reset codes',()=>{
 for(const email of ['','abc','a@','a b@example.com'])assert.equal(isAccountEmail(email),false);
 assert.equal(isAccountEmail(' user@example.com '),true);
 for(const code of ['','12345','1234567','abcdef','123 45'])assert.equal(isResetCode(code),false);
 assert.equal(isResetCode('123456'),true);
});
test('Auth destinations stay local and role-specific; late work cannot match another account/session',()=>{
 assert.equal(authDestination('Admin'),'/admin/orders');assert.equal(authDestination('Customer'),'/');assert.equal(authDestination('https://example.invalid'),'/');
 const scope={token:'session-a',userId:1};assert.equal(matchesSession({token:'session-a',user:{id:1}},scope),true);
 for(const current of [{token:'session-b',user:{id:1}},{token:'session-a',user:{id:2}},{token:null,user:null}])assert.equal(matchesSession(current,scope),false);
});
test('Account errors retain useful server validation but hide local infrastructure details',()=>{
 assert.equal(accountError(new Error('Mã OTP đã hết hạn.')),'Mã OTP đã hết hạn.');assert.doesNotMatch(accountError(new Error('Back-end http://localhost:5156')),/localhost|5156/);
});
