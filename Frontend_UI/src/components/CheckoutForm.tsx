import { useState, type FormEvent } from 'react';
import { useCreateOrder, type OrderItemPayload } from '../hooks/useCreateOrder';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import { ShoppingBag, CreditCard, CheckCircle2, AlertCircle, Loader2, Tag, Check, Trash2, Plus, Minus, ArrowLeft, LogIn } from 'lucide-react';
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

  // Áp dụng Mã khuyến mãi
  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
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

  if (isSuccess && orderResult && paymentMethod === 1) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Đặt hàng thành công!</h2>
          <p className="text-slate-400 text-sm mt-1">Cảm ơn bạn đã lựa chọn FoodDelivery</p>
        </div>

        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-orange-400">#{orderResult.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Thời gian:</span>
            <span className="text-slate-200">{new Date(orderResult.orderDate).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tổng thanh toán:</span>
            <span className="font-bold text-emerald-400 text-base">{orderResult.totalAmount?.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition shadow-lg shadow-orange-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Tiếp tục mua hàng
        </Link>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">Giỏ hàng của bạn đang trống</h3>
        <p className="text-slate-400 text-sm">Hãy chọn các sản phẩm tươi ngon tại trang chủ để đặt hàng</p>
        <div className="pt-2">
          <a
            href="#products-grid"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
          >
            Mua sắm ngay
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <ShoppingBag className="w-7 h-7 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-white">Xác nhận đơn hàng</h2>
          <p className="text-sm text-slate-400">Kiểm tra sản phẩm và chọn phương thức thanh toán</p>
        </div>
      </div>

      {/* Thông báo Lỗi Đặt hàng */}
      {isError && error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-300">Không thể tạo đơn hàng</h4>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* Danh sách sản phẩm thực tế từ Zustand Cart Store */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Sản phẩm trong giỏ ({cartItems.length})</h3>
            <button type="button" onClick={clearCart} className="text-xs text-red-400 hover:underline">Xóa tất cả</button>
          </div>

          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex-1 pr-3">
                  <p className="font-semibold text-slate-100 text-sm">{item.name}</p>
                  <p className="text-xs text-orange-400 font-medium">{item.price?.toLocaleString('vi-VN')} đ</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Điều khiển số lượng */}
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-white font-mono">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-bold text-slate-100 text-sm min-w-[80px] text-right">
                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                  </span>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Phương thức thanh toán</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 1 ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'}`}>
              <input type="radio" name="payment" value={1} checked={paymentMethod === 1} onChange={() => setPaymentMethod(1)} className="hidden" />
              <CreditCard className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium text-sm">Thanh toán khi nhận hàng (COD)</p>
                <p className="text-xs text-slate-400">Trả tiền mặt khi shipper giao tới</p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 2 ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'}`}>
              <input type="radio" name="payment" value={2} checked={paymentMethod === 2} onChange={() => setPaymentMethod(2)} className="hidden" />
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="font-medium text-sm">Thanh toán trực tuyến (VNPay Mock)</p>
                <p className="text-xs text-slate-400">Giả lập cổng thanh toán online</p>
              </div>
            </label>
          </div>
        </div>

        {/* MÃ KHUYẾN MÃI (COUPON CODE INPUT) */}
        <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Mã khuyến mãi (Voucher)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Nhập mã (VD: HELLOFRESH, FOOD50)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold uppercase tracking-wider text-sm outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={isValidatingCoupon || !couponCode.trim()}
              className="px-5 py-2.5 bg-slate-800 hover:bg-orange-500 hover:text-white border border-slate-700 hover:border-orange-500 text-slate-200 font-semibold rounded-xl text-sm transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
            </button>
          </div>

          {/* Hiển thị lỗi Mã khuyến mãi */}
          {couponError && (
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> {couponError}
            </p>
          )}

          {/* Hiển thị thông báo áp dụng thành công */}
          {appliedPromotion && (
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
              <Check className="w-3.5 h-3.5" /> Đã áp dụng mã {appliedPromotion.code} (-{appliedPromotion.discountPercentage}%)
            </p>
          )}
        </div>

        {/* TỔNG THANH TOÁN & GIẢM GIÁ */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Tạm tính:</span>
            <span className={appliedPromotion ? 'line-through text-slate-500 font-medium' : 'font-bold text-slate-200'}>
              {originalTotal.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {appliedPromotion && (
            <div className="flex justify-between items-center text-sm text-emerald-400 font-medium">
              <span>Giảm giá ({appliedPromotion.discountPercentage}%):</span>
              <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-300 font-semibold">Tổng tiền thanh toán:</span>
            <div className="text-right">
              {appliedPromotion ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500 line-through font-mono">
                    {originalTotal.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {finalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-orange-500">
                  {originalTotal.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nút Đăng nhập / Xác nhận đặt hàng */}
        {!token ? (
          <Link
            to="/login"
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 text-center font-bold"
          >
            <LogIn className="w-5 h-5" />
            <span>Đăng nhập để thanh toán ({cartItems.length} món)</span>
          </Link>
        ) : (
          <button
            type="submit"
            disabled={isPending || cartItems.length === 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý đặt hàng...</span>
              </>
            ) : (
              <span>Xác nhận đặt hàng ({cartItems.length} món)</span>
            )}
          </button>
        )}
      </form>
    </div>
  );
};
