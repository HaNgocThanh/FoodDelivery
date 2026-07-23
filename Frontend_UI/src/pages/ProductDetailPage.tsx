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
  Utensils
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white pb-20">

      {/* HEADER BAR */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/products"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách sản phẩm
          </Link>
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-500" />
            <span className="font-extrabold text-white text-sm">Food<span className="text-orange-500">Delivery</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-sm shadow-2xl transition ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/90 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-sm font-medium">Đang tải thông tin chi tiết sản phẩm...</p>
          </div>
        )}

        {isError && (
          <div className="p-8 bg-red-950/60 border border-red-500/40 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-red-200">Không thể tải thông tin sản phẩm</h2>
            <p className="text-xs text-red-300">{(error as any)?.message || 'Vui lòng kiểm tra lại đường dẫn hoặc kết nối máy chủ.'}</p>
            <button
              onClick={() => navigate('/products')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        )}

        {/* PRODUCT DETAILS (2-COLUMN LAYOUT) */}
        {product && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* LEFT COLUMN: LARGE PRODUCT IMAGE CARD */}
              <div className="lg:col-span-6 space-y-4">
                <div className="relative aspect-square rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-800 border border-slate-800 p-8 flex items-center justify-center overflow-hidden shadow-2xl group">
                  {/* Background Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-amber-500/10 opacity-50 group-hover:opacity-100 transition duration-500" />

                  {/* Badges Overlay */}
                  <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
                    {product.isHot && (
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl text-xs font-black uppercase flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-400" /> Nổi bật
                      </span>
                    )}
                    {product.categoryName && (
                      <span className="px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold">
                        {product.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Stock Badge */}
                  <div className="absolute top-5 right-5 z-10">
                    {product.stockQuantity > 0 ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold">
                        Còn hàng ({product.stockQuantity})
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold">
                        Hết hàng
                      </span>
                    )}
                  </div>

                  {/* Large Icon Preview */}
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center transform group-hover:scale-105 transition duration-500">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                      <Utensils className="w-16 h-16 text-white" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">ID sản phẩm: #{product.id}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DETAILS & ADD TO CART */}
              <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Category & Origin */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {product.origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" /> Xuất xứ: <strong className="text-slate-200">{product.origin}</strong>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl font-black text-white tracking-tight leading-tight">{product.name}</h1>

                  {/* Rating Stars Summary */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(product.averageRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-white text-sm">{product.averageRating} / 5</span>
                    <span className="text-xs text-slate-500">({product.reviews?.length || 0} nhận xét)</span>
                  </div>

                  {/* Price Banner */}
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-baseline gap-3">
                    <span className="text-3xl font-black text-orange-400">
                      {product.price.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-xs text-slate-400">Đã bao gồm thuế VAT</span>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Mô tả sản phẩm</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {product.description || 'Thực phẩm tươi sạch, chất lượng cao được đảm bảo vệ sinh an toàn thực phẩm.'}
                    </p>
                  </div>
                </div>

                {/* QUANTITY SELECTOR & ADD TO CART */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Chọn số lượng:</span>
                    <span>Còn lại trong kho: <strong className="text-white">{product.stockQuantity}</strong></span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Quantity controls */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1">
                      <button
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-white text-sm">{quantity}</span>
                      <button
                        disabled={quantity >= product.stockQuantity}
                        onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                        className="w-10 h-10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition font-bold text-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      disabled={product.stockQuantity <= 0}
                      onClick={handleAddToCart}
                      className="flex-1 py-3.5 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {product.stockQuantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* REVIEWS & QA AREA */}
            <section className="pt-12 border-t border-slate-800 space-y-6">
              {/* TABS SELECTOR */}
              <div className="flex gap-6 border-b border-slate-800 pb-1">
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 font-bold text-lg transition relative ${activeTab === 'reviews' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Nhận xét &amp; Đánh giá ({product.reviews?.length || 0})
                  {activeTab === 'reviews' && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full animate-fade-in" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`pb-3 font-bold text-lg transition relative ${activeTab === 'qa' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Hỏi &amp; Đáp (Q&amp;A) ({questions.length})
                  {activeTab === 'qa' && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full animate-fade-in" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {activeTab === 'reviews' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                  {/* SUBMIT NEW REVIEW FORM (Left 5 Cols) */}
                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl h-fit">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Viết nhận xét của bạn
                    </h3>

                    {user ? (
                      hasPurchased ? (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          {/* Rating Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-semibold">Đánh giá số sao:</label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  className="p-1 hover:scale-110 transition"
                                >
                                  <Star
                                    className={`w-7 h-7 ${
                                      star <= rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-700'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="text-xs font-bold text-amber-400 ml-2">{rating} sao</span>
                            </div>
                          </div>

                          {/* Comment textarea */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-semibold">Nội dung nhận xét:</label>
                            <textarea
                              rows={4}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Chia sẻ trải nghiệm của bạn về hương vị, độ tươi sạch của sản phẩm..."
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-orange-500 text-white placeholder-slate-600 rounded-2xl text-xs transition focus:outline-none resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={reviewMutation.isPending}
                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
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
                        <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-3">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="text-xs text-slate-400 font-bold text-amber-400">Chỉ dành cho người mua hàng</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">Bạn phải mua và nhận hàng thành công sản phẩm này mới được đánh giá nhận xét.</p>
                        </div>
                      )
                    ) : (
                      <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-3">
                        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">Bạn cần đăng nhập để gửi đánh giá cho sản phẩm này.</p>
                        <Link
                          to="/login"
                          className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl transition border border-slate-700"
                        >
                          Đăng nhập ngay
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* REVIEWS LIST (Right 7 Cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    {product.reviews && product.reviews.length > 0 ? (
                      product.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                {rev.userName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-white">{rev.userName}</p>
                                  <span className="text-[9px] text-green-400 font-extrabold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                    ✓ Đã mua hàng
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed pl-10 pt-1">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                        <p className="text-xs font-medium text-slate-400">Chưa có đánh giá nào cho sản phẩm này.</p>
                        <p className="text-[11px] text-slate-600">Hãy là người đầu tiên trải nghiệm và để lại nhận xét!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                  {/* QA Input Form (Left 5 cols) */}
                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl h-fit">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      Hỏi đáp về sản phẩm
                    </h3>

                    {user ? (
                      <form onSubmit={handleQuestionSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-400 font-semibold">Câu hỏi của bạn:</label>
                          <textarea
                            rows={4}
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Nhập thắc mắc của bạn về nguyên liệu, cách bảo quản, hạn sử dụng..."
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-orange-500 text-white placeholder-slate-600 rounded-2xl text-xs transition focus:outline-none resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={questionMutation.isPending}
                          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
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
                      <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-3">
                        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">Bạn cần đăng nhập để đặt câu hỏi về sản phẩm.</p>
                        <Link
                          to="/login"
                          className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl transition border border-slate-700"
                        >
                          Đăng nhập ngay
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* QA List (Right 7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    {questions.length > 0 ? (
                      questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs shadow-md shrink-0">
                              Q
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">{q.userFullName}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 font-semibold">"{q.questionText}"</p>
                            </div>
                          </div>

                          {q.answerText ? (
                            <div className="ml-10 p-4 bg-slate-950/80 rounded-xl border border-slate-850 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                  Admin phản hồi
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(q.answeredAt || q.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">"{q.answerText}"</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic ml-10">Chưa có phản hồi từ quản trị viên.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                        <p className="text-xs font-medium text-slate-400">Chưa có câu hỏi nào cho sản phẩm này.</p>
                        <p className="text-[11px] text-slate-600">Đừng ngần ngại gửi câu hỏi nếu bạn có bất kỳ thắc mắc nào!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              </div>
            </section>
          </>
        )}

      </main>
    </div>
  );
}
