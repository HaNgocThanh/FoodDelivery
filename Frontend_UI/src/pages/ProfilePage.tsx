import { useState } from 'react';
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
  CreditCard,
  Lock,
  KeyRound
} from 'lucide-react';

type TabKey = 'info' | 'address' | 'password';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',     label: 'Thông tin cá nhân', icon: <User className="w-4 h-4" /> },
  { key: 'address',  label: 'Địa chỉ',           icon: <MapPin className="w-4 h-4" /> },
  { key: 'password', label: 'Đổi mật khẩu',     icon: <KeyRound className="w-4 h-4" /> },
];

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

  const [activeTab, setActiveTab] = useState<TabKey>('info');

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
          // Bạch Kim: gradient bạc-slate sáng (giữ đặc trưng kim loại quý)
          bgClass: 'bg-gradient-to-br from-slate-400 via-zinc-200 to-slate-600 text-slate-900 border border-white/60 shadow-2xl shadow-slate-400/40',
          badgeClass: 'bg-slate-900/85 text-zinc-100 border border-white/30 backdrop-blur-md',
          icon: <Sparkles className="w-6 h-6 text-amber-400" />,
        };
      case MembershipTierVal.Gold:
        return {
          title: 'GOLD MEMBER',
          label: 'Vàng',
          // Vàng: gradient vàng-amber đậm (đặc trưng kim loại quý)
          bgClass: 'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-700 text-amber-950 border border-amber-300/80 shadow-2xl shadow-amber-500/40',
          badgeClass: 'bg-amber-950/85 text-amber-100 border border-amber-300/40 backdrop-blur-md',
          icon: <Crown className="w-6 h-6 text-amber-100" />,
        };
      case MembershipTierVal.Silver:
        return {
          title: 'SILVER MEMBER',
          label: 'Bạc',
          // Bạc: gradient xám-trắng bạc
          bgClass: 'bg-gradient-to-br from-slate-300 via-zinc-100 to-slate-500 text-slate-900 border border-white/60 shadow-2xl shadow-slate-400/40',
          badgeClass: 'bg-slate-900/85 text-slate-100 border border-white/30 backdrop-blur-md',
          icon: <Award className="w-6 h-6 text-slate-100" />,
        };
      default:
        return {
          title: 'STANDARD MEMBER',
          label: 'Chuẩn (Standard)',
          // Standard: gradient emerald-teal chủ đạo dự án (theo yêu cầu đề bài)
          bgClass: 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-800 text-white border border-white/20 shadow-2xl shadow-emerald-500/40',
          badgeClass: 'bg-emerald-950/70 text-white border border-white/30 backdrop-blur-md',
          icon: <CreditCard className="w-6 h-6 text-white" />,
        };
    }
  };

  const cardStyle = getCardStyle(currentTier);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              data-testid="button-back-home"
              aria-label="Quay về trang chủ"
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded-lg transition border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <User className="w-7 h-7 text-emerald-600" />
                Hồ sơ &amp; Thẻ Thành viên
              </h1>
              <p className="text-sm text-slate-500 mt-1">Quản lý thông tin cá nhân và điểm thưởng tích lũy</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            data-testid="button-refresh-profile"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 text-sm font-semibold rounded-lg transition border border-slate-200 shadow-sm flex items-center gap-1.5 w-fit"
          >
            Làm mới
          </button>
        </header>

        {/* LOADING / ERROR STATE */}
        {isLoading && (
          <section className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Đang tải thông tin hồ sơ của bạn...</p>
          </section>
        )}

        {isError && (
          <section role="alert" className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Không thể tải thông tin hồ sơ</span>
            </div>
            <p className="text-xs text-red-700">{(error as any)?.message || 'Vui lòng kiểm tra lại kết nối mạng hoặc đăng nhập lại.'}</p>
          </section>
        )}

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ============== SIDEBAR (1/4 cols) ============== */}
            <aside className="md:col-span-1 space-y-4">
              {/* Avatar + name card */}
              <section className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
                <div className="relative inline-block">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-3xl font-bold shadow-md ring-4 ring-white border border-slate-200">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white border-2 border-white shadow-sm">
                    {cardStyle.icon}
                  </span>
                </div>
                <h2 className="mt-3 text-base font-bold text-slate-900 truncate">{profile.fullName}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Mã tài khoản: #{profile.id}</p>
                <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold uppercase tracking-wide">
                  <ShieldCheck className="w-3 h-3" /> {profile.role}
                </span>
              </section>

              {/* Tabs */}
              <nav className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm" aria-label="Điều hướng hồ sơ">
                <ul className="space-y-1">
                  {TABS.map((t) => {
                    const isActive = activeTab === t.key;
                    return (
                      <li key={t.key}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(t.key)}
                          data-testid={`tab-${t.key}`}
                          aria-current={isActive ? 'page' : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition text-left ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>
                            {t.icon}
                          </span>
                          <span className="flex-1">{t.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* ============== MAIN CONTENT (3/4 cols) ============== */}
            <section className="md:col-span-3 space-y-6">

              {/* TAB: THÔNG TIN CÁ NHÂN */}
              {activeTab === 'info' && (
                <>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Thẻ hội viên điện tử
                    </h3>
                  </div>

                  {/* THE CARD - aspect-[1.58/1] như thẻ tín dụng */}
                  <article
                    data-testid="membership-card"
                    className={`relative w-full max-w-md aspect-[1.58/1] rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden ${cardStyle.bgClass} transition-all duration-300 hover:scale-[1.02]`}
                  >
                    {/* Glassmorphism decorative blobs */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
                    <div className="absolute -right-4 -bottom-12 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

                    {/* Top: Logo + Tier Badge */}
                    <div className="flex justify-between items-start z-10 relative">
                      <div>
                        <span className="block text-[10px] font-bold tracking-widest uppercase opacity-80">Member Card</span>
                        <h4 className="text-base sm:text-lg font-bold tracking-wider mt-0.5">{cardStyle.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-xs font-bold uppercase shadow-sm">
                        {cardStyle.icon}
                        <span>{cardStyle.label}</span>
                      </div>
                    </div>

                    {/* Middle: Chip + barcode-style card number */}
                    <div className="z-10 relative space-y-1.5">
                      <div className="w-10 h-7 bg-amber-300/90 rounded-md border border-amber-100/60 shadow-inner" aria-hidden="true" />
                      <p className="font-mono text-sm sm:text-base tracking-widest font-semibold opacity-90 pt-1">
                        **** **** **** {String(profile.id).padStart(4, '0')}
                      </p>
                    </div>

                    {/* Bottom: Customer name + Points */}
                    <div className="flex justify-between items-end z-10 relative pt-2 border-t border-black/10">
                      <div className="min-w-0">
                        <span className="block text-[9px] uppercase font-bold opacity-70">Chủ thẻ</span>
                        <span className="font-bold text-sm tracking-wide uppercase truncate block max-w-[12rem]">
                          {profile.fullName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] uppercase font-bold opacity-70">Điểm</span>
                        <span className="font-bold text-base tabular-nums">
                          {profile.loyaltyPoints.toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </article>

                  {/* MEMBERSHIP PROGRESS BAR */}
                  <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Điểm tích lũy hiện tại:
                      </span>
                      <span className="font-bold text-base text-emerald-600 tabular-nums">
                        {profile.loyaltyPoints} điểm
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${progressInfo.percentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                        <span>{progressInfo.percentage}% đạt được</span>
                        {currentTier === MembershipTierVal.Platinum ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Đã đạt hạng cao nhất!
                          </span>
                        ) : (
                          <span>
                            Cần thêm <strong className="text-amber-600">{progressInfo.pointsNeeded} điểm</strong> để lên {progressInfo.nextTierName}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* FORM THÔNG TIN CÁ NHÂN */}
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
                    aria-labelledby="profile-form-title"
                  >
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h3 id="profile-form-title" className="text-base font-bold text-slate-900">
                        Chi tiết tài khoản
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="profile-fullName" className="block text-xs font-semibold text-slate-700">
                          Họ và tên
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="profile-fullName"
                            type="text"
                            readOnly
                            value={profile.fullName}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-700">
                          Số điện thoại
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="profile-phone"
                            type="tel"
                            readOnly
                            value={profile.phoneNumber || ''}
                            placeholder="Chưa cập nhật"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-700">
                          Địa chỉ Email
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="profile-email"
                            type="email"
                            readOnly
                            value={profile.email}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        disabled
                        title="Tính năng cập nhật thông tin đang được phát triển"
                        data-testid="button-update-profile"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cập nhật thông tin
                      </button>
                    </div>
                  </form>

                  {/* QUYỀN LỢI HẠNG THẺ */}
                  <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Quyền lợi Hạng thẻ của bạn
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div
                        className={`p-3 rounded-lg border text-center transition ${
                          currentTier === MembershipTierVal.Standard
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        Standard (&lt;100đ)
                      </div>
                      <div
                        className={`p-3 rounded-lg border text-center transition ${
                          currentTier === MembershipTierVal.Silver
                            ? 'border-slate-400 bg-slate-100 text-slate-800 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        Bạc (100đ+)
                      </div>
                      <div
                        className={`p-3 rounded-lg border text-center transition ${
                          currentTier === MembershipTierVal.Gold
                            ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        Vàng (500đ+)
                      </div>
                      <div
                        className={`p-3 rounded-lg border text-center transition ${
                          currentTier === MembershipTierVal.Platinum
                            ? 'border-zinc-400 bg-zinc-100 text-zinc-800 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        Bạch Kim (1000đ+)
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* TAB: ĐỊA CHỈ */}
              {activeTab === 'address' && (
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
                  aria-labelledby="address-form-title"
                >
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <h3 id="address-form-title" className="text-base font-bold text-slate-900">
                      Sổ địa chỉ giao hàng
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="profile-address1" className="block text-xs font-semibold text-slate-700">
                        Địa chỉ chính
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <textarea
                          id="profile-address1"
                          readOnly
                          rows={2}
                          value={profile.address1 || ''}
                          placeholder="Chưa cập nhật"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="profile-address2" className="block text-xs font-semibold text-slate-700">
                        Địa chỉ phụ (tuỳ chọn)
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <textarea
                          id="profile-address2"
                          readOnly
                          rows={2}
                          value={profile.address2 || ''}
                          placeholder="Chưa cập nhật"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled
                      title="Tính năng cập nhật địa chỉ đang được phát triển"
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cập nhật địa chỉ
                    </button>
                  </div>
                </form>
              )}

              {/* TAB: ĐỔI MẬT KHẨU */}
              {activeTab === 'password' && (
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
                  aria-labelledby="password-form-title"
                >
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                    <h3 id="password-form-title" className="text-base font-bold text-slate-900">
                      Đổi mật khẩu
                    </h3>
                  </div>

                  <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 text-sm text-sky-800 flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 text-sky-600 flex-shrink-0" />
                    <span>
                      Để bảo mật tài khoản, vui lòng sử dụng mật khẩu mới có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="profile-current-pw" className="block text-xs font-semibold text-slate-700">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        id="profile-current-pw"
                        type="password"
                        disabled
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="profile-new-pw" className="block text-xs font-semibold text-slate-700">
                        Mật khẩu mới
                      </label>
                      <input
                        id="profile-new-pw"
                        type="password"
                        disabled
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="profile-confirm-pw" className="block text-xs font-semibold text-slate-700">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        id="profile-confirm-pw"
                        type="password"
                        disabled
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled
                      title="Tính năng đổi mật khẩu đang được phát triển"
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Đổi mật khẩu
                    </button>
                  </div>
                </form>
              )}

            </section>

          </div>
        )}

      </div>
    </main>
  );
}
