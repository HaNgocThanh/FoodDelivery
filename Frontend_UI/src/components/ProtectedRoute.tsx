import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  requiredRole?: 'Admin' | 'Customer' | 'Shipper';
  /**
   * Optional children. Khi truyền vào, component sẽ render children
   * thay vì <Outlet /> – cho phép dùng cú pháp bọc trực tiếp:
   *
   *   <Route path="/x" element={
   *     <PublicLayout>
   *       <ProtectedRoute>
   *         <ProfilePage />
   *       </ProtectedRoute>
   *     </PublicLayout>
   *   } />
   */
  children?: React.ReactNode;
}

/**
 * ProtectedRoute – Hỗ trợ cả 2 pattern:
 *  1) Bọc route cha (Render <Outlet />):
 *     <Route element={<ProtectedRoute requiredRole="Admin" />}>
 *       <Route path="/admin/x" element={...} />
 *     </Route>
 *
 *  2) Bọc trực tiếp element (Render children):
 *     <Route path="/x" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole,
  children,
}) => {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    // Chưa đăng nhập -> Chuyển hướng sang trang Login
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    // Không đủ quyền -> Redirect về trang chủ
    return <Navigate to="/" replace />;
  }

  // Ưu tiên children (pattern 2), fallback Outlet (pattern 1)
  return children ? <>{children}</> : <Outlet />;
};
