import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/AdminLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { accountError, matchesSession } from '../../utils/account';
import { localDate, rangeErrors, readRevenue, readStatuses, statsDateLabel, statsMoney, statsAxis, type RevenueDay } from '../../utils/adminStatistics';
import '../../styles/admin-dashboard.css';

const STATUS_COLOR:Record<string,string>={'Chờ xử lý':'#b45309','Đã duyệt':'#047857','Đang giao':'#0369a1','Hoàn thành':'#065f46','Đã hủy':'#b91c1c'};
function RevenueTooltip({active,payload}:{active?:boolean;payload?:readonly {payload?:RevenueDay}[]}) {
 const row=payload?.[0]?.payload;
 return active&&row?<div className="dashboard-tooltip"><strong>{statsDateLabel(row.date)}</strong><p>{statsMoney(row.revenue)}</p><span>{row.orderCount.toLocaleString('vi-VN')} đơn hoàn thành</span></div>:null;
}
function Loading({label}:{label:string}) {return <div className="dashboard-loading" role="status"><p>{label}</p><div aria-hidden="true"/><div aria-hidden="true"/><div aria-hidden="true"/></div>;}
function Failure({error,stale,retry,pending}:{error:unknown;stale:boolean;retry:()=>void;pending:boolean}) {return <div className="dashboard-error" role="alert"><p>{accountError(error)}{stale&&' Đang hiển thị dữ liệu lần tải trước.'}</p><button type="button" disabled={pending} onClick={retry}>Thử lại</button></div>;}
function DashboardContent({userId,token}:{userId:number;token:string}) {
 const [initial]=useState(()=>{const end=localDate();return {start:`${end.slice(0,7)}-01`,end};});
 const [start,setStart]=useState(initial.start),[end,setEnd]=useState(initial.end),[applied,setApplied]=useState(initial),[errors,setErrors]=useState<{start?:string;end?:string}>({});
 const startRef=useRef<HTMLInputElement>(null),endRef=useRef<HTMLInputElement>(null);
 const today=localDate();
 const guard=()=>{if(!matchesSession(useAuthStore.getState(),{token,userId}))throw new Error('Phiên thống kê đã thay đổi.');};
 const revenue=useQuery({queryKey:['admin-stats',userId,'revenue',applied.start,applied.end],queryFn:async({signal})=>{
  const data=await axiosClient.get<unknown,unknown>(`/api/statistics/revenue?${new URLSearchParams({startDate:applied.start,endDate:applied.end})}`,{signal});guard();return readRevenue(data);
 }});
 const statuses=useQuery({queryKey:['admin-stats',userId,'status'],queryFn:async({signal})=>{const data=await axiosClient.get<unknown,unknown>('/api/statistics/order-status',{signal});guard();return readStatuses(data);}});
 const busy=revenue.isFetching||statuses.isFetching,rows=revenue.data?.byDay??[],statusTotal=statuses.data?.reduce((sum,row)=>sum+row.count,0)??0;
 const apply=(event:React.FormEvent)=>{
  event.preventDefault();const next=rangeErrors(start,end,today);setErrors(next);
  if(next.start){startRef.current?.focus();return;}if(next.end){endRef.current?.focus();return;}
  if(start===applied.start&&end===applied.end){if(!revenue.isFetching)void revenue.refetch();}else setApplied({start,end});
 };
 return <main className="admin-dashboard"><Helmet><title>Tổng quan | FoodDelivery</title></Helmet>
  <header className="dashboard-heading"><h1>Tổng quan</h1><button type="button" className="dashboard-secondary" disabled={busy} onClick={()=>{void Promise.all([revenue.refetch(),statuses.refetch()]);}}><RefreshCw size={17} aria-hidden="true"/>{busy?'Đang tải…':'Làm mới'}</button></header>
  <form className="dashboard-filter" onSubmit={apply} noValidate aria-label="Khoảng ngày doanh thu">
   <div><label htmlFor="stats-start">Từ ngày</label><input ref={startRef} id="stats-start" type="date" value={start} max={end||today} onChange={event=>setStart(event.target.value)} aria-invalid={!!errors.start} aria-describedby={errors.start?'stats-start-error':undefined}/>{errors.start&&<p id="stats-start-error" className="dashboard-field-error">{errors.start}</p>}</div>
   <div><label htmlFor="stats-end">Đến ngày</label><input ref={endRef} id="stats-end" type="date" value={end} min={start||undefined} max={today} onChange={event=>setEnd(event.target.value)} aria-invalid={!!errors.end} aria-describedby={errors.end?'stats-end-error':undefined}/>{errors.end&&<p id="stats-end-error" className="dashboard-field-error">{errors.end}</p>}</div>
   <button className="dashboard-primary" type="submit" disabled={revenue.isFetching&&start===applied.start&&end===applied.end}>Áp dụng</button>
  </form>
  <div className="dashboard-columns">
   <section className="dashboard-revenue" aria-labelledby="revenue-title" aria-busy={revenue.isFetching}><header className="dashboard-section-heading"><h2 id="revenue-title">Doanh thu</h2><p>{statsDateLabel(applied.start)} – {statsDateLabel(applied.end)}</p><p>Đơn hoàn thành, theo ngày đặt.</p></header>
    {revenue.isError&&<Failure error={revenue.error} stale={!!revenue.data} retry={()=>void revenue.refetch()} pending={revenue.isFetching}/>}
    {revenue.isPending?<Loading label="Đang tải doanh thu…"/>:revenue.data&&<>
     <dl className="dashboard-totals"><div><dt>Doanh thu</dt><dd>{statsMoney(revenue.data.totalRevenue)}</dd></div><div><dt>Đơn hoàn thành</dt><dd>{revenue.data.totalOrders.toLocaleString('vi-VN')}</dd></div></dl>
     {rows.length===0?<p className="dashboard-empty">Chưa có đơn hoàn thành trong khoảng ngày này.</p>:<>
      <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart aria-label="Doanh thu theo ngày, có bảng chi tiết bên dưới" data={rows} margin={{top:12,right:8,left:0,bottom:0}} accessibilityLayer><CartesianGrid stroke="#e2e8f0" vertical={false}/><XAxis dataKey="date" tickFormatter={value=>statsDateLabel(value).slice(0,5)} tick={{fill:'#475569',fontSize:11}} minTickGap={24} axisLine={false} tickLine={false}/><YAxis width={64} tickFormatter={statsAxis} tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<RevenueTooltip/>} cursor={{fill:'#ecfdf5'}}/><Bar dataKey="revenue" name="Doanh thu" fill="#047857" maxBarSize={40} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
      <details className="dashboard-details"><summary>Chi tiết theo ngày</summary><div className="dashboard-table" role="region" aria-label="Chi tiết doanh thu theo ngày" tabIndex={0}><table><caption className="sr-only">Doanh thu và đơn hoàn thành từ {statsDateLabel(applied.start)} đến {statsDateLabel(applied.end)}</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Đơn hoàn thành</th><th scope="col">Doanh thu</th></tr></thead><tbody>{rows.map(row=><tr key={row.date}><th scope="row">{statsDateLabel(row.date)}</th><td>{row.orderCount.toLocaleString('vi-VN')}</td><td>{statsMoney(row.revenue)}</td></tr>)}</tbody><tfoot><tr><th scope="row">Tổng cộng</th><td>{revenue.data.totalOrders.toLocaleString('vi-VN')}</td><td>{statsMoney(revenue.data.totalRevenue)}</td></tr></tfoot></table></div></details>
     </>}
    </>}
   </section>
   <section className="dashboard-status" aria-labelledby="status-title" aria-busy={statuses.isFetching}><header className="dashboard-section-heading"><h2 id="status-title">Trạng thái đơn hàng</h2><p>Tất cả thời gian</p></header>
    {statuses.isError&&<Failure error={statuses.error} stale={!!statuses.data} retry={()=>void statuses.refetch()} pending={statuses.isFetching}/>}
    {statuses.isPending?<Loading label="Đang tải trạng thái đơn…"/>:statuses.data&&(statusTotal===0?<p className="dashboard-empty">Chưa có đơn hàng.</p>:<><p className="dashboard-status-total">{statusTotal.toLocaleString('vi-VN')} đơn hàng</p><ul className="dashboard-status-list">{statuses.data.map(row=><li key={row.status}><div><span>{row.status}</span><strong>{row.count.toLocaleString('vi-VN')} <small>({(row.count/statusTotal*100).toLocaleString('vi-VN',{maximumFractionDigits:1})}%)</small></strong></div><div className="dashboard-status-track" aria-hidden="true"><span style={{width:`${row.count/statusTotal*100}%`,backgroundColor:STATUS_COLOR[row.status]??'#475569'}}/></div></li>)}</ul></>)}
   </section>
  </div>
 </main>;
}
export default function DashboardPage(){
 const userId=useAuthStore(state=>state.user?.id),token=useAuthStore(state=>state.token);
 return <AdminLayout>{userId&&token?<DashboardContent key={JSON.stringify([userId,token])} userId={userId} token={token}/>:<main><h1>Tổng quan</h1><Link to="/login">Đăng nhập để xem thống kê</Link></main>}</AdminLayout>;
}
