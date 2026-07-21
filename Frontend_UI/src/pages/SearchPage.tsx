import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '@/api/axiosClient';
import { useCartStore } from '@/stores/useCartStore';
import type { CategoryItem } from './HomePage';
import type { ProductItem } from './ProductManagementPage';
import {
  Search, SlidersHorizontal, X, ShoppingCart, Flame,
  Globe, Star, ChevronRight, Utensils, Filter, Plus, Check
} from 'lucide-react';

// ─── Image helper (same as HomePage) ─────────────────────
const getProductImage = (name: string, id: number) => {
  if (name.includes('bò') || name.includes('thịt') || name.includes('Thịt'))
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
  if (name.includes('rau') || name.includes('cải') || name.includes('Rau'))
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
  if (name.includes('cá') || name.includes('tôm') || name.includes('Hải sản'))
    return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80';
  return `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&auto=format&fit=crop&q=80&sig=${id}`;
};

const PRICE_PRESETS = [
  { label: 'Tất cả giá', min: undefined, max: undefined },
  { label: 'Dưới 50.000đ', min: undefined, max: 50000 },
  { label: '50.000 – 200.000đ', min: 50000, max: 200000 },
  { label: '200.000 – 500.000đ', min: 200000, max: 500000 },
  { label: 'Trên 500.000đ', min: 500000, max: undefined },
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();

  const urlKeyword = searchParams.get('keyword') ?? '';

  const [keyword,    setKeyword]    = useState(urlKeyword);
  const [inputVal,   setInputVal]   = useState(urlKeyword);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [pricePreset, setPricePreset] = useState(0);  // index into PRICE_PRESETS
  const [minPrice,   setMinPrice]   = useState<string>('');
  const [maxPrice,   setMaxPrice]   = useState<string>('');
  const [addedId,    setAddedId]    = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync keyword from URL
  useEffect(() => {
    setKeyword(urlKeyword);
    setInputVal(urlKeyword);
  }, [urlKeyword]);

  // Fetch categories for sidebar filter
  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: () => axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories'),
  });

  // Compute active price range
  const activePricePreset = PRICE_PRESETS[pricePreset];
  const effectiveMin = activePricePreset.min ?? (minPrice ? Number(minPrice) : undefined);
  const effectiveMax = activePricePreset.max ?? (maxPrice ? Number(maxPrice) : undefined);

  // Fetch search results
  const { data: results = [], isLoading, isFetching } = useQuery<ProductItem[]>({
    queryKey: ['product-search', keyword, categoryId, effectiveMin, effectiveMax],
    queryFn: () => {
      const params = new URLSearchParams();
      if (keyword)        params.set('keyword',    keyword);
      if (categoryId)     params.set('categoryId', String(categoryId));
      if (effectiveMin)   params.set('minPrice',   String(effectiveMin));
      if (effectiveMax)   params.set('maxPrice',   String(effectiveMax));
      return axiosClient.get<ProductItem[], ProductItem[]>(`/api/products/search?${params.toString()}`);
    },
    enabled: true,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(inputVal);
    navigate(`/search?keyword=${encodeURIComponent(inputVal)}`);
  };

  const handleAddToCart = (product: ProductItem) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const clearFilters = () => {
    setCategoryId(null);
    setPricePreset(0);
    setMinPrice('');
    setMaxPrice('');
  };

  const hasActiveFilters = categoryId !== null || pricePreset !== 0 || minPrice || maxPrice;

  // ── Sidebar content ───────────────────────────────────
  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Active filters badge */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-between px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-400 font-semibold hover:bg-orange-500/20 transition"
        >
          <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Bộ lọc đang áp dụng</span>
          <span className="flex items-center gap-1"><X className="w-3 h-3" /> Xoá tất cả</span>
        </button>
      )}

      {/* Category filter */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Danh mục</h3>
        <div className="space-y-1">
          <button
            onClick={() => setCategoryId(null)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition ${
              categoryId === null
                ? 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Tất cả danh mục</span>
            {categoryId === null && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition ${
                categoryId === cat.id
                  ? 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{cat.name}</span>
              {categoryId === cat.id && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price range presets */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Khoảng giá</h3>
        <div className="space-y-1">
          {PRICE_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => { setPricePreset(index); setMinPrice(''); setMaxPrice(''); }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition ${
                pricePreset === index
                  ? 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {preset.label}
              {pricePreset === index && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Custom price range */}
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">Hoặc nhập khoảng giá tuỳ chỉnh:</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Từ (đ)"
              value={minPrice}
              onChange={e => { setMinPrice(e.target.value); setPricePreset(0); }}
              className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-orange-500 transition"
            />
            <span className="text-slate-600 text-xs">–</span>
            <input
              type="number"
              placeholder="Đến (đ)"
              value={maxPrice}
              onChange={e => { setMaxPrice(e.target.value); setPricePreset(0); }}
              className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold text-white hidden sm:block">
              Food<span className="text-orange-500">Delivery</span>
            </span>
          </Link>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="search-input"
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Tìm kiếm sản phẩm…"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => { setInputVal(''); setKeyword(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition whitespace-nowrap flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </button>
          </form>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <Link
            to="/cart"
            className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition flex-shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Giỏ hàng</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── SIDEBAR (Desktop) ──────────────────────────── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sticky top-24">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                Bộ lọc tìm kiếm
              </h2>
              <SidebarContent />
            </div>
          </aside>

          {/* ── MOBILE SIDEBAR OVERLAY ──────────────────────── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                    Bộ lọc
                  </h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <SidebarContent />
              </div>
            </div>
          )}

          {/* ── MAIN RESULTS ────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-white">
                  {keyword ? (
                    <>Kết quả cho "<span className="text-orange-400">{keyword}</span>"</>
                  ) : 'Tất cả sản phẩm'}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isFetching ? 'Đang tìm kiếm…' : `Tìm thấy ${results.length} sản phẩm`}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
                >
                  <X className="w-3 h-3" /> Xoá bộ lọc
                </button>
              )}
            </div>

            {/* Loading state */}
            {isLoading || isFetching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-72 bg-slate-900 rounded-2xl border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : results.length === 0 ? (
              /* Empty state */
              <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">Không tìm thấy sản phẩm</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                  Thử tìm với từ khoá khác hoặc bỏ bộ lọc để xem thêm sản phẩm.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-semibold hover:bg-orange-500/20 transition"
                  >
                    Xoá tất cả bộ lọc
                  </button>
                )}
              </div>
            ) : (
              /* Product grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {results.map(product => {
                  const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                  const isAdded = addedId === product.id;
                  return (
                    <div
                      key={product.id}
                      className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 hover:border-orange-500/30 hover:shadow-orange-500/5 hover:shadow-2xl ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Image */}
                      <div className="relative h-44 bg-slate-800 overflow-hidden">
                        <img
                          src={getProductImage(product.name, product.id)}
                          alt={product.name}
                          className="w-full h-full object-cover transition duration-500 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                          {product.isHot && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow">
                              <Flame className="w-3 h-3 fill-slate-950" /> HOT
                            </span>
                          )}
                          {product.origin && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-slate-200 border border-slate-700">
                              <Globe className="w-3 h-3 text-orange-400" /> {product.origin}
                            </span>
                          )}
                        </div>
                        {(product as any).averageRating > 0 && (
                          <div className="absolute bottom-3 left-3">
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-amber-400 border border-amber-500/20">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {(product as any).averageRating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          {product.categoryName && (
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-0.5">
                              {product.categoryName}
                            </span>
                          )}
                          <Link to={`/products/${product.id}`}>
                            <h3 className="font-bold text-slate-100 text-sm line-clamp-2 leading-snug hover:text-orange-400 transition">
                              {product.name}
                            </h3>
                          </Link>
                          {product.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{product.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Giá</span>
                            <span className="text-base font-extrabold text-orange-400">
                              {product.price?.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isOutOfStock}
                            className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                              isOutOfStock
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : isAdded
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20'
                            }`}
                          >
                            {isOutOfStock ? 'Hết hàng' : isAdded ? <><Check className="w-3.5 h-3.5" /> Đã thêm</> : <><Plus className="w-3.5 h-3.5" /> Thêm</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
