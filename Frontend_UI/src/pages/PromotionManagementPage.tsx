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
      <main className="p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
                <Ticket className="w-6 h-6" />
              </span>
              Quản lý Mã Khuyến mãi (Voucher)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Tạo mã giảm giá, thiết lập hạn sử dụng và theo dõi lượt dùng
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 transition text-sm font-semibold shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg shadow-sm hover:shadow-md transition text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Tạo mã mới
            </button>
          </div>
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

        {/* TABLE CONTAINER — Modern Data Table */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm">Đang tải danh sách mã khuyến mãi...</span>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm font-semibold">Không thể tải mã khuyến mãi từ server.</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Ticket className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Chưa có mã khuyến mãi nào</p>
              <p className="text-xs text-slate-500">Bấm "Tạo mã mới" để bắt đầu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th scope="col" className="py-3.5 px-6">ID</th>
                    <th scope="col" className="py-3.5 px-6">Mã Voucher</th>
                    <th scope="col" className="py-3.5 px-6">Mức giảm giá</th>
                    <th scope="col" className="py-3.5 px-6">Lượt sử dụng</th>
                    <th scope="col" className="py-3.5 px-6">Hạn sử dụng</th>
                    <th scope="col" className="py-3.5 px-6">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {promotions.map((promo) => {
                    const isFull = promo.currentUsage >= promo.maxUsage;
                    const isExpired = promo.isExpired || new Date() > new Date(promo.expiryDate);
                    const isValid = promo.isActive && !isExpired && !isFull;

                    return (
                      <tr key={promo.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6 font-mono font-bold text-emerald-700 whitespace-nowrap">
                          #{promo.id}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 tracking-wider shadow-sm">
                            <Tag className="w-3.5 h-3.5 text-amber-600" />
                            {promo.code}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-700 text-base whitespace-nowrap">
                          -{promo.discountPercentage}%
                        </td>
                        <td className="py-4 px-6 text-slate-700">
                          <span className="font-semibold">{promo.currentUsage}</span>
                          <span className="text-slate-400"> / {promo.maxUsage} lượt</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs flex items-center gap-1.5 pt-5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(promo.expiryDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-6">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> Còn hạn
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3.5 h-3.5" /> Hết hạn
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5" /> Hết lượt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
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
        </section>
      </main>

      {/* MODAL TẠO MÃ KHUYẾN MÃI MỚI — light mode */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="promo-create-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
              <header className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 id="promo-create-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-600" />
                  Tạo Mã Khuyến Mãi Mới
                </h3>
                <button type="button" onClick={() => setIsCreateOpen(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="space-y-4 text-sm">
                <div>
                  <label htmlFor="promo-code" className="block font-semibold text-slate-700 mb-1.5">Mã Voucher (Code):</label>
                  <input
                    id="promo-code"
                    type="text"
                    placeholder="VD: HELLOFRESH, FOOD50..."
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-mono font-bold tracking-wider outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="promo-discount" className="block font-semibold text-slate-700 mb-1.5">Mức giảm (%):</label>
                    <input
                      id="promo-discount"
                      type="number"
                      min={1}
                      max={100}
                      value={createForm.discountPercentage}
                      onChange={(e) => setCreateForm({ ...createForm, discountPercentage: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-bold tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor="promo-maxusage" className="block font-semibold text-slate-700 mb-1.5">Số lượt tối đa:</label>
                    <input
                      id="promo-maxusage"
                      type="number"
                      min={1}
                      value={createForm.maxUsage}
                      onChange={(e) => setCreateForm({ ...createForm, maxUsage: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="promo-expiry" className="block font-semibold text-slate-700 mb-1.5">Ngày hết hạn:</label>
                  <input
                    id="promo-expiry"
                    type="date"
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-medium"
                  />
                </div>

                <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                  <span className="font-semibold text-slate-700">Kích hoạt mã ngay</span>
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              <footer className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => createMutation.mutate(createForm)}
                  disabled={createMutation.isPending || !createForm.code.trim()}
                  data-testid="button-create-promo"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo mã voucher'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
