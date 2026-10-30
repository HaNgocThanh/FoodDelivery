import type { OrderItem } from '../pages/OrderManagementPage';

const deliverySlots: Record<string, string> = {
  'slot-a': '11:00 – 12:00 ngày đặt hàng',
  'slot-b': '16:30 – 17:30 ngày đặt hàng',
  'slot-c': '07:30 – 08:30 ngày kế tiếp',
};

export function OrderDeliveryDetails({ order }: { order: OrderItem }) {
  if (!order.deliveryAddress) return null;
  return (
    <section aria-label="Thông tin nhận hàng của đơn" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
      <h3 className="font-bold text-slate-900">Thông tin nhận hàng</h3>
      <p>{order.recipientName} · {order.recipientPhone}</p>
      <p className="whitespace-pre-wrap break-words">{order.deliveryAddress}</p>
      {order.deliverySlot && <p>Ca giao: {deliverySlots[order.deliverySlot] ?? order.deliverySlot}</p>}
      {order.deliveryNotes && <p className="whitespace-pre-wrap break-words">Ghi chú: {order.deliveryNotes}</p>}
      {order.leaveAtDoorstep && <p>Khách yêu cầu để hàng trước cửa.</p>}
    </section>
  );
}

export function OrderCharges({ order }: { order: OrderItem }) {
  const rows: [string, number][] = [
    ['Phí giao hàng', order.shippingFee ?? 0],
    ['Cọc khay giữ nhiệt', order.toteDeposit ?? 0],
    ['Tiền tip', order.tipAmount ?? 0],
    ['Giảm bằng điểm thưởng', -(order.pointDiscount ?? 0)],
  ];
  return <>{rows.filter(([, amount]) => amount !== 0).map(([label, amount]) => (
    <div key={label} className="flex justify-between text-xs text-slate-600">
      <span>{label}</span><span className="tabular-nums">{amount.toLocaleString('vi-VN')} đ</span>
    </div>
  ))}</>;
}
