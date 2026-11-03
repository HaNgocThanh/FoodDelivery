import { useRef, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, ShoppingBag, Star } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import { CustomerDelivery, CustomerTotals, OrderBadge, OrderLines } from '../components/orders/OrderSummary';
import { OrderStatusStepper } from '../components/track/OrderStatusStepper';
import { canCancelOrder, canReviewOrder, canSupportOrder, orderDateLabel, orderError, paymentLabel } from '../utils/customerOrders';
import { formatCurrency } from '../utils/formatCurrency';
import type { CustomerOrder } from '../types/customerOrders';
import '../styles/orders.css';

type Action = { kind:'cancel';orderId:number } | { kind:'ticket';orderId:number;subject:string;message:string } | { kind:'review';orderId:number;productId:number;rating:number;comment:string };
type TicketDraft = {orderId:number;subject:string;message:string};
type ReviewDraft = {orderId:number;productId:number;productName:string;rating:number;comment:string};

function OwnedOrders({userId,token}:{userId:number;token:string}){
  const client=useQueryClient();
  const [notification,setNotification]=useState<{error:boolean;message:string}|null>(null);
  const [cancelId,setCancelId]=useState<number|null>(null),[ticket,setTicket]=useState<TicketDraft|null>(null),[review,setReview]=useState<ReviewDraft|null>(null);
  const lock=useRef(false);
  const currentSession=()=>{const state=useAuthStore.getState();return state.user?.id===userId&&state.token===token;};
  const query=useQuery({queryKey:['myOrders',userId],queryFn:({signal})=>axiosClient.get<CustomerOrder[],CustomerOrder[]>('/api/orders/my-orders',{signal})});
  const orders=(query.data??[]).filter(order=>order.userId===userId);
  const mutation=useMutation({
    mutationFn:async(action:Action)=>{
      if(action.kind==='cancel')return axiosClient.put(`/api/orders/my-orders/${action.orderId}/cancel`);
      if(action.kind==='ticket')return axiosClient.post('/api/tickets',{orderId:action.orderId,subject:action.subject,message:action.message});
      return axiosClient.post('/api/reviews',{orderId:action.orderId,productId:action.productId,rating:action.rating,comment:action.comment});
    },
    onSuccess:async(_,action)=>{
      if(!currentSession())return;
      await Promise.all([client.invalidateQueries({queryKey:['myOrders',userId]}),client.invalidateQueries({queryKey:['userProfile',userId]})]);
      if(!currentSession())return;
      setNotification({error:false,message:action.kind==='cancel'?`Đã hủy đơn #${action.orderId}.`:action.kind==='ticket'?`Đã gửi yêu cầu hỗ trợ cho đơn #${action.orderId}.`:'Đã gửi đánh giá sản phẩm.'});
      setCancelId(null);setTicket(null);setReview(null);
    },
    onError:cause=>{if(currentSession())setNotification({error:true,message:orderError(cause)});},
    onSettled:()=>{lock.current=false;},
  });
  const run=(action:Action)=>{
    if(lock.current||!currentSession())return;
    const order=orders.find(item=>item.id===action.orderId);
    const allowed=order&&(action.kind==='cancel'?canCancelOrder(order.status):action.kind==='ticket'?canSupportOrder(order.status):canReviewOrder(order.status,order.details.find(line=>line.productId===action.productId)?.isReviewed)&&order.details.some(line=>line.productId===action.productId));
    if(!allowed){setNotification({error:true,message:'Đơn đã đổi trạng thái. Vui lòng làm mới để kiểm tra.'});return;}
    lock.current=true;setNotification(null);mutation.mutate(action);
  };
  const submitTicket=(event:FormEvent)=>{event.preventDefault();if(ticket&&ticket.subject.trim()&&ticket.message.trim())run({kind:'ticket',orderId:ticket.orderId,subject:ticket.subject.trim(),message:ticket.message.trim()});};
  const submitReview=(event:FormEvent)=>{event.preventDefault();if(review&&review.rating>=1&&review.rating<=5&&review.comment.trim())run({kind:'review',orderId:review.orderId,productId:review.productId,rating:review.rating,comment:review.comment.trim()});};
  return <div className="orders-page"><header className="orders-heading"><div><h1>Đơn hàng của tôi</h1><Link to="/products" data-testid="button-back-home" className="orders-text-link">Tiếp tục mua sắm</Link></div><button type="button" data-testid="button-refresh-orders" className="orders-secondary" disabled={query.isFetching||mutation.isPending} onClick={()=>void query.refetch()}>{query.isFetching&&!query.isPending?'Đang làm mới…':'Làm mới'}</button></header>
    {notification&&<div className={`orders-notice${notification.error?' orders-error':''}`} role={notification.error?'alert':'status'}><p>{notification.message}</p><button type="button" className="orders-text-link" onClick={()=>setNotification(null)}>Đóng thông báo</button></div>}
    {query.isPending&&<div className="orders-state" role="status"><Loader2 className="orders-spin" size={28} aria-hidden="true"/><p>Đang tải đơn hàng…</p></div>}
    {query.isError&&<div className="orders-state orders-error" role="alert"><h2>Chưa tải được đơn hàng</h2><p>{orderError(query.error)}</p><button type="button" className="orders-secondary" disabled={query.isFetching} onClick={()=>void query.refetch()}>Thử lại</button></div>}
    {!query.isPending&&!query.isError&&!orders.length&&<section className="orders-state orders-empty"><ShoppingBag size={32} aria-hidden="true"/><h2>Bạn chưa có đơn hàng</h2><Link to="/products" data-testid="button-shop-now-empty" className="orders-primary">Chọn sản phẩm</Link></section>}
    <div className="customer-order-list">{orders.map(order=><OrderCard key={order.id} order={order}>
      <div className="orders-actions">
        {canCancelOrder(order.status)&&<button type="button" className="orders-danger" data-testid={`button-cancel-order-${order.id}`} disabled={mutation.isPending} onClick={()=>{setCancelId(order.id);setNotification(null);}}>Hủy đơn</button>}
        {canSupportOrder(order.status)&&<button type="button" className="orders-secondary" data-testid={`button-support-order-${order.id}`} disabled={mutation.isPending} onClick={()=>{setTicket({orderId:order.id,subject:'',message:''});setNotification(null);}}>Yêu cầu hỗ trợ</button>}
      </div>
      {cancelId===order.id&&<div className="order-cancel-confirm" role="group" aria-label={`Xác nhận hủy đơn #${order.id}`}><p>Hủy đơn #{order.id}?</p><button type="button" className="orders-secondary" disabled={mutation.isPending} onClick={()=>setCancelId(null)}>Giữ đơn</button><button type="button" className="orders-danger" disabled={mutation.isPending} onClick={()=>run({kind:'cancel',orderId:order.id})}>{mutation.isPending?'Đang hủy…':'Xác nhận hủy'}</button></div>}
      <OrderExpandable order={order} renderAction={line=>canReviewOrder(order.status,line.isReviewed)?<button type="button" className="orders-text-link" disabled={mutation.isPending} onClick={()=>{setReview({orderId:order.id,productId:line.productId,productName:line.productName,rating:0,comment:''});setNotification(null);}}>Đánh giá</button>:line.isReviewed?<span className="orders-muted">Đã đánh giá</span>:null}/>
      {ticket?.orderId===order.id&&<form className="order-inline-form" onSubmit={submitTicket} aria-label={`Hỗ trợ đơn #${order.id}`}><h3>Hỗ trợ đơn #{order.id}</h3><fieldset disabled={mutation.isPending}><legend className="sr-only">Nội dung hỗ trợ</legend><label>Chủ đề<input id="ticket-subject" required maxLength={200} value={ticket.subject} onChange={e=>setTicket({...ticket,subject:e.target.value})}/></label><label>Nội dung<textarea id="ticket-message" required rows={4} maxLength={4000} value={ticket.message} onChange={e=>setTicket({...ticket,message:e.target.value})}/></label><div className="orders-actions"><button type="submit" className="orders-primary" data-testid="button-submit-ticket">{mutation.isPending?'Đang gửi…':'Gửi yêu cầu'}</button><button type="button" className="orders-secondary" data-testid="button-cancel-ticket" onClick={()=>setTicket(null)}>Đóng</button></div></fieldset></form>}
      {review?.orderId===order.id&&<form className="order-inline-form" onSubmit={submitReview} aria-label={`Đánh giá ${review.productName}`}><h3>Đánh giá sản phẩm</h3><p className="orders-muted">{review.productName}</p><fieldset disabled={mutation.isPending}><legend className="sr-only">Nội dung đánh giá</legend><fieldset className="order-rating"><legend>Số sao</legend><div>{[1,2,3,4,5].map(value=><label key={value}><input className="sr-only" type="radio" name="review-rating" required value={value} checked={review.rating===value} onChange={()=>setReview({...review,rating:value})}/><span>{value}<Star size={15} aria-hidden="true"/></span><span className="sr-only"> sao</span></label>)}</div></fieldset><label>Nhận xét<textarea id="review-comment" required maxLength={1000} rows={4} value={review.comment} onChange={e=>setReview({...review,comment:e.target.value})}/></label><div className="orders-actions"><button type="submit" className="orders-primary" disabled={!review.rating||!review.comment.trim()}>{mutation.isPending?'Đang gửi…':'Gửi đánh giá'}</button><button type="button" className="orders-secondary" onClick={()=>setReview(null)}>Đóng</button></div></fieldset></form>}
    </OrderCard>)}</div>
  </div>;
}
function OrderCard({order,children}:{order:CustomerOrder;children:React.ReactNode}){
  const quantity=(order.details??[]).reduce((n,line)=>n+line.quantity,0);
  return <article className="customer-order" data-testid={`order-card-${order.id}`} aria-labelledby={`order-title-${order.id}`}><div className="customer-order-summary"><div><h2 id={`order-title-${order.id}`}>Đơn #{order.id}</h2><p>{orderDateLabel(order.orderDate)} · {quantity} sản phẩm</p></div><OrderBadge status={order.status}/><strong className="customer-order-total">{formatCurrency(order.totalAmount)}</strong></div>{children}</article>;
}
function OrderExpandable({order,renderAction}:{order:CustomerOrder;renderAction:Parameters<typeof OrderLines>[0]['renderAction']}){
  const [open,setOpen]=useState(false);
  return <details className="order-expand" onToggle={event=>setOpen(event.currentTarget.open)}><summary data-testid={`button-toggle-order-${order.id}`}>Chi tiết đơn hàng</summary>{open&&<div className="order-detail-body"><OrderStatusStepper currentStatus={order.status}/><p className="orders-muted">{paymentLabel(order.paymentMethod)}</p><CustomerDelivery order={order}/><section className="order-section"><h3>Sản phẩm trong đơn</h3><OrderLines lines={order.details??[]} photos renderAction={renderAction}/></section><CustomerTotals order={order}/></div>}</details>;
}
export default function MyOrdersPage(){
  const userId=useAuthStore(state=>state.user?.id),token=useAuthStore(state=>state.token);
  if(!userId||!token)return <div className="orders-page"><h1>Đơn hàng của tôi</h1><section className="orders-state"><h2>Đăng nhập để xem đơn hàng</h2><Link className="orders-primary" to="/login">Đăng nhập</Link></section></div>;
  return <OwnedOrders key={JSON.stringify([userId,token])} userId={userId} token={token}/>;
}
