import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuthStore, normalizeTier } from '../../stores/useAuthStore';
import { accountError, authDestination, isAccountEmail, isResetCode, matchesSession } from '../../utils/account';
import type { AuthApiResponse, UserProfile } from '../../types/account';
import '../../styles/account.css';
export type AuthMode='login'|'register'|'forgot'|'reset';
type Fields={fullName:string;email:string;password:string;confirmPassword:string;phoneNumber:string;address1:string;otp:string};
const TITLES={login:'Đăng nhập',register:'Tạo tài khoản',forgot:'Quên mật khẩu',reset:'Đặt lại mật khẩu'};
const ACTIONS={login:'Đăng nhập',register:'Tạo tài khoản',forgot:'Gửi mã xác thực',reset:'Đặt lại mật khẩu'};
export function AccountLayout({title,children,wide=false}:{title:string;children:ReactNode;wide?:boolean}){
 return <div className={`account-page${wide?' account-wide':''}`}><Helmet><title>{`${title} | FoodDelivery`}</title></Helmet><div className="account-content"><h1>{title}</h1>{children}</div></div>;
}
function PasswordField({id,label,field,error,hint,autoComplete}:{id:string;label:string;field:UseFormRegisterReturn;error?:string;hint?:string;autoComplete:string}){
 const[visible,setVisible]=useState(false);const described=[hint?`${id}-hint`:null,error?`${id}-error`:null].filter(Boolean).join(' ')||undefined;
 return <div className="account-field"><label htmlFor={id}>{label}</label><div className="account-password"><input id={id} type={visible?'text':'password'} autoComplete={autoComplete} {...field} aria-invalid={!!error} aria-describedby={described}/><button type="button" aria-label={`${visible?'Ẩn':'Hiện'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>{hint&&<p id={`${id}-hint`} className="account-hint">{hint}</p>}{error&&<p id={`${id}-error`} className="account-error">{error}</p>}</div>;
}
export function AuthForm({mode,email=''}:{mode:AuthMode;email?:string}){
 const navigate=useNavigate();const login=useAuthStore(state=>state.login);
 const[pending,setPending]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 const alive=useRef(true),locked=useRef(false),errorRef=useRef<HTMLParagraphElement>(null);
 const {register,handleSubmit,getValues,reset,formState:{errors}}=useForm<Fields>({defaultValues:{email,fullName:'',password:'',confirmPassword:'',phoneNumber:'',address1:'',otp:''}});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 const submit=async(fields:Fields)=>{
  if(locked.current)return;locked.current=true;setPending(true);setError('');
  const before=useAuthStore.getState();const initial={token:before.token,userId:before.user?.id};
  const active=()=>alive.current&&matchesSession(useAuthStore.getState(),initial);
  try{
   if(mode==='forgot'){
    await axiosClient.post('/api/auth/forgot-password',{email:fields.email.trim()});
    if(active())navigate(`/reset-password?email=${encodeURIComponent(fields.email.trim())}`);
   }else if(mode==='reset'){
    await axiosClient.post('/api/auth/reset-password',{email:email.trim(),otp:fields.otp,newPassword:fields.password});
    if(active()){reset({email});setSuccess(true);}
   }else{
    const payload=mode==='login'?{email:fields.email.trim(),password:fields.password}:{fullName:fields.fullName.trim(),email:fields.email.trim(),password:fields.password,phoneNumber:fields.phoneNumber.trim(),address1:fields.address1.trim(),role:'Customer'};
    const result=await axiosClient.post<AuthApiResponse,AuthApiResponse>(`/api/auth/${mode==='login'?'login':'register'}`,payload);
    if(!active())return;
    login(result.token,{id:result.userId,fullName:result.fullName,email:result.email,role:result.role});
    const signedIn={token:result.token,userId:result.userId};
    if(mode==='login'){
     try{const profile=await axiosClient.get<UserProfile,UserProfile>('/api/users/profile');
      if(alive.current&&matchesSession(useAuthStore.getState(),signedIn)&&profile.id===result.userId)
       useAuthStore.getState().updateUser({loyaltyPoints:profile.loyaltyPoints??0,tier:normalizeTier(profile.tier)});
     }catch{/* Profile refresh remains optional for successful login. */}
    }
    if(alive.current&&matchesSession(useAuthStore.getState(),signedIn))navigate(authDestination(result.role));
   }
  }catch(cause){if(active())setError(accountError(cause));}
  finally{locked.current=false;if(alive.current)setPending(false);}
 };
 const field=(name:'fullName'|'email'|'phoneNumber'|'address1'|'otp',label:string,options:{type?:string;autoComplete?:string;maxLength?:number;required?:boolean}={})=>{
  const error=errors[name]?.message;
  return <div className={`account-field${name==='address1'?' account-field-wide':''}`}><label htmlFor={`account-${name}`}>{label}{!options.required&&<span> (không bắt buộc)</span>}</label><input id={`account-${name}`} type={options.type??'text'} autoComplete={options.autoComplete} inputMode={name==='otp'?'numeric':undefined} maxLength={options.maxLength} {...register(name,{required:options.required?`Nhập ${label.toLowerCase()}.`:false,validate:value=>name==='email'?isAccountEmail(value)||'Nhập địa chỉ email hợp lệ.':name==='otp'?isResetCode(value)||'Mã xác thực gồm 6 chữ số.':name==='fullName'?!!value.trim()||'Nhập họ tên.':name==='phoneNumber'?(value===''||/^\+?[0-9][0-9 .()-]{6,19}$/.test(value))||'Nhập số điện thoại hợp lệ.':true})} aria-invalid={!!error} aria-describedby={error?`account-${name}-error`:undefined}/>{error&&<p className="account-error" id={`account-${name}-error`}>{error}</p>}</div>;
 };
 const title=TITLES[mode];
 if(mode==='reset'&&!isAccountEmail(email))return <AccountLayout title={title}><section className="account-state"><h2>Thiếu email khôi phục</h2><p>Mở lại bước nhận mã để tiếp tục.</p><Link to="/forgot-password" className="account-primary">Nhận mã xác thực</Link></section></AccountLayout>;
 if(success)return <AccountLayout title={title}><section className="account-state"><CheckCircle2 size={36} aria-hidden="true"/><h2>Đặt lại mật khẩu thành công</h2><p role="status">Bạn có thể đăng nhập bằng mật khẩu mới.</p><Link to="/login" className="account-primary">Đăng nhập</Link></section></AccountLayout>;
 return <AccountLayout title={title} wide={mode==='register'}>
  {mode==='forgot'&&<p className="account-intro">Nhập email đã đăng ký để nhận mã xác thực.</p>}
  {mode==='reset'&&<p className="account-intro">Nhập mã xác thực cho <strong>{email}</strong>.</p>}
  {error&&<p className="account-error account-server-error" ref={errorRef} tabIndex={-1} role="alert">{error}</p>}
  <form onSubmit={handleSubmit(submit)} noValidate aria-busy={pending}><fieldset disabled={pending}><legend className="sr-only">{title}</legend><div className={mode==='register'?'account-form-grid':''}>
   {mode==='register'&&field('fullName','Họ tên',{required:true,maxLength:150,autoComplete:'name'})}
   {mode!=='reset'&&field('email','Email',{required:true,type:'email',maxLength:100,autoComplete:'email'})}
   {mode==='reset'&&field('otp','Mã xác thực',{required:true,maxLength:6,autoComplete:'one-time-code'})}
   {mode!=='forgot'&&<PasswordField id="account-password" label={mode==='reset'?'Mật khẩu mới':'Mật khẩu'} autoComplete={mode==='login'?'current-password':'new-password'} hint={mode==='login'?undefined:'Tối thiểu 6 ký tự.'} field={register('password',{required:'Nhập mật khẩu.',minLength:mode==='login'?undefined:{value:6,message:'Mật khẩu cần ít nhất 6 ký tự.'},validate:value=>!!value.trim()||'Nhập mật khẩu.'})} error={errors.password?.message}/>}
   {mode==='reset'&&<PasswordField id="account-confirm" label="Nhập lại mật khẩu mới" autoComplete="new-password" field={register('confirmPassword',{required:'Nhập lại mật khẩu mới.',validate:value=>value===getValues('password')||'Mật khẩu nhập lại chưa khớp.'})} error={errors.confirmPassword?.message}/>}
   {mode==='register'&&field('phoneNumber','Số điện thoại',{type:'tel',maxLength:20,autoComplete:'tel'})}
   {mode==='register'&&field('address1','Địa chỉ nhận hàng',{autoComplete:'street-address'})}
  </div>{mode==='login'&&<Link to="/forgot-password" className="account-forgot">Quên mật khẩu?</Link>}<button type="submit" className="account-primary" disabled={pending}>{pending?<><Loader2 size={18} className="account-spin" aria-hidden="true"/>Đang xử lý…</>:ACTIONS[mode]}</button></fieldset></form>
  <footer className="account-footer">{mode==='login'?<p>Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>:mode==='register'?<p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>:<Link to="/login">Quay lại đăng nhập</Link>}{mode==='reset'&&<Link to="/forgot-password">Nhận mã mới</Link>}</footer>
 </AccountLayout>;
}
