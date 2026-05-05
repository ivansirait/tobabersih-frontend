"use client";
import { useState, useEffect, useMemo } from 'react';
import {
  FileText, CheckCircle, Clock,
  AlertCircle, TrendingUp, Calendar,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, ResponsiveContainer
} from 'recharts';
import PredictionWidget from './PredictionWidget';

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
  const [stats, setStats] = useState<StatData>({
    totalLaporan: 0,
    laporanSelesai: 0,
    laporanDiproses: 0,
    laporanPending: 0,
    laporanDitindaklanjuti: 0,
  });

  const [grafikData, setGrafikData] = useState<{ hari: string; laporan: number }[]>([]);

  // Data processing dengan useMemo untuk mencegah perhitungan berulang
  const processedData = useMemo(() => {
    const safeLaporanList = Array.isArray(laporanList) ? laporanList : [];
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

    return {
      safeLaporanList,
      totalLaporan,
      laporanSelesai,
      persentaseSelesai,
      statusSummary,
      kinerjaWilayah
    };
  }, [laporanList]);

  const { safeLaporanList, totalLaporan, laporanSelesai, persentaseSelesai, statusSummary, kinerjaWilayah } = processedData;

  // Generate chart data
  useEffect(() => {
    setGrafikData(generateFallbackChart(safeLaporanList));
  }, [safeLaporanList]);

  // Initial stats calculation
  useEffect(() => {
    setStats({
      totalLaporan: processedData.totalLaporan,
      laporanSelesai: processedData.laporanSelesai,
      laporanDiproses: processedData.statusSummary.find(s => s.key === 'DIPROSES')?.total || 0,
      laporanPending: processedData.statusSummary.find(s => s.key === 'PENDING')?.total || 0,
      laporanDitindaklanjuti: processedData.statusSummary.find(s => s.key === 'DITINDAKLANJUTI')?.total || 0,
    });
  }, [processedData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Memuat Data Dashboard...</p>
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
            <div className="flex items-center gap-1 md:gap-2 text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-green-100">
              <TrendingUp size={14} /> Tren
            </div>
          </div>

          <div className="w-full" style={{ height: '250px' }}>
            {grafikData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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