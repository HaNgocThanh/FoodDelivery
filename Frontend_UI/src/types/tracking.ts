// =============================================
// Order Tracking (Public) — Tra cứu đơn hàng không cần đăng nhập
// =============================================
// STATUS mapping (Từ backend enum → UI display):
//   Backend enum: 'Pending' | 'Approved' | 'Shipping' | 'Completed'
//   UI hiển thị tương ứng: Pending→Processing / Shipping→Shipped / Completed→Delivered
//   (Mapping thông qua `displayStatus` ở component stepper.)

export type TrackingStatus = 'Pending' | 'Approved' | 'Shipping' | 'Completed';

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
