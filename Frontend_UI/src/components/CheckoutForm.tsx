import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, type FormEvent } from 'react';
import { useCreateOrder, type OrderItemPayload } from '../hooks/useCreateOrder';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore, normalizeTier, type MembershipTier } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import {
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Check,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Coins,
  Sprout,
  Zap,
  MapPin,
  Edit3,
  Heart,
  Lock,
  Key,
  Truck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../pages/ProfilePage';

export interface ValidateResponse {
  id: number;
  code: string;
  discountType: number | string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  isValid: boolean;
  message: string;
}

/** Mapping tier → tỷ lệ giảm tối đa + nhãn tiếng Việt */
const TIER_CONFIG: Record<MembershipTier, { percent: number; label: string; badge: string; color: string }> = {
  Platinum: {
    percent: 0.20,
    label: 'Bạch kim',
    badge: 'PLATINUM',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  Gold: {
    percent: 0.10,
    label: 'Vàng',
    badge: 'GOLD',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  Silver: {
    percent: 0.10,
    label: 'Bạc',
    badge: 'SILVER',
    color: 'bg-slate-200 text-slate-700 border-slate-300',
  },
  Standard: {
    percent: 0,
    label: 'Tiêu chuẩn',
    badge: 'STANDARD',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const POINT_VALUE_VND = 1000; // 1 điểm = 1000đ
const FREE_SHIPPING_THRESHOLD = 300000;

export const CheckoutForm: React.FC = () => {
  const { data: paymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: ({ signal }) => axiosClient.get<{ mockOnline: boolean }, { mockOnline: boolean }>('/api/payments/methods', { signal }),
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<number>(1); // 1 = COD, 2 = Online, 3 = 1-Tap

  // Form Thông tin nhận hàng (Step 1)
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(true);
  const [recipientName, setRecipientName] = useState<string>(user?.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    [user?.address1, user?.address2].filter(Boolean).join(', ')
  );
  const [leaveAtDoorstep, setLeaveAtDoorstep] = useState<boolean>(true);
  const [gateCode, setGateCode] = useState<string>('');

  // Ca giao Eco-Courier (Step 2)
  const [selectedSlot, setSelectedSlot] = useState<'slot-a' | 'slot-b' | 'slot-c'>('slot-a');

  // Tiền tip tài xế
  const [currentTip, setCurrentTip] = useState<number>(0); // Tiền tip do khách chủ động chọn

  // Đọc giỏ hàng từ Zustand
  const { items: cartItems, clearCart, getTotalOriginalPrice } = useCartStore();

  // Mã khuyến mãi state
  const [couponCode, setCouponCode] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<ValidateResponse | null>(null);

  // Điểm tích lũy state
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  // Sync profile data
  useEffect(() => {
    let cancelled = false;
    if (token) {
      axiosClient
        .get<UserProfile, UserProfile>('/api/users/profile')
        .then((profile) => {
          if (cancelled) return;
          updateUser({
            fullName: profile.fullName,
            phoneNumber: profile.phoneNumber,
            address1: profile.address1,
            address2: profile.address2,
            loyaltyPoints: profile?.loyaltyPoints ?? 0,
            tier: normalizeTier(profile?.tier),
          });
          setRecipientName(current => current || profile.fullName);
          setRecipientPhone(current => current || profile.phoneNumber);
          setDeliveryAddress(current => current || [profile.address1, profile.address2].filter(Boolean).join(', '));
        })
        .catch(() => {
          /* silent */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [token, updateUser]);

  const { mutate: createOrder, isPending, isSuccess, isError, error, data: orderResult } = useCreateOrder();

  const originalTotal = getTotalOriginalPrice();
  const totalItemsCount = cartItems.reduce((acc, cur) => acc + cur.quantity, 0);

  // Phí vận chuyển và tiền cọc khay giữ nhiệt tuần hoàn
  const isFreeShipping = originalTotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = cartItems.length === 0 || isFreeShipping ? 0 : 25000;
  const toteDeposit = cartItems.length > 0 ? 15000 : 0;

  // Tính giảm giá từ voucher
  let discountAmount = 0;
  if (appliedPromotion) {
    if (originalTotal < appliedPromotion.minOrderAmount) {
      discountAmount = 0;
    } else if (appliedPromotion.discountType === 1 || appliedPromotion.discountType === 'Percentage') {
      discountAmount = originalTotal * (appliedPromotion.discountValue / 100);
      if (appliedPromotion.maxDiscountAmount && discountAmount > appliedPromotion.maxDiscountAmount) {
        discountAmount = appliedPromotion.maxDiscountAmount;
      }
    } else {
      discountAmount = appliedPromotion.discountValue;
    }
  }

  discountAmount = Math.round((discountAmount + Number.EPSILON) * 100) / 100;

  // Tính điểm tích lũy
  const userPointsAvailable: number = user?.loyaltyPoints ?? 0;
  const userTier: MembershipTier = normalizeTier(user?.tier);
  const tierConfig = TIER_CONFIG[userTier] ?? TIER_CONFIG.Standard;

  const baseForPoints = Math.max(originalTotal - discountAmount, 0);
  const maxDiscountByPercent = baseForPoints * tierConfig.percent;
  const maxPointsByMoney = Math.floor(maxDiscountByPercent / POINT_VALUE_VND);

  const pointsToUse = usePoints
    ? Math.max(0, Math.min(userPointsAvailable, maxPointsByMoney))
    : 0;
  const pointDiscount = pointsToUse * POINT_VALUE_VND;

  // Tổng cộng cuối cùng
  const finalTotal = Math.round((Math.max(
    0,
    originalTotal - discountAmount - pointDiscount
  ) + shippingFee + toteDeposit + currentTip + Number.EPSILON) * 100) / 100;

  // Toggle điểm tích lũy
  const handleTogglePoints = (next: boolean) => {
    setPointsError(null);
    if (next) {
      if (!token) {
        setPointsError('Vui lòng đăng nhập để sử dụng điểm thưởng.');
        return;
      }
      if (userPointsAvailable <= 0) {
        setPointsError('Bạn chưa có điểm tích lũy để sử dụng.');
        return;
      }
      if (tierConfig.percent <= 0) {
        setPointsError(`Hạng ${tierConfig.label} chưa hỗ trợ dùng điểm cấn trừ.`);
        return;
      }
      if (baseForPoints <= 0) {
        setPointsError('Đơn hàng sau khi giảm giá phải lớn hơn 0.');
        return;
      }
    }
    setUsePoints(next);
  };

  // Áp dụng Voucher
  const handleApplyCoupon = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const response = await axiosClient.post<ValidateResponse, ValidateResponse>('/api/promotions/validate', {
        code: couponCode.trim(),
      });

      if (originalTotal < response.minOrderAmount) {
        setAppliedPromotion(null);
        setCouponError(
          `Đơn hàng tối thiểu phải từ ${response.minOrderAmount.toLocaleString('vi-VN')} đ mới được áp dụng mã này.`
        );
        return;
      }

      setAppliedPromotion(response);
      setCouponError(null);
    } catch (err: any) {
      setAppliedPromotion(null);
      setCouponError(err.message || 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Gửi đơn hàng
  const handleSubmitOrder = (e: FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0 || isPending) return;
    setValidationError(null);
    if (!token || !user) {
      setValidationError('Vui lòng đăng nhập trước khi đặt hàng.');
      return;
    }
    if (!recipientName.trim() || !/^\+?[0-9][0-9 .()-]{6,19}$/.test(recipientPhone.trim()) || !deliveryAddress.trim()) {
      setIsEditingAddress(true);
      setValidationError('Vui lòng nhập họ tên, số điện thoại hợp lệ và địa chỉ nhận hàng.');
      return;
    }

    const itemsPayload: OrderItemPayload[] = cartItems.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));

    const finalPaymentMethod = paymentMethod === 3 ? 2 : paymentMethod;

    createOrder(
      {
        userId: user.id,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliverySlot: selectedSlot,
        deliveryNotes: gateCode.trim(),
        leaveAtDoorstep,
        tipAmount: currentTip,
        expectedTotalAmount: finalTotal,
        paymentMethod: finalPaymentMethod,
        couponCode: appliedPromotion?.code ?? null,
        usePoints,
        userPointsAvailable,
        items: itemsPayload,
      },
      {
        onSuccess: async (data) => {
          const used = data.pointsUsed ?? 0;
          if (used > 0) {
            const remaining = Math.max(0, userPointsAvailable - used);
            updateUser({ loyaltyPoints: remaining });
          }

          if (finalPaymentMethod === 2) {
            try {
              const res = await axiosClient.post<{ payUrl: string }, { payUrl: string }>('/api/payments/mock-url', {
                orderId: data.id,
              });
              if (res?.payUrl) {
                window.location.href = res.payUrl;
              }
            } catch (err: any) {
              console.error('Không thể lấy link thanh toán', err);
              alert('Đã tạo đơn hàng thành công nhưng gặp sự cố kết nối cổng thanh toán trực tuyến.');
            }
          } else {
            clearCart();
          }
        },
      }
    );
  };

  // Helper ảnh thumbnail
  const getItemImage = (item: { imageUrl?: string | null; name: string }) => {
    if (item.imageUrl) return item.imageUrl;
    const name = item.name.toLowerCase();
    if (name.includes('bò') || name.includes('thịt')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80';
    }
    if (name.includes('rau') || name.includes('cải') || name.includes('nấm') || name.includes('cà')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80';
    }
    if (name.includes('cá') || name.includes('tôm') || name.includes('hải sản')) {
      return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&auto=format&fit=crop&q=80';
  };

  // ────────────────────────── NHÁNH 1: ĐẶT HÀNG THÀNH CÔNG (COD) ──────────────────────────
  if (isSuccess && orderResult && paymentMethod === 1) {
    return (
      <div className="w-full max-w-3xl mx-auto my-8 bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-emerald-100 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="text-xs uppercase font-extrabold text-[#006c49] tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
            Đã Phân Bổ Mẻ Thu Hoạch
          </span>
          <h2 className="font-syne text-3xl font-extrabold text-slate-900 mt-3">
            Đặt Hàng Thành Công!
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Đơn hàng của bạn đã được chuyển đến trạm điều phối chuỗi lạnh sớm nhất.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-6 text-left text-xs sm:text-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500">Mã đơn hàng:</span>
            <span className="font-syne font-extrabold text-[#006c49] text-base">#{orderResult.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Thời gian tạo:</span>
            <span className="text-slate-700 font-medium">
              {new Date(orderResult.orderDate).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Người nhận:</span>
            <span className="text-slate-800 font-bold">{recipientName} • {recipientPhone}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Địa chỉ giao:</span>
            <span className="text-slate-700 max-w-xs text-right truncate">{deliveryAddress}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Tạm tính tiền hàng:</span>
            <span className="text-slate-800 font-medium">
              {orderResult.subTotal?.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {orderResult.discountAmount > 0 && (
            <div className="flex justify-between items-center text-[#006c49] font-bold">
              <span>Mã giảm giá ({orderResult.appliedCouponCode}):</span>
              <span>-{orderResult.discountAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {orderResult.pointDiscount != null && orderResult.pointDiscount > 0 && (
            <div className="flex justify-between items-center text-amber-700 font-bold">
              <span>
                <Coins className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Điểm tích lũy (×{orderResult.pointsUsed ?? 0} điểm):
              </span>
              <span>-{orderResult.pointDiscount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-slate-200 pt-3">
            <span className="font-bold text-slate-800 text-sm">Tổng thanh toán:</span>
            <span className="font-syne font-black text-[#006c49] text-xl">
              {orderResult.totalAmount?.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-2 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold px-7 py-3.5 rounded-full shadow-md transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>Theo dõi đơn hàng</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-7 py-3.5 rounded-full transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục mua hàng</span>
          </Link>
        </div>
      </div>
    );
  }

  // ────────────────────────── NHÁNH 2: GIỎ HÀNG TRỐNG ──────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 md:p-14 text-center shadow-sm border border-emerald-100 my-10">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center mb-5">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h3 className="font-syne text-2xl font-bold text-slate-900 mb-2">Giỏ hàng của bạn đang trống</h3>
        <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto mb-6">
          Hãy quay lại trang chủ và chọn các mẻ nông sản tươi sớm để hoàn tất đặt hàng.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#ff7d45] hover:bg-[#e8590c] text-white font-bold text-xs px-7 py-3.5 rounded-full shadow-md transition-all"
        >
          <Sprout className="w-4 h-4" />
          <span>Mua sắm nông sản ngay</span>
        </Link>
      </div>
    );
  }

  // ────────────────────────── NHÁNH 3: CHECKOUT MAIN VIEW ──────────────────────────
  return (
    <div className="w-full flex flex-col gap-6">
      {/* ================= TOP METABAR & LINEAR STEPPER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#006c49] bg-[#b4efd6] px-3 py-0.5 rounded-full">
              Điều Phối #8492
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              Đã Khóa Chuỗi Lạnh
            </span>
          </div>
          <h1 className="font-syne text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Thanh Toán Mùa Vụ Chuẩn Xác
          </h1>
        </div>

        {/* Linear Stepper */}
        <nav aria-label="Tiến trình thanh toán" className="bg-white shadow-sm rounded-full p-1.5 flex items-center gap-1.5 border border-emerald-100">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b4efd6] text-[#15503e] text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
            <span>1. Địa Chỉ</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006c49] text-white text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#6ffbbe] animate-pulse" />
            <span>2. Ca Giao Lạnh</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>3. Thanh Toán</span>
          </div>
        </nav>
      </div>

      {validationError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{validationError}</p>}
      {/* Thông báo Lỗi Đặt hàng (nếu có) */}
      {isError && error && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-800 text-sm">Không thể hoàn tất đơn hàng</h4>
            <p className="text-xs mt-0.5">{error.message}</p>
          </div>
        </div>
      )}

      {/* ================= MAIN CHECKOUT GRID (12 COLS: Left 7, Right 5) ================= */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─────────────── CỘT TRÁI (7 COLS) ─────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* SECTION 1: Điểm giao hàng & Người nhận */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#ebf6f1] text-[#006c49] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Bước 1 • Điều phối từ Trạm Nông Sản Phía Bắc
                  </span>
                  <h2 className="font-syne text-lg font-bold text-slate-900">
                    Người Nhận & Địa Điểm Bàn Giao
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs font-bold text-[#006c49] hover:text-[#005236] bg-[#ebf6f1] px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingAddress ? 'Xong' : 'Chỉnh sửa'}</span>
              </button>
            </div>

            {isEditingAddress ? (
              <div className="space-y-3 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ tên người nhận:</label>
                  <input
                    type="text"
                    maxLength={150}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Địa chỉ giao hàng:</label>
                  <input
                    type="text"
                    maxLength={1000}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mã vào cổng / Ghi chú giao hàng:</label>
                  <input
                    type="text"
                    maxLength={500}
                    value={gateCode}
                    onChange={(e) => setGateCode(e.target.value)}
                    placeholder="Ví dụ: #4821 hoặc Gọi trước khi giao"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Người nhận chính</p>
                  <p className="font-bold text-slate-900 text-sm">{recipientName}</p>
                  <p className="text-slate-500 mt-0.5">{recipientPhone} • Xác nhận SMS tự động</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Điểm nhận hàng</p>
                  <p className="font-bold text-slate-900 text-sm truncate">{deliveryAddress}</p>
                  <p className="text-slate-500 mt-0.5">Bàn giao chuỗi lạnh tiêu chuẩn VietGAP</p>
                </div>
              </div>
            )}

            {/* Checkbox để trước cửa & Mã vào cổng */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={leaveAtDoorstep}
                  onChange={(e) => setLeaveAtDoorstep(e.target.checked)}
                  className="w-4 h-4 rounded text-[#006c49] accent-[#006c49] cursor-pointer"
                />
                <span className="text-slate-700 font-medium">
                  Để trước cửa nhà trong thùng xốp sinh học sợi nấm giữ lạnh
                </span>
              </label>

              <div className="inline-flex items-center gap-1.5 bg-[#ebf6f1] px-3 py-1 rounded-full text-slate-700 text-[11px]">
                <Key className="w-3.5 h-3.5 text-[#006c49]" />
                <span>
                  Mã cửa/Ghi chú: <strong>{gateCode}</strong>
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: Chọn Ca Giao Eco-Courier */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#006c49] text-white flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#6ffbbe]" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#006c49] block">
                    Bước 2 • Tuyến Xe Điện Lạnh 4°C
                  </span>
                  <h2 className="font-syne text-lg font-bold text-slate-900">
                    Khung Giờ Giao Eco-Courier
                  </h2>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-[#b4efd6] text-[#15503e] px-3 py-1 rounded-full flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-[#006c49]" />
                Không Phát Thải
              </span>
            </div>

            <div className="space-y-3">
              {/* Slot A */}
              <div
                onClick={() => setSelectedSlot('slot-a')}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedSlot === 'slot-a'
                    ? 'bg-[#ebf6f1] border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-white ${
                        selectedSlot === 'slot-a' ? 'bg-[#006c49]' : 'border border-slate-300'
                      }`}
                    >
                      {selectedSlot === 'slot-a' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Hôm nay: 11:00 AM – 12:00 PM</span>
                        <span className="text-[10px] font-extrabold uppercase bg-[#006c49] text-white px-2 py-0.5 rounded-full">
                          Nhanh Nhất
                        </span>
                      </div>
                      <p className="text-xs text-[#006c49] font-medium flex items-center gap-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5" />
                        Xe Điện Express • 42 phút kể từ khi khóa kho thu hoạch
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#006c49] bg-white px-3 py-1 rounded-full border border-emerald-100 self-end sm:self-auto">
                    Miễn Phí
                  </span>
                </div>
              </div>

              {/* Slot B */}
              <div
                onClick={() => setSelectedSlot('slot-b')}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedSlot === 'slot-b'
                    ? 'bg-[#ebf6f1] border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-white ${
                        selectedSlot === 'slot-b' ? 'bg-[#006c49]' : 'border border-slate-300'
                      }`}
                    >
                      {selectedSlot === 'slot-b' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Hôm nay: 4:30 PM – 5:30 PM</span>
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Bữa Tối
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lý tưởng cho chuẩn bị bữa tối • Bánh mì men củi ra lò lúc 3:00 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-100 self-end sm:self-auto">
                    Miễn Phí
                  </span>
                </div>
              </div>

              {/* Slot C */}
              <div
                onClick={() => setSelectedSlot('slot-c')}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedSlot === 'slot-c'
                    ? 'bg-[#ebf6f1] border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-white ${
                        selectedSlot === 'slot-c' ? 'bg-[#006c49]' : 'border border-slate-300'
                      }`}
                    >
                      {selectedSlot === 'slot-c' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Sáng mai: 07:30 AM – 08:30 AM</span>
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Sương Sớm
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thu hoạch rạng đông ngày mai • Đóng gói trực tiếp khi vừa hái
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-100 self-end sm:self-auto">
                    Miễn Phí
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Phương thức thanh toán & Điểm / Voucher / Tip */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#ebf6f1] text-[#006c49] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Bước 3 • Mã Hóa 256-Bit Vault
                  </span>
                  <h2 className="font-syne text-lg font-bold text-slate-900">
                    Phương Thức Thanh Toán & Quyền Lợi
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#006c49] bg-emerald-50 px-3 py-1 rounded-full">
                <Lock className="w-3 h-3" />
                <span>Bảo Mật Cao</span>
              </div>
            </div>

            {/* Điểm tích lũy thành viên (Loyalty Credit Incentive) */}
            <div className="p-4 bg-[#ebf6f1] rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#006c49] shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Dùng Điểm Thưởng Thành Viên</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${tierConfig.color}`}>
                      {tierConfig.badge}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Bạn có <strong>{userPointsAvailable}</strong> điểm (quy đổi tối đa{' '}
                    <strong>{(maxPointsByMoney * POINT_VALUE_VND).toLocaleString('vi-VN')} đ</strong>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePoints(!usePoints)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer self-end sm:self-auto ${
                  usePoints
                    ? 'bg-[#006c49] text-white shadow-sm'
                    : 'bg-white text-[#006c49] border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                {usePoints ? 'Hủy dùng' : 'Áp dụng'}
              </button>
            </div>
            {pointsError && <p className="text-xs text-red-600 italic px-2">{pointsError}</p>}

            {/* Mã giảm giá (Voucher / Coupon) */}
            <div className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#006c49]" />
                  <span>Mã Khuyến Mãi / Voucher Nông Trại</span>
                </span>
                {appliedPromotion && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-[#006c49] px-2.5 py-0.5 rounded-full">
                    Đã áp dụng mã: {appliedPromotion.code}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="MÃ GIẢM GIÁ (VD: HARVEST10, VERDANT)"
                  className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs flex-1 uppercase tracking-wider focus:outline-none focus:border-[#006c49]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp Dụng'}
                </button>
              </div>

              {couponError && <p className="text-xs text-red-600">{couponError}</p>}
            </div>

            {/* Payment Method Radios */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Chọn phương thức thanh toán:
              </span>

              {/* COD Option */}
              <div
                onClick={() => setPaymentMethod(1)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  paymentMethod === 1
                    ? 'bg-[#ebf6f1] border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        paymentMethod === 1 ? 'bg-[#006c49]' : 'border border-slate-300'
                      }`}
                    >
                      {paymentMethod === 1 && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                        <span className="text-[10px] font-bold bg-[#b4efd6] text-[#15503e] px-2 py-0.2 rounded uppercase">
                          Tiền mặt
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kiểm tra độ tươi giòn của mẻ nông sản trước khi gửi tiền cho tài xế
                      </p>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#006c49]" />
                </div>
              </div>

              {paymentMethods?.mockOnline && (
              <div
                onClick={() => setPaymentMethod(2)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  paymentMethod === 2
                    ? 'bg-[#ebf6f1] border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        paymentMethod === 2 ? 'bg-[#006c49]' : 'border border-slate-300'
                      }`}
                    >
                      {paymentMethod === 2 && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Thanh toán trực tuyến thử nghiệm
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-[#006c49] px-2 py-0.2 rounded uppercase">
                          Thử nghiệm
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mô phỏng thanh toán, không trừ tiền trong tài khoản ngân hàng
                      </p>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-[#006c49]" />
                </div>
              </div>
              )}
            </div>

            {/* Tip the Courier & Pack Crew */}
            <div className="pt-4 border-t border-slate-100 bg-[#f8fafc] -mx-6 -mb-6 p-6 rounded-b-3xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span>Gửi Tip Động Viên Đội Ngũ Thu Hoạch & Giao Hàng</span>
                </div>
                <span className="text-[10px] text-slate-400">100% chuyển trực tiếp</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Đội ngũ của chúng tôi dậy từ 4 giờ sáng để thu hoạch, đóng gói lạnh và chuyển nông sản đến tận tay bạn.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {[0, 10000, 20000, 30000, 50000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setCurrentTip(amount)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      currentTip === amount
                        ? 'bg-[#006c49] text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {amount === 0 ? 'Không tip' : `${amount.toLocaleString('vi-VN')} đ`}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ─────────────── CỘT PHẢI: STICKY BASKET MANIFEST (5 COLS) ─────────────── */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-md border border-emerald-100 flex flex-col gap-5">
            {/* Top Brand & Manifest Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-syne text-lg font-extrabold text-slate-900">
                Danh Mục Nông Sản Đã Chọn
              </h3>
              <span className="text-xs font-bold bg-emerald-100 text-[#006c49] px-3 py-0.5 rounded-full">
                {totalItemsCount} Món Tươi Sạch
              </span>
            </div>

            {/* Thumbnail Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={getItemImage(item)}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100 shadow-sm"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-xs text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Số lượng: <strong>{item.quantity}</strong> • {item.price?.toLocaleString('vi-VN')} đ/món
                    </p>
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2.5 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Tạm tính nông sản</span>
                <span className="font-bold text-slate-900">{originalTotal.toLocaleString('vi-VN')} đ</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  <span>Giao hàng Eco-Courier</span>
                  <span className="text-[10px] font-bold bg-[#b4efd6] text-[#15503e] px-1.5 rounded uppercase">
                    Xe điện
                  </span>
                </span>
                <span className="font-bold text-[#006c49]">
                  {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Đặt cọc khay giữ nhiệt tuần hoàn</span>
                <span className="font-bold text-slate-900">{toteDeposit.toLocaleString('vi-VN')} đ</span>
              </div>

              {currentTip > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tiền tip đội thu hoạch & giao hàng</span>
                  <span className="font-bold text-slate-900">{currentTip.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[#006c49] font-bold">
                  <span>Giảm giá voucher:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {pointDiscount > 0 && (
                <div className="flex justify-between items-center text-amber-700 font-bold">
                  <span>Điểm thưởng (×{pointsToUse}):</span>
                  <span>-{pointDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {/* Total Banner */}
              <div className="pt-2.5 mt-1 border-t border-slate-200 flex justify-between items-baseline">
                <div className="flex flex-col text-left">
                  <span className="font-syne font-bold text-slate-900 text-base">Tổng Thanh Toán</span>
                  <span className="text-[10px] text-slate-400">Bảo chứng tươi sạch lúc bình minh</span>
                </div>
                <span className="font-syne font-black text-2xl sm:text-3xl text-[#006c49] tracking-tight">
                  {finalTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Primary Conversion CTA Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#ff7d45] hover:bg-[#e8590c] text-white py-4 px-6 rounded-full font-syne text-base font-bold shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer group"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang Khóa Mẻ Nông Sản...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Xác Nhận Đặt Hàng • {finalTotal.toLocaleString('vi-VN')} đ</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center uppercase tracking-wider">
              Cho phép hủy miễn phí trước 10:15 AM • Thanh toán an toàn
            </p>

            {/* Security & Environmental Trust Seals (3 Badges) */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="flex flex-col items-center gap-1 p-2 bg-[#f8fafc] rounded-xl border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-[#006c49]" />
                <span className="text-[10px] font-bold text-slate-600 leading-tight">256-Bit SSL</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 bg-[#f8fafc] rounded-xl border border-slate-100">
                <Sprout className="w-4 h-4 text-[#006c49]" />
                <span className="text-[10px] font-bold text-slate-600 leading-tight">Đội Xe B-Corp</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 bg-[#f8fafc] rounded-xl border border-slate-100">
                <Sparkles className="w-4 h-4 text-[#006c49]" />
                <span className="text-[10px] font-bold text-slate-600 leading-tight">Tươi 100%</span>
              </div>
            </div>

            {/* Dispatch Live Sparkline / Route Confidence */}
            <div className="bg-[#ebf6f1] rounded-2xl p-4 flex items-center gap-3 border border-emerald-100">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#006c49] shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#006c49] uppercase">Nhiệt Độ Chuỗi Lạnh</span>
                  <span className="text-xs font-bold text-slate-800">4.0°C Ổn Định</span>
                </div>
                {/* Clean inline SVG sparkline */}
                <svg className="w-full h-5 text-[#006c49] mt-1" fill="none" preserveAspectRatio="none" viewBox="0 0 200 24">
                  <path d="M0,18 Q30,12 60,16 T120,10 T180,14 L200,12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                  <circle className="animate-pulse" cx="200" cy="12" fill="currentColor" r="3.5" />
                </svg>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};
