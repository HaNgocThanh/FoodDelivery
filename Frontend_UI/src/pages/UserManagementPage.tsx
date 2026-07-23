import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import AdminLayout from '@/components/AdminLayout';
import {
  Users,
  Award,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CreditCard,
  X,
  Edit,
  RefreshCw
} from 'lucide-react';
import type { MembershipTier, UserProfile } from './ProfilePage';

export interface UserPaginatedResponse {
  items: UserProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UserManagementPage() {
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Edit Modal States
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>('');
  const [editAddress1, setEditAddress1] = useState<string>('');
  const [editAddress2, setEditAddress2] = useState<string>('');
  const [editLoyaltyPoints, setEditLoyaltyPoints] = useState<number>(0);
  const [editTier, setEditTier] = useState<number>(0);
  const [editRole, setEditRole] = useState<string>('Customer');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditFullName(user.fullName || '');
    setEditEmail(user.email || '');
    setEditPhoneNumber(user.phoneNumber || '');
    setEditAddress1(user.address1 || '');
    setEditAddress2(user.address2 || '');
    setEditLoyaltyPoints(user.loyaltyPoints || 0);

    // Parse tier
    let tierNum = 0;
    if (typeof user.tier === 'number') {
      tierNum = user.tier;
    } else {
      const tLower = String(user.tier || '').toLowerCase();
      if (tLower === 'platinum' || tLower === '3') tierNum = 3;
      else if (tLower === 'gold' || tLower === '2') tierNum = 2;
      else if (tLower === 'silver' || tLower === '1') tierNum = 1;
    }
    setEditTier(tierNum);
    setEditRole(user.role || 'Customer');
    setEditError(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setEditError(null);
    try {
      await axiosClient.put(`/api/users/${editingUser.id}`, {
        fullName: editFullName,
        email: editEmail,
        phoneNumber: editPhoneNumber,
        address1: editAddress1,
        address2: editAddress2,
        loyaltyPoints: editLoyaltyPoints,
        tier: editTier,
        role: editRole,
      });
      setEditingUser(null);
      refetch();
    } catch (err: any) {
      setEditError(err.message || 'Lỗi cập nhật thông tin khách hàng.');
    } finally {
      setIsSaving(false);
    }
  };

  const { data, isLoading, isError, error, refetch } = useQuery<UserPaginatedResponse>({
    queryKey: ['usersList', page],
    queryFn: async () => {
      return await axiosClient.get<UserPaginatedResponse, UserPaginatedResponse>(`/api/users?page=${page}&pageSize=${pageSize}`);
    },
  });

  const getTierBadge = (tier: MembershipTier | string | undefined) => {
    const str = String(tier || '').toLowerCase();
    if (str === 'platinum' || str === '3') {
      return (
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 w-fit">
          <Sparkles className="w-3.5 h-3.5 text-slate-600" /> Bạch Kim
        </span>
      );
    }
    if (str === 'gold' || str === '2') {
      return (
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 w-fit">
          <Crown className="w-3.5 h-3.5 text-amber-600" /> Vàng
        </span>
      );
    }
    if (str === 'silver' || str === '1') {
      return (
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-slate-50 text-slate-600 border border-slate-300 flex items-center gap-1.5 w-fit">
          <Award className="w-3.5 h-3.5 text-slate-500" /> Bạc
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold uppercase rounded-lg bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1.5 w-fit">
        <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Standard
      </span>
    );
  };

  return (
    <AdminLayout>
      <main className="p-6 lg:p-8 space-y-8 min-h-screen bg-slate-50">

        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-50 text-sky-600">
                <Users className="w-5 h-5" />
              </span>
              Quản lý Khách hàng &amp; Hạng thẻ
            </h1>
            <p className="text-xs text-slate-500 mt-1">Danh sách người dùng, điểm thưởng tích lũy và xếp hạng hội viên</p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold rounded-lg transition shadow-sm w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới dữ liệu
          </button>
        </header>

        {/* STATS OVERVIEW CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng số Khách hàng</span>
            <p className="text-2xl font-bold text-slate-900">{data?.totalCount || 0}</p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Trang hiện tại</span>
            <p className="text-2xl font-bold text-amber-600">{data?.page || 1} <span className="text-slate-400 font-normal text-lg">/ {data?.totalPages || 1}</span></p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Hiển thị mỗi trang</span>
            <p className="text-2xl font-bold text-emerald-700">{pageSize} <span className="text-base text-slate-500 font-normal">người dùng</span></p>
          </div>
        </section>

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Đang tải danh sách người dùng...</p>
          </div>
        )}

        {isError && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Không thể lấy danh sách người dùng</span>
            </div>
            <p className="text-xs text-red-700">{(error as any)?.message || 'Bạn cần quyền Admin để xem danh sách này.'}</p>
          </div>
        )}

        {/* USERS TABLE */}
        {data && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-6">ID</th>
                    <th scope="col" className="py-3.5 px-6">Khách hàng</th>
                    <th scope="col" className="py-3.5 px-6">Số điện thoại</th>
                    <th scope="col" className="py-3.5 px-6">Vai trò</th>
                    <th scope="col" className="py-3.5 px-6">Điểm tích lũy</th>
                    <th scope="col" className="py-3.5 px-6">Hạng thành viên</th>
                    <th scope="col" className="py-3.5 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.items.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">#{user.id}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-700 text-xs">{user.phoneNumber || <span className="text-slate-400">—</span>}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg ${
                          user.role?.toLowerCase() === 'admin'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-emerald-700 text-base tabular-nums">{user.loyaltyPoints}</span>
                        <span className="text-xs text-slate-500 pl-1">điểm</span>
                      </td>
                      <td className="py-4 px-6">
                        {getTierBadge(user.tier)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          data-testid={`button-edit-user-${user.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition text-xs font-semibold mx-auto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Xem / Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Trang <span className="font-bold text-slate-900">{data.page}</span> / <span className="font-bold text-slate-900">{data.totalPages || 1}</span> ({data.totalCount} người dùng)</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>

                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg transition"
                >
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* MODAL XEM & SỬA THÔNG TIN KHÁCH HÀNG — light mode */}
      {editingUser && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingUser(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="user-edit-title"
               className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <header className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 id="user-edit-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" />
                  Chi tiết tài khoản <span className="font-mono text-emerald-700">#{editingUser.id}</span>
                </h3>
                <button type="button" onClick={() => setEditingUser(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Error Alert */}
              {editError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="user-edit-name" className="block text-xs font-semibold text-slate-600">Họ và tên:</label>
                    <input
                      id="user-edit-name"
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="user-edit-phone" className="block text-xs font-semibold text-slate-600">Số điện thoại:</label>
                    <input
                      id="user-edit-phone"
                      type="text"
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="user-edit-email" className="block text-xs font-semibold text-slate-600">Địa chỉ Email:</label>
                  <input
                    id="user-edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="user-edit-addr1" className="block text-xs font-semibold text-slate-600">Địa chỉ dòng 1:</label>
                  <input
                    id="user-edit-addr1"
                    type="text"
                    value={editAddress1}
                    onChange={(e) => setEditAddress1(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="user-edit-addr2" className="block text-xs font-semibold text-slate-600">Địa chỉ dòng 2 (Không bắt buộc):</label>
                  <input
                    id="user-edit-addr2"
                    type="text"
                    value={editAddress2}
                    onChange={(e) => setEditAddress2(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="user-edit-points" className="block text-xs font-semibold text-slate-600">Điểm tích lũy:</label>
                    <input
                      id="user-edit-points"
                      type="number"
                      value={editLoyaltyPoints}
                      onChange={(e) => setEditLoyaltyPoints(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="user-edit-tier" className="block text-xs font-semibold text-slate-600">Hạng hội viên:</label>
                    <select
                      id="user-edit-tier"
                      value={editTier}
                      onChange={(e) => setEditTier(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                    >
                      <option value={0}>0 - Standard</option>
                      <option value={1}>1 - Bạc (Silver)</option>
                      <option value={2}>2 - Vàng (Gold)</option>
                      <option value={3}>3 - Bạch Kim (Platinum)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="user-edit-role" className="block text-xs font-semibold text-slate-600">Vai trò tài khoản:</label>
                  <select
                    id="user-edit-role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium transition"
                  >
                    <option value="Customer">Customer (Khách hàng)</option>
                    <option value="Admin">Admin (Quản trị viên)</option>
                    <option value="Shipper">Shipper (Nhân viên giao hàng)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <footer className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={isSaving}
                  data-testid="button-save-user"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thông tin'
                  )}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
