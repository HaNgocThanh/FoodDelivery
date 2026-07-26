import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldCheck, UserCheck, Leaf, Truck, Sparkles } from 'lucide-react';

export interface AuthApiResponse {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await axiosClient.post<AuthApiResponse, AuthApiResponse>('/api/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      // Lưu Token và User Info vào Zustand Store (được tự động persist vào localStorage)
      loginStore(res.token, {
        id: res.userId,
        fullName: res.fullName,
        email: res.email,
        role: res.role,
      });

      // Điều hướng tùy theo vai trò
      if (res.role?.toLowerCase() === 'admin') {
        navigate('/admin/orders');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsPending(false);
    }
  };

  const fillTestCredentials = (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      setEmail('admin@fooddelivery.com');
      setPassword('Password123!');
    } else {
      setEmail('nguyenvana@gmail.com');
      setPassword('Password123!');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex">
      {/* ================= BRAND PANEL (LEFT, hidden on mobile) ================= */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-emerald-600 flex-col justify-between p-12 text-white"
      >
        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 28px)',
          }}
        />

        {/* Logo + brand */}
        <header className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">FoodMart</span>
        </header>

        {/* Slogan */}
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Thực phẩm tươi sạch mỗi ngày, giao nhanh tận cửa.
          </h1>
          <p className="text-emerald-50/90 text-base leading-relaxed">
            Nền tảng mua sắm thực phẩm trực tuyến với hơn 1.000+ sản phẩm tươi mỗi ngày, giao hàng trong 2 giờ tại nội thành TP.HCM.
          </p>

          {/* Trust badges */}
          <ul className="flex flex-col gap-3 pt-4">
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Miễn phí vận chuyển đơn từ 200K</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Đổi trả miễn phí trong 24 giờ</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Cam kết 100% nguồn gốc rõ ràng</span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <footer className="relative z-10 text-xs text-emerald-50/70">
          © 2026 FoodMart. All rights reserved.
        </footer>
      </aside>

      {/* ================= FORM PANEL (RIGHT) ================= */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <article className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          {/* HEADER */}
          <header className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Đăng nhập tài khoản</h1>
            <p className="text-sm text-slate-500">
              Truy cập hệ thống FoodDelivery để quản lý đơn hàng & mua sắm
            </p>
          </header>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* QUICK TEST CREDENTIALS */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Tải tài khoản mẫu nhanh:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillTestCredentials('admin')}
                className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg transition font-medium text-xs flex items-center justify-center gap-1 text-slate-700"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Admin
              </button>
              <button
                type="button"
                onClick={() => fillTestCredentials('customer')}
                className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg transition font-medium text-xs flex items-center justify-center gap-1 text-slate-700"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Khách hàng
              </button>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email của bạn:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="VD: admin@fooddelivery.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Mật khẩu:</label>
                <Link to="/forgot-password" className="text-xs text-slate-500 font-medium hover:text-emerald-600 transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#047857', color: '#ffffff', borderColor: '#065f46' }}
              className="w-full py-3 px-4 !bg-emerald-700 !text-white !border !border-emerald-800 hover:!bg-emerald-600 active:!bg-emerald-800 hover:shadow-md font-semibold rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-500 uppercase tracking-wider">Hoặc</span>
            </div>
          </div>

          {/* FOOTER LINKS */}
          <footer className="flex justify-between items-center text-sm">
            <Link to="/" className="text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Trang chủ
            </Link>

            <p className="text-slate-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-emerald-600 font-bold hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </footer>
        </article>
      </section>
    </main>
  );
}
