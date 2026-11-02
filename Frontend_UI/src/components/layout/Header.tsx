import { LayoutDashboard, LogOut, PackageSearch, Search, ShoppingBag, ShoppingCart, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { useAuthStore } from '../../stores/useAuthStore';
import CustomerLiveChat from '@/components/common/CustomerLiveChat.jsx';
import './PublicShell.css';

export interface HeaderProps { searchInput: string; onSearchInputChange: (value: string) => void; onSearchSubmit: (e: React.FormEvent) => void; }

export function Header({ searchInput, onSearchInputChange, onSearchSubmit }: HeaderProps) {
  const totalCartCount = useCartStore((state) => state.getTotalItemsCount());
  const { user, logout, isAdmin } = useAuthStore();
  return <header className="public-header"><div className="public-header-inner">
    <Link to="/" className="public-brand" aria-label="FoodDelivery — Trang chủ">Food<span>Delivery</span><i aria-hidden="true" /></Link>
    <form className="public-search" role="search" onSubmit={onSearchSubmit}>
      <input aria-label="Tìm sản phẩm" value={searchInput} onChange={(e) => onSearchInputChange(e.target.value)} placeholder="Tìm sản phẩm…" type="search" />
      <button type="submit" aria-label="Tìm kiếm"><Search size={20} /></button>
    </form>
    <nav className="public-nav" aria-label="Điều hướng chính">
      <Link to="/track-order" className="public-nav-link" title="Tra cứu đơn hàng"><PackageSearch size={20} /><span>Tra cứu đơn</span></Link>
      {isAdmin() && <Link to="/admin/dashboard" className="public-nav-link" title="Quản trị"><LayoutDashboard size={20} /><span>Quản trị</span></Link>}
      {user ? <>
        <Link to="/my-orders" className="public-nav-link" title="Đơn hàng"><ShoppingBag size={20} /><span>Đơn hàng</span></Link>
        <Link to="/account/profile" className="public-nav-link public-account" title={user.fullName}><UserRound size={20} /><span>{user.fullName}</span></Link>
        <button onClick={logout} title="Đăng xuất" aria-label="Đăng xuất" className="public-icon-button"><LogOut size={20} /></button>
      </> : <Link to="/login" className="public-nav-link" title="Đăng nhập"><UserRound size={20} /><span>Đăng nhập</span></Link>}
    </nav>
    <Link to="/cart" aria-label={`Giỏ hàng (${totalCartCount} sản phẩm)`} className="public-cart"><ShoppingCart size={21} /><span className="public-cart-label">Giỏ hàng</span><span className="public-cart-count">{totalCartCount}</span></Link>
    <div className="public-support"><CustomerLiveChat hubUrl={import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5156/supporthub'} /></div>
  </div></header>;
}
