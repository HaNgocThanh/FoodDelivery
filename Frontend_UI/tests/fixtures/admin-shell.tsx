// Isolated shell integration: memory-only session and intercepted GETs; writes are rejected.
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation,useNavigate} from 'react-router-dom';
import {QueryClientProvider} from '@tanstack/react-query';
import {createJSONStorage} from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import {queryClient} from '../../src/api/queryClient';
import {useAuthStore} from '../../src/stores/useAuthStore';
import {ProtectedRoute} from '../../src/components/ProtectedRoute';
import AdminLayout from '../../src/components/AdminLayout';
import DashboardPage from '../../src/pages/admin/DashboardPage';
import OrderManagementPage from '../../src/pages/OrderManagementPage';
import ProductManagementPage from '../../src/pages/ProductManagementPage';
import PromotionManagementPage from '../../src/pages/PromotionManagementPage';
import UserManagementPage from '../../src/pages/UserManagementPage';
import '../../src/index.css';
const params=new URLSearchParams(location.search),view=params.get('view')??'shell',scenario=params.get('case')??'normal';
const memory=new Map<string,string>(),storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);}};
Object.defineProperty(window,'localStorage',{value:storage,configurable:true});useAuthStore.persist.setOptions({storage:createJSONStorage(()=>storage)});
useAuthStore.setState({token:scenario==='guest'?null:'isolated-admin-session',user:scenario==='guest'?null:{id:999995,email:'admin@example.invalid',role:scenario==='customer'?'Customer':'Admin',fullName:scenario==='long-name'?'Quản trị viên thử nghiệm với tên dài '.repeat(5):'Quản trị viên mẫu'}});
axiosClient.defaults.adapter=async config=>{
 if(config.method!=='get')throw Error('Fixture blocks all writes');let data:unknown=[];
 if(config.url?.startsWith('/api/statistics/revenue'))data={totalRevenue:0,totalOrders:0,byDay:[]};
 if(config.url?.startsWith('/api/users'))data={items:[],totalCount:0,page:1,pageSize:10,totalPages:0};
 return{data,status:200,statusText:'OK',headers:{},config};
};queryClient.setDefaultOptions({queries:{retry:false}});
function Sample(){return <AdminLayout><main><h1>Đơn hàng</h1><p style={{color:'#475569',marginTop:10}}>Dữ liệu minh họa kiểm thử bố cục.</p><div style={{overflowX:'auto',marginTop:28}}><table style={{width:'100%',minWidth:520,textAlign:'left'}}><thead><tr>{['Mã đơn','Khách hàng','Trạng thái','Tổng tiền'].map(label=><th style={{padding:16,borderBottom:'1px solid #e2e8f0'}} key={label}>{label}</th>)}</tr></thead><tbody><tr>{['#TEST-001','Khách kiểm thử','Chờ xử lý','120.000 đ'].map(value=><td style={{padding:16,borderBottom:'1px solid #e2e8f0'}} key={value}>{value}</td>)}</tr></tbody></table></div><button style={{marginTop:24,padding:12,border:'1px solid #cbd5e1',borderRadius:8}}>Thao tác kiểm thử</button></main></AdminLayout>}
export function Fixture(){const{pathname}=useLocation();const navigate=useNavigate();const[status,setStatus]=useState('');const token=useAuthStore(state=>state.token);useEffect(()=>setStatus(`${pathname} · ${token?'có phiên':'đã đăng xuất'}`),[pathname,token]);return <><div style={{display:params.has('compact')?'none':undefined,padding:10,background:'#fffbeb',color:'#78350f',fontSize:12,overflowWrap:'anywhere'}}>KIỂM THỬ CÁCH LY — dữ liệu minh họa, không gửi yêu cầu thật. <output data-testid="fixture-state">{status}</output><button style={{marginLeft:12,minHeight:32,textDecoration:'underline'}} onClick={()=>navigate(-1)}>Quay lại kiểm thử</button></div><Routes><Route element={<ProtectedRoute requiredRole="Admin"/>}>{view==='shell'?<Route path="/admin/*" element={<Sample/>}/>:<><Route path="/admin/dashboard" element={<DashboardPage/>}/><Route path="/admin/orders" element={<OrderManagementPage/>}/><Route path="/admin/products" element={<ProductManagementPage/>}/><Route path="/admin/promotions" element={<PromotionManagementPage/>}/><Route path="/admin/users" element={<UserManagementPage/>}/><Route path="/admin/support" element={<AdminLayout><main><h1>Hỗ trợ</h1><p>Nội dung thay thế để kiểm tra khung; không mở kết nối admin.</p></main></AdminLayout>}/></>}</Route><Route path="*" element={<h1 style={{padding:24}}>Đích điều hướng kiểm thử: {pathname}</h1>}/></Routes></>}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[`/admin/${view==='shell'?'orders':view}`]}><Fixture/></MemoryRouter></QueryClientProvider>);
