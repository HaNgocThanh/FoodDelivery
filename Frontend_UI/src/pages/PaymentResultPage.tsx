import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Receipt, ShoppingBag, RefreshCw, Hash, Banknote, Clock, CreditCard } from 'lucide-react';

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ';
}

function formatPayDate(raw: string | null): string {
  if (!raw || raw.length !== 14) return '—';
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const hh = raw.slice(8, 10);
  const mm = raw.slice(10, 12);
  const ss = raw.slice(12, 14);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

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

  // Đọc thêm tham số VNPay trả về — CHỈ đọc URL param, không gọi API, không setState.
  const vnpAmount = searchParams.get('vnp_Amount');
  const vnpBankCode = searchParams.get('vnp_BankCode');
  const vnpPayDate = searchParams.get('vnp_PayDate');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo');
  const amountVND = vnpAmount ? Number(vnpAmount) / 100 : 0;

  return (
    <main
      data-testid="payment-result-page"
      className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans"
    >
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6 text-center animate-fade-in">

        {status === 'loading' && (
          <div className="space-y-4 py-8" data-testid="payment-status-loading">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Đang xử lý kết quả...</h2>
            <p className="text-slate-500 text-sm">Vui lòng không đóng hoặc tải lại trang này.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6" data-testid="payment-status-success">
            <div className="mx-auto w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Thanh toán thành công!
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Đơn hàng <span className="font-mono font-bold text-emerald-600">#{orderId}</span> đã được thanh toán trực tuyến qua cổng VNPay.
              </p>
            </div>

            {/* Khung biên lai */}
            <div
              data-testid="payment-receipt"
              className="rounded-lg bg-emerald-50 border border-emerald-100 px-5 py-4 text-left space-y-2.5"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Mã đơn hàng
                </span>
                <span className="font-semibold text-slate-900 font-mono">#{orderId ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 inline-flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Số tiền
                </span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {amountVND > 0 ? formatVND(amountVND) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 inline-flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Phương thức
                </span>
                <span className="font-semibold text-slate-900">
                  VNPay{vnpBankCode ? ` · ${vnpBankCode}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Thời gian
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatPayDate(vnpPayDate)}</span>
              </div>
              {vnpTransactionNo && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100">
                  <span className="text-slate-500">Mã giao dịch VNPay</span>
                  <span className="font-mono font-medium text-slate-700">{vnpTransactionNo}</span>
                </div>
              )}
            </div>

            <ul className="text-left text-xs text-slate-500 space-y-1.5 px-1">
              <li>• Hệ thống đã ghi nhận thanh toán trực tuyến thành công.</li>
              <li>• Nhà hàng đang chuẩn bị món ăn cho đơn hàng này.</li>
              <li>• Bạn có thể theo dõi tiến độ giao hàng trong trang Đơn hàng của tôi.</li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/"
                data-testid="button-continue-shopping"
                className="
                  order-2 sm:order-1 flex-1 inline-flex items-center justify-center gap-2
                  rounded-lg bg-white hover:bg-slate-50
                  text-slate-700 font-semibold text-sm
                  px-4 py-3
                  border border-slate-300 hover:border-slate-400
                  transition-colors
                "
              >
                <ShoppingBag className="w-4 h-4" />
                Tiếp tục mua sắm
              </Link>
              <Link
                to="/my-orders"
                data-testid="button-view-order-detail"
                className="
                  order-1 sm:order-2 flex-1 inline-flex items-center justify-center gap-2
                  rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                  text-white font-bold text-sm
                  px-4 py-3
                  shadow-md hover:shadow-lg shadow-emerald-500/30
                  transition-all
                "
              >
                <Receipt className="w-4 h-4" />
                Xem chi tiết đơn hàng
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6" data-testid="payment-status-error">
            <div className="mx-auto w-24 h-24 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-sm">
              <XCircle className="w-14 h-14 text-red-500" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Thanh toán thất bại
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Đã xảy ra sự cố hoặc giao dịch đã bị hủy bỏ. Vui lòng thử lại hoặc chọn phương thức khác.
              </p>
              {responseCode && (
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Mã phản hồi VNPay:{' '}
                  <span className="font-mono font-bold text-red-600">{responseCode}</span>
                </p>
              )}
              {errorMessage && (
                <p
                  data-testid="payment-error-message"
                  className="text-xs text-red-700 font-semibold bg-red-50 px-3 py-2 rounded-lg border border-red-200 mt-3"
                >
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-5 py-4 text-left text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-700 mb-1">Gợi ý:</p>
              <p>• Kiểm tra lại kết nối mạng và thẻ/tài khoản của bạn.</p>
              <p>• Số dư tài khoản phải lớn hơn số tiền cần thanh toán.</p>
              <p>• Nếu cần hỗ trợ, vui lòng liên hệ CSKH qua trang Đơn hàng của tôi.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/"
                data-testid="button-back-home"
                className="
                  order-2 sm:order-1 flex-1 inline-flex items-center justify-center gap-2
                  rounded-lg bg-white hover:bg-slate-50
                  text-slate-700 font-semibold text-sm
                  px-4 py-3
                  border border-slate-300 hover:border-slate-400
                  transition-colors
                "
              >
                <ArrowLeft className="w-4 h-4" />
                Về trang chủ
              </Link>
              <Link
                to="/checkout"
                data-testid="button-retry-payment"
                className="
                  order-1 sm:order-2 flex-1 inline-flex items-center justify-center gap-2
                  rounded-lg bg-red-500 hover:bg-red-600 active:bg-red-700
                  text-white font-bold text-sm
                  px-4 py-3
                  shadow-md hover:shadow-lg shadow-red-500/30
                  transition-all
                "
              >
                <RefreshCw className="w-4 h-4" />
                Thử thanh toán lại
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
