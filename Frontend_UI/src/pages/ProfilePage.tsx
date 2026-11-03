import { useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore,normalizeTier } from '../stores/useAuthStore';
import {accountError} from '../utils/account';
import type {UserProfile} from '../types/account';
import '../styles/account.css';
export type {UserProfile,MembershipTier} from '../types/account';
const TABS=[{key:'info',label:'Thông tin'},{key:'address',label:'Địa chỉ'},{key:'password',label:'Mật khẩu'}] as const;
const TIERS={Standard:'Tiêu chuẩn',Silver:'Bạc',Gold:'Vàng',Platinum:'Bạch kim'};
function ProfileContent({userId}:{userId:number}){
 const[tab,setTab]=useState<(typeof TABS)[number]['key']>('info');const refs=useRef<(HTMLButtonElement|null)[]>([]);
 const query=useQuery({queryKey:['userProfile',userId],queryFn:async({signal})=>{const result=await axiosClient.get<UserProfile,UserProfile>('/api/users/profile',{signal});if(result.id!==userId)throw new Error('Hồ sơ không khớp tài khoản hiện tại. Vui lòng đăng nhập lại.');return result;}});
 const profile=query.data;
 const moveTab=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{let target=index;if(event.key==='ArrowRight')target=(index+1)%3;else if(event.key==='ArrowLeft')target=(index+2)%3;else if(event.key==='Home')target=0;else if(event.key==='End')target=2;else return;event.preventDefault();setTab(TABS[target].key);refs.current[target]?.focus();};
 return <><div className="profile-toolbar"><button type="button" data-testid="button-refresh-profile" className="account-secondary" disabled={query.isFetching} onClick={()=>void query.refetch()}>{query.isFetching&&!query.isPending?'Đang làm mới…':'Làm mới'}</button></div>
  {query.isPending&&<div className="account-state" role="status"><Loader2 className="account-spin" size={28} aria-hidden="true"/><p>Đang tải hồ sơ…</p></div>}
  {query.isError&&<div className="account-state account-error" role="alert"><h2>Chưa tải được hồ sơ</h2><p>{accountError(query.error)}</p><button type="button" className="account-secondary" disabled={query.isFetching} onClick={()=>void query.refetch()}>Thử lại</button></div>}
  {profile&&<><aside className="profile-membership" aria-label="Hạng và điểm thành viên"><span>Hạng <strong>{TIERS[normalizeTier(profile.tier)]}</strong></span><span><strong>{profile.loyaltyPoints}</strong> điểm</span></aside><div className="profile-layout"><div role="tablist" aria-label="Mục hồ sơ" className="profile-tabs">{TABS.map((item,index)=><button key={item.key} ref={element=>{refs.current[index]=element;}} type="button" role="tab" id={`profile-tab-${item.key}`} aria-controls={`profile-panel-${item.key}`} aria-selected={tab===item.key} tabIndex={tab===item.key?0:-1} onKeyDown={event=>moveTab(event,index)} onClick={()=>setTab(item.key)}>{item.label}</button>)}</div><section role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`} tabIndex={0} className="profile-panel">
   {tab==='info'&&<><h2>Thông tin tài khoản</h2><dl><div><dt>Họ tên</dt><dd>{profile.fullName}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Số điện thoại</dt><dd>{profile.phoneNumber||'Chưa có thông tin'}</dd></div></dl><Link to="/my-orders" className="account-text-link">Xem đơn hàng của tôi</Link></>}
   {tab==='address'&&<><h2>Địa chỉ</h2><dl><div><dt>Địa chỉ chính</dt><dd>{profile.address1||'Chưa có địa chỉ'}</dd></div><div><dt>Địa chỉ bổ sung</dt><dd>{profile.address2||'Chưa có địa chỉ bổ sung'}</dd></div></dl><p className="account-hint">Bạn có thể sửa địa chỉ nhận hàng khi thanh toán.</p></>}
   {tab==='password'&&<><h2>Mật khẩu</h2><p>Đổi mật khẩu bằng mã xác thực gửi qua email.</p><Link to="/forgot-password" className="account-primary">Đổi mật khẩu qua email</Link></>}
  </section></div></>}
 </>;
}
export default function ProfilePage(){
 const userId=useAuthStore(state=>state.user?.id),token=useAuthStore(state=>state.token),logout=useAuthStore(state=>state.logout);
 return <div className="profile-page"><Helmet><title>Hồ sơ tài khoản | FoodDelivery</title></Helmet><header className="profile-heading"><h1>Hồ sơ tài khoản</h1>{token&&<button type="button" className="account-secondary" onClick={logout}>Đăng xuất</button>}</header>{userId&&token?<ProfileContent key={JSON.stringify([userId,token])} userId={userId}/>:<section className="account-state"><h2>Đăng nhập để xem hồ sơ</h2><Link to="/login" className="account-primary">Đăng nhập</Link></section>}</div>;
}
