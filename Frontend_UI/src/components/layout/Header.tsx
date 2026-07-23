import {
  ShoppingBag,
  ShoppingCart,
  Utensils,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  Search,
  LayoutDashboard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Header – Tách từ HomePage.tsx.
 * QUAN TRỌNG: Logic (useCartStore, useAuthStore) được giữ nguyên 100%.
 * Chỉ thay đổi JSX className để theo design system (re-skin).
 *
 * Props: truyền vào các state từ page cha để vẫn điều khiển được ô search
 * (giữ UX search như cũ, không phá vỡ các page chưa search).
 */
export interface HeaderProps {
  // Search state – giữ khả năng điều khiển từ page cha
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export function Header({ searchInput, onSearchInputChange, onSearchSubmit }: HeaderProps) {
  const { getTotalItemsCount } = useCartStore();
  const { user, logout, isAdmin } = useAuthStore();
  const totalCartCount = getTotalItemsCount();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">
              Food<span className="text-emerald-600">Delivery</span>
            </span>
            <span className="block text-[10px] text-slate-500 tracking-wider uppercase font-bold">
              Thực phẩm tươi sạch
            </span>
          </div>
        </Link>

        {/* ADMIN & SEARCH */}
        <nav className="hidden md:flex items-center gap-3 flex-1 justify-end">
          {/* Admin Panel link (chỉ hiển thị cho Admin) */}
          {isAdmin() && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 rounded-lg text-xs font-bold transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          )}

          {/* SEARCH BAR (all users) */}
          <form onSubmit={onSearchSubmit} className="relative hidden lg:flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Tìm sản phẩm…"
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 w-56 transition-all"
            />
          </form>

          {/* USER AREA */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Link
                to="/my-orders"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-700 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                Đơn hàng
              </Link>

              <Link
                to="/account/profile"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs transition-colors group"
              >
                {isAdmin() ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                )}
                <span className="font-bold text-slate-900 max-w-[100px] truncate group-hover:text-emerald-700">
                  {user.fullName}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                    isAdmin()
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {user.role}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
              >
                <LogIn className="w-4 h-4 text-emerald-600" />
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>

        {/* CART LINK → /cart (dùng React Router để navigate đúng route) */}
        <Link
          to="/cart"
          aria-label={`Giỏ hàng (${totalCartCount} sản phẩm)`}
          className="flex items-center gap-3 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-md shadow-amber-500/30 transition-colors font-semibold text-sm group"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {totalCartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-amber-600 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {totalCartCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline">
            Giỏ hàng ({totalCartCount})
          </span>
        </Link>
      </div>
    </header>
  );
}
