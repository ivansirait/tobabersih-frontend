'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Filter,
  PieChart,
  Building2,
  Truck,
  Users,
  Navigation,
  ClipboardList,
  RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

// Import Komponen Manajemen Berdasarkan Code Anda Sebelumnya
// Sesuaikan path import ini dengan struktur folder project Anda
import ManageWilayah from './ManageWilayah'; 
import ManageTruk from './ManageTruk';
import ManageSupir from './ManageSupir';
import ManajemenRute from './ManajemenRute';
import ManagePenugasan from './ManagePenugasan';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardSistemPage() {
  // State Utama Navigasi Tab
  const [activeTab, setActiveTab] = useState<'statistik' | 'wilayah' | 'truk' | 'supir' | 'rute' | 'penugasan'>('statistik');
  
  // State untuk Data Statistik & Filter Dashboard
  const [loadingStatistik, setLoadingStatistik] = useState(true);
  const [statistik, setStatistik] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState({ kecamatan: [], status: [], jenisSampah: [] });
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');

  // Fetch Data Awal untuk Dashboard Analitik
  const fetchStatistikData = async () => {
    try {
      setLoadingStatistik(true);
      const token = localStorage.getItem('token');
      
      // Ambil data opsi filter dan statistik utama secara paralel
      const [resStat, resFilter] = await Promise.all([
        axios.get(`${API_BASE_URL}/kabid/statistik`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/kabid/filter-options`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStatistik(resStat.data.data);
      setFilterOptions(resFilter.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data statistik dashboard');
    } finally {
      setLoadingStatistik(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'statistik') {
      fetchStatistikData();
    }
  }, [activeTab]);

  // Filter Data Grafik Sisi Klien (Client-Side Reactive Filter)
  const filteredLaporanPerWilayah = useMemo(() => {
    if (!statistik?.statistikLaporan?.laporanPerWilayah) return [];
    return statistik.statistikLaporan.laporanPerWilayah.filter((item: any) => {
      return selectedKecamatan ? item.district === selectedKecamatan : true;
    });
  }, [statistik, selectedKecamatan]);

  const filteredKategoriTerbanyak = useMemo(() => {
    if (!statistik?.statistikLaporan?.kategoriTerbanyak) return [];
    return statistik.statistikLaporan.kategoriTerbanyak.filter((item: any) => {
      return selectedJenis ? item.jenisSampah === selectedJenis : true;
    });
  }, [statistik, selectedJenis]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 text-black antialiased">
      <Toaster position="top-right" />

      {/* --- HEADER UTAMA SISTEM --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase inline-block mb-2">
            Panel Kepala Bidang / Admin Super
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
            {activeTab === 'statistik' && 'Statistik & Analitik Operasional'}
            {activeTab === 'wilayah' && 'Manajemen Cakupan Wilayah'}
            {activeTab === 'truk' && 'Manajemen Armada Truk'}
            {activeTab === 'supir' && 'Manajemen Akun Supir'}
            {activeTab === 'rute' && 'Manajemen Navigasi Rute'}
            {activeTab === 'penugasan' && 'Manajemen Penugasan Aduan'}
          </h1>
          <p className="text-[#5B7078] text-sm mt-1 font-medium">
            Sistem Integrasi Pengelolaan Layanan Kebersihan dan Logistik Armada.
          </p>
        </div>
        {activeTab === 'statistik' && (
          <button
            onClick={fetchStatistikData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#064E3B] text-white text-sm font-bold rounded-xl hover:bg-[#053f30] transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={16} className={loadingStatistik ? 'animate-spin' : ''} />
            Refresh Analitik
          </button>
        )}
      </div>

      {/* --- MENU NAVIGASI TAB ELEGAN --- */}
      <div className="flex overflow-x-auto gap-2 bg-gray-100/80 p-2 rounded-2xl border border-gray-200/50 scrollbar-none">
        {[
          { id: 'statistik', label: 'Dashboard Analitik', icon: BarChart3 },
          { id: 'wilayah', label: 'Wilayah', icon: Building2 },
          { id: 'truk', label: 'Armada Truk', icon: Truck },
          { id: 'supir', label: 'Akun Supir', icon: Users },
          { id: 'rute', label: 'Rute Jalan', icon: Navigation },
          { id: 'penugasan', label: 'Tugas Aduan', icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#064E3B] shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#064E3B]' : 'text-gray-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- KONTEN DINAMIS BERDASARKAN TAB YANG AKTIF --- */}
      <div className="transition-all duration-300">
        
        {/* TAB 1: DASHBOARD STATISTIK & GRAFIK RECHARTS */}
        {activeTab === 'statistik' && (
          <div className="space-y-6">
            {/* Filter Analitik */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <Filter size={16} /> Filtering Dashboard
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none text-black focus:bg-white focus:border-green-500 transition"
                >
                  <option value="">Semua Wilayah / Kecamatan</option>
                  {filterOptions.kecamatan.map((k: string) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none text-black focus:bg-white focus:border-green-500 transition"
                >
                  <option value="">Semua Status Laporan</option>
                  {filterOptions.status.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={selectedJenis}
                  onChange={(e) => setSelectedJenis(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none text-black focus:bg-white focus:border-green-500 transition"
                >
                  <option value="">Semua Jenis Sampah</option>
                  {filterOptions.jenisSampah.map((j: string) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingStatistik ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-10 h-10 border-4 border-[#064E3B] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="font-semibold text-sm">Sinkronisasi infografis sistem...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grafik Batang: Sebaran Wilayah */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="text-emerald-600" size={20} />
                    <h2 className="text-md font-extrabold text-gray-800 uppercase tracking-tight">Sebaran Laporan Per Wilayah</h2>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredLaporanPerWilayah}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="district" angle={-30} textAnchor="end" height={70} stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: '600' }} />
                        <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                        <Tooltip cursor={{ fill: '#f9fafb' }} />
                        <Legend />
                        <Bar dataKey="_count.id" name="Jumlah Aduan" fill="#064E3B" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grafik Lingkaran: Dominasi Jenis Sampah */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-6">
                    <PieChart className="text-emerald-600" size={20} />
                    <h2 className="text-md font-extrabold text-gray-800 uppercase tracking-tight">Kategori Sampah Terbanyak</h2>
                  </div>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={filteredKategoriTerbanyak}
                          dataKey="_count.id"
                          nameKey="jenisSampah"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          style={{ fontSize: '10px', fontWeight: 'bold' }}
                        >
                          {filteredKategoriTerbanyak.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAJEMEN WILAYAH (CAKUPAN OPERASIONAL & GEOMAP) */}
        {activeTab === 'wilayah' && <ManageWilayah />}

        {/* TAB 3: MANAJEMEN ARMADA TRUK */}
        {activeTab === 'truk' && <ManageTruk />}

        {/* TAB 4: MANAJEMEN AKUN SUPIR (OPERATOR LAPANGAN) */}
        {activeTab === 'supir' && <ManageSupir />}

        {/* TAB 5: MANAJEMEN RUTE PERJALANAN (WAYPOINTS & LEAFLET MAP) */}
        {activeTab === 'rute' && <ManajemenRute />}

        {/* TAB 6: MONITORING & DISTRIBUSI PENUGASAN ADUAN WARGA */}
        {activeTab === 'penugasan' && <ManagePenugasan />}

      </div>
    </div>
  );
}