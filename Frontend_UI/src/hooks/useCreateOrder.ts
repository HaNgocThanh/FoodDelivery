import { useMutation, useQueryClient, type QueryClient, type UseMutationOptions } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { checkoutAttempt } from '../utils/checkoutAttempt';
import { useAuthStore } from '../stores/useAuthStore';

export interface OrderItemPayload {
  productId: number;
  quantity: number;
}

export interface OrderRequestPayload {
  userId: number;
  paymentMethod: number; // 1 = COD, 2 = Online
  couponCode?: string | null;
  usePoints?: boolean;
  userPointsAvailable?: number;
  items: OrderItemPayload[];
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliverySlot: string;
  deliveryNotes: string;
  leaveAtDoorstep: boolean;
  tipAmount: number;
  expectedTotalAmount: number;
}

export interface OrderDetailResponse {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  userId: number;
  orderDate: string;
  subTotal: number;
  discountAmount: number;
  appliedCouponCode?: string | null;
  pointsUsed?: number | null;
  pointDiscount?: number | null;
  totalAmount: number;
  paymentMethod: string;
  status: string | number;
  onlinePaymentConfirmedAt?: string | null;
  paymentExpiresAt?: string | null;
  shipperId?: number | null;
  details: OrderDetailResponse[];
}

/**
 * Custom Hook đặt hàng sử dụng useMutation từ @tanstack/react-query
 */
export function createOrderMutationOptions(queryClient: QueryClient): UseMutationOptions<OrderResponse, Error, OrderRequestPayload> {
  return {
    onSuccess: async (_, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['myOrders', payload.userId] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile', payload.userId] }),
      ]);
    },
    mutationFn: async (payload: OrderRequestPayload) => {
      const auth = useAuthStore.getState();
      const attempt = await checkoutAttempt(payload);
      const current = useAuthStore.getState();
      if (auth.token !== current.token || auth.user?.id !== current.user?.id ||
          (current.user && current.user.id !== payload.userId)) {
        throw new Error('Phiên làm việc đã thay đổi. Vui lòng mở lại trang thanh toán.');
      }
      const response = await axiosClient.post<OrderResponse, OrderResponse>('/api/orders', payload, {
        headers: { 'Idempotency-Key': attempt.key },
      });
      attempt.rememberOrder(response.id);
      return response;
    },
  };
}

export function useCreateOrder() {
  return useMutation(createOrderMutationOptions(useQueryClient()));
}
