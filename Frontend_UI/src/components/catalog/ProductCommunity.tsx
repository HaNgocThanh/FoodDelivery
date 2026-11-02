import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Star } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../stores/useAuthStore';
import type { ProductDetailItem, ProductQuestion, PurchaseHistoryItem } from '../../types/productDetail';
import { hasCompletedPurchase } from '../../utils/productDetail';

export type CommunityTab = 'reviews' | 'qa';

function PostedDate({ value }: { value: string }) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? <time dateTime={value}>{date.toLocaleDateString('vi-VN')}</time> : null;
}

export function ProductCommunity({ product, activeTab, onTabChange }: {
  product: ProductDetailItem; activeTab: CommunityTab; onTabChange: (tab: CommunityTab) => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const prefix = useId();
  const tabRefs = useRef<Partial<Record<CommunityTab, HTMLButtonElement | null>>>({});
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const reviews = product.reviews ?? [];
  const history = useQuery<PurchaseHistoryItem[]>({
    queryKey: ['myOrders', userId],
    queryFn: ({ signal }) => axiosClient.get<PurchaseHistoryItem[], PurchaseHistoryItem[]>('/api/orders/my-orders', { signal }),
    enabled: userId !== undefined,
    retry: 1,
  });
  const questions = useQuery<ProductQuestion[]>({
    queryKey: ['productQuestions', product.id],
    queryFn: ({ signal }) => axiosClient.get<ProductQuestion[], ProductQuestion[]>(`/api/questions/product/${product.id}`, { signal }),
    retry: 1,
  });
  const verifySession = () => {
    if (userId === undefined || useAuthStore.getState().user?.id !== userId) throw new Error('Vui lòng đăng nhập lại để tiếp tục.');
  };
  const reviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      verifySession();
      return axiosClient.post(`/api/products/${product.id}/reviews`, payload);
    },
    onSuccess: async () => {
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['productDetail', product.id] });
      setFeedback({ type: 'success', message: 'Đã gửi đánh giá của bạn.' });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message || 'Chưa gửi được đánh giá. Vui lòng thử lại.' }),
  });
  const questionMutation = useMutation({
    mutationFn: async (text: string) => {
      verifySession();
      return axiosClient.post('/api/questions', { productId: product.id, questionText: text });
    },
    onSuccess: async () => {
      setQuestion('');
      await queryClient.invalidateQueries({ queryKey: ['productQuestions', product.id] });
      setFeedback({ type: 'success', message: 'Đã gửi câu hỏi của bạn.' });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message || 'Chưa gửi được câu hỏi. Vui lòng thử lại.' }),
  });
  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reviewMutation.isPending) return;
    if (!comment.trim()) { setFeedback({ type: 'error', message: 'Vui lòng nhập nội dung đánh giá.' }); return; }
    setFeedback(null);
    reviewMutation.mutate({ rating, comment: comment.trim() });
  };
  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (questionMutation.isPending) return;
    if (!question.trim()) { setFeedback({ type: 'error', message: 'Vui lòng nhập câu hỏi.' }); return; }
    setFeedback(null);
    questionMutation.mutate(question.trim());
  };
  const changeTabWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: CommunityTab | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = activeTab === 'reviews' ? 'qa' : 'reviews';
    if (event.key === 'Home') next = 'reviews';
    if (event.key === 'End') next = 'qa';
    if (next) { event.preventDefault(); onTabChange(next); tabRefs.current[next]?.focus(); }
  };
  return <section className="detail-community" id="reviews-section" aria-label="Đánh giá và hỏi đáp">
    <div className="detail-tabs" role="tablist" aria-label="Đánh giá và hỏi đáp">
      {(['reviews', 'qa'] as const).map((tab) => <button key={tab} ref={(element) => { tabRefs.current[tab] = element; }}
        id={`${prefix}-${tab}`} role="tab" aria-selected={activeTab === tab} aria-controls={`${prefix}-${tab}-panel`}
        tabIndex={activeTab === tab ? 0 : -1} onKeyDown={changeTabWithKeyboard} onClick={() => onTabChange(tab)}>
        {tab === 'reviews' ? `Đánh giá (${reviews.length})` : `Hỏi đáp${questions.isSuccess ? ` (${questions.data.length})` : ''}`}
      </button>)}
    </div>
    {feedback && <p className={`detail-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
    {activeTab === 'reviews' ? <div id={`${prefix}-reviews-panel`} role="tabpanel" aria-labelledby={`${prefix}-reviews`} className="detail-community-content">
      <div className="detail-community-form"><h2>Viết đánh giá</h2>
        {userId === undefined ? <p><Link to="/login">Đăng nhập</Link> để đánh giá sản phẩm đã mua.</p>
          : history.isPending ? <p role="status">Đang kiểm tra lịch sử mua hàng…</p>
            : history.isError ? <div className="detail-inline-error" role="alert"><p>Chưa kiểm tra được lịch sử mua hàng.</p><button onClick={() => void history.refetch()}><RefreshCw size={15} />Thử lại</button></div>
              : hasCompletedPurchase(history.data ?? [], product.id) ? <form onSubmit={submitReview}>
                <fieldset><legend>Mức độ hài lòng</legend><div className="detail-rating-input">{[1, 2, 3, 4, 5].map((value) => <label key={value}><input className="sr-only" type="radio" name={`${prefix}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} sao`} disabled={reviewMutation.isPending} /><span><Star size={23} fill={value <= rating ? 'currentColor' : 'none'} aria-hidden="true" /></span></label>)}</div></fieldset>
                <label htmlFor={`${prefix}-comment`}>Nhận xét<textarea id={`${prefix}-comment`} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} required disabled={reviewMutation.isPending} placeholder="Chia sẻ trải nghiệm của bạn…" /></label>
                <button className="detail-submit" type="submit" disabled={reviewMutation.isPending}>{reviewMutation.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
              </form> : <p>Bạn có thể đánh giá sau khi nhận hàng thành công.</p>}
      </div>
      <div className="detail-community-list" data-testid="reviews-list">{reviews.length ? reviews.map((review) => <article key={review.id} data-testid={`review-${review.id}`}>
        <div className="detail-post-meta"><strong>{review.userName}</strong><PostedDate value={review.createdAt} /></div>
        <p className="detail-review-rating"><Star size={15} fill="currentColor" aria-hidden="true" />{review.rating}/5</p><p>{review.comment}</p>
      </article>) : <p className="detail-empty">Chưa có đánh giá cho sản phẩm này.</p>}</div>
    </div> : <div id={`${prefix}-qa-panel`} role="tabpanel" aria-labelledby={`${prefix}-qa`} className="detail-community-content">
      <div className="detail-community-form"><h2>Đặt câu hỏi</h2>{userId === undefined ? <p><Link to="/login">Đăng nhập</Link> để hỏi về sản phẩm.</p> : <form onSubmit={submitQuestion}>
        <label htmlFor={`${prefix}-question`}>Câu hỏi của bạn<textarea id={`${prefix}-question`} rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} required disabled={questionMutation.isPending} placeholder="Bạn muốn biết thêm điều gì?" /></label>
        <button className="detail-submit" type="submit" disabled={questionMutation.isPending}>{questionMutation.isPending ? 'Đang gửi…' : 'Gửi câu hỏi'}</button>
      </form>}</div>
      <div className="detail-community-list" data-testid="qa-list">{questions.isPending ? <p role="status">Đang tải câu hỏi…</p> : questions.isError ? <div className="detail-inline-error" role="alert"><p>Chưa tải được câu hỏi.</p><button onClick={() => void questions.refetch()}><RefreshCw size={15} />Thử lại</button></div>
        : questions.data.length ? questions.data.map((item) => <article key={item.id} data-testid={`qa-item-${item.id}`}>
          <div className="detail-post-meta"><strong>{item.userFullName}</strong><PostedDate value={item.createdAt} /></div><p>{item.questionText}</p>
          {item.answerText ? <div className="detail-answer"><strong>Phản hồi cửa hàng</strong><p>{item.answerText}</p></div> : <span className="detail-waiting">Chờ phản hồi</span>}
        </article>) : <p className="detail-empty">Chưa có câu hỏi cho sản phẩm này.</p>}
      </div>
    </div>}
  </section>;
}
