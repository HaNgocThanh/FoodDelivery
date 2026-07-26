import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Mail, ArrowLeft, Loader2, AlertCircle, KeyRound, Leaf, ShieldCheck, Mail as MailIcon } from 'lucide-react';

interface ForgotPasswordFormInputs {
  email: string;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormInputs>();

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    setIsPending(true);
    setErrorMsg(null);

    try {
      await axiosClient.post('/api/auth/forgot-password', {
        email: data.email,
      });

      // Gửi thành công -> Điều hướng sang ResetPasswordPage và truyền Email qua URL query
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gửi yêu cầu thất bại. Vui lòng kiểm tra lại email.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex">
      {/* ================= BRAND PANEL (LEFT, hidden on mobile) ================= */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-emerald-600 flex-col justify-between p-12 text-white"
      >
        {/* Decorative overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(60deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 32px)',
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
            Khôi phục tài khoản chỉ trong 30 giây.
          </h1>
          <p className="text-emerald-50/90 text-base leading-relaxed">
            Chúng tôi sẽ gửi mã xác thực OTP đến email của bạn. Vui lòng kiểm tra cả hộp thư spam nếu không thấy trong vài phút.
          </p>

          <ul className="flex flex-col gap-3 pt-4">
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <MailIcon className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Gửi mã OTP qua email</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-medium">Bảo mật với mã xác thực 6 số</span>
            </li>
          </ul>
        </div>

        <footer className="relative z-10 text-xs text-emerald-50/70">
          © 2026 FoodMart. All rights reserved.
        </footer>
      </aside>

      {/* ================= FORM PANEL (RIGHT) ================= */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <article className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          {/* HEADER */}
          <header className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100">
              <KeyRound className="w-9 h-9 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quên mật khẩu?</h1>
              <p className="text-sm text-slate-500">
                Nhập email của bạn để nhận mã xác thực OTP khôi phục tài khoản
              </p>
            </div>
          </header>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fp-email" className="block text-sm font-medium text-slate-700">Email đã đăng ký:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="fp-email"
                  type="email"
                  placeholder="VD: nguyenvana@gmail.com"
                  {...register('email', {
                    required: 'Vui lòng cung cấp Email.',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email không đúng định dạng.'
                    }
                  })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.email.message}
                </p>
              )}
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
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Gửi mã OTP</span>
              )}
            </button>
          </form>

          {/* FOOTER LINKS */}
          <footer className="pt-4 border-t border-slate-200 flex justify-center items-center text-sm">
            <Link
              to="/login"
              className="text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Quay lại đăng nhập
            </Link>
          </footer>
        </article>
      </section>
    </main>
  );
}
