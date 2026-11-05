import assert from 'node:assert/strict';
import {test} from 'node:test';
import {adminOrderState,adminPayment,readAdminList} from '../src/utils/adminOrders.ts';
test('Admin orders preserve numeric/string statuses and unknown values without inventing payment provider',()=>{assert.equal(adminOrderState('3').key,'Shipping');assert.equal(adminOrderState('Completed').value,4);assert.equal(adminOrderState('Other').label,'Other');assert.equal(adminPayment(2),'Trực tuyến');assert.equal(adminPayment('NewMethod'),'NewMethod');});
test('Missing or malformed admin data cannot masquerade as empty orders or available shippers',()=>{assert.deepEqual(readAdminList([],'shippers'),[]);for(const data of [null,{},[{id:2,fullName:''}],[{id:0,fullName:'A'}]])assert.throws(()=>readAdminList(data,'shippers'));for(const data of [null,{},[{id:1,totalAmount:NaN,status:1,details:[]}],[{id:1,totalAmount:0,status:1}]])assert.throws(()=>readAdminList(data,'orders'));const rows=[{id:1,totalAmount:0,status:'Pending',details:[]}];assert.equal(readAdminList(rows,'orders'),rows);});
test('Nested order details and displayed money fail recoverably before rendering, while optional fees remain optional',()=>{
 const detail={productId:1,productName:'Rau',quantity:2,unitPrice:25000,subtotal:50000},order={id:1,status:'Pending',totalAmount:50000,details:[detail]};
 for(const details of [[null],[{}],[{...detail,unitPrice:undefined}],[{...detail,quantity:NaN}],[{...detail,subtotal:Infinity}],[{...detail,productName:{}}]])assert.throws(()=>readAdminList([{...order,details}],'orders'));
 for(const key of ['subTotal','discountAmount','shippingFee','toteDeposit','tipAmount','pointDiscount'])for(const bad of ['100',Infinity,NaN,-1])assert.throws(()=>readAdminList([{...order,[key]:bad}],'orders'));
 assert.throws(()=>readAdminList([{...order,subTotal:null}],'orders'));assert.throws(()=>readAdminList([{...order,recipientName:{}}],'orders'));
 assert.deepEqual(readAdminList([order],'orders'),[order]);assert.doesNotThrow(()=>readAdminList([{...order,pointDiscount:null,details:[{...detail,subtotal:undefined}]}],'orders'));
});
