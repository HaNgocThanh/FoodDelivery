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
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-emerald-700 font-bold text-sm">
        {Number(payload[0].value).toLocaleString('vi-VN')} đ
      </p>
      {payload[1] && (
        <p className="text-slate-600 text-xs mt-0.5">
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
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-slate-900 font-semibold text-sm">{d.name}</p>
      <p className="text-slate-600 text-xs">{d.value} đơn hàng</p>
      <p className="text-slate-500 text-xs">{d.payload.percent}</p>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition`}>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
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
      <main className="p-6 lg:p-8 space-y-8 min-h-screen bg-slate-50">

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600">
                <LayoutDashboard className="w-5 h-5" />
              </span>
              Dashboard Thống kê
            </h1>
            <p className="text-sm text-slate-500 mt-1">Tổng quan doanh thu và tình trạng đơn hàng theo thời gian thực</p>
          </div>
          <button
            type="button"
            onClick={() => { refetchRevenue(); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {/* DATE FILTER BAR */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-end gap-4 shadow-sm">
          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1.5">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 font-semibold block mb-1.5">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={toInputDate(today)}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition"
          >
            <CalendarDays className="w-4 h-4" />
            Lọc dữ liệu
          </button>
          <p className="text-xs text-slate-500 self-end pb-1">
            Đang xem: <span className="font-mono font-semibold text-slate-700">{queryDates.start}</span> → <span className="font-mono font-semibold text-slate-700">{queryDates.end}</span>
          </p>
        </div>

        {/* STAT CARDS */}
        {isRevenueLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(n => <div key={n} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : isRevenueError ? (
          <div className="p-8 text-center bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            ❌ Không thể tải dữ liệu thống kê. Vui lòng thử lại.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={<TrendingUp className="w-7 h-7 text-emerald-600" />}
              label="Tổng Doanh Thu (Completed)"
              value={`${(revenueStats?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ`}
              sub={`Trong khoảng ${queryDates.start} → ${queryDates.end}`}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<ShoppingBag className="w-7 h-7 text-amber-600" />}
              label="Tổng Đơn Hoàn Thành"
              value={`${revenueStats?.totalOrders ?? 0} đơn`}
              sub="Đã giao thành công, tính điểm loyalty"
              color="bg-amber-50"
            />
          </div>
        )}

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── BAR CHART: Doanh thu theo ngày ── */}
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Doanh thu theo ngày
            </h2>
            <p className="text-xs text-slate-500 mb-5">Biểu đồ cột thể hiện doanh thu từng ngày trong khoảng đã chọn</p>

            {isRevenueLoading ? (
              <div className="h-72 bg-slate-50 rounded-lg animate-pulse" />
            ) : barData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
                Không có đơn hàng hoàn thành trong khoảng thời gian này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    radius={[6, 6, 0, 0]}
                    fill="url(#barGradient)"
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── PIE CHART: Tỷ lệ trạng thái đơn ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-600" />
              Tỷ lệ trạng thái đơn
            </h2>
            <p className="text-xs text-slate-500 mb-4">Phân phối toàn bộ đơn hàng trong hệ thống</p>

            {isStatusLoading ? (
              <div className="flex-1 bg-slate-50 rounded-lg animate-pulse min-h-[220px]" />
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
                          <span className="text-slate-700 font-medium">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-semibold">{entry.value}</span>
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
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Chi tiết doanh thu theo ngày</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">Ngày</th>
                    <th className="px-6 py-3 text-right text-xs text-slate-500 font-semibold uppercase tracking-wider">Đơn hoàn thành</th>
                    <th className="px-6 py-3 text-right text-xs text-slate-500 font-semibold uppercase tracking-wider">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenueStats?.byDay ?? []).map((row, i) => (
                    <tr key={row.date} className={`border-b border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-6 py-3 text-slate-700 font-medium">{row.date}</td>
                      <td className="px-6 py-3 text-right text-slate-700">{row.orderCount}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">{row.revenue.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td className="px-6 py-3 font-bold text-slate-900">TỔNG CỘNG</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">{revenueStats?.totalOrders}</td>
                    <td className="px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{revenueStats?.totalRevenue.toLocaleString('vi-VN')} đ</td>
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
