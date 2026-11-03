import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import axiosClient from '../../api/axiosClient';
import { ProductPhoto } from '../catalog/ProductCard';
import type { OrderLine, CustomerOrder } from '../../types/customerOrders';
import { normalizeOrderStatus, ORDER_LABELS } from '../../utils/customerOrders';
import { formatCurrency } from '../../utils/formatCurrency';
import '../../styles/orders.css';
export function OrderBadge({ status }: { status: unknown }) {
  const normalized = normalizeOrderStatus(status);
  return <span className={`order-badge order-status-${normalized.toLowerCase()}`}>{ORDER_LABELS[normalized]}</span>;
}
function OrderPhoto({ line }: { line: OrderLine }) {
  const { data } = useQuery({queryKey:['product-image',line.productId],queryFn:({signal})=>axiosClient.get<{imageUrl?:string|null},{imageUrl?:string|null}>(`/api/products/${line.productId}`,{signal}),staleTime:300000,retry:1});
  return <div className="order-line-photo" aria-hidden="true"><ProductPhoto product={{name:line.productName,imageUrl:data?.imageUrl}}/></div>;
}
export function OrderLines({ lines, photos=false, renderAction }: { lines: OrderLine[]; photos?: boolean; renderAction?: (line: OrderLine)=>ReactNode }) {
  if (!lines.length) return <p className="orders-muted">Chưa có chi tiết sản phẩm.</p>;
  return <ul className={`order-lines${photos?' has-photos':''}`}>{lines.map(line=><li key={line.productId}>{photos&&<OrderPhoto line={line}/>}<div className="order-line-name"><Link to={`/products/${line.productId}`}>{line.productName}</Link><p>{line.quantity} × {formatCurrency(line.unitPrice)}</p></div><strong>{formatCurrency(line.subtotal)}</strong>{renderAction&&<div className="order-line-action">{renderAction(line)}</div>}</li>)}</ul>;
}
const slots: Record<string,string>={'slot-a':'11:00 – 12:00 ngày đặt hàng','slot-b':'16:30 – 17:30 ngày đặt hàng','slot-c':'07:30 – 08:30 ngày kế tiếp'};
export function CustomerDelivery({ order }: { order: CustomerOrder }) {
  if (!order.deliveryAddress) return null;
  return <section className="order-section" aria-label="Thông tin nhận hàng"><h3>Thông tin nhận hàng</h3><p>{order.recipientName} {order.recipientPhone&&`· ${order.recipientPhone}`}</p><p>{order.deliveryAddress}</p>{order.deliverySlot&&<p>Giờ giao: {slots[order.deliverySlot]??order.deliverySlot}</p>}{order.deliveryNotes&&<p>Ghi chú: {order.deliveryNotes}</p>}{order.leaveAtDoorstep&&<p>Để hàng trước cửa theo yêu cầu.</p>}</section>;
}
export function CustomerTotals({ order }: { order: CustomerOrder }) {
  const discount=Math.min(order.discountAmount??0,order.subTotal??Infinity);
  const rows: [string,number][]=[];
  if(order.subTotal!==undefined)rows.push(['Tạm tính',order.subTotal]);
  if(order.shippingFee!==undefined)rows.push(['Phí giao hàng',order.shippingFee]);
  if(order.toteDeposit)rows.push(['Cọc khay giữ nhiệt',order.toteDeposit]);
  if(order.tipAmount)rows.push(['Tip giao hàng',order.tipAmount]);
  if(discount>0)rows.push([`Mã giảm giá${order.appliedCouponCode?` (${order.appliedCouponCode})`:''}`,-discount]);
  if(order.pointDiscount)rows.push(['Giảm bằng điểm',-order.pointDiscount]);
  return <dl className="order-totals">{rows.map(([label,amount])=><div key={label}><dt>{label}</dt><dd>{formatCurrency(amount)}</dd></div>)}<div className="order-total"><dt>Tổng đơn</dt><dd>{formatCurrency(order.totalAmount)}</dd></div></dl>;
}
