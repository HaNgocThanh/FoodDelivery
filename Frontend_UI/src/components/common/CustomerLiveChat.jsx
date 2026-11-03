import { useEffect, useRef, useState } from 'react';
import { createSupportConnection } from '../../utils/supportConnection';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { CHAT_STATUS, createSendGate, isValidSenderName, receivedMessage } from '../../utils/supportChat';
import '../../styles/support-chat.css';
const NAME_KEY='fooddelivery_chat_sender_name', OPEN_KEY='fooddelivery_chat_open';
const browserStorage={getItem:key=>{try{return localStorage.getItem(key);}catch{return null;}},setItem:(key,value)=>{try{localStorage.setItem(key,value);}catch{/* Memory state still works when storage is unavailable. */}}};
export function SupportChat({hubUrl='http://localhost:5156/supporthub',defaultSenderName='',storage=browserStorage,createConnection=createSupportConnection}){
 const initialName=()=>isValidSenderName(defaultSenderName)?defaultSenderName.trim():storage.getItem(NAME_KEY)||'';
 const[isOpen,setOpen]=useState(()=>storage.getItem(OPEN_KEY)==='1');
 const[enabled,setEnabled]=useState(isOpen),[retry,setRetry]=useState(0),[unread,setUnread]=useState(false);
 const[messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[senderName,setSenderName]=useState(initialName),[nameConfirmed,setNameConfirmed]=useState(()=>isValidSenderName(initialName()));
 const[status,setStatus]=useState('disconnected'),[error,setError]=useState(''),[nameError,setNameError]=useState(''),[sending,setSending]=useState(false),[joining,setJoining]=useState(false);
 const connectionRef=useRef(null),alive=useRef(true),openRef=useRef(isOpen),nameRef=useRef(nameConfirmed?senderName:''),launcher=useRef(null),entry=useRef(null),log=useRef(null),nearEnd=useRef(true),sendGate=useRef(createSendGate()),joinLock=useRef(false);
 openRef.current=isOpen;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false;
  const connection=createConnection(hubUrl);connectionRef.current=connection;
  const active=()=>!cancelled;
  const join=async()=>{if(nameRef.current)await connection.invoke('JoinCustomerGroup',nameRef.current);};
  connection.on('ReceiveMessage',(name,text,id)=>{if(!active())return;setMessages(previous=>[...previous,receivedMessage(name,text,id)]);if(!openRef.current)setUnread(true);});
  connection.onreconnecting(()=>{if(active())setStatus('reconnecting');});
  connection.onreconnected(async()=>{if(!active())return;setStatus('reconnecting');try{await join();if(active()){setStatus('connected');setError('');}}catch{if(active()){setStatus('error');setError('Chưa khôi phục được phiên hỗ trợ. Kết nối lại để tiếp tục.');}}});
  connection.onclose(()=>{if(active())setStatus('disconnected');});
  const start=async()=>{setStatus('connecting');try{await connection.start();if(!active())return;await join();if(active()){setStatus('connected');setError('');}}catch{if(active())setStatus('error');}};
  void start();
  return()=>{cancelled=true;connection.off('ReceiveMessage');void connection.stop().catch(()=>{});if(connectionRef.current===connection)connectionRef.current=null;};
 },[hubUrl,enabled,retry,createConnection]);
 useEffect(()=>{storage.setItem(OPEN_KEY,isOpen?'1':'0');if(isOpen){setUnread(false);entry.current?.focus();}},[isOpen,nameConfirmed,storage]);
 useEffect(()=>{if(isOpen&&nearEnd.current&&log.current)log.current.scrollTop=log.current.scrollHeight;},[messages,isOpen]);
 const close=()=>{setOpen(false);launcher.current?.focus();};
 const saveName=async(event)=>{
  event.preventDefault();if(joinLock.current)return;
  if(!isValidSenderName(senderName)){setNameError('Nhập tên có ít nhất một chữ hoặc số.');entry.current?.focus();return;}
  const connection=connectionRef.current;if(status!=='connected'||!connection)return;
  joinLock.current=true;setJoining(true);setNameError('');const name=senderName.trim();
  try{await connection.invoke('JoinCustomerGroup',name);if(alive.current&&connectionRef.current===connection){nameRef.current=name;setNameConfirmed(true);setSenderName(name);storage.setItem(NAME_KEY,name);setError('');}}catch{if(alive.current)setNameError('Chưa bắt đầu được cuộc trò chuyện. Hãy thử lại.');}finally{joinLock.current=false;if(alive.current)setJoining(false);}
 };
 const send=async(event,failed)=>{
  event?.preventDefault();const text=failed?.text??draft.trim();const connection=connectionRef.current;
  if(!text||!nameConfirmed||status!=='connected'||!connection)return;
  await sendGate.current(async()=>{
   const message=failed??{id:crypto.randomUUID(),sender:'customer',text,ts:Date.now()};
   setSending(true);setError('');nearEnd.current=true;
   setMessages(previous=>failed?previous.map(item=>item.id===message.id?{...item,state:'pending'}:item):[...previous,{...message,state:'pending'}]);
   if(!failed)setDraft('');
   try{await connection.invoke('SendMessageToAdmin',text);if(alive.current&&connectionRef.current===connection)setMessages(previous=>previous.map(item=>item.id===message.id?{...item,state:'sent'}:item));}
   catch{if(alive.current&&connectionRef.current===connection){setMessages(previous=>previous.map(item=>item.id===message.id?{...item,state:'failed'}:item));setError('Tin nhắn chưa được xác nhận. Bạn có thể gửi lại.');}}
   finally{if(alive.current)setSending(false);}
  });
 };
 const waiting=status==='connecting'||status==='reconnecting';
 return <><button ref={launcher} type="button" className="support-launcher" data-testid="customer-chat-toggle" aria-label={isOpen?'Thu gọn chat hỗ trợ':unread?'Mở chat hỗ trợ, có tin mới':'Mở chat hỗ trợ'} aria-expanded={isOpen} aria-controls={isOpen?'customer-support-panel':undefined} onClick={()=>{if(isOpen)close();else{setEnabled(true);setOpen(true);}}}><MessageCircle size={22} aria-hidden="true"/><span className="support-launcher-label">Hỗ trợ</span>{unread&&<span className="support-unread" aria-hidden="true"/>}</button>
 {isOpen&&<section id="customer-support-panel" role="dialog" aria-modal="false" aria-labelledby="customer-support-title" data-testid="customer-chat-panel" className="support-panel" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}}>
  <header className="support-heading"><div><h2 id="customer-support-title">Chat hỗ trợ</h2><p role="status">{waiting&&<Loader2 size={13} className="support-spin" aria-hidden="true"/>}{CHAT_STATUS[status]}</p></div><button type="button" className="support-icon" aria-label="Đóng chat hỗ trợ" onClick={close}><X size={20}/></button></header>
  {(status==='error'||status==='disconnected')&&<div className="support-connection"><p>Chưa kết nối được với hỗ trợ.</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Kết nối lại</button></div>}
  <div className="support-log" ref={log} role="log" aria-label="Tin nhắn hỗ trợ" aria-live="polite" aria-relevant="additions text" tabIndex={0} onScroll={()=>{const element=log.current;nearEnd.current=element.scrollHeight-element.scrollTop-element.clientHeight<64;}}>
   {messages.length===0&&<div className="support-empty"><MessageCircle size={28} aria-hidden="true"/><p>Bạn cần hỗ trợ gì?</p><span>Gửi câu hỏi về sản phẩm hoặc đơn hàng.</span></div>}
   {messages.map(message=>message.sender==='system'?<p className="support-system" key={message.id}>{message.text}</p>:<article key={message.id} className={`support-message${message.sender==='customer'?' support-mine':''}`}><p className="support-author">{message.sender==='customer'?'Bạn':message.senderName||'Hỗ trợ'}</p><p className="support-text">{message.text}</p><footer><time>{new Date(message.ts).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time>{message.sender==='customer'&&<span>{message.state==='pending'?'Đang gửi…':message.state==='failed'?'Chưa xác nhận':'Đã gửi'}</span>}</footer>{message.state==='failed'&&<button type="button" className="support-resend" disabled={sending||status!=='connected'} onClick={event=>void send(event,message)}>Gửi lại</button>}</article>)}
  </div>
  {error&&<p className="support-error" role="alert">{error}</p>}
  <p className="support-note">Tin nhắn không được lưu sau khi tải lại trang.</p>
  {!nameConfirmed?<form onSubmit={saveName} className="support-form"><label htmlFor="customer-name-input">Tên hiển thị</label><div className="support-compose"><input ref={entry} id="customer-name-input" value={senderName} onChange={event=>setSenderName(event.target.value)} autoComplete="name" aria-invalid={!!nameError} aria-describedby={nameError?'support-name-error':undefined} disabled={joining}/><button type="submit" disabled={status!=='connected'||joining}>{joining?'Đang mở…':'Bắt đầu'}</button></div>{nameError&&<p className="support-error" id="support-name-error" role="alert">{nameError}</p>}</form>:<form onSubmit={send} className="support-form"><label htmlFor="customer-chat-input">Tin nhắn</label><div className="support-compose"><input ref={entry} id="customer-chat-input" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Nhập tin nhắn…" autoComplete="off"/><button type="submit" className="support-send" disabled={!draft.trim()||status!=='connected'||sending} aria-label="Gửi tin nhắn">{sending?<Loader2 size={19} className="support-spin"/>:<Send size={19}/>}</button></div></form>}
 </section>}</>;
}
export default function CustomerLiveChat(props){
 const userId=useAuthStore(state=>state.user?.id),token=useAuthStore(state=>state.token),name=useAuthStore(state=>state.user?.fullName);
 return <SupportChat key={JSON.stringify([userId,token])} {...props} defaultSenderName={name||props.defaultSenderName||''}/>;
}
