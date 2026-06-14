// app/kabid/peta-aduan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Filter, X, RefreshCw, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, FileText, Layers, 
  Eye, Calendar, Globe, ExternalLink, User
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : '/api';
const PetaAduanMap = dynamic(() => import('../components/PetaAduanMap'), { ssr: false });

export default function PetaAduanPage() {
  const [loading, setLoading] = useState(true);
  const [titikAduan, setTitikAduan] = useState<any[]>([]);
  const [kecamatan, setKecamatan] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  // ✅ HAPUS activeTab - tidak perlu lagi karena hanya 1 tab
  const [filters, setFilters] = useState({
    status: '',
    district: '',
    startDate: '',
    endDate: ''
  });
const [filterOptions, setFilterOptions] = useState<{
  kecamatan: string[];
  status: string[];
  jenisSampah: string[];
}>({ kecamatan: [], status: [], jenisSampah: [] });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    diproses: 0,
    selesai: 0
  });

  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${API_BASE_URL}/kabid/peta-aduan?`;
      if (filters.status) url += `status=${filters.status}&`;
      if (filters.district) url += `district=${filters.district}&`;
      if (filters.startDate) url += `startDate=${filters.startDate}&`;
      if (filters.endDate) url += `endDate=${filters.endDate}&`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const titikData = res.data.data?.titikAduan || [];
      const kecamatanData = res.data.data?.kecamatan || [];
      
      const formattedTitik = titikData
        .filter((point: any) => {
          const lat = parseFloat(point.lat || point.latitude);
          const lng = parseFloat(point.lng || point.longitude);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map((point: any, idx: number) => ({
          id: point.id || idx,
          deskripsi: point.deskripsi || point.description || '-',
          lat: (point.lat || point.latitude).toString(),
          lng: (point.lng || point.longitude).toString(),
          status: point.status,
          jenis: point.jenis || point.jenisSampah || null,
          kecamatan: point.kecamatan || point.district || 'Unknown',
          foto: point.foto || point.photoUrl || null,
          waktu: point.waktu || point.createdAt,
          pelapor: point.pelapor || 'Warga Toba'
        }));
      
      setTitikAduan(formattedTitik);
      setKecamatan(kecamatanData);
      
      setStats({
        total: formattedTitik.length,
pending: formattedTitik.filter((p: any) => p.status === 'PENDING').length,
diproses: formattedTitik.filter((p: any) => p.status === 'DITINDAKLANJUTI').length,
selesai: formattedTitik.filter((p: any) => p.status === 'SELESAI').length
      });
      
    } catch (error: any) {
      console.error('Error fetching peta aduan:', error);
      toast.error(error.response?.data?.message || 'Gagal memuat koordinat peta');
      await loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = async () => {
    try {
      const token = localStorage.getItem('token');
      const laporanRes = await axios.get(`${API_BASE_URL}/laporan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const laporanData = laporanRes.data.data || laporanRes.data || [];
      
      const titikConverted = laporanData
        .filter((l: any) => {
          const lat = parseFloat(l.latitude);
          const lng = parseFloat(l.longitude);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map((l: any, idx: number) => ({
          id: l.id || idx,
          deskripsi: l.description || '-',
          lat: l.latitude?.toString(),
          lng: l.longitude?.toString(),
          status: l.status,
          jenis: l.jenisSampah || null,
          kecamatan: l.district || 'Unknown',
          foto: l.photoUrl,
          waktu: l.createdAt,
          pelapor: l.user?.fullName || 'Warga Toba'
        }));
      
      setTitikAduan(titikConverted);
      setStats({
        total: titikConverted.length,
        pending: titikConverted.filter((p: any) => p.status === 'PENDING').length,
        diproses: titikConverted.filter((p: any) => p.status === 'DITINDAKLANJUTI').length,
        selesai: titikConverted.filter((p: any) => p.status === 'SELESAI').length
      });
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  };

const fetchFilterOptions = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_BASE_URL}/kabid/filter-options`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setFilterOptions(res.data.data);
  } catch (error) {
    setFilterOptions({
      kecamatan: [] as string[],
      status: ['PENDING', 'DITINDAKLANJUTI', 'SELESAI'] as string[],
      jenisSampah: [] as string[]
    });
  }
};
  const applyFilters = () => {
    fetchData();
    setShowFilter(false);
  };

  const resetFilters = () => {
    setFilters({ status: '', district: '', startDate: '', endDate: '' });
    setTimeout(() => fetchData(), 100);
  };

  const handleOpenPopup = (point: any) => {
    setSelectedPoint(point);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-red-100 text-red-700 border-red-200';
      case 'DITINDAKLANJUTI': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SELESAI': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <AlertCircle size={14} className="text-red-500" />;
      case 'DITINDAKLANJUTI': return <Clock size={14} className="text-amber-500" />;
      case 'SELESAI': return <CheckCircle2 size={14} className="text-emerald-500" />;
      default: return <FileText size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 text-black antialiased p-4 max-w-7xl mx-auto font-sans">
      <Toaster position="top-right" />
      
      {/* ─── BANNER HEADER ─── */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-emerald-600 text-white px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase inline-flex items-center gap-1.5 mb-2 shadow-sm">
            <Globe size={12} /> Geographic Information System
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E35] tracking-tight uppercase">
            Peta Sebaran Aduan
          </h1>
          <p className="text-[#5B7078] text-sm mt-0.5 font-medium">
            Monitoring persebaran spasial lokasi tumpukan sampah berdasarkan aduan real-time masyarakat.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex-1 md:flex-none px-4 py-3 bg-white border rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
              showFilter ? 'ring-2 ring-emerald-600 border-transparent text-emerald-700' : 'text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} /> Filter Ruang
          </button>
          <button
            onClick={fetchData}
            className="flex-1 md:flex-none px-5 py-3 bg-[#064E3B] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#053f30] flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            <RefreshCw size={16} /> Sinkronisasi
          </button>
        </div>
      </div>

      {/* ─── KARTU RINGKASAN DATA ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Aduan', count: stats.total, border: 'border-blue-500', bg: 'bg-blue-50 text-blue-600', icon: FileText },
          { label: 'Kritis (Pending)', count: stats.pending, border: 'border-red-500', bg: 'bg-red-50 text-red-600', icon: AlertCircle },
          { label: 'Dalam Proses', count: stats.diproses, border: 'border-amber-500', bg: 'bg-amber-50 text-amber-600', icon: Clock },
          { label: 'Selesai Bersih', count: stats.selesai, border: 'border-emerald-500', bg: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className={`bg-white rounded-2xl shadow-sm p-4 border-l-[5px] ${item.border} border border-gray-100 flex items-center justify-between`}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5 font-mono">{item.count}</p>
              </div>
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── DROP FILTER PANEL ─── */}
      {showFilter && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-inner space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">Penyaringan Koridor Log</h2>
            <button onClick={() => setShowFilter(false)} className="text-gray-400 hover:text-black transition-colors"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700"
            >
              <option value="">Semua Status Aduan</option>
              {filterOptions.status.map((s: string) => (
                <option key={s} value={s}>{s === 'DITINDAKLANJUTI' ? 'Diproses' : s}</option>
              ))}
            </select>
            <select
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700"
            >
              <option value="">Semua Sektor Kecamatan</option>
              {filterOptions.kecamatan.map((k: string) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-medium text-gray-700"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-medium text-gray-700"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetFilters} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200">Reset</button>
            <button onClick={applyFilters} className="px-5 py-2 bg-green-700 text-white text-xs font-bold rounded-xl hover:bg-green-800 shadow-sm">Terapkan Filter</button>
          </div>
        </div>
      )}

      {/* ─── SEKSI UTAMA: INTEGRASI MAP & PANEL SIDEBAR ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Peta Spasial (3 Kolom) */}
        <div className="lg:col-span-3 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="h-[580px] w-full">
            <PetaAduanMap
              titikAduan={titikAduan}
              kecamatan={kecamatan}
              center={[2.3494, 99.1039]}
              zoom={12}
              onSelectPoint={handleOpenPopup}
            />
          </div>
        </div>

        {/* ✅ Sidebar DAFTAR ADUAN SAJA (tanpa tab Regional Insight) */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[580px]">
          {/* Header Sidebar - Langsung Daftar Aduan tanpa tab */}
          <div className="border-b bg-gray-50/50 py-3.5 px-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} /> LOG ADUAN MASUK ({titikAduan.length})
            </p>
          </div>

          {/* Body Scrollbar Daftar Aduan */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {titikAduan.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MapPin size={28} className="mx-auto text-gray-300 mb-1" />
                <p className="text-xs font-bold">Belum Ada Sinyal Laporan</p>
              </div>
            ) : (
              titikAduan.map((point, idx) => (
                <div
                  key={point.id || idx}
                  onClick={() => handleOpenPopup(point)}
                  className="p-3 bg-gray-50/50 hover:bg-emerald-50/20 border border-gray-100 hover:border-emerald-200 rounded-xl cursor-pointer transition-all hover:shadow-sm group text-left"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(point.status)}
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wide uppercase ${getStatusColor(point.status)}`}>
                        {point.status === 'DITINDAKLANJUTI' ? 'Diproses' : point.status}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 font-bold">
                      {new Date(point.waktu).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed group-hover:text-green-900">{point.deskripsi}</p>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mt-2">
                    <MapPin size={10} className="shrink-0" /> <span className="truncate">{point.kecamatan}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── LEGENDA SPASIAL BAWAH ─── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-gray-600 items-center">
        <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm"></div><span>Pending</span></div>
        <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm"></div><span>Diproses</span></div>
        <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm"></div><span>Selesai</span></div>
        <div className="flex items-center gap-2"><div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-[10px] shadow-sm">🏢</div><span>Kantor Kecamatan</span></div>
        <div className="flex items-center gap-1.5 ml-auto text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100"><AlertTriangle size={14} /><span>Hotspot Timbunan Sampah</span></div>
      </div>

      {/* ─── POP-UP DETAIL MODAL OVERLAY ─── */}
      <AnimatePresence>
        {isModalOpen && selectedPoint && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden relative z-10 border border-gray-100 flex flex-col"
            >
              <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Eye className="text-emerald-700" size={18} />
                  <div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Bedah Manifes Aduan</h3>
                    <p className="text-[11px] text-gray-400 font-mono font-bold mt-0.5">ID RES-0{selectedPoint.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-500 hover:text-black transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-left">
                {selectedPoint.foto ? (
                  <div className="rounded-xl overflow-hidden border bg-gray-50 relative aspect-[16/9]">
                    <img 
                      src={selectedPoint.foto} 
                      alt="Dokumentasi Lapangan" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-gray-400 flex flex-col items-center justify-center">
                    <FileText size={28} className="text-gray-300 mb-1" />
                    <p className="text-xs font-bold">Tidak Ada Lampiran Foto</p>
                  </div>
                )}

                <div className="flex justify-between items-center border-b pb-3 border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Status Progres</span>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-md border tracking-wide uppercase inline-flex items-center gap-1.5 ${getStatusColor(selectedPoint.status)}`}>
                      {getStatusIcon(selectedPoint.status)}
                      {selectedPoint.status === 'DITINDAKLANJUTI' ? 'Diproses' : selectedPoint.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Waktu Pengiriman</span>
                    <span className="text-xs font-bold text-gray-700 font-mono inline-flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {new Date(selectedPoint.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Deskripsi Kasus Masalah</span>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                    {selectedPoint.deskripsi}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 border border-gray-100 p-4 rounded-xl text-xs font-bold">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Sektor Kecamatan</span>
                    <div className="flex items-center gap-1.5 text-gray-800">
                      <MapPin size={13} className="text-gray-400" />
                      <span className="truncate">{selectedPoint.kecamatan}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Entitas Pelapor</span>
                    <div className="flex items-center gap-1.5 text-gray-800">
                      <User size={13} className="text-gray-400" />
                      <span className="truncate">{selectedPoint.pelapor}</span>
                    </div>
                  </div>
                  {selectedPoint.jenis && (
                    <div className="space-y-1 col-span-2 pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Kategori Klasifikasi Sampah</span>
                      <span className="text-emerald-800 font-mono text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block border border-emerald-100">
                        # {selectedPoint.jenis}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t flex gap-2 shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Tutup Jendela
                </button>
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedPoint.lat},${selectedPoint.lng}`, '_blank')}
                  className="flex-1 py-3 bg-[#064E3B] hover:bg-[#053f30] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <ExternalLink size={13} />
                  Arahkan Navigasi (Maps)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}