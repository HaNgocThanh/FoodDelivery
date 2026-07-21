import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { Link } from 'react-router-dom';
import {
  Truck,
  CheckCircle,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  AlertCircle,
  PackageCheck
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

const statusNames: Record<number | string, { label: string; style: string }> = {
  1: { label: 'Chờ xử lý (Pending)', style: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Pending: { label: 'Chờ xử lý (Pending)', style: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  2: { label: 'Đã duyệt (Approved)', style: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Approved: { label: 'Đã duyệt (Approved)', style: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  3: { label: 'Đang giao (Shipping)', style: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  Shipping: { label: 'Đang giao (Shipping)', style: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  4: { label: 'Hoàn tất (Completed)', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Completed: { label: 'Hoàn tất (Completed)', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  5: { label: 'Đã hủy (Cancelled)', style: 'bg-red-500/15 text-red-400 border-red-500/30' },
  Cancelled: { label: 'Đã hủy (Cancelled)', style: 'bg-red-500/15 text-red-400 border-red-500/30' },
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <PackageCheck className="w-8 h-8 text-orange-500" />
              Điều phối & Quản lý Đơn hàng
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Phân công giao hàng và cập nhật trạng thái đơn hàng theo thời gian thực
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STATUS TABS / FILTERS */}
        <div className="flex flex-wrap gap-2">
          {['Pending', 'Shipping', 'Completed', ''].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                filterStatus === st
                  ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {st === '' ? 'Tất cả đơn hàng' : st === 'Pending' ? 'Chờ xử lý (Pending)' : st === 'Shipping' ? 'Đang giao (Shipping)' : 'Hoàn tất (Completed)'}
            </button>
          ))}
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span>Đang tải danh sách đơn hàng...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="font-semibold text-sm">{(error as any)?.message || 'Không thể kết nối danh sách đơn hàng từ server.'}</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700"
                >
                  Thử lại
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-orange-500/20"
                >
                  Đăng nhập Admin
                </Link>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Clock className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Không có đơn hàng nào ở trạng thái này</p>
              <p className="text-xs text-slate-500">Các đơn hàng mới tạo sẽ xuất hiện tại đây</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <th className="py-4 px-6">Mã đơn</th>
                    <th className="py-4 px-6">Khách hàng</th>
                    <th className="py-4 px-6">Ngày đặt</th>
                    <th className="py-4 px-6">Tổng tiền</th>
                    <th className="py-4 px-6">Thanh toán</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6">Shipper</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {orders.map((order) => {
                    const statusConfig = statusNames[order.status] || {
                      label: String(order.status),
                      style: 'bg-slate-800 text-slate-300 border-slate-700',
                    };

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-6 font-mono font-bold text-orange-400">#{order.id}</td>
                        <td className="py-4 px-6 font-medium text-slate-200">User #{order.userId}</td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {new Date(order.orderDate).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-100">
                          {order.totalAmount?.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          {order.paymentMethod === 1 || order.paymentMethod === 'COD' ? 'COD (Tiền mặt)' : 'Online'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          {order.shipperId ? (
                            <span className="font-mono text-emerald-400">Shipper #{order.shipperId}</span>
                          ) : (
                            <span className="text-slate-500 italic">Chưa gán</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            {/* Nút Phân công Shipper */}
                            <button
                              onClick={() => {
                                setAssignModalOrder(order);
                                setSelectedShipperId(shippersList[0]?.id || 2);
                              }}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg transition text-xs font-semibold flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Phân công
                            </button>

                            {/* Nút Cập nhật Trạng thái */}
                            <button
                              onClick={() => {
                                setStatusModalOrder(order);
                                setSelectedStatus(3); // Default Shipping
                              }}
                              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg transition text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Cập nhật
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
        </div>
      </div>

      {/* MODAL PHÂN CÔNG SHIPPER */}
      {assignModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Phân công Shipper - Đơn #{assignModalOrder.id}
              </h3>
              <button onClick={() => setAssignModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Chọn nhân viên giao hàng:
              </label>
              <select
                value={selectedShipperId}
                onChange={(e) => setSelectedShipperId(Number(e.target.value))}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:border-indigo-500 outline-none"
              >
                {shippersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setAssignModalOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  assignShipperMutation.mutate({
                    orderId: assignModalOrder.id,
                    shipperId: selectedShipperId,
                  })
                }
                disabled={assignShipperMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {assignShipperMutation.isPending ? 'Đang lưu...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT TRẠNG THÁI */}
      {statusModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                Cập nhật Trạng thái - Đơn #{statusModalOrder.id}
              </h3>
              <button onClick={() => setStatusModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Chọn trạng thái đơn hàng mới:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(Number(e.target.value))}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:border-orange-500 outline-none"
              >
                <option value={2}>2 - Đã duyệt (Approved)</option>
                <option value={3}>3 - Đang giao hàng (Shipping)</option>
                <option value={4}>4 - Đã hoàn tất (Completed)</option>
                <option value={5}>5 - Hủy đơn hàng (Cancelled)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setStatusModalOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  updateStatusMutation.mutate({
                    orderId: statusModalOrder.id,
                    status: selectedStatus,
                  })
                }
                disabled={updateStatusMutation.isPending}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {updateStatusMutation.isPending ? 'Đang lưu...' : 'Lưu trạng thái'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
