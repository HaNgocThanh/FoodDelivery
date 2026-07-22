import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import { CheckoutForm } from '../components/CheckoutForm';
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Check,
  Flame,
  Globe,
  Sparkles,
  RefreshCw,
  Utensils,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  Search,
  LayoutDashboard,
  Boxes
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProductItem } from './ProductManagementPage';

export interface CategoryItem {
  id: number;
  name: string;
  description?: string;
}

export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  // Cart & Auth store
  const { addToCart, getTotalItemsCount, items: cartItems } = useCartStore();
  const { user, logout, isAdmin } = useAuthStore();
  const totalCartCount = getTotalItemsCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Fetch Categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      return await axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories');
    },
  });

  // Fetch Products (với Query Param categoryId)
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts
  } = useQuery<ProductItem[]>({
    queryKey: ['products', selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId ? `/api/products?categoryId=${selectedCategoryId}` : '/api/products';
      return await axiosClient.get<ProductItem[], ProductItem[]>(url);
    },
  });

  const handleAddToCart = (product: ProductItem) => {
    addToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  // Curated Food Image Mapping
  const getProductImage = (name: string, id: number) => {
    if (name.includes('bò') || name.includes('thịt') || name.includes('Thịt')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('rau') || name.includes('cải') || name.includes('Rau')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('cá') || name.includes('tôm') || name.includes('Hải sản')) {
      return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80';
    }
    return `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&auto=format&fit=crop&q=80&sig=${id}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">

      {/* HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight">Food<span className="text-orange-500">Delivery</span></span>
              <span className="block text-[10px] text-slate-400 tracking-wider uppercase font-bold">Thực phẩm tươi sạch</span>
            </div>
          </Link>

          {/* ADMIN & CLIENT NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-3">

            {/* Admin: single compact panel button */}
            {isAdmin() && (
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-2 px-3.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 rounded-xl text-xs font-bold transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            )}

            {/* SEARCH BAR (all users) */}
            <form onSubmit={handleSearch} className="relative hidden lg:flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm sản phẩm…"
                className="pl-8 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 w-52 transition"
              />
            </form>

            {/* USER LOGIN STATUS BADGE */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <Link
                  to="/my-orders"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                  Đơn hàng của tôi
                </Link>

                <Link
                  to="/account/profile"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-2 text-xs transition group"
                >
                  {isAdmin() ? (
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-bold text-white max-w-[100px] truncate group-hover:text-orange-300">{user.fullName}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded ${isAdmin() ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {user.role}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 border border-slate-800"
                >
                  <LogIn className="w-4 h-4 text-orange-400" />
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 text-xs font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-xl transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </nav>

          {/* GIỎ HÀNG FLOATING BUTTON */}
          <a
            href="#checkout-section"
            className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-orange-500/20 transition font-semibold text-sm group"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition" />
              {totalCartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-orange-600 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span>Giỏ hàng ({totalCartCount})</span>
          </a>
        </div>
      </header>

      {/* HERO BANNER SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 py-12 sm:py-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Giao hàng siêu tốc trong 2 giờ
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Thực Phẩm Tươi Sạch <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Giao Tận Cửa Sổ Nhà Bạn
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg">
              Nguồn gốc rõ ràng, chứng nhận VietGAP, khóa tồn kho thực tế tức thì chống đụng độ đơn hàng.
            </p>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* CATEGORY NAVIGATION / HORIZONTAL TABS */}
        <section className="space-y-4">
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-orange-500" />
              Danh mục Thực phẩm
            </h2>
            <button
              onClick={() => refetchProducts()}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tải lại sản phẩm
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* Tab "Tất cả" */}
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border ${
                selectedCategoryId === null
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              Tất cả sản phẩm
            </button>

            {/* Các Tab Danh mục từ API */}
            {isCategoriesLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-32 h-10 bg-slate-800/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border ${
                    selectedCategoryId === cat.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </section>

        {/* LƯỚI SẢN PHẨM (PRODUCT GRID) */}
        <section id="products-grid" className="space-y-6">
          {isProductsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 bg-slate-900 rounded-2xl border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : isProductsError ? (
            <div className="p-12 text-center text-red-400 bg-slate-900 border border-slate-800 rounded-2xl">
              Không thể tải dữ liệu sản phẩm từ server.
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              Không tìm thấy sản phẩm nào thuộc danh mục này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                const inCartItem = cartItems.find((i) => i.id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 hover:border-slate-700 hover:shadow-2xl ${
                      isOutOfStock ? 'opacity-50 grayscale select-none' : ''
                    }`}
                  >
                    {/* HÌNH ẢNH SẢN PHẨM */}
                    <div className="relative h-48 bg-slate-800 overflow-hidden">
                      <img
                        src={getProductImage(product.name, product.id)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                      {/* HOT & ORIGIN BADGES */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {product.isHot && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-md">
                            <Flame className="w-3 h-3 fill-slate-950" /> HOT
                          </span>
                        )}
                        {product.origin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700">
                            <Globe className="w-3 h-3 text-orange-400" /> {product.origin}
                          </span>
                        )}
                      </div>

                      {/* STOCK BADGE */}
                      <div className="absolute bottom-3 right-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-red-500/90 text-white'
                              : 'bg-emerald-500/90 text-slate-950 font-extrabold'
                          }`}
                        >
                          {isOutOfStock ? 'Hết hàng' : `Còn ${product.stockQuantity} món`}
                        </span>
                      </div>
                    </div>

                    {/* NỘI DUNG SẢN PHẨM */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {product.categoryName && (
                          <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider block mb-1">
                            {product.categoryName}
                          </span>
                        )}
                        <Link to={`/products/${product.id}`} className="group-hover/card:text-orange-400 transition">
                          <h3 className="font-bold text-slate-100 text-base line-clamp-2 leading-snug">
                            {product.name}
                          </h3>
                        </Link>
                        {product.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block">Giá niêm yết</span>
                          <span className="text-lg font-extrabold text-orange-400">
                            {product.price?.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* NÚT THÊM VÀO GIỎ HÀNG */}
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : addedProductId === product.id
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                              : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20'
                          }`}
                        >
                          {isOutOfStock ? (
                            'Hết hàng'
                          ) : addedProductId === product.id ? (
                            <>
                              <Check className="w-4 h-4" /> Đã thêm!
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" /> Thêm vào giỏ {inCartItem ? `(${inCartItem.quantity})` : ''}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* GIAO DIỆN CHECKOUT (FORM ĐẶT HÀNG) */}
        <section id="checkout-section" className="pt-8 border-t border-slate-800">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
              <ShoppingBag className="w-6 h-6 text-orange-500" />
              Thanh toán & Giao hàng
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Đơn hàng của bạn sẽ được đóng gói và giao đến địa chỉ trong thời gian nhanh nhất
            </p>
          </div>

          <CheckoutForm />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 text-center text-slate-500 text-xs mt-16">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-400">FoodDelivery E-Commerce System &copy; 2026</p>
          <p>Cơ sở dữ liệu Oracle 19c &bull; ASP.NET Core 8 &bull; Clean Architecture &bull; React SPA Zustand</p>
        </div>
      </footer>
    </div>
  );
}
