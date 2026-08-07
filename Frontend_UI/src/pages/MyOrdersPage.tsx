import { useMemo, useState } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Ban,
  Check,
  Star
} from 'lucide-react';
import type { OrderItem } from './OrderManagementPage';
import ReviewModal from '../components/ReviewModal';

const statusBadges: Record<number | string, { label: string; icon: React.ReactNode; bgClass: string }> = {
  1: {
    label: 'Chờ xử lý (Pending)',
    icon: <Clock className="w-4 h-4 text-amber-600" />,
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  Pending: {
    label: 'Chờ xử lý (Pending)',
    icon: <Clock className="w-4 h-4 text-amber-600" />,
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  2: {
    label: 'Đã duyệt (Approved)',
    icon: <CheckCircle className="w-4 h-4 text-sky-600" />,
    bgClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  Approved: {
    label: 'Đã duyệt (Approved)',
    icon: <CheckCircle className="w-4 h-4 text-sky-600" />,
    bgClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  3: {
    label: 'Đang giao (Shipping)',
    icon: <Truck className="w-4 h-4 text-sky-600" />,
    bgClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  Shipping: {
    label: 'Đang giao (Shipping)',
    icon: <Truck className="w-4 h-4 text-sky-600" />,
    bgClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  4: {
    label: 'Hoàn tất (Completed)',
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  Completed: {
    label: 'Hoàn tất (Completed)',
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  5: {
    label: 'Đã hủy (Cancelled)',
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    bgClass: 'bg-red-50 text-red-700 border-red-200'
  },
  Cancelled: {
    label: 'Đã hủy (Cancelled)',
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    bgClass: 'bg-red-50 text-red-700 border-red-200'
  },
};

export default function MyOrdersPage() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    orderId: number;
    productId: number;
    productName: string;
  } | null>(null);

  // Fetch my orders
  const { data: orders = [], isLoading, isError, error, refetch } = useQuery<OrderItem[]>({
    queryKey: ['myOrders'],
    queryFn: async () => {
      return await axiosClient.get<OrderItem[], OrderItem[]>('/api/orders/my-orders');
    },
  });

  // Helper: lấy imageUrl cho từng sản phẩm trong các đơn hàng (vì API /orders chỉ trả productName).
  const productImageMap = useProductImageMap(orders);

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await axiosClient.put(`/api/orders/my-orders/${orderId}/cancel`);
    },
    onSuccess: (_, orderId) => {
      setNotification({
        type: 'success',
        message: `Đã hủy thành công đơn hàng #${orderId}. Số lượng tồn kho và lượt dùng mã giảm giá đã được hoàn trả!`,
      });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Không thể hủy đơn hàng. Vui lòng kiểm tra lại.',
      });
    },
  });

  // Create Support Ticket Mutation
  const ticketMutation = useMutation({
    mutationFn: async (payload: { orderId: number; subject: string; message: string }) => {
      return await axiosClient.post('/api/tickets', payload);
    },
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: 'Gửi yêu cầu hỗ trợ thành công! Admin sẽ phản hồi sớm nhất có thể.',
      });
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Không thể gửi yêu cầu hỗ trợ. Vui lòng thử lại.',
      });
    },
  });

  // Create Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async (payload: { orderId: number; productId: number; rating: number; comment: string }) => {
      return await axiosClient.post('/api/reviews', payload);
    },
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: 'Đánh giá sản phẩm thành công! Đã cộng 10 điểm tích lũy.',
      });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.',
      });
    },
  });

  const handleOpenTicketModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsTicketModalOpen(true);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || selectedOrderId === null) return;
    ticketMutation.mutate({
      orderId: selectedOrderId,
      subject: ticketSubject,
      message: ticketMessage,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              data-testid="button-back-home"
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded-lg transition border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-7 h-7 text-emerald-600" />
                Lịch sử Đơn hàng của tôi
              </h1>
              <p className="text-sm text-slate-500 mt-1">Theo dõi tiến độ giao hàng và danh sách các đơn hàng đã đặt</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            data-testid="button-refresh-orders"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 text-sm font-semibold rounded-lg transition border border-slate-200 shadow-sm flex items-center gap-1.5 w-fit"
          >
            Làm mới
          </button>
        </header>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <section
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-semibold opacity-80 hover:opacity-100 underline"
            >
              Đóng
            </button>
          </section>
        )}

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <section className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Đang tải lịch sử đơn hàng...</p>
          </section>
        )}

        {isError && (
          <section role="alert" className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Không thể lấy lịch sử đơn hàng</span>
            </div>
            <p className="text-xs text-red-700">{(error as any)?.message || 'Vui lòng kiểm tra lại kết nối hoặc đăng nhập.'}</p>
          </section>
        )}

        {/* ORDERS LIST CONTAINER */}
        {!isLoading && !isError && (
          orders.length > 0 ? (
            <div className="space-y-6">
              {orders.map((order) => {
                const statusInfo = statusBadges[order.status] || {
                  label: `Trạng thái ${order.status}`,
                  icon: <Clock className="w-4 h-4" />,
                  bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                const isPending = String(order.status).toLowerCase() === 'pending' || Number(order.status) === 1;

                return (
                  <article
                    key={order.id}
                    data-testid={`order-card-${order.id}`}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    {/* TOP ORDER HEADER */}
                    <div className="flex flex-col gap-4 pb-4 border-b border-slate-200">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-base">Mã đơn: #{order.id}</span>
                          <span
                            className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border flex items-center gap-1.5 w-fit ${statusInfo.bgClass}`}
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày đặt: {new Date(order.orderDate).toLocaleString('vi-VN')}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-dashed border-slate-200 sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right space-y-0.5">
                          {order.subTotal !== undefined && (
                            <div className="text-xs text-slate-500">
                              Tạm tính: <span className="font-medium text-slate-700 tabular-nums">{order.subTotal.toLocaleString('vi-VN')} đ</span>
                            </div>
                          )}
                          {order.discountAmount && order.discountAmount > 0 ? (
                            <div className="text-xs text-red-600 font-medium">
                              Giảm giá ({order.appliedCouponCode}): -{order.discountAmount.toLocaleString('vi-VN')} đ
                            </div>
                          ) : null}
                          <span className="text-xs text-slate-500 block">Tổng thanh toán</span>
                          <span className="text-xl font-bold text-emerald-600 tabular-nums">
                            {order.totalAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* CANCEL BUTTON */}
                        {isPending && (
                          <button
                            disabled={cancelMutation.isPending}
                            data-testid={`button-cancel-order-${order.id}`}
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${order.id}?`)) {
                                cancelMutation.mutate(order.id);
                              }
                            }}
                            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 disabled:opacity-50 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 text-sm font-bold rounded-lg transition flex items-center gap-1.5"
                          >
                            <Ban className="w-4 h-4" />
                            Hủy đơn hàng
                          </button>
                        )}

                        {/* SUPPORT TICKET TRIGGER */}
                        {(String(order.status).toLowerCase() === 'completed' ||
                          String(order.status).toLowerCase() === 'cancelled' ||
                          Number(order.status) === 4 ||
                          Number(order.status) === 5) && (
                          <button
                            onClick={() => handleOpenTicketModal(order.id)}
                            data-testid={`button-support-order-${order.id}`}
                            className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5"
                          >
                            Yêu cầu hỗ trợ
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ORDER DETAILS ITEMS TABLE */}
                    <section aria-label={`Chi tiết đơn hàng #${order.id}`} className="space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-600" /> Danh sách sản phẩm trong đơn:
                      </h2>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                        <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                          <div className="divide-y divide-slate-200">
                            {order.details && order.details.length > 0 ? (
                              order.details.map((detail, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-4 py-3 px-3.5 border-b border-slate-200 last:border-0 text-xs hover:bg-white transition"
                                >
                                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden flex-shrink-0">
                                    {productImageMap[detail.productId] ? (
                                      <img
                                        src={productImageMap[detail.productId]}
                                        alt={detail.productName}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Package className="w-6 h-6" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <Link
                                      to={`/products/${detail.productId}`}
                                      className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-emerald-600 transition"
                                    >
                                      {detail.productName}
                                    </Link>
                                    <p className="text-sm text-slate-500 mt-0.5">x{detail.quantity}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="text-sm font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                                      {detail.unitPrice.toLocaleString('vi-VN')} đ
                                    </span>
                                    {/* REVIEW BUTTON - only for Completed orders */}
                                    {(String(order.status).toLowerCase() === 'completed' ||
                                      Number(order.status) === 4) &&
                                     !(detail.isReviewed) && (
                                      <button
                                        onClick={() => setReviewModal({
                                          isOpen: true,
                                          orderId: order.id,
                                          productId: detail.productId,
                                          productName: detail.productName,
                                        })}
                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-700 hover:text-amber-800 text-[10px] font-bold rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                                      >
                                        <Star className="w-3 h-3" />
                                        Đánh giá +10 điểm
                                      </button>
                                    )}
                                    {/* REVIEWED BADGE */}
                                    {(detail.isReviewed) && (
                                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-semibold rounded-lg flex items-center gap-1 whitespace-nowrap">
                                        <Check className="w-3 h-3" />
                                        Đã đánh giá
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-xs text-slate-500 italic">Chi tiết đơn hàng đang được cập nhật</div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-3 border-t border-dashed border-slate-300 flex flex-col gap-1 bg-white">
                          {order.subTotal !== undefined && (
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>Tạm tính tiền hàng:</span>
                              <span className="tabular-nums font-medium">{order.subTotal.toLocaleString('vi-VN')} đ</span>
                            </div>
                          )}
                          {order.discountAmount && order.discountAmount > 0 ? (
                            <div className="flex items-center justify-between text-xs text-red-600 font-semibold">
                              <span>Giảm giá ({order.appliedCouponCode}):</span>
                              <span className="tabular-nums">-{order.discountAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Tổng thanh toán:</span>
                            <span className="text-sm font-bold text-emerald-600 tabular-nums">
                              {order.totalAmount.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                  </article>
                );
              })}
            </div>
          ) : (
            <section className="p-16 bg-white border border-slate-200 rounded-xl text-center space-y-4 shadow-sm">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">Bạn chưa có đơn hàng nào</h2>
                <p className="text-xs text-slate-500">Khám phá hàng ngàn thực phẩm tươi sạch và đặt đơn ngay hôm nay!</p>
              </div>
              <Link
                to="/products"
                data-testid="button-shop-now-empty"
                className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                Mua sắm ngay
              </Link>
            </section>
          )
        )}

        {/* SUPPORT TICKET MODAL */}
        {isTicketModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg space-y-6 shadow-xl relative">
              <div>
                <h2 id="ticket-modal-title" className="text-lg font-bold text-slate-900">Yêu cầu hỗ trợ &amp; Khiếu nại</h2>
                <p className="text-xs text-slate-500 mt-1">Gửi phản hồi của bạn về đơn hàng #{selectedOrderId}</p>
              </div>

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="ticket-subject" className="text-xs text-slate-700 font-semibold">Chủ đề khiếu nại:</label>
                  <input
                    id="ticket-subject"
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ví dụ: Giao sai món, thiếu sản phẩm, hoàn trả tiền..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400 rounded-lg text-sm transition focus:outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ticket-message" className="text-xs text-slate-700 font-semibold">Nội dung khiếu nại chi tiết:</label>
                  <textarea
                    id="ticket-message"
                    rows={5}
                    required
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải để admin giải quyết nhanh nhất..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400 rounded-lg text-sm transition focus:outline-none resize-none shadow-sm"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTicketModalOpen(false);
                      setTicketSubject('');
                      setTicketMessage('');
                    }}
                    data-testid="button-cancel-ticket"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={ticketMutation.isPending}
                    data-testid="button-submit-ticket"
                    style={{ backgroundColor: '#047857', color: '#ffffff', borderColor: '#065f46' }}
                    className="px-5 py-2.5 !bg-emerald-700 !text-white !border !border-emerald-800 hover:!bg-emerald-600 active:!bg-emerald-800 disabled:opacity-50 rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    {ticketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {reviewModal && (
          <ReviewModal
            isOpen={reviewModal.isOpen}
            onClose={() => setReviewModal(null)}
            orderId={reviewModal.orderId}
            productId={reviewModal.productId}
            productName={reviewModal.productName}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['myOrders'] });
              queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            }}
            onError={(msg) => {
              setNotification({ type: 'error', message: msg });
            }}
            reviewMutation={reviewMutation}
          />
        )}

      </div>
    </main>
  );
}

function useProductImageMap(orders: OrderItem[]): Record<number, string | undefined> {
  const productIds = useMemo(() => {
    const set = new Set<number>();
    for (const order of orders) {
      for (const detail of order.details ?? []) {
        set.add(detail.productId);
      }
    }
    return Array.from(set);
  }, [orders]);

  const queries = useQueries({
    queries: productIds.map((id) => ({
      queryKey: ['product-image', id] as const,
      queryFn: async () => {
        return await axiosClient.get<{ imageUrl?: string }, { imageUrl?: string }>(
          `/api/products/${id}`
        );
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  return useMemo(() => {
    const map: Record<number, string | undefined> = {};
    productIds.forEach((id, idx) => {
      map[id] = queries[idx]?.data?.imageUrl;
    });
    return map;
  }, [productIds, queries]);
}
