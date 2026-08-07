import { useState, useEffect, useRef } from 'react';
import { Star, X, Loader2, Coins } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  orderId: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  reviewMutation: {
    mutate: (payload: { orderId: number; productId: number; rating: number; comment: string }) => void;
    isPending: boolean;
    isSuccess: boolean;
  };
}

const STAR_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

export default function ReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  orderId,
  onSuccess,
  onError,
  reviewMutation,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const successFired = useRef(false);

  // Auto-close modal after successful submission (track via mutation isSuccess)
  useEffect(() => {
    if (submitted && reviewMutation.isSuccess && !successFired.current) {
      successFired.current = true;
      const timer = setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted, reviewMutation.isSuccess]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      onError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (!comment.trim()) {
      onError('Vui lòng nhập nội dung đánh giá.');
      return;
    }

    setSubmitted(true);
    reviewMutation.mutate({ orderId, productId, rating, comment: comment.trim() });
  };

  const handleClose = () => {
    setRating(0);
    setHovered(0);
    setComment('');
    setSubmitted(false);
    onClose();
  };

  const displayRating = hovered || rating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md space-y-5 shadow-xl relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="review-modal-title" className="text-lg font-bold text-slate-900">Đánh giá sản phẩm</h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{productName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* SUCCESS STATE */
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Star className="w-7 h-7 text-emerald-600 fill-emerald-500" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base">Cảm ơn bạn đã đánh giá!</p>
              <p className="text-sm text-slate-600 mt-1 flex items-center justify-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                Đã cộng <strong className="text-amber-700">10 điểm</strong> tích lũy cho bạn!
              </p>
            </div>
          </div>
        ) : (
          /* FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-xs text-slate-700 font-semibold">Chất lượng sản phẩm:</label>
              <div className="flex items-center gap-1.5" role="group" aria-label="Đánh giá sao">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    aria-label={`${star} sao`}
                    className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= displayRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm font-semibold text-amber-700">
                    {STAR_LABELS[rating]}
                  </span>
                )}
              </div>
              {rating === 0 && (
                <p className="text-[11px] text-slate-400 italic">Chạm để chọn số sao</p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label htmlFor="review-comment" className="text-xs text-slate-700 font-semibold">
                Nhận xét của bạn:
              </label>
              <textarea
                id="review-comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-amber-400 text-slate-900 placeholder-slate-400 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none shadow-sm"
              />
              <p className="text-[11px] text-slate-400 text-right">
                {comment.length}/1000 ký tự
              </p>
            </div>

            {/* Reward notice */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900">
                Đánh giá thành công → nhận ngay{' '}
                <strong>+10 điểm</strong> tích lũy!
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={reviewMutation.isPending}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={reviewMutation.isPending || rating === 0 || !comment.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-bold rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Gửi đánh giá
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
