// app/kabid/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FileText, CheckCircle, Clock,
  AlertCircle, TrendingUp, Calendar,
  LayoutDashboard, Truck
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { normalizeRole } from '@/lib/authRole';

// Gunakan proxy Next.js
const API_BASE_URL = '/api';

interface Laporan {
  id?: string;
  status?: 'PENDING' | 'DITINDAKLANJUTI' | 'DIPROSES' | 'SELESAI';
  district?: string;
  wilayah?: string;
  createdAt?: string;
  tanggal?: string;
}

export default function KabidDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [stats, setStats] = useState({
    totalLaporan: 0,
    laporanSelesai: 0,
    laporanDiproses: 0,
    laporanPending: 0,
    laporanDitindaklanjuti: 0,
    armadaAktif: 0,
  });
  const [grafikData, setGrafikData] = useState<{ hari: string; laporan: number }[]>([]);
  const [wilayahAduanTertinggi, setWilayahAduanTertinggi] = useState<{ nama: string; total: number }[]>([]);
  const [statusSummary, setStatusSummary] = useState<any[]>([]);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const roleFromStorage = localStorage.getItem('role') || '';

    if (!token || !userStr) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const role = normalizeRole(user?.role || roleFromStorage);

      if (role !== 'KABID' && role !== 'ADMIN') {
        router.replace('/unauthorized');
        return;
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      router.replace('/login');
      return;
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 1. Ambil data laporan dari API
      const laporanRes = await axios.get(`${API_BASE_URL}/laporan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let laporanData = laporanRes.data.data || laporanRes.data || [];
      if (!Array.isArray(laporanData)) {
        laporanData = [];
      }
      setLaporanList(laporanData);
      
      // 2. Hitung statistik dari data laporan
      const totalLaporan = laporanData.length;
      const laporanSelesai = laporanData.filter((l: any) => l.status === 'SELESAI').length;
      const laporanDiproses = laporanData.filter((l: any) => l.status === 'DIPROSES' || l.status === 'DITINDAKLANJUTI').length;
      const laporanPending = laporanData.filter((l: any) => l.status === 'PENDING').length;
      const laporanDitindaklanjuti = laporanData.filter((l: any) => l.status === 'DITINDAKLANJUTI').length;
      
      setStats({
        totalLaporan,
        laporanSelesai,
        laporanDiproses,
        laporanPending,
        laporanDitindaklanjuti,
        armadaAktif: 0, // akan diupdate dari API armada nanti
      });
      
      // 3. Set status summary
      setStatusSummary([
        { key: 'PENDING', label: 'Pending', color: 'bg-rose-500', total: laporanPending, percentage: totalLaporan ? Math.round((laporanPending / totalLaporan) * 100) : 0 },
        { key: 'DITINDAKLANJUTI', label: 'Ditindaklanjuti', color: 'bg-blue-500', total: laporanDitindaklanjuti, percentage: totalLaporan ? Math.round((laporanDitindaklanjuti / totalLaporan) * 100) : 0 },
        { key: 'DIPROSES', label: 'Diproses', color: 'bg-amber-500', total: laporanDiproses - laporanDitindaklanjuti, percentage: totalLaporan ? Math.round(((laporanDiproses - laporanDitindaklanjuti) / totalLaporan) * 100) : 0 },
        { key: 'SELESAI', label: 'Selesai', color: 'bg-emerald-500', total: laporanSelesai, percentage: totalLaporan ? Math.round((laporanSelesai / totalLaporan) * 100) : 0 },
      ]);
      
      // 4. Generate chart data (7 hari terakhir)
      const last7Days = getLast7Days();
      const chartMap = new Map<string, number>();
      last7Days.forEach(day => chartMap.set(day, 0));
      
      laporanData.forEach((l: any) => {
        const dateStr = l.createdAt || l.tanggal;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const dayLabel = date.toLocaleDateString('id-ID', { weekday: 'short' });
            chartMap.set(dayLabel, (chartMap.get(dayLabel) || 0) + 1);
          }
        }
      });
      
      const chartData = Array.from(chartMap.entries()).map(([hari, total]) => ({
        hari: hari.charAt(0).toUpperCase() + hari.slice(1),
        laporan: total
      }));
      setGrafikData(chartData);
      
      // 5. Hitung wilayah aduan tertinggi dari data laporan
      const wilayahMap = new Map<string, number>();
      
      laporanData.forEach((l: any) => {
        let wilayah = l.district || l.wilayah || l.location?.district;
        if (wilayah && wilayah !== 'Unknown' && wilayah !== 'null' && wilayah !== 'undefined' && wilayah !== '') {
          wilayahMap.set(wilayah, (wilayahMap.get(wilayah) || 0) + 1);
        }
      });
      
      if (wilayahMap.size > 0) {
        const sortedWilayah = Array.from(wilayahMap.entries())
          .map(([nama, total]) => ({ nama, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setWilayahAduanTertinggi(sortedWilayah);
      }
      
      // 6. Ambil data armada aktif (opsional)
      try {
        const armadaRes = await axios.get(`${API_BASE_URL}/tracking/truk-aktif`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const armadaAktif = armadaRes.data.data?.length || 0;
        setStats(prev => ({ ...prev, armadaAktif }));
      } catch (err) {
        console.log('Armada API not ready');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getLast7Days = () => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      result.push(dayName);
    }
    return result;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const persentaseSelesai = stats.totalLaporan > 0 
    ? Math.round((stats.laporanSelesai / stats.totalLaporan) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="p-3 md:p-4 lg:p-6 xl:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto">
        <div className="h-10 w-60 bg-slate-200 rounded-lg animate-pulse" />
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 lg:p-6 xl:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Kinerja Operasional
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-1 md:gap-2 text-xs md:text-sm lg:text-base">
            <Calendar size={14} />
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          label="Total Laporan"
          value={stats.totalLaporan}
          icon={<FileText className="text-blue-600" />}
          subText="Keseluruhan Laporan"
          trend={`${persentaseSelesai}%`}
          color="blue"
        />
        <StatCard
          label="Laporan Selesai"
          value={stats.laporanSelesai}
          icon={<CheckCircle className="text-emerald-600" />}
          subText={`${persentaseSelesai}% Selesai`}
          trend="SUKSES"
          color="emerald"
        />
        <StatCard
          label="Dalam Proses"
          value={stats.laporanDiproses}
          icon={<Clock className="text-amber-600" />}
          subText="Sedang Ditangani"
          trend="PROSES"
          color="amber"
        />
        <StatCard
          label="Armada Aktif"
          value={stats.armadaAktif}
          icon={<Truck className="text-purple-600" />}
          subText="Kendaraan Operasional"
          trend="AKTIF"
          color="purple"
        />
      </div>

      {/* Chart dan Wilayah Aduan Tertinggi */}
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

          <div ref={chartContainerRef} className="w-full min-h-[250px]" style={{ height: '250px', minWidth: '0px' }}>
            {isMounted && chartSize.width > 0 && chartSize.height > 0 && grafikData.length > 0 && grafikData.some(d => d.laporan > 0) ? (
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

        {/* Wilayah Aduan Tertinggi */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Wilayah Aduan Tertinggi</h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-6">Berdasarkan jumlah laporan masuk</p>
          <div className="space-y-3 sm:space-y-6">
            {wilayahAduanTertinggi.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Belum ada data wilayah untuk ditampilkan.
              </p>
            ) : (
              wilayahAduanTertinggi.map((w, idx) => {
                const maxTotal = Math.max(...wilayahAduanTertinggi.map(x => x.total), 1);
                const percentage = Math.round((w.total / maxTotal) * 100);
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];
                return (
                  <div key={idx} className="group cursor-default">
                    <div className="flex justify-between items-center mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-green-600 transition-colors">
                        {w.nama}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">{w.total} laporan</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-[1500ms] ease-out`} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 sm:mt-10 p-3 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-900 font-bold">{stats.totalLaporan} Total Laporan</span>
              <span className="text-slate-900 font-bold">{wilayahAduanTertinggi.length} Wilayah</span>
            </div>
          </div>
        </div>
      </div>

      {/* Komposisi Status Laporan */}
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