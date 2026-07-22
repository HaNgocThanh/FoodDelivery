import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">

        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Đăng nhập tài khoản</h1>
          <p className="text-xs text-slate-400">
            Truy cập hệ thống FoodDelivery để quản lý đơn hàng & mua sắm
          </p>
        </div>

        {/* ERROR ALERT */}
        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* QUICK TEST CREDENTIALS */}
        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Tải tài khoản mẫu nhanh:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillTestCredentials('admin')}
              className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-orange-500/20 hover:text-orange-300 border border-slate-700 rounded-lg transition font-medium text-[11px] flex items-center justify-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" /> Admin
            </button>
            <button
              type="button"
              onClick={() => fillTestCredentials('customer')}
              className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 rounded-lg transition font-medium text-[11px] flex items-center justify-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Khách hàng
            </button>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Email của bạn:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="VD: admin@fooddelivery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Mật khẩu:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-orange-400 font-medium hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm mt-2"
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

        {/* FOOTER LINKS */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
          <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Trang chủ
          </Link>

          <p className="text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-orange-400 font-bold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
