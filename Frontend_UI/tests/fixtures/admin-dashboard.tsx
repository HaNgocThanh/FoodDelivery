// All requests are intercepted; synthetic admin session/storage never reach the server.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {HelmetProvider} from 'react-helmet-async';
import {QueryClientProvider} from '@tanstack/react-query';
import {createJSONStorage} from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import {queryClient} from '../../src/api/queryClient';
import {useAuthStore} from '../../src/stores/useAuthStore';
import DashboardPage from '../../src/pages/admin/DashboardPage';
import '../../src/index.css';
const scenario=new URLSearchParams(location.search).get('case')??'normal',memory=new Map<string,string>();
const storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);}};
Object.defineProperty(window,'localStorage',{value:storage,configurable:true});useAuthStore.persist.setOptions({storage:createJSONStorage(()=>storage)});
useAuthStore.setState({token:'dashboard-fixture-a',user:{id:999994,email:'admin@example.invalid',role:'Admin',fullName:'Quản trị viên kiểm thử'}});
let revenueCalls=0,statusCalls=0,lastStart='',lastEnd='',failRevenue=false,failStatus=false,pending:(()=>void)[]=[];
axiosClient.defaults.adapter=async config=>{
 if(config.method!=='get')throw Error('All writes are blocked');const url=new URL(config.url!,'http://fixture.invalid'),revenue=url.pathname.endsWith('/revenue');
 if(revenue){revenueCalls++;lastStart=url.searchParams.get('startDate')??'';lastEnd=url.searchParams.get('endDate')??'';}else statusCalls++;
 const start=lastStart,end=lastEnd,account=String(config.headers?.Authorization).includes('fixture-b')?2:1;
 if(scenario==='slow')await new Promise<void>(resolve=>pending.push(resolve));
 if((revenue&&(failRevenue||((scenario==='revenue-error'||scenario==='error')&&revenueCalls===1)))||(!revenue&&(failStatus||((scenario==='status-error'||scenario==='error')&&statusCalls===1)))){if(revenue)failRevenue=false;else failStatus=false;throw Error('Isolated failure');}
 let data:unknown;
 if(revenue){const dates=[...new Set([start,end])];const byDay=dates.map((date,index)=>({date,revenue:(scenario==='large'?987654321098765:925000+index*575000)*account,orderCount:(index+2)*account}));data=scenario==='empty'?{totalRevenue:0,totalOrders:0,byDay:[]}:scenario==='malformed'?{totalRevenue:'invalid'}:{totalRevenue:byDay.reduce((sum,row)=>sum+row.revenue,0),totalOrders:byDay.reduce((sum,row)=>sum+row.orderCount,0),byDay};}
 else data=scenario==='empty'?[]:[{status:'Chờ xử lý',count:11},{status:'Đã duyệt',count:6},{status:'Đang giao',count:5},{status:'Hoàn thành',count:22},{status:'Đã hủy',count:4},...(scenario==='large'?[{status:'Trạng thái chưa có nhãn ngắn cần xuống dòng '.repeat(3),count:1}]:[])];
 return{data,status:200,statusText:'OK',headers:{},config};
};queryClient.setDefaultOptions({queries:{retry:false}});
export function Fixture(){const[version,refresh]=useState(0);return <><aside style={{display:new URLSearchParams(location.search).has('compact')?'none':undefined,padding:10,fontSize:12,color:'#78350f',background:'#fffbeb',overflowWrap:'anywhere'}}><p>KIỂM THỬ CÁCH LY — số liệu minh họa, không truy cập API thật.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button style={{minHeight:32,textDecoration:'underline'}} onClick={()=>{pending.splice(0).forEach(resolve=>resolve());refresh(version+1);}}>Cho phép phản hồi</button><button style={{minHeight:32,textDecoration:'underline'}} onClick={()=>{failRevenue=true;failStatus=true;refresh(version+1);}}>Lỗi lần tải tiếp</button><button style={{minHeight:32,textDecoration:'underline'}} onClick={()=>{useAuthStore.getState().login('dashboard-fixture-b',{id:999993,email:'admin-b@example.invalid',fullName:'Quản trị viên B kiểm thử',role:'Admin'});refresh(version+1);}}>Đổi tài khoản</button><button style={{minHeight:32,textDecoration:'underline'}} onClick={()=>refresh(version+1)}>Đọc bộ đếm</button></div><output data-testid="fixture-state">{JSON.stringify({version,revenueCalls,statusCalls,lastStart,lastEnd,pending:pending.length})}</output></aside><DashboardPage/></>}
createRoot(document.getElementById('root')!).render(<HelmetProvider><QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/admin/dashboard']}><Fixture/></MemoryRouter></QueryClientProvider></HelmetProvider>);
