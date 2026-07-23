import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import {
  ShoppingCart,
  Check,
  Flame,
  Globe,
  Sparkles,
  Boxes,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductItem } from './ProductManagementPage';
import type { CategoryItem } from './HomePage';

/**
 * ProductListPage – Trang danh sách sản phẩm đầy đủ (route `/products`).
 *
 * LƯU Ý:
 * - Trang này trước đây là stub trống → click "Quay lại danh sách sản phẩm"
 *   từ ProductDetailPage dẫn về trang trắng.
 * - Re-skin theo skill `ui-design-system` (emerald/amber, light mode).
 * - Logic: useState filter category, useQuery lấy products + categories, addToCart.
 */
export default function ProductListPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  const { addToCart, items: cartItems } = useCartStore();

  // Fetch Categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      return await axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories');
    },
  });

  // Fetch Products
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useQuery<ProductItem[]>({
    queryKey: ['products', selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId ? `/api/products?categoryId=${selectedCategoryId}` : '/api/products';
      return await axiosClient.get<ProductItem[], ProductItem[]>(url);
    },
  });

  const handleAddToCart = (product: ProductItem) => {
    addToCart(product, 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

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
    <main
      data-testid="product-list-page"
      className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

        {/* HEADER */}
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Tươi sạch mỗi ngày
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Danh sách sản phẩm
          </h1>
          <p className="text-slate-500 text-sm">
            Khám phá {products.length} sản phẩm tươi sạch, chất lượng cao.
          </p>
        </header>

        {/* CATEGORY FILTER */}
        <section aria-label="Bộ lọc danh mục" className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            Danh mục
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setSelectedCategoryId(null)}
              data-testid="category-filter-all"
              className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors border ${
                selectedCategoryId === null
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              Tất cả
            </button>

            {isCategoriesLoading ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-28 h-9 bg-slate-100 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  data-testid={`category-filter-${cat.id}`}
                  className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors border ${
                    selectedCategoryId === cat.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </section>

        {/* PRODUCT GRID */}
        <section aria-label="Lưới sản phẩm" className="space-y-6">
          {isProductsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-80 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isProductsError ? (
            <div className="rounded-xl p-12 text-center text-red-700 bg-red-50 border border-red-200">
              Không thể tải dữ liệu sản phẩm từ server. Vui lòng thử lại sau.
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-slate-500 bg-white border border-slate-200 space-y-2">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Chưa có sản phẩm nào</p>
              <p className="text-xs">Hãy chọn danh mục khác hoặc quay lại sau.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                const inCartItem = cartItems.find((i) => i.id === product.id);
                const justAdded = addedProductId === product.id;

                return (
                  <article
                    key={product.id}
                    data-testid={`product-card-${product.id}`}
                    className={`group relative rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col ${
                      isOutOfStock ? 'opacity-60 select-none' : ''
                    }`}
                  >
                    {/* IMAGE */}
                    <Link
                      to={`/products/${product.id}`}
                      className="relative aspect-square bg-slate-50 overflow-hidden block"
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* BADGES (top-left) */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {product.isHot && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                            <Flame className="w-3 h-3 fill-white" /> HOT
                          </span>
                        )}
                        {product.origin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 shadow-sm">
                            <Globe className="w-3 h-3 text-emerald-600" /> {product.origin}
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm">
                            Hết hàng
                          </span>
                        )}
                      </div>

                      {/* STOCK BADGE (bottom-right) */}
                      {!isOutOfStock && (
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm">
                            Còn {product.stockQuantity} món
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* CONTENT */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex-1">
                        {product.categoryName && (
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-1">
                            {product.categoryName}
                          </p>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          <Link
                            to={`/products/${product.id}`}
                            className="hover:text-emerald-700 transition-colors"
                          >
                            {product.name}
                          </Link>
                        </h3>
                      </div>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-amber-500 tabular-nums">
                          {product.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock || inCartItem !== undefined || justAdded}
                        data-testid={`button-add-to-cart-${product.id}`}
                        className={`
                          mt-3 inline-flex items-center justify-center gap-2
                          rounded-lg font-bold text-xs
                          px-4 py-2.5
                          transition-all duration-150
                          ${justAdded || inCartItem !== undefined
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm hover:shadow-md shadow-emerald-500/20'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {justAdded ? (
                          <>
                            <Check className="w-4 h-4" /> Đã thêm
                          </>
                        ) : inCartItem ? (
                          <>
                            <Check className="w-4 h-4" /> Đã có trong giỏ
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}