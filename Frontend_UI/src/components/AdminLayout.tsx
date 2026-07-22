import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  Ticket,
  Users,
  ArrowLeft,
  ChevronRight,
  Utensils,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    label: 'Dashboard',
    iconColor: 'text-orange-500',
  },
  {
    to: '/admin/orders',
    icon: <ClipboardList className="w-4 h-4" />,
    label: 'Quản lý Đơn hàng',
    iconColor: 'text-orange-400',
  },
  {
    to: '/admin/products',
    icon: <Boxes className="w-4 h-4" />,
    label: 'Quản lý Sản phẩm',
    iconColor: 'text-emerald-400',
  },
  {
    to: '/admin/promotions',
    icon: <Ticket className="w-4 h-4" />,
    label: 'Khuyến mãi (Voucher)',
    iconColor: 'text-amber-400',
  },
  {
    to: '/admin/users',
    icon: <Users className="w-4 h-4" />,
    label: 'Khách hàng & Hạng thẻ',
    iconColor: 'text-indigo-400',
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">

      {/* ──────────────── SIDEBAR ──────────────── */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 sticky top-0 h-screen overflow-y-auto z-30">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-6 px-2 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition">
            <Utensils className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold text-white tracking-tight">
              Food<span className="text-orange-500">Delivery</span>
            </span>
            <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-wider">
              Admin Panel
            </span>
          </div>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive ? item.iconColor : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer link */}
        <div className="pt-4 border-t border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về Trang chủ
          </Link>
        </div>
      </aside>

      {/* ──────────────── PAGE CONTENT ──────────────── */}
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
