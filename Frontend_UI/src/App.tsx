import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Direct import cho HomePage, LoginPage, RegisterPage để hiển thị mượt mà
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Lazy load các trang khác
const ProductListPage          = lazy(() => import('@/pages/ProductListPage'));
const ProductDetailPage        = lazy(() => import('@/pages/ProductDetailPage'));
const CartPage                 = lazy(() => import('@/pages/CartPage'));
const CheckoutPage             = lazy(() => import('@/pages/CheckoutPage'));
const ProfilePage              = lazy(() => import('@/pages/ProfilePage'));
const OrdersPage               = lazy(() => import('@/pages/OrdersPage'));
const SearchPage               = lazy(() => import('@/pages/SearchPage'));
const AdminDashboard           = lazy(() => import('@/pages/admin/DashboardPage'));
const OrderManagementPage       = lazy(() => import('@/pages/OrderManagementPage'));
const ProductManagementPage     = lazy(() => import('@/pages/ProductManagementPage'));
const PromotionManagementPage   = lazy(() => import('@/pages/PromotionManagementPage'));
const UserManagementPage        = lazy(() => import('@/pages/UserManagementPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--color-primary)',
            borderRightColor: 'var(--color-primary)',
          }}
        />
        <p className="text-slate-400 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* Default SEO meta tags */}
      <Helmet>
        <title>FoodDelivery – Đặt hàng thực phẩm tươi sạch</title>
        <meta
          name="description"
          content="Mua thực phẩm tươi sạch, giao hàng nhanh tận nhà. Hàng ngàn sản phẩm chất lượng cao với giá tốt nhất."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:site_name" content="FoodDelivery" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"                  element={<HomePage />} />
          <Route path="/products"          element={<ProductListPage />} />
          <Route path="/products/:slug"    element={<ProductDetailPage />} />
          <Route path="/cart"              element={<CartPage />} />
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/register"          element={<RegisterPage />} />
          <Route path="/search"            element={<SearchPage />} />

          {/* Protected routes cho Khách hàng */}
          <Route path="/checkout"          element={<CheckoutPage />} />
          <Route path="/account/profile"   element={<ProfilePage />} />
          <Route path="/account/orders"    element={<OrdersPage />} />
          <Route path="/my-orders"         element={<OrdersPage />} />

          {/* BẢO VỆ TẤT CẢ ROUTE ADMIN NGUYÊN TẮC (ROLES = ADMIN) */}
          <Route element={<ProtectedRoute requiredRole="Admin" />}>
            <Route path="/admin/dashboard"   element={<AdminDashboard />} />
            <Route path="/admin/orders"      element={<OrderManagementPage />} />
            <Route path="/admin/products"    element={<ProductManagementPage />} />
            <Route path="/admin/promotions"  element={<PromotionManagementPage />} />
            <Route path="/admin/users"       element={<UserManagementPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
