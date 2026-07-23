import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CheckoutFormPage } from '@/pages/CheckoutFormPage';

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
const PaymentResultPage        = lazy(() => import('@/pages/PaymentResultPage'));
const ForgotPasswordPage       = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage        = lazy(() => import('@/pages/ResetPasswordPage'));
const AdminDashboard           = lazy(() => import('@/pages/admin/DashboardPage'));
const OrderManagementPage       = lazy(() => import('@/pages/OrderManagementPage'));
const ProductManagementPage     = lazy(() => import('@/pages/ProductManagementPage'));
const PromotionManagementPage   = lazy(() => import('@/pages/PromotionManagementPage'));
const UserManagementPage        = lazy(() => import('@/pages/UserManagementPage'));
const AdminSupportPage          = lazy(() => import('@/pages/AdminSupportPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--color-primary)',
            borderRightColor: 'var(--color-primary)',
          }}
        />
        <p className="text-slate-500 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

// Helper: bọc các page public trong PublicLayout (Header + Footer).
// Tuân thủ ui-design-system: page body màu bg-slate-50 (light mode).
function publicPage(element: React.ReactNode) {
  return <PublicLayout>{element}</PublicLayout>;
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
          {/* Public routes – wrap trong PublicLayout (Header + Footer) */}
          <Route path="/"                  element={publicPage(<HomePage />)} />
          <Route path="/products"          element={publicPage(<ProductListPage />)} />
          <Route path="/products/:slug"    element={publicPage(<ProductDetailPage />)} />
          <Route path="/cart"              element={publicPage(<CartPage />)} />
          <Route path="/checkout"          element={publicPage(<CheckoutPage />)} />
          <Route path="/checkout-form"     element={publicPage(<CheckoutFormPage />)} />
          <Route path="/login"             element={publicPage(<LoginPage />)} />
          <Route path="/register"          element={publicPage(<RegisterPage />)} />
          <Route path="/search"            element={publicPage(<SearchPage />)} />
          <Route path="/payment-result"    element={publicPage(<PaymentResultPage />)} />
          <Route path="/forgot-password"   element={publicPage(<ForgotPasswordPage />)} />
          <Route path="/reset-password"    element={publicPage(<ResetPasswordPage />)} />

          {/* Protected routes cho Khách hàng – wrap trong PublicLayout & ProtectedRoute */}
          <Route path="/account/profile"   element={publicPage(<ProtectedRoute><ProfilePage /></ProtectedRoute>)} />
          <Route path="/account/orders"    element={publicPage(<ProtectedRoute><OrdersPage /></ProtectedRoute>)} />
          <Route path="/my-orders"         element={publicPage(<ProtectedRoute><OrdersPage /></ProtectedRoute>)} />

          {/* BẢO VỆ TẤT CẢ ROUTE ADMIN NGUYÊN TẮC (ROLES = ADMIN) */}
          <Route element={<ProtectedRoute requiredRole="Admin" />}>
            <Route path="/admin/dashboard"   element={<AdminDashboard />} />
            <Route path="/admin/orders"      element={<OrderManagementPage />} />
            <Route path="/admin/products"    element={<ProductManagementPage />} />
            <Route path="/admin/promotions"  element={<PromotionManagementPage />} />
            <Route path="/admin/users"       element={<UserManagementPage />} />
            <Route path="/admin/support"     element={<AdminSupportPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
