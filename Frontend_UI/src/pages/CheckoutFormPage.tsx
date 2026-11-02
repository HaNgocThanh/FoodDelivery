import { useAuthStore } from '../stores/useAuthStore';
import { CheckoutForm } from '../components/CheckoutForm';

export function CheckoutFormPage() {
  const userId = useAuthStore(state => state.user?.id);
  return <CheckoutForm key={userId ?? 'guest'} />;
}
