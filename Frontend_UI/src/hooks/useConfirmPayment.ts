import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useCartStore } from '../stores/useCartStore';
import { isConfirmedPayment, paymentErrorMessage, type ConfirmedPayment } from '../utils/paymentResult';

export function useConfirmPayment(orderId: number, paymentToken: string, userId: number, authToken: string) {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ status: 'loading' | 'success' | 'error'; amount?: number; message?: string }>({ status: 'loading' });
  const request = useRef<{ key: string; promise: Promise<unknown>; cart: ReturnType<typeof useCartStore.getState>['items'] } | null>(null);
  useEffect(() => {
    let active = true;
    setResult({ status: 'loading' });
    // Reattach to the same promise on StrictMode's setup/cleanup/setup cycle.
    const requestKey = JSON.stringify([attempt, orderId, paymentToken, userId, authToken]);
    if (!request.current || request.current.key !== requestKey) request.current = {
      key: requestKey, cart: useCartStore.getState().items,
      promise: axiosClient.post<ConfirmedPayment, ConfirmedPayment>('/api/payments/mock-confirm', { orderId, paymentToken }),
    };
    const current = request.current;
    void current.promise.then(value => {
      const auth = useAuthStore.getState();
      if (!active || auth.user?.id !== userId || auth.token !== authToken) return;
      if (!isConfirmedPayment(value, orderId)) throw new Error('Kết quả xác minh không khớp đơn hàng. Vui lòng kiểm tra đơn hàng của bạn.');
      // Do not erase items the customer changed while verification was pending.
      if (useCartStore.getState().items === current.cart) useCartStore.getState().clearCart();
      void queryClient.invalidateQueries({ queryKey: ['myOrders', userId] });
      setResult({ status: 'success', amount: value.amount });
    }).catch(cause => {
      const auth = useAuthStore.getState();
      if (active && auth.user?.id === userId && auth.token === authToken)
        setResult({ status: 'error', message: paymentErrorMessage(cause) });
    });
    return () => { active = false; };
  }, [attempt, orderId, paymentToken, userId, authToken, queryClient]);
  return { ...result, retry: () => setAttempt(value => value + 1) };
}
