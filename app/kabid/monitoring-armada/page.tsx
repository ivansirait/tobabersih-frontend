'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { Truck, MapPin, RefreshCw, Activity, Gauge, TrendingUp, Compass, User, AlertCircle, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Gunakan proxy Next.js
const API_BASE_URL = '/api';

// Dynamic import untuk peta (Leaflet) agar terhindar dari issue SSR Next.js
const MonitoringMap = dynamic(() => import('../components/MonitoringMap'), { ssr: false });

export default function MonitoringArmada() {
  const [loading, setLoading] = useState(true);
  const [armada, setArmada] = useState<any[]>([]);
  const [statistik, setStatistik] = useState<any>({});
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchArmada();
    const interval = setInterval(fetchArmada, 30000); // Sinkronisasi otomatis berkala setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const fetchArmada = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/kabid/monitoring-armada`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArmada(res.data.data.armada || []);
      setStatistik(res.data.data.statistik || {});
    } catch (error) {
      console.error('Error fetching armada:', error);
      toast.error('Gagal memuat data telemetri armada');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium animate-pulse">Menghubungkan ke satelit GPS armada...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 text-black antialiased">
      <Toaster position="top-right" />

      {/* ─── HEADER UTAMA MONITORING ─── */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 mb-2 shadow-sm">
            <Compass size={12} className="animate-spin-slow" /> Real-Time Fleet Management
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
            Monitoring Armada
          </h1>
          <p className="text-[#5B7078] text-sm mt-1 font-medium">
            Live tracking koordinat GPS, manifes rute, dan performa ritase truk pengangkut sampah.
          </p>
        </div>
        <button
          onClick={fetchArmada}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#064E3B] text-white text-xs font-bold rounded-xl hover:bg-[#053f30] transition-all shadow-md active:scale-95 shrink-0"
        >
          <RefreshCw size={14} />
          Segarkan Data GPS
        </button>
      </div>

      {/* ─── PANEL KARTU STATISTIK MATRIKS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Armada Aktif', value: statistik.totalArmada || 0, icon: Truck, bg: 'bg-blue-50 text-blue-600', border: 'border-blue-500' },
          { label: 'Perjalanan Hari Ini', value: statistik.totalPerjalananHariIni || 0, icon: Activity, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-500' },
          { label: 'Rata-rata Ritase', value: `${statistik.rataRataRitase || 0} Rit`, icon: Gauge, bg: 'bg-purple-50 text-purple-600', border: 'border-purple-500' },
          { label: 'Armada Paling Aktif', value: `${statistik.armadaPalingAktif?.length || 0} Unit`, icon: TrendingUp, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-500' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm border-l-[5px] ${stat.border} flex items-center justify-between transition-all hover:shadow-md`}>
              <div className="space-y-1">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide leading-none">{stat.label}</p>
                <p className="text-xl md:text-2xl font-black text-gray-900 font-mono leading-none pt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── LIVE GIS TRACKING & SIDEBAR LIST (FLEXBOX DESIGN) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Peta Spasial Geofencing (2/3 Kolom) */}
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            <h2 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="text-emerald-600" size={16} />
              Satelit Live Tracking Map
            </h2>
          </div>
          <div className="h-[520px] w-full relative z-10">
            {isClient && <MonitoringMap trucks={armada} onSelectTruck={setSelectedTruck} />}
          </div>
        </div>

        {/* Daftar Manifes Kendaraan Samping (1/3 Kolom) */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[573px]">
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Truck className="text-emerald-600" size={16} />
              Status Logistik Armada ({armada.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100 overflow-y-auto flex-1 scrollbar-none">
            {armada.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic flex flex-col items-center justify-center gap-2 h-full">
                <Truck size={36} className="text-gray-200" />
                <span className="text-xs font-bold text-gray-500">Tidak Ada Armada Berdinas</span>
              </div>
            ) : (
              armada.map((truck: any) => {
                const isSelected = selectedTruck?.id === truck.id;
                return (
                  <div
                    key={truck.id}
                    onClick={() => setSelectedTruck(truck)}
                    className={`p-4 cursor-pointer text-left transition-all border-l-4 ${
                      isSelected 
                        ? 'bg-emerald-50/40 border-emerald-600 font-medium' 
                        : 'border-transparent hover:bg-gray-50 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-extrabold text-sm text-gray-900 tracking-tight font-mono">{truck.plateNumber}</p>
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                          <User size={12} className="text-gray-400" /> {truck.sopir || 'Supir belum ditugaskan'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-md tracking-wide uppercase ${
                        truck.status === 'BUSY' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {truck.status === 'BUSY' ? 'DI JALAN' : 'STANDBY'}
                      </span>
                    </div>

                    {/* Meta Status GPS */}
                    {truck.currentLat && truck.currentLong && (
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 font-sans uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span>Sinyal Telemetri Aktif</span>
                      </div>
                    )}

                    {/* Deskripsi Tugas Aktif */}
                    {truck.tugasAktif && (
                      <div className="mt-2 text-[11px] bg-white border border-gray-100 p-2 rounded-lg text-gray-600 leading-normal">
                        <span className="font-bold text-gray-400 block uppercase text-[8px] tracking-wider mb-0.5">Destinasi Tugas</span>
                        <p className="line-clamp-1 font-medium">{truck.tugasAktif.location}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ─── DRAWER INTERAKTIF: DETAIL DATA ARMADA YANG DIPILIH ─── */}
      {selectedTruck && (
        <div className="bg-white rounded-[24px] border border-gray-200 p-5 md:p-6 shadow-xl relative animate-in fade-in slide-in-from-bottom-4 transition-all">
          <button 
            onClick={() => setSelectedTruck(null)}
            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 font-mono tracking-tight">{selectedTruck.plateNumber}</h2>
                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md tracking-wide uppercase ${
                  selectedTruck.status === 'BUSY' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedTruck.status === 'BUSY' ? 'Operasional' : 'Siaga Pul'}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-1">
                <User size={13} className="text-gray-400" /> Penanggung Jawab Driver: <span className="text-gray-800 font-bold">{selectedTruck.sopir || '-'}</span>
              </p>
            </div>
          </div>

          {/* Grid Informasi Metrik Tambahan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Total Jarak Tempuh</span>
              <p className="text-lg font-extrabold text-gray-800 font-mono">24.8 <span className="text-xs text-gray-400 font-sans font-bold">km</span></p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Akumulasi Ritase</span>
              <p className="text-lg font-extrabold text-gray-800 font-mono">3 <span className="text-xs text-gray-400 font-sans font-bold">Trip</span></p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Estimasi Durasi</span>
              <p className="text-lg font-extrabold text-gray-800 font-mono">04j : 12m</p>
            </div>
          </div>

          {/* Banner Tambahan: Nota Surat Tugas Aktif */}
          {selectedTruck.tugasAktif && (
            <div className="mt-4 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B] uppercase tracking-wide">
                <AlertCircle size={14} /> Manifes Tugas Pengangkutan Terpasang
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700 leading-relaxed font-medium">
                <p><span className="font-bold text-gray-400 uppercase text-[9px] block">Titik Sektor Muatan</span> {selectedTruck.tugasAktif.location}</p>
                <p><span className="font-bold text-gray-400 uppercase text-[9px] block">Waktu Keberangkatan</span> {new Date(selectedTruck.tugasAktif.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}