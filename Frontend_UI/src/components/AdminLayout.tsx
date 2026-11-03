import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Boxes, Ticket, Users, ArrowLeft, MessageCircle, Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import '../styles/admin-shell.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Đơn hàng' },
  { to: '/admin/products', icon: Boxes, label: 'Sản phẩm' },
  { to: '/admin/promotions', icon: Ticket, label: 'Khuyến mãi' },
  { to: '/admin/users', icon: Users, label: 'Khách hàng' },
  { to: '/admin/support', icon: MessageCircle, label: 'Hỗ trợ' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const userName = useAuthStore(state => state.user?.fullName);
  const logout = useAuthStore(state => state.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const closeMenu = () => { setMenuOpen(false); menuButton.current?.focus(); };
  const followLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    setMenuOpen(false);
    content.current?.focus({ preventScroll: true });
  };
  const signOut = () => { logout(); navigate('/login', { replace: true }); };

  return <div className="admin-shell">
    <a className="admin-skip" href="#admin-content">Đến nội dung</a>
    <aside className="admin-sidebar" aria-label="Quản trị" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) { event.preventDefault(); closeMenu(); }
    }}>
      <div className="admin-sidebar-header">
        <div className="admin-identity"><Link to="/" className="admin-brand" aria-label="FoodDelivery — Cửa hàng">Food<span>Delivery</span><i aria-hidden="true" /></Link><p>Quản trị</p></div>
        <button ref={menuButton} type="button" className="admin-menu-toggle" aria-label={menuOpen ? 'Đóng điều hướng quản trị' : 'Mở điều hướng quản trị'} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}<span>Menu</span></button>
      </div>
      <div id="admin-navigation" className="admin-navigation" data-open={menuOpen}>
        <nav aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} className="admin-nav-link" onClick={followLink}><Icon size={20} aria-hidden="true" /><span>{label}</span></NavLink>)}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-store-link"><ArrowLeft size={18} aria-hidden="true" />Xem cửa hàng</Link>
          {userName && <p className="admin-user-name">{userName}</p>}
          <button type="button" className="admin-sign-out" onClick={signOut}><LogOut size={18} aria-hidden="true" />Đăng xuất</button>
        </div>
      </div>
    </aside>
    <div className="admin-content" id="admin-content" ref={content} tabIndex={-1}>{children}</div>
  </div>;
}
