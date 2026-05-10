"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Search, Calendar, 
  User, Truck, MapPin, Filter, X, Eye,
  Clock, CheckCircle2, Phone, FileText, RefreshCw,
  TrendingUp, Users, Repeat, ClipboardList
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PenugasanDetail from './PenugasanDetail';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {} as any;
  }
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Types & Interfaces ---
interface Penugasan {
  id: string;
  taskNumber: string;
  type: 'ADUAN';
  status: string;
  location: string;
  district: string;
  scheduledAt: string;
  driver: {
    id: string;
    fullName: string;
    phoneNumber?: string;
  };
  truck?: {
    id: string;
    plateNumber: string;
  };
  report?: {
    id: string;
    description: string;
  };
  description?: string;
  notes?: string;
}

// Komponen untuk mengelola Penugasan Aduan Warga
export default function ManagePenugasan() {
  // --- States ---
  const [penugasanList, setPenugasanList] = useState<Penugasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPenugasan, setSelectedPenugasan] = useState<Penugasan | null>(null);
  
  const [supirList, setSupirList] = useState([]);
  const [trukList, setTrukList] = useState([]);
  const [laporanList, setLaporanList] = useState([]);
  
  const [filter, setFilter] = useState({ status: '' });

  const [formData, setFormData] = useState({
    reportId: '', driverId: '', truckId: '', scheduledAt: '',
    location: '', latitude: '', longitude: '', district: '',
    description: '', notes: ''
  });

  // --- API Calls ---
  const fetchPenugasan = async () => {
    try {
      setLoading(true);
      const url = `/penugasan?type=ADUAN${filter.status ? `&status=${filter.status}` : ''}`;
      const res = await api.get(url);
      setPenugasanList(res.data.data || []);
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Gagal memuat penugasan';
      console.error('Error fetching penugasan:', message, error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    const results = await Promise.allSettled([
      api.get('/admin/supir-list'),
      api.get('/admin/truks'),
      api.get('/laporan'),
    ]);

    const [supirResult, trukResult, laporanResult] = results;

    if (supirResult.status === 'fulfilled') {
      setSupirList(supirResult.value.data.data || []);
    } else {
      console.error('Error loading supir dropdown:', supirResult.reason);
      toast.error('Gagal memuat daftar supir');
    }

    if (trukResult.status === 'fulfilled') {
      setTrukList(trukResult.value.data.data || []);
    } else {
      console.error('Error loading truk dropdown:', trukResult.reason);
      toast.error('Gagal memuat daftar armada');
    }

    if (laporanResult.status === 'fulfilled') {
      const pendingLaporan = laporanResult.value.data.data?.filter((l: any) => l.status === 'PENDING') || [];
      setLaporanList(pendingLaporan);
    } else {
      console.error('Error loading laporan dropdown:', laporanResult.reason);
      toast.error('Gagal memuat laporan pending');
    }
  };

  // Fetch data saat komponen mount
  useEffect(() => {
    fetchPenugasan();
    fetchDropdownData();
    resetForm();
  }, [filter.status]);

  // --- Helpers ---
  const filteredPenugasan = useMemo(() => {
    return penugasanList.filter(item => {
      const taskNumberMatch = (item.taskNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const locationMatch = (item.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      const driverMatch = (item.driver?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return taskNumberMatch || locationMatch || driverMatch;
    });
  }, [penugasanList, searchTerm]);

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      reportId: '', driverId: '', truckId: '', scheduledAt: '',
      location: '', latitude: '', longitude: '', district: '',
      description: '', notes: ''
    });
  };

  const openEditModal = (task: Penugasan) => {
    setEditingId(task.id);
    if (!task.scheduledAt) {
      // Jika scheduledAt null, gunakan waktu sekarang
      const now = new Date();
      const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setFormData({
        reportId: task.report?.id || '',
        driverId: task.driver?.id || '',
        truckId: task.truck?.id || '',
        scheduledAt: localDateTime,
        location: task.location || '',
        district: task.district || '',
        description: task.description || '',
        notes: task.notes || '',
        latitude: '', longitude: '' 
      });
    } else {
      const dateObj = new Date(task.scheduledAt);
      const localDateTime = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setFormData({
        reportId: task.report?.id || '',
        driverId: task.driver?.id || '',
        truckId: task.truck?.id || '',
        scheduledAt: localDateTime,
        location: task.location || '',
        district: task.district || '',
        description: task.description || '',
        notes: task.notes || '',
        latitude: '', longitude: '' 
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/penugasan/${editingId}`, formData);
        toast.success('Penugasan berhasil dialihkan / diperbarui!');
      } else {

        await api.post('/penugasan/aduan', formData);
        toast.success('Penugasan berhasil dibuat!');
      }
      
      setShowModal(false);
      fetchPenugasan();
      resetForm();
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Gagal menyimpan penugasan';
      console.error('Error saving penugasan:', message, error);
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penugasan ini?')) return;
    try {
      await api.delete(`/penugasan/${id}`);
      toast.success('Penugasan dihapus');
      fetchPenugasan();
    } catch (error) {
      toast.error('Gagal menghapus penugasan');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    // Handle null/undefined status
    const safeStatus = status || 'DITUGASKAN';
    const styles: any = {
      SELESAI: "bg-emerald-100 text-emerald-700 border-emerald-200 ring-emerald-500/20",
      DITUGASKAN: "bg-blue-100 text-blue-700 border-blue-200 ring-blue-500/20",
      DALAM_PERJALANAN: "bg-indigo-100 text-indigo-700 border-indigo-200 ring-indigo-500/20",
      BEKERJA: "bg-amber-100 text-amber-700 border-amber-200 ring-amber-500/20",
      DEFAULT: "bg-slate-100 text-slate-600 border-slate-200"
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ring-1 ${styles[safeStatus] || styles.DEFAULT}`}>
        {(safeStatus || 'DITUGASKAN').replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans antialiased pb-20">
      <Toaster position="top-right" />
      
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl shadow-lg bg-orange-500 shadow-orange-200">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Penugasan Aduan Warga
              </h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-0.5">
                <span className="flex items-center gap-1"><Truck size={14}/> {trukList.length} Armada</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1"><Users size={14}/> {supirList.length} Driver Aktif</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <button
           onClick={() => { resetForm(); setShowModal(true); }}
           style={{ backgroundColor: '#064E3B' }}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-xl shadow-slate-200 hover:opacity-90">
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          Tugas Aduan Baru
          </button>          
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Tugas', val: penugasanList.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Dalam Proses', val: penugasanList.filter(p => p.status !== 'SELESAI').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Selesai', val: penugasanList.filter(p => p.status === 'SELESAI').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Driver On-Duty', val: new Set(penugasanList.filter(p => p.status !== 'SELESAI').map(p => p.driver?.id)).size, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((stat, i) => (
            <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900">{stat.val}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all">
          <div className="p-6 bg-white border-b border-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Cari ID, lokasi, atau nama driver..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                <select 
                  className="bg-transparent px-4 py-2 text-sm font-bold text-slate-600 outline-none cursor-pointer"
                  onChange={(e) => setFilter({ status: e.target.value })}
                >
                  <option value="">Semua Status</option>
                  <option value="DITUGASKAN">Ditugaskan</option>
                  <option value="SELESAI">Selesai</option>
                </select>
              </div>
              <button 
                onClick={fetchPenugasan} 
                className="p-3 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all border border-slate-100"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Task Info</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Lokasi</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Driver & Armada</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Jadwal</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-32">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold text-sm">Menyinkronkan data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPenugasan.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500 font-bold">Data tidak ditemukan</p>
                    </td>
                  </tr>
                ) : filteredPenugasan.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">#{item.taskNumber || 'Tanpa ID'}</span>
                        <div className="mt-1">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter text-orange-600 bg-orange-100">
                            ADUAN
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-slate-100 p-1.5 rounded-lg text-slate-400">
                          <MapPin size={16} />
                        </div>
                        <div className="max-w-[180px]">
                          <p className="text-sm font-bold text-slate-700 truncate" title={item.location || ''}>{item.location || 'Lokasi Tidak Ada'}</p>
                          <p className="text-xs text-slate-400 font-medium">{item.district || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-sm border border-white shadow-sm">
                            {item.driver?.fullName?.charAt(0) || '?'}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-lg shadow-sm">
                             <Truck size={12} className="text-indigo-500" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{item.driver?.fullName || 'Tidak ada driver'}</p>
                          <p className="text-[11px] text-indigo-600 font-extrabold uppercase tracking-tight mt-0.5">
                            {item.truck?.plateNumber || 'TANPA TRUK'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="bg-slate-50 px-3 py-2 rounded-xl w-fit border border-slate-100">
                        <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'Tanpa Jadwal'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                          <Clock size={12} className="text-slate-400" />
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={item.status || 'DITUGASKAN'} />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedPenugasan(item); setShowDetailModal(true); }} 
                          className="p-2 text-white bg-blue-500 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        {item.status !== 'SELESAI' && (
                          <button 
                            onClick={() => openEditModal(item)} 
                            className="p-2 text-white bg-yellow-500 rounded-lg transition-all"
                            title="Alihkan Supir / Edit Tugas"
                          >
                            <Repeat size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-2 text-white bg-red-500 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <FileText size={20}/>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-none">
                    {editingId 
                      ? 'Alihkan / Edit Penugasan' 
                      : 'Buat Tugas Aduan'
                    }
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    {editingId ? 'Update Driver atau Jadwal' : 'Input Data Penugasan Aduan'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {!editingId && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Laporan Aduan</label>
                  <select 
                    name="reportId" 
                    value={formData.reportId}
                    required
                    onChange={(e) => {
                      const sel: any = laporanList.find((l:any) => l.id === e.target.value);
                      if(sel) {
                        setFormData({
                          ...formData,
                          reportId: sel.id,
                          location: sel.description || '',
                          district: sel.jenisSampah || '', 
                          description: sel.description
                        });
                      } else {
                        setFormData({ ...formData, reportId: e.target.value });
                      }
                    }}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
                  >
                    <option value="">-- Cari Laporan --</option>
                    {laporanList.map((l:any) => (
                      <option key={l.id} value={l.id}>
                        {(l.jenisSampah || 'Laporan') + ' - ' + ((l.description || 'Tanpa deskripsi').substring(0, 40) + '...')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasi / Rute Kerja</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" name="location" value={formData.location} onChange={handleInputChange}
                    placeholder="Masukkan alamat lengkap lokasi aduan..."
                    required
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Driver Penanggung Jawab</label>
                  <select name="driverId" value={formData.driverId} onChange={handleInputChange} required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all">
                    <option value="">Pilih Driver</option>
                    {supirList.map((s:any) => <option key={s.id} value={s.id}>{s.fullName || 'Driver Tanpa Nama'}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Armada (Truk)</label>
                  <select name="truckId" value={formData.truckId} onChange={handleInputChange} required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all">
                    <option value="">Pilih Truk</option>
                    {trukList.map((t:any) => <option key={t.id} value={t.id}>{t.plateNumber || 'Truk Tanpa Plat'}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Waktu Pelaksanaan</label>
                <input 
                  type="datetime-local" name="scheduledAt" value={formData.scheduledAt} onChange={handleInputChange} required
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Instruksi / Rincian Khusus</label>
                <textarea 
                  name="notes" value={formData.notes} onChange={handleInputChange} rows={3}
                  placeholder="Contoh: Ambil sampah di bak penampungan belakang pasar..."
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                  {editingId ? 'Simpan Perubahan Tugas' : 'Konfirmasi Penugasan Baru'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 bg-white border-2 border-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedPenugasan && (
        <PenugasanDetail 
          penugasan={selectedPenugasan} 
          onClose={() => { setShowDetailModal(false); setSelectedPenugasan(null); }} 
        />
      )}
    </div>
  );
}