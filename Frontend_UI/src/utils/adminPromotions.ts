export interface PromotionItem {
  id:number;code:string;discountType:number|string;discountValue:number;maxDiscountAmount:number|null;minOrderAmount:number;maxUsage:number;currentUsage:number;expiryDate:string;isActive:boolean;isExpired:boolean;
}
export interface PromotionDraft {code:string;discountType:'1'|'2';discountValue:string;maxDiscountAmount:string;minOrderAmount:string;maxUsage:string;expiryDate:string;isActive:boolean;}
export type PromotionErrors=Partial<Record<keyof PromotionDraft,string>>;
export function newPromotionDraft():PromotionDraft{return {code:'',discountType:'1',discountValue:'',maxDiscountAmount:'',minOrderAmount:'0',maxUsage:'',expiryDate:'',isActive:true};}
export function promotionType(value:unknown){return value===1||value==='1'||value==='Percentage'?1:value===2||value==='2'||value==='FixedAmount'?2:0;}
function validDay(year:number,month:number,day:number){return year>=1&&year<=9999&&month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate();}
// Oracle DateTime values without an offset represent UTC in this API.
export function promotionInstant(value:string){const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,7})?(Z|[+-]\d{2}:\d{2})?$/i.exec(value);if(!match||!validDay(+match[1],+match[2],+match[3])||+match[4]>23||+match[5]>59||+match[6]>59)return NaN;return Date.parse(match[7]?value:`${value}Z`);}
export function vietnamExpiry(value:string){const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);if(!match||!validDay(+match[1],+match[2],+match[3])||+match[4]>23||+match[5]>59)return NaN;return Date.parse(`${value}:00+07:00`);}
export function promotionDate(value:string){return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(promotionInstant(value));}
export function promotionStatus(promo:PromotionItem,now=Date.now()){
 if(!promo.isActive)return {key:'inactive',label:'Đã tắt'};
 if(promo.isExpired||now>promotionInstant(promo.expiryDate))return {key:'expired',label:'Hết hạn'};
 if(promo.currentUsage>=promo.maxUsage)return {key:'full',label:'Hết lượt'};
 return {key:'ready',label:'Còn hiệu lực'};
}
const amount=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export function readPromotions(data:unknown):PromotionItem[]{
 if(!Array.isArray(data)||data.some(row=>!row||!Number.isSafeInteger(row.id)||row.id<=0||typeof row.code!=='string'||!row.code.trim()||!promotionType(row.discountType)||!amount(row.discountValue)||row.discountValue<=0||(promotionType(row.discountType)===1&&row.discountValue>100)||!amount(row.minOrderAmount)||(row.maxDiscountAmount!==null&&(!amount(row.maxDiscountAmount)||row.maxDiscountAmount<=0))||!Number.isInteger(row.maxUsage)||row.maxUsage<=0||!Number.isInteger(row.currentUsage)||row.currentUsage<0||typeof row.expiryDate!=='string'||!Number.isFinite(promotionInstant(row.expiryDate))||typeof row.isActive!=='boolean'||typeof row.isExpired!=='boolean'))throw Error('Dữ liệu khuyến mãi không hợp lệ. Vui lòng tải lại.');return data as PromotionItem[];
}
export function promotionErrors(draft:PromotionDraft,now=Date.now()):PromotionErrors{
 const errors:PromotionErrors={};const positive=(value:string)=>!!value.trim()&&Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=Number.MAX_SAFE_INTEGER;
 if(!draft.code.trim())errors.code='Nhập mã khuyến mãi.';
 if(!positive(draft.discountValue)||(draft.discountType==='1'&&Number(draft.discountValue)>100))errors.discountValue=draft.discountType==='1'?'Nhập mức giảm lớn hơn 0 và không quá 100%.':'Nhập số tiền giảm lớn hơn 0.';
 if(draft.discountType==='1'&&draft.maxDiscountAmount.trim()&&!positive(draft.maxDiscountAmount))errors.maxDiscountAmount='Nhập mức giảm tối đa lớn hơn 0, hoặc để trống.';
 if(!draft.minOrderAmount.trim()||!Number.isFinite(Number(draft.minOrderAmount))||Number(draft.minOrderAmount)<0||Number(draft.minOrderAmount)>Number.MAX_SAFE_INTEGER)errors.minOrderAmount='Nhập tiền hàng tối thiểu từ 0 trở lên.';
 if(!draft.maxUsage.trim()||!Number.isInteger(Number(draft.maxUsage))||Number(draft.maxUsage)<1||Number(draft.maxUsage)>2147483647)errors.maxUsage='Nhập số lượt nguyên từ 1 đến 2.147.483.647.';
 if(!Number.isFinite(vietnamExpiry(draft.expiryDate))||vietnamExpiry(draft.expiryDate)<=now)errors.expiryDate='Chọn thời điểm hết hạn trong tương lai.';
 return errors;
}
export function promotionPayload(draft:PromotionDraft,now=Date.now()){
 if(Object.keys(promotionErrors(draft,now)).length)throw Error('Thông tin khuyến mãi chưa hợp lệ.');
 return {code:draft.code.trim().toUpperCase(),discountType:Number(draft.discountType),discountValue:Number(draft.discountValue),maxDiscountAmount:draft.discountType==='1'&&draft.maxDiscountAmount.trim()?Number(draft.maxDiscountAmount):null,minOrderAmount:Number(draft.minOrderAmount),maxUsage:Number(draft.maxUsage),expiryDate:new Date(vietnamExpiry(draft.expiryDate)).toISOString(),isActive:draft.isActive};
}
export function filterPromotions(rows:PromotionItem[],keyword:string,status:string,now=Date.now()){const term=keyword.trim().toLocaleUpperCase('vi');return rows.filter(row=>(!term||row.code.toLocaleUpperCase('vi').includes(term))&&(!status||promotionStatus(row,now).key===status));}
