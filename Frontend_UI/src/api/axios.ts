import axios, { type AxiosError, type AxiosResponse } from 'axios';
import type { ApiError } from '@/types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api', // '/api' → proxied by Vite
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Gắn JWT Bearer Token ───────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Normalize lỗi → ApiError ─────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data, // Auto-unwrap response.data

  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;

    // 401: Token hết hạn / chưa đăng nhập
    if (status === 401) {
      localStorage.removeItem('auth_token');
      // Chỉ redirect nếu không đang ở trang login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login?reason=session_expired');
      }
      return Promise.reject<ApiError>({
        status: 401,
        title: 'Unauthorized',
        detail: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }

    // Normalize ProblemDetails từ ASP.NET Core → ApiError
    const apiError: ApiError = error.response?.data ?? {
      status: status ?? 0,
      title: 'Network Error',
      detail: error.message.includes('timeout')
        ? 'Yêu cầu quá thời gian. Vui lòng kiểm tra kết nối.'
        : 'Không thể kết nối đến server. Vui lòng thử lại.',
    };

    return Promise.reject<ApiError>(apiError);
  },
);

export default apiClient;
