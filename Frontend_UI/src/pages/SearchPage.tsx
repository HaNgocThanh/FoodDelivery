import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import type { CategoryItem } from './HomePage';
import type { ProductItem } from './ProductManagementPage';
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  ChevronRight,
  Plus,
  Minus,
  Check,
  ChevronDown,
  Leaf,
  Thermometer,
  ShieldCheck,
  Heart,
  RotateCcw,
  Compass,
  Loader2,
  AlertCircle
} from 'lucide-react';

const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 50.000 đ', min: undefined, max: 50000 },
  { label: '50.000 – 200.000 đ', min: 50000, max: 200000 },
  { label: '200.000 – 500.000 đ', min: 200000, max: 500000 },
  { label: 'Trên 500.000 đ', min: 500000, max: undefined },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Thu hoạch gần nhất' },
  { key: 'price_asc', label: 'Giá: Thấp đến Cao' },
  { key: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { key: 'popular', label: 'Đánh giá cao nhất' },
];

const FARMS = [
  'Hợp Tác Xã Đà Lạt',
  'Trang Trại Mộc Châu',
  'Vườn Nông Sản Củ Chi',
  'Thung Lũng Sương Mù'
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, items: cartItems, updateQuantity } = useCartStore();

  const urlKeyword = searchParams.get('keyword') ?? '';
  const urlCategoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null;

  const [keyword, setKeyword] = useState<string>(urlKeyword);
  const [categoryId, setCategoryId] = useState<number | null>(urlCategoryId);
  const [pricePreset, setPricePreset] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [rating, setRating] = useState<number | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<string | null>('organic');
  const [deliveryWindow, setDeliveryWindow] = useState<'instant' | 'today' | 'tomorrow'>('today');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact' | 'editorial'>('comfortable');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(9);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  // Sync keyword & categoryId from URL
  useEffect(() => {
    setKeyword(urlKeyword);
  }, [urlKeyword]);

  useEffect(() => {
    if (urlCategoryId) {
      setCategoryId(urlCategoryId);
    }
  }, [urlCategoryId]);

  // Fetch categories
  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: () => axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories'),
  });

  // Calculate effective price
  const activePreset = PRICE_PRESETS[pricePreset];
  const effectiveMin = activePreset.min ?? (minPrice ? Number(minPrice) : undefined);
  const effectiveMax = activePreset.max ?? (maxPrice ? Number(maxPrice) : undefined);

  // Fetch search products
  const {
    data: products = [],
    isLoading,
    isError,
    error
  } = useQuery<ProductItem[]>({
    queryKey: ['product-search', keyword, categoryId, effectiveMin, effectiveMax],
    queryFn: () => {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (categoryId) params.set('categoryId', String(categoryId));
      if (effectiveMin) params.set('minPrice', String(effectiveMin));
      if (effectiveMax) params.set('maxPrice', String(effectiveMax));
      return axiosClient.get<ProductItem[], ProductItem[]>(`/api/products/search?${params.toString()}`);
    },
  });

  // Client-side filtering and sorting
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by rating
    if (rating !== null) {
      list = list.filter((p: any) => Number(p.averageRating ?? 5) >= rating);
    }

    // Filter by farm (mock match)
    if (selectedFarm) {
      list = list.filter((p: any) => p.origin?.includes(selectedFarm) || true);
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        list.sort((a: any, b: any) => Number(b.averageRating ?? 5) - Number(a.averageRating ?? 5));
        break;
      case 'newest':
      default:
        list.sort((a, b) => b.id - a.id);
    }

    return list;
  }, [products, rating, selectedFarm, sortBy]);

  const pagedProducts = filteredProducts.slice(0, displayCount);

  // Clear all filters
  const handleClearAll = () => {
    setCategoryId(null);
    setPricePreset(0);
    setMinPrice('');
    setMaxPrice('');
    setRating(null);
    setSelectedFarm(null);
    setSelectedPractice(null);
    setKeyword('');
    setSearchParams({});
  };

  const hasActiveFilters =
    categoryId !== null ||
    pricePreset !== 0 ||
    !!minPrice ||
    !!maxPrice ||
    rating !== null ||
    selectedFarm !== null ||
    !!keyword;

  // Toggle favorite
  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add to cart helper
  const handleAddToCart = (product: ProductItem) => {
    addToCart(product, 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  // Get image fallback
  const getProductImg = (product: ProductItem) => {
    if (product.imageUrl) return product.imageUrl;
    const name = product.name.toLowerCase();
    if (name.includes('bò') || name.includes('thịt'))
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
    if (name.includes('rau') || name.includes('cải') || name.includes('xà lách'))
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
    if (name.includes('cà chua'))
      return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';
    if (name.includes('gà'))
      return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&auto=format&fit=crop&q=80';
    return `https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80&sig=${product.id}`;
  };

  // Helper check cart item
  const getCartItem = (id: number) => cartItems.find((i) => i.id === id);

  return (
    <main className="min-h-screen bg-[#f1fcf7] text-[#141e1b] font-hanken antialiased pb-20">
      {/* ────────────────────────── DYNAMIC CATALOG HEADER & LIVE DISPATCH STATUS ────────────────────────── */}
      <section className="w-full bg-[#ebf6f1]/80 border-b border-emerald-100/70 pb-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-4">
          {/* Breadcrumbs & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-slate-500">
            <nav className="flex items-center gap-1.5">
              <Link to="/" className="hover:text-[#006c49] transition-colors">
                Trang Chủ
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <Link to="/search" className="hover:text-[#006c49] transition-colors">
                Nông Sản Thuần Tự Nhiên
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[#006c49] font-bold">
                {keyword ? `Kết quả tìm kiếm: "${keyword}"` : 'Trái Cây & Rau Củ Mùa Vụ'}
              </span>
            </nav>

            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006c49]">
                Điều Phối Trạm Sinh Thái 09:41 AM
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-medium text-[11px]">Chuỗi Lạnh Bán Kính 90 Dặm</span>
            </div>
          </div>

          {/* Live Window Alert Ribbon */}
          <div className="mb-4 bg-[#b4efd6]/50 text-[#15503e] rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border border-emerald-200/60 shadow-sm">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#006c49] shrink-0" />
              <span className="text-xs font-bold text-[#00422b]">
                Khung Giờ Giao Hàng Thu Hoạch Sáng Đang Mở:
              </span>
              <span className="text-xs text-[#15503e]">
                Đặt trong vòng <strong className="text-[#006c49] underline font-bold">42 phút</strong> để nhận trước 11:30 AM.
              </span>
            </div>
            <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase text-[#006c49] shadow-sm self-end sm:self-center">
              CÒN LẠI 14 SUẤT GIAO
            </span>
          </div>

          {/* Main Headline Block */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4">
            <div className="max-w-3xl">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#006c49] block mb-1">
                BẢN KÊ ĐIỀU PHỐI BÌNH MINH (DAWN DISPATCH MANIFEST)
              </span>
              <h1 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
                Nông Sản Mùa Vụ Thu Hoạch Sớm
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Được tuyển chọn từ các nhà vườn trong bán kính 90 dặm. Hái tại vườn lúc rạng sáng, làm mát tức thì trong kho lạnh và vận chuyển nguyên vẹn đến căn bếp của bạn.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-emerald-100/80 self-start lg:self-end">
              <ShieldCheck className="w-4 h-4 text-[#006c49]" />
              <span className="text-xs font-bold text-slate-800">100% Không Chất Bảo Quản</span>
            </div>
          </div>

          {/* Horizontal Filter Pills Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryId === null
                  ? 'bg-[#006c49] text-white shadow-sm'
                  : 'bg-white hover:bg-[#b4efd6]/50 text-slate-700 shadow-sm'
              }`}
            >
              Tất Cả Mùa Vụ ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  categoryId === cat.id
                    ? 'bg-[#006c49] text-white shadow-sm'
                    : 'bg-white hover:bg-[#b4efd6]/50 text-slate-700 shadow-sm'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPractice(selectedPractice === 'organic' ? null : 'organic')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedPractice === 'organic'
                  ? 'bg-[#006c49] text-white shadow-sm'
                  : 'bg-white hover:bg-[#b4efd6]/50 text-slate-700 shadow-sm'
              }`}
            >
              Chứng Nhận VietGAP
            </button>
            <button
              type="button"
              onClick={() => setSelectedPractice(selectedPractice === 'plastic-free' ? null : 'plastic-free')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedPractice === 'plastic-free'
                  ? 'bg-[#006c49] text-white shadow-sm'
                  : 'bg-white hover:bg-[#b4efd6]/50 text-slate-700 shadow-sm'
              }`}
            >
              Bao Bì Không Nhựa
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── MAIN BODY: FILTER SIDEBAR + CATALOG GRID ────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Mobile Filter Trigger */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-emerald-200 text-xs font-bold text-[#006c49] shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Bộ Lọc Nông Sản</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#ff7d45]" />
            )}
          </button>
          <span className="text-xs text-slate-500 font-medium">
            {filteredProducts.length} mẻ thu hoạch
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─────────────── CỘT TRÁI (3 COLS): FILTER SIDEBAR ─────────────── */}
          <aside
            className={`
              lg:col-span-3 flex flex-col gap-6 bg-white p-6 rounded-3xl shadow-sm border border-emerald-100
              ${mobileFilterOpen ? 'fixed inset-0 z-50 overflow-y-auto bg-white p-6 m-0 rounded-none' : 'hidden lg:flex'}
            `}
          >
            {/* Mobile close button */}
            <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-syne font-bold text-lg text-slate-900">Bộ Lọc Mùa Vụ</span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Filter Bar */}
            <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-syne font-bold text-sm text-slate-900">Bộ Lọc Tìm Kiếm</span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-[#a63b00] hover:underline cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {/* Active Pills */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keyword && (
                    <span className="inline-flex items-center gap-1 bg-[#ebf6f1] text-[#006c49] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      "{keyword}"
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setKeyword('');
                          setSearchParams({});
                        }}
                      />
                    </span>
                  )}
                  {categoryId && (
                    <span className="inline-flex items-center gap-1 bg-[#ebf6f1] text-[#006c49] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {categories.find((c) => c.id === categoryId)?.name || 'Danh mục'}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryId(null)} />
                    </span>
                  )}
                  {pricePreset !== 0 && (
                    <span className="inline-flex items-center gap-1 bg-[#ebf6f1] text-[#006c49] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {PRICE_PRESETS[pricePreset].label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setPricePreset(0)} />
                    </span>
                  )}
                  {rating && (
                    <span className="inline-flex items-center gap-1 bg-[#ebf6f1] text-[#006c49] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      ≥ {rating} sao
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setRating(null)} />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Keyword Search Input */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Tìm Kiếm Nông Sản
              </span>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cà chua, xà lách, nấm..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#006c49]"
                />
              </div>
            </div>

            {/* Delivery Window Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Khung Giờ Giao Hàng
              </span>
              <div className="space-y-1 text-xs">
                <label
                  onClick={() => setDeliveryWindow('instant')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    deliveryWindow === 'instant' ? 'bg-[#ebf6f1] text-[#006c49] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        deliveryWindow === 'instant' ? 'border-[#006c49] bg-[#006c49]' : 'border-slate-300'
                      }`}
                    >
                      {deliveryWindow === 'instant' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>Hỏa tốc (Dưới 35 phút)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">18</span>
                </label>

                <label
                  onClick={() => setDeliveryWindow('today')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    deliveryWindow === 'today' ? 'bg-[#ebf6f1] text-[#006c49] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        deliveryWindow === 'today' ? 'border-[#006c49] bg-[#006c49]' : 'border-slate-300'
                      }`}
                    >
                      {deliveryWindow === 'today' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>Ca Trưa Nay (12:00 PM)</span>
                  </div>
                  <span className="text-[10px] text-[#006c49] font-bold">114</span>
                </label>

                <label
                  onClick={() => setDeliveryWindow('tomorrow')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    deliveryWindow === 'tomorrow' ? 'bg-[#ebf6f1] text-[#006c49] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        deliveryWindow === 'tomorrow' ? 'border-[#006c49] bg-[#006c49]' : 'border-slate-300'
                      }`}
                    >
                      {deliveryWindow === 'tomorrow' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>Sáng Mai (07:30 AM)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">142</span>
                </label>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Khoảng Giá (VND)
              </span>

              {/* Presets */}
              <div className="space-y-1 text-xs">
                {PRICE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPricePreset(idx);
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl transition-all ${
                      pricePreset === idx
                        ? 'bg-[#006c49] text-white font-bold'
                        : 'text-slate-700 hover:bg-[#ebf6f1]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Min / Max */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPricePreset(0);
                  }}
                  placeholder="Từ"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPricePreset(0);
                  }}
                  placeholder="Đến"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#006c49]"
                />
              </div>
            </div>

            {/* Cultivation Practices */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Phương Thức Canh Tác
              </span>
              <div className="space-y-1.5 text-xs">
                {[
                  { id: 'organic', label: 'Chứng Nhận VietGAP / Hữu Cơ', count: 96 },
                  { id: 'permaculture', label: 'Canh Tác Tự Nhiên Vi Sinh', count: 41 },
                  { id: 'no-spray', label: 'Không Phun Hóa Chất', count: 78 },
                  { id: 'non-gmo', label: 'Giống Thuần Chủng Non-GMO', count: 132 },
                  { id: 'plastic-free', label: 'Bao Bì Sinh Học Không Nhựa', count: 118 },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setSelectedPractice(selectedPractice === item.id ? null : item.id)}
                    className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-[#ebf6f1]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedPractice === item.id
                            ? 'bg-[#006c49] border-[#006c49] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedPractice === item.id && <Check className="w-3 h-3" />}
                      </span>
                      <span className="text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Partner Micro-Farms */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Nông Trại Đối Tác
              </span>
              <div className="space-y-1.5 text-xs">
                {FARMS.map((farm, idx) => (
                  <label
                    key={idx}
                    onClick={() => setSelectedFarm(selectedFarm === farm ? null : farm)}
                    className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-[#ebf6f1]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedFarm === farm
                            ? 'bg-[#006c49] border-[#006c49] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedFarm === farm && <Check className="w-3 h-3" />}
                      </span>
                      <span className="text-slate-700">{farm}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{20 + idx * 8}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer Rating Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Đánh Giá Khách Hàng
              </span>
              <div className="space-y-1 text-xs">
                {[5, 4, 3].map((r) => (
                  <label
                    key={r}
                    onClick={() => setRating(rating === r ? null : r)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl cursor-pointer ${
                      rating === r ? 'bg-[#ebf6f1] font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= r ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-700">Từ {r} sao trở lên</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Soil Guarantee Callout */}
            <div className="bg-[#ebf6f1] p-4 rounded-2xl flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#006c49] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-syne">Cam Kết Thổ Nhưỡng</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Tất cả nông sản đều trải qua kiểm nghiệm vi sinh và chỉ số kim loại nặng độc lập. Giữ trọn 100% khoáng chất tự nhiên.
              </p>
            </div>

            {/* Apply button for mobile */}
            <div className="lg:hidden pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-[#006c49] text-white py-3 rounded-full text-xs font-bold"
              >
                Áp Dụng Bộ Lọc ({filteredProducts.length})
              </button>
            </div>
          </aside>

          {/* ─────────────── CỘT PHẢI (9 COLS): CATALOG CONTENT ─────────────── */}
          <div className="lg:col-span-9 flex flex-col gap-6">
            {/* Utility Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-emerald-100/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Hiển thị {pagedProducts.length} / {filteredProducts.length} nông sản tươi
                </span>
                <span className="text-[10px] uppercase font-bold bg-[#b4efd6] text-[#15503e] px-2.5 py-0.5 rounded-full">
                  LIVE HARVEST
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Density toggle */}
                <div className="hidden sm:flex items-center gap-1 bg-[#f8fafc] p-1 rounded-full border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDensityMode('compact')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      densityMode === 'compact' ? 'bg-white text-[#006c49] shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Gọn Gàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensityMode('comfortable')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      densityMode === 'comfortable' ? 'bg-white text-[#006c49] shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Tiêu Chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensityMode('editorial')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      densityMode === 'editorial' ? 'bg-white text-[#006c49] shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Tạp Chí
                  </button>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Sắp xếp:</span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-[#f8fafc] border border-slate-200 rounded-full px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006c49] cursor-pointer pr-8"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading & Error States */}
            {isLoading && (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-[#006c49]" />
                <p className="font-syne text-sm font-bold text-[#006c49]">Đang kết nối mẻ thu hoạch hôm nay...</p>
              </div>
            )}

            {isError && (
              <div className="p-8 bg-white border border-red-200 rounded-3xl text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h3 className="font-syne font-bold text-red-800">Không thể tải danh sách nông sản</h3>
                <p className="text-xs text-red-600">{(error as any)?.message || 'Vui lòng kiểm tra lại kết nối.'}</p>
              </div>
            )}

            {/* Empty Results */}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="p-12 bg-white rounded-3xl text-center space-y-4 border border-emerald-100 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center mx-auto">
                  <Leaf className="w-8 h-8" />
                </div>
                <h3 className="font-syne text-xl font-bold text-slate-900">
                  Không tìm thấy nông sản phù hợp
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hãy thử điều chỉnh lại mức giá, danh mục hoặc tìm kiếm với từ khóa khác như "cà chua", "xà lách", "thịt bò".
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-2 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold px-6 py-2.5 rounded-full transition shadow cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa Tất Cả Bộ Lọc</span>
                </button>
              </div>
            )}

            {/* Product Grid (3 Columns) */}
            {!isLoading && pagedProducts.length > 0 && (
              <div
                className={`grid gap-5 ${
                  densityMode === 'compact'
                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                    : densityMode === 'editorial'
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {pagedProducts.map((product) => {
                  const isFavorite = favorites.includes(product.id);
                  const cartItem = getCartItem(product.id);
                  const isDepleted = product.stockQuantity <= 0;

                  return (
                    <div
                      key={product.id}
                      className="group bg-white rounded-3xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 border border-emerald-100/80"
                    >
                      <div>
                        {/* Image Frame */}
                        <div className="relative overflow-hidden rounded-2xl bg-[#ebf6f1] aspect-square mb-3">
                          <img
                            src={getProductImg(product)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Badges Floating */}
                          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-[#006c49] shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                              Hái 3h trước
                            </span>
                            {product.isHot && (
                              <span className="bg-[#ff7d45] text-white px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shadow-sm self-start">
                                Đang Hot
                              </span>
                            )}
                          </div>

                          {/* Favorite button */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(product.id)}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-[#ff7d45] transition-colors cursor-pointer z-10 shadow-sm"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isFavorite ? 'fill-[#ff7d45] text-[#ff7d45]' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Farm Origin Pin */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                          <Compass className="w-3.5 h-3.5 text-[#006c49]" />
                          <span className="truncate">{product.origin || 'Nông trại Đà Lạt'}</span>
                        </div>

                        {/* Title */}
                        <Link to={`/products/${product.id}`} className="block group">
                          <h3 className="font-syne font-bold text-sm text-slate-900 group-hover:text-[#006c49] transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Description */}
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 mb-3">
                          {product.description || 'Thu hoạch mẻ sớm chọn lọc, bảo toàn trọn vẹn vị tươi ngọt và dinh dưỡng tự nhiên.'}
                        </p>
                      </div>

                      {/* Price & Action Row */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-syne font-black text-slate-900 text-sm sm:text-base">
                              {product.price.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {product.stockQuantity > 0 ? `Còn ${product.stockQuantity} mẻ` : 'Hết hàng'}
                          </span>
                        </div>

                        {/* Action CTA or Quantity Stepper */}
                        {isDepleted ? (
                          <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full">
                            Tạm hết
                          </span>
                        ) : cartItem ? (
                          <div className="flex items-center bg-[#ebf6f1] rounded-full p-1 border border-emerald-200">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, Math.max(0, cartItem.quantity - 1))}
                              className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-[#b4efd6] transition-colors shadow-sm cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-900">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-[#006c49] text-white flex items-center justify-center hover:bg-[#005236] transition-colors shadow-sm cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="bg-[#ff7d45] hover:bg-[#e8590c] text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            {addedProductId === product.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã Thêm</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination & Load More Section */}
            {!isLoading && filteredProducts.length > displayCount && (
              <div className="mt-4 bg-white p-6 rounded-3xl shadow-sm border border-emerald-100/70 flex flex-col items-center gap-3 text-center">
                <div className="w-full max-w-sm flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-slate-500 text-[11px] font-bold">
                    <span>Đang xem {displayCount} / {filteredProducts.length} nông sản</span>
                    <span className="text-[#006c49]">
                      {Math.round((displayCount / filteredProducts.length) * 100)}% danh mục
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#006c49] rounded-full transition-all duration-500"
                      style={{ width: `${(displayCount / filteredProducts.length) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisplayCount((prev) => prev + 9)}
                  className="bg-[#006c49] hover:bg-[#005236] text-white px-8 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Tải Thêm 9 Nông Sản Mùa Vụ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ────────────────────────── COLD CHAIN AGRONOMY GUARANTEE BANNER ────────────────────────── */}
      <section className="w-full bg-[#ebf6f1] py-12 mt-8 border-t border-emerald-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 bg-white p-5 rounded-3xl shadow-sm border border-emerald-100/60">
              <div className="w-12 h-12 rounded-2xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] shadow-sm shrink-0">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-syne font-bold text-sm text-slate-900 mb-1">Chuỗi Lạnh Bất Biến 4°C</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mỗi thùng nông sản được kiểm soát nhiệt độ từ khi ngắt cuống trên đồng ruộng tới tận ngưỡng cửa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white p-5 rounded-3xl shadow-sm border border-emerald-100/60">
              <div className="w-12 h-12 rounded-2xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] shadow-sm shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-syne font-bold text-sm text-slate-900 mb-1">Bao Bì Sợi Tinh Bột</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tự phân hủy sinh học thành mùn hữu cơ sau 45 ngày. Cam kết 100% không hạt vi nhựa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white p-5 rounded-3xl shadow-sm border border-emerald-100/60">
              <div className="w-12 h-12 rounded-2xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-syne font-bold text-sm text-slate-900 mb-1">Bảo Chứng Độ Tươi Ngon</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nếu nông sản không đạt độ giòn ngọt như cam kết, hoàn tiền 100% với một chạm tức thì.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
