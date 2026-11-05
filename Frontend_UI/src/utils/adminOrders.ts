export const adminOrderStates = [
  {key:'Pending',value:1,label:'Chờ xử lý',tone:'pending'},
  {key:'Approved',value:2,label:'Đã duyệt',tone:'approved'},
  {key:'Shipping',value:3,label:'Đang giao',tone:'shipping'},
  {key:'Completed',value:4,label:'Hoàn tất',tone:'completed'},
  {key:'Cancelled',value:5,label:'Đã hủy',tone:'cancelled'},
];
export function adminOrderState(raw:string|number){return adminOrderStates.find(state=>state.key===raw||String(state.value)===String(raw))??{key:String(raw),value:0,label:String(raw)||'Chưa có trạng thái',tone:'unknown'};}
export function adminPayment(raw:string|number){return raw===1||raw==='1'||raw==='COD'?'Tiền mặt (COD)':raw===2||raw==='2'||raw==='Online'?'Trực tuyến':String(raw)||'Chưa có thông tin';}
export function orderMoney(value:number){return `${value.toLocaleString('vi-VN')} đ`;}
export function orderDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Chưa có ngày đặt':date.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'});}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const money=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const id=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
function validDetail(value:unknown){
 if(!record(value)||!id(value.productId)||!money(value.quantity)||!Number.isSafeInteger(value.quantity)||!money(value.unitPrice))return false;
 return (value.productName==null||typeof value.productName==='string')&&(value.subtotal==null?Number.isFinite(value.quantity*value.unitPrice):money(value.subtotal));
}
function validOrder(row:Record<string,unknown>){
 if(!money(row.totalAmount)||!['string','number'].includes(typeof row.status)||!Array.isArray(row.details)||!row.details.every(validDetail))return false;
 // Undefined fees keep their existing optional display behavior; present money must be usable.
 if(!['subTotal','discountAmount','shippingFee','toteDeposit','tipAmount'].every(key=>row[key]===undefined||money(row[key])))return false;
 if(row.pointDiscount!=null&&!money(row.pointDiscount))return false;
 return ['recipientName','recipientPhone','deliveryAddress','deliverySlot','deliveryNotes','appliedCouponCode'].every(key=>row[key]==null||typeof row[key]==='string');
}
export function readAdminList<T>(data:unknown,kind:'orders'|'shippers'):T[]{
 if(!Array.isArray(data)||data.some(row=>!record(row)||!id(row.id)||(kind==='orders'?!validOrder(row):typeof row.fullName!=='string'||!row.fullName.trim())))throw Error('Dữ liệu không hợp lệ. Vui lòng tải lại.');
 return data as T[];
}
