import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '@/api/axiosClient';
import { useCartStore } from '@/stores/useCartStore';
import type { CategoryItem } from './HomePage';
import type { ProductItem } from './ProductManagementPage';
import {
  Search,
  SlidersHorizontal,
  X,
  Flame,
  Globe,
  Star,
  ChevronRight,
  Utensils,
  Filter,
  Plus,
  Check,
  ChevronLeft,
  ChevronDown,
  Home as HomeIcon
} from 'lucide-react';

// ─── Image helper (same as HomePage, ưu tiên product.imageUrl từ Backend) ──
const getProductImage = (product: ProductItem) => {
  if (product.imageUrl) return product.imageUrl;
  const name = product.name;
  const id = product.id;
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

const SORT_OPTIONS = [
  { key: 'newest',   label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá tăng dần' },
  { key: 'price_desc', label: 'Giá giảm dần' },
  { key: 'popular',  label: 'Phổ biến nhất' },
];

const RATING_OPTIONS = [5, 4, 3] as const;

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
  const [rating,     setRating]     = useState<number | null>(null);
  const [sortBy,     setSortBy]     = useState<string>('newest');
  const [sortOpen,   setSortOpen]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [addedId,    setAddedId]    = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PAGE_SIZE = 12;

  // Sync keyword from URL
  useEffect(() => {
    setKeyword(urlKeyword);
    setInputVal(urlKeyword);
  }, [urlKeyword]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, categoryId, pricePreset, minPrice, maxPrice, rating, sortBy]);

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

  // Client-side: sort + filter by rating + paginate
  const filteredResults = (() => {
    let list = [...results];
    if (rating !== null) {
      list = list.filter((p: any) => Number(p.averageRating ?? 0) >= rating);
    }
    switch (sortBy) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'popular':    list.sort((a: any, b: any) => Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0)); break;
      case 'newest':
      default:           list.sort((a: any, b: any) => Number(b.id) - Number(a.id));
    }
    return list;
  })();

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedResults = filteredResults.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    setRating(null);
  };

  const hasActiveFilters =
    categoryId !== null || pricePreset !== 0 || !!minPrice || !!maxPrice || rating !== null;

  // ── Sidebar content (dùng chung cho desktop & mobile drawer) ──
  const SidebarContent = ({ onApplyClose }: { onApplyClose?: () => void }) => (
    <div className="space-y-6">
      {/* Active filters badge */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          data-testid="button-clear-filters-badge"
          className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-semibold hover:bg-amber-100 transition"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Bộ lọc đang áp dụng
          </span>
          <span className="flex items-center gap-1">
            <X className="w-3 h-3" /> Xoá tất cả
          </span>
        </button>
      )}

      {/* Category filter */}
      <section>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-emerald-600" />
          Danh mục
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                categoryId === null
                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span className="truncate">Tất cả danh mục</span>
              {categoryId === null && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                  categoryId === cat.id
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                {categoryId === cat.id && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Price range */}
      <section>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Khoảng giá</h3>
        <ul className="space-y-1">
          {PRICE_PRESETS.map((preset, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => { setPricePreset(index); setMinPrice(''); setMaxPrice(''); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                  pricePreset === index
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="truncate">{preset.label}</span>
                {pricePreset === index && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">Hoặc nhập khoảng giá tuỳ chỉnh:</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              placeholder="Từ (đ)"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPricePreset(0); }}
              className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            <span className="text-slate-400 text-xs">–</span>
            <input
              type="number"
              min={0}
              placeholder="Đến (đ)"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPricePreset(0); }}
              className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => onApplyClose?.()}
            className="w-full mt-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            Áp dụng
          </button>
        </div>
      </section>

      {/* Rating filter */}
      <section>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          Đánh giá
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setRating(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                rating === null
                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span>Tất cả đánh giá</span>
              {rating === null && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </li>
          {RATING_OPTIONS.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => setRating(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                  rating === r
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-1 whitespace-nowrap">
                  {Array.from({ length: r }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  ))}
                  {Array.from({ length: 5 - r }).map((_, i) => (
                    <Star key={`e-${i}`} className="w-3.5 h-3.5 text-slate-300" />
                  ))}
                  <span className="ml-1 text-xs text-slate-500">&gt;</span>
                </span>
                {rating === r && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Clear button */}
      <button
        type="button"
        onClick={clearFilters}
        disabled={!hasActiveFilters}
        data-testid="button-clear-all-filters"
        className="w-full px-3 py-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
      >
        <X className="w-3.5 h-3.5" />
        Xoá tất cả bộ lọc
      </button>
    </div>
  );

  // Build pagination buttons
  const buildPageNumbers = () => {
    const pages: (number | string)[] = [];
    const max = totalPages;
    const cur = safePage;
    if (max <= 7) {
      for (let i = 1; i <= max; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('…');
      const start = Math.max(2, cur - 1);
      const end = Math.min(max - 1, cur + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (cur < max - 2) pages.push('…');
      pages.push(max);
    }
    return pages;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-700 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── BREADCRUMB ───────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-emerald-700 transition">
            <HomeIcon className="w-3.5 h-3.5" />
            Trang chủ
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-700 font-semibold">Tìm kiếm sản phẩm</span>
        </nav>

        {/* ── SEARCH BAR (rounded-full) ────────────────────── */}
        <section className="mb-6">
          <form
            onSubmit={handleSearch}
            role="search"
            className="flex gap-2 sm:gap-3"
            aria-label="Tìm kiếm sản phẩm"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="search-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Bạn muốn tìm gì hôm nay? (VD: thịt bò, rau cải…)"
                className="w-full pl-14 pr-12 py-3 sm:py-4 bg-white border border-slate-200 rounded-full text-slate-700 placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => { setInputVal(''); setKeyword(''); }}
                  aria-label="Xoá nội dung tìm"
                  data-testid="button-clear-search"
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              data-testid="button-submit-search"
              className="px-5 sm:px-7 py-3 sm:py-4 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-full border border-emerald-300 hover:border-emerald-400 shadow-sm hover:shadow-md transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </button>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-mobile-filter"
              aria-label="Mở bộ lọc"
              className="lg:hidden px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 shadow-sm transition flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-bold">Lọc</span>
            </button>
          </form>
        </section>

        {/* ── MAIN GRID (lg:grid-cols-4) ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── SIDEBAR (Desktop - 1/4) ──────────────────── */}
          <aside className="hidden lg:block lg:col-span-1">
            <section
              aria-label="Bộ lọc tìm kiếm"
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 max-h-[calc(100vh-3rem)] overflow-y-auto"
            >
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Bộ lọc tìm kiếm
              </h2>
              <SidebarContent />
            </section>
          </aside>

          {/* ── MAIN RESULTS (3/4) ───────────────────────── */}
          <section className="lg:col-span-3 min-w-0">

            {/* Results header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  {keyword ? (
                    <>
                      Kết quả cho từ khoá{' '}
                      <span className="text-emerald-600">"{keyword}"</span>
                    </>
                  ) : (
                    'Tất cả sản phẩm'
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {isFetching
                    ? 'Đang tìm kiếm…'
                    : (
                      <>
                        Tìm thấy{' '}
                        <strong className="text-slate-900">{filteredResults.length}</strong> sản phẩm
                        {keyword && (
                          <>
                            {' '}cho từ khoá{' '}
                            <strong className="text-slate-900">'{keyword}'</strong>
                          </>
                        )}
                      </>
                    )}
                </p>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((v) => !v)}
                  data-testid="button-sort-toggle"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 shadow-sm transition min-w-[180px] justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Sắp xếp:</span>
                    <span>{SORT_OPTIONS.find((o) => o.key === sortBy)?.label}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} aria-hidden="true" />
                    <ul
                      role="listbox"
                      data-testid="sort-dropdown"
                      className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <li key={opt.key}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={sortBy === opt.key}
                            onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition ${
                              sortBy === opt.key
                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.key && <Check className="w-4 h-4 text-emerald-600" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </header>

            {/* Loading state */}
            {(isLoading || isFetching) && (
              <div
                role="status"
                aria-label="Đang tải sản phẩm"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-72 bg-white border border-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isFetching && filteredResults.length === 0 && (
              <section
                aria-live="polite"
                className="bg-white border border-slate-100 rounded-xl shadow-sm p-10 sm:p-16 text-center"
              >
                <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                  <Search className="w-10 h-10 text-emerald-500" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Rất tiếc, không tìm thấy sản phẩm nào
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Thử thay đổi từ khoá hoặc{' '}
                  {hasActiveFilters ? 'xoá bộ lọc để xem thêm sản phẩm.' : 'khám phá các danh mục khác.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      data-testid="button-clear-filters-empty"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-600 font-bold text-sm rounded-lg transition"
                    >
                      <X className="w-4 h-4" /> Xoá bộ lọc
                    </button>
                  )}
                  <Link
                    to="/"
                    data-testid="button-back-home-empty"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition"
                  >
                    <HomeIcon className="w-4 h-4" /> Về trang chủ
                  </Link>
                </div>
              </section>
            )}

            {/* Product grid */}
            {!isLoading && !isFetching && pagedResults.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {pagedResults.map((product) => {
                    const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                    const isAdded = addedId === product.id;
                    const avgRating = Number((product as any).averageRating ?? 0);
                    return (
                      <article
                        key={product.id}
                        data-testid={`product-card-${product.id}`}
                        className={`group rounded-xl bg-white shadow-sm overflow-hidden border border-slate-100 transition-all duration-200 hover:shadow-md hover:-translate-y-1 flex flex-col ${
                          isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Image */}
                        <Link
                          to={`/products/${product.id}`}
                          className="block aspect-square bg-slate-50 overflow-hidden relative"
                          aria-label={`Xem chi tiết ${product.name}`}
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                            {product.isHot && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                                <Flame className="w-3 h-3 fill-white" /> HOT
                              </span>
                            )}
                            {product.origin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-sm text-slate-700 border border-slate-200 shadow-sm">
                                <Globe className="w-3 h-3 text-emerald-600" /> {product.origin}
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm">
                                Hết hàng
                              </span>
                            )}
                          </div>

                          {avgRating > 0 && (
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-sm text-amber-600 border border-amber-200 shadow-sm">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {avgRating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </Link>

                        {/* Info */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2">
                          {product.categoryName && (
                            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                              {product.categoryName}
                            </span>
                          )}
                          <Link to={`/products/${product.id}`}>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug hover:text-emerald-700 transition">
                              {product.name}
                            </h3>
                          </Link>
                          {product.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 hidden sm:block">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                            <span className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                              {product.price?.toLocaleString('vi-VN')} đ
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              disabled={isOutOfStock}
                              data-testid={`button-add-to-cart-${product.id}`}
                              aria-label={
                                isOutOfStock
                                  ? 'Sản phẩm hết hàng'
                                  : isAdded
                                  ? 'Đã thêm vào giỏ'
                                  : 'Thêm vào giỏ hàng'
                              }
                              className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs transition flex-shrink-0 ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isAdded
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md'
                              }`}
                            >
                              {isOutOfStock ? (
                                'Hết hàng'
                              ) : isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Đã thêm
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Thêm</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* ── PAGINATION ───────────────────────────── */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Phân trang kết quả"
                    className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      data-testid="button-prev-page"
                      className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-full transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    <ul className="flex items-center gap-1">
                      {buildPageNumbers().map((p, idx) =>
                        typeof p === 'number' ? (
                          <li key={p}>
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              data-testid={`button-page-${p}`}
                              aria-current={safePage === p ? 'page' : undefined}
                              className={`min-w-[40px] px-3 py-2 text-sm font-bold rounded-full transition ${
                                safePage === p
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-slate-50'
                              }`}
                            >
                              {p}
                            </button>
                          </li>
                        ) : (
                          <li key={`dots-${idx}`} className="px-2 text-slate-400 text-sm">
                            …
                          </li>
                        )
                      )}
                    </ul>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      data-testid="button-next-page"
                      className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-full transition"
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </nav>
                )}
              </>
            )}

          </section>
        </div>

      </div>

      {/* ── MOBILE FILTER DRAWER ─────────────────────────── */}
      {sidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc tìm kiếm"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-xl overflow-y-auto">
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Bộ lọc tìm kiếm
              </h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng bộ lọc"
                data-testid="button-close-mobile-filter"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5">
              <SidebarContent onApplyClose={() => setSidebarOpen(false)} />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="w-full mt-6 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm transition"
              >
                Xem kết quả
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
