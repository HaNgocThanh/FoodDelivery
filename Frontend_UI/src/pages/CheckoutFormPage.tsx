import { CheckoutForm } from '../components/CheckoutForm';

/**
 * CheckoutFormPage – Page chứa form thanh toán.
 * Tách ra từ HomePage (trước đó form được embed inline).
 * Logic 100% từ CheckoutForm giữ nguyên; layout đơn giản.
 */
export function CheckoutFormPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <CheckoutForm />
    </div>
  );
}
