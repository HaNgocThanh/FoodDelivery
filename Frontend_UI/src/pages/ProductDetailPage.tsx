import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  Star,
  ShoppingCart,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  MapPin,
  Flame,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Utensils,
  Package,
  ShieldQuestion,
  CheckCircle2
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

  const [quantity, setQuantity] = useState<number>(1);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'reviews' | 'qa'>('reviews');
  const [questionText, setQuestionText] = useState<string>('');

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
        message: 'Cảm ơn bạn đã gửi đánh giá cho sản phẩm!',
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
    queryKey: ['myOrders'],
    queryFn: async () => {
      return await axiosClient.get<any[], any[]>('/api/orders/my-orders');
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
      setNotification({ type: 'success', message: 'Gửi câu hỏi thành công! Vui lòng chờ quản trị viên phản hồi.' });
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
    addToCart(product, quantity);
    setNotification({
      type: 'success',
      message: `Đã thêm ${quantity} x ${product.name} vào giỏ hàng!`,
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập nội dung nhận xét.' });
      return;
    }
    reviewMutation.mutate({ rating, comment: comment.trim() });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">

      {/* HEADER BAR */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            data-testid="button-back"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <span className="font-extrabold text-slate-900 text-sm">Food<span className="text-emerald-600">Delivery</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            role="alert"
            data-testid="product-detail-notification"
            className={`p-4 rounded-lg border flex items-center justify-between text-sm shadow-sm transition ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 underline font-medium"
            >
              Đóng
            </button>
          </div>
        )}

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Đang tải thông tin chi tiết sản phẩm...</p>
          </div>
        )}

        {isError && (
          <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-4 max-w-xl mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-800">Không thể tải thông tin sản phẩm</h2>
            <p className="text-xs text-red-700">{(error as any)?.message || 'Vui lòng kiểm tra lại đường dẫn hoặc kết nối máy chủ.'}</p>
            <button
              onClick={() => navigate(-1)}
              data-testid="button-back-error"
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-300"
            >
              Quay lại trang trước
            </button>
          </div>
        )}

        {/* PRODUCT DETAILS (2-COLUMN LAYOUT) */}
        {product && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* LEFT COLUMN: LARGE PRODUCT IMAGE CARD */}
              <div className="lg:col-span-6 space-y-4">
                <div className="relative aspect-square rounded-2xl bg-gradient-to-tr from-emerald-50 via-white to-amber-50 border border-slate-200 p-8 flex items-center justify-center overflow-hidden shadow-md group">
                  {/* Background Subtle Glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-amber-500/5 opacity-60 group-hover:opacity-100 transition duration-500" />

                  {/* Badges Overlay (top-left) */}
                  <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
                    {product.isHot && (
                      <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-500" /> Nổi bật
                      </span>
                    )}
                    {product.categoryName && (
                      <span className="px-3 py-1 bg-white/90 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                        {product.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Stock Badge (top-right) */}
                  <div className="absolute top-5 right-5 z-10">
                    {product.stockQuantity > 0 ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Còn hàng ({product.stockQuantity})
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                        Hết hàng
                      </span>
                    )}
                  </div>

                  {/* Large Image / Icon Preview */}
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center transform group-hover:scale-105 transition duration-500 w-full h-full">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain rounded-xl"
                      />
                    ) : (
                      <>
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <Utensils className="w-16 h-16 text-white" />
                        </div>
                        <span className="text-xs text-slate-500 font-mono inline-flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" /> ID sản phẩm: #{product.id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DETAILS & ADD TO CART */}
              <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Category & Origin */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {product.origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" /> Xuất xứ: <strong className="text-slate-700">{product.origin}</strong>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  {/* Rating Stars Summary */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(product.averageRating)
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{product.averageRating} / 5</span>
                    <span className="text-xs text-slate-500">({product.reviews?.length || 0} nhận xét)</span>
                  </div>

                  {/* Price Banner */}
                  <div className="p-5 bg-white border border-slate-200 rounded-xl flex items-baseline gap-3 shadow-sm">
                    <span className="text-4xl font-extrabold text-amber-500 tabular-nums">
                      {product.price.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-xs text-slate-500">Đã bao gồm thuế VAT</span>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả sản phẩm</h3>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {product.description || 'Thực phẩm tươi sạch, chất lượng cao được đảm bảo vệ sinh an toàn thực phẩm.'}
                    </p>
                  </div>
                </div>

                {/* QUANTITY SELECTOR & ADD TO CART */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Chọn số lượng:</span>
                    <span>Còn lại trong kho: <strong className="text-slate-900">{product.stockQuantity}</strong></span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Quantity controls */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <button
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-md text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-slate-900 text-sm tabular-nums">{quantity}</span>
                      <button
                        disabled={quantity >= product.stockQuantity}
                        onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                        className="w-10 h-10 rounded-md text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition font-bold text-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      disabled={product.stockQuantity <= 0}
                      onClick={handleAddToCart}
                      className="
                        flex-1 py-3.5 px-6
                        bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                        disabled:opacity-40 disabled:cursor-not-allowed
                        text-white font-bold text-sm
                        rounded-lg
                        shadow-md hover:shadow-lg shadow-emerald-500/30
                        hover:-translate-y-1 active:translate-y-0
                        transition-all duration-200
                        flex items-center justify-center gap-2
                      "
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {product.stockQuantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* REVIEWS & QA AREA */}
            <section className="pt-12 border-t border-slate-200 space-y-6">
              {/* TABS SELECTOR */}
              <div role="tablist" className="flex gap-2 border-b border-slate-200">
                <button
                  role="tab"
                  aria-selected={activeTab === 'reviews'}
                  onClick={() => setActiveTab('reviews')}
                  data-testid="tab-reviews"
                  className={`group inline-flex items-center gap-2 px-4 py-3 -mb-px font-semibold text-sm transition border-b-2 ${
                    activeTab === 'reviews'
                      ? 'text-emerald-600 border-emerald-500'
                      : 'text-slate-500 border-transparent hover:text-emerald-600 hover:bg-slate-50'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Nhận xét &amp; Đánh giá ({product.reviews?.length || 0})
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'qa'}
                  onClick={() => setActiveTab('qa')}
                  data-testid="tab-qa"
                  className={`group inline-flex items-center gap-2 px-4 py-3 -mb-px font-semibold text-sm transition border-b-2 ${
                    activeTab === 'qa'
                      ? 'text-emerald-600 border-emerald-500'
                      : 'text-slate-500 border-transparent hover:text-emerald-600 hover:bg-slate-50'
                  }`}
                >
                  <ShieldQuestion className="w-4 h-4" />
                  Hỏi &amp; Đáp (Q&amp;A) ({questions.length})
                </button>
              </div>

              {activeTab === 'reviews' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                  {/* SUBMIT NEW REVIEW FORM (Left 5 Cols) */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm h-fit">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Viết nhận xét của bạn
                    </h3>

                    {user ? (
                      hasPurchased ? (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          {/* Rating Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-700 font-semibold">Đánh giá số sao:</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  className="p-1 hover:scale-110 transition"
                                  aria-label={`${star} sao`}
                                >
                                  <Star
                                    className={`w-7 h-7 ${
                                      star <= rating
                                        ? 'fill-amber-500 text-amber-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="text-xs font-bold text-amber-500 ml-2 tabular-nums">{rating} sao</span>
                            </div>
                          </div>

                          {/* Comment textarea */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-700 font-semibold">Nội dung nhận xét:</label>
                            <textarea
                              rows={4}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Chia sẻ trải nghiệm của bạn về hương vị, độ tươi sạch của sản phẩm..."
                              className="
                                w-full px-4 py-3
                                bg-white border border-slate-300 rounded-lg
                                text-slate-900 placeholder-slate-400 text-sm
                                transition
                                focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                                focus:outline-none
                                resize-none
                              "
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={reviewMutation.isPending}
                            className="
                              w-full py-3
                              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                              disabled:opacity-60 disabled:cursor-not-allowed
                              text-white font-bold text-sm
                              rounded-lg
                              shadow-md hover:shadow-lg shadow-emerald-500/30
                              transition-all
                              flex items-center justify-center gap-2
                            "
                          >
                            {reviewMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" /> Gửi đánh giá
                              </>
                            )}
                          </button>
                        </form>
                      ) : (
                        <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="text-xs font-bold text-amber-700">Chỉ dành cho người mua hàng</p>
                          <p className="text-xs text-amber-700/80 leading-relaxed">Bạn phải mua và nhận hàng thành công sản phẩm này mới được đánh giá nhận xét.</p>
                        </div>
                      )
                    ) : (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
                        <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600">Bạn cần đăng nhập để gửi đánh giá cho sản phẩm này.</p>
                        <Link
                          to="/login"
                          className="
                            inline-block px-4 py-2
                            bg-white hover:bg-emerald-50
                            text-emerald-600 text-xs font-bold
                            rounded-lg transition
                            border border-slate-300 hover:border-emerald-300
                          "
                        >
                          Đăng nhập ngay
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* REVIEWS LIST (Right 7 Cols) */}
                  <div className="lg:col-span-7 space-y-4" data-testid="reviews-list">
                    {product.reviews && product.reviews.length > 0 ? (
                      product.reviews.map((rev) => (
                        <article
                          key={rev.id}
                          data-testid={`review-${rev.id}`}
                          className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 hover:shadow-sm hover:border-slate-300 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                                {rev.userName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-bold text-slate-900 truncate">{rev.userName}</p>
                                  <span
                                    data-testid={`verified-purchase-${rev.id}`}
                                    className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Đã mua hàng
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-amber-500 shrink-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= rev.rating
                                      ? 'fill-amber-500 text-amber-500'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-sm text-slate-700 leading-relaxed pl-11">
                            "{rev.comment}"
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">Chưa có đánh giá nào cho sản phẩm này.</p>
                        <p className="text-xs text-slate-500">Hãy là người đầu tiên trải nghiệm và để lại nhận xét!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                  {/* QA Input Form (Left 5 cols) */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm h-fit">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <ShieldQuestion className="w-4 h-4 text-emerald-500" /> Hỏi đáp về sản phẩm
                    </h3>

                    {user ? (
                      <form onSubmit={handleQuestionSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-700 font-semibold">Câu hỏi của bạn:</label>
                          <textarea
                            rows={4}
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Nhập thắc mắc của bạn về nguyên liệu, cách bảo quản, hạn sử dụng..."
                            className="
                              w-full px-4 py-3
                              bg-white border border-slate-300 rounded-lg
                              text-slate-900 placeholder-slate-400 text-sm
                              transition
                              focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                              focus:outline-none
                              resize-none
                            "
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={questionMutation.isPending}
                          className="
                            w-full py-3
                            bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                            disabled:opacity-60 disabled:cursor-not-allowed
                            text-white font-bold text-sm
                            rounded-lg
                            shadow-md hover:shadow-lg shadow-emerald-500/30
                            transition-all
                            flex items-center justify-center gap-2
                          "
                        >
                          {questionMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4" /> Gửi câu hỏi
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
                        <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600">Bạn cần đăng nhập để đặt câu hỏi về sản phẩm.</p>
                        <Link
                          to="/login"
                          className="
                            inline-block px-4 py-2
                            bg-white hover:bg-emerald-50
                            text-emerald-600 text-xs font-bold
                            rounded-lg transition
                            border border-slate-300 hover:border-emerald-300
                          "
                        >
                          Đăng nhập ngay
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* QA List (Right 7 cols) */}
                  <div className="lg:col-span-7 space-y-4" data-testid="qa-list">
                    {questions.length > 0 ? (
                      questions.map((q) => (
                        <article
                          key={q.id}
                          data-testid={`qa-item-${q.id}`}
                          className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 hover:shadow-sm transition"
                        >
                          {/* Question (Customer) */}
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                              {q.userFullName?.charAt(0).toUpperCase() || 'Q'}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900">{q.userFullName}</span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-xs text-slate-500">
                                  {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-800 leading-relaxed">"{q.questionText}"</p>
                            </div>
                          </div>

                          {/* Answer (Admin) - lùi lề tạo thread */}
                          {q.answerText ? (
                            <div
                              data-testid={`qa-answer-${q.id}`}
                              className="ml-6 sm:ml-12 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg space-y-2"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  data-testid="admin-badge"
                                  className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Quản trị viên
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(q.answeredAt || q.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-800 leading-relaxed">"{q.answerText}"</p>
                            </div>
                          ) : (
                            <p className="ml-6 sm:ml-12 text-xs text-slate-500 italic">Chưa có phản hồi từ quản trị viên.</p>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">Chưa có câu hỏi nào cho sản phẩm này.</p>
                        <p className="text-xs text-slate-500">Đừng ngần ngại gửi câu hỏi nếu bạn có bất kỳ thắc mắc nào!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </section>
          </>
        )}

      </div>
    </main>
  );
}
