import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

export function Footer() {
  return <footer className="public-footer">
    <div className="public-footer-inner">
      <div><Link to="/" className="public-brand">Food<span>Delivery</span><i aria-hidden="true" /></Link><p>Thực phẩm cho bữa cơm nhà.</p></div>
      <nav aria-label="Liên kết cuối trang"><Link to="/">Mua sắm</Link><Link to="/track-order">Tra cứu đơn</Link><Link to="/register">Đăng ký</Link></nav>
      <div className="public-contact"><a href="tel:19006868"><Phone size={16} />1900 6868</a><a href="mailto:cskh@fooddelivery.vn"><Mail size={16} />cskh@fooddelivery.vn</a></div>
    </div>
    <div className="public-footer-bottom"><span>© 2026 FoodDelivery</span><span>Tân Bình, TP HCM</span></div>
  </footer>;
}
