import { CheckoutForm } from '../components/CheckoutForm';
import { ShoppingBag } from 'lucide-react';

/**
 * CheckoutPage – Wrapper cho màn hình Checkout.
 *
 * Áp dụng design system: light mode, container rộng, container h1 cho heading.
 * Phần form/summary đã được render đầy đủ trong <CheckoutForm/>.
 */
export default function CheckoutPage() {
  return (
    <main className="bg-slate-50 min-h-screen py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6">
        <header className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShoppingBag className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Thanh toán đơn hàng
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kiểm tra sản phẩm và hoàn tất đặt hàng
            </p>
          </div>
        </header>

        <CheckoutForm />
      </div>
    </main>
  );
}
