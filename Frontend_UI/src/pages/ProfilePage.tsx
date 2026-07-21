import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  Crown,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  TrendingUp,
  CreditCard
} from 'lucide-react';

export type MembershipTier = 0 | 1 | 2 | 3;
export const MembershipTierVal = {
  Standard: 0 as MembershipTier,
  Silver: 1 as MembershipTier,
  Gold: 2 as MembershipTier,
  Platinum: 3 as MembershipTier,
} as const;

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  address1: string;
  address2?: string;
  loyaltyPoints: number;
  tier: MembershipTier | string;
  role: string;
}

export default function ProfilePage() {

  const { data: profile, isLoading, isError, error, refetch } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      return await axiosClient.get<UserProfile, UserProfile>('/api/users/profile');
    },
  });

  // Chuyển đổi tier thành number nếu nhận về string hoặc enum
  const getTierNumber = (tier: MembershipTier | string | undefined): MembershipTier => {
    if (tier === undefined || tier === null) return MembershipTierVal.Standard;
    if (typeof tier === 'number') return tier as MembershipTier;
    const str = String(tier).toLowerCase();
    if (str === 'platinum' || str === '3') return MembershipTierVal.Platinum;
    if (str === 'gold' || str === '2') return MembershipTierVal.Gold;
    if (str === 'silver' || str === '1') return MembershipTierVal.Silver;
    return MembershipTierVal.Standard;
  };

  const currentTier = getTierNumber(profile?.tier);
  const points = profile?.loyaltyPoints || 0;

  // Tính toán tiến trình lên hạng
  const getTierProgress = (tier: MembershipTier, pts: number) => {
    let nextTierName = 'Bạc (Silver)';
    let pointsNeeded = 100;
    let nextTierPoints = 100;

    if (tier === MembershipTierVal.Standard) {
      nextTierName = 'Bạc (Silver)';
      nextTierPoints = 100;
      pointsNeeded = Math.max(0, 100 - pts);
    } else if (tier === MembershipTierVal.Silver) {
      nextTierName = 'Vàng (Gold)';
      nextTierPoints = 500;
      pointsNeeded = Math.max(0, 500 - pts);
    } else if (tier === MembershipTierVal.Gold) {
      nextTierName = 'Bạch Kim (Platinum)';
      nextTierPoints = 1000;
      pointsNeeded = Math.max(0, 1000 - pts);
    } else {
      nextTierName = 'Hạng Thẻ Cao Nhất';
      nextTierPoints = 1000;
      pointsNeeded = 0;
    }

    const percentage = tier === MembershipTierVal.Platinum
      ? 100
      : Math.min(100, Math.round((pts / nextTierPoints) * 100));

    return { nextTierName, nextTierPoints, pointsNeeded, percentage };
  };

  const progressInfo = getTierProgress(currentTier, points);

  // Styling Thẻ Membership ảo (Virtual Card) theo Hạng
  const getCardStyle = (tier: MembershipTier) => {
    switch (tier) {
      case MembershipTierVal.Platinum:
        return {
          title: 'PLATINUM MEMBER',
          label: 'Bạch Kim',
          bgClass: 'bg-gradient-to-tr from-slate-900 via-zinc-200 to-slate-400 text-slate-950 border border-slate-300/60 shadow-2xl shadow-slate-300/20',
          badgeClass: 'bg-slate-950/80 text-zinc-100 border border-zinc-300/50',
          icon: <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />,
        };
      case MembershipTierVal.Gold:
        return {
          title: 'GOLD MEMBER',
          label: 'Vàng',
          bgClass: 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 text-slate-950 border border-amber-300/60 shadow-2xl shadow-amber-500/20',
          badgeClass: 'bg-slate-950/80 text-amber-300 border border-amber-400/50',
          icon: <Crown className="w-6 h-6 text-amber-900" />,
        };
      case MembershipTierVal.Silver:
        return {
          title: 'SILVER MEMBER',
          label: 'Bạc',
          bgClass: 'bg-gradient-to-tr from-slate-700 via-zinc-400 to-slate-500 text-slate-950 border border-slate-300/50 shadow-2xl shadow-slate-400/20',
          badgeClass: 'bg-slate-950/80 text-slate-200 border border-slate-400/50',
          icon: <Award className="w-6 h-6 text-slate-900" />,
        };
      default:
        return {
          title: 'STANDARD MEMBER',
          label: 'Chuẩn (Standard)',
          bgClass: 'bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-800 text-white border border-slate-700 shadow-xl',
          badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700',
          icon: <CreditCard className="w-6 h-6 text-orange-400" />,
        };
    }
  };

  const cardStyle = getCardStyle(currentTier);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 selection:bg-orange-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* HEADER BAR */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <User className="w-7 h-7 text-orange-500" />
                Hồ sơ & Thẻ Thành viên
              </h1>
              <p className="text-xs text-slate-400">Quản lý thông tin cá nhân và điểm thưởng tích lũy</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition border border-slate-800 flex items-center gap-1.5"
          >
            Làm mới
          </button>
        </div>

        {/* LOADING / ERROR STATE */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium">Đang tải thông tin hồ sơ của bạn...</p>
          </div>
        )}

        {isError && (
          <div className="p-6 bg-red-950/80 border border-red-500/50 rounded-2xl text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Không thể tải thông tin hồ sơ</span>
            </div>
            <p className="text-xs text-red-300">{(error as any)?.message || 'Vui lòng kiểm tra lại kết nối mạng hoặc đăng nhập lại.'}</p>
          </div>
        )}

        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* VIRTUAL MEMBERSHIP CARD (Lefthand Side - 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-400" />
                Thẻ hội viên điện tử
              </div>

              {/* THE CARD */}
              <div className={`relative rounded-3xl p-6 h-56 flex flex-col justify-between overflow-hidden ${cardStyle.bgClass} transition-all duration-300 hover:scale-[1.02]`}>
                {/* Background decorative watermark pattern */}
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                {/* Top Card Header */}
                <div className="flex justify-between items-start z-10">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-75">FoodDelivery Club</span>
                    <h3 className="text-lg font-black tracking-wider mt-0.5">{cardStyle.title}</h3>
                  </div>
                  <div className="p-2 bg-slate-950/20 backdrop-blur-md rounded-2xl border border-white/20">
                    {cardStyle.icon}
                  </div>
                </div>

                {/* Card Middle Chip & Number */}
                <div className="z-10 space-y-1 my-auto">
                  <div className="w-9 h-7 bg-amber-400/80 rounded-md border border-amber-200/50 shadow-inner" />
                  <p className="font-mono text-sm tracking-widest opacity-80 pt-1">
                    **** **** **** {String(profile.id).padStart(4, '0')}
                  </p>
                </div>

                {/* Card Bottom Footer */}
                <div className="flex justify-between items-end z-10 pt-2 border-t border-black/10">
                  <div>
                    <span className="text-[9px] uppercase font-bold opacity-70 block">Chủ thẻ</span>
                    <span className="font-bold text-sm tracking-wide uppercase">{profile.fullName}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm ${cardStyle.badgeClass}`}>
                    Hạng {cardStyle.label}
                  </div>
                </div>
              </div>

              {/* MEMBERSHIP PROGRESS BAR */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    Điểm tích lũy hiện tại:
                  </span>
                  <span className="font-black text-base text-orange-400">{profile.loyaltyPoints} điểm</span>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-2">
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 shadow-lg shadow-orange-500/30"
                      style={{ width: `${progressInfo.percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>{progressInfo.percentage}% đạt được</span>
                    {currentTier === MembershipTierVal.Platinum ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Đã đạt hạng cao nhất!
                      </span>
                    ) : (
                      <span>Cần thêm <strong className="text-amber-400">{progressInfo.pointsNeeded} điểm</strong> để lên {progressInfo.nextTierName}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* USER DETAILED INFORMATION (Righthand Side - 7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                Chi tiết tài khoản
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                {/* Profile Avatar & Title */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                  <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/20">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {profile.fullName}
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-lg">
                        {profile.role}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Mã tài khoản: #{profile.id}</p>
                  </div>
                </div>

                {/* Field Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-orange-400" /> Địa chỉ Email
                    </span>
                    <p className="text-sm font-medium text-slate-100 truncate">{profile.email}</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Số điện thoại
                    </span>
                    <p className="text-sm font-medium text-slate-100">{profile.phoneNumber || 'Chưa cập nhật'}</p>
                  </div>

                  <div className="sm:col-span-2 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> Địa chỉ giao hàng chính
                    </span>
                    <p className="text-sm font-medium text-slate-100">{profile.address1 || 'Chưa cập nhật'}</p>
                    {profile.address2 && <p className="text-xs text-slate-400 pt-0.5">{profile.address2}</p>}
                  </div>
                </div>

                {/* MEMBERSHIP TIER BENIFITS OVERVIEW */}
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Quyền lợi Hạng thẻ của bạn:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className={`p-3 rounded-xl border text-center transition ${currentTier === MembershipTierVal.Standard ? 'border-orange-500 bg-orange-500/10 text-white font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                      Standard (&lt;100đ)
                    </div>
                    <div className={`p-3 rounded-xl border text-center transition ${currentTier === MembershipTierVal.Silver ? 'border-slate-400 bg-slate-400/10 text-slate-200 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                      Bạc (100đ+)
                    </div>
                    <div className={`p-3 rounded-xl border text-center transition ${currentTier === MembershipTierVal.Gold ? 'border-amber-400 bg-amber-400/10 text-amber-300 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                      Vàng (500đ+)
                    </div>
                    <div className={`p-3 rounded-xl border text-center transition ${currentTier === MembershipTierVal.Platinum ? 'border-zinc-200 bg-zinc-200/10 text-zinc-100 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                      Bạch Kim (1000đ+)
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
