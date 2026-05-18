// app/kabid/peta-aduan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { 
  MapPin, Filter, X, Calendar, AlertTriangle, RefreshCw, 
  Clock, CheckCircle2, AlertCircle, ChevronRight, 
  Image as ImageIcon, User, Map as MapIcon, TrendingUp,
  Eye, FileText, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Dynamic import untuk peta (hindari SSR issues)
const PetaAduanMap = dynamic(() => import('../components/PetaAduanMap'), { ssr: false });

export default function PetaAduanPage() {
  const [loading, setLoading] = useState(true);
  const [titikAduan, setTitikAduan] = useState<any[]>([]);
  const [kecamatan, setKecamatan] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [filters, setFilters] = useState({
    status: '',
    district: '',
    startDate: '',
    endDate: ''
  });
  const [filterOptions, setFilterOptions] = useState({ kecamatan: [], status: [], jenisSampah: [] });
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
      
      // Validasi dan format ulang data titik
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
          pelapor: point.pelapor || 'Warga'
        }));
      
      setTitikAduan(formattedTitik);
      setKecamatan(kecamatanData);
      
      // Hitung statistik
      setStats({
        total: formattedTitik.length,
        pending: formattedTitik.filter(p => p.status === 'PENDING').length,
        diproses: formattedTitik.filter(p => p.status === 'DITINDAKLANJUTI').length,
        selesai: formattedTitik.filter(p => p.status === 'SELESAI').length
      });
      
    } catch (error: any) {
      console.error('Error fetching peta aduan:', error);
      toast.error(error.response?.data?.message || 'Gagal memuat data peta');
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
          pelapor: l.user?.fullName || 'Warga'
        }));
      
      setTitikAduan(titikConverted);
      setStats({
        total: titikConverted.length,
        pending: titikConverted.filter(p => p.status === 'PENDING').length,
        diproses: titikConverted.filter(p => p.status === 'DITINDAKLANJUTI').length,
        selesai: titikConverted.filter(p => p.status === 'SELESAI').length
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
        kecamatan: [],
        status: ['PENDING', 'DITINDAKLANJUTI', 'SELESAI'],
        jenisSampah: []
      });
    }
  };

  const applyFilters = () => {
    fetchData();
    setShowFilter(false);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      district: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => fetchData(), 100);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-red-100 text-red-700 border-red-200';
      case 'DITINDAKLANJUTI': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'SELESAI': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <AlertCircle size={14} className="text-red-500" />;
      case 'DITINDAKLANJUTI': return <Clock size={14} className="text-yellow-500" />;
      case 'SELESAI': return <CheckCircle2 size={14} className="text-green-500" />;
      default: return <FileText size={14} className="text-gray-500" />;
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Peta Persebaran Aduan</h1>
          <p className="text-gray-500 mt-1">Visualisasi titik laporan masyarakat per wilayah</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Laporan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Diproses</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.diproses}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selesai</p>
              <p className="text-2xl font-bold text-green-600">{stats.selesai}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Filter Data</h2>
            <button onClick={() => setShowFilter(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Semua Status</option>
              {filterOptions.status.map((s: string) => (
                <option key={s} value={s}>{s === 'DITINDAKLANJUTI' ? 'Diproses' : s}</option>
              ))}
            </select>
            <select
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Semua Kecamatan</option>
              {filterOptions.kecamatan.map((k: string) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
              placeholder="Tanggal Mulai"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
              placeholder="Tanggal Akhir"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Terapkan Filter
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Peta */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-[550px] w-full">
            <PetaAduanMap
              titikAduan={titikAduan}
              kecamatan={kecamatan}
              center={[2.3333, 99.0]}
              zoom={11}
              onSelectPoint={setSelectedPoint}
            />
          </div>
        </div>

        {/* Sidebar Informasi */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'list' 
                    ? 'text-green-600 border-b-2 border-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Layers size={16} />
                  Daftar Laporan
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'stats' 
                    ? 'text-green-600 border-b-2 border-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp size={16} />
                  Regional Insight
                </div>
              </button>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {activeTab === 'list' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 mb-2">Menampilkan {titikAduan.length} laporan</p>
                  {titikAduan.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Belum ada laporan</p>
                    </div>
                  ) : (
                    titikAduan.slice(0, 10).map((point, idx) => (
                      <div
                        key={point.id || idx}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          selectedPoint?.id === point.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => setSelectedPoint(point)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(point.status)}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(point.status)}`}>
                              {point.status === 'DITINDAKLANJUTI' ? 'Diproses' : point.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(point.waktu).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
                          {point.deskripsi}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span>{point.kecamatan}</span>
                        </div>
                        {point.foto && (
                          <div className="mt-2">
                            <img 
                              src={point.foto} 
                              alt="Laporan" 
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {titikAduan.length > 10 && (
                    <p className="text-center text-xs text-gray-400 pt-2">
                      + {titikAduan.length - 10} laporan lainnya
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Statistik per Kecamatan */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MapIcon size={16} className="text-green-600" />
                      Statistik per Kecamatan
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(
                        titikAduan.reduce((acc: any, point) => {
                          const kec = point.kecamatan;
                          if (!acc[kec]) acc[kec] = { total: 0, pending: 0, diproses: 0, selesai: 0 };
                          acc[kec].total++;
                          if (point.status === 'PENDING') acc[kec].pending++;
                          else if (point.status === 'DITINDAKLANJUTI') acc[kec].diproses++;
                          else if (point.status === 'SELESAI') acc[kec].selesai++;
                          return acc;
                        }, {})
                      ).slice(0, 5).map(([kecamatan, data]: [string, any]) => (
                        <div key={kecamatan} className="p-2 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-800">{kecamatan}</span>
                            <span className="text-xs font-bold text-gray-600">{data.total} laporan</span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-red-600">⬤ {data.pending}</span>
                            <span className="text-yellow-600">⬤ {data.diproses}</span>
                            <span className="text-green-600">⬤ {data.selesai}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotspot Area */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-orange-500" />
                      Area Rawan Sampah
                    </h3>
                    <div className="space-y-3">
                      {titikAduan
                        .filter(p => p.status === 'PENDING')
                        .slice(0, 3)
                        .map((point, idx) => (
                          <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <p className="text-sm font-medium text-gray-800">{point.deskripsi?.substring(0, 50)}...</p>
                            <p className="text-xs text-gray-500 mt-1">{point.kecamatan}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                              <Clock size={12} />
                              <span>Perlu penanganan segera</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Point Detail */}
          {selectedPoint && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-green-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Eye size={16} className="text-green-600" />
                  Detail Laporan
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(selectedPoint.status)}`}>
                    {selectedPoint.status === 'DITINDAKLANJUTI' ? 'Diproses' : selectedPoint.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(selectedPoint.waktu).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{selectedPoint.deskripsi}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>Kecamatan: {selectedPoint.kecamatan}</span>
                </div>
                {selectedPoint.jenis && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={12} />
                    <span>Jenis: {selectedPoint.jenis}</span>
                  </div>
                )}
                {selectedPoint.foto && (
                  <img 
                    src={selectedPoint.foto} 
                    alt="Laporan" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedPoint.lat},${selectedPoint.lng}`, '_blank')}
                  className="w-full mt-2 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin size={14} />
                  Buka di Google Maps
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm">Diproses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm">Selesai</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">🏢</div>
            <span className="text-sm">Kantor Kecamatan</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-sm">Hotspot Sampah</span>
          </div>
        </div>
      </div>
    </div>
  );
}