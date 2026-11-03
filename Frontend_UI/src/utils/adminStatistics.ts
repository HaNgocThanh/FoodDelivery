export interface RevenueDay {date:string;revenue:number;orderCount:number}
export interface RevenueStats {totalRevenue:number;totalOrders:number;byDay:RevenueDay[]}
export interface StatusStat {status:string;count:number}
export function localDate(date=new Date()) {return `${date.getFullYear().toString().padStart(4,'0')}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;}
export function isStatsDate(value:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const[y,m,d]=value.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0);
 return y>=1&&m>=1&&m<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
export function rangeErrors(start:string,end:string,today:string) {
 const errors:{start?:string;end?:string}={};
 if(!isStatsDate(start))errors.start='Chọn ngày bắt đầu hợp lệ.';
 if(!isStatsDate(end))errors.end='Chọn ngày kết thúc hợp lệ.';
 if(errors.start||errors.end)return errors;
 if(start>end)errors.end='Ngày kết thúc phải từ ngày bắt đầu trở đi.';
 else if(end>today)errors.end='Chọn ngày không muộn hơn hôm nay.';
 return errors;
}
const amount=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const count=(value:unknown):value is number=>amount(value)&&Number.isSafeInteger(value);
function badData():never {throw new Error('Dữ liệu thống kê chưa hợp lệ. Vui lòng tải lại.');}
export function readRevenue(value:unknown):RevenueStats {
 const data=value as RevenueStats;
 if(!data||!amount(data.totalRevenue)||!count(data.totalOrders)||!Array.isArray(data.byDay)||data.byDay.some(row=>!row||!isStatsDate(row.date)||!amount(row.revenue)||!count(row.orderCount)))return badData();
 return {...data,byDay:[...data.byDay].sort((a,b)=>a.date.localeCompare(b.date))};
}
const ORDER=['Chờ xử lý','Đã duyệt','Đang giao','Hoàn thành','Đã hủy'];
export function readStatuses(value:unknown):StatusStat[] {
 if(!Array.isArray(value)||value.some(row=>!row||typeof row.status!=='string'||!row.status.trim()||!count(row.count)))return badData();
 return [...value].sort((a,b)=>(ORDER.indexOf(a.status)<0?99:ORDER.indexOf(a.status))-(ORDER.indexOf(b.status)<0?99:ORDER.indexOf(b.status)));
}
export const statsDateLabel=(value:string)=>value.split('-').reverse().join('/');
export const statsMoney=(value:number)=>`${value.toLocaleString('vi-VN')} đ`;
export const statsAxis=(value:number)=>value>=1e12?value.toExponential(1):value>=1e9?`${+(value/1e9).toFixed(1)} tỷ`:value>=1e6?`${+(value/1e6).toFixed(1)} tr`:value>=1e3?`${+(value/1e3).toFixed(1)} nghìn`:String(value);
