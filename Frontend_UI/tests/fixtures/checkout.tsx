// Dev-only fixture. Vite production build has no entry for this file.
// Every Axios request is intercepted; no order, profile or payment is sent to the API.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import { CheckoutForm } from '../../src/components/CheckoutForm';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useCartStore } from '../../src/stores/useCartStore';
import '../../src/index.css';

const memory = new Map<string, string>();
const storage = createJSONStorage(() => ({ getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } }));
useAuthStore.persist.setOptions({ storage });
useCartStore.persist.setOptions({ storage });
const scenario = new URLSearchParams(location.search).get('case') ?? 'cod';
const profile = { id: 999999, fullName: 'Người nhận kiểm thử', phoneNumber: '0900000000', email: 'fixture@example.invalid', role: 'User',
  address1: 'Địa chỉ kiểm thử', address2: '', loyaltyPoints: 100, tier: 'Gold' as const };
useAuthStore.setState(scenario === 'guest' ? { token: null, user: null } : { token: 'isolated-fixture-token', user: profile });
useCartStore.setState({ items: [{ id: 999998, name: 'Sản phẩm kiểm thử tên dài để kiểm tra xuống dòng khi xem trên điện thoại', price: 250000,
  quantity: 1, stockQuantity: 2, origin: 'Dữ liệu kiểm thử', imageUrl: null }] });
let orderCount = 0, linkCount = 0, methodsCount = 0;
let releaseOrder: (() => void) | undefined;
let lastPayload: unknown;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
axiosClient.defaults.adapter = async config => {
  const ok = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
  const fail = (message: string) => { throw { response: { status: 400, data: { detail: message } }, config }; };
  if (config.url === '/api/users/profile') return ok(profile);
  if (config.url === '/api/payments/methods') { methodsCount++; if (scenario === 'methods-error' && methodsCount === 1) return fail('Methods fixture error'); return ok({ mockOnline: scenario !== 'cod-only' }); }
  if (config.url === '/api/promotions/validate') {
    const { code } = JSON.parse(config.data);
    if (code === 'BAD') return fail('Mã khuyến mãi không hợp lệ.');
    return ok({ id: 1, code, isValid: true, minOrderAmount: code === 'MIN' ? 300000 : 0,
      discountType: code === 'FIXED' ? 'FixedAmount' : 'Percentage', discountValue: code === 'FIXED' ? 500000 : 10, maxDiscountAmount: null, message: '' });
  }
  if (config.url === '/api/orders') {
    orderCount++; lastPayload = JSON.parse(config.data); notify();
    await new Promise<void>(resolve => { releaseOrder = resolve; });
    if (scenario === 'error') return fail('Sản phẩm vừa hết hàng. Vui lòng kiểm tra lại giỏ hàng.');
    const payload = JSON.parse(config.data);
    return ok({ id: 999997, userId: profile.id, orderDate: '2026-11-02T08:00:00Z', subTotal: 250000,
      discountAmount: 0, totalAmount: payload.expectedTotalAmount, pointsUsed: payload.usePoints ? 22 : 0,
      paymentMethod: payload.paymentMethod === 1 ? 'COD' : 'Online', status: 'Pending', details: [] });
  }
  if (config.url === '/api/payments/mock-url') { linkCount++; notify(); return fail('Payment fixture error'); }
  return fail('Unexpected fixture request: ' + config.url);
};
export function Fixture() {
  const [, render] = useState(0);
  React.useEffect(() => { const refresh = () => render(n => n + 1); listeners.add(refresh); return () => { listeners.delete(refresh); }; }, []);
  return <><aside style={{ padding: 12, background: '#f8fafc', fontSize: 12, borderBottom: '1px solid #e2e8f0' }} aria-label="Fixture controls">
    <p>KIỂM THỬ CÁCH LY — không tạo đơn thật</p>
    <output data-testid="fixture-requests">Orders: {orderCount}; payment links: {linkCount}</output>
    <button type="button" style={{ padding: '8px 16px', textDecoration: 'underline' }} onClick={() => releaseOrder?.()}>Cho phép phản hồi</button>
    <pre data-testid="fixture-payload" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: '100%' }}>{JSON.stringify(lastPayload)}</pre>
  </aside><CheckoutForm /></>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><Fixture /></QueryClientProvider></BrowserRouter>);
