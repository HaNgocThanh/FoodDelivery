import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  Star,
  ShoppingCart,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Package,
  ShieldQuestion,
  CheckCircle2,
  Truck,
  Leaf,
  Thermometer,
  Clock,
  Award,
  Compass,
  UtensilsCrossed,
  Plus,
  Minus,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export interface ReviewItem {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetailItem {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  origin?: string;
  isHot: boolean;
  isAvailable: boolean;
  averageRating: number;
  imageUrl?: string;
  reviews?: ReviewItem[];
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToCart = useCartStore((state) => state.addToCart);
  const { user } = useAuthStore();

  const productId = Number(slug);

  // Interaction States
  const [quantity, setQuantity] = useState<number>(1);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mode: onetime vs subscription
  const [purchaseMode, setPurchaseMode] = useState<'onetime' | 'subscription'>('onetime');
  const [subFrequency, setSubFrequency] = useState<'weekly' | 'biweekly'>('weekly');

  // Dossier Tabs
  const [dossierTab, setDossierTab] = useState<'farm' | 'taste' | 'storage' | 'facts'>('farm');

  // Interactive Bottom Tabs: Reviews vs QA
  const [communityTab, setCommunityTab] = useState<'reviews' | 'qa'>('reviews');
  const [questionText, setQuestionText] = useState<string>('');

  // Selected Gallery Thumbnail
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState<number>(0);
  const [isAddingBasket, setIsAddingBasket] = useState<boolean>(false);
  const [bundleAdded, setBundleAdded] = useState<boolean>(false);

  // Fetch product detail
  const { data: product, isLoading, isError, error } = useQuery<ProductDetailItem>({
    queryKey: ['productDetail', productId],
    queryFn: async () => {
      if (isNaN(productId)) throw new Error('Mã sản phẩm không hợp lệ.');
      return await axiosClient.get<ProductDetailItem, ProductDetailItem>(`/api/products/${productId}`);
    },
    enabled: !isNaN(productId) && productId > 0,
  });

  // Mutation Submit Review
  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      return await axiosClient.post(`/api/products/${productId}/reviews`, { rating, comment });
    },
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: 'Cảm ơn bạn đã gửi đánh giá cho nông sản mùa vụ!',
      });
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['productDetail', productId] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Không thể gửi đánh giá. Vui lòng kiểm tra lại.',
      });
    },
  });

  // Query check purchase status
  const { data: myOrders = [] } = useQuery<any[]>({
    queryKey: ['myOrders', user?.id],
    queryFn: async ({ signal }) => {
      return await axiosClient.get<any[], any[]>('/api/orders/my-orders', { signal });
    },
    enabled: !!user,
  });

  const hasPurchased = myOrders.some(
    (o) =>
      (o.status === 'Completed' || o.status === 4) &&
      o.details?.some((d: any) => d.productId === productId)
  );

  // Fetch Q&A questions
  const { data: questions = [], refetch: refetchQuestions } = useQuery<any[]>({
    queryKey: ['productQuestions', productId],
    queryFn: async () => {
      if (isNaN(productId)) return [];
      return await axiosClient.get<any[], any[]>(`/api/questions/product/${productId}`);
    },
    enabled: !isNaN(productId) && productId > 0,
  });

  // Mutation to submit a new question
  const questionMutation = useMutation({
    mutationFn: async (text: string) => {
      return await axiosClient.post('/api/questions', { productId, questionText: text });
    },
    onSuccess: () => {
      setQuestionText('');
      setNotification({ type: 'success', message: 'Gửi thắc mắc thành công! Đội ngũ nông nghiệp sẽ phản hồi sớm.' });
      refetchQuestions();
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err.message || 'Không thể gửi câu hỏi. Vui lòng thử lại.' });
    }
  });

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    questionMutation.mutate(questionText);
  };

  const handleAddToCart = () => {
    if (!product) return;
    setIsAddingBasket(true);
    addToCart(product, quantity);
    setTimeout(() => {
      setIsAddingBasket(false);
      setNotification({
        type: 'success',
        message: `Đã thêm ${quantity} x ${product.name} vào giỏ hàng vận chuyển!`,
      });
    }, 450);
  };

  const handleAddBundle = () => {
    if (!product) return;
    setBundleAdded(true);
    // Add primary product and notify
    addToCart(product, 1);
    setNotification({
      type: 'success',
      message: 'Đã thêm trọn bộ Bộ Ẩm Thực Caprese kèm nông sản vào giỏ hàng!',
    });
    setTimeout(() => setBundleAdded(false), 3000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập nội dung nhận xét hương vị nông sản.' });
      return;
    }
    reviewMutation.mutate({ rating, comment: comment.trim() });
  };

  // Gallery images mock/fallback for multi-angle showcase
  const defaultProductImg =
    product?.imageUrl ||
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=80';

  const galleryItems = [
    {
      title: 'Khay Nông Sản',
      img: defaultProductImg,
      alt: product?.name || 'Khay thu hoạch nông sản',
    },
    {
      title: 'Giàn Sương Sớm',
      img: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=800&q=80',
      alt: 'Nông trại thu hoạch buổi sáng',
    },
    {
      title: 'Lát Cắt Mọng Nước',
      img: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?auto=format&fit=crop&w=800&q=80',
      alt: 'Lát cắt nông sản tươi nguyên vị',
    },
    {
      title: 'Đóng Gói Sinh Học',
      img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
      alt: 'Hộp xốp sinh học giữ lạnh',
    },
  ];

  // Price calculations
  const originalPrice = product ? Math.round(product.price * 1.15) : 0;
  const currentPriceUnit =
    purchaseMode === 'subscription' && product
      ? Math.round(product.price * 0.85)
      : product?.price || 0;
  const totalPriceCalculated = currentPriceUnit * quantity;

  return (
    <main className="min-h-screen bg-[#f1fcf7] text-[#141e1b] font-hanken antialiased pb-20">
      {/* ────────────────────────── BREADCRUMB & FAST CONTEXT BAR ────────────────────────── */}
      <section className="w-full bg-[#ebf6f1] border-b border-emerald-100/80 py-2.5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <nav className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#006c49] font-medium transition-colors">
              Trang Chủ
            </Link>
            <span className="text-slate-300">/</span>
            <Link to="/" className="hover:text-[#006c49] font-medium transition-colors">
              {product?.categoryName || 'Nông Sản Mùa Vụ'}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#006c49] font-bold truncate max-w-[200px] sm:max-w-none">
              {product?.name || 'Chi Tiết Sản Phẩm'}
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[#006c49] text-[11px] font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span>Chuỗi Lạnh Express #VH-9022</span>
            </div>
            <span className="hidden sm:inline text-slate-500 font-medium text-[11px]">
              Trạm Nông Sản Địa Phương → Tuyến Nội Thành 35 Phút
            </span>
          </div>
        </div>
      </section>

      {/* ────────────────────────── TOAST THÔNG BÁO ────────────────────────── */}
      {notification && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-4">
          <div
            role="alert"
            className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm shadow-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-[#006c49]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-1 rounded bg-white/60 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────── LOADING HOẶC LỖI ────────────────────────── */}
      {isLoading && (
        <div className="py-36 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-[#006c49]" />
          <p className="text-sm font-semibold font-syne text-[#006c49]">Đang kết nối dữ liệu mẻ nông sản...</p>
        </div>
      )}

      {isError && (
        <div className="py-20 max-w-xl mx-auto px-4 text-center">
          <div className="p-8 bg-white border border-red-200 rounded-3xl shadow-sm space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold font-syne text-red-800">Không thể tải thông tin sản phẩm</h2>
            <p className="text-xs text-red-600">
              {(error as any)?.message || 'Vui lòng kiểm tra lại đường dẫn hoặc kết nối máy chủ.'}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-[#006c49] text-white text-xs font-bold rounded-full transition shadow hover:bg-[#005236] cursor-pointer"
            >
              Quay lại trang trước
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────── MAIN PRODUCT STAGE (PRODUCT LOADED) ────────────────────────── */}
      {product && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 flex flex-col gap-12">
          {/* 2-COLUMN HERO CONVERSION GRID (Left 7 cols, Right 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* ─────────────── CỘT TRÁI (7 COLS): MASTER IMAGE SHOWCASE & MOSAIC ─────────────── */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Master Showcase Card */}
              <div className="relative w-full rounded-3xl overflow-hidden bg-white shadow-md border border-emerald-100 group">
                {/* Badges Floating Strip */}
                <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[#00422b] shadow-sm text-[11px] font-bold uppercase tracking-wider">
                    <Leaf className="w-3.5 h-3.5 text-[#006c49]" />
                    Chứng Nhận Hữu Cơ • VietGAP
                  </span>
                  <span className="inline-flex items-center gap-1 bg-[#006c49] text-white px-3 py-1 rounded-full shadow-sm text-[11px] font-bold uppercase tracking-wider">
                    <Thermometer className="w-3.5 h-3.5" />
                    Không Lưu Kho Cũ
                  </span>
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm text-[#a63b00] text-[11px] font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#ff7d45] animate-pulse" />
                    Thu Hoạch Sáng Nay • 05:15 AM
                  </span>
                </div>

                {/* Master Image Frame */}
                <div className="w-full aspect-[4/3] md:aspect-[16/11] relative overflow-hidden bg-[#e5f0eb] flex items-center justify-center">
                  <img
                    src={galleryItems[selectedGalleryIdx]?.img || defaultProductImg}
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>

                {/* Floating Quick Sensory Callout */}
                <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-emerald-100/60 gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#006c49]" />
                    <span className="text-xs text-slate-800">
                      Độ Ngọt Cảm Quan (Brix): <strong className="text-[#006c49] font-bold">8.7 ± 0.2</strong> (Độ Tươi Đỉnh Cao)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-[#ebf6f1] px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                    Giống Thuần Chủng Non-GMO
                  </span>
                </div>
              </div>

              {/* Thumbnail Mosaic Selector */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                {galleryItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGalleryIdx(idx)}
                    className={`relative rounded-2xl overflow-hidden aspect-[4/3] bg-white shadow-sm transition-all duration-200 cursor-pointer border-2 ${
                      selectedGalleryIdx === idx
                        ? 'border-[#006c49] scale-[1.02] shadow-md'
                        : 'border-transparent hover:border-emerald-200'
                    }`}
                  >
                    <img src={item.img} alt={item.alt} className="w-full h-full object-cover" />
                    <div
                      className={`absolute inset-0 transition-opacity ${
                        selectedGalleryIdx === idx ? 'bg-[#006c49]/15' : 'bg-black/10'
                      }`}
                    />
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] sm:text-[10px] text-center font-bold uppercase bg-black/60 text-white rounded-lg py-[2px] truncate px-1">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>

              {/* Rapid Origin Anchor Box */}
              <div className="bg-[#ebf6f1] p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm border border-emerald-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                    <img
                      src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80"
                      alt="Nông dân đối tác"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-syne font-bold text-sm text-slate-900">
                        Hợp Tác Xã Nông Sản Hữu Cơ Đà Lạt
                      </span>
                      <ShieldCheck className="w-4 h-4 text-[#006c49] shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {product.origin || 'Lạc Dương, Lâm Đồng'} • 24.5 km từ kho lạnh điều phối
                    </p>
                  </div>
                </div>
                <a
                  href="#dossier"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] uppercase font-bold text-[#006c49] hover:text-[#005236] bg-white px-3 py-1.5 rounded-full shadow-sm transition-colors"
                >
                  <span>Hồ Sơ Đất Trồng</span>
                  <span>↓</span>
                </a>
              </div>
            </div>

            {/* ─────────────── CỘT PHẢI (5 COLS): BUY BOX & LOGISTICS ─────────────── */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col gap-4">
                {/* Category & Agronomic Line */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#306855] bg-[#b4efd6] px-3 py-0.5 rounded-full">
                    {product.categoryName || 'Nông Sản Hữu Cơ'} • Mẻ Đơn Lẻ
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#006c49] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    Giao nhanh 35 phút
                  </span>
                </div>

                {/* Title & Review Row */}
                <div>
                  <h1 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                    {product.name}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {product.description || 'Thu hoạch chọn lọc từ luống mẻ sáng sớm, hương vị trọn vẹn và an lành.'}
                  </p>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(product.averageRating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {(product.averageRating || 4.9).toFixed(1)}
                    </span>
                    <a
                      href="#reviews-section"
                      className="text-xs text-slate-500 hover:text-[#006c49] transition-colors"
                    >
                      ({product.reviews?.length || 18} đánh giá hương vị)
                    </a>
                    <span className="text-[10px] uppercase font-bold text-[#006c49] bg-[#ebf6f1] px-2.5 py-0.5 rounded-full ml-auto">
                      98% Khách Đặt Lại
                    </span>
                  </div>
                </div>

                {/* Price & Unit Matrix */}
                <div className="p-3.5 bg-[#ebf6f1] rounded-2xl flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-syne text-3xl font-black text-[#006c49]">
                      {currentPriceUnit.toLocaleString('vi-VN')} đ
                    </span>
                    {originalPrice > currentPriceUnit && (
                      <span className="text-xs text-slate-400 line-through">
                        {originalPrice.toLocaleString('vi-VN')} đ
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold bg-[#ff7d45] text-white px-2 py-0.5 rounded-full">
                      Tiết kiệm 15%
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">Đã gồm thuế VAT</span>
                </div>

                {/* Harvest Timestamp & Cold-chain Tracker */}
                <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-900 font-bold">
                    <div className="flex items-center gap-1.5 text-[#006c49]">
                      <Clock className="w-4 h-4" />
                      <span className="text-[11px] uppercase tracking-wider">Thời Điểm Thu Hoạch</span>
                    </div>
                    <span className="text-[11px] uppercase text-[#ff7d45] font-black">4 Giờ Trước</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Hái tại luống lúc rạng sáng. Luôn duy trì nhiệt độ từ <strong className="text-slate-800 font-bold">4°C–8°C</strong> suốt quá trình vận chuyển để giữ màng tế bào giòn ngọt, tránh sốc nhiệt làm biến tính dinh dưỡng.
                  </p>
                </div>

                {/* Purchase Configuration Modes: Onetime vs Subscription */}
                <div className="flex flex-col gap-2">
                  <label
                    onClick={() => setPurchaseMode('onetime')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      purchaseMode === 'onetime'
                        ? 'border-[#006c49] bg-[#ebf6f1]/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={purchaseMode === 'onetime'}
                        onChange={() => setPurchaseMode('onetime')}
                        className="w-4 h-4 accent-[#006c49]"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Đặt Một Lần Theo Mẻ</span>
                        <span className="text-[11px] text-slate-500">Giao ngay trong ca xe điện lạnh hôm nay</span>
                      </div>
                    </div>
                    <span className="font-syne font-bold text-sm text-slate-900">
                      {product.price.toLocaleString('vi-VN')} đ
                    </span>
                  </label>

                  <label
                    onClick={() => setPurchaseMode('subscription')}
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${
                      purchaseMode === 'subscription'
                        ? 'border-[#006c49] bg-[#ebf6f1]/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={purchaseMode === 'subscription'}
                          onChange={() => setPurchaseMode('subscription')}
                          className="w-4 h-4 accent-[#006c49]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">Đăng Ký Giao Định Kỳ</span>
                            <span className="text-[9px] uppercase font-bold bg-[#006c49] text-white px-1.5 py-0.5 rounded-full">
                              -15%
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">Giữ slot ưu tiên • Tạm dừng bất kỳ lúc nào</span>
                        </div>
                      </div>
                      <span className="font-syne font-bold text-sm text-[#006c49]">
                        {Math.round(product.price * 0.85).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {purchaseMode === 'subscription' && (
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-600 text-[11px]">Tần suất nhận hàng:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSubFrequency('weekly')}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                              subFrequency === 'weekly'
                                ? 'bg-[#006c49] text-white'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            Mỗi Tuần
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubFrequency('biweekly')}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                              subFrequency === 'biweekly'
                                ? 'bg-[#006c49] text-white'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            2 Tuần / Lần
                          </button>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Stepper & Primary CTA Conversion Section */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  {/* Counter Pill */}
                  <div className="flex items-center justify-between bg-[#ebf6f1] px-3 py-1.5 rounded-full sm:w-36 border border-emerald-200/60">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-[#b4efd6] disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-syne font-bold text-base text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= product.stockQuantity}
                      onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-[#b4efd6] disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Master Conversion Button */}
                  <button
                    type="button"
                    disabled={product.stockQuantity <= 0 || isAddingBasket}
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#ff7d45] hover:bg-[#e8590c] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-full shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    {isAddingBasket ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang cho vào giỏ...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {product.stockQuantity > 0
                            ? `Thêm Vào Giỏ Nông Sản • ${totalPriceCalculated.toLocaleString('vi-VN')} đ`
                            : 'Mẻ Này Đã Tạm Hết'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Scarcity & Inventory Dispatch Indicator */}
                <div className="flex items-center justify-between p-2.5 bg-[#ebf6f1] rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-[#006c49] font-medium">
                    <Package className="w-4 h-4" />
                    <span>
                      Tồn kho thực tế:{' '}
                      <strong className="text-slate-900 font-bold">{product.stockQuantity} mẻ</strong> cho chuyến
                      12:00 trưa nay
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                </div>

                {/* Express Guarantees */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-4 h-4 text-[#006c49]" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">35 Phút Tận Nơi</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Leaf className="w-4 h-4 text-[#006c49]" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">100% Tự Hủy</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-[#006c49]" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Đổi Trả 1-Chạm</span>
                  </div>
                </div>
              </div>

              {/* Micro Chef Recommendation Banner */}
              <div className="bg-[#306855] text-white p-4 rounded-3xl shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#b4efd6] text-[#006c49] flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#b4efd6] block">
                    Lời Khuyên Bếp Trưởng
                  </span>
                  <p className="text-xs text-emerald-50 leading-relaxed mt-0.5">
                    "Nên thái lát dày, để ở nhiệt độ phòng 20 phút trước khi dùng cùng dầu ô liu nguyên chất và muối hồng để cảm nhận độ tươi ngọt tự nhiên."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────────────── COMPLETE FARM DOSSIER (#dossier) ────────────────────────── */}
          <section id="dossier" className="w-full py-8 bg-[#ebf6f1] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm border border-emerald-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#006c49]">
                  Hồ Sơ Minh Bạch Nông Nghiệp
                </span>
                <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  Thổ Nhưỡng, Nguồn Gốc & Bản Đồ Vị Giác
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-full shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#006c49]" />
                <span>Kiểm nghiệm độc lập: <strong className="text-[#006c49]">0.00% Hóa Chất Tổng Hợp</strong></span>
              </div>
            </div>

            {/* Dossier Tabs Container */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-emerald-100/70">
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2 p-3 bg-[#e5f0eb] border-b border-emerald-100/60">
                <button
                  type="button"
                  onClick={() => setDossierTab('farm')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                    dossierTab === 'farm'
                      ? 'bg-[#006c49] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Về Nông Trại • Sunfield
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('taste')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                    dossierTab === 'taste'
                      ? 'bg-[#006c49] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Hồ Sơ Vị Giác & Ẩm Thực
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('storage')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                    dossierTab === 'storage'
                      ? 'bg-[#006c49] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Bảo Quản & Độ Chín Chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('facts')}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                    dossierTab === 'facts'
                      ? 'bg-[#006c49] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Chỉ Số Dinh Dưỡng
                </button>
              </div>

              {/* Tab 1: Farm & Soil Metrics */}
              {dossierTab === 'farm' && (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4 flex flex-col gap-4">
                      <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 shadow-sm">
                        <img
                          src="https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=800&q=80"
                          alt="Đồng ruộng hữu cơ"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="bg-[#ebf6f1] p-4 rounded-2xl text-xs">
                        <span className="text-[10px] uppercase font-bold text-[#006c49] block mb-1">
                          Triết Lý Canh Tác Tự Nhiên
                        </span>
                        <p className="text-slate-600 italic">
                          "Chúng tôi nuôi dưỡng hệ vi sinh vật trong lòng đất để rễ cây tự hấp thụ khoáng chất tự nhiên thay vì ép tăng trưởng bằng hóa chất."
                        </p>
                        <span className="font-bold text-slate-800 block mt-2">— Kỹ Sư Trưởng Nông Trại</span>
                      </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-6">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#306855] tracking-wider">
                          Dòng Giống Thuần Chủng Liên Tục
                        </span>
                        <h3 className="font-syne text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                          Hơn 15 Năm Lưu Giữ Giống Bản Địa Trên Đất Đỏ Bazan
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                          Được tuyển chọn kỹ lưỡng, giữ trọn hương vị đậm đà nguyên bản. Không lai ghép công nghiệp, sinh trưởng trong điều kiện thổ nhưỡng trù phú và nguồn nước ngầm tự nhiên.
                        </p>
                      </div>

                      {/* Soil Biometrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#ebf6f1] p-3.5 rounded-2xl flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Mùn Hữu Cơ</span>
                          <span className="font-syne text-xl font-extrabold text-[#006c49]">7.4%</span>
                          <span className="text-[11px] text-[#006c49] font-semibold">↑ 3.2x chuẩn</span>
                        </div>
                        <div className="bg-[#ebf6f1] p-3.5 rounded-2xl flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Vi Sinh Vật</span>
                          <span className="font-syne text-xl font-extrabold text-[#306855]">98.2</span>
                          <span className="text-[11px] text-slate-500">Cân bằng nấm có lợi</span>
                        </div>
                        <div className="bg-[#ebf6f1] p-3.5 rounded-2xl flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Độ Mặn Nước</span>
                          <span className="font-syne text-xl font-extrabold text-slate-800">0.12</span>
                          <span className="text-[11px] text-slate-500">Nước ngầm tự nhiên</span>
                        </div>
                        <div className="bg-[#ebf6f1] p-3.5 rounded-2xl flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Hấp Thụ Carbon</span>
                          <span className="font-syne text-xl font-extrabold text-[#a63b00]">4.8 Tấn</span>
                          <span className="text-[11px] text-[#a63b00] font-semibold">Mỗi hecta / năm</span>
                        </div>
                      </div>

                      {/* Micro location */}
                      <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <Compass className="w-5 h-5 text-[#006c49]" />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Vành Đai Sương Mù • Lô Canh Tác #7B</span>
                            <span className="text-[11px] text-slate-500">Biên độ nhiệt ngày đêm 12°C tạo lượng đường tự nhiên đậm đà</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase bg-white px-3 py-1 rounded-full text-[#006c49] font-bold shadow-sm">
                          Chứng Nhận Lô #8082
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Taste Profile & Gastronomy */}
              {dossierTab === 'taste' && (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-6 flex flex-col gap-4">
                      <span className="text-[10px] uppercase font-bold text-[#a63b00] tracking-wider">
                        Phân Tích Cảm Quan Vị Giác
                      </span>
                      <h3 className="font-syne text-xl font-bold text-slate-900">
                        Vị Giòn Ngọt Bùng Nổ Cùng Dư Vị Thanh Khiết
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Không giống các loại thực phẩm công nghiệp vỏ dày để tiện vận chuyển xa, nông sản hái sớm sở hữu màng vỏ mỏng tan, giải phóng ngay vị ngọt thanh cùng hậu vị umami lắng đọng.
                      </p>

                      {/* Flavor Radar Visual Scale */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-800">Độ Ngọt Tự Nhiên (Brix Index)</span>
                            <span className="text-[#006c49] font-bold">8.7 / 10</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10b981] rounded-full" style={{ width: '87%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-800">Độ Tươi Giòn Mọng Nước</span>
                            <span className="text-[#006c49] font-bold">9.4 / 10</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10b981] rounded-full" style={{ width: '94%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-800">Độ Đậm Đà Hậu Vị (Umami)</span>
                            <span className="text-[#006c49] font-bold">9.1 / 10</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ff7d45] rounded-full" style={{ width: '91%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Culinary Pairings Bento */}
                    <div className="lg:col-span-6 bg-[#ebf6f1] p-5 rounded-2xl flex flex-col gap-3">
                      <span className="text-[10px] uppercase font-bold text-[#306855]">
                        Gợi Ý Chế Biến Cùng Chuyên Gia Ẩm Thực
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-900">Salad Phô Mai Tươi</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5">Vị béo ngậy làm tôn lên độ ngọt của nông sản.</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-900">Dầu Ô Liu Ép Lạnh</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5">Giữ trọn vẹn hợp chất chống oxy hóa tự nhiên.</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-900">Giấm Nho Balsamic</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5">Hài hòa hương vị cho bữa tối thanh lịch.</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-900">Bánh Mì Men Tự Nhiên</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5">Thấm trọn nước sốt mọng tươi ngon lành.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Ripeness & Storage */}
              {dossierTab === 'storage' && (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#ebf6f1] p-5 rounded-2xl flex flex-col gap-2">
                      <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                        <Thermometer className="w-5 h-5" />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-slate-900">Không Trữ Quá Lạnh</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Tránh ngăn đá hoặc nhiệt độ dưới 4°C vì sẽ làm phá hủy tế bào tự nhiên và làm giảm lượng hương thơm tinh túy.
                      </p>
                    </div>

                    <div className="bg-[#ebf6f1] p-5 rounded-2xl flex flex-col gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#b4efd6] text-[#006c49] flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-slate-900">Để Cuống Hướng Xuống</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Đặt quả hướng cuống xuống mặt phẳng thoáng mát giúp hạn chế oxy hóa và kéo dài độ giòn tự nhiên.
                      </p>
                    </div>

                    <div className="bg-[#ebf6f1] p-5 rounded-2xl flex flex-col gap-2">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-slate-900">Khung Giờ Vàng 4 Ngày</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Vì được hái tại vườn hôm nay, sản phẩm giữ hương thơm và độ ngọt đạt đỉnh cao nhất trong vòng 24–96 giờ sau khi giao.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Harvest Analytics & Nutrition */}
              {dossierTab === 'facts' && (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-7 space-y-2 text-xs">
                      <h3 className="font-syne text-lg font-bold text-slate-900 mb-3">
                        Chứng Nhận Phân Tích & Dinh Dưỡng Thực Nghiệm
                      </h3>
                      <div className="flex justify-between py-2 bg-[#ebf6f1] px-3 rounded-lg">
                        <span className="text-slate-600">Đặc tính giống</span>
                        <span className="font-bold text-slate-900">Thuần chủng tuyển chọn • Canh tác hữu cơ</span>
                      </div>
                      <div className="flex justify-between py-2 px-3 rounded-lg">
                        <span className="text-slate-600">Mật độ chất chống oxy hóa tự nhiên</span>
                        <span className="font-bold text-[#006c49]">Cao hơn 310% so với trồng công nghiệp</span>
                      </div>
                      <div className="flex justify-between py-2 bg-[#ebf6f1] px-3 rounded-lg">
                        <span className="text-slate-600">Hàm lượng Vitamin C / 100g</span>
                        <span className="font-bold text-slate-900">28.4 mg (47% nhu cầu mỗi ngày)</span>
                      </div>
                      <div className="flex justify-between py-2 px-3 rounded-lg">
                        <span className="text-slate-600">Tồn dư hóa chất bảo vệ thực vật</span>
                        <span className="font-bold text-[#006c49]">Không phát hiện (ND • 0.000 ppm)</span>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-[#ebf6f1] p-5 rounded-2xl flex flex-col justify-center gap-2 text-xs">
                      <div className="flex items-center gap-2 text-[#006c49]">
                        <Award className="w-5 h-5" />
                        <span className="font-syne font-bold text-sm text-slate-900">Chứng Nhận VietGAP & CCOF</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Mỗi lô nông sản đều có mã truy xuất nguồn gốc QR và được lấy mẫu kiểm tra định kỳ trước khi đưa vào hành trình chuỗi lạnh.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ────────────────────────── FREQUENTLY HARVESTED TOGETHER (COMBO BUNDLE) ────────────────────────── */}
          <section className="w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#006c49]">
                  Kết Hợp Ẩm Thực Tức Thì
                </span>
                <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  Thường Được Thu Hoạch Cùng Nhau • Bộ Ẩm Thực Caprese
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Bộ nguyên liệu đồng điệu cho bữa tối chuẩn vị mà không cần chuẩn bị thêm.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-emerald-100">
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Item 1 */}
                <div className="bg-[#ebf6f1] p-3 rounded-2xl flex flex-col gap-1.5">
                  <div className="aspect-square rounded-xl overflow-hidden bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&w=400&q=80"
                      alt="Rau thơm hữu cơ"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#006c49]">Hái 3 Giờ Trước</span>
                    <span className="font-syne font-bold text-slate-900">25.000 đ</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">Húng Tây Genovese Tươi</h4>
                  <span className="text-[11px] text-slate-500">Bó 40g còn rễ giữ tươi</span>
                </div>

                {/* Item 2 */}
                <div className="bg-[#ebf6f1] p-3 rounded-2xl flex flex-col gap-1.5">
                  <div className="aspect-square rounded-xl overflow-hidden bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1589881133595-a3c085cb731d?auto=format&fit=crop&w=400&q=80"
                      alt="Phô mai tươi"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#306855]">Thủ Công</span>
                    <span className="font-syne font-bold text-slate-900">65.000 đ</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">Phô Mai Tươi Mozzarella</h4>
                  <span className="text-[11px] text-slate-500">Sữa bò chăn thả • 150g</span>
                </div>

                {/* Item 3 */}
                <div className="bg-[#ebf6f1] p-3 rounded-2xl flex flex-col gap-1.5">
                  <div className="aspect-square rounded-xl overflow-hidden bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80"
                      alt="Dầu ô liu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#a63b00]">Ép Lạnh</span>
                    <span className="font-syne font-bold text-slate-900">120.000 đ</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">Dầu Ô Liu Nguyên Chất</h4>
                  <span className="text-[11px] text-slate-500">Chai thủy tinh tối màu • 250ml</span>
                </div>
              </div>

              {/* Bundle Pricing Conversion Box */}
              <div className="lg:col-span-4 bg-[#ebf6f1] p-6 rounded-3xl flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-[#006c49] text-[11px] uppercase font-bold">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Trọn Bộ Món Ngon</span>
                </div>
                <h3 className="font-syne text-lg font-bold text-slate-900">
                  Thêm Bộ Ẩm Thực Caprese Kèm Theo
                </h3>
                <p className="text-xs text-slate-600">
                  Đầy đủ cho 4 phần khai vị nhà hàng ngay tại bàn ăn gia đình.
                </p>
                <div className="flex items-baseline gap-2 my-1">
                  <span className="font-syne text-2xl font-black text-slate-900">185.000 đ</span>
                  <span className="text-xs text-slate-400 line-through">210.000 đ</span>
                  <span className="text-[10px] uppercase font-bold bg-[#006c49] text-white px-2 py-0.5 rounded-full">
                    Tiết kiệm 25k
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBundle}
                  className="w-full flex items-center justify-center gap-2 bg-[#006c49] hover:bg-[#005236] text-white py-3 px-4 rounded-full text-xs font-bold uppercase transition-all shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{bundleAdded ? 'Đã Thêm Trọn Bộ' : 'Thêm Trọn Bộ Caprese'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* ────────────────────────── COLD-CHAIN INTEGRITY STRIP ────────────────────────── */}
          <section className="w-full bg-[#dfebe6] p-6 sm:p-8 rounded-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">4°C–8°C Ổn Định</h5>
                  <span className="text-slate-500 text-[11px]">Cảm biến IoT xe lạnh</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Thùng Xốp Sợi Nấm</h5>
                  <span className="text-slate-500 text-[11px]">100% tự hủy sinh học</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Đội Xe Điện Xanh</h5>
                  <span className="text-slate-500 text-[11px]">Không phát thải carbon</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ebf6f1] text-[#006c49] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Cam Kết Vị Tươi</h5>
                  <span className="text-slate-500 text-[11px]">Đền bù 1-chạm nếu dập nát</span>
                </div>
              </div>
            </div>
          </section>

          {/* ────────────────────────── REVIEWS & QA INTERACTIVE SECTION ────────────────────────── */}
          <section id="reviews-section" className="w-full bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-emerald-100">
            {/* TABS SELECTOR */}
            <div role="tablist" className="flex gap-4 border-b border-slate-200 pb-3">
              <button
                role="tab"
                aria-selected={communityTab === 'reviews'}
                onClick={() => setCommunityTab('reviews')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  communityTab === 'reviews'
                    ? 'text-[#006c49] border-[#006c49]'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>Nhận Xét & Đánh Giá ({product.reviews?.length || 0})</span>
              </button>
              <button
                role="tab"
                aria-selected={communityTab === 'qa'}
                onClick={() => setCommunityTab('qa')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  communityTab === 'qa'
                    ? 'text-[#006c49] border-[#006c49]'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <ShieldQuestion className="w-4 h-4" />
                <span>Hỏi & Đáp Chuyên Gia ({questions.length})</span>
              </button>
            </div>

            {communityTab === 'reviews' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                {/* SUBMIT NEW REVIEW FORM (Left 5 Cols) */}
                <div className="lg:col-span-5 bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-6 space-y-4 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#ff7d45]" />
                    Gửi Cảm Nhận Về Mẻ Nông Sản
                  </h3>

                  {user ? (
                    hasPurchased ? (
                      <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
                        <div>
                          <label className="text-slate-700 font-bold block mb-1">Mức độ hài lòng:</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 hover:scale-110 transition cursor-pointer"
                                aria-label={`${star} sao`}
                              >
                                <Star
                                  className={`w-6 h-6 ${
                                    star <= rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-bold text-amber-600 ml-2">{rating} sao</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-700 font-bold block mb-1">Nội dung nhận xét:</label>
                          <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ trải nghiệm của bạn về độ giòn ngọt, độ tươi của mẻ hàng hôm nay..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#006c49] resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={reviewMutation.isPending}
                          className="w-full py-3 bg-[#006c49] hover:bg-[#005236] text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {reviewMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Gửi Nhận Xét Nông Sản</span>
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1.5 text-xs text-amber-800">
                        <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                        <p className="font-bold">Dành cho khách đã mua hàng</p>
                        <p className="text-amber-700/80 leading-relaxed text-[11px]">
                          Bạn cần hoàn tất đơn hàng chứa nông sản này để mở khóa tính năng viết nhận xét.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs">
                      <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-slate-600">Đăng nhập để gửi nhận xét về độ tươi của sản phẩm.</p>
                      <Link
                        to="/login"
                        className="inline-block px-4 py-1.5 bg-[#ebf6f1] hover:bg-[#b4efd6] text-[#006c49] text-xs font-bold rounded-full transition"
                      >
                        Đăng nhập ngay
                      </Link>
                    </div>
                  )}
                </div>

                {/* REVIEWS LIST (Right 7 Cols) */}
                <div className="lg:col-span-7 space-y-3" data-testid="reviews-list">
                  {product.reviews && product.reviews.length > 0 ? (
                    product.reviews.map((rev) => (
                      <article
                        key={rev.id}
                        data-testid={`review-${rev.id}`}
                        className="p-4 bg-[#f8fafc] border border-slate-200/70 rounded-2xl space-y-2 hover:border-emerald-200 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#b4efd6] text-[#006c49] flex items-center justify-center font-bold text-xs shrink-0">
                              {rev.userName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-900 truncate">{rev.userName}</p>
                                <span className="text-[10px] font-bold text-[#006c49] bg-[#ebf6f1] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Đã Mua Hàng
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-amber-400 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating ? 'fill-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed pl-10">"{rev.comment}"</p>
                      </article>
                    ))
                  ) : (
                    <div className="p-8 bg-[#f8fafc] border border-slate-200 rounded-2xl text-center space-y-2 text-slate-500">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Chưa có đánh giá nào cho mẻ nông sản này.</p>
                      <p className="text-[11px] text-slate-500">Hãy là người đầu tiên trải nghiệm và chia sẻ nhận xét!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                {/* QA Input Form (Left 5 cols) */}
                <div className="lg:col-span-5 bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-6 space-y-4 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldQuestion className="w-4 h-4 text-[#006c49]" />
                    Hỏi Thắc Mắc Về Nông Sản
                  </h3>

                  {user ? (
                    <form onSubmit={handleQuestionSubmit} className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Câu hỏi của bạn:</label>
                        <textarea
                          rows={4}
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder="Hỏi về thời gian thu hoạch, phương thức giữ lạnh, cách chế biến..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#006c49] resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={questionMutation.isPending}
                        className="w-full py-3 bg-[#006c49] hover:bg-[#005236] text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {questionMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Gửi Thắc Mắc Đến Chuyên Gia</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs">
                      <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-slate-600">Đăng nhập để đặt câu hỏi về nông sản này.</p>
                      <Link
                        to="/login"
                        className="inline-block px-4 py-1.5 bg-[#ebf6f1] hover:bg-[#b4efd6] text-[#006c49] text-xs font-bold rounded-full transition"
                      >
                        Đăng nhập ngay
                      </Link>
                    </div>
                  )}
                </div>

                {/* QA List (Right 7 cols) */}
                <div className="lg:col-span-7 space-y-3" data-testid="qa-list">
                  {questions.length > 0 ? (
                    questions.map((q) => (
                      <article
                        key={q.id}
                        data-testid={`qa-item-${q.id}`}
                        className="p-4 bg-[#f8fafc] border border-slate-200/70 rounded-2xl space-y-2 hover:border-emerald-200 transition"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {q.userFullName?.charAt(0).toUpperCase() || 'Q'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">{q.userFullName}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed mt-1">"{q.questionText}"</p>
                          </div>
                        </div>

                        {q.answerText ? (
                          <div className="ml-8 p-3 bg-emerald-50 border-l-3 border-[#006c49] rounded-r-xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[#006c49] bg-white px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Quản Trị Viên / Chuyên Gia
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(q.answeredAt || q.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed">{q.answerText}</p>
                          </div>
                        ) : (
                          <p className="ml-8 text-[11px] text-slate-400 italic">Chuyên gia đang chuẩn bị phản hồi.</p>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="p-8 bg-[#f8fafc] border border-slate-200 rounded-2xl text-center space-y-2 text-slate-500">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Chưa có câu hỏi nào cho nông sản này.</p>
                      <p className="text-[11px] text-slate-500">Đừng ngần ngại gửi câu hỏi nếu bạn cần tư vấn thêm!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
