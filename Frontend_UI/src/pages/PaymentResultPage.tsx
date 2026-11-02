import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleHelp, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useConfirmPayment } from '../hooks/useConfirmPayment';
import { parsePaymentReturn } from '../utils/paymentResult';
import { formatCurrency } from '../utils/formatCurrency';
import './PaymentResultPage.css';

function ResultActions({ children }: { children?: React.ReactNode }) {
  return <div className="payment-result-actions">{children}<Link to="/my-orders" data-testid="button-view-order-detail" className={children ? 'payment-result-secondary' : 'payment-result-primary'}>Xem đơn hàng <ArrowRight size={17} /></Link><Link to="/products" data-testid="button-continue-shopping" className="payment-result-shopping">Tiếp tục mua sắm</Link></div>;
}

function ConfirmResult({ orderId, paymentToken, userId, authToken }: { orderId: number; paymentToken: string; userId: number; authToken: string }) {
  const result = useConfirmPayment(orderId, paymentToken, userId, authToken);
  if (result.status === 'loading') return <section data-testid="payment-status-loading" aria-labelledby="payment-result-title"><Loader2 className="payment-result-icon payment-result-spinner" size={40} aria-hidden="true" /><h1 id="payment-result-title">Đang xác minh thanh toán</h1><p role="status">Đang kiểm tra kết quả với hệ thống. Vui lòng chờ.</p><p className="payment-result-order">Đơn hàng #{orderId}</p></section>;
  if (result.status === 'error') return <section data-testid="payment-status-error" aria-labelledby="payment-result-title"><CircleHelp className="payment-result-icon payment-result-uncertain" size={40} aria-hidden="true" /><h1 id="payment-result-title">Chưa xác nhận được thanh toán</h1><p data-testid="payment-error-message" role="alert">{result.message}</p><p className="payment-result-order">Đơn hàng #{orderId}</p><ResultActions><button type="button" className="payment-result-primary" data-testid="button-retry-payment" onClick={result.retry}>Xác minh lại</button></ResultActions></section>;
  return <section data-testid="payment-status-success" aria-labelledby="payment-result-title"><CheckCircle2 className="payment-result-icon" size={40} aria-hidden="true" /><h1 id="payment-result-title">Thanh toán thành công</h1><p role="status">Đã xác nhận trong môi trường thanh toán thử nghiệm.</p><dl data-testid="payment-receipt"><div><dt>Mã đơn hàng</dt><dd>#{orderId}</dd></div><div><dt>Phương thức</dt><dd>Online thử nghiệm</dd></div><div className="payment-result-amount"><dt>Số tiền đã xác nhận</dt><dd>{formatCurrency(result.amount ?? 0)}</dd></div></dl><ResultActions /></section>;
}

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const userId = useAuthStore(state => state.user?.id);
  const token = useAuthStore(state => state.token);
  const { orderId, paymentToken, canConfirm } = parsePaymentReturn(params);
  return <div className="payment-result-page" data-testid="payment-result-page"><div className="payment-result-content">
    {!canConfirm ? <section data-testid="payment-status-unconfirmed" aria-labelledby="payment-result-title"><CircleHelp className="payment-result-icon payment-result-uncertain" size={40} aria-hidden="true" /><h1 id="payment-result-title">Chưa có kết quả thanh toán</h1><p role="status">Liên kết này chưa có kết quả hợp lệ. Kiểm tra đơn hàng trước khi thử thanh toán lại.</p><ResultActions /></section>
      : !token || !userId ? <section data-testid="payment-status-auth" aria-labelledby="payment-result-title"><CircleHelp className="payment-result-icon" size={40} aria-hidden="true" /><h1 id="payment-result-title">Đăng nhập để xác minh</h1><p>Dùng tài khoản đã đặt đơn để xem kết quả thanh toán.</p><div className="payment-result-actions"><Link to="/login" className="payment-result-primary">Đăng nhập <ArrowRight size={17} /></Link><Link to="/my-orders" className="payment-result-shopping">Xem đơn hàng</Link></div></section>
      : <ConfirmResult key={JSON.stringify([orderId, paymentToken, userId, token])} orderId={orderId!} paymentToken={paymentToken!} userId={userId} authToken={token} />}
  </div></div>;
}
