import { Link } from 'react-router-dom';
import { useCartStore } from '@/stores/useCartStore';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Beef } from 'lucide-react';

/**
 * CartPage — Trang giỏ hàng (peek view).
 *
 * Cho phép user xem lại các sản phẩm đã chọn, chỉnh sửa số lượng / xoá, rồi
 * bấm "Tiến hành thanh toán" để sang trang CheckoutForm.
 *
 * Re-skin theo `ui-design-system`:
 * - Card dùng `rounded-xl bg-white shadow-sm` chuẩn.
 * - Qty stepper: nền `bg-slate-100` liền mạch.
 * - Trash icon màu đỏ góc phải card.
 * - Empty state với icon to + CTA amber.
 *
 * Lưu ý (Rule #6 Logic preservation):
 * - KHÔNG sửa useCartStore hooks / handlers.
 * - KHÔNG tự ý thêm field mới ngoài data có sẵn.
 * - Vì store `CartItem` chưa có `imageUrl`, dùng `Beef` icon làm thumbnail placeholder.
 */
export default function CartPage() {
  const { items, updateQuantity, removeFromCart, getTotalOriginalPrice } = useCartStore();
  const total = getTotalOriginalPrice();

  if (items.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
        <section className="rounded-xl bg-white shadow-sm border border-slate-200 max-w-xl mx-auto p-10 md:p-12 text-center space-y-5">
          <div
            aria-hidden="true"
            className="mx-auto w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100"
          >
            <ShoppingBag className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto">
              Hãy chọn các sản phẩm tươi ngon tại trang chủ để bắt đầu đặt hàng.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-7 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-5 h-5" />
            Tiếp tục mua sắm
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-emerald-600" />
          Giỏ hàng của bạn
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Bạn đang có <span className="font-semibold text-emerald-700">{items.length}</span> sản phẩm trong giỏ.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
        {/* ───────── CỘT TRÁI: DANH SÁCH SẢN PHẨM ───────── */}
        <section
          aria-label="Danh sách sản phẩm trong giỏ"
          className="space-y-3"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="
                relative rounded-xl bg-white border border-slate-200 shadow-sm
                p-4 md:p-5
                flex gap-4 items-center
                transition-shadow hover:shadow-md
              "
            >
              {/* Thumbnail placeholder — store CartItem chưa có imageUrl */}
              <div
                aria-hidden="true"
                className="
                  shrink-0 w-20 h-20 md:w-24 md:h-24
                  rounded-lg bg-emerald-50 border border-emerald-100
                  flex items-center justify-center
                  text-emerald-600
                "
              >
                <Beef className="w-10 h-10" strokeWidth={1.5} />
              </div>

              {/* Thông tin sản phẩm */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-base line-clamp-2">
                  {item.name}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                  <span className="font-bold text-emerald-700">
                    {item.price?.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <span>sản phẩm</span>
                </p>

                {/* Qty stepper — grouped [-][ N ][+] */}
                <div
                  role="group"
                  aria-label={`Số lượng ${item.name}`}
                  className="
                    mt-3 inline-flex items-center
                    rounded-lg border border-slate-200 bg-slate-100
                    overflow-hidden
                  "
                >
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Giảm số lượng"
                    className="
                      w-9 h-9 flex items-center justify-center
                      text-slate-600 hover:bg-white hover:text-emerald-700
                      transition-colors
                      disabled:opacity-40
                    "
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span
                    aria-live="polite"
                    className="
                      w-12 text-center font-bold text-slate-900
                      tabular-nums text-sm select-none
                      border-x border-slate-200 bg-white py-2
                    "
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Tăng số lượng"
                    className="
                      w-9 h-9 flex items-center justify-center
                      text-slate-600 hover:bg-white hover:text-emerald-700
                      transition-colors
                    "
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thành tiền + nút xoá */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-base md:text-lg font-bold text-slate-900 tabular-nums">
                  {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={`Xoá ${item.name} khỏi giỏ`}
                  className="
                    w-9 h-9 rounded-lg
                    flex items-center justify-center
                    text-slate-400 hover:text-red-600 hover:bg-red-50
                    transition-colors
                  "
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </section>

        {/* ───────── CỘT PHẢI: STICKY ORDER SUMMARY ───────── */}
        <aside
          aria-label="Tóm tắt đơn hàng"
          className="lg:sticky lg:top-24"
        >
          <div
            className="
              rounded-xl border border-slate-200 bg-slate-50
              shadow-sm
              p-5 md:p-6
              space-y-4
            "
          >
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Tóm tắt đơn hàng
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tạm tính</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {total.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phí vận chuyển</span>
                <span className="text-slate-500 italic text-xs">
                  Tính ở bước thanh toán
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 font-semibold">Tổng tạm tính</span>
              <span className="text-xl font-extrabold text-amber-600 tabular-nums">
                {total.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <Link
              to="/checkout"
              className="
                w-full inline-flex items-center justify-center gap-2
                rounded-lg bg-amber-500 hover:bg-amber-600
                text-white font-bold
                px-6 py-3.5
                shadow-md hover:shadow-lg
                transition-all duration-200 hover:-translate-y-0.5
              "
            >
              Tiến hành thanh toán
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/"
              className="
                block text-center text-sm text-slate-500 hover:text-emerald-700
                transition-colors
              "
            >
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
