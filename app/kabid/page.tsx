// app/kabid/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FileText, CheckCircle, Clock,
  TrendingUp, Calendar, Truck,
  MapPin, Activity
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { normalizeRole } from '@/lib/authRole';

// Gunakan proxy Next.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

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
      
      const laporanRes = await axios.get(`${API_BASE_URL}/laporan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let laporanData = laporanRes.data.data || laporanRes.data || [];
      if (!Array.isArray(laporanData)) laporanData = [];
      
      setLaporanList(laporanData);
      
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
        armadaAktif: 0,
      });
      
      setStatusSummary([
        { key: 'PENDING', label: 'Pending', color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', total: laporanPending, percentage: totalLaporan ? Math.round((laporanPending / totalLaporan) * 100) : 0 },
        { key: 'DITINDAKLANJUTI', label: 'Ditindaklanjuti', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', total: laporanDitindaklanjuti, percentage: totalLaporan ? Math.round((laporanDitindaklanjuti / totalLaporan) * 100) : 0 },
        { key: 'DIPROSES', label: 'Diproses', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', total: laporanDiproses - laporanDitindaklanjuti, percentage: totalLaporan ? Math.round(((laporanDiproses - laporanDitindaklanjuti) / totalLaporan) * 100) : 0 },
        { key: 'SELESAI', label: 'Selesai', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', total: laporanSelesai, percentage: totalLaporan ? Math.round((laporanSelesai / totalLaporan) * 100) : 0 },
      ]);
      
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

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse h-[140px]">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="w-16 h-5 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-8 w-16 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse h-[400px]" />
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse h-[400px]" />
        </div>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-slate-500 mt-1.5 flex items-center gap-2 text-sm font-medium">
            <Calendar size={16} className="text-slate-400" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="Total Laporan"
          value={stats.totalLaporan}
          icon={<FileText size={24} />}
          subText="Keseluruhan Laporan Masuk"
          trend={`${persentaseSelesai}% Selesai`}
          color="blue"
        />
        <StatCard
          label="Laporan Selesai"
          value={stats.laporanSelesai}
          icon={<CheckCircle size={24} />}
          subText="Penanganan Berhasil"
          trend="SUKSES"
          color="emerald"
        />
        <StatCard
          label="Dalam Proses"
          value={stats.laporanDiproses}
          icon={<Clock size={24} />}
          subText="Sedang Ditangani Petugas"
          trend="AKTIF"
          color="amber"
        />
        <StatCard
          label="Armada Aktif"
          value={stats.armadaAktif}
          icon={<Truck size={24} />}
          subText="Truk Beroperasi Hari Ini"
          trend="LIVE"
          color="purple"
        />
      </div>

      {/* Chart & Wilayah */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Chart Section */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 lg:p-8 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" />
                Tren Laporan 7 Hari Terakhir
              </h3>
              <p className="text-sm text-slate-500 mt-1">Pantau lonjakan aduan masyarakat secara real-time</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100 w-fit">
              <TrendingUp size={14} /> Terkini
            </div>
          </div>

          <div ref={chartContainerRef} className="flex-1 w-full min-h-[300px]">
            {isMounted && grafikData.length > 0 && grafikData.some(d => d.laporan > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={grafikData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLaporan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="hari" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="laporan"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorLaporan)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Activity size={32} className="opacity-20" />
                <p className="text-sm font-medium">Belum ada data grafik</p>
              </div>
            )}
          </div>
        </div>

        {/* Wilayah Tertinggi Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 lg:p-8 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <MapPin size={20} className="text-rose-500" />
            Titik Rawan Aduan
          </h3>
          <p className="text-sm text-slate-500 mb-6">5 Wilayah dengan laporan terbanyak</p>
          
          <div className="space-y-4 flex-1">
            {wilayahAduanTertinggi.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
                <MapPin size={32} className="opacity-20" />
                <p className="text-sm font-medium">Data wilayah kosong</p>
              </div>
            ) : (
              wilayahAduanTertinggi.map((w, idx) => {
                const maxTotal = Math.max(...wilayahAduanTertinggi.map(x => x.total), 1);
                const percentage = Math.round((w.total / maxTotal) * 100);
                const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'];
                
                return (
                  <div key={idx} className="group p-3 -mx-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                        {w.nama}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{w.total} <span className="text-xs text-slate-400 font-medium">kasus</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
        </div>
      </div>

      {/* Komposisi Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 lg:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Rincian Status Laporan</h3>
        <p className="text-sm text-slate-500 mb-6">Distribusi antrean penanganan saat ini</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statusSummary.map(item => (
            <div key={item.key} className={`p-4 rounded-xl border border-slate-100 ${item.bg} hover:shadow-md transition-shadow duration-300`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${item.text}`}>{item.label}</span>
                <span className="text-lg font-extrabold text-slate-900">{item.total}</span>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden mb-2">
                <div className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`} style={{ width: `${item.percentage}%` }} />
              </div>
              <div className="flex justify-end">
                <span className="text-xs font-semibold text-slate-500">{item.percentage}% dari total</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// --- SUBKOMPONEN KARTU STATISTIK ---
function StatCard({ label, value, icon, subText, trend, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  subText: string;
  trend: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}) {
  const styles = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', trendBg: 'bg-blue-100/50', trendText: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', trendBg: 'bg-emerald-100/50', trendText: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', trendBg: 'bg-amber-100/50', trendText: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', trendBg: 'bg-purple-100/50', trendText: 'text-purple-700' },
  };
  
  const currentStyle = styles[color];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${currentStyle.trendBg} ${currentStyle.trendText} tracking-wide uppercase`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">{value.toLocaleString('id-ID')}</p>
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">{subText}</p>
      </div>
    </div>
  );
}