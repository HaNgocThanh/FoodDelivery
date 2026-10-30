import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/stores/useCartStore';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Lock,
  Clock,
  Leaf,
  ShieldCheck,
  ChevronRight,
  CreditCard,
  Info,
  Recycle,
  Zap,
  Sprout,
  Calendar,
} from 'lucide-react';
import { CartAddons } from '../components/CartAddons';

const FREE_SHIPPING_THRESHOLD = 300000; // 300.000 đ để được freeship

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, getTotalOriginalPrice } =
    useCartStore();

  const [deliverySlot, setDeliverySlot] = useState('Hôm nay • 10:30 AM – 11:30 AM');
  const [isChangingSlot, setIsChangingSlot] = useState(false);

  const subtotal = getTotalOriginalPrice();
  const totalItemsCount = items.reduce((acc, cur) => acc + cur.quantity, 0);

  // Tiền đặt cọc khay sinh thái tuần hoàn (hoàn tiền khi trả túi)
  const insulatedBoxDeposit = items.length > 0 ? 15000 : 0;

  // Phí vận chuyển xe điện
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = items.length === 0 ? 0 : isFreeShipping ? 0 : 25000;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Tổng cộng (mã giảm giá sẽ được áp dụng ở bước Checkout tiếp theo)
  const finalTotal = Math.max(
    0,
    subtotal + insulatedBoxDeposit + shippingFee
  );

  // Fallback image helper
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

  // ────────────────────────── EMPTY STATE ──────────────────────────
  if (items.length === 0) {
    return (
      <div className="w-full min-h-[75vh] bg-[#f1fcf7] py-16 px-4 flex items-center justify-center font-hanken">
        <div className="bg-white rounded-3xl p-10 sm:p-14 max-w-xl w-full text-center shadow-sm border border-emerald-100 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center mb-6 shadow-sm">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase font-extrabold text-[#006c49] tracking-widest bg-emerald-100 px-3.5 py-1 rounded-full mb-3">
            Giỏ Hàng Nông Sản
          </span>
          <h1 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            Giỏ Hàng Của Bạn Đang Trống
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mb-8">
            Hãy khám phá các mẻ nông sản tươi sớm hái lúc bình minh hôm nay để thêm vào giỏ hàng của bạn.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#ff7d45] hover:bg-[#e8590c] text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sprout className="w-4 h-4" />
            <span>Khám Phá Nông Sản Hôm Nay</span>
          </Link>
        </div>
      </div>
    );
  }

  // ────────────────────────── MAIN CART VIEW ──────────────────────────
  return (
    <div className="w-full bg-[#f1fcf7] text-[#141e1b] font-hanken py-8 md:py-12 antialiased">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Status Ticker Snippet */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm">
            <Link to="/" className="hover:text-[#006c49] transition-colors">
              Trang Chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-semibold">Giỏ Hàng Nông Sản Thu Hoạch</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-emerald-100/80 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="uppercase text-[#006c49] font-bold tracking-wider text-[11px]">
              Giám Sát Chuỗi Lạnh • Xuất Bến Sau 38 Phút
            </span>
          </div>
        </div>

        {/* Main Cart Grid (12 Columns: Left 7, Right 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT COLUMN: 7 Cols ================= */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            {/* Basket Banner & Free Shipping Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#006c49] font-extrabold bg-emerald-100/70 px-3 py-0.5 rounded-full">
                    Phiên Thu Hoạch Bình Minh
                  </span>
                  <h1 className="font-syne text-2xl sm:text-3xl font-extrabold text-[#141e1b] tracking-tight mt-2">
                    Giỏ Nông Sản Ban Mai Của Bạn
                  </h1>
                </div>
                <span className="text-xs font-bold bg-[#b4efd6] text-[#15503e] px-3.5 py-1 rounded-full">
                  {totalItemsCount} Sản Phẩm Khóa Kho
                </span>
              </div>

              {/* Free Shipping Progress Calculation */}
              <div className="flex flex-col gap-2 bg-[#ebf6f1] p-4 rounded-2xl border border-emerald-100/60">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-medium flex items-center gap-1.5 text-slate-800">
                    <Zap className="w-4 h-4 text-[#006c49]" />
                    {isFreeShipping ? (
                      <span className="font-bold text-[#006c49]">
                        Tuyệt vời! Đơn hàng được Miễn Phí Giao Hàng Xe Điện Express
                      </span>
                    ) : (
                      <span>
                        Thêm <strong className="text-[#006c49]">{remainingForFreeShipping.toLocaleString('vi-VN')} đ</strong> nữa để được <strong className="text-[#006c49]">Freeship Xe Điện Express!</strong>
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {subtotal.toLocaleString('vi-VN')} đ / {FREE_SHIPPING_THRESHOLD.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-emerald-100">
                  <div
                    className="h-full bg-[#10b981] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Selected Delivery Window Card */}
            <div className="bg-[#ebf6f1] p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#006c49] shrink-0 shadow-sm border border-emerald-100">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#306855]">
                    <span>Khung Giờ Cam Kết</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-500 font-medium">Tuyến Xe Điện Lạnh #04</span>
                  </div>
                  <span className="font-syne text-lg font-bold text-slate-900 mt-0.5">
                    {deliverySlot}
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Giao tận tay • Thùng giữ nhiệt kiểm soát nhiệt độ tĩnh 4°C
                  </p>
                </div>
              </div>

              <div className="relative self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChangingSlot(!isChangingSlot)}
                  className="bg-white hover:bg-slate-50 text-[#006c49] text-xs font-bold px-4 py-2 rounded-full shadow-sm border border-emerald-200 transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Đổi khung giờ</span>
                </button>

                {isChangingSlot && (
                  <div className="absolute right-0 top-11 z-20 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 w-64 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2">
                      Chọn ca giao sớm:
                    </span>
                    {[
                      'Hôm nay • 10:30 AM – 11:30 AM',
                      'Hôm nay • 02:00 PM – 03:00 PM',
                      'Hôm nay • 05:00 PM – 06:00 PM',
                      'Sáng mai • 07:30 AM – 08:30 AM (Thu hoạch mới)',
                    ].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setDeliverySlot(slot);
                          setIsChangingSlot(false);
                        }}
                        className={`w-full text-left text-xs px-3 py-2 rounded-xl transition-colors ${
                          deliverySlot === slot
                            ? 'bg-emerald-100 text-[#006c49] font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Basket Items List */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                  Nông Sản Đã Khóa Tồn Kho ({items.length} mặt hàng)
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Khối lượng tính theo thu hoạch sáng nay
                </span>
              </div>

              {/* Items Iteration */}
              <div className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#f8fafc] hover:bg-[#ebf6f1]/60 transition-colors border border-slate-100"
                  >
                    {/* Image & Title */}
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={getItemImage(item)}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 shadow-sm border border-white"
                      />
                      <div className="flex flex-col min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-[#b4efd6] text-[#15503e] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Hữu cơ VietGAP
                          </span>
                          {item.origin && (
                            <span className="text-[11px] text-slate-500 font-medium truncate">
                              {item.origin}
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/products/${item.id}`}
                          className="font-syne font-bold text-slate-900 text-base truncate hover:text-[#006c49] transition-colors"
                        >
                          {item.name}
                        </Link>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Đơn giá:{' '}
                          <strong className="text-[#006c49]">
                            {item.price?.toLocaleString('vi-VN')} đ
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Stepper + Subtotal + Remove */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      {/* Stepper */}
                      <div className="flex items-center bg-white rounded-full px-2 py-1 shadow-sm border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Giảm số lượng"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-sm px-3 text-slate-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                          aria-label="Tăng số lượng"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Item Price */}
                      <div className="flex flex-col text-right min-w-[90px]">
                        <span className="font-syne font-extrabold text-base text-slate-900">
                          {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      {/* Trash Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Xoá ${item.name}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xoá món này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 text-[#006c49] hover:underline font-bold"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Tiếp tục chọn thêm nông sản</span>
                </Link>
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa sạch giỏ hàng</span>
                </button>
              </div>
            </div>

            <section aria-label="Đóng gói đơn hàng" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Khay giữ nhiệt tuần hoàn</h3>
              <p className="text-sm text-slate-600">Tiền cọc khay giữ nhiệt: 15.000 đ cho mỗi đơn hàng.</p>
              <p className="text-xs text-slate-500">Khung giờ và thông tin nhận hàng được xác nhận ở bước thanh toán.</p>
            </section>

            <CartAddons />
          </section>

          {/* ================= RIGHT COLUMN: 5 Cols (Sticky) ================= */}
          <aside className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-28">
            {/* Order Provision Summary Card */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-md border border-emerald-100 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="font-syne text-xl font-extrabold text-slate-900">
                  Tóm Tắt Cung Ứng Đơn Hàng
                </h2>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  MÃ EST-9042
                </span>
              </div>

              {/* Breakdown Rows */}
              <div className="flex flex-col gap-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tạm tính nông sản ({totalItemsCount} món)</span>
                  <span className="font-bold text-slate-900">
                    {subtotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>


                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>Đặt cọc khay giữ nhiệt tuần hoàn</span>
                    <span title="Hoàn lại 100% vào tài khoản hoặc thẻ khi hoàn trả khay" className="inline-flex cursor-help">
                      <Recycle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {insulatedBoxDeposit > 0 ? `${insulatedBoxDeposit.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Giao hàng Eco-Courier (Xe điện)</span>
                  <span className="font-bold text-slate-900">
                    {shippingFee === 0 ? (
                      <span className="text-[#006c49]">Miễn phí</span>
                    ) : (
                      `${shippingFee.toLocaleString('vi-VN')} đ`
                    )}
                  </span>
                </div>

                {/* Lưu ý mã giảm giá */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-slate-500 text-xs">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Mã giảm giá & điểm tích lũy sẽ được áp dụng tại bước thanh toán.</span>
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div className="bg-[#ebf6f1] p-4 rounded-2xl flex items-baseline justify-between mt-1 border border-emerald-100">
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-slate-600 font-extrabold tracking-wider">
                    Tổng Thanh Toán Ước Tính
                  </span>
                  <span className="text-[11px] text-slate-500">Đã bao gồm thuế & kiểm định</span>
                </div>
                <div className="text-right">
                  <span className="font-syne text-2xl sm:text-3xl font-black text-[#006c49] tracking-tight">
                    {finalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Primary CTA Button (Tangerine Amber) */}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#ff7d45] hover:bg-[#e8590c] text-white py-4 px-6 rounded-full font-syne text-base font-bold shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Tiến Hành Giao Hàng & Thanh Toán</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Express Fast-Pay Options */}
              <div className="flex flex-col gap-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                    Hoặc Thanh Toán Nhanh 1 Chạm
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="bg-slate-900 hover:bg-black text-white py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="font-syne font-black text-sm">ƒ</span> Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="bg-[#ebf6f1] hover:bg-emerald-100 text-slate-800 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#006c49]" /> Thẻ 1-Chạm
                  </button>
                </div>
              </div>

              {/* 100% Freshness Guarantee Badge */}
              <div className="flex items-start gap-3 p-3.5 bg-[#f8fafc] rounded-2xl border border-slate-100 mt-1">
                <ShieldCheck className="w-5 h-5 text-[#006c49] shrink-0 mt-0.5" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900">
                    Bảo Chứng 100% Độ Tươi Giòn Buổi Sáng
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Nếu bất kỳ nông sản nào dập nát hoặc không đạt độ tươi ngon, bạn nhận hoàn tiền trong 30 giây mà không cần trả lại hàng.
                  </p>
                </div>
              </div>
            </div>

            {/* Traceability & Agronomy Metric Micro-Widget */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#b4efd6] flex items-center justify-center text-[#006c49]">
                  <Leaf className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] uppercase text-slate-400 font-extrabold">
                    Giảm Phát Thải Carbon
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    0.42 kg CO2e (Thấp hơn 74% so với siêu thị)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-[#ebf6f1] text-[#006c49] px-2.5 py-1 rounded-full border border-emerald-200">
                Đã Xác Thực
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
