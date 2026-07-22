import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Receipt } from 'lucide-react';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCartStore();

  const orderId = searchParams.get('orderId');
  const responseCode = searchParams.get('vnp_ResponseCode');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Dùng ref để đảm bảo chỉ gọi API xác nhận 1 lần duy nhất trong StrictMode
  const hasCalledAPI = useRef(false);

  useEffect(() => {
    if (!orderId || responseCode !== '00') {
      setStatus('error');
      setErrorMessage('Giao dịch thanh toán không thành công hoặc bị hủy bỏ.');
      return;
    }

    if (hasCalledAPI.current) return;
    hasCalledAPI.current = true;

    const confirmPayment = async () => {
      try {
        // Gọi API cập nhật trạng thái đơn hàng thành đã thanh toán (Approved)
        await axiosClient.put(`/api/orders/${orderId}/pay-success`);
        
        // Xóa dọn sạch giỏ hàng ở Client
        clearCart();
        
        setStatus('success');
      } catch (err: any) {
        console.error("Lỗi xác nhận thanh toán:", err);
        setStatus('error');
        setErrorMessage(err.message || 'Lỗi hệ thống khi cập nhật trạng thái thanh toán.');
      }
    };

    confirmPayment();
  }, [orderId, responseCode, clearCart]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fade-in">
        
        {status === 'loading' && (
          <div className="space-y-4 py-8">
            <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Đang xử lý kết quả...</h2>
            <p className="text-slate-400 text-sm">Vui lòng không đóng hoặc tải lại trang này</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Thanh toán thành công!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Đơn hàng <span className="font-mono font-bold text-orange-400">#{orderId}</span> đã được thanh toán trực tuyến qua cổng giả lập.
              </p>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-left text-xs text-slate-400 space-y-1.5 font-medium">
              <p>• Hệ thống đã ghi nhận thanh toán trực tuyến thành công.</p>
              <p>• Nhà hàng đang chuẩn bị món ăn cho đơn hàng này.</p>
              <p>• Bạn có thể theo dõi tiến độ giao hàng trong trang Đơn hàng của tôi.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/"
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Về Trang chủ
              </Link>
              <Link
                to="/my-orders"
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-orange-500/20"
              >
                <Receipt className="w-4 h-4" />
                Đơn hàng của tôi
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Thanh toán thất bại!</h2>
              <p className="text-slate-400 text-sm">
                Đã xảy ra sự cố trong quá trình giao dịch hoặc thanh toán trực tuyến đã bị hủy bỏ.
              </p>
              {errorMessage && (
                <p className="text-xs text-red-400 font-semibold bg-red-950/40 p-2 rounded-lg border border-red-900/30 mt-2">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/"
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Về Trang chủ
              </Link>
              <Link
                to="/my-orders"
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-orange-500/20"
              >
                <Receipt className="w-4 h-4" />
                Lịch sử đơn
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
