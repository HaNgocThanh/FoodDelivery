import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import axiosClient from '@/api/axiosClient';
import { OrderStatusStepper } from '@/components/track/OrderStatusStepper';
import type { OrderTracking } from '@/types/tracking';
import {
  Search,
  Hash,
  Phone,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Banknote,
  Receipt,
  Home,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ';
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Đang xử lý', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  Shipping: { label: 'Đang giao', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  Completed: { label: 'Hoàn tất', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ orderId?: string; phone?: string }>({});
  const [result, setResult] = useState<OrderTracking | null>(null);
  const [apiError, setApiError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll xuống kết quả khi có data
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!orderId.trim()) {
      errors.orderId = 'Vui lòng nhập Mã đơn hàng.';
    } else if (!/^\d+$/.test(orderId.trim())) {
      errors.orderId = 'Mã đơn hàng chỉ chứa chữ số.';
    }
    if (!phone.trim()) {
      errors.phone = 'Vui lòng nhập Số điện thoại đặt hàng.';
    } else if (phone.trim().length < 9) {
      errors.phone = 'Số điện thoại không hợp lệ.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setResult(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const data = await axiosClient.get('/api/orders/track', {
        params: { orderId: orderId.trim(), phone: phone.trim() },
      }) as unknown as OrderTracking;
      setResult(data);
    } catch (err: any) {
      // axiosClient đã chuyển lỗi response thành Error với message
      // Cố gắng phân biệt 404 với các lỗi khác
      const msg = err?.message ?? '';
      if (msg.includes('Không tìm thấy đơn hàng')) {
        setApiError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại Mã đơn và Số điện thoại.');
      } else {
        setApiError(msg || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setApiError('');
    setFieldErrors({});
  };

  const statusBadge = result ? STATUS_BADGE[result.status] : null;

  return (
    <>
      <Helmet>
        <title>Tra cứu đơn hàng | FoodDelivery</title>
        <meta name="description" content="Tra cứu trạng thái đơn hàng theo Mã đơn và Số điện thoại đặt hàng." />
      </Helmet>

      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-b from-slate-50 to-white py-8 sm:py-12">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Package className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Tra cứu đơn hàng
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Nhập mã đơn hàng và số điện thoại đặt hàng để xem trạng thái vận chuyển.
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Order ID */}
                <div>
                  <label htmlFor="orderId" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Mã đơn hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      id="orderId"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="VD: 1234"
                      value={orderId}
                      onChange={(e) => {
                        setOrderId(e.target.value);
                        if (fieldErrors.orderId) setFieldErrors((p) => ({ ...p, orderId: undefined }));
                        if (apiError) setApiError('');
                      }}
                      className={`w-full rounded-xl border ${
                        fieldErrors.orderId
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      } bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400`}
                    />
                  </div>
                  {fieldErrors.orderId && (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.orderId}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Số điện thoại đặt hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="VD: 0987654321"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                        if (apiError) setApiError('');
                      }}
                      className={`w-full rounded-xl border ${
                        fieldErrors.phone
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      } bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Tra cứu ngay
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Error Block */}
          {apiError && !result && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Không thể tra cứu</p>
                <p className="mt-1 text-sm text-red-700">{apiError}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
                >
                  Thử lại
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div ref={resultRef} className="mt-8 space-y-6">
              {/* General Info Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Kết quả tra cứu
                    </p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">
                      Đơn hàng #{result.id}
                    </h2>
                  </div>
                  {statusBadge && (
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Ngày đặt"
                    value={formatDateTime(result.orderDate)}
                  />
                  <InfoRow
                    icon={<Receipt className="h-4 w-4" />}
                    label="Tổng tiền"
                    value={formatVND(result.totalAmount)}
                    valueClassName="text-emerald-700 font-semibold"
                  />
                  <InfoRow
                    icon={<Banknote className="h-4 w-4" />}
                    label="Phương thức thanh toán"
                    value={result.paymentMethod}
                  />
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Số điện thoại"
                    value={result.customerPhoneMasked}
                  />
                  <InfoRow
                    icon={<Home className="h-4 w-4" />}
                    label="Địa chỉ giao hàng"
                    value={result.shippingAddressMasked}
                    fullWidth
                  />
                </div>

                {result.discountAmount > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-sm">
                    <span className="text-emerald-700">Giảm giá áp dụng</span>
                    <span className="font-semibold text-emerald-700">
                      −{formatVND(result.discountAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
                  <ShoppingBag className="h-4 w-4 text-slate-500" />
                  Sản phẩm trong đơn ({result.items.length})
                </h3>
                <ul className="divide-y divide-slate-100">
                  {result.items.map((item) => (
                    <li key={item.productId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatVND(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 shrink-0">
                        {formatVND(item.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stepper */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-5">
                  Trạng thái đơn hàng
                </h3>
                <OrderStatusStepper currentStatus={result.status} />
              </div>

              {/* Footer actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Search className="h-4 w-4" />
                  Tra cứu đơn khác
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Tiếp tục mua sắm
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  fullWidth?: boolean;
  valueClassName?: string;
}

function InfoRow({ icon, label, value, fullWidth, valueClassName }: InfoRowProps) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-sm text-slate-900 ${valueClassName ?? ''}`}>{value}</p>
    </div>
  );
}
