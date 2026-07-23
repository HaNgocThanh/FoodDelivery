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
  HelpCircle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    label: 'Dashboard',
    iconColor: 'text-emerald-600',
  },
  {
    to: '/admin/orders',
    icon: <ClipboardList className="w-4 h-4" />,
    label: 'Quản lý Đơn hàng',
    iconColor: 'text-emerald-600',
  },
  {
    to: '/admin/products',
    icon: <Boxes className="w-4 h-4" />,
    label: 'Quản lý Sản phẩm',
    iconColor: 'text-emerald-600',
  },
  {
    to: '/admin/promotions',
    icon: <Ticket className="w-4 h-4" />,
    label: 'Khuyến mãi (Voucher)',
    iconColor: 'text-amber-600',
  },
  {
    to: '/admin/users',
    icon: <Users className="w-4 h-4" />,
    label: 'Khách hàng & Hạng thẻ',
    iconColor: 'text-sky-600',
  },
  {
    to: '/admin/support',
    icon: <HelpCircle className="w-4 h-4" />,
    label: 'Chăm sóc Khách hàng',
    iconColor: 'text-rose-600',
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans flex">

      {/* ──────────────── SIDEBAR ──────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col py-6 px-4 gap-1 sticky top-0 h-screen overflow-y-auto z-30 shadow-sm">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-6 px-2 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 tracking-tight">
              Food<span className="text-emerald-600">Delivery</span>
            </span>
            <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive ? item.iconColor : 'text-slate-400 group-hover:text-emerald-600'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer link */}
        <div className="pt-4 border-t border-slate-200">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-colors"
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
