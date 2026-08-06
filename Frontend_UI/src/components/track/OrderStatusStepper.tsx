import { Package, CheckCircle, Truck, Home } from 'lucide-react';
import type { TrackingStatus } from '@/types/tracking';

interface Step {
  key: TrackingStatus;
  label: string;
  description: string;
  Icon: typeof Package;
}

const STEPS: Step[] = [
  {
    key: 'Pending',
    label: 'Đơn hàng đã đặt',
    description: 'Đơn hàng của bạn đã được ghi nhận trên hệ thống.',
    Icon: Package,
  },
  {
    key: 'Approved',
    label: 'Đang xử lý',
    description: 'Đơn hàng đang được chuẩn bị tại bếp/nhà cung cấp.',
    Icon: CheckCircle,
  },
  {
    key: 'Shipping',
    label: 'Đang giao hàng',
    description: 'Shipper đang vận chuyển đơn hàng đến địa chỉ của bạn.',
    Icon: Truck,
  },
  {
    key: 'Completed',
    label: 'Đã giao thành công',
    description: 'Đơn hàng đã được giao. Cảm ơn bạn đã sử dụng dịch vụ!',
    Icon: Home,
  },
];

interface OrderStatusStepperProps {
  currentStatus: TrackingStatus;
}

export function OrderStatusStepper({ currentStatus }: OrderStatusStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);
  // Cancelled order hiếm gặp trong flow tra cứu (đã bị hủy) → hiển thị ở step Pending
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <ol className="relative">
      {STEPS.map((step, index) => {
        const isPassed = index < safeIndex;
        const isCurrent = index === safeIndex;
        const isLast = index === STEPS.length - 1;

        const dotClass = isPassed
          ? 'bg-emerald-600 text-white ring-emerald-100'
          : isCurrent
          ? 'bg-orange-500 text-white ring-orange-100 animate-pulse'
          : 'bg-slate-200 text-slate-400 ring-slate-100';

        const lineClass = isPassed ? 'bg-emerald-600' : 'bg-slate-200';

        const labelClass = isCurrent
          ? 'text-orange-600 font-semibold'
          : isPassed
          ? 'text-emerald-700 font-medium'
          : 'text-slate-400';

        const descClass = isPassed || isCurrent ? 'text-slate-600' : 'text-slate-400';

        const Icon = step.Icon;

        return (
          <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
            {/* Vertical line connecting dots */}
            {!isLast && (
              <div
                className={`absolute left-[18px] top-9 bottom-0 w-0.5 ${lineClass}`}
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ${dotClass}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <Icon className="h-4 w-4" strokeWidth={2.5} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p className={`text-sm leading-snug ${labelClass}`}>{step.label}</p>
              <p className={`mt-0.5 text-xs leading-relaxed ${descClass}`}>
                {step.description}
              </p>
              {isCurrent && (
                <span className="mt-2 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600 border border-orange-200">
                  Đang ở đây
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
