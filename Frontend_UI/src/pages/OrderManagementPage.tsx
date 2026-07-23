import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import AdminLayout from '@/components/AdminLayout';
import { Link } from 'react-router-dom';
import {
  Truck,
  CheckCircle,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  AlertCircle,
  PackageCheck,
  Eye,
  CreditCard,
  MapPin,
  User,
  Save,
  ShoppingBag,
  Package
} from 'lucide-react';

export interface OrderItemDetail {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderItem {
  id: number;
  userId: number;
  orderDate: string;
  totalAmount: number;
  paymentMethod: string | number;
  status: string | number;
  promotionId?: number | null;
  shipperId?: number | null;
  details: OrderItemDetail[];
}

export interface ShipperItem {
  id: number;
  fullName: string;
  phoneNumber?: string;
  email?: string;
}

const defaultShippers: ShipperItem[] = [
  { id: 2, fullName: 'Lê Văn Nam (Đội 1 - Q1)', phoneNumber: '0981111222' },
  { id: 3, fullName: 'Trần Văn Bình (Đội 2 - Q3)', phoneNumber: '0982222333' },
  { id: 4, fullName: 'Phạm Văn Cường (Đội 3 - Bình Thạnh)', phoneNumber: '0983333444' },
];

// Light-mode badge tokens (theo design system):
//   - Amber: Chờ duyệt (Pending / 1)
//   - Sky:   Đã duyệt / Đang giao (Approved/2, Shipping/3)
//   - Emerald: Hoàn tất (Completed/4)
//   - Red:   Đã hủy (Cancelled/5)
const statusNames: Record<number | string, { label: string; style: string }> = {
  1: { label: 'Chờ xử lý (Pending)', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  Pending: { label: 'Chờ xử lý (Pending)', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  2: { label: 'Đã duyệt (Approved)', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  Approved: { label: 'Đã duyệt (Approved)', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  3: { label: 'Đang giao (Shipping)', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  Shipping: { label: 'Đang giao (Shipping)', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  4: { label: 'Hoàn tất (Completed)', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Completed: { label: 'Hoàn tất (Completed)', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  5: { label: 'Đã hủy (Cancelled)', style: 'bg-red-50 text-red-700 border-red-200' },
  Cancelled: { label: 'Đã hủy (Cancelled)', style: 'bg-red-50 text-red-700 border-red-200' },
};

export default function OrderManagementPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('Pending');

  // Modal States
  const [assignModalOrder, setAssignModalOrder] = useState<OrderItem | null>(null);
  const [selectedShipperId, setSelectedShipperId] = useState<number>(2);

  // Fetch shippers from API
  const { data: shippersList = defaultShippers } = useQuery<ShipperItem[]>({
    queryKey: ['shippers'],
    queryFn: async () => {
      const data = await axiosClient.get<ShipperItem[], ShipperItem[]>('/api/shippers');
      return data && data.length > 0 ? data : defaultShippers;
    },
  });

  const [statusModalOrder, setStatusModalOrder] = useState<OrderItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number>(3); // 3 = Shipping
  
  const [detailModalOrder, setDetailModalOrder] = useState<OrderItem | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch orders from API
  const { data: orders = [], isLoading, isError, error, refetch } = useQuery<OrderItem[]>({
    queryKey: ['admin-orders', filterStatus],
    queryFn: async () => {
      const url = filterStatus ? `/api/orders?status=${filterStatus}` : '/api/orders';
      const data = await axiosClient.get<OrderItem[], OrderItem[]>(url);
      return data;
    },
  });

  // Mutation Assign Shipper
  const assignShipperMutation = useMutation({
    mutationFn: async ({ orderId, shipperId }: { orderId: number; shipperId: number }) => {
      return await axiosClient.put(`/api/orders/${orderId}/assign-shipper`, { shipperId });
    },
    onSuccess: (_, variables) => {
      setNotification({
        type: 'success',
        message: `Đã phân công thành công Shipper #${variables.shipperId} cho đơn hàng #${variables.orderId}!`,
      });
      setAssignModalOrder(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể phân công shipper.' });
    },
  });

  // Mutation Update Order Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: number }) => {
      return await axiosClient.put(`/api/orders/${orderId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      setNotification({
        type: 'success',
        message: `Cập nhật trạng thái đơn hàng #${variables.orderId} thành công!`,
      });
      setStatusModalOrder(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể cập nhật trạng thái.' });
    },
  });

  return (
    <AdminLayout>
      <main className="p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
                <PackageCheck className="w-6 h-6" />
              </span>
              Điều phối &amp; Quản lý Đơn hàng
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Phân công giao hàng và cập nhật trạng thái đơn hàng theo thời gian thực
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 transition text-sm font-semibold shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </header>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            role="alert"
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Đóng thông báo"
              className="text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STATUS TABS / FILTERS — pill shape, light mode */}
        <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
          {['Pending', 'Approved', 'Shipping', 'Completed', 'Cancelled', ''].map((st) => (
            <button
              type="button"
              key={st}
              onClick={() => setFilterStatus(st)}
              data-testid={`filter-status-${st || 'all'}`}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition border ${
                filterStatus === st
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-200'
              }`}
            >
              {st === '' ? 'Tất cả đơn hàng'
                : st === 'Pending' ? 'Chờ xử lý'
                : st === 'Approved' ? 'Đã duyệt'
                : st === 'Shipping' ? 'Đang giao'
                : st === 'Completed' ? 'Hoàn tất'
                : 'Đã hủy'}
            </button>
          ))}
        </nav>

        {/* TABLE CONTAINER — Modern Data Table */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm">Đang tải danh sách đơn hàng...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-600 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="font-semibold text-sm">{(error as any)?.message || 'Không thể kết nối danh sách đơn hàng từ server.'}</p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  Thử lại
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                >
                  Đăng nhập Admin
                </Link>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Clock className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Không có đơn hàng nào ở trạng thái này</p>
              <p className="text-xs text-slate-500">Các đơn hàng mới tạo sẽ xuất hiện tại đây</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th scope="col" className="py-3.5 px-6">Mã đơn</th>
                    <th scope="col" className="py-3.5 px-6">Khách hàng</th>
                    <th scope="col" className="py-3.5 px-6">Ngày đặt</th>
                    <th scope="col" className="py-3.5 px-6">Tổng tiền</th>
                    <th scope="col" className="py-3.5 px-6">Thanh toán</th>
                    <th scope="col" className="py-3.5 px-6">Trạng thái</th>
                    <th scope="col" className="py-3.5 px-6">Shipper</th>
                    <th scope="col" className="py-3.5 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orders.map((order) => {
                    const statusConfig = statusNames[order.status] || {
                      label: String(order.status),
                      style: 'bg-slate-50 text-slate-700 border-slate-200',
                    };

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6 font-mono font-bold text-emerald-700 whitespace-nowrap">#{order.id}</td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          User <span className="font-mono text-slate-700">#{order.userId}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(order.orderDate).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {order.totalAmount?.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {order.paymentMethod === 1 || order.paymentMethod === 'COD' ? 'COD' : 'VNPay'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {order.shipperId ? (
                            <span className="font-mono font-semibold text-emerald-700">#{order.shipperId}</span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa gán</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-1" role="group" aria-label="Thao tác">
                            {/* Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => setDetailModalOrder(order)}
                              title="Xem chi tiết đơn"
                              aria-label="Xem chi tiết đơn"
                              data-testid={`button-view-order-${order.id}`}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Phân công shipper */}
                            <button
                              type="button"
                              onClick={() => {
                                setAssignModalOrder(order);
                                setSelectedShipperId(shippersList[0]?.id || 2);
                              }}
                              title="Phân công shipper"
                              aria-label="Phân công shipper"
                              data-testid={`button-assign-${order.id}`}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            {/* Cập nhật trạng thái */}
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalOrder(order);
                                setSelectedStatus(3);
                              }}
                              title="Cập nhật trạng thái"
                              aria-label="Cập nhật trạng thái"
                              data-testid={`button-update-status-${order.id}`}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL PHÂN CÔNG SHIPPER — light mode */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAssignModalOrder(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="assign-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
              <header className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 id="assign-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Phân công Shipper - Đơn <span className="font-mono text-emerald-700">#{assignModalOrder.id}</span>
                </h3>
                <button type="button" onClick={() => setAssignModalOrder(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="space-y-3">
                <label htmlFor="shipper-select" className="block text-sm font-semibold text-slate-700">
                  Chọn nhân viên giao hàng:
                </label>
                <select
                  id="shipper-select"
                  value={selectedShipperId}
                  onChange={(e) => setSelectedShipperId(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  {shippersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <footer className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignModalOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    assignShipperMutation.mutate({
                      orderId: assignModalOrder.id,
                      shipperId: selectedShipperId,
                    })
                  }
                  disabled={assignShipperMutation.isPending}
                  data-testid="button-confirm-assign"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  {assignShipperMutation.isPending ? 'Đang lưu...' : 'Xác nhận phân công'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT TRẠNG THÁI — light mode, nút lớn */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setStatusModalOrder(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="status-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
              <header className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 id="status-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-600" />
                  Cập nhật Trạng thái - Đơn <span className="font-mono text-emerald-700">#{statusModalOrder.id}</span>
                </h3>
                <button type="button" onClick={() => setStatusModalOrder(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="space-y-3">
                <label htmlFor="status-select" className="block text-sm font-semibold text-slate-700">
                  Chọn trạng thái đơn hàng mới:
                </label>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                >
                  <option value={2}>2 - Đã duyệt (Approved)</option>
                  <option value={3}>3 - Đang giao hàng (Shipping)</option>
                  <option value={4}>4 - Đã hoàn tất (Completed)</option>
                  <option value={5}>5 - Hủy đơn hàng (Cancelled)</option>
                </select>
              </div>

              <footer className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      orderId: statusModalOrder.id,
                      status: selectedStatus,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-confirm-status"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {updateStatusMutation.isPending ? 'Đang lưu...' : 'Lưu trạng thái'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG — 2-Card layout (Customer info + Product list) */}
      {detailModalOrder && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetailModalOrder(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="detail-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
              {/* Header — sticky */}
              <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 flex-shrink-0">
                <h3 id="detail-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-amber-600" />
                  Chi tiết Đơn hàng <span className="font-mono text-emerald-700">#{detailModalOrder.id}</span>
                </h3>
                <button type="button" onClick={() => setDetailModalOrder(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Body — 2 cards */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* CARD 1: Thông tin khách hàng & Giao hàng */}
                <section aria-label="Thông tin khách hàng" className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-4">
                    <User className="w-4 h-4 text-emerald-600" /> Thông tin khách hàng &amp; Giao hàng
                  </h4>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2.5">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-500">Khách hàng</dt>
                        <dd className="font-semibold text-slate-900">User <span className="font-mono">#{detailModalOrder.userId}</span></dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <PackageCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-500">Ngày đặt</dt>
                        <dd className="font-medium text-slate-700">{new Date(detailModalOrder.orderDate).toLocaleString('vi-VN')}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-500">Phương thức thanh toán</dt>
                        <dd className="font-semibold text-slate-900">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            detailModalOrder.paymentMethod === 1 || detailModalOrder.paymentMethod === 'COD'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            {detailModalOrder.paymentMethod === 1 || detailModalOrder.paymentMethod === 'COD' ? 'COD (Tiền mặt)' : 'VNPay (Online)'}
                          </span>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Truck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-500">Shipper phụ trách</dt>
                        <dd className="font-semibold text-slate-900">
                          {detailModalOrder.shipperId ? (
                            <span className="text-emerald-700 font-mono">Shipper #{detailModalOrder.shipperId}</span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân công</span>
                          )}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-500">Địa chỉ nhận hàng</dt>
                        <dd className="font-medium text-slate-700">(Xem chi tiết trong đơn hàng của khách)</dd>
                      </div>
                    </div>
                  </dl>

                  {/* Trạng thái + Update status CTA */}
                  <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái hiện tại:</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        statusNames[detailModalOrder.status]?.style || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {statusNames[detailModalOrder.status]?.label || String(detailModalOrder.status)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const o = detailModalOrder;
                        setDetailModalOrder(null);
                        setStatusModalOrder(o);
                        setSelectedStatus(3);
                      }}
                      data-testid="button-update-status-from-detail"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition"
                    >
                      <Truck className="w-4 h-4" />
                      Cập nhật trạng thái
                    </button>
                  </div>
                </section>

                {/* CARD 2: Danh sách sản phẩm — giống MyOrdersPage body card */}
                <section aria-label="Danh sách sản phẩm" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <header className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Danh sách sản phẩm trong đơn
                    </h4>
                  </header>

                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
                    {detailModalOrder.details && detailModalOrder.details.length > 0 ? (
                      detailModalOrder.details.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 py-3 px-5 hover:bg-slate-50 transition">
                          <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {item.productName || `Sản phẩm #${item.productId}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Mã món: <span className="font-mono">#{item.productId}</span> · SL: <strong className="text-slate-700">{item.quantity}</strong> · Đơn giá: <strong className="text-slate-700 tabular-nums">{item.unitPrice?.toLocaleString('vi-VN')} đ</strong>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                              {(item.subtotal ?? (item.quantity * item.unitPrice)).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-6 text-center text-slate-400 italic text-sm">Không có dữ liệu chi tiết sản phẩm.</p>
                    )}
                  </div>

                  {/* Footer tổng */}
                  <footer className="flex justify-between items-center px-5 py-4 border-t border-slate-200 bg-emerald-50">
                    <span className="text-sm font-bold text-slate-700">Tổng cộng đơn hàng:</span>
                    <span className="text-xl font-extrabold text-emerald-700 tabular-nums">
                      {detailModalOrder.totalAmount?.toLocaleString('vi-VN')} đ
                    </span>
                  </footer>
                </section>
              </div>

              {/* Footer — sticky đóng */}
              <footer className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailModalOrder(null)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  <X className="w-4 h-4" />
                  Đóng
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
