import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { OrderStatusStepper } from '../components/track/OrderStatusStepper';
import { OrderBadge, OrderLines } from '../components/orders/OrderSummary';
import { orderDateLabel, orderError, paymentLabel, validateTracking } from '../utils/customerOrders';
import { formatCurrency } from '../utils/formatCurrency';
import type { OrderTracking } from '../types/tracking';
import '../styles/orders.css';
export default function TrackOrderPage(){
  const [orderId,setOrderId]=useState(''),[phone,setPhone]=useState('');
  const [errors,setErrors]=useState<{orderId?:string;phone?:string}>({});
  const [result,setResult]=useState<OrderTracking|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const request=useRef<AbortController|null>(null),generation=useRef(0),locked=useRef(false);
  const idInput=useRef<HTMLInputElement>(null),phoneInput=useRef<HTMLInputElement>(null),resultHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>()=>{generation.current++;request.current?.abort();},[]);
  useEffect(()=>{if(result)resultHeading.current?.focus();},[result]);
  const lookup=async()=>{
    if(locked.current)return;
    const input=validateTracking(orderId,phone);setErrors(input.errors);setError('');setResult(null);
    if(Object.keys(input.errors).length){(input.errors.orderId?idInput:phoneInput).current?.focus();return;}
    const version=++generation.current;const controller=new AbortController();request.current=controller;locked.current=true;setPending(true);
    try{
      const data=await axiosClient.get<OrderTracking,OrderTracking>('/api/orders/track',{params:{orderId:input.orderId,phone:input.phone},signal:controller.signal});
      if(version!==generation.current)return;
      if(data.id!==input.orderId)throw new Error('Kết quả không khớp mã đơn. Vui lòng tra cứu lại.');
      setResult(data);
    }catch(cause){if(version===generation.current&&!controller.signal.aborted)setError(orderError(cause));}
    finally{if(version===generation.current){locked.current=false;setPending(false);}}
  };
  const reset=()=>{generation.current++;request.current?.abort();locked.current=false;setPending(false);setResult(null);setError('');setErrors({});idInput.current?.focus();};
  const submit=(event:FormEvent)=>{event.preventDefault();void lookup();};
  return <div className="orders-page track-page"><Helmet><title>Tra cứu đơn hàng | FoodDelivery</title><meta name="description" content="Tra cứu đơn bằng mã đơn và số điện thoại đặt hàng."/></Helmet>
    <header className="orders-heading"><div><h1>Tra cứu đơn hàng</h1><p>Dùng mã đơn và số điện thoại đã đặt hàng.</p></div><Link to="/my-orders" className="orders-text-link">Đơn hàng của tôi</Link></header>
    <form className="track-form" onSubmit={submit} noValidate aria-busy={pending}><fieldset disabled={pending}><legend className="sr-only">Thông tin tra cứu</legend><div className="track-fields"><label>Mã đơn hàng<input ref={idInput} name="orderId" aria-label="Mã đơn hàng" required inputMode="numeric" autoComplete="off" maxLength={10} value={orderId} onChange={e=>{setOrderId(e.target.value);setErrors(p=>({...p,orderId:undefined}));setResult(null);setError('');}} aria-invalid={!!errors.orderId} aria-describedby={errors.orderId?'track-id-error':undefined}/>{errors.orderId&&<span className="orders-error" id="track-id-error">{errors.orderId}</span>}</label><label>Số điện thoại đặt hàng<input ref={phoneInput} name="phone" aria-label="Số điện thoại đặt hàng" type="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={e=>{setPhone(e.target.value);setErrors(p=>({...p,phone:undefined}));setResult(null);setError('');}} aria-invalid={!!errors.phone} aria-describedby={errors.phone?'track-phone-error':undefined}/>{errors.phone&&<span className="orders-error" id="track-phone-error">{errors.phone}</span>}</label></div><button type="submit" className="orders-primary">{pending?<><Loader2 size={17} className="orders-spin" aria-hidden="true"/>Đang tra cứu…</>:<><Search size={17} aria-hidden="true"/>Tra cứu</>}</button></fieldset>{pending&&<button type="button" className="orders-text-link" onClick={reset}>Dừng tra cứu</button>}</form>
    {error&&<div className="orders-state orders-error" role="alert"><h2>Chưa tra cứu được đơn</h2><p>{error}</p><button type="button" className="orders-secondary" onClick={()=>void lookup()}>Thử lại</button></div>}
    {result&&<section className="track-result" aria-labelledby="track-result-title"><div className="order-result-heading"><div><h2 ref={resultHeading} tabIndex={-1} id="track-result-title">Đơn hàng #{result.id}</h2><p className="orders-muted">{orderDateLabel(result.orderDate)}</p></div><OrderBadge status={result.status}/></div><OrderStatusStepper currentStatus={result.status}/><div className="track-result-grid"><section className="order-section"><h3>Thông tin đơn</h3><dl className="order-facts"><div><dt>Thanh toán</dt><dd>{paymentLabel(result.paymentMethod)}</dd></div><div><dt>Số điện thoại</dt><dd>{result.customerPhoneMasked}</dd></div><div><dt>Địa chỉ</dt><dd>{result.shippingAddressMasked}</dd></div><div className="order-total"><dt>Tổng đơn</dt><dd>{formatCurrency(result.totalAmount)}</dd></div></dl></section><section className="order-section"><h3>Sản phẩm trong đơn</h3><OrderLines lines={result.items}/></section></div><div className="orders-actions"><button type="button" className="orders-secondary" onClick={reset}>Tra cứu đơn khác</button><Link className="orders-text-link" to="/products">Tiếp tục mua sắm</Link></div></section>}
  </div>;
}
