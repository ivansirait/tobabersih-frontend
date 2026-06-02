// app/kabid/statistik/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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

// Gunakan proxy Next.js
const API_BASE_URL = '/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function StatistikPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState({ kecamatan: [], status: [], jenisSampah: [] });
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const pieContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [pieSize, setPieSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const updateFrom = (el: HTMLDivElement | null, setter: (size: { width: number; height: number }) => void) => {
      if (!el) return null;
      const update = () => setter({ width: el.clientWidth, height: el.clientHeight });
      update();
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return observer;
    };

    const chartObserver = updateFrom(chartContainerRef.current, setChartSize);
    const pieObserver = updateFrom(pieContainerRef.current, setPieSize);

    return () => {
      chartObserver?.disconnect();
      pieObserver?.disconnect();
    };
  }, []);

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
        <div ref={chartContainerRef} className="h-80 min-w-[300px]">
          {isMounted && chartSize.width > 0 && chartSize.height > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
            <BarChart data={statistik?.statistikLaporan?.laporanPerWilayah || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="district" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="_count.id" name="Jumlah Laporan" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          ) : null}
        </div>
      </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="text-green-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Kategori Laporan Terbanyak</h2>
          </div>
          <div ref={pieContainerRef} className="h-64 min-w-[300px]">
            {isMounted && pieSize.width > 0 && pieSize.height > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
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
            ) : null}
          </div>
        </div>
      </div>
  );
}