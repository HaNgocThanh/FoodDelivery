import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';
import { UserPlus, Mail, Lock, User, Phone, MapPin, AlertCircle, Loader2, ArrowLeft, Leaf, Heart, ShieldCheck } from 'lucide-react';
import type { AuthApiResponse } from './LoginPage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    address1: '',
    role: 'Customer',
  });

  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }

    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await axiosClient.post<AuthApiResponse, AuthApiResponse>('/api/auth/register', form);

      loginStore(res.token, {
        id: res.userId,
        fullName: res.fullName,
        email: res.email,
        role: res.role,
      });

      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo tài khoản mới. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex">
      {/* ================= BRAND PANEL (RIGHT on register, hidden on mobile) ================= */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-emerald-600 flex-col justify-between p-12 text-white order-2"
      >
        {/* Decorative overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 28px)',
          }}
        />

        {/* Logo */}
        <header className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">FoodMart</span>
        </header>

        {/* Slogan */}
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Tham gia cùng hàng ngàn gia đình Việt.
          </h1>
          <p className="text-emerald-50/90 text-base leading-relaxed">
            Đăng ký tài khoản để nhận ngay voucher 50K cho đơn hàng đầu tiên, tích điểm đổi quà và theo dõi đơn hàng dễ dàng.
          </p>

          {/* Benefits */}
          <ul className="flex flex-col gap-3 pt-4">
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Voucher chào mừng 50K</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Tích điểm 2% mỗi đơn hàng</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Ưu đãi sinh nhật đặc biệt</span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <footer className="relative z-10 text-xs text-emerald-50/70">
          © 2026 FoodMart. All rights reserved.
        </footer>
      </aside>

      {/* ================= FORM PANEL (LEFT) ================= */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 order-1 lg:order-1">
        <article className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          {/* HEADER */}
          <header className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Đăng ký tài khoản</h1>
            <p className="text-sm text-slate-500">Tạo tài khoản mới để trải nghiệm mua thực phẩm tươi nhanh chóng</p>
          </header>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">Họ và tên:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700">Email:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="VD: user@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700">Mật khẩu:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự..."
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Số điện thoại:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="phone"
                    type="text"
                    placeholder="090..."
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-sm font-medium text-slate-700">Địa chỉ giao hàng:</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="address"
                    type="text"
                    placeholder="Quận 1, TP.HCM..."
                    value={form.address1}
                    onChange={(e) => setForm({ ...form, address1: e.target.value })}
                    className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
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
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <span>Tạo tài khoản mới</span>
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
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </footer>
        </article>
      </section>
    </main>
  );
}
