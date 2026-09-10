import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  ShoppingCart,
  Check,
  Flame,
  Boxes,
  ArrowRight,
  Star,
  Leaf,
  Truck,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  PlayCircle,
  PackageCheck,
  Award,
  ThermometerSnowflake,
  Sprout,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductItem } from './ProductManagementPage';

export interface CategoryItem {
  id: number;
  name: string;
  description?: string;
}

// 6 Bento editorial categories theo mẫu thiết kế
const EDITORIAL_CATEGORIES = [
  {
    id: 1,
    title: 'Rau Củ & Thảo Mộc Bản Địa',
    tag: 'Thu hoạch sáng nay',
    subtag: '38 chủng loại',
    desc: 'Cải xoăn kale, xà lách mỡ, măng tây và rau thơm hái sớm lúc bình minh còn đọng sương mai.',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'rau',
  },
  {
    id: 2,
    title: 'Bánh Mì Men Cối Đá & Bơ Lát',
    tag: 'Nướng lúc 4:30 AM',
    subtag: 'Lên men 36h',
    desc: 'Bánh mì sourdough men tự nhiên giòn rụm vỏ ngoài, ruột xốp thoáng hương lúa mạch nguyên cám.',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'bánh',
  },
  {
    id: 3,
    title: 'Bơ Sữa Đồng Cỏ & Trứng Tươi',
    tag: 'Chuẩn A2 Heritage',
    subtag: '100% ăn cỏ',
    desc: 'Sữa tươi thanh trùng giữ váng béo ngậy, bơ vàng đánh tay và trứng gà thả vườn giàu omega-3.',
    image:
      'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'sữa',
  },
  {
    id: 4,
    title: 'Thủy Hải Sản Đánh Bắt Ven Bờ',
    tag: 'Cập bến trong 12h',
    subtag: 'Đánh bắt thủ công',
    desc: 'Cá hồi tự nhiên, tôm sú đầm phá và sò điệp tươi sống chuyển thẳng từ thuyền câu về bàn ăn.',
    image:
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'cá',
  },
  {
    id: 5,
    title: 'Dầu Ép Lạnh & Gia Vị Ủ Thùng Gỗ',
    tag: 'Ủ chum sành',
    subtag: 'Nguyên chất 100%',
    desc: 'Dầu ô liu nguyên chất ép lạnh lần đầu, mật ong rừng hoa tràm và giấm táo lên men tự nhiên.',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'dầu',
  },
  {
    id: 6,
    title: 'Set Sơ Chế Nấu Nhanh 15 Phút',
    tag: 'Chuẩn bếp trưởng',
    subtag: 'Tiết kiệm thời gian',
    desc: 'Nguyên liệu VietGAP sơ chế sạch sẽ, định lượng chính xác kèm công thức độc quyền cho bữa tối.',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=80',
    queryKeyword: 'set',
  },
];

// Dữ liệu sản phẩm mẫu Verdant Harvest dự phòng (đảm bảo trang luôn lộng lẫy và trải nghiệm đầy đủ ngay cả khi server backend chưa bật)
const FALLBACK_SEASONAL_PRODUCTS: ProductItem[] = [
  {
    id: 901,
    name: 'Cà Chua Gia Truyền Brandywine Capay',
    categoryName: 'Rau Củ & Thảo Mộc',
    categoryId: 1,
    price: 64000,
    stockQuantity: 14,
    isAvailable: true,
    isHot: true,
    origin: 'Nông Trại Capay Valley',
    description: '1kg • Chín tự nhiên trên cây không ủ lạnh, hương vị đậm đà nguyên bản và vỏ mỏng mọng nước.',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=700&auto=format&fit=crop&q=80',
  },
  {
    id: 902,
    name: 'Bơ Sáp Chín Cây Santa Barbara',
    categoryName: 'Trái Cây Tươi',
    categoryId: 2,
    price: 59000,
    stockQuantity: 28,
    isAvailable: true,
    isHot: false,
    origin: 'Santa Barbara Organics',
    description: 'Hộp 4 trái • Độ béo ngậy cao, thu hái đúng độ già đạt độ chín lý tưởng trong 2 ngày.',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=700&auto=format&fit=crop&q=80',
  },
  {
    id: 903,
    name: 'Nấm Mồng Gà Rừng Vàng Tươi (Chanterelle)',
    categoryName: 'Nấm & Thảo Mộc',
    categoryId: 3,
    price: 115000,
    stockQuantity: 8,
    isAvailable: true,
    isHot: true,
    origin: 'Mendocino Coast Ridge',
    description: '250g • Hái tự nhiên trên thảm lá thông lúc 05:40 AM; thoang thoảng mùi mơ chín thanh khiết.',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&auto=format&fit=crop&q=80',
  },
  {
    id: 904,
    name: 'Bánh Mì Men Chua Ô Liu Castelvetrano',
    categoryName: 'Bánh Mì Men Tự Nhiên',
    categoryId: 4,
    price: 72500,
    stockQuantity: 19,
    isAvailable: true,
    isHot: false,
    origin: 'Lò Bánh Flour & Water',
    description: '750g • Lên men chậm 36 giờ kèm quả ô liu xanh Sicily đập dập thơm lừng, vỏ giòn phồng rộp.',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80',
  },
  {
    id: 905,
    name: 'Bơ Lạt Lên Men Ủ Mật Ong Hoa Rừng',
    categoryName: 'Bơ Sữa Đồng Cỏ',
    categoryId: 5,
    price: 68000,
    stockQuantity: 9,
    isAvailable: true,
    isHot: true,
    origin: 'Trang Trại Clover Valley',
    description: '200g • Đánh thủ công đạt 86% độ béo tự nhiên, hòa quyện mật ong rừng hoa cơm cháy.',
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=700&auto=format&fit=crop&q=80',
  },
  {
    id: 906,
    name: 'Phi Lê Cá Hồi Sockeye Tự Nhiên Ướp Đá',
    categoryName: 'Thủy Hải Sản Tươi',
    categoryId: 6,
    price: 185000,
    stockQuantity: 15,
    isAvailable: true,
    isHot: false,
    origin: 'Đánh Bắt Vịnh Bristol',
    description: '500g • Cá hồi tự nhiên đánh bắt thủ công bền vững, thịt đỏ ruby giàu hàm lượng omega-3.',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700&auto=format&fit=crop&q=80',
  },
];

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 1, name: 'Rau Củ & Thảo Mộc' },
  { id: 2, name: 'Trái Cây Tươi' },
  { id: 3, name: 'Nấm Tự Nhiên' },
  { id: 4, name: 'Bánh Mì Men Sourdough' },
  { id: 5, name: 'Bơ Sữa Đồng Cỏ' },
  { id: 6, name: 'Hải Sản Đánh Bắt' },
];

export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Cart & Auth store
  const { addToCart, items: cartItems } = useCartStore();
  const { isAdmin } = useAuthStore();

  // Fetch Categories
  const { data: serverCategories = [], isLoading: isCategoriesLoading } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      return await axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories');
    },
    retry: 1,
  });

  // Fetch Products
  const {
    data: serverProducts = [],
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useQuery<ProductItem[]>({
    queryKey: ['products', selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId
        ? `/api/products?categoryId=${selectedCategoryId}`
        : '/api/products';
      return await axiosClient.get<ProductItem[], ProductItem[]>(url);
    },
    retry: 1,
  });

  // Ưu tiên dữ liệu từ server, nếu chưa có thì dùng danh sách đặc sản tuyển chọn
  const categories = serverCategories.length > 0 ? serverCategories : FALLBACK_CATEGORIES;
  const products =
    serverProducts.length > 0
      ? serverProducts
      : selectedCategoryId === null
      ? FALLBACK_SEASONAL_PRODUCTS
      : FALLBACK_SEASONAL_PRODUCTS.filter((p) => p.categoryId === selectedCategoryId);

  // Số lượng chọn cho từng sản phẩm
  const getSelectedQuantity = (productId: number) => quantities[productId] || 1;

  const handleStepQuantity = (productId: number, delta: number, maxStock: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleQuickAdd = (product: ProductItem) => {
    const qty = getSelectedQuantity(product.id);
    setAddingProductId(product.id);

    setTimeout(() => {
      addToCart(product, qty);
      setAddingProductId(null);
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 1800);
    }, 350);
  };

  // Cuộn mượt đến section mong muốn
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Lọc category theo từ khóa khi bấm vào bento card
  const handleBentoCategoryClick = (keyword: string) => {
    const matched = categories.find((c) =>
      c.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (matched) {
      setSelectedCategoryId(matched.id);
    } else {
      setSelectedCategoryId(null);
    }
    scrollToSection('seasonal-curation');
  };

  // Curated Food Image Mapping (ưu tiên ảnh thật Cloudinary từ Backend)
  const getProductImage = (product: ProductItem) => {
    if (product.imageUrl) return product.imageUrl;
    const name = product.name.toLowerCase();
    const id = product.id;
    if (name.includes('bò') || name.includes('thịt')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('rau') || name.includes('cải') || name.includes('nấm')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('cá') || name.includes('tôm') || name.includes('hải sản')) {
      return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('quả') || name.includes('trái') || name.includes('dâu') || name.includes('táo')) {
      return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80';
    }
    return `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&auto=format&fit=crop&q=80&sig=${id}`;
  };

  return (
    <div className="w-full bg-[#f1fcf7] text-[#141e1b] font-hanken antialiased overflow-x-hidden">
      {/* =========================================================================
          1. DYNAMIC OPERATIONAL TICKER (Avant-Garde Live Dispatch)
      ========================================================================= */}
      <div className="w-full bg-[#006c49] text-white py-2.5 overflow-hidden shadow-sm border-b border-[#005236]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs tracking-wider uppercase font-semibold">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[#6ffbbe]">
              <span className="w-2 h-2 rounded-full bg-[#6ffbbe] animate-ping" />
              CHU TRÌNH BÌNH MINH #108 ĐANG HOẠT ĐỘNG
            </span>
            <span className="hidden md:inline text-white/40">/</span>
            <span className="hidden md:inline text-emerald-100 font-normal">
              ĐIỀU PHỐI NÔNG SẢN TỪ ĐÀ LẠT, MỘC CHÂU & MIỀN TÂY
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-emerald-200 text-[11px]">
              VẬN CHUYỂN SIÊU LẠNH ZERO-HOLD
            </span>
            <span className="bg-[#10b981] text-[#00422b] text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
              ĐỒNG BỘ TỒN KHO THỜI GIAN THỰC
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. HERO SECTION: Avant-Garde Asymmetric Editorial Canvas
      ========================================================================= */}
      <section className="relative w-full overflow-hidden pt-10 pb-20 lg:pt-14 lg:pb-28">
        {/* Ambient Organic Lighting Orbs */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -right-24 w-[32rem] h-[32rem] bg-teal-300/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Live Status Pills Floating Cluster */}
          <div className="flex flex-wrap items-center gap-2.5 mb-8">
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-emerald-100/60 hover:scale-[1.01] transition-transform">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-xs uppercase text-[#306855] font-bold tracking-wider">
                🌿 14 Nông Trại Hữu Cơ Đang Thu Hoạch Sớm
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm border border-slate-200/60 text-xs text-slate-600 font-medium">
              <Zap className="w-3.5 h-3.5 text-[#006c49]" />
              <span>Thời Gian Điều Phối Trung Bình: 18 Phút</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm border border-slate-200/60 text-xs text-slate-600 font-medium">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>4.96/5 Từ 42,000+ Gia Đình Việt</span>
            </div>
          </div>

          {/* Main Asymmetric Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Cột chữ (6 cols) */}
            <div className="lg:col-span-6 flex flex-col items-start pr-0 lg:pr-4">
              <span className="inline-flex items-center gap-1.5 text-[#006c49] font-extrabold text-xs uppercase tracking-widest mb-4 bg-emerald-100/80 px-3.5 py-1 rounded-full border border-emerald-200">
                <Sprout className="w-3.5 h-3.5" /> Chuỗi Cung Ứng Nông Sản Tự Động
              </span>

              <h1 className="font-syne text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#141e1b] tracking-tight leading-[1.08] mb-6">
                Nông Sản <span className="text-[#006c49] italic">Đầu Mùa.</span> Từ Vườn Đến Bàn Ăn Trong 2 Giờ.
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mb-8 font-normal">
                Nguồn gốc thảo mộc rõ ràng từ các nông trại sạch bản địa, nói không với ủ kho bảo quản lạnh dài ngày. Rau xanh hái lúc bình minh, bánh mì men tự nhiên và bơ sữa sạch đóng gói trong hộp sinh học 100% tự phân hủy.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => scrollToSection('seasonal-curation')}
                  className="inline-flex items-center justify-center gap-2 bg-[#ff7d45] hover:bg-[#e8590c] text-white px-7 py-3.5 rounded-full text-sm font-bold tracking-wide shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Khám Phá Mẻ Thu Hoạch Sáng Nay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('transparency-ledger')}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#006c49] border border-emerald-200 px-6 py-3.5 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-all"
                >
                  <PlayCircle className="w-4 h-4 text-[#006c49]" />
                  <span>Quy Trình Giao Lạnh 35 Phút</span>
                </button>
                {isAdmin() && (
                  <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-5 py-3 rounded-full text-xs font-bold transition-all"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Trang Quản Trị</span>
                  </Link>
                )}
              </div>

              {/* Micro Proof Stats */}
              <div className="mt-12 pt-8 border-t border-emerald-200/60 w-full flex items-center justify-between max-w-lg">
                <div className="flex flex-col">
                  <span className="font-syne text-2xl sm:text-3xl font-extrabold text-[#006c49]">0 giờ</span>
                  <span className="text-xs uppercase text-slate-500 font-medium tracking-wider mt-0.5">
                    Lưu Kho Hóa Chất
                  </span>
                </div>
                <div className="h-10 w-px bg-emerald-200" />
                <div className="flex flex-col">
                  <span className="font-syne text-2xl sm:text-3xl font-extrabold text-[#006c49]">100%</span>
                  <span className="text-xs uppercase text-slate-500 font-medium tracking-wider mt-0.5">
                    Giống Thuần VietGAP
                  </span>
                </div>
                <div className="h-10 w-px bg-emerald-200" />
                <div className="flex flex-col">
                  <span className="font-syne text-2xl sm:text-3xl font-extrabold text-[#306855]">Zero</span>
                  <span className="text-xs uppercase text-slate-500 font-medium tracking-wider mt-0.5">
                    Đạm Vô Cơ & Thuốc Trừ Sâu
                  </span>
                </div>
              </div>
            </div>

            {/* Cột Artboard & Pins (6 cols) */}
            <div className="lg:col-span-6 relative mt-8 lg:mt-0">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border border-emerald-100/80 aspect-[4/3] group">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80"
                  alt="Mâm nông sản thu hoạch sáng sớm gồm dâu tây đỏ mọng, bánh mì nướng củi, dầu ô liu và rau xanh hữu cơ"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                {/* Pin 1: Dâu Tây Mộc Châu */}
                <div className="absolute top-8 left-6 bg-white/95 backdrop-blur-md rounded-full py-1.5 px-3.5 shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer border border-white/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">
                      Dâu Tây Mộc Châu
                    </span>
                    <span className="text-[10px] text-slate-500">Thu hoạch lúc 05:00 AM hôm nay</span>
                  </div>
                </div>

                {/* Pin 2: Bánh mì men nướng củi */}
                <div className="absolute bottom-20 right-6 bg-white/95 backdrop-blur-md rounded-full py-1.5 px-3.5 shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer border border-white/60">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">
                      Bánh Mì Men Sourdough
                    </span>
                    <span className="text-[10px] text-slate-500">Lò nướng củi ra lò 04:30 AM</span>
                  </div>
                </div>

                {/* Thanh thông tin dưới ảnh */}
                <div className="absolute bottom-4 left-5 right-5 bg-white/90 backdrop-blur-xl py-2 px-4 rounded-2xl flex items-center justify-between shadow-md border border-white/60">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#006c49]" />
                    <span className="text-xs font-bold text-slate-800">
                      Lô Nông Sản Tươi #4102
                    </span>
                  </div>
                  <span className="text-[11px] font-bold bg-[#10b981] text-[#00422b] px-2.5 py-0.5 rounded-full">
                    Còn 34 Suất Đặt Sớm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. CURATED EDITORIAL BENTO CATEGORIES GRID
      ========================================================================= */}
      <section className="w-full bg-[#ebf6f1]/80 py-20 border-y border-emerald-100/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Intro Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-[#006c49] mb-1.5">
                <span className="text-xs uppercase tracking-widest font-extrabold">
                  Phân Mục Nông Sản 01
                </span>
              </div>
              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-[#141e1b] tracking-tight">
                Chuyên Mục Nông Sản Tuyển Chọn
              </h2>
              <p className="text-slate-600 text-base mt-2">
                Nông sản thuần tự nhiên được phân loại theo thổ nhưỡng tiểu vùng khí hậu, quy trình canh tác hữu cơ và thời điểm thu hái tối ưu.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 bg-white/80 px-3.5 py-1.5 rounded-full border border-emerald-200/50 shadow-sm">
                Cập nhật sáng nay: <strong className="text-[#006c49]">364 Trang Trại & Hộ Canh Tác</strong>
              </span>
            </div>
          </div>

          {/* 6 Bento Editorial Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EDITORIAL_CATEGORIES.map((item) => (
              <div
                key={item.id}
                onClick={() => handleBentoCategoryClick(item.queryKeyword)}
                className="group relative rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-5 cursor-pointer border border-emerald-100/60 hover:-translate-y-1"
              >
                <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#006c49] uppercase shadow-sm">
                    {item.tag}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                    {item.subtag}
                  </span>
                </div>
                <div>
                  <h3 className="font-syne text-lg font-bold text-slate-900 group-hover:text-[#006c49] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 mb-4 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-[#006c49]">
                    <span>Xem mẻ thu hoạch mới →</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. TODAY'S PRIME SEASONAL CURATION (Visual Product Grid with Real API Data)
      ========================================================================= */}
      <section className="w-full py-20" id="seasonal-curation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100/80 px-3 py-0.5 rounded-full mb-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[11px] uppercase text-[#006c49] font-extrabold tracking-wider">
                  Hạn Ngạch Thu Hoạch Trong Ngày
                </span>
              </div>
              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-[#141e1b] tracking-tight">
                Mẻ Nông Sản Bình Minh Hôm Nay
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Lượng tồn kho thực tế thu hoạch từ 04:00 - 07:00 sáng nay, khóa tồn kho theo thời gian thực chống đụng đơn.
              </p>
            </div>

            {/* Nút Refresh */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchProducts()}
                className="p-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-[#006c49] transition-colors shadow-sm"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs (Horizontal Scrollable Pills) */}
          <div
            className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 -mx-4 px-4 scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                selectedCategoryId === null
                  ? 'bg-[#006c49] text-white shadow-md shadow-emerald-900/20'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200/80'
              }`}
            >
              Tất Cả Nông Sản ({products.length})
            </button>

            {isCategoriesLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-28 h-8 bg-slate-200 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#006c49] text-white shadow-md shadow-emerald-900/20'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>

          {/* PRODUCTS GRID */}
          {isProductsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-96 bg-white rounded-2xl border border-slate-200/70 p-4 animate-pulse flex flex-col justify-between">
                  <div className="h-56 bg-slate-100 rounded-xl mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-10 bg-slate-100 rounded-full mt-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const isOutOfStock = product.stockQuantity === 0 || !product.isAvailable;
                const inCartItem = cartItems.find((i) => i.id === product.id);
                const selectedQty = getSelectedQuantity(product.id);
                const isAdding = addingProductId === product.id;
                const isAdded = addedProductId === product.id;
                const isLowStock = !isOutOfStock && product.stockQuantity <= 12;

                return (
                  <article
                    key={product.id}
                    className={`group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-slate-200/80 hover:-translate-y-1 ${
                      isOutOfStock ? 'opacity-65 select-none' : ''
                    }`}
                  >
                    <div>
                      {/* Product Image Frame with Badges */}
                      <div className="relative rounded-xl overflow-hidden h-60 mb-3.5 bg-slate-50 border border-slate-100">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {product.isHot && (
                            <span className="inline-flex items-center gap-1 bg-[#ff7d45] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                              <Flame className="w-3 h-3 fill-white" /> ĐẶC SẢN HOT
                            </span>
                          )}
                          <span className="bg-white/95 backdrop-blur-md text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm border border-slate-100">
                            {product.origin ? `Xuất xứ: ${product.origin}` : 'Nông trại VietGAP'}
                          </span>
                        </div>

                        {/* Top Right Out of Stock Badge */}
                        {isOutOfStock && (
                          <span className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                            Hết hàng
                          </span>
                        )}

                        {/* Low Stock Allotment Progress Bar */}
                        {isLowStock && (
                          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md py-1 px-3 rounded-full flex items-center justify-between shadow-sm border border-white/80">
                            <span className="text-[10px] font-bold text-amber-700">
                              Chỉ còn {product.stockQuantity} suất thu hoạch
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (product.stockQuantity / 12) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Header & Title */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          {product.categoryName && (
                            <span className="text-[11px] font-bold text-[#006c49] uppercase tracking-wider block mb-0.5">
                              {product.categoryName}
                            </span>
                          )}
                          <Link
                            to={`/products/${product.id}`}
                            className="hover:text-[#006c49] transition-colors"
                          >
                            <h3 className="font-syne font-bold text-slate-900 text-lg leading-snug line-clamp-1 hover:text-[#006c49]">
                              {product.name}
                            </h3>
                          </Link>
                        </div>
                        <span className="font-syne font-extrabold text-[#006c49] text-lg sm:text-xl shrink-0">
                          {product.price?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      {/* Short Description */}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {product.description ||
                          'Nông sản hữu cơ hái sớm trong ngày, giữ nguyên hương vị và độ ngọt tự nhiên từ đất mẹ.'}
                      </p>
                    </div>

                    {/* Stepper + Quick Add Button Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-3 rounded-b-2xl">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleStepQuantity(product.id, -1, product.stockQuantity)}
                          disabled={isOutOfStock || selectedQty <= 1}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 w-5 text-center">
                          {selectedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStepQuantity(product.id, 1, product.stockQuantity)}
                          disabled={isOutOfStock || selectedQty >= product.stockQuantity}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Quick Add Button */}
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        disabled={isOutOfStock || isAdding}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-sm transition-all duration-200 ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                            : isAdded
                            ? 'bg-[#10b981] text-white shadow-emerald-500/30'
                            : 'bg-[#ff7d45] hover:bg-[#e8590c] text-white hover:scale-[1.02] active:scale-[0.98] shadow-orange-500/20'
                        }`}
                      >
                        {isOutOfStock ? (
                          <span>Hết hàng</span>
                        ) : isAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang thêm...</span>
                          </>
                        ) : isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã thêm!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Thêm Nhanh</span>
                            {inCartItem ? (
                              <span className="bg-black/20 text-white px-1.5 py-0.2 rounded-full text-[10px] ml-0.5">
                                ×{inCartItem.quantity}
                              </span>
                            ) : null}
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          5. FARM-TO-DOOR TRANSPARENCY LEDGER (4-Step Timeline)
      ========================================================================= */}
      <section
        className="w-full bg-[#ebf6f1] py-20 relative overflow-hidden border-t border-emerald-100"
        id="transparency-ledger"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs uppercase text-[#006c49] tracking-widest font-extrabold bg-emerald-200/60 px-3.5 py-1 rounded-full border border-emerald-300/60">
              Tính Toàn Vẹn Của Chuỗi Cung Ứng
            </span>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-[#141e1b] tracking-tight mt-3">
              Quy Trình Chuỗi Lạnh Khép Kín Trong 2-3 Giờ
            </h2>
            <p className="text-slate-600 text-base mt-2">
              Các siêu thị truyền thống lưu trữ nông sản từ 12 đến 21 ngày trong kho khí nitơ. Chúng tôi loại bỏ hoàn toàn trung tâm lưu kho lưu hóa chất, đưa nông sản tươi thẳng từ đất mẹ đến bàn ăn nhà bạn.
            </p>
          </div>

          {/* 4-Step Interactive Horizontal Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-emerald-100/80 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-syne text-3xl font-extrabold text-[#006c49]">04:30</span>
                  <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-[#006c49] px-2.5 py-0.5 rounded-full">
                    GIAI ĐOẠN 01
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] mb-4 group-hover:scale-110 transition-transform">
                  <Leaf className="w-6 h-6" />
                </div>
                <h4 className="font-syne text-lg font-bold text-slate-900 mb-2">
                  Thu Hoạch Bình Minh
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thu hoạch bằng tay tại ruộng khi áp suất tế bào đạt đỉnh. Khoáng chất và độ ngọt tự nhiên được khóa trọn vẹn mà không cần rửa qua hóa chất.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[#006c49] text-[11px] font-bold">
                <Check className="w-4 h-4 text-[#10b981]" />
                <span>Kiểm Định Sinh Học Thổ Nhưỡng</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-emerald-100/80 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-syne text-3xl font-extrabold text-[#006c49]">06:15</span>
                  <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-[#006c49] px-2.5 py-0.5 rounded-full">
                    GIAI ĐOẠN 02
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] mb-4 group-hover:scale-110 transition-transform">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <h4 className="font-syne text-lg font-bold text-slate-900 mb-2">
                  Đóng Hộp Sợi Nấm Sinh Học
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vật liệu cách nhiệt 100% tự phân hủy tại nhà từ sợi nấm. Quét quang học hồng ngoại kiểm tra chính xác chỉ số độ ngọt Brix từng lô hàng.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[#306855] text-[11px] font-bold">
                <Leaf className="w-4 h-4 text-[#10b981]" />
                <span>100% Không Nhựa Dùng 1 Lần</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-emerald-100/80 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-syne text-3xl font-extrabold text-[#006c49]">08:00</span>
                  <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-[#006c49] px-2.5 py-0.5 rounded-full">
                    GIAI ĐOẠN 03
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#ebf6f1] flex items-center justify-center text-[#006c49] mb-4 group-hover:scale-110 transition-transform">
                  <Truck className="w-6 h-6" />
                </div>
                <h4 className="font-syne text-lg font-bold text-slate-900 mb-2">
                  Xe Điện Lạnh 4°C
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đội xe chuyên dụng kiểm soát nhiệt độ tĩnh 4°C di chuyển thẳng từ trang trại đối tác, giữ độ ẩm nguyên bản không làm héo rau quả.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[#006c49] text-[11px] font-bold">
                <ThermometerSnowflake className="w-4 h-4 text-[#10b981]" />
                <span>Vận Chuyển Giảm Phát Thải</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-emerald-100/80 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-syne text-3xl font-extrabold text-[#ff7d45]">09:15</span>
                  <span className="text-[10px] uppercase font-extrabold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
                    GIAI ĐOẠN 04
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#ff7d45] mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-syne text-lg font-bold text-slate-900 mb-2">
                  Giao Lạnh Tận Cửa 35 Phút
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bàn giao an toàn tận tay khách hàng kèm nhật ký nhiệt độ thực tế in trên hóa đơn. Cam kết hoàn tiền 100% nếu nông sản không tươi ngon.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[#ff7d45] text-[11px] font-bold">
                <Award className="w-4 h-4 text-[#ff7d45]" />
                <span>Bảo Chứng Độ Tươi Tuyệt Đối</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. CUSTOMER SOCIAL PROOF & PARTNER TESTIMONIALS
      ========================================================================= */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase text-[#006c49] tracking-widest font-extrabold bg-emerald-100 px-3.5 py-1 rounded-full">
              Cộng Đồng Ẩm Thực Tinh Hoa
            </span>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-[#141e1b] tracking-tight mt-3">
              Được Tin Dùng Bởi Đầu Bếp & Gia Đình Việt
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Testimonial 1: Chef */}
            <div className="bg-[#ebf6f1]/60 p-7 rounded-2xl flex flex-col justify-between border border-emerald-100/70">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed mb-6 font-normal">
                  "Nông sản giữ được trọn vẹn độ giòn và hương thơm đậm đà đặc trưng mà trước đây tôi chỉ tìm thấy khi tự mình bước ra luống rau lúc 5 giờ sáng. Điều này đã thay đổi hoàn toàn thực đơn nếm thử tại nhà hàng."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-emerald-200/50">
                <img
                  src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80"
                  alt="Bếp trưởng Elena Rostova"
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-white"
                />
                <div className="flex flex-col text-left">
                  <span className="font-syne font-bold text-slate-900 text-sm">
                    Chef Elena Rostova
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hai Sao Michelin • Nhà Hàng Acre
                  </span>
                </div>
              </div>
            </div>

            {/* Testimonial 2: Farmer Partner */}
            <div className="bg-[#ebf6f1]/60 p-7 rounded-2xl flex flex-col justify-between border border-emerald-100/70">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed mb-6 font-normal">
                  "Các đơn vị trung gian truyền thống thường ép giá và để rau củ lưu bãi nhiều ngày. Mô hình phân phối trực tiếp ở đây giúp nông dân chúng tôi thu hoạch đúng nhu cầu và nhận thanh toán công bằng ngay trong sáng sớm."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-emerald-200/50">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                  alt="Chú Nguyễn Văn Thắng - Nông dân Mộc Châu"
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-white"
                />
                <div className="flex flex-col text-left">
                  <span className="font-syne font-bold text-slate-900 text-sm">
                    Nguyễn Văn Thắng
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Nông Dân Thế Hệ Thứ 3 • Nông Trại Mộc Châu
                  </span>
                </div>
              </div>
            </div>

            {/* Testimonial 3: Subscriber */}
            <div className="bg-[#ebf6f1]/60 p-7 rounded-2xl flex flex-col justify-between border border-emerald-100/70">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed mb-6 font-normal">
                  "Trước đây hai bé nhà mình rất lười ăn rau xanh, nhưng từ khi nhận hộp nông sản tươi về thì cả nhà đều mê. Cà rốt ngọt dịu mùi đất mẹ, bánh mì giao tới vẫn còn thoảng mùi ấm. Mình đã hủy hẳn việc đi siêu thị truyền thống."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-emerald-200/50">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
                  alt="Chị Mai Phương"
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-white"
                />
                <div className="flex flex-col text-left">
                  <span className="font-syne font-bold text-slate-900 text-sm">
                    Trần Mai Phương
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hội Viên Gói Tuần (18 Tháng Đồng Hành)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. INTERACTIVE CONVERSION CTA BANNER
      ========================================================================= */}
      <section className="w-full pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-[#006c49] text-white rounded-3xl p-8 sm:p-14 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 border border-[#005236]">
            <div className="relative z-10 max-w-xl text-left">
              <span className="text-[11px] uppercase text-[#6ffbbe] tracking-widest font-extrabold bg-white/10 px-3.5 py-1 rounded-full border border-white/15">
                Không Ràng Buộc • Hủy Bất Kỳ Lúc Nào
              </span>
              <h2 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mt-4 mb-3 leading-tight">
                Bắt Đầu Trải Nghiệm Mẻ Nông Sản Sáng Nay.
              </h2>
              <p className="text-emerald-100 text-sm sm:text-base leading-relaxed max-w-lg">
                Gia nhập hơn 42,000 hộ gia đình đang tận hưởng nông sản hữu cơ hái sớm giao lạnh trong 2 giờ mỗi ngày.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => scrollToSection('seasonal-curation')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#ff7d45] hover:bg-[#e8590c] text-white px-8 py-4 rounded-full text-sm font-bold tracking-wide shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Mua Nông Sản Hôm Nay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/track-order"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 px-7 py-4 rounded-full text-sm font-semibold transition-all shadow-sm"
              >
                <span>Tra Cứu Đơn Hàng</span>
              </Link>
            </div>

            {/* Decorative Botanical Ambient Circles */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#10b981]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          </div>
        </div>
      </section>
    </div>
  );
}
