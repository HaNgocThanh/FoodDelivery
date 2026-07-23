import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Check
} from 'lucide-react';
import type { OrderItem } from './OrderManagementPage';

const statusBadges: Record<number | string, { label: string; icon: React.ReactNode; bgClass: string }> = {
  1: {
    label: 'Chờ xử lý (Pending)',
    icon: <Clock className="w-4 h-4 text-amber-400" />,
    bgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  Pending: {
    label: 'Chờ xử lý (Pending)',
    icon: <Clock className="w-4 h-4 text-amber-400" />,
    bgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  2: {
    label: 'Đã duyệt (Approved)',
    icon: <CheckCircle className="w-4 h-4 text-blue-400" />,
    bgClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  Approved: {
    label: 'Đã duyệt (Approved)',
    icon: <CheckCircle className="w-4 h-4 text-blue-400" />,
    bgClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  3: {
    label: 'Đang giao (Shipping)',
    icon: <Truck className="w-4 h-4 text-indigo-400" />,
    bgClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  },
  Shipping: {
    label: 'Đang giao (Shipping)',
    icon: <Truck className="w-4 h-4 text-indigo-400" />,
    bgClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  },
  4: {
    label: 'Hoàn tất (Completed)',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    bgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  Completed: {
    label: 'Hoàn tất (Completed)',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    bgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  5: {
    label: 'Đã hủy (Cancelled)',
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    bgClass: 'bg-red-500/15 text-red-300 border-red-500/30'
  },
  Cancelled: {
    label: 'Đã hủy (Cancelled)',
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    bgClass: 'bg-red-500/15 text-red-300 border-red-500/30'
  },
};

export default function MyOrdersPage() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Fetch my orders
  const { data: orders = [], isLoading, isError, error, refetch } = useQuery<OrderItem[]>({
    queryKey: ['myOrders'],
    queryFn: async () => {
      return await axiosClient.get<OrderItem[], OrderItem[]>('/api/orders/my-orders');
    },
  });

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await axiosClient.put(`/api/orders/my-orders/${orderId}/cancel`);
    },
    onSuccess: (_, orderId) => {
      setNotification({
        type: 'success',
        message: `Đã hủy thành công đơn hàng #${orderId}. Số lượng tồn kho đã được hoàn trả!`,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 selection:bg-orange-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-7 h-7 text-orange-500" />
                Lịch sử Đơn hàng của tôi
              </h1>
              <p className="text-xs text-slate-400">Theo dõi tiến độ giao hàng và danh sách các đơn hàng đã đặt</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition border border-slate-800 flex items-center gap-1.5 w-fit"
          >
            Làm mới
          </button>
        </div>

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
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium">Đang tải lịch sử đơn hàng...</p>
          </div>
        )}

        {isError && (
          <div className="p-6 bg-red-950/80 border border-red-500/50 rounded-2xl text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Không thể lấy lịch sử đơn hàng</span>
            </div>
            <p className="text-xs text-red-300">{(error as any)?.message || 'Vui lòng kiểm tra lại kết nối hoặc đăng nhập.'}</p>
          </div>
        )}

        {/* ORDERS LIST CONTAINER */}
        {!isLoading && !isError && (
          orders.length > 0 ? (
            <div className="space-y-6">
              {orders.map((order) => {
                const statusInfo = statusBadges[order.status] || {
                  label: `Trạng thái ${order.status}`,
                  icon: <Clock className="w-4 h-4" />,
                  bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
                };

                const isPending = String(order.status).toLowerCase() === 'pending' || Number(order.status) === 1;

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl hover:border-slate-700 transition"
                  >
                    {/* TOP ORDER HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white text-base">Mã đơn: #{order.id}</span>
                          <span
                            className={`px-3 py-1 text-xs font-bold uppercase rounded-xl border flex items-center gap-1.5 w-fit ${statusInfo.bgClass}`}
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Ngày đặt: {new Date(order.orderDate).toLocaleString('vi-VN')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right mr-2">
                          <span className="text-xs text-slate-400 block">Tổng thanh toán</span>
                          <span className="text-xl font-black text-orange-400">
                            {order.totalAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* CANCEL BUTTON (Only shown when Pending) */}
                        {isPending && (
                          <button
                            disabled={cancelMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${order.id}?`)) {
                                cancelMutation.mutate(order.id);
                              }
                            }}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Ban className="w-4 h-4 text-red-400" />
                            Hủy đơn hàng
                          </button>
                        )}

                        {/* SUPPORT TICKET TRIGGER (Only shown when Completed or Cancelled) */}
                        {(String(order.status).toLowerCase() === 'completed' ||
                          String(order.status).toLowerCase() === 'cancelled' ||
                          Number(order.status) === 4 ||
                          Number(order.status) === 5) && (
                          <button
                            onClick={() => handleOpenTicketModal(order.id)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            Yêu cầu hỗ trợ
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ORDER DETAILS ITEMS TABLE */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-orange-400" /> Danh sách sản phẩm trong đơn:
                      </h4>

                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="divide-y divide-slate-800/60">
                          {order.details && order.details.length > 0 ? (
                            order.details.map((detail, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/40 transition"
                              >
                                <div>
                                  <Link
                                    to={`/products/${detail.productId}`}
                                    className="font-bold text-white hover:text-orange-400 transition"
                                  >
                                    {detail.productName}
                                  </Link>
                                  <p className="text-slate-500 text-[11px] font-mono">ID: #{detail.productId}</p>
                                </div>
                                <div className="flex items-center gap-6 text-right font-medium">
                                  <span className="text-slate-400">Số lượng: <strong className="text-white">{detail.quantity}</strong></span>
                                  <span className="text-slate-300">{detail.unitPrice.toLocaleString('vi-VN')} đ</span>
                                  <span className="font-bold text-orange-400 min-w-[90px]">
                                    {(detail.subtotal || detail.quantity * detail.unitPrice).toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-xs text-slate-500 italic">Chi tiết đơn hàng đang được cập nhật</div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4">
              <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-300">Bạn chưa có đơn hàng nào</h3>
                <p className="text-xs text-slate-500">Khám phá hàng ngàn thực phẩm tươi sạch và đặt đơn ngay hôm nay!</p>
              </div>
              <Link
                to="/products"
                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 transition"
              >
                Mua sắm ngay
              </Link>
            </div>
          )
        )}

        {/* SUPPORT TICKET MODAL */}
        {isTicketModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 shadow-2xl relative">
              <div>
                <h3 className="text-lg font-black text-white">Yêu cầu hỗ trợ &amp; Khiếu nại</h3>
                <p className="text-xs text-slate-400">Gửi phản hồi của bạn về đơn hàng #{selectedOrderId}</p>
              </div>

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Chủ đề khiếu nại:</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ví dụ: Giao sai món, thiếu sản phẩm, hoàn trả tiền..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-orange-500 text-white placeholder-slate-600 rounded-xl text-xs transition focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Nội dung khiếu nại chi tiết:</label>
                  <textarea
                    rows={5}
                    required
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải để admin giải quyết nhanh nhất..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-orange-500 text-white placeholder-slate-600 rounded-2xl text-xs transition focus:outline-none resize-none"
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
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={ticketMutation.isPending}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
                  >
                    {ticketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
