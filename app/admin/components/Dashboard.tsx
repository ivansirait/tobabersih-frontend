"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText, CheckCircle, Clock,
  AlertCircle, TrendingUp, Calendar,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, ResponsiveContainer
} from 'recharts';
import PredictionWidget from './Gakguna/PredictionWidget';

interface Laporan {
  id?: string;
  status?: 'PENDING' | 'DITINDAKLANJUTI' | 'DIPROSES' | 'SELESAI';
  district?: string;
  wilayah?: string;
  createdAt?: string;
  tanggal?: string;
}

interface DashboardProps {
  laporanList: Laporan[];
  posts: any[];
  loading?: boolean;
}

interface StatData {
  totalLaporan: number;
  laporanSelesai: number;
  laporanDiproses: number;
  laporanPending: number;
  laporanDitindaklanjuti: number;
}

// Generate fallback chart data (7 hari terakhir) dari data laporan lokal
const generateFallbackChart = (laporanList: any[]) => {
  const map = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const item of laporanList) {
    const raw = item?.createdAt || item?.tanggal;
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([tanggal, total]) => ({
    hari: new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'short' }),
    laporan: total,
  }));
};

export default function Dashboard({ laporanList, posts, loading = false }: DashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [stats, setStats] = useState<StatData>({
    totalLaporan: 0,
    laporanSelesai: 0,
    laporanDiproses: 0,
    laporanPending: 0,
    laporanDitindaklanjuti: 0,
  });

  const [grafikData, setGrafikData] = useState<{ hari: string; laporan: number }[]>([]);
  const prevStatsRef = useRef<StatData | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      setChartSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Gunakan fallback data jika laporanList kosong (untuk demo)
  const getFallbackData = useCallback((data: any[]) => {
    if (Array.isArray(data) && data.length > 0) return data;
    
    // Fallback data untuk demo - generate secara konsisten
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 15 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const statuses = ['PENDING', 'DITINDAKLANJUTI', 'DIPROSES', 'SELESAI'];
      // Gunakan date sebagai seed untuk consistency
      const dayIndex = Math.floor((d.getTime() / (1000 * 60 * 60 * 24)) % 4);
      return {
        id: `demo-${i}`,
        status: statuses[dayIndex],
        district: ['Balige', 'Ajibata', 'Simamacan'][i % 3],
        wilayah: ['Balige', 'Ajibata', 'Simamacan'][i % 3],
        createdAt: d.toISOString(),
      };
    });
  }, []);

  const safeLaporanList = useMemo(() => getFallbackData(laporanList), [laporanList, getFallbackData]);

  // Data processing dengan useMemo untuk mencegah perhitungan berulang
  const processedData = useMemo(() => {
    const totalLaporan = safeLaporanList.length;
    const laporanSelesai = safeLaporanList.filter(l => l.status === 'SELESAI').length;
    const persentaseSelesai = totalLaporan ? Math.round((laporanSelesai / totalLaporan) * 100) : 0;

    // Status counts
    const statusCounts = safeLaporanList.reduce((acc: Record<string, number>, item: any) => {
      const s = item?.status || 'PENDING';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const statusSummary = [
      { key: 'PENDING', label: 'Pending', color: 'bg-rose-500' },
      { key: 'DITINDAKLANJUTI', label: 'Ditindaklanjuti', color: 'bg-blue-500' },
      { key: 'DIPROSES', label: 'Diproses', color: 'bg-amber-500' },
      { key: 'SELESAI', label: 'Selesai', color: 'bg-emerald-500' },
    ].map(item => {
      const total = statusCounts[item.key] || 0;
      return { ...item, total, percentage: totalLaporan ? Math.round((total / totalLaporan) * 100) : 0 };
    });

    // Wilayah stats
    const wilayahRawStats = safeLaporanList.reduce(
      (acc: Record<string, { total: number; selesai: number }>, item: any) => {
        const w = (item?.district || item?.wilayah || 'Tanpa Wilayah').toString().trim().toUpperCase();
        if (!acc[w]) acc[w] = { total: 0, selesai: 0 };
        acc[w].total += 1;
        if (item?.status === 'SELESAI') acc[w].selesai += 1;
        return acc;
      }, {}
    );

    const wilayahColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500'];
    const kinerjaWilayah = Object.entries(wilayahRawStats)
      .map(([nama, d]) => ({
        nama,
        persentase: d.total ? Math.round((d.selesai / d.total) * 100) : 0,
        total: d.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((item, idx) => ({ ...item, color: wilayahColors[idx % wilayahColors.length] }));

    console.log('📊 Dashboard Data:', { totalLaporan, laporanSelesai, statusCounts, wilayahCount: Object.keys(wilayahRawStats).length });

    return {
      safeLaporanList,
      totalLaporan,
      laporanSelesai,
      persentaseSelesai,
      statusSummary,
      kinerjaWilayah
    };
  }, [safeLaporanList]);

  const { safeLaporanList: processedLaporanList, totalLaporan, laporanSelesai, persentaseSelesai, statusSummary, kinerjaWilayah } = processedData;

  // Generate chart data
  useEffect(() => {
    if (processedLaporanList && processedLaporanList.length > 0) {
      setGrafikData(generateFallbackChart(processedLaporanList));
    }
  }, [processedLaporanList]);

  // Initial stats calculation - hanya update jika nilai sebenarnya berubah
  useEffect(() => {
    const newStats: StatData = {
      totalLaporan: processedData.totalLaporan,
      laporanSelesai: processedData.laporanSelesai,
      laporanDiproses: processedData.statusSummary.find(s => s.key === 'DIPROSES')?.total || 0,
      laporanPending: processedData.statusSummary.find(s => s.key === 'PENDING')?.total || 0,
      laporanDitindaklanjuti: processedData.statusSummary.find(s => s.key === 'DITINDAKLANJUTI')?.total || 0,
    };

    // Hanya update jika nilai benar-benar berbeda
    if (prevStatsRef.current === null ||
        prevStatsRef.current.totalLaporan !== newStats.totalLaporan ||
        prevStatsRef.current.laporanSelesai !== newStats.laporanSelesai ||
        prevStatsRef.current.laporanDiproses !== newStats.laporanDiproses ||
        prevStatsRef.current.laporanPending !== newStats.laporanPending ||
        prevStatsRef.current.laporanDitindaklanjuti !== newStats.laporanDitindaklanjuti) {
      setStats(newStats);
      prevStatsRef.current = newStats;
    }
  }, [processedData.totalLaporan, processedData.laporanSelesai, processedData.statusSummary]);

  if (loading) {
    return (
      <div className="p-3 md:p-4 lg:p-6 xl:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto">
        {/* Header Skeleton */}
        <div className="h-10 w-60 bg-slate-200 rounded-lg animate-pulse" />

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="w-12 h-6 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-pulse">
            <div className="h-64 bg-slate-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-pulse">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 lg:p-6 xl:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-2 md:gap-4">
          <div>
            <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight">Ringkasan Operasional</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-1 md:gap-2 text-xs md:text-sm lg:text-base">
              <Calendar size={14} />
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          label="Laporan Baru"
          value={stats.laporanPending}
          icon={<AlertCircle className="text-blue-600" />}
          subText="Perlu Respon Segera"
          trend="+5%"
          color="blue"
        />
        <StatCard
          label="Ditindaklanjuti"
          value={stats.laporanDitindaklanjuti}
          icon={<Clock className="text-amber-600" />}
          subText="Sedang Ditangani"
          trend="PROGRESS"
          color="amber"
        />
        <StatCard
          label="Diproses"
          value={stats.laporanDiproses}
          icon={<FileText className="text-purple-600" />}
          subText="Dalam Proses Penyelesaian"
          trend="ONGOING"
          color="purple"
        />
        <StatCard
          label="Selesai"
          value={stats.laporanSelesai}
          icon={<CheckCircle className="text-emerald-600" />}
          subText={`${persentaseSelesai}% Efisiensi`}
          trend="COMPLETE"
          color="emerald"
        />
      </div>

      {/* Chart and Kinerja Wilayah */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 min-w-0 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 lg:mb-8 gap-2 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Analitik Laporan</h3>
              <p className="text-xs sm:text-sm text-slate-500">Statistik 7 hari terakhir</p>
            </div>
            <div className="flex items-center  gap-1 md:gap-2 text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-green-100">
              <TrendingUp size={14} /> Tren
            </div>
          </div>

          <div ref={chartContainerRef} className="w-full" style={{ minHeight: '250px', minWidth: '300px' }}>
            {isMounted && chartSize.width > 0 && chartSize.height > 0 && grafikData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
                <AreaChart data={grafikData}>
                  <defs>
                    <linearGradient id="colorLaporan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                  <XAxis
                    dataKey="hari"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="laporan"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLaporan)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-slate-400 text-xs sm:text-sm">
                  Belum ada data laporan untuk ditampilkan
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Kinerja Wilayah */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-3 sm:mb-6">Kinerja Wilayah</h3>
          <div className="space-y-3 sm:space-y-6">
            {kinerjaWilayah.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada data wilayah untuk ditampilkan.</p>
            ) : (
              kinerjaWilayah.map((w, idx) => (
                <div key={idx} className="group cursor-default">
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-green-600 transition-colors">{w.nama}</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">{w.persentase}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${w.color} transition-all duration-[1500ms] ease-out`} style={{ width: `${w.persentase}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 sm:mt-10 p-3 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
              <span className="text-slate-900 font-bold">{totalLaporan} Unit</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Wilayah Terdata</span>
              <span className="text-slate-900 font-bold">{kinerjaWilayah.length} Wilayah</span>
            </div>
          </div>
        </div>
      </div>

      {/* Komposisi Status */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Komposisi Status Laporan</h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-6">Memudahkan pemantauan antrean dan progres</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {statusSummary.map(item => (
            <div key={item.key} className="flex flex-col">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-700">{item.label}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">{item.total}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 sm:h-2.5 overflow-hidden mb-1 sm:mb-2">
                <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.percentage}%` }} />
              </div>
              <span className="text-xs text-slate-500">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, subText, trend, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  subText: string;
  trend: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  return (
    <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border ${colorMap[color]}`}>{icon}</div>
        <span className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">{trend}</span>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 leading-none">{value}</p>
        <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">{label}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">{subText}</p>
      </div>
    </div>
  );
}