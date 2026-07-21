import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5156',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Tự động đính kèm Bearer JWT Token từ Zustand useAuthStore
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Bóc tách lỗi từ ProblemDetails & HTTP Status Codes (401, 403, 400, 500)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ProblemDetails>) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return Promise.reject(new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'));
      }
      if (status === 403) {
        return Promise.reject(new Error('Tài khoản của bạn không có quyền truy cập trang quản trị (Cần quyền Admin).'));
      }

      if (error.response.data) {
        const problem = error.response.data;
        const errorMessage = problem.detail || problem.title || `Lỗi máy chủ (Mã HTTP ${status}).`;
        return Promise.reject(new Error(errorMessage));
      }
    }

    return Promise.reject(
      new Error(error.message?.includes('timeout')
        ? 'Quá thời gian kết nối server. Vui lòng thử lại.'
        : 'Không thể kết nối đến máy chủ Back-end (http://localhost:5156). Vui lòng kiểm tra Server API.')
    );
  }
);

export default axiosClient;
