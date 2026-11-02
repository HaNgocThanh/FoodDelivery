export interface PaymentReturn {
  orderId: number | null;
  paymentToken: string | null;
  canConfirm: boolean;
}

export function parsePaymentReturn(params: URLSearchParams): PaymentReturn {
  const rawId = params.get('orderId');
  const id = rawId && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : NaN;
  const orderId = Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
  const paymentToken = params.get('paymentToken');
  return { orderId, paymentToken,
    canConfirm: orderId !== null && !!paymentToken?.trim() && params.get('vnp_ResponseCode') === '00' };
}

export interface ConfirmedPayment { orderId: number; amount: number; }
export function isConfirmedPayment(value: unknown, orderId: number): value is ConfirmedPayment {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ConfirmedPayment>;
  return result.orderId === orderId && typeof result.amount === 'number' && Number.isFinite(result.amount) && result.amount >= 0;
}

export function paymentErrorMessage(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  return !message || /localhost|back-end|server api|network|timeout/i.test(message)
    ? 'Chưa kết nối được hệ thống. Vui lòng thử xác minh lại.' : message;
}
