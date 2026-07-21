/** Định dạng số tiền VND */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style:    'currency',
    currency: 'VND',
  }).format(amount);
}

/** Định dạng ngày giờ tiếng Việt */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

/** Relative time (VD: "2 giờ trước") */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const rtf  = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

  const SECOND = 1_000;
  const MINUTE = 60 * SECOND;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;

  if (diff < MINUTE)  return rtf.format(-Math.round(diff / SECOND), 'second');
  if (diff < HOUR)    return rtf.format(-Math.round(diff / MINUTE), 'minute');
  if (diff < DAY)     return rtf.format(-Math.round(diff / HOUR),   'hour');
  return rtf.format(-Math.round(diff / DAY), 'day');
}

/** Clamp số trong khoảng [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate chuỗi dài */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

/** Lấy lỗi từ ApiError một cách thân thiện */
export function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Đã xảy ra lỗi không xác định';

  const e = error as { status?: number; detail?: string; errors?: Record<string, string[]> };

  if (e.errors) {
    return Object.values(e.errors).flat().join(', ');
  }

  const messages: Record<number, string> = {
    401: 'Vui lòng đăng nhập để tiếp tục',
    403: 'Bạn không có quyền thực hiện thao tác này',
    404: 'Không tìm thấy dữ liệu',
    409: e.detail ?? 'Xung đột dữ liệu. Vui lòng thử lại',
    500: 'Lỗi hệ thống. Vui lòng thử lại sau',
  };

  return messages[e.status ?? 0] ?? e.detail ?? 'Đã xảy ra lỗi';
}

/** Tạo slug từ tên tiếng Việt */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
