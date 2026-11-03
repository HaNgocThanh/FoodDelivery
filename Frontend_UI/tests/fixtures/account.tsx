// Dev-only harness: synthetic credentials, memory-only storage; every Axios request is intercepted.
// No real registration, email, credential reset or profile write reaches the API.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import { queryClient } from '../../src/api/queryClient';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useCartStore } from '../../src/stores/useCartStore';
import LoginPage from '../../src/pages/LoginPage';
import RegisterPage from '../../src/pages/RegisterPage';
import ForgotPasswordPage from '../../src/pages/ForgotPasswordPage';
import ResetPasswordPage from '../../src/pages/ResetPasswordPage';
import ProfilePage from '../../src/pages/ProfilePage';
import '../../src/index.css';
const initial=new URLSearchParams(location.search),view=initial.get('view')??'login',scenario=initial.get('case')??'normal';
const memory=new Map<string,string>();
const localMemory={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);},clear:()=>memory.clear(),key:(index:number)=>[...memory.keys()][index]??null,get length(){return memory.size;}};
Object.defineProperty(window,'localStorage',{value:localMemory,configurable:true});
const storage=createJSONStorage(()=>localMemory);useAuthStore.persist.setOptions({storage});useCartStore.persist.setOptions({storage});
const user={id:999999,fullName:'Người dùng kiểm thử',email:'fixture@example.invalid',role:'Customer'};
useAuthStore.setState(view==='profile'&&scenario!=='guest'?{token:'isolated-account-token',user}:{token:null,user:null});useCartStore.setState({items:[]});
queryClient.clear();queryClient.setQueryDefaults(['userProfile'],{retry:false});
queryClient.setQueryData(['private-fixture',999998],{marker:'old-account'});
const counts={login:0,register:0,forgot:0,reset:0,profile:0};let passwordPreserved=false;let customerRoleOnly=false;
const pending:Array<()=>void>=[];const listeners=new Set<()=>void>();const notify=()=>listeners.forEach(fn=>fn());
axiosClient.defaults.adapter=async config=>{
 const ok=(data:unknown)=>({data,status:200,statusText:'OK',headers:{},config});const fail=(message:string)=>{throw{response:{status:400,data:{detail:message}},config};};
 const hold=()=>new Promise<void>(resolve=>pending.push(resolve));
 if(config.url==='/api/users/profile'){
   const owner=useAuthStore.getState().user?.id??999999;counts.profile++;notify();if(scenario==='profile-slow')await hold();
   if(scenario==='profile-error'&&counts.profile===1)return fail('Chưa tải được hồ sơ. Vui lòng thử lại.');
   return ok({id:owner,fullName:owner===999996?'Tài khoản kiểm thử B':scenario==='long-profile'?'Tên tài khoản kiểm thử rất dài để kiểm tra khả năng xuống dòng và giữ nguyên nội dung trên màn hình điện thoại':'Người dùng kiểm thử',email:owner===999996?'other@example.invalid':scenario==='long-profile'?'very.long.synthetic.account.address.for.mobile.wrapping@example.invalid':'fixture@example.invalid',phoneNumber:scenario==='empty-profile'?'':'0900000000',address1:scenario==='empty-profile'?'':'Địa chỉ kiểm thử dài để kiểm tra xuống dòng trên điện thoại',address2:scenario==='empty-profile'?'':'Địa chỉ bổ sung kiểm thử',loyaltyPoints:scenario==='empty-profile'?0:125,tier:scenario==='empty-profile'?0:2,role:'Customer'});
 }
 const kind=config.url==='/api/auth/login'?'login':config.url==='/api/auth/register'?'register':config.url==='/api/auth/forgot-password'?'forgot':config.url==='/api/auth/reset-password'?'reset':null;
 if(!kind)return fail('Unexpected fixture request');
 const count=++counts[kind];const payload=JSON.parse(config.data);passwordPreserved=payload.password==='  fixture-pass  '||payload.newPassword==='  fixture-pass  ';customerRoleOnly=payload.role==='Customer';notify();await hold();
 if((scenario==='error'&&count===1)||scenario==='expired')return fail(kind==='reset'?'Mã OTP không chính xác hoặc đã hết hạn.':kind==='login'?'Email hoặc mật khẩu không chính xác.':'Yêu cầu chưa thành công. Vui lòng thử lại.');
 if(kind==='forgot'||kind==='reset')return ok({message:'Đã xử lý yêu cầu kiểm thử.'});
 return ok({token:'isolated-login-token',userId:user.id,fullName:user.fullName,email:payload.email,role:scenario==='admin'?'Admin':'Customer',expiresAt:'2099-01-01T00:00:00Z'});
};
export function Fixture(){
 const location=useLocation();const[,update]=useState(0);const account=useAuthStore(state=>state.user?.id);
 useEffect(()=>{const refresh=()=>update(n=>n+1);listeners.add(refresh);const unsub=queryClient.getQueryCache().subscribe(refresh);return()=>{listeners.delete(refresh);unsub();};},[]);
 const current=location.pathname.startsWith('/tests/')?view:location.pathname==='/reset-password'?'reset':location.pathname==='/login'?'login':location.pathname==='/forgot-password'?'forgot':'destination';
 return <><aside aria-label="Fixture controls" style={{padding:12,fontSize:12,background:'#f8fafc',overflowWrap:'anywhere'}}><p>KIỂM THỬ CÁCH LY — không tạo tài khoản, gửi email hay đổi mật khẩu thật</p><output data-testid="fixture-state">{JSON.stringify({counts,account,path:location.pathname,passwordPreserved,customerRoleOnly,oldCachePresent:!!queryClient.getQueryData(['private-fixture',999998])})}</output><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" onClick={()=>pending.shift()?.()}>Cho phép phản hồi</button><button type="button" onClick={()=>useAuthStore.setState({token:'isolated-other-token',user:{...user,id:999996}})}>Đổi tài khoản</button></div></aside>{current==='login'?<LoginPage/>:current==='register'?<RegisterPage/>:current==='forgot'?<ForgotPasswordPage/>:current==='reset'?<ResetPasswordPage/>:current==='profile'?<ProfilePage/>:<h1>Đích điều hướng kiểm thử</h1>}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><HelmetProvider><QueryClientProvider client={queryClient}><Fixture/></QueryClientProvider></HelmetProvider></BrowserRouter></StrictMode>);
