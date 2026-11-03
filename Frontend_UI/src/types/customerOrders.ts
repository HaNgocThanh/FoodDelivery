export interface OrderLine {
  productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number; isReviewed?: boolean;
}
export interface CustomerOrder {
  id: number; userId: number; orderDate: string; status: number | string; paymentMethod: number | string;
  subTotal?: number; discountAmount?: number; appliedCouponCode?: string | null; totalAmount: number;
  recipientName?: string | null; recipientPhone?: string | null; deliveryAddress?: string | null;
  deliverySlot?: string | null; deliveryNotes?: string | null; leaveAtDoorstep?: boolean;
  shippingFee?: number; toteDeposit?: number; tipAmount?: number; pointDiscount?: number | null;
  details: OrderLine[];
}
