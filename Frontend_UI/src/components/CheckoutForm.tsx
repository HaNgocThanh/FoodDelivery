import { useState, type FormEvent } from 'react';
import { useCreateOrder, type OrderItemPayload } from '../hooks/useCreateOrder';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import {
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Check,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  LogIn,
  Wallet,
  Beef,
  ArrowRight,
  Receipt,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ValidateResponse {
  id: number;
  code: string;
  discountPercentage: number;
  isValid: boolean;
  message: string;
}

export const CheckoutForm: React.FC = () => {
  const [userId] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<number>(1);

  // Đọc giỏ hàng thực tế từ Zustand Store
  const { items: cartItems, updateQuantity, removeFromCart, clearCart, getTotalOriginalPrice } = useCartStore();
  const token = useAuthStore((state) => state.token);

  // Mã khuyến mãi state
  const [couponCode, setCouponCode] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<{
    id: number;
    code: string;
    discountPercentage: number;
  } | null>(null);

  const { mutate: createOrder, isPending, isSuccess, isError, error, data: orderResult } = useCreateOrder();

  const originalTotal = getTotalOriginalPrice();

  const discountAmount = appliedPromotion
    ? originalTotal * (appliedPromotion.discountPercentage / 100)
    : 0;

  const finalTotal = Math.max(0, originalTotal - discountAmount);

  // Áp dụng Mã khuyến mãi — không cần FormEvent vì đã gỡ <form> wrapper.
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const response = await axiosClient.post<ValidateResponse, ValidateResponse>('/api/promotions/validate', {
        code: couponCode.trim(),
      });

      setAppliedPromotion({
        id: response.id,
        code: response.code,
        discountPercentage: response.discountPercentage,
      });
      setCouponError(null);
    } catch (err: any) {
      setAppliedPromotion(null);
      setCouponError(err.message || 'Mã khuyến mãi không hợp lệ hoặc đã hết lượt sử dụng.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSubmitOrder = (e: FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) return;

    const itemsPayload: OrderItemPayload[] = cartItems.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));

    createOrder(
      {
        userId,
        paymentMethod,
        promotionId: appliedPromotion?.id ?? null,
        items: itemsPayload,
      },
      {
        onSuccess: async (data) => {
          if (paymentMethod === 2) {
            try {
              // Gọi API lấy URL thanh toán trực tuyến giả lập
              const res = await axiosClient.post<{ payUrl: string }, { payUrl: string }>('/api/payments/mock-url', {
                orderId: data.id,
                amount: data.totalAmount,
              });
              if (res?.payUrl) {
                window.location.href = res.payUrl;
              }
            } catch (err: any) {
              console.error("Không thể lấy link thanh toán giả lập", err);
              alert("Lỗi kết nối cổng thanh toán giả lập. Đơn hàng đã được tạo nhưng chưa thanh toán.");
            }
          } else {
            // Thanh toán COD thành công thì xóa giỏ hàng ngay
            clearCart();
          }
        },
      }
    );
  };

  /* ─────────────────────────────────────────────────────────────────────
     NHÁNH 1 — SUCCESS STATE (COD)
     Giữ layout 1 cột (center card), reskin theo design system.
     ───────────────────────────────────────────────────────────────────── */
  if (isSuccess && orderResult && paymentMethod === 1) {
    return (
      <section className="max-w-2xl mx-auto rounded-xl bg-white border border-slate-200 shadow-md p-8 md:p-10 text-slate-900 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Đặt hàng thành công!</h2>
          <p className="text-slate-500 text-sm mt-2">Cảm ơn bạn đã lựa chọn FoodDelivery</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 md:p-5 text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-emerald-700">#{orderResult.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Thời gian:</span>
            <span className="text-slate-700">{new Date(orderResult.orderDate).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tổng thanh toán:</span>
            <span className="font-bold text-emerald-700 text-base tabular-nums">
              {orderResult.totalAmount?.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 shadow-md shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Tiếp tục mua hàng
        </Link>
      </section>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     NHÁNH 2 — EMPTY CART
     Layout 1 cột, icon to + CTA amber.
     ───────────────────────────────────────────────────────────────────── */
  if (cartItems.length === 0) {
    return (
      <section className="max-w-xl mx-auto rounded-xl bg-white border border-slate-200 shadow-md p-10 md:p-12 text-slate-900 text-center space-y-5">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">Giỏ hàng của bạn đang trống</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Hãy chọn các sản phẩm tươi ngon tại trang chủ để đặt hàng.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-7 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-5 h-5" />
            Mua sắm ngay
          </Link>
        </div>
      </section>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     NHÁNH 3 — CHECKOUT FORM
     Layout 2 cột (desktop) / 1 cột (mobile):
       • Cột trái: Cart items (stacked cards) + Payment + Coupon
       • Cột phải: Sticky aside chứa Order Summary + Nút Submit
     ───────────────────────────────────────────────────────────────────── */
  return (
    <form
      onSubmit={handleSubmitOrder}
      className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start"
    >
      {/* ─────────────── CỘT TRÁI ─────────────── */}
      <div className="space-y-6 min-w-0">

        {/* Thông báo Lỗi Đặt hàng */}
        {isError && error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-700">Không thể tạo đơn hàng</h4>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {/* ─── DANH SÁCH SẢN PHẨM ─── */}
        <section
          aria-label="Sản phẩm trong giỏ"
          className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 md:p-6"
        >
          <header className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Sản phẩm trong giỏ ({cartItems.length})
            </h3>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-slate-500 hover:text-red-600 hover:underline transition-colors"
            >
              Xoá tất cả
            </button>
          </header>

          <div className="space-y-3">
            {cartItems.map((item) => (
              <article
                key={item.id}
                className="
                  relative rounded-lg bg-white border border-slate-200
                  p-4 flex gap-4 items-center
                  transition-shadow hover:shadow-sm
                "
              >
                {/* Thumbnail placeholder (store CartItem chưa có imageUrl) */}
                <div
                  aria-hidden="true"
                  className="
                    shrink-0 w-16 h-16 md:w-20 md:h-20
                    rounded-lg bg-emerald-50 border border-emerald-100
                    flex items-center justify-center text-emerald-600
                  "
                >
                  <Beef className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm line-clamp-2">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    <span className="font-bold text-emerald-700">
                      {item.price?.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="mx-1 text-slate-300">/ sp</span>
                  </p>

                  {/* Qty stepper — grouped [-][N][+] liền mạch */}
                  <div
                    role="group"
                    aria-label={`Số lượng ${item.name}`}
                    className="mt-2 inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Giảm"
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-emerald-700 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      aria-live="polite"
                      className="w-10 text-center text-sm font-bold text-slate-900 tabular-nums border-x border-slate-200 bg-white py-1.5"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Tăng"
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-emerald-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Thành tiền + nút xoá */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-bold text-slate-900 text-sm tabular-nums">
                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Xoá ${item.name}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── PHƯƠNG THỨC THANH TOÁN ─── */}
        <section
          aria-label="Phương thức thanh toán"
          className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 md:p-6"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Phương thức thanh toán
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`
                flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer
                transition-all
                ${paymentMethod === 1
                  ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'}
              `}
            >
              <input
                type="radio"
                name="payment"
                value={1}
                checked={paymentMethod === 1}
                onChange={() => setPaymentMethod(1)}
                className="sr-only"
              />
              <Truck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Thanh toán khi nhận hàng (COD)</p>
                <p className="text-xs text-slate-500 mt-1">Trả tiền mặt khi shipper giao tới</p>
              </div>
            </label>

            <label
              className={`
                flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer
                transition-all
                ${paymentMethod === 2
                  ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'}
              `}
            >
              <input
                type="radio"
                name="payment"
                value={2}
                checked={paymentMethod === 2}
                onChange={() => setPaymentMethod(2)}
                className="sr-only"
              />
              <Wallet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Thanh toán trực tuyến (VNPay Mock)</p>
                <p className="text-xs text-slate-500 mt-1">Giả lập cổng thanh toán online</p>
              </div>
            </label>
          </div>
        </section>

        {/* ─── MÃ KHUYẾN MÃI ─── */}
        <section
          aria-label="Mã khuyến mãi"
          className="rounded-xl bg-slate-50 border border-slate-200 p-5 md:p-6 space-y-3"
        >
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Mã khuyến mãi (Voucher)
          </label>
          {/* Dùng <div> thay vì <form> lồng để tránh HTML invalid (form-inside-form bị browser bỏ qua). */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nhập mã (VD: HELLOFRESH, FOOD50)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCoupon();
                  }
                }}
                className="
                  w-full pl-10 pr-3 py-2.5
                  bg-white border border-slate-300 rounded-lg
                  text-slate-900 font-mono font-bold uppercase tracking-wider text-sm
                  outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                  transition-colors
                "
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={isValidatingCoupon || !couponCode.trim()}
              className="
                px-5 py-2.5 rounded-lg
                bg-white hover:bg-emerald-500 hover:text-white
                border border-slate-300 hover:border-emerald-500
                text-slate-700 font-semibold text-sm
                transition-colors
                flex items-center gap-1.5
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
            </button>
          </div>

          {couponError && (
            <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {couponError}
            </p>
          )}

          {appliedPromotion && (
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Đã áp dụng mã {appliedPromotion.code} (-{appliedPromotion.discountPercentage}%)
            </p>
          )}
        </section>

        {/* ─── NÚT SUBMIT ───
            Đặt ở cột trái (sau Coupon) để button luôn hiển thị ở mọi
            viewport, không phụ thuộc vào aside sticky. */}
        <div className="pt-2">
          {!token ? (
            <Link
              to="/login"
              className="
                w-full inline-flex items-center justify-center gap-2
                rounded-lg bg-amber-400 hover:bg-amber-500 active:bg-amber-600
                border-2 border-amber-500
                text-slate-900 font-extrabold
                px-6 py-4
                shadow-md hover:shadow-lg shadow-amber-500/40
                transition-all duration-200
                hover:-translate-y-1
              "
            >
              <LogIn className="w-5 h-5" />
              <span>Đăng nhập để thanh toán ({cartItems.length} món)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="submit"
              disabled={isPending || cartItems.length === 0}
              className="
                group relative z-10
                w-full inline-flex items-center justify-center gap-2
                rounded-lg font-extrabold text-slate-900
                px-6 py-4
                bg-amber-400 hover:bg-amber-500 active:bg-amber-600
                border-2 border-amber-500
                shadow-md hover:shadow-lg shadow-amber-500/40
                transition-all duration-200
                hover:-translate-y-1
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:translate-y-0 disabled:hover:shadow-md
              "
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý đặt hàng...</span>
                </>
              ) : paymentMethod === 2 ? (
                <>
                  <Wallet className="w-5 h-5" />
                  <span>Thanh toán qua VNPay ({cartItems.length} món)</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  <span>Xác nhận đặt hàng ({cartItems.length} món)</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─────────────── CỘT PHẢI: STICKY ORDER SUMMARY ─────────────── */}
      <aside
        aria-label="Tóm tắt đơn hàng"
        className="lg:sticky lg:top-24"
      >
        <div
          className="
            rounded-xl border border-slate-200 bg-white shadow-md
            p-5 md:p-6
            space-y-4
          "
        >
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Tóm tắt đơn hàng
          </h2>

          {/* Bảng phân tích tiền */}
          <div className="space-y-2.5 text-sm border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tạm tính</span>
              <span
                className={`
                  tabular-nums
                  ${appliedPromotion
                    ? 'line-through text-slate-400 font-medium'
                    : 'font-bold text-slate-900'}
                `}
              >
                {originalTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {appliedPromotion && (
              <div className="flex items-center justify-between text-emerald-700 font-medium">
                <span>Giảm giá ({appliedPromotion.discountPercentage}%)</span>
                <span className="tabular-nums">
                  -{discountAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-500">
              <span>Phí vận chuyển</span>
              <span className="italic text-xs">Tính khi giao hàng</span>
            </div>
          </div>

          {/* TỔNG */}
          <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-slate-700 font-semibold">Tổng thanh toán</span>
            <div className="text-right">
              {appliedPromotion ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400 line-through font-mono tabular-nums">
                    {originalTotal.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-2xl md:text-3xl font-extrabold text-amber-600 tabular-nums">
                    {finalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ) : (
                <span className="text-2xl md:text-3xl font-extrabold text-amber-600 tabular-nums">
                  {originalTotal.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Thanh toán an toàn · Bảo mật thông tin</span>
          </div>

          <Link
            to="/cart"
            className="
              block text-center text-sm text-slate-500 hover:text-emerald-700
              transition-colors
            "
          >
            ← Quay lại giỏ hàng
          </Link>
        </div>
      </aside>
    </form>
  );
};
