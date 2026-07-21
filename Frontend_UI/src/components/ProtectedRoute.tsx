import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  requiredRole?: 'Admin' | 'Customer' | 'Shipper';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    // Chưa đăng nhập -> Chuyển hướng sang trang Login
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    // Không đủ quyền Admin -> Redirect về trang chủ
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
