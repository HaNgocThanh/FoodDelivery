import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '@/api/axiosClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, ShoppingBag, CalendarDays, RefreshCw, LayoutDashboard
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

// ─── Types ───────────────────────────────────────────────
interface RevenueByDay { date: string; revenue: number; orderCount: number; }
interface RevenueStats  { totalRevenue: number; totalOrders: number; byDay: RevenueByDay[]; }
interface OrderStatusStat { status: string; count: number; }

// ─── Colour palette for PieChart ─────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Chờ xử lý':  '#f59e0b',
  'Đã duyệt':   '#6366f1',
  'Đang giao':  '#38bdf8',
  'Hoàn thành': '#10b981',
  'Đã hủy':     '#f43f5e',
};
const FALLBACK_COLORS = ['#f59e0b','#6366f1','#38bdf8','#10b981','#f43f5e','#a78bfa'];

// ─── Custom Tooltip for BarChart ─────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-orange-400 font-bold text-sm">
        {Number(payload[0].value).toLocaleString('vi-VN')} đ
      </p>
      {payload[1] && (
        <p className="text-slate-300 text-xs mt-0.5">
          {payload[1].value} đơn hoàn thành
        </p>
      )}
    </div>
  );
};

// ─── Custom Tooltip for PieChart ─────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-slate-200 font-semibold text-sm">{d.name}</p>
      <p className="text-slate-300 text-xs">{d.value} đơn hàng</p>
      <p className="text-slate-400 text-xs">{d.payload.percent}</p>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5 shadow-xl hover:border-slate-700 transition`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Today helper ────────────────────────────────────────
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export default function DashboardPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(toInputDate(firstOfMonth));
  const [endDate,   setEndDate]   = useState(toInputDate(today));
  const [queryDates, setQueryDates] = useState({ start: toInputDate(firstOfMonth), end: toInputDate(today) });

  const handleApply = () => setQueryDates({ start: startDate, end: endDate });

  // ── Fetch Revenue Stats ──────────────────────────────
  const {
    data: revenueStats,
    isLoading: isRevenueLoading,
    isError: isRevenueError,
    refetch: refetchRevenue,
  } = useQuery<RevenueStats>({
    queryKey: ['stats-revenue', queryDates.start, queryDates.end],
    queryFn: () =>
      axiosClient.get<RevenueStats, RevenueStats>(
        `/api/statistics/revenue?startDate=${queryDates.start}&endDate=${queryDates.end}`
      ),
  });

  // ── Fetch Order Status Stats ─────────────────────────
  const {
    data: statusStats = [],
    isLoading: isStatusLoading,
  } = useQuery<OrderStatusStat[]>({
    queryKey: ['stats-order-status'],
    queryFn: () =>
      axiosClient.get<OrderStatusStat[], OrderStatusStat[]>('/api/statistics/order-status'),
  });

  // ── Bar chart data ───────────────────────────────────
  const barData = useMemo(() =>
    (revenueStats?.byDay ?? []).map(d => ({
      date: d.date.slice(5),       // MM-DD
      revenue: d.revenue,
      orders: d.orderCount,
    })),
    [revenueStats]
  );

  // ── Pie chart data ───────────────────────────────────
  const pieData = useMemo(() =>
    statusStats.map(s => ({
      name: s.status,
      value: s.count,
    })),
    [statusStats]
  );

  const totalStatusOrders = pieData.reduce((acc, d) => acc + d.value, 0);

  return (
    <AdminLayout>
      <main className="p-6 lg:p-8 space-y-8 min-h-screen">

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <LayoutDashboard className="w-7 h-7 text-orange-500" />
              Dashboard Thống kê
            </h1>
            <p className="text-sm text-slate-400 mt-1">Tổng quan doanh thu và tình trạng đơn hàng theo thời gian thực</p>
          </div>
          <button
            onClick={() => { refetchRevenue(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {/* DATE FILTER BAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={toInputDate(today)}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>
          <button
            onClick={handleApply}
            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Lọc dữ liệu
          </button>
          <p className="text-xs text-slate-500 self-end pb-1">
            Đang xem: {queryDates.start} → {queryDates.end}
          </p>
        </div>

        {/* STAT CARDS */}
        {isRevenueLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(n => <div key={n} className="h-28 bg-slate-900 rounded-2xl border border-slate-800 animate-pulse" />)}
          </div>
        ) : isRevenueError ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-red-400 text-sm">
            ❌ Không thể tải dữ liệu thống kê. Vui lòng thử lại.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={<TrendingUp className="w-7 h-7 text-orange-400" />}
              label="Tổng Doanh Thu (Completed)"
              value={`${(revenueStats?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ`}
              sub={`Trong khoảng ${queryDates.start} → ${queryDates.end}`}
              color="bg-orange-500/10"
            />
            <StatCard
              icon={<ShoppingBag className="w-7 h-7 text-emerald-400" />}
              label="Tổng Đơn Hoàn Thành"
              value={`${revenueStats?.totalOrders ?? 0} đơn`}
              sub="Đã giao thành công, tính điểm loyalty"
              color="bg-emerald-500/10"
            />
          </div>
        )}

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── BAR CHART: Doanh thu theo ngày ── */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Doanh thu theo ngày
            </h2>
            <p className="text-xs text-slate-400 mb-5">Biểu đồ cột thể hiện doanh thu từng ngày trong khoảng đã chọn</p>

            {isRevenueLoading ? (
              <div className="h-72 bg-slate-800/60 rounded-xl animate-pulse" />
            ) : barData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                Không có đơn hàng hoàn thành trong khoảng thời gian này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(249,115,22,0.05)' }} />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    radius={[6, 6, 0, 0]}
                    fill="url(#barGradient)"
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── PIE CHART: Tỷ lệ trạng thái đơn ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Tỷ lệ trạng thái đơn
            </h2>
            <p className="text-xs text-slate-400 mb-4">Phân phối toàn bộ đơn hàng trong hệ thống</p>

            {isStatusLoading ? (
              <div className="flex-1 bg-slate-800/60 rounded-xl animate-pulse min-h-[220px]" />
            ) : pieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="space-y-2 mt-2">
                  {pieData.map((entry, index) => {
                    const color = STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                    const pct = totalStatusOrders > 0 ? ((entry.value / totalStatusOrders) * 100).toFixed(1) : '0';
                    return (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-300">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{entry.value}</span>
                          <span className="text-slate-500">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* REVENUE TABLE */}
        {!isRevenueLoading && barData.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Chi tiết doanh thu theo ngày</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-6 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Ngày</th>
                    <th className="px-6 py-3 text-right text-xs text-slate-400 font-semibold uppercase tracking-wider">Đơn hoàn thành</th>
                    <th className="px-6 py-3 text-right text-xs text-slate-400 font-semibold uppercase tracking-wider">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenueStats?.byDay ?? []).map((row, i) => (
                    <tr key={row.date} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition ${i % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                      <td className="px-6 py-3 text-slate-300 font-medium">{row.date}</td>
                      <td className="px-6 py-3 text-right text-slate-300">{row.orderCount}</td>
                      <td className="px-6 py-3 text-right font-bold text-orange-400">{row.revenue.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800/50">
                    <td className="px-6 py-3 font-bold text-white">TỔNG CỘNG</td>
                    <td className="px-6 py-3 text-right font-bold text-white">{revenueStats?.totalOrders}</td>
                    <td className="px-6 py-3 text-right font-extrabold text-orange-400">{revenueStats?.totalRevenue.toLocaleString('vi-VN')} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
