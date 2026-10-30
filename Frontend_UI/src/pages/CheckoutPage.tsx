import { useAuthStore } from '../stores/useAuthStore';
import { CheckoutForm } from '../components/CheckoutForm';

/**
 * CheckoutPage – Trang thanh toán Precision Harvest Checkout.
 * Nền chuẩn botanical luxury (#f1fcf7), giao diện 2 cột liền mạch.
 */
export default function CheckoutPage() {
  const userId = useAuthStore(state => state.user?.id);
  return (
    <main className="w-full bg-[#f1fcf7] min-h-screen py-6 md:py-10 antialiased font-hanken">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CheckoutForm key={userId ?? "guest"} />
      </div>
    </main>
  );
}
