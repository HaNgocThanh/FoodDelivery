import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShoppingBag } from 'lucide-react';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore, normalizeTier, type MembershipTier } from '../stores/useAuthStore';
import axiosClient from '../api/axiosClient';
import type { UserProfile } from '../pages/ProfilePage';
import { ProductPhoto } from './catalog/ProductCard';
import { formatCurrency } from '../utils/formatCurrency';
import { forgetCheckoutOrder } from '../utils/checkoutAttempt';
import './CheckoutForm.css';

interface ValidateResponse {
  id: number; code: string; discountType: number | string; discountValue: number;
  maxDiscountAmount?: number | null; minOrderAmount: number; isValid: boolean; message: string;
}
const TIERS: Record<MembershipTier, { percent: number; label: string }> = {
  Platinum: { percent: .20, label: 'Bạch kim' }, Gold: { percent: .10, label: 'Vàng' },
  Silver: { percent: .10, label: 'Bạc' }, Standard: { percent: 0, label: 'Tiêu chuẩn' },
};
const SLOTS = [
  { id: 'slot-a', label: '11:00 – 12:00 ngày đặt hàng' },
  { id: 'slot-b', label: '16:30 – 17:30 ngày đặt hàng' },
  { id: 'slot-c', label: '07:30 – 08:30 ngày kế tiếp' },
];

function checkoutMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : '';
  return /localhost|back-end|server api|network|timeout/i.test(message)
    ? 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.' : message || fallback;
}

export function CheckoutForm() {
  const methods = useQuery({ queryKey: ['paymentMethods'], queryFn: ({ signal }) =>
    axiosClient.get<{ mockOnline: boolean }, { mockOnline: boolean }>('/api/payments/methods', { signal }) });
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const { items: cartItems, clearCart, getTotalOriginalPrice } = useCartStore();
  const order = useCreateOrder();
  const [recipientName, setRecipientName] = useState(user?.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState([user?.address1, user?.address2].filter(Boolean).join(', '));
  const [gateCode, setGateCode] = useState('');
  const [leaveAtDoorstep, setLeaveAtDoorstep] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('slot-a');
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [submittedMethod, setSubmittedMethod] = useState<number | null>(null);
  const [currentTip, setCurrentTip] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<ValidateResponse | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const submitLock = useRef(false);
  const linkLock = useRef(false);
  const recipientInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (token) axiosClient.get<UserProfile, UserProfile>('/api/users/profile').then(profile => {
      if (cancelled) return;
      updateUser({ fullName: profile.fullName, phoneNumber: profile.phoneNumber, address1: profile.address1,
        address2: profile.address2, loyaltyPoints: profile.loyaltyPoints ?? 0, tier: normalizeTier(profile.tier) });
      setRecipientName(current => current || profile.fullName);
      setRecipientPhone(current => current || profile.phoneNumber);
      setDeliveryAddress(current => current || [profile.address1, profile.address2].filter(Boolean).join(', '));
    }).catch(() => { /* Existing draft remains usable when profile refresh fails. */ });
    return () => { cancelled = true; };
  }, [token, updateUser]);

  const originalTotal = getTotalOriginalPrice();
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const shippingFee = cartItems.length === 0 || originalTotal >= 300000 ? 0 : 25000;
  const toteDeposit = cartItems.length ? 15000 : 0;
  let discountAmount = 0;
  if (appliedPromotion && originalTotal >= appliedPromotion.minOrderAmount) {
    if (appliedPromotion.discountType === 1 || appliedPromotion.discountType === 'Percentage') {
      discountAmount = originalTotal * appliedPromotion.discountValue / 100;
      if (appliedPromotion.maxDiscountAmount && discountAmount > appliedPromotion.maxDiscountAmount)
        discountAmount = appliedPromotion.maxDiscountAmount;
    } else discountAmount = appliedPromotion.discountValue;
  }
  discountAmount = Math.min(originalTotal, Math.round((discountAmount + Number.EPSILON) * 100) / 100);
  const userPointsAvailable = user?.loyaltyPoints ?? 0;
  const tier = TIERS[normalizeTier(user?.tier)];
  const baseForPoints = Math.max(originalTotal - discountAmount, 0);
  const maxPointsByMoney = Math.floor(baseForPoints * tier.percent / 1000);
  const pointsToUse = usePoints ? Math.max(0, Math.min(userPointsAvailable, maxPointsByMoney)) : 0;
  const pointDiscount = pointsToUse * 1000;
  const finalTotal = Math.round((Math.max(0, originalTotal - discountAmount - pointDiscount)
    + shippingFee + toteDeposit + currentTip + Number.EPSILON) * 100) / 100;

  const handleTogglePoints = () => {
    setPointsError(null);
    if (!usePoints) {
      if (!token) return setPointsError('Vui lòng đăng nhập để sử dụng điểm.');
      if (userPointsAvailable <= 0) return setPointsError('Bạn chưa có điểm tích lũy.');
      if (tier.percent <= 0) return setPointsError(`Hạng ${tier.label} chưa hỗ trợ dùng điểm.`);
      if (baseForPoints <= 0) return setPointsError('Tiền hàng sau giảm giá phải lớn hơn 0.');
    }
    setUsePoints(!usePoints);
  };
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || isValidatingCoupon) return;
    setIsValidatingCoupon(true); setCouponError(null);
    try {
      const response = await axiosClient.post<ValidateResponse, ValidateResponse>('/api/promotions/validate', { code: couponCode.trim() });
      if (!response.isValid) { setAppliedPromotion(null); setCouponError(response.message || 'Mã không hợp lệ. Vui lòng kiểm tra lại.'); return; }
      if (originalTotal < response.minOrderAmount) {
        setAppliedPromotion(null); setCouponError(`Đơn hàng cần từ ${formatCurrency(response.minOrderAmount)} để dùng mã này.`); return;
      }
      setAppliedPromotion(response);
    } catch (cause) { setAppliedPromotion(null); setCouponError(checkoutMessage(cause, 'Không áp dụng được mã. Vui lòng thử lại.')); }
    finally { setIsValidatingCoupon(false); }
  };
  const openOnlinePayment = async (orderId: number) => {
    if (linkLock.current) return;
    linkLock.current = true; setLinkPending(true); setLinkError(null);
    try {
      const result = await axiosClient.post<{ payUrl: string }, { payUrl: string }>('/api/payments/mock-url', { orderId });
      if (!result?.payUrl) throw new Error('Missing payment URL');
      window.location.href = result.payUrl;
    } catch (cause) { setLinkError(checkoutMessage(cause, 'Chưa mở được trang thanh toán cho đơn hàng này.')); }
    finally { linkLock.current = false; setLinkPending(false); }
  };
  const handleSubmitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!cartItems.length || submitLock.current || order.isPending || order.isSuccess || isValidatingCoupon) return;
    setValidationError(null); setAddressInvalid(false);
    if (!token || !user) { setValidationError('Vui lòng đăng nhập trước khi đặt hàng.'); return; }
    const phoneValid = /^\+?[0-9][0-9 .()-]{6,19}$/.test(recipientPhone.trim());
    if (!recipientName.trim() || !phoneValid || !deliveryAddress.trim()) {
      setAddressInvalid(true); setValidationError('Nhập họ tên, số điện thoại hợp lệ và địa chỉ nhận hàng.');
      (!recipientName.trim() ? recipientInput.current : !phoneValid ? phoneInput.current : addressInput.current)?.focus(); return;
    }
    if (paymentMethod === 2 && !methods.data?.mockOnline) { setValidationError('Phương thức online hiện không khả dụng. Vui lòng chọn thanh toán khi nhận hàng.'); return; }
    submitLock.current = true; setSubmittedMethod(paymentMethod);
    order.mutate({ userId: user.id, recipientName: recipientName.trim(), recipientPhone: recipientPhone.trim(),
      deliveryAddress: deliveryAddress.trim(), deliverySlot: selectedSlot, deliveryNotes: gateCode.trim(), leaveAtDoorstep,
      tipAmount: currentTip, expectedTotalAmount: finalTotal, paymentMethod, couponCode: appliedPromotion?.code ?? null,
      usePoints, userPointsAvailable, items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })) }, {
      onSuccess: async data => {
        const auth = useAuthStore.getState();
        if (auth.user?.id !== user.id || auth.token !== token) return;
        if (data.status === 'Cancelled' || data.status === 5) return;
        if (paymentMethod === 2 && !data.onlinePaymentConfirmedAt) {
          if (data.paymentExpiresAt && Date.parse(data.paymentExpiresAt) <= Date.now()) {
            setLinkError('Đã hết thời gian thanh toán. Hãy kiểm tra trạng thái trong Đơn hàng của tôi.');
            return;
          }
          await openOnlinePayment(data.id);
        } else {
          if (useCartStore.getState().items === cartItems) clearCart();
          forgetCheckoutOrder(user.id, data.id);
        }
      },
      onError: () => { submitLock.current = false; },
    });
  };

  const cancelledOrder = order.data?.status === 'Cancelled' || order.data?.status === 5;
  const confirmedPayment = !!order.data?.onlinePaymentConfirmedAt;
  const paymentExpired = !!order.data?.paymentExpiresAt && Date.parse(order.data.paymentExpiresAt) <= Date.now();
  if (order.isSuccess && order.data) return <div className="checkout-page checkout-outcome">
    <CheckCircle2 size={40} aria-hidden="true" /><h1>{cancelledOrder ? 'Đơn hàng đã hủy' : confirmedPayment ? 'Thanh toán đã xác nhận' : submittedMethod === 1 ? 'Đặt hàng thành công' : 'Đơn hàng đã được tạo'}</h1>
    <p role="status">{cancelledOrder ? 'Bạn có thể quay lại giỏ để đặt đơn mới.' : confirmedPayment ? 'Xem trạng thái giao hàng trong Đơn hàng của tôi.' : submittedMethod === 1 ? 'Thanh toán khi nhận hàng.' : paymentExpired ? 'Đơn đã hết thời gian thanh toán.' : 'Tiếp tục thanh toán trực tuyến thử nghiệm cho đơn này.'}</p>
    <dl><div><dt>Mã đơn hàng</dt><dd>#{order.data.id}</dd></div><div><dt>Thời gian tạo</dt><dd>{new Date(order.data.orderDate).toLocaleString('vi-VN')}</dd></div>
      <div><dt>Người nhận</dt><dd>{recipientName} · {recipientPhone}</dd></div><div><dt>Địa chỉ</dt><dd>{deliveryAddress}</dd></div>
      <div className="checkout-total"><dt>Tổng thanh toán</dt><dd>{formatCurrency(order.data.totalAmount)}</dd></div></dl>
    {submittedMethod === 2 && !cancelledOrder && !confirmedPayment && !paymentExpired && <><p role={linkError ? 'alert' : 'status'}>{linkError || (linkPending ? 'Đang mở trang thanh toán…' : 'Đơn hàng đang chờ thanh toán.')}</p>
      <button type="button" className="checkout-primary" disabled={linkPending} onClick={() => void openOnlinePayment(order.data.id)}>{linkPending ? 'Đang kết nối…' : 'Tiếp tục thanh toán thử nghiệm'}</button></>}
    {cancelledOrder && user && <button type="button" className="checkout-primary" onClick={() => {
      if (!order.data) return;
      forgetCheckoutOrder(user.id, order.data.id);
      submitLock.current = false;
      order.reset();
    }}>Đặt lại từ giỏ</button>}
    <div className="checkout-outcome-actions"><Link to="/my-orders" className={submittedMethod === 1 ? 'checkout-primary' : 'checkout-secondary'}>Xem đơn hàng</Link><Link to="/products" className="checkout-secondary">Tiếp tục mua sắm</Link></div>
  </div>;

  if (!cartItems.length) return <div className="checkout-page"><Link to="/cart" className="checkout-back"><ArrowLeft size={17} /> Giỏ hàng</Link><h1>Thanh toán</h1><section className="checkout-empty"><ShoppingBag size={36} aria-hidden="true" /><h2>Giỏ hàng đang trống</h2><p>Chọn sản phẩm để tiếp tục đặt hàng.</p><Link to="/products" className="checkout-primary">Chọn sản phẩm <ArrowRight size={18} /></Link></section></div>;

  return <div className="checkout-page">
    <Link to="/cart" className="checkout-back"><ArrowLeft size={17} /> Giỏ hàng</Link><h1>Thanh toán</h1>
    {!token && <p className="checkout-login"><Link to="/login">Đăng nhập</Link> để đặt hàng và sử dụng điểm tích lũy.</p>}
    <form onSubmit={handleSubmitOrder} noValidate className="checkout-layout" aria-busy={order.isPending}>
      <fieldset disabled={order.isPending} className="checkout-fields"><legend className="sr-only">Thông tin đặt hàng</legend>
        <section className="checkout-section" aria-labelledby="recipient-title"><h2 id="recipient-title">Người nhận</h2>{addressInvalid && validationError && <p id="checkout-error" className="checkout-error" role="alert">{validationError}</p>}
          <div className="checkout-recipient-grid">
            <label>Họ tên<input ref={recipientInput} name="recipientName" autoComplete="shipping name" required maxLength={150} value={recipientName} onChange={e => setRecipientName(e.target.value)} aria-invalid={addressInvalid && !recipientName.trim()} aria-describedby={addressInvalid ? 'checkout-error' : undefined} /></label>
            <label>Số điện thoại<input ref={phoneInput} type="tel" name="recipientPhone" autoComplete="shipping tel" required maxLength={20} value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} aria-invalid={addressInvalid && !/^\+?[0-9][0-9 .()-]{6,19}$/.test(recipientPhone.trim())} aria-describedby={addressInvalid ? 'checkout-error' : undefined} /></label>
            <label className="checkout-wide">Địa chỉ nhận hàng<textarea ref={addressInput} name="deliveryAddress" autoComplete="shipping street-address" required rows={2} maxLength={1000} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} aria-invalid={addressInvalid && !deliveryAddress.trim()} aria-describedby={addressInvalid ? 'checkout-error' : undefined} /></label>
            <label className="checkout-wide">Ghi chú giao hàng <span>(không bắt buộc)</span><input name="deliveryNotes" maxLength={500} value={gateCode} onChange={e => setGateCode(e.target.value)} placeholder="Ví dụ: gọi trước khi giao, mã vào cổng" /></label>
          </div>
          <label className="checkout-checkbox"><input type="checkbox" checked={leaveAtDoorstep} onChange={e => setLeaveAtDoorstep(e.target.checked)} /> Để hàng trước cửa</label>
        </section>
        <fieldset className="checkout-section checkout-options"><legend>Giờ giao hàng</legend>{SLOTS.map(slot => <label key={slot.id} className={selectedSlot === slot.id ? 'is-selected' : ''}><input type="radio" name="deliverySlot" value={slot.id} checked={selectedSlot === slot.id} onChange={() => setSelectedSlot(slot.id)} /><span>{slot.label}</span></label>)}</fieldset>
        <section className="checkout-section" aria-labelledby="benefits-title"><h2 id="benefits-title">Mã giảm giá và điểm</h2>
          <label className="checkout-coupon-label" htmlFor="checkout-coupon">Mã giảm giá</label><div className="checkout-coupon"><input id="checkout-coupon" disabled={isValidatingCoupon} value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Nhập mã của bạn" aria-invalid={!!couponError} aria-describedby={couponError ? 'coupon-error' : undefined} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleApplyCoupon(); } }} /><button type="button" className="checkout-secondary" onClick={() => void handleApplyCoupon()} disabled={isValidatingCoupon || !couponCode.trim()}>{isValidatingCoupon ? 'Đang kiểm tra…' : 'Áp dụng'}</button></div>
          {couponError && <p id="coupon-error" role="alert" className="checkout-error">{couponError}</p>}
          {appliedPromotion && <div className="checkout-applied" role="status"><span>Đã áp dụng: <strong>{appliedPromotion.code}</strong>{originalTotal < appliedPromotion.minOrderAmount && ' — chưa đủ giá trị đơn tối thiểu'}</span><button type="button" onClick={() => { setAppliedPromotion(null); setCouponError(null); }}>Bỏ mã</button></div>}
          <div className="checkout-points"><div><h3>Điểm tích lũy</h3><p>{token ? `${userPointsAvailable} điểm · Hạng ${tier.label}` : 'Đăng nhập để sử dụng điểm.'}</p>{token && <p>Tối đa {formatCurrency(maxPointsByMoney * 1000)} cho đơn này.</p>}</div><button type="button" className="checkout-secondary" aria-pressed={usePoints} onClick={handleTogglePoints}>{usePoints ? 'Hủy dùng điểm' : 'Dùng điểm'}</button></div>
          {pointsError && <p className="checkout-error" role="alert">{pointsError}</p>}
        </section>
        <fieldset className="checkout-section checkout-options"><legend>Phương thức thanh toán</legend><label className={paymentMethod === 1 ? 'is-selected' : ''}><input type="radio" name="paymentMethod" checked={paymentMethod === 1} onChange={() => setPaymentMethod(1)} /><span>Thanh toán khi nhận hàng (COD)</span></label>
          {methods.data?.mockOnline && <label className={paymentMethod === 2 ? 'is-selected' : ''}><input type="radio" name="paymentMethod" checked={paymentMethod === 2} onChange={() => setPaymentMethod(2)} /><span>Online thử nghiệm<small>Mô phỏng, không trừ tiền ngân hàng.</small></span></label>}
          {methods.isPending && <p className="checkout-hint" role="status">Đang tải phương thức online…</p>}
          {methods.isError && <p className="checkout-error" role="alert">Chưa tải được phương thức online. <button type="button" onClick={() => void methods.refetch()}>Thử lại</button></p>}
        </fieldset>
        <fieldset className="checkout-section checkout-tips"><legend>Tip giao hàng <span>(tùy chọn)</span></legend><div>{[0,10000,20000,30000,50000].map(amount => <label key={amount} className={currentTip === amount ? 'is-selected' : ''}><input className="sr-only" type="radio" name="tipAmount" checked={currentTip === amount} onChange={() => setCurrentTip(amount)} /><span>{amount === 0 ? 'Không tip' : formatCurrency(amount)}</span></label>)}</div></fieldset>
      </fieldset>
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title"><div className="checkout-summary-heading"><h2 id="checkout-summary-title">Đơn hàng của bạn</h2><span>{totalItemsCount} sản phẩm</span></div>
        <ul className="checkout-items">{cartItems.map(item => <li key={item.id}><div className="checkout-photo"><ProductPhoto product={item} /></div><div><h3>{item.name}</h3><p>{item.quantity} × {formatCurrency(item.price)}</p></div><strong>{formatCurrency(item.price * item.quantity)}</strong></li>)}</ul>
        <dl><div><dt>Tạm tính</dt><dd>{formatCurrency(originalTotal)}</dd></div><div><dt>Phí giao hàng</dt><dd>{shippingFee ? formatCurrency(shippingFee) : 'Miễn phí'}</dd></div><div><dt>Cọc khay giữ nhiệt</dt><dd>{formatCurrency(toteDeposit)}</dd></div>{currentTip > 0 && <div><dt>Tip giao hàng</dt><dd>{formatCurrency(currentTip)}</dd></div>}{discountAmount > 0 && <div className="checkout-discount"><dt>Mã giảm giá</dt><dd>−{formatCurrency(discountAmount)}</dd></div>}{pointDiscount > 0 && <div className="checkout-discount"><dt>Điểm ({pointsToUse} điểm)</dt><dd>−{formatCurrency(pointDiscount)}</dd></div>}<div className="checkout-total"><dt>Tổng thanh toán</dt><dd>{formatCurrency(finalTotal)}</dd></div></dl>
        {!addressInvalid && validationError && <p id="checkout-error" className="checkout-error" role="alert">{validationError}</p>}
        {order.isError && <div className="checkout-error" role="alert"><strong>Chưa đặt được hàng.</strong><p>{checkoutMessage(order.error, 'Vui lòng thử lại sau.')}</p><p>Thông tin đã nhập vẫn được giữ. Kiểm tra lại rồi thử đặt hàng.</p></div>}
        <button type="submit" className="checkout-primary" disabled={order.isPending || isValidatingCoupon}>{order.isPending ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Đang đặt hàng…</> : <>Đặt hàng <ArrowRight size={18} /></>}</button>
        <p className="checkout-hint">Giá và tồn kho được kiểm tra lại khi đặt hàng.</p>
      </aside>
    </form>
  </div>;
}
