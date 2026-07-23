import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  ShoppingBag,
  ShoppingCart,
  Check,
  Flame,
  Globe,
  Sparkles,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductItem } from './ProductManagementPage';

export interface CategoryItem {
  id: number;
  name: string;
  description?: string;
}

/**
 * HomePage – Trang chủ.
 * LƯU Ý: Header & Footer đã được wrap trong `PublicLayout` tại App.tsx (routing).
 * Form thanh toán đã được tách ra `CheckoutFormPage` riêng.
 * File này chỉ còn chứa: Hero + CategoryPills + ProductGrid.
 *
 * Logic (useState / useQuery / useCartStore / useAuthStore) được BẢO TOÀN 100%.
 * Re-skin className theo skill `ui-design-system` (emerald/amber, light mode).
 */
export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  // Cart & Auth store
  const { addToCart, items: cartItems } = useCartStore();
  const { isAdmin } = useAuthStore();

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
    refetch: refetchProducts,
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

  // Curated Food Image Mapping (giữ nguyên) + ưu tiên ảnh thật từ Backend (Cloudinary).
  // Ưu tiên: product.imageUrl (do Admin upload) → fallback Unsplash theo keyword.
  const getProductImage = (product: ProductItem) => {
    if (product.imageUrl) return product.imageUrl;
    const name = product.name;
    const id = product.id;
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
    <>
      {/* HERO BANNER – re-skin theo đặc tả:
          - Gradient: bg-gradient-to-r từ emerald-50 đến teal-100
          - CTA: rounded-full + hiệu ứng hover mượt mà
      */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-emerald-50 to-teal-100 border-b border-emerald-100 py-14 sm:py-20">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-200/40 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-teal-200/40 rounded-full filter blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 backdrop-blur-sm border border-emerald-200 rounded-full text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Giao hàng siêu tốc trong 2 giờ
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
              Thực Phẩm Tươi Sạch <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Giao Tận Cửa Sổ Nhà Bạn
              </span>
            </h1>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Nguồn gốc rõ ràng, chứng nhận VietGAP, khóa tồn kho thực tế tức thì
              chống đụng độ đơn hàng.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <a
                href="#products-grid"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 py-3.5 shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <ShoppingBag className="w-5 h-5" />
                Khám phá sản phẩm
              </a>
              {isAdmin() && (
                <a
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/80 backdrop-blur-sm hover:bg-white text-emerald-700 hover:text-emerald-800 font-semibold px-7 py-3.5 transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                >
                  <Boxes className="w-5 h-5" />
                  Trang quản trị
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* CATEGORY NAVIGATION – re-skin theo đặc tả:
            - Pill shape (rounded-full)
            - Active: bg-emerald-600 text-white shadow-md
            - Inactive: bg-gray-100 text-gray-600 hover:bg-gray-200
            - Horizontal scroll ẩn scrollbar
        */}
        <section className="space-y-4">
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600" />
              Danh mục Thực phẩm
            </h2>
            <button
              onClick={() => refetchProducts()}
              className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tải lại sản phẩm
            </button>
          </div>

          <div
            className="flex items-center gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
                selectedCategoryId === null
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả sản phẩm
            </button>

            {isCategoriesLoading ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-32 h-10 bg-gray-100 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </section>

        {/* LƯỚI SẢN PHẨM – re-skin theo đặc tả:
            - Grid: grid-cols-2 / md:grid-cols-3 / lg:grid-cols-4, gap-6
            - ProductCard: rounded-xl border border-gray-100,
              hover:shadow-xl hover:-translate-y-1 transition-all duration-300
            - Giá tiền: text-amber-500 (hoặc text-orange-500), to, in đậm
            - Hết hàng: opacity-60 + nhãn "Hết hàng"
        */}
        <section id="products-grid" className="space-y-6">
          {isProductsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isProductsError ? (
            <div className="rounded-xl p-12 text-center text-red-600 bg-red-50 border border-red-200">
              Không thể tải dữ liệu sản phẩm từ server.
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-slate-500 bg-slate-50 border border-slate-200">
              Không tìm thấy sản phẩm nào thuộc danh mục này.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                const inCartItem = cartItems.find((i) => i.id === product.id);

                return (
                  <article
                    key={product.id}
                    className={`group relative rounded-xl bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${
                      isOutOfStock ? 'opacity-60 select-none' : ''
                    }`}
                  >
                    {/* HÌNH ẢNH */}
                    <div className="relative aspect-square bg-gray-50 overflow-hidden rounded-t-xl">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* BADGES */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {product.isHot && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-md">
                            <Flame className="w-3 h-3 fill-white" /> HOT
                          </span>
                        )}
                        {product.origin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-md text-gray-900 border border-gray-200 shadow-sm">
                            <Globe className="w-3 h-3 text-emerald-600" /> {product.origin}
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-md">
                            Hết hàng
                          </span>
                        )}
                      </div>

                      {/* STOCK BADGE */}
                      {!isOutOfStock && (
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md">
                            Còn {product.stockQuantity} món
                          </span>
                        </div>
                      )}
                    </div>

                    {/* NỘI DUNG */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex-1">
                        {product.categoryName && (
                          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1">
                            {product.categoryName}
                          </span>
                        )}
                        <Link
                          to={`/products/${product.id}`}
                          className="group-hover:text-emerald-700 transition-colors"
                        >
                          <h3 className="font-medium text-gray-800 text-base line-clamp-2 leading-snug hover:text-emerald-700">
                            {product.name}
                          </h3>
                        </Link>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <span
                          className="text-xl font-bold text-amber-500 tabular-nums block"
                          style={{ display: 'block', marginBottom: '12px' }}
                        >
                          {product.price?.toLocaleString('vi-VN')} đ
                        </span>

                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          aria-label={
                            isOutOfStock
                              ? 'Sản phẩm hết hàng'
                              : addedProductId === product.id
                              ? 'Đã thêm vào giỏ'
                              : 'Thêm vào giỏ hàng'
                          }
                          className="w-full font-bold uppercase text-sm tracking-wide"
                          style={
                            isOutOfStock
                              ? {
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  minHeight: '48px',
                                  padding: '12px 16px',
                                  backgroundColor: '#e5e7eb',
                                  color: '#6b7280',
                                  border: '2px solid #d1d5db',
                                  borderRadius: '12px',
                                  cursor: 'not-allowed',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                }
                              : addedProductId === product.id
                              ? {
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  minHeight: '48px',
                                  padding: '12px 16px',
                                  background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                                  color: '#ffffff',
                                  border: '2px solid #064e3b',
                                  borderRadius: '12px',
                                  boxShadow:
                                    '0 4px 14px 0 rgba(5, 150, 105, 0.4), 0 0 0 4px rgba(167, 243, 208, 0.5)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  transition: 'all 0.2s ease',
                                }
                              : {
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  minHeight: '48px',
                                  padding: '12px 16px',
                                  background:
                                    'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                                  color: '#ffffff',
                                  border: '2px solid #059669',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 12px 0 rgba(16, 185, 129, 0.35)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  transition: 'all 0.2s ease',
                                }
                          }
                          onMouseEnter={(e) => {
                            if (isOutOfStock || addedProductId === product.id) return;
                            e.currentTarget.style.background =
                              'linear-gradient(135deg, #059669 0%, #0f766e 100%)';
                            e.currentTarget.style.boxShadow =
                              '0 8px 20px 0 rgba(16, 185, 129, 0.5)';
                            e.currentTarget.style.borderColor = '#047857';
                          }}
                          onMouseLeave={(e) => {
                            if (isOutOfStock || addedProductId === product.id) return;
                            e.currentTarget.style.background =
                              'linear-gradient(135deg, #10b981 0%, #0d9488 100%)';
                            e.currentTarget.style.boxShadow =
                              '0 4px 12px 0 rgba(16, 185, 129, 0.35)';
                            e.currentTarget.style.borderColor = '#059669';
                          }}
                          onMouseDown={(e) => {
                            if (isOutOfStock || addedProductId === product.id) return;
                            e.currentTarget.style.background =
                              'linear-gradient(135deg, #047857 0%, #115e59 100%)';
                          }}
                          onMouseUp={(e) => {
                            if (isOutOfStock || addedProductId === product.id) return;
                            e.currentTarget.style.background =
                              'linear-gradient(135deg, #059669 0%, #0f766e 100%)';
                          }}
                        >
                          {isOutOfStock ? (
                            <>
                              <ShoppingCart
                                style={{ width: '18px', height: '18px' }}
                                aria-hidden="true"
                              />
                              <span>Hết hàng</span>
                            </>
                          ) : addedProductId === product.id ? (
                            <>
                              <Check
                                style={{ width: '20px', height: '20px', strokeWidth: 3 }}
                                aria-hidden="true"
                              />
                              <span>Đã thêm vào giỏ!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart
                                style={{ width: '18px', height: '18px' }}
                                aria-hidden="true"
                              />
                              <span>Thêm vào giỏ</span>
                              {inCartItem ? (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    padding: '2px 8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                    borderRadius: '999px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                  }}
                                >
                                  ×{inCartItem.quantity}
                                </span>
                              ) : null}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
