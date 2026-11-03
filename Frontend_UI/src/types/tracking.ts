export type TrackingStatus = 'Pending' | 'Approved' | 'Shipping' | 'Completed' | 'Cancelled';

export interface TrackingItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderTracking {
  id: number;
  orderDate: string;
  status: TrackingStatus;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  customerName: string;
  customerPhoneMasked: string;
  shippingAddressMasked: string;
  items: TrackingItem[];
}
