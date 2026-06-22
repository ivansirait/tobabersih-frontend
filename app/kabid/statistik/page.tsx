'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Building2, Truck, Users, Navigation, ClipboardList, RefreshCw, 
  Eye, Phone, Mail, Search, ChevronLeft, ChevronRight, X, MapPin, Calendar,
  Map, Globe, Power, PowerOff, FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

// ─── LOAD LEAFLET MAP SECARA ASYNC ───────────────────────────────────
const PetaWaypointView = dynamic(() => import('../../components/WilayahMap').catch(() => {
  return function FallbackMap() {
    return <div className="h-64 bg-gray-100 flex items-center justify-center rounded-2xl italic text-gray-400">Gagal memuat modul peta...</div>
  }
}), { ssr: false });

export default function DashboardMonitoringKabid() {
  const [activeTab, setActiveTab] = useState<'wilayah' | 'truk' | 'supir' | 'rute' | 'penugasan'>('wilayah');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── STATE DATA ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({ kecamatan: [], status: [], jenisSampah: [] });
  
  const [wilayahList, setWilayahList] = useState<any[]>([]);
  const [trukList, setTrukList] = useState<any[]>([]);
  const [supirList, setSupirList] = useState<any[]>([]);
  const [ruteList, setRuteList] = useState<any[]>([]);
  const [penugasanList, setPenugasanList] = useState<any[]>([]);

  // State untuk Preview Detail Modals
  const [selectedWilayah, setSelectedWilayah] = useState<any>(null);
  const [selectedSupir, setSelectedSupir] = useState<any>(null);
  const [selectedPenugasan, setSelectedPenugasan] = useState<any>(null);
  const [expandedRuteId, setExpandedRuteId] = useState<string | null>(null);

  // Pagination State untuk Penugasan
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ─── DATA FETCHING (MONITORING ONLY) ───────────────────────────────
  const fetchAllDataMonitoring = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [resFilter, resWilayah, resTruk, resSupir, resRute, resPenugasan] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/kabid/filter-options`, { headers }),
        axios.get(`${API_BASE_URL}/wilayah`, { headers }),
        axios.get(`${API_BASE_URL}/admin/truks`, { headers }),
        axios.get(`${API_BASE_URL}/admin/supir-list`, { headers }),
        axios.get(`${API_BASE_URL}/rute`, { headers }),
        axios.get(`${API_BASE_URL}/penugasan?type=ADUAN`, { headers })
      ]);

      const extractData = (res: any) => {
        if (!res || res.status !== 'fulfilled') return [];

        // Check if res.value is directly an array (most common for GET /wilayah, /supir, etc)
        if (Array.isArray(res.value)) return res.value;

        let val = res.value?.data;

        // Jika tidak ada .data, coba gunakan res.value langsung
        if (!val) {
          val = res.value;
        }

        if (!val || typeof val !== 'object') return [];

        // Check jika val adalah array langsung
        if (Array.isArray(val)) return val;

        // Check nested data structure
        if (Array.isArray(val.data)) return val.data;
        if (Array.isArray(val.data?.data)) return val.data.data;

        // Check for { success: true, data: [...] } wrapper pattern (like rute API)
        if (val.success === true && Array.isArray(val.data)) return val.data;

        // Check common response wrapper keys
        const keyCandidates = ['items', 'result', 'wilayah', 'truks', 'truk', 'supir', 'drivers', 'rute', 'penugasan', 'laporan', 'records'];
        for (const key of keyCandidates) {
          if (Array.isArray(val[key])) return val[key];
          if (Array.isArray(val.data?.[key])) return val.data[key];
          if (Array.isArray(val.results?.[key])) return val.results[key];
        }

        return [];
      };

      const normalizeWilayah = (raw: any[]) => {
        return (raw || []).map((w: any) => {
          // candidate keys untuk mapping (backend sering beda penamaan)
          const id = w?.id ?? w?._id ?? w?.wilayahId ?? w?.geoId;

          const name = w?.name ?? w?.nama ?? w?.districtName ?? w?.wilayahName;
          const code = w?.code ?? w?.kode ?? w?.wilayahCode ?? w?.districtCode ?? null;

          const radius = w?.radius ?? w?.radii ?? w?.radiusMeter ?? w?.radius_m ?? w?.geofenceRadius ?? 0;

          // isActive sering berupa boolean atau string
          const isActiveRaw = w?.isActive ?? w?.active ?? w?.status ?? w?.operasional;
          const isActive = typeof isActiveRaw === 'string'
            ? ['true', '1', 'ACTIVE', 'ACTIF', 'OPERASIONAL', 'OPERASIONAL'].includes(isActiveRaw.toUpperCase())
            : Boolean(isActiveRaw);

          // koordinat bisa string/number dan kadang fieldnya beda
          // Handle backend yang mengirim string untuk latitude/longitude
          let latitude = w?.latitude ?? w?.lat ?? w?.latitud ?? w?.centerLat ?? w?.koordinatLat ?? null;
          let longitude = w?.longitude ?? w?.lng ?? w?.lon ?? w?.longitud ?? w?.centerLng ?? w?.koordinatLng ?? null;
          
          // Handle case dimana backend mengirim center array
          if (w?.center && Array.isArray(w.center) && w.center.length >= 2) {
            latitude = w.center[0];
            longitude = w.center[1];
          }

          // Ensure latitude and longitude are numbers
          if (typeof latitude === 'string') latitude = parseFloat(latitude);
          if (typeof longitude === 'string') longitude = parseFloat(longitude);

          return {
            ...w,
            id,
            name,
            code,
            radius,
            isActive,
            latitude,
            longitude,
          };
        });
      };

      if (resFilter.status === 'fulfilled') {
        setFilterOptions(
          resFilter.value.data?.data ||
            resFilter.value.data ||
            { kecamatan: [], status: [], jenisSampah: [] }
        );
      }

      const rawWilayah = extractData(resWilayah);

      // DEBUG: bantu identifikasi kenapa wilayah kosong saat baru login
      try {
        // eslint-disable-next-line no-console
        console.log('[kabid/statistik] token length:', token?.length);
        // eslint-disable-next-line no-console
        console.log('[kabid/statistik] resWilayah status:', resWilayah.status);
        // eslint-disable-next-line no-console
        console.log('[kabid/statistik] resWilayah value:', resWilayah.status === 'fulfilled' ? resWilayah.value?.data : null);
        // eslint-disable-next-line no-console
        console.log('[kabid/statistik] rawWilayah length:', rawWilayah?.length);
      } catch (e) {
        // ignore
      }

      setWilayahList(normalizeWilayah(rawWilayah));

      setTrukList(extractData(resTruk));
      setSupirList(extractData(resSupir));
      setRuteList(extractData(resRute));
      setPenugasanList(extractData(resPenugasan));

    } catch (e: any) {
      const errorMsg = e?.message || 'Gagal sinkronisasi data monitoring';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDataMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jika user baru login, kadang token belum tersedia saat first render.
  // Ini memastikan data wilayah ikut ter-refresh setelah token ada.
  useEffect(() => {
    const id = window.setInterval(() => {
      const tokenNow = localStorage.getItem('token');
      if (tokenNow && !loading) {
        // token sudah ada, refresh 1x agar wilayah tidak kosong
        fetchAllDataMonitoring();
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => { 
    setSearchTerm(''); 
    setCurrentPage(1); 
  }, [activeTab]);

  // ─── LOGIKA HELPER GEOMETRI ────────────────────────────────────────
  const formatArea = (radius: number): string => {
    if (!radius || radius <= 0) return '0 m²';
    const area = Math.PI * Math.pow(radius / 1000, 2);
    return area < 1 ? `${(area * 1000000).toFixed(2)} m²` : `${area.toFixed(2)} km²`;
  };

  // ─── REACTIVE FILTERING & SAFE ARRAYS (CLIENT-SIDE) ────────────────
  const filteredWilayah = useMemo(() => {
            return (wilayahList || []).filter(w => {
      const term = (searchTerm || '').toLowerCase();
      const name = (w?.name || w?.nama || w?.wilayahName || '').toString().toLowerCase();
      const code = (w?.code || w?.kode || w?.wilayahCode || '').toString().toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [wilayahList, searchTerm]);

  const filteredTruk = useMemo(() => {
    return (trukList || []).filter(t => 
      t?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t?.operator?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t?.driver?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [trukList, searchTerm]);

  const filteredSupir = useMemo(() => {
    return (supirList || []).filter(s => 
      s?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s?.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supirList, searchTerm]);

  const filteredRute = useMemo(() => {
    return (ruteList || []).filter(r => 
      r?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r?.truck?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r?.dayOfWeek?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ruteList, searchTerm]);

  const filteredPenugasan = useMemo(() => {
    return (penugasanList || []).filter(p => 
      (p?.location || p?.report?.location || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p?.driver?.fullName || p?.driver?.user?.fullName || p?.user?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p?.taskNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [penugasanList, searchTerm]);

  const paginatedPenugasan = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPenugasan.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPenugasan, currentPage]);

  const totalPagesPenugasan = Math.ceil(filteredPenugasan.length / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 text-black antialiased font-sans">
      <Toaster position="top-right" />

      {/* ─── HEADER UTAMA ─── */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 mb-2 shadow-sm">
            <Eye size={12} /> Mode Tinjauan Kepala Bidang
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
            {activeTab === 'wilayah' && 'Monitoring Data Wilayah Operasional'}
            {activeTab === 'truk' && 'Status Armada'}
            {activeTab === 'supir' && 'Data Supir'}
            {activeTab === 'rute' && 'Jalur Rute Perjalanan Armada'}
            {activeTab === 'penugasan' && 'Daftar Laporan Tugas Aduan'}
          </h1>
          <p className="text-[#5B7078] text-sm mt-1 font-medium">
            Data rekam medis operasional kebersihan wilayah kota secara real-time.
          </p>
        </div>
        <button
          onClick={fetchAllDataMonitoring}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#064E3B] text-white text-sm font-bold rounded-xl hover:bg-[#053f30] transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Sinkronisasi Data
        </button>
      </div>

      {/* ─── TAB NAVIGASI ELEGAN ─── */}
      <div className="flex overflow-x-auto gap-2 bg-gray-100 p-2 rounded-2xl border border-gray-200/50 scrollbar-none">
        {[
          { id: 'wilayah', label: 'Data Wilayah', icon: Building2 },
          { id: 'truk', label: 'Status Armada', icon: Truck },
          { id: 'supir', label: 'Data Supir', icon: Users },
          { id: 'rute', label: 'Rute Armada', icon: Navigation },
          { id: 'penugasan', label: 'Laporan Aduan Masyarakat', icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                isActive ? 'bg-white text-[#064E3B] shadow-sm font-extrabold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── SEARCH & FILTER COUNTER PANEL ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative max-w-md w-full bg-white rounded-xl shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={`Cari data ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm text-black focus:bg-white transition-all"
          />
        </div>
        
        <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5 shadow-inner">
          <FileText size={14} className="text-[#064E3B]" />
          <span>Total:</span>
          <span className="text-gray-900 font-mono">
            {activeTab === 'wilayah' && filteredWilayah.length}
            {activeTab === 'truk' && filteredTruk.length}
            {activeTab === 'supir' && filteredSupir.length}
            {activeTab === 'rute' && filteredRute.length}
            {activeTab === 'penugasan' && filteredPenugasan.length}
          </span>
          <span>Entri Terdeteksi</span>
        </div>
      </div>

      {/* ─── BLOCK UTAMA TAMPILAN DATA (GARIS DIALIKAN KE TRANSPARAN/TANPA GARIS) ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 md:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium">Menghubungkan ke server...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-red-600 font-semibold mb-2">Terjadi Gangguan Sistem</p>
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={fetchAllDataMonitoring} className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm">Coba Lagi</button>
          </div>
        ) : (
          <>
            {/* 📂 TAB 1: DATA WILAYAH */}
            {activeTab === 'wilayah' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-none border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                      <th className="p-4 rounded-l-xl">Nama Wilayah</th>
                      <th className="p-4">Kode</th>
                      <th className="p-4">Radius</th>
                      <th className="p-4">Luas Cakupan</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center rounded-r-xl">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredWilayah.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-gray-400 italic">Tidak ada data wilayah ditemukan</td></tr>
                    ) : (
                      filteredWilayah.map((w) => (
                        <tr key={w?.id || w?.code || w?.name || 'wilayah'} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-4 font-bold text-gray-900 rounded-l-xl">{w?.name || 'Wilayah Tanpa Nama'}</td>
                          <td className="p-4 font-mono text-blue-600 font-bold">{w?.code || '-'}</td>
                          <td className="p-4 font-semibold text-emerald-600">{w?.radius || 0}m</td>
                          <td className="p-4 font-medium text-gray-600">{formatArea(w?.radius)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${w?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {w?.isActive ? 'OPERASIONAL' : 'NONAKTIF'}
                            </span>
                          </td>
                          <td className="p-4 text-center rounded-r-xl">
                            <button onClick={() => setSelectedWilayah(w)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"><Eye size={14} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 🚛 TAB 2: STATUS ARMADA TRUK */}
            {activeTab === 'truk' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-none border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                      <th className="p-4 rounded-l-xl">Plat Nomor / Unit</th>
                      <th className="p-4">Merek / Jenis</th>
                      <th className="p-4">Supir Penanggung Jawab</th>
                      <th className="p-4 rounded-r-xl">Kondisi Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredTruk.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-12 text-gray-400 italic">Tidak ada data truk ditemukan</td></tr>
                    ) : (
                      filteredTruk.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-4 rounded-l-xl">
                            <p className="font-bold text-gray-900">{t.plateNumber}</p>
                            <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{t.unitCode || '-'}</span>
                          </td>
                          <td className="p-4 text-gray-700 font-medium">{t.brand || '-'} • <span className="text-gray-400">{t.truckType || '-'}</span></td>
                          <td className="p-4 font-semibold text-gray-800">{t.operator?.fullName || t.driver?.fullName || <span className="text-gray-300 italic text-xs">Belum Ditugaskan</span>}</td>
                          <td className="p-4 rounded-r-xl">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                              t.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : t.status === 'BUSY' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {t.status === 'AVAILABLE' ? 'Tersedia' : t.status === 'BUSY' ? 'Bertugas' : 'Servis'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 👤 TAB 3: DATABASE KONTAK DRIVER */}
            {activeTab === 'supir' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-none border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                      <th className="p-4 rounded-l-xl">Nama Lengkap</th>
                      <th className="p-4">Informasi Kontak</th>
                      <th className="p-4 text-center">Status Akses</th>
                      <th className="p-4 text-center rounded-r-xl">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredSupir.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-12 text-gray-400 italic">Tidak ada data supir ditemukan</td></tr>
                    ) : (
                      filteredSupir.map((s) => {
                        const name = s.fullName || s.user?.fullName || 'Supir Tanpa Nama';
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="p-4 font-bold text-gray-900 flex items-center gap-2.5 rounded-l-xl">
                              <div className="w-8 h-8 bg-green-50 text-green-700 rounded-lg flex items-center justify-center font-black">{name.charAt(0).toUpperCase()}</div>
                              {name}
                            </td>
                            <td className="p-4 space-y-1">
                              <p className="text-gray-600 flex items-center gap-1.5"><Mail size={14}/> {s.email || s.user?.email || '-'}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone size={12}/> {s.phoneNumber || s.user?.phoneNumber || '-'}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${s.isActive || s.user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {s.isActive || s.user?.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="p-4 text-center rounded-r-xl">
                              <button onClick={() => setSelectedSupir(s)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"><Eye size={14}/></button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 🗺️ TAB 4: JALUR NAVIGASI RUTE JALAN */}
            {activeTab === 'rute' && (
              <div className="grid grid-cols-1 gap-4">
                {filteredRute.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
                    Tidak ada rute dinas pengangkutan sampah terdaftar.
                  </div>
                ) : (
                  filteredRute.map((rute) => {
                    const isExpanded = expandedRuteId === rute.id;
                    const waypoints = rute.waypoints || [];
                    
                    const validCoordinates = waypoints
                      .map((wp: any) => [Number(wp.latitude), Number(wp.longitude)])
                      .filter(([lat, lng]: any) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0);

                    return (
                      <div key={rute.id} className="rounded-2xl overflow-hidden bg-gray-50/40 p-1">
                        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/70 rounded-2xl">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-md uppercase flex items-center gap-1">
                                <Calendar size={10} /> {rute.dayOfWeek || 'Setiap Hari'}
                              </span>
                              <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded-md">
                                {waypoints.length} Checkpoint
                              </span>
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-base">{rute.name}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Truck size={13} className="text-gray-400" /> Plat Truk: <span className="font-bold text-gray-700">{rute.truck?.plateNumber || rute.plateNumber || '-'}</span>
                            </p>
                          </div>
                          
                          <button
                            onClick={() => setExpandedRuteId(isExpanded ? null : rute.id)}
                            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                              isExpanded ? 'bg-gray-900 text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 shadow-sm hover:bg-gray-50'
                            }`}
                          >
                            <Eye size={14} />
                            {isExpanded ? 'Sembunyikan Peta' : 'Buka Jalur Peta'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-white grid grid-cols-1 lg:grid-cols-3 gap-5 rounded-b-2xl">
                            <div className="lg:col-span-2 rounded-xl overflow-hidden h-72 border border-gray-200 shadow-inner relative z-10">
                              {validCoordinates.length > 0 ? (
                                <PetaWaypointView 
                                  markerPos={validCoordinates} 
                                  radius={0} 
                                  onMarkerDrag={() => {}} 
                                />
                              ) : (
                                <div className="h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400 italic text-xs gap-1.5 p-4 text-center">
                                  <MapPin size={24} className="text-gray-300" />
                                  <span className="font-bold text-gray-600">Peta Tidak Tersedia</span>
                                  Rute ini belum memiliki koordinat lokasi lintasan yang valid.
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={12} /> Sekuensial Jalur Lintasan
                              </p>
                              <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 p-2 rounded-xl bg-gray-50/50">
                                {waypoints.length === 0 ? (
                                  <p className="text-xs italic text-gray-400 py-4 text-center">Rute tidak memiliki titik singgah.</p>
                                ) : (
                                  waypoints.map((wp: any, index: number) => (
                                    <div key={wp.id || index} className="p-2.5 bg-white rounded-xl text-xs font-bold text-gray-700 flex items-center justify-between gap-3 shadow-sm">
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="w-5 h-5 bg-emerald-600 text-white rounded-md flex items-center justify-center text-[10px] font-black shrink-0">
                                          {index + 1}
                                        </span>
                                        <span className="truncate text-gray-800">{wp.name || wp.address || `Titik ${index + 1}`}</span>
                                      </div>
                                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                        {Number(wp.latitude || 0).toFixed(4)}, {Number(wp.longitude || 0).toFixed(4)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 📋 TAB 5: DISTRIBUSI TUGAS ADUAN */}
            {activeTab === 'penugasan' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-none border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                        <th className="p-4 rounded-l-xl">Pelapor</th>
                        <th className="p-4">Lokasi Kejadian</th>
                        <th className="p-4">Petugas Lapangan</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center rounded-r-xl">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {paginatedPenugasan.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-12 text-gray-400 italic">Tidak ada penugasan aktif saat ini</td></tr>
                      ) : (
                        paginatedPenugasan.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="p-4 font-medium text-gray-700 rounded-l-xl">{p.pelapor || p.report?.pelapor || 'Warga'}</td>
                            <td className="p-4">
                              <p className="font-semibold text-gray-800 leading-tight">{p.location || p.report?.location || '-'}</p>
                              <span className="text-[11px] text-gray-400">{p.district || p.report?.district || ''}</span>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-800 leading-none">{p.driver?.fullName || p.driver?.user?.fullName || p.user?.fullName || <span className="text-gray-300 italic text-xs">Belum Ada</span>}</p>
                              <span className="text-xs text-blue-600 font-mono font-bold">{p.truck?.plateNumber || p.plateNumber}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                p.status === 'SELESAI' ? 'bg-green-100 text-green-700' : p.status === 'BEKERJA' || p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {p.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="p-4 text-center rounded-r-xl">
                              <button onClick={() => setSelectedPenugasan(p)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"><Eye size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL */}
                {totalPagesPenugasan > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-xs font-semibold text-gray-400">Halaman {currentPage} dari {totalPagesPenugasan}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-xl disabled:opacity-30"><ChevronLeft size={16}/></button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPagesPenugasan, p + 1))} disabled={currentPage === totalPagesPenugasan} className="p-2 border rounded-xl disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── MODAL DETAIL POPUPS ─── */}
      {/* 1. Detail Wilayah */}
      {selectedWilayah && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }} 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto"
          >
            <div className="px-6 py-5 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Map size={20} /></div>
                <h3 className="font-bold text-lg">Detail Wilayah</h3>
              </div>
              <button onClick={() => setSelectedWilayah(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="h-64 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 shadow-inner">
                {selectedWilayah?.latitude && selectedWilayah?.longitude ? (
                  <PetaWaypointView
                    markerPos={[parseFloat(selectedWilayah.latitude), parseFloat(selectedWilayah.longitude)]}
                    radius={selectedWilayah.radius || 0}
                    onMarkerDrag={() => {}}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 italic text-xs">Koordinat wilayah tidak valid atau belum tersedia.</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-red-500"><Globe size={18} /></div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Latitude</p>
                    <p className="text-sm font-mono font-bold text-gray-700">{selectedWilayah?.latitude || '-'}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Globe size={18} /></div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Longitude</p>
                    <p className="text-sm font-mono font-bold text-gray-700">{selectedWilayah?.longitude || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Nama & Kode</p>
                  <p className="font-extrabold text-gray-900 leading-tight">{selectedWilayah?.name || 'Wilayah Tanpa Nama'}</p>
                  <p className="text-xs font-mono text-blue-600">#{selectedWilayah?.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Radius</p>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <Navigation size={14} /> <span>{selectedWilayah?.radius || 0} Meter</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Estimasi Luas</p>
                  <p className="font-bold text-gray-700">{formatArea(selectedWilayah?.radius || 0)}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                  <MapPin size={12} /> Alamat Lengkap Terdeteksi
                </p>
                <p className="text-sm text-gray-600 leading-relaxed italic">{selectedWilayah?.address || "Alamat tidak tersedia"}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {selectedWilayah?.createdAt && (
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl text-blue-700">
                    <Calendar size={18} />
                    <div>
                      <p className="text-[9px] font-bold uppercase opacity-60">Terdaftar</p>
                      <p className="text-xs font-bold">{new Date(selectedWilayah.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}
                <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl ${selectedWilayah?.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {selectedWilayah?.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                  <div>
                    <p className="text-[9px] font-bold uppercase opacity-60">Status Sekarang</p>
                    <p className="text-xs font-bold uppercase">{selectedWilayah?.isActive ? 'Operasional' : 'Nonaktif'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setSelectedWilayah(null)} className="px-10 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md">Tutup Detail</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Detail Supir */}
      {selectedSupir && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 text-center shadow-xl">
            <div className="w-16 h-16 bg-green-100 text-green-700 text-2xl font-black rounded-full flex items-center justify-center mx-auto">
              {(selectedSupir.fullName || selectedSupir.user?.fullName || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{selectedSupir.fullName || selectedSupir.user?.fullName || 'Supir'}</h3>
              <p className="text-xs text-gray-400 mt-0.5">ID Driver: #{selectedSupir.id?.slice(0,8).toUpperCase()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-left text-xs space-y-2 font-medium text-gray-600">
              <p className="flex items-center gap-2"><Mail size={14} className="text-green-600"/> {selectedSupir.email || selectedSupir.user?.email || '-'}</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-green-600"/> {selectedSupir.phoneNumber || selectedSupir.user?.phoneNumber || 'Tidak Ada Nomor'}</p>
            </div>
            <button onClick={() => setSelectedSupir(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">Kembali</button>
          </div>
        </div>
      )}

      {/* 3. Detail Penugasan */}
      {selectedPenugasan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-gray-900">Nota Tugas Penanganan Aduan</h3>
              <button onClick={() => setSelectedPenugasan(null)} className="text-gray-400 hover:text-black"><X size={18}/></button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <span className="text-gray-400 block font-bold uppercase text-[9px]">Uraian Kejadian / Aduan</span>
                <p className="text-gray-800 font-medium text-sm mt-0.5">{selectedPenugasan.description || selectedPenugasan.report?.description || 'Tidak ada deskripsi tertulis'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border space-y-1.5 font-medium text-gray-600">
                <p><span className="font-bold text-gray-700">Lokasi:</span> {selectedPenugasan.location || selectedPenugasan.report?.location || '-'}</p>
                <p><span className="font-bold text-gray-700">Kecamatan:</span> {selectedPenugasan.district || selectedPenugasan.report?.district || '-'}</p>
                <p><span className="font-bold text-gray-700">Jenis Sampah:</span> {selectedPenugasan.report?.jenisSampah || '-'}</p>
              </div>
            </div>
            <button onClick={() => setSelectedPenugasan(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">Selesai Meninjau</button>
          </div>
        </div>
      )}
    </div>
  );
}