import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { Link } from 'react-router-dom';
import {
  Users,
  Award,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CreditCard
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 selection:bg-orange-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">

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
                <Users className="w-7 h-7 text-orange-500" />
                Quản lý Khách hàng & Hạng thẻ
              </h1>
              <p className="text-xs text-slate-400">Danh sách người dùng, điểm thưởng tích lũy và xếp hạng hội viên</p>
            </div>
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
    </div>
  );
}
