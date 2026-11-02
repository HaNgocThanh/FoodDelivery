// Dev-only, isolated stores and adapter: no real confirmation/order/payment reaches the API.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import PaymentResultPage from '../../src/pages/PaymentResultPage';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useCartStore } from '../../src/stores/useCartStore';
import '../../src/index.css';

const memory = new Map<string, string>();
const storage = createJSONStorage(() => ({ getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } }));
useAuthStore.persist.setOptions({ storage }); useCartStore.persist.setOptions({ storage });
const scenario = new URLSearchParams(location.search).get('case') ?? 'success';
const user = { id: 999999, fullName: 'Người dùng kiểm thử', email: 'fixture@example.invalid', role: 'User' };
useAuthStore.setState(scenario === 'guest' ? { token: null, user: null } : { token: 'isolated-payment-token', user });
const item = { id: 999998, name: 'Món kiểm thử', price: 250000, quantity: 1, stockQuantity: 3 };
useCartStore.setState({ items: [item] });
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
client.setQueryData(['myOrders', 999999], []); client.setQueryData(['myOrders', 999996], []);
let requests = 0;
const pending: Array<() => void> = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
axiosClient.defaults.adapter = async config => {
  if (config.url !== '/api/payments/mock-confirm') throw new Error('Unexpected fixture request');
  const call = ++requests; notify();
  await new Promise<void>(resolve => pending.push(resolve));
  if (scenario === 'error' || scenario === 'expired' || (scenario === 'retry' && call === 1))
    throw { response: { status: 400, data: { detail: scenario === 'expired' ? 'Kết quả thanh toán đã hết hạn hoặc không thuộc tài khoản hiện tại.' : 'Chưa kết nối được hệ thống. Vui lòng thử xác minh lại.' } }, config };
  const payload = JSON.parse(config.data);
  return { status: 200, statusText: 'OK', headers: {}, config,
    data: { orderId: scenario === 'mismatch' ? 123 : payload.orderId, amount: scenario === 'zero' ? 0 : scenario === 'negative' ? -1 : 290000 } };
};
export function Fixture() {
  const navigate = useNavigate();
  const [, update] = useState(0);
  const items = useCartStore(state => state.items);
  const account = useAuthStore(state => state.user?.id);
  useEffect(() => {
    const render = () => update(value => value + 1); listeners.add(render);
    const unsub = client.getQueryCache().subscribe(render);
    return () => { listeners.delete(render); unsub(); };
  }, []);
  return <><aside aria-label="Fixture controls" style={{ padding: 12, background: '#f8fafc', fontSize: 12, overflowWrap: 'anywhere' }}>
    <p>KIỂM THỬ CÁCH LY — không xác nhận thanh toán thật</p>
    <output data-testid="fixture-state">{JSON.stringify({ requests, cartCount: items.reduce((n, x) => n + x.quantity, 0), account,
      ownerInvalidated: client.getQueryState(['myOrders',999999])?.isInvalidated, otherInvalidated: client.getQueryState(['myOrders',999996])?.isInvalidated })}</output>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => pending.shift()?.()}>Cho phép phản hồi</button>
      <button type="button" onClick={() => useCartStore.setState({ items: [{ ...item, quantity: 2 }] })}>Sửa giỏ trong lúc chờ</button>
      <button type="button" onClick={() => navigate('?case=success&orderId=888888&paymentToken=fixture-new&vnp_ResponseCode=00')}>Đổi liên kết</button>
      <button type="button" onClick={() => navigate('?case=missing')}>Liên kết thiếu kết quả</button>
      <button type="button" onClick={() => useAuthStore.setState({ token: 'isolated-other-token', user: { ...user, id: 999996 } })}>Đổi tài khoản</button>
    </div>
  </aside><PaymentResultPage /></>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><QueryClientProvider client={client}><Fixture /></QueryClientProvider></BrowserRouter></StrictMode>);
