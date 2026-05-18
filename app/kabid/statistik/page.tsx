// app/kabid/statistik/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Calendar,
  Download,
  Filter,
  PieChart,
  Activity
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function StatistikPage() {
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState({ kecamatan: [], status: [], jenisSampah: [] });

  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/kabid/statistik`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatistik(res.data.data);
    } catch (error) {
      console.error('Error fetching statistik:', error);
      toast.error('Gagal memuat data statistik');
    } finally {
      setLoading(false);
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
      console.error('Error fetching filter options:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Statistik & Analitik Operasional</h1>
          <p className="text-gray-500 mt-1">Analisis data layanan kebersihan</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-500" />
          <span className="font-medium">Filter Data</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Semua Wilayah</option>
            {filterOptions.kecamatan.map((k: string) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Semua Status</option>
            {filterOptions.status.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Semua Jenis</option>
            {filterOptions.jenisSampah.map((j: string) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistik Laporan */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-green-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">Statistik Laporan</h2>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statistik?.statistikLaporan?.laporanPerWilayah || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="district" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="_count.id" name="Jumlah Laporan" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistik Operasional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-green-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Performa Operasional</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Rata-rata Waktu Respon</span>
              <span className="font-bold text-green-600">{statistik?.statistikOperasional?.rataWaktuRespon || '-'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Tingkat Penyelesaian Laporan</span>
              <span className="font-bold text-green-600">{statistik?.statistikOperasional?.tingkatPenyelesaian || '-'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Laporan</span>
              <span className="font-bold text-gray-800">{statistik?.statistikLaporan?.laporanPerWilayah?.reduce((sum: number, w: any) => sum + w._count.id, 0) || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="text-green-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Kategori Laporan Terbanyak</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={statistik?.statistikLaporan?.kategoriTerbanyak || []}
                  dataKey="_count.id"
                  nameKey="jenisSampah"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {(statistik?.statistikLaporan?.kategoriTerbanyak || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap keterangan */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="text-green-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">Visualisasi Heatmap Aduan</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Silakan buka menu <strong>Peta Aduan</strong> untuk melihat visualisasi heatmap dan persebaran titik aduan di peta interaktif.
        </p>
        <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
          <MapPin className="text-blue-600" size={24} />
          <div>
            <p className="font-medium text-blue-800">Heatmap tersedia di halaman Peta Aduan</p>
            <p className="text-sm text-blue-600">Lihat persebaran laporan masyarakat secara visual</p>
          </div>
        </div>
      </div>
    </div>
  );
}