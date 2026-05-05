"use client";
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Search, MapPin, 
  Users, Building2, Map, X, 
  ChevronDown, Loader2, CircleCheck, 
  Circle, Globe, Target, LayoutGrid, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Types
interface Wilayah {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  population: number | null;
  address: string | null;
  capacityVolume: number | null;
  latitude: string;
  longitude: string;
  radius: number | null; 
  center?: number[];
  createdAt: string;
}

interface FormData {
  name: string;
  code: string;
  population: string;
  address: string;
  capacityVolume: string;
  latitude: string;
  longitude: string;
  radius: string; 
  isActive: boolean;
}

const API_BASE_URL = 'http://localhost:5000/api/admin';

export default function ManageWilayah() {
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWilayah, setEditingWilayah] = useState<Wilayah | null>(null);
  const [viewingWilayah, setViewingWilayah] = useState<Wilayah | null>(null); 
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState<FormData>({
    name: '', code: '', population: '', address: '',
    capacityVolume: '', latitude: '', longitude: '', radius: '', isActive: true
  });

  const fetchWilayah = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/wilayah`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWilayahList(res.data.data || res.data); 
    } catch (error) {
      toast.error('Gagal mengambil data wilayah');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWilayah();
  }, []);

  const filteredWilayah = useMemo(() => {
    return wilayahList
      .filter(wilayah => 
        wilayah.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wilayah.code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(wilayah => {
        if (statusFilter === 'ALL') return true;
        return statusFilter === 'ACTIVE' ? wilayah.isActive : !wilayah.isActive;
      });
  }, [wilayahList, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: wilayahList.length,
    active: wilayahList.filter(w => w.isActive).length,
    totalPopulation: wilayahList.reduce((sum, w) => sum + (w.population || 0), 0),
    totalCapacity: wilayahList.reduce((sum, w) => sum + (w.capacityVolume || 0), 0)
  }), [wilayahList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingWilayah(null);
    setFormData({
      name: '', code: '', population: '', address: '',
      capacityVolume: '', latitude: '', longitude: '', radius: '5000', isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (wilayah: Wilayah) => {
    setEditingWilayah(wilayah);
    setFormData({
      name: wilayah.name,
      code: wilayah.code || '',
      population: wilayah.population?.toString() || '',
      address: wilayah.address || '',
      capacityVolume: wilayah.capacityVolume?.toString() || '',
      latitude: wilayah.latitude,
      longitude: wilayah.longitude,
      radius: wilayah.radius?.toString() || '',
      isActive: wilayah.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const dataToSend = {
        ...formData,
        population: formData.population ? parseInt(formData.population) : null,
        capacityVolume: formData.capacityVolume ? parseInt(formData.capacityVolume) : null,
        radius: formData.radius ? parseInt(formData.radius) : 5000, 
      };

      if (editingWilayah) {
        await axios.put(`${API_BASE_URL}/wilayah/${editingWilayah.id}`, dataToSend, config);
        toast.success('Data wilayah berhasil diperbarui!');
      } else {
        await axios.post(`${API_BASE_URL}/wilayah`, dataToSend, config);
        toast.success('Wilayah baru berhasil ditambahkan!');
      }
      setShowModal(false);
      fetchWilayah();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus wilayah ${name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/wilayah/${id}`, { headers: { Authorization: `Bearer ${token}` }});
      toast.success('Wilayah dihapus!');
      fetchWilayah();
    } catch (error) {
      toast.error('Gagal menghapus wilayah');
    }
  };

  const toggleStatus = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/wilayah/${id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` }});
      toast.success(`Status ${name} diubah`);
      fetchWilayah();
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manajemen Wilayah</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <LayoutGrid size={16} /> Kelola cakupan kecamatan dan geofence operasional.
          </p>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Wilayah', val: stats.total, color: 'text-gray-600', bg: 'bg-gray-50', icon: Building2 },
          { label: 'Wilayah Aktif', val: stats.active, color: 'text-green-600', bg: 'bg-green-50', icon: CircleCheck },
          { label: 'Total Penduduk', val: stats.totalPopulation.toLocaleString('id-ID'), color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
          { label: 'Kapasitas (m³)', val: stats.totalCapacity.toLocaleString('id-ID'), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Map },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#064E3B] text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Wilayah Baru
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau kode kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-black"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === f ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {f === 'ALL' ? 'Semua' : f === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-400">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Sinkronisasi data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-12">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Kecamatan / Kode</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Kapasitas & Populasi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Geofence</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWilayah.map((wilayah, idx) => (
                  <tr key={wilayah.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{wilayah.name}</p>
                          <span className="inline-block mt-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500">
                            {wilayah.code || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm">
                        <div className="font-medium text-gray-700">{wilayah.capacityVolume?.toLocaleString('id-ID')} m³</div>
                        <div className="text-[11px] text-gray-400">{wilayah.population?.toLocaleString('id-ID')} Jiwa</div>
                    </td>
                    <td className="px-6 py-5">
                        <div className="text-[11px] font-mono text-gray-500">{wilayah.latitude}, {wilayah.longitude}</div>
                        <div className="text-[10px] font-bold text-emerald-600 mt-1">Radius: {wilayah.radius || 5000}m</div>
                    </td>
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => toggleStatus(wilayah.id, wilayah.name)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${wilayah.isActive ? 'bg-green-100 text-green-800 ring-green-600/20' : 'bg-red-100 text-red-800 ring-red-600/20'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${wilayah.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {wilayah.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingWilayah(wilayah)} className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(wilayah)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(wilayah.id, wilayah.name)} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {viewingWilayah && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-[#064E3B] px-8 py-6 flex justify-between items-center text-white">
                <h3 className="text-xl font-bold">Detail Wilayah</h3>
                <button onClick={() => setViewingWilayah(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6 text-center">
                <div className="mx-auto w-20 h-20 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center shadow-inner">
                   <MapPin size={40} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-gray-900">{viewingWilayah.name}</h2>
                   <p className="text-sm text-gray-400 font-mono mt-1">{viewingWilayah.code || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Populasi</p>
                        <p className="text-lg font-bold text-gray-800">{viewingWilayah.population?.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Kapasitas</p>
                        <p className="text-lg font-bold text-gray-800">{viewingWilayah.capacityVolume?.toLocaleString('id-ID')} m³</p>
                    </div>
                    <div className="col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Koordinat & Radius</p>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-mono text-gray-600">{viewingWilayah.latitude}, {viewingWilayah.longitude}</span>
                            <span className="text-xs font-bold text-emerald-600">Rad: {viewingWilayah.radius}m</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setViewingWilayah(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold">Tutup Panel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{editingWilayah ? 'Edit Wilayah' : 'Tambah Wilayah Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Nama Kecamatan</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-bold text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Kode Wilayah</label>
                  <input name="code" value={formData.code} onChange={handleInputChange} placeholder="KEC-01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Radius Geofence (Meter)</label>
                  <input type="number" name="radius" value={formData.radius} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Latitude</label>
                  <input name="latitude" value={formData.latitude} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-mono text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Longitude</label>
                  <input name="longitude" value={formData.longitude} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-mono text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Populasi (Jiwa)</label>
                  <input type="number" name="population" value={formData.population} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Kapasitas Maks (m³)</label>
                  <input type="number" name="capacityVolume" value={formData.capacityVolume} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Data Wilayah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}