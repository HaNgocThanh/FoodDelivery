import { useMutation } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';

export interface OrderItemPayload {
  productId: number;
  quantity: number;
}

export interface OrderRequestPayload {
  userId: number;
  paymentMethod: number; // 1 = COD, 2 = Online
  promotionId?: number | null;
  items: OrderItemPayload[];
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
  totalAmount: number;
  paymentMethod: string;
  status: string;
  promotionId?: number | null;
  shipperId?: number | null;
  details: OrderDetailResponse[];
}

/**
 * Custom Hook đặt hàng sử dụng useMutation từ @tanstack/react-query
 */
export function useCreateOrder() {
  return useMutation<OrderResponse, Error, OrderRequestPayload>({
    mutationFn: async (payload: OrderRequestPayload) => {
      const response = await axiosClient.post<OrderResponse, OrderResponse>('/api/orders', payload);
      return response;
    },
  });
}
