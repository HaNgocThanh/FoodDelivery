import axios, { type AxiosError } from 'axios';

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

// Request Interceptor: Gắn Bearer token nếu có
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Bóc tách lỗi từ ProblemDetails của Back-end (HTTP 400, 404, 500)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ProblemDetails>) => {
    if (error.response && error.response.data) {
      const problem = error.response.data;
      // Lấy detail từ ProblemDetails (đặc biệt mã 400 Bad Request từ GlobalExceptionMiddleware)
      const errorMessage = problem.detail || problem.title || 'Đã xảy ra lỗi xử lý đơn hàng.';
      return Promise.reject(new Error(errorMessage));
    }
    return Promise.reject(
      new Error(error.message?.includes('timeout')
        ? 'Quá thời gian kết nối server. Vui lòng thử lại.'
        : 'Không thể kết nối đến máy chủ Back-end.')
    );
  }
);

export default axiosClient;
