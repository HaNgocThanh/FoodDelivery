import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface ResetPasswordFormInputs {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormInputs>();

  const newPasswordVal = watch('newPassword');

  const onSubmit = async (data: ResetPasswordFormInputs) => {
    setIsPending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await axiosClient.post('/api/auth/reset-password', {
        email,
        otp: data.otp,
        newPassword: data.newPassword,
      });

      setSuccessMsg('Đặt lại mật khẩu thành công! Bạn có thể quay lại trang đăng nhập.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã xác thực không đúng hoặc đã hết hạn.');
    } finally {
      setIsPending(false);
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
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Khôi phục mật khẩu</h1>
          <p className="text-xs text-slate-400">
            Nhập mã OTP vừa gửi tới <span className="text-orange-400 font-bold">{email}</span> để tạo mật khẩu mới
          </p>
        </div>

        {/* SUCCESS STATE */}
        {successMsg ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Thành công!</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{successMsg}</p>
            </div>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {/* ERROR ALERT */}
            {errorMsg && (
              <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* OTP Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Mã xác thực (OTP):</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Nhập mã OTP 6 số"
                  {...register('otp', { 
                    required: 'Vui lòng nhập mã OTP.',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Mã OTP phải bao gồm 6 chữ số.'
                    }
                  })}
                  className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                />
                {errors.otp && (
                  <p className="text-xs font-semibold text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.otp.message}
                  </p>
                )}
              </div>

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Mật khẩu mới:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự..."
                    {...register('newPassword', { 
                      required: 'Vui lòng nhập mật khẩu mới.',
                      minLength: {
                        value: 6,
                        message: 'Mật khẩu mới phải dài tối thiểu 6 ký tự.'
                      }
                    })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-orange-500"
                  />
                </div>
                {errors.newPassword && (
                  <p className="text-xs font-semibold text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Xác nhận mật khẩu mới:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu..."
                    {...register('confirmPassword', { 
                      required: 'Vui lòng xác nhận mật khẩu mới.',
                      validate: (v) => v === newPasswordVal || 'Mật khẩu nhập lại không khớp.'
                    })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-orange-500"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs font-semibold text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm mt-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Đặt lại mật khẩu</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* FOOTER LINKS */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
          <Link to="/login" className="text-slate-400 hover:text-white flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
