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
  Edit
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
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-slate-200/20 text-slate-100 border border-slate-300/40 flex items-center gap-1.5 w-fit">
          <Sparkles className="w-3.5 h-3.5 text-slate-200" /> Bạch Kim
        </span>
      );
    }
    if (str === 'gold' || str === '2') {
      return (
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 w-fit">
          <Crown className="w-3.5 h-3.5 text-amber-400" /> Vàng
        </span>
      );
    }
    if (str === 'silver' || str === '1') {
      return (
        <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center gap-1.5 w-fit">
          <Award className="w-3.5 h-3.5 text-slate-400" /> Bạc
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold uppercase rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5 w-fit">
        <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Standard
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 min-h-screen">

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-orange-500" />
              Quản lý Khách hàng &amp; Hạng thẻ
            </h1>
            <p className="text-xs text-slate-400">Danh sách người dùng, điểm thưởng tích lũy và xếp hạng hội viên</p>
          </div>

          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition border border-slate-800 flex items-center gap-1.5 w-fit"
          >
            Làm mới dữ liệu
          </button>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Tổng số Khách hàng</span>
            <p className="text-2xl font-black text-white">{data?.totalCount || 0}</p>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Trang hiện tại</span>
            <p className="text-2xl font-black text-orange-400">{data?.page || 1} / {data?.totalPages || 1}</p>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Hiển thị mỗi trang</span>
            <p className="text-2xl font-black text-emerald-400">{pageSize} người dùng</p>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium">Đang tải danh sách người dùng...</p>
          </div>
        )}

        {isError && (
          <div className="p-6 bg-red-950/80 border border-red-500/50 rounded-2xl text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Không thể lấy danh sách người dùng</span>
            </div>
            <p className="text-xs text-red-300">{(error as any)?.message || 'Bạn cần quyền Admin để xem danh sách này.'}</p>
          </div>
        )}

        {/* USERS TABLE */}
        {data && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Khách hàng</th>
                    <th className="py-4 px-6">Số điện thoại</th>
                    <th className="py-4 px-6">Vai trò</th>
                    <th className="py-4 px-6">Điểm tích lũy</th>
                    <th className="py-4 px-6">Hạng thành viên</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {data.items.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">#{user.id}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-white text-sm">{user.fullName}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs">{user.phoneNumber || '—'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg ${user.role?.toLowerCase() === 'admin' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-orange-400 text-base">{user.loyaltyPoints}</span>
                        <span className="text-xs text-slate-400 pl-1">điểm</span>
                      </td>
                      <td className="py-4 px-6">
                        {getTierBadge(user.tier)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg transition text-xs font-semibold flex items-center gap-1 mx-auto"
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
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Trang {data.page} / {data.totalPages || 1} ({data.totalCount} người dùng)</span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>

                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition flex items-center gap-1"
                >
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL XEM & SỬA THÔNG TIN KHÁCH HÀNG */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Chi tiết tài khoản #{editingUser.id}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Alert */}
            {editError && (
              <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">Họ và tên:</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">Số điện thoại:</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Địa chỉ Email:</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Địa chỉ dòng 1:</label>
                <input
                  type="text"
                  value={editAddress1}
                  onChange={(e) => setEditAddress1(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Địa chỉ dòng 2 (Không bắt buộc):</label>
                <input
                  type="text"
                  value={editAddress2}
                  onChange={(e) => setEditAddress2(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">Điểm tích lũy:</label>
                  <input
                    type="number"
                    value={editLoyaltyPoints}
                    onChange={(e) => setEditLoyaltyPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">Hạng hội viên:</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                  >
                    <option value={0}>0 - Standard</option>
                    <option value={1}>1 - Bạc (Silver)</option>
                    <option value={2}>2 - Vàng (Gold)</option>
                    <option value={3}>3 - Bạch Kim (Platinum)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Vai trò tài khoản:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 text-xs font-medium"
                >
                  <option value="Customer">Customer (Khách hàng)</option>
                  <option value="Admin">Admin (Quản trị viên)</option>
                  <option value="Shipper">Shipper (Nhân viên giao hàng)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-lg shadow-orange-500/20 transition flex items-center gap-1.5"
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
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
