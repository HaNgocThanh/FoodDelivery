// Dev-only fixture. In-memory stores and adapter isolate all reads/mutations from the API.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useCartStore } from '../../src/stores/useCartStore';
import TrackOrderPage from '../../src/pages/TrackOrderPage';
import MyOrdersPage from '../../src/pages/MyOrdersPage';
import '../../src/index.css';
const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'orders', scenario = params.get('case') ?? 'normal';
const memory = new Map<string,string>();
const storage = createJSONStorage(() => ({getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);}}));
useAuthStore.persist.setOptions({storage}); useCartStore.persist.setOptions({storage});
const user = {id:999999,fullName:'Tài khoản kiểm thử',email:'fixture@example.invalid',role:'User'};
useAuthStore.setState(scenario==='guest'?{token:null,user:null}:{token:'isolated-orders-token',user});
useCartStore.setState({items:[]});
const line = {productId:999998,productName:'Sản phẩm kiểm thử tên dài để kiểm tra xuống dòng trên điện thoại',quantity:2,unitPrice:100000,subtotal:200000,isReviewed:false};
let orders = [
  {id:9001,userId:user.id,status:1,orderDate:'2026-11-03T08:00:00Z',paymentMethod:1,subTotal:200000,discountAmount:0,totalAmount:240000,shippingFee:25000,toteDeposit:15000,tipAmount:0,pointDiscount:0,recipientName:'Người nhận kiểm thử',recipientPhone:'0900000000',deliveryAddress:'Địa chỉ kiểm thử dài để kiểm tra xuống dòng, Quận kiểm thử',deliverySlot:'slot-b',deliveryNotes:'Gọi trước khi giao',leaveAtDoorstep:false,details:[{...line}]},
  {id:9002,userId:user.id,status:'Completed',orderDate:'2026-11-02T08:00:00Z',paymentMethod:'Online',subTotal:200000,discountAmount:20000,appliedCouponCode:'TEST',totalAmount:205000,shippingFee:25000,toteDeposit:15000,pointDiscount:15000,tipAmount:0,recipientName:'Người nhận kiểm thử',recipientPhone:'0900000000',deliveryAddress:'Địa chỉ kiểm thử',deliverySlot:'slot-c',deliveryNotes:'',leaveAtDoorstep:true,details:[{...line}]},
  {id:9003,userId:user.id,status:5,orderDate:'2026-11-01T08:00:00Z',paymentMethod:'COD',subTotal:200000,totalAmount:240000,shippingFee:25000,toteDeposit:15000,details:[{...line,isReviewed:true}]},
];
const pending:Array<()=>void>=[];
const counts={track:0,cancel:0,ticket:0,review:0,orders:0};
let lastPayload:unknown;
let refresh = ()=>{};
axiosClient.defaults.adapter=async config=>{
  const ok=(data:unknown)=>({data,status:200,statusText:'OK',headers:{},config});
  const fail=(message:string)=>{throw{response:{status:400,data:{detail:message}},config};};
  const hold=()=>new Promise<void>(resolve=>pending.push(resolve));
  if(config.url==='/api/orders/track'){
    counts.track++; refresh(); await hold();
    if(scenario==='notfound'||(scenario==='retry'&&counts.track===1))return fail('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại Mã đơn và Số điện thoại.');
    return ok({id:Number(config.params.orderId),orderDate:'2026-11-03T08:00:00Z',status:params.get('status')??'Shipping',subTotal:200000,discountAmount:0,totalAmount:240000,paymentMethod:'COD',customerName:'Người nhận kiểm thử',customerPhoneMasked:'090****000',shippingAddressMasked:'*** Quận kiểm thử',items:[line]});
  }
  if(config.url==='/api/orders/my-orders'){
    const owner=useAuthStore.getState().user?.id; counts.orders++; refresh();
    if(scenario==='loading')await hold();
    if(scenario==='list-error'&&counts.orders===1)return fail('Không kết nối được máy chủ. Vui lòng thử lại.');
    return ok(scenario==='empty'||owner!==user.id?[]:orders);
  }
  if(config.url?.startsWith('/api/products/'))return ok({imageUrl:null});
  if(config.url?.endsWith('/cancel')){
    const count=++counts.cancel;lastPayload={url:config.url};refresh();await hold();
    if(scenario==='action-error'&&count===1)return fail('Đơn đã chuyển trạng thái và không thể hủy.');
    const id=Number(config.url.split('/').at(-2));orders=orders.map(x=>x.id===id?{...x,status:5}:x);return ok({message:'Đã hủy đơn.'});
  }
  if(config.url==='/api/tickets'||config.url==='/api/reviews'){
    const kind=config.url==='/api/tickets'?'ticket':'review';const count=++counts[kind];lastPayload=JSON.parse(config.data);refresh();await hold();
    if(scenario==='action-error'&&count===1)return fail('Chưa gửi được yêu cầu. Vui lòng thử lại.');
    if(kind==='review'){const payload=JSON.parse(config.data);orders=orders.map(x=>x.id===payload.orderId?{...x,details:x.details.map(d=>d.productId===payload.productId?{...d,isReviewed:true}:d)}:x);}
    return ok({id:999997});
  }
  return fail('Unexpected fixture request: '+config.url);
};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false},mutations:{retry:false}}});
client.setQueryData(['myOrders',999996],[]);
export function Fixture(){
  const[,update]=useState(0);refresh=()=>update(n=>n+1);
  return <><aside aria-label="Fixture controls" style={{padding:12,fontSize:12,background:'#f8fafc',overflowWrap:'anywhere'}}><p>KIỂM THỬ CÁCH LY — không hủy đơn, gửi hỗ trợ hay đánh giá thật</p><output data-testid="fixture-requests">{JSON.stringify({counts,lastPayload})}</output><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" onClick={()=>{pending.shift()?.();refresh();}}>Cho phép phản hồi</button><button type="button" onClick={()=>useAuthStore.setState({token:'isolated-other-token',user:{...user,id:999996}})}>Đổi tài khoản</button></div></aside>{view==='track'?<TrackOrderPage/>:<MyOrdersPage/>}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><HelmetProvider><QueryClientProvider client={client}><Fixture/></QueryClientProvider></HelmetProvider></BrowserRouter></StrictMode>);
