export type OrderStatus = 'Pending' | 'Approved' | 'Shipping' | 'Completed' | 'Cancelled' | 'Unknown';
const STATUSES = ['Pending', 'Approved', 'Shipping', 'Completed', 'Cancelled'] as const;
export function normalizeOrderStatus(value: unknown): OrderStatus {
  if (typeof value === 'number' && Number.isInteger(value)) return STATUSES[value - 1] ?? 'Unknown';
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^[1-5]$/.test(text)) return STATUSES[Number(text) - 1];
    return STATUSES.find(status => status.toLowerCase() === text.toLowerCase()) ?? 'Unknown';
  }
  return 'Unknown';
}
export const ORDER_LABELS: Record<OrderStatus, string> = {
  Pending: 'Chờ xử lý', Approved: 'Đã xác nhận', Shipping: 'Đang giao', Completed: 'Hoàn tất', Cancelled: 'Đã hủy', Unknown: 'Đang cập nhật',
};
export function paymentLabel(value: unknown): string {
  return value === 1 || value === '1' || value === 'COD' ? 'Thanh toán khi nhận hàng' : value === 2 || value === '2' || value === 'Online' ? 'Thanh toán online' : 'Chưa có thông tin';
}
export function orderDateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có ngày đặt' : date.toLocaleString('vi-VN', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' });
}
export function validateTracking(orderId: string, phone: string) {
  const number = /^[1-9]\d*$/.test(orderId.trim()) ? Number(orderId.trim()) : NaN;
  const errors: { orderId?: string; phone?: string } = {};
  if (!Number.isSafeInteger(number) || number > 2147483647) errors.orderId = 'Nhập mã đơn là số nguyên lớn hơn 0.';
  if (!/^\+?[0-9][0-9 .()-]{6,19}$/.test(phone.trim())) errors.phone = 'Nhập số điện thoại đã dùng khi đặt hàng.';
  return { errors, orderId: number, phone: phone.trim() };
}
export function orderError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  return !message || /localhost|back-end|server api|network|timeout/i.test(message) ? 'Không kết nối được hệ thống. Vui lòng thử lại.' : message;
}
export function canCancelOrder(status: unknown) { return normalizeOrderStatus(status) === 'Pending'; }
export function canSupportOrder(status: unknown) { return ['Completed','Cancelled'].includes(normalizeOrderStatus(status)); }
export function canReviewOrder(status: unknown, reviewed?: boolean) { return normalizeOrderStatus(status) === 'Completed' && !reviewed; }
