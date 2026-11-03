import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeOrderStatus,canCancelOrder,canSupportOrder,canReviewOrder,validateTracking,orderDateLabel,orderError} from '../src/utils/customerOrders.ts';
test('Order actions accept numeric/string states and stay unavailable for unknown states',()=>{
  for(const status of [1,'1','Pending','pending'])assert.equal(canCancelOrder(status),true);
  for(const status of [2,3,4,5,'Approved','Shipping','Completed','Cancelled','Unknown',null,0,99])assert.equal(canCancelOrder(status),false);
  for(const status of [4,'Completed']){assert.equal(canReviewOrder(status,false),true);assert.equal(canReviewOrder(status,true),false);assert.equal(canSupportOrder(status),true);}
  for(const status of [5,'Cancelled']){assert.equal(normalizeOrderStatus(status),'Cancelled');assert.equal(canSupportOrder(status),true);assert.equal(canReviewOrder(status,false),false);}
  for(const status of [0,99,null,'Pending','Shipping']){assert.equal(canSupportOrder(status),false);assert.equal(canReviewOrder(status,false),false);}
});
test('Tracking rejects invalid API IDs/phones and preserves supported phone formatting',()=>{
  for(const id of ['','0','-1','1e2','1.5','2147483648'])assert.ok(validateTracking(id,'0900000000').errors.orderId);
  for(const phone of ['','abc0000000','090'])assert.ok(validateTracking('9001',phone).errors.phone);
  const result=validateTracking(' 9001 ',' +84 900-000-000 ');assert.deepEqual(result.errors,{});assert.equal(result.orderId,9001);assert.equal(result.phone,'+84 900-000-000');
});
test('Order display avoids Invalid Date and local server URLs',()=>{
  assert.equal(orderDateLabel('not-a-date'),'Chưa có ngày đặt');assert.doesNotMatch(orderError(new Error('Back-end http://localhost:5156')),/localhost|5156/);
});
