import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { CartAddons } from '../components/CartAddons';
import { ProductPhoto } from '../components/catalog/ProductCard';
import { formatCurrency } from '../utils/formatCurrency';
import './CartPage.css';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalOriginalPrice } = useCartStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const subtotal = getTotalOriginalPrice();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const deposit = items.length ? 15000 : 0;
  const shipping = items.length && subtotal < 300000 ? 25000 : 0;
  const total = Math.max(0, subtotal + deposit + shipping);

  return <div className="cart-page">
    <Link to="/products" className="cart-back"><ArrowLeft size={17} /> Tiếp tục mua sắm</Link>
    <div className="cart-heading"><h1>Giỏ hàng</h1>{items.length > 0 && <span>{count} sản phẩm</span>}</div>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {!items.length ? <section className="cart-empty">
      <ShoppingBag size={36} aria-hidden="true" /><h2>Giỏ hàng đang trống</h2>
      <p>Chọn vài món cho bữa ăn của bạn.</p><Link className="cart-primary" to="/products">Chọn sản phẩm <ArrowRight size={18} /></Link>
    </section> : <div className="cart-layout">
      <div className="cart-content">
        <div className="cart-list-heading"><h2>Sản phẩm đã chọn</h2><button type="button" aria-label="Xóa sạch giỏ hàng" onClick={() => setConfirmClear(true)}>Xóa tất cả</button></div>
        {confirmClear && <div className="cart-clear" role="group" aria-label="Xác nhận xóa giỏ hàng"><span>Xóa tất cả sản phẩm?</span><button type="button" onClick={() => setConfirmClear(false)}>Giữ lại</button><button type="button" onClick={() => { clearCart(); setConfirmClear(false); setAnnouncement('Đã xóa tất cả sản phẩm.'); }}>Xác nhận xóa</button></div>}
        <div className="cart-items">{items.map(item => <article className="cart-item" key={item.id} aria-label={item.name}>
          <Link to={`/products/${item.id}`} className="cart-photo" tabIndex={-1} aria-hidden="true"><ProductPhoto product={item} priority /></Link>
          <div className="cart-item-info"><h3><Link to={`/products/${item.id}`}>{item.name}</Link></h3>{item.origin && <p>{item.origin}</p>}<span>{formatCurrency(item.price)} / sản phẩm</span></div>
          <div className="cart-item-purchase"><div className="shop-quantity" aria-label={`Số lượng ${item.name}`}>
            <button type="button" aria-label="Giảm số lượng" onClick={() => { updateQuantity(item.id, item.quantity - 1); setAnnouncement(item.quantity === 1 ? `Đã xóa ${item.name}.` : `${item.name}: ${item.quantity - 1} sản phẩm.`); }}><Minus size={16} /></button><span>{item.quantity}</span>
            <button type="button" aria-label="Tăng số lượng" disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity} onClick={() => { updateQuantity(item.id, item.quantity + 1); setAnnouncement(`${item.name}: ${item.quantity + 1} sản phẩm.`); }}><Plus size={16} /></button>
          </div><strong className="cart-line-total">{formatCurrency(item.price * item.quantity)}</strong></div>
          <button type="button" className="cart-remove" aria-label={`Xoá ${item.name}`} title="Xoá món này" onClick={() => { removeFromCart(item.id); setAnnouncement(`Đã xóa ${item.name}.`); }}><Trash2 size={18} /></button>
        </article>)}</div>
        <CartAddons />
      </div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title"><h2 id="cart-summary-title">Tóm tắt giỏ hàng</h2>
        <dl><div><dt>Tạm tính</dt><dd>{formatCurrency(subtotal)}</dd></div><div><dt>Phí giao hàng</dt><dd>{shipping ? formatCurrency(shipping) : 'Miễn phí'}</dd></div><div><dt>Cọc khay giữ nhiệt</dt><dd>{formatCurrency(deposit)}</dd></div><div className="cart-total"><dt>Tổng ước tính</dt><dd>{formatCurrency(total)}</dd></div></dl>
        <Link to="/checkout" className="cart-primary">Thanh toán <ArrowRight size={18} /></Link>
        <p>Mã giảm giá và điểm được áp dụng ở bước thanh toán.</p>
        <details><summary>Cách tính phí</summary><p>Giao hàng 25.000 ₫; miễn phí từ 300.000 ₫ tiền sản phẩm. Cọc khay 15.000 ₫ mỗi đơn.</p></details>
        <p className="cart-estimate-note">Giá và tồn kho được xác nhận khi đặt hàng.</p>
      </aside>
    </div>}
  </div>;
}
