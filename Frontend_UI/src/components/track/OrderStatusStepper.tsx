import { Check } from 'lucide-react';
import { normalizeOrderStatus, ORDER_LABELS } from '../../utils/customerOrders';
import '../../styles/orders.css';
const STEPS = ['Pending','Approved','Shipping','Completed'] as const;
export function OrderStatusStepper({ currentStatus }: { currentStatus: unknown }) {
  const status = normalizeOrderStatus(currentStatus);
  if (status === 'Cancelled' || status === 'Unknown') return <p className="order-progress-note">{status === 'Cancelled' ? 'Đơn hàng đã hủy.' : 'Trạng thái đơn đang được cập nhật.'}</p>;
  const current = STEPS.indexOf(status);
  return <ol className="order-progress" aria-label="Trạng thái đơn hàng">{STEPS.map((step,index) => <li key={step} className={index <= current ? 'is-reached' : ''} aria-current={index === current ? 'step' : undefined}><span aria-hidden="true">{index < current ? <Check size={14}/> : index + 1}</span><div>{ORDER_LABELS[step]}{index === current && <small>Trạng thái hiện tại</small>}</div></li>)}</ol>;
}
