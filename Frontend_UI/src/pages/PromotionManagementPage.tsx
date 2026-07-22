import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import AdminLayout from '@/components/AdminLayout';
import {
  Ticket,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Tag,
  Clock
} from 'lucide-react';

export interface PromotionItem {
  id: number;
  code: string;
  discountPercentage: number;
  maxUsage: number;
  currentUsage: number;
  expiryDate: string;
  isActive: boolean;
  isExpired: boolean;
}

export default function PromotionManagementPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    discountPercentage: 10,
    maxUsage: 50,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Promotions from API
  const { data: promotions = [], isLoading, isError, refetch } = useQuery<PromotionItem[]>({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      return await axiosClient.get<PromotionItem[], PromotionItem[]>('/api/promotions');
    },
  });

  // Mutation Create Promotion
  const createMutation = useMutation<PromotionItem, Error, typeof createForm>({
    mutationFn: async (payload) => {
      return await axiosClient.post<PromotionItem, PromotionItem>('/api/promotions', payload);
    },
    onSuccess: (newPromo) => {
      setNotification({
        type: 'success',
        message: `Tạo thành công mã khuyến mãi '${newPromo.code}' giảm ${newPromo.discountPercentage}%!`,
      });
      setIsCreateOpen(false);
      setCreateForm({
        code: '',
        discountPercentage: 10,
        maxUsage: 50,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
    onError: (err: Error) => {
      setNotification({ type: 'error', message: err.message || 'Không thể tạo mã khuyến mãi.' });
    },
  });

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 min-h-screen">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Ticket className="w-8 h-8 text-orange-500" />
              Quản lý Mã Khuyến mãi (Voucher)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Tạo mã giảm giá, thiết lập hạn sử dụng và theo dõi lượt dùng
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-orange-500/20 transition text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Tạo mã mới
            </button>
          </div>
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

        {/* TABLE CONTAINER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span>Đang tải danh sách mã khuyến mãi...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <span>Không thể tải mã khuyến mãi từ server.</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Ticket className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Chưa có mã khuyến mãi nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Mã Voucher</th>
                    <th className="py-4 px-6">Mức giảm giá</th>
                    <th className="py-4 px-6">Lượt sử dụng</th>
                    <th className="py-4 px-6">Hạn sử dụng</th>
                    <th className="py-4 px-6">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {promotions.map((promo) => {
                    const isFull = promo.currentUsage >= promo.maxUsage;
                    const isExpired = promo.isExpired || new Date() > new Date(promo.expiryDate);
                    const isValid = promo.isActive && !isExpired && !isFull;

                    return (
                      <tr key={promo.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-6 font-mono font-bold text-orange-400">#{promo.id}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg font-mono font-bold text-white tracking-wider">
                            <Tag className="w-3.5 h-3.5 text-orange-500" />
                            {promo.code}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-400 text-base">
                          -{promo.discountPercentage}%
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          <span className="font-semibold">{promo.currentUsage}</span> / {promo.maxUsage} lượt
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs flex items-center gap-1.5 pt-5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(promo.expiryDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-6">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3.5 h-3.5" /> Còn hạn
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                              <AlertCircle className="w-3.5 h-3.5" /> Hết hạn
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3.5 h-3.5" /> Hết lượt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Vô hiệu
                            </span>
                          )}
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

      {/* MODAL TẠO MÃ KHUYẾN MÃI MỚI */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-400" />
                Tạo Mã Khuyến Mãi Mới
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Mã Voucher (Code):</label>
                <input
                  type="text"
                  placeholder="VD: HELLOFRESH, FOOD50..."
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold tracking-wider outline-none focus:border-orange-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Mức giảm (%):</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={createForm.discountPercentage}
                    onChange={(e) => setCreateForm({ ...createForm, discountPercentage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Số lượt tối đa:</label>
                  <input
                    type="number"
                    min={1}
                    value={createForm.maxUsage}
                    onChange={(e) => setCreateForm({ ...createForm, maxUsage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Ngày hết hạn:</label>
                <input
                  type="date"
                  value={createForm.expiryDate}
                  onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="font-medium text-slate-200">Kích hoạt mã ngay:</span>
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.code.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo mã voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
