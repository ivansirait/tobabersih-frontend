"use client";
import { useState, useEffect, useMemo } from 'react';

import axios from 'axios';
import dynamic from 'next/dynamic';
import {
  Plus, Edit, Trash2, Search, MapPin,
  Building2, Map, X, Loader2,
  CircleCheck, Eye, Power, PowerOff,
  Calendar, Hash, Navigation, Globe, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AlertDialog from './AlertDialog';

const WilayahMap = dynamic(() => import('../../components/WilayahMap'), {
  ssr: false,
  loading: () => <div className="h-48 md:h-64 bg-gray-100 flex items-center justify-center rounded-2xl text-sm italic text-gray-400">Memuat Peta...</div>
});

interface Wilayah {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  address: string | null;
  latitude: string;
  longitude: string;
  radius: number | null;
  createdAt: string;
  area?: number;
}

interface InlineAlert {
  type: 'error' | 'success' | 'warning';
  message: string;
}

interface AlertState {
  open: boolean;
  type: "success" | "error" | "delete" | "loading" | "edit" | "info"    
  title: string;
  description: string;
  detailText?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ManageWilayah() {
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWilayah, setEditingWilayah] = useState<Wilayah | null>(null);
  const [viewingWilayah, setViewingWilayah] = useState<Wilayah | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<Wilayah | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Ganti InlineAlert dengan AlertState seperti ManageSupir ──
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    type: "success",
    title: "",
    description: "",
    detailText: "",
  });

  const [formAlert, setFormAlert] = useState<InlineAlert | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', code: '', address: '',
    latitude: '-6.200000', longitude: '106.816666', radius: '5000', isActive: true
  });

  // ── showAlert mengikuti signature ManageSupir ──
const showAlert = (
    type: "success" | "error" | "delete" | "edit" | "info",
  title: string,
  description: string,
  detailText?: string
) => {
  setAlertState({ open: true, type, title, description, detailText });
};

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, open: false }));
  };

  const showFormAlert = (type: InlineAlert['type'], message: string) => {
    setFormAlert({ type, message });
    setTimeout(() => setFormAlert(null), 5000);
  };

  const calculateArea = (radius: number): number => {
    if (!radius || radius <= 0) return 0;
    const radiusInKm = radius / 1000;
    return Math.PI * radiusInKm * radiusInKm;
  };

  const formatArea = (area: number): string => {
    return area < 1 ? `${(area * 1000000).toFixed(2)} m²` : `${area.toFixed(2)} km²`;
  };

  const checkDuplicate = (
    name: string,
    code: string,
    latitude: string,
    longitude: string,
    excludeId?: string
  ): string | null => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    for (const w of wilayahList) {
      if (excludeId && w.id === excludeId) continue;
      if (w.name.trim().toLowerCase() === name.trim().toLowerCase())
        return `Wilayah dengan nama "${w.name}" sudah terdaftar.`;
      if (code && w.code && w.code.trim().toUpperCase() === code.trim().toUpperCase())
        return `Kode wilayah "${w.code}" sudah digunakan oleh "${w.name}".`;
      if (!isNaN(lat) && !isNaN(lon)) {
        const dist = getDistanceMeters(lat, lon, parseFloat(w.latitude), parseFloat(w.longitude));
        if (dist < 100)
          return `Lokasi terlalu dekat dengan wilayah "${w.name}" (jarak ±${Math.round(dist)}m). Gunakan koordinat berbeda.`;
      }
    }
    return null;
  };

  const fetchWilayah = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert('error', 'Sesi Tidak Valid', 'Token belum ditemukan.', 'Silakan login ulang untuk melanjutkan.');
        setWilayahList([]);
        return;
      }
      const res = await axios.get(`${API_BASE_URL}/wilayah`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const extractWilayahList = (payload: unknown): Wilayah[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload as Wilayah[];
        const obj = payload as Record<string, unknown>;
        const candidates: unknown[] = [
          obj['data'], obj['items'], obj['result'],
          (obj['data'] as any)?.data,
          (obj['data'] as any)?.items,
        ];
        for (const c of candidates) {
          if (Array.isArray(c)) return c as Wilayah[];
        }
        for (const key of ['wilayah', 'data', 'items', 'result']) {
          const v = obj[key];
          if (Array.isArray(v)) return v as Wilayah[];
        }
        return [];
      };
      const wilayahListRaw = extractWilayahList(res.data);
      if (!wilayahListRaw.length) {
        setWilayahList([]);
        return;
      }
      setWilayahList(wilayahListRaw.map((w: Wilayah) => ({ ...w, area: calculateArea(w.radius ?? 0) })));
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Data wilayah tidak dapat dimuat.';
      showAlert('error', 'Gagal Memuat Data', msg, 'Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWilayah(); }, []);

  useEffect(() => {
    if (!editingWilayah && formData.name.length >= 3) {
      const cleanName = formData.name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      const prefix = cleanName.substring(0, 3);
      if (!formData.code || formData.code.includes('-')) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        setFormData(prev => ({ ...prev, code: `${prefix}-${randomNum}` }));
      }
    }
  }, [formData.name, editingWilayah]);

  useEffect(() => {
    if (!formData.name && !formData.code) { setDuplicateWarning(null); return; }
    setDuplicateWarning(checkDuplicate(formData.name, formData.code, formData.latitude, formData.longitude, editingWilayah?.id));
  }, [formData.name, formData.code, formData.latitude, formData.longitude, wilayahList]);

  const handleSearchOSM = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await res.json();
      if (data.length > 0) {
        const loc = data[0];
        setFormData(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lon, address: loc.display_name, name: loc.display_name.split(',')[0] }));
        showFormAlert('success', 'Lokasi ditemukan dan diperbarui.');
      } else {
        showFormAlert('error', 'Lokasi tidak ditemukan. Coba kata kunci lain.');
      }
    } catch {
      showFormAlert('error', 'Gagal menghubungi server peta.');
    }
  };

  const toggleStatus = async (wilayah: Wilayah) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/wilayah/${wilayah.id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showAlert(
        'success',
        'Status Berhasil Diperbarui',
        wilayah.isActive
          ? 'Wilayah berhasil dinonaktifkan.'
          : 'Wilayah berhasil diaktifkan kembali.'
      );
      fetchWilayah();
    } catch {
      showAlert('error', 'Gagal Mengubah Status', 'Status wilayah tidak berhasil diperbarui.', 'Silakan coba lagi beberapa saat.');
    }
  };

  const handleDeleteClick = (wilayah: Wilayah) => {
    setDeleteTarget(wilayah);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/wilayah/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWilayahList(prev => prev.filter(w => w.id !== deleteTarget.id));
      showAlert(
        'success',
        'Wilayah Berhasil Dihapus',
        `Wilayah "${deleteTarget.name}" telah dihapus secara permanen dari sistem.`,
        'Data tidak dapat dikembalikan setelah dihapus.'
      );
      setDeleteTarget(null);
      fetchWilayah();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Gagal menghapus wilayah.';
      showAlert('error', 'Gagal Menghapus Wilayah', msg);
    } finally {
      setDeleting(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const dupError = checkDuplicate(formData.name, formData.code, formData.latitude, formData.longitude, editingWilayah?.id);
  if (dupError) { showFormAlert('error', dupError); return; }

  // ── CEK APAKAH ADA PERUBAHAN (khusus mode edit) ──
  if (editingWilayah && originalData) {
    const hasChanged =
      formData.name !== originalData.name ||
      formData.code !== originalData.code ||
      formData.address !== originalData.address ||
      formData.latitude !== originalData.latitude ||
      formData.longitude !== originalData.longitude ||
      formData.radius !== originalData.radius ||
      formData.isActive !== originalData.isActive;

    if (!hasChanged) {
      setShowModal(false);
      showAlert('info', 'Tidak Ada Perubahan', 'Data wilayah tidak mengalami perubahan apapun.', 'Silakan ubah data terlebih dahulu sebelum menyimpan.');
      return;
    }
  }

  setSubmitting(true);
  // ... sisa kode tetap sama
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius) || 5000,
      };
      if (editingWilayah) {
        await axios.put(`${API_BASE_URL}/wilayah/${editingWilayah.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showAlert(
          'edit',
          'Wilayah Berhasil Diperbarui',
          'Perubahan konfigurasi wilayah berhasil disimpan ke dalam sistem.',
          'Informasi wilayah telah diperbarui.'
        );
      } else {
        await axios.post(`${API_BASE_URL}/wilayah`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showAlert(
          'success',
          'Wilayah Berhasil Ditambahkan',
          'Wilayah baru berhasil terdaftar dan dapat digunakan.',
          'Data wilayah telah tersimpan ke dalam sistem.'
        );
      }
      setShowModal(false);
      fetchWilayah();
    } catch {
      showFormAlert('error', 'Gagal menyimpan. Periksa koneksi atau data Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWilayah = useMemo(() => {
    return wilayahList
      .filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()) || (w.code && w.code.toLowerCase().includes(searchTerm.toLowerCase())))
      .filter(w => statusFilter === 'ALL' ? true : (statusFilter === 'ACTIVE' ? w.isActive : !w.isActive));
  }, [wilayahList, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: wilayahList.length,
    active: wilayahList.filter(w => w.isActive).length,
    inactive: wilayahList.filter(w => !w.isActive).length,
    totalArea: wilayahList.reduce((sum, w) => sum + (w.area || 0), 0)
  }), [wilayahList]);

  const alertStyles: Record<InlineAlert['type'], string> = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">

      {/* ── AlertDialog (sama persis seperti ManageSupir) ── */}
      <AlertDialog
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        description={alertState.description}
        detailText={alertState.detailText}
        onClose={closeAlert}
      />

      {/* ── Loading Alert saat submit ── */}
      <AlertDialog
        open={submitting}
        type="loading"
        title="Mohon Tunggu"
        description="Sedang memproses permintaan Anda ke server..."
        isLoading={true}
        disableBackdropClose={true}
        onClose={() => { }}
      />

      {/* ── Delete Confirm Alert ── */}
      <AlertDialog
        open={!!deleteTarget}
        type="delete"
        title="Hapus Wilayah?"
        description={
          deleteTarget
            ? `Wilayah "${deleteTarget.name}" akan dihapus secara permanen dari sistem.`
            : "Wilayah akan dihapus secara permanen dari sistem."
        }
        buttonText="Hapus"
        showCancelButton={true}
        onConfirm={async () => {
          await handleDeleteConfirm();
        }}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />

      {/* --- HEADER --- */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Data & Operasional
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">Manajemen Data Wilayah Operasional</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola status, koordinat, dan radius operasional cakupan wilayah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total', val: stats.total, icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Aktif', val: stats.active, icon: CircleCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Nonaktif', val: stats.inactive, icon: PowerOff, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total Luas', val: formatArea(stats.totalArea), icon: Map, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-sm md:text-xl font-black truncate">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingWilayah(null);
            setFormAlert(null);
            setDuplicateWarning(null);
            setFormData({ name: '', code: '', address: '', latitude: '-6.200000', longitude: '106.816666', radius: '5000', isActive: true });
            setShowModal(true);
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Tambah Wilayah
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" placeholder="Cari nama atau kode..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
            <button
              key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${statusFilter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {f === 'ALL' ? 'Semua' : f === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm overflow-x-auto border-none">
        <table className="w-full text-left border-spacing-0 min-w-[850px]">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[12px] font-bold uppercase tracking-widest">
              <th className="px-6 py-4">Nama & Lokasi</th>
              <th className="px-4 md:px-6 py-4">Radius</th>
              <th className="hidden md:table-cell px-4 md:px-6 py-4">Luas Cakupan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">Memuat data wilayah...</td></tr>
            ) : filteredWilayah.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-gray-900 text-base">{w.name}</p>
                    <p className="text-xs text-blue-600 font-mono mb-1.5 flex items-center gap-1">
                      <Hash size={10} /> {w.code}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-gray-50 w-fit px-2 py-0.5 rounded border border-gray-100">
                      <MapPin size={10} className="text-red-400" />
                      <span>{parseFloat(w.latitude).toFixed(6)}, {parseFloat(w.longitude).toFixed(6)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4">
                  <span className="text-xs md:text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    {w.radius}m
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 md:px-6 py-4">
                  <p className="text-sm font-bold text-blue-600">{formatArea(w.area || 0)}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold ${
                      w.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {w.isActive ? <Power size={12} /> : <PowerOff size={12} />}
                    {w.isActive ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => setViewingWilayah(w)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex"><Eye size={14} /></button>
                  <button onClick={() => {
                  const editData = {
                    ...w,
                    code: w.code || '',
                    address: w.address || '',
                    radius: w.radius?.toString() || '5000'
                  };

                  setEditingWilayah(w);
                  setOriginalData(editData);
                  setFormData(editData);
                    setShowModal(true);
                  }} className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex"><Edit size={14} /></button>
                  <button onClick={() => handleDeleteClick(w)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0 overflow-hidden my-auto">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">{editingWilayah ? 'Edit Wilayah' : 'Tambah Wilayah Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                <AnimatePresence>
                  {formAlert && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${alertStyles[formAlert.type]}`}
                    >
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span className="flex-1">{formAlert.message}</span>
                      <button type="button" onClick={() => setFormAlert(null)}><X size={14} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {duplicateWarning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-medium"
                    >
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span className="flex-1">{duplicateWarning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input placeholder="Cari nama lokasi/jalan di peta..." className="w-full pl-10 p-3 border rounded-xl outline-none text-sm focus:border-blue-500 transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <button type="button" onClick={handleSearchOSM} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md">Cari</button>
                </div>

                <div className="h-56 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 relative group">
                  <WilayahMap
                    markerPos={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}
                    radius={parseInt(formData.radius)}
                    onMarkerDrag={(lat: number, lng: number) => setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }))}
                  />
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-mono text-gray-600 border border-gray-200 z-[1000]">
                    Drag marker untuk koreksi presisi
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nama Wilayah</label>
                    <input
                      placeholder="Contoh: Kantor Cabang Sudirman"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full p-3 border rounded-xl outline-none text-sm focus:ring-1 transition-colors ${duplicateWarning?.includes('nama') ? 'border-yellow-400 focus:ring-yellow-400' : 'focus:ring-green-500'
                        }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Kode Wilayah</label>
                    <input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={`w-full p-3 border rounded-xl bg-gray-50 font-mono text-blue-600 font-bold text-sm transition-colors ${duplicateWarning?.includes('Kode') ? 'border-yellow-400' : ''
                        }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Radius Operasional (Meter)</label>
                    <input type="number" value={formData.radius} onChange={(e) => setFormData({ ...formData, radius: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                  </div>

                  <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                  Status Wilayah
                </label>

                <select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.value === 'true'
                    })
                  }
                  className="w-full p-3 border rounded-xl text-sm bg-white"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
                </div>

                <button
                  disabled={submitting || !!duplicateWarning}
                  className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#053f30] transition-all duration-200 active:scale-95"
                >
                  {submitting ? (
                    <><Loader2 className="animate-spin" size={18} /> Menyimpan...</>
                  ) : duplicateWarning ? (
                    <><AlertTriangle size={16} /> Selesaikan Konflik Duplikat</>
                  ) : (
                    'Simpan Wilayah'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview / Detail */}
      <AnimatePresence>
        {viewingWilayah && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Map size={20} /></div>
                  <h3 className="font-bold text-lg">Detail Wilayah</h3>
                </div>
                <button onClick={() => setViewingWilayah(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="h-64 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 shadow-inner">
                  <WilayahMap
                    markerPos={[parseFloat(viewingWilayah.latitude), parseFloat(viewingWilayah.longitude)]}
                    radius={viewingWilayah.radius || 0}
                    onMarkerDrag={() => { }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-red-500"><Globe size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Latitude</p>
                      <p className="text-sm font-mono font-bold text-gray-700">{viewingWilayah.latitude}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Globe size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Longitude</p>
                      <p className="text-sm font-mono font-bold text-gray-700">{viewingWilayah.longitude}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Nama & Kode</p>
                    <p className="font-extrabold text-gray-900 leading-tight">{viewingWilayah.name}</p>
                    <p className="text-xs font-mono text-blue-600">#{viewingWilayah.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Radius</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <Navigation size={14} /> <span>{viewingWilayah.radius} Meter</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Estimasi Luas</p>
                    <p className="font-bold text-gray-700">{formatArea(viewingWilayah.area || 0)}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                    <MapPin size={12} /> Alamat Lengkap Terdeteksi
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed italic">{viewingWilayah.address || "Alamat tidak tersedia"}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl text-blue-700">
                    <Calendar size={18} />
                    <div>
                      <p className="text-[9px] font-bold uppercase opacity-60">Terdaftar</p>
                      <p className="text-xs font-bold">{new Date(viewingWilayah.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl ${viewingWilayah.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {viewingWilayah.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                    <div>
                      <p className="text-[9px] font-bold uppercase opacity-60">Status Sekarang</p>
                      <p className="text-xs font-bold uppercase">{viewingWilayah.isActive ? 'Operasional' : 'Nonaktif'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end">
                <button onClick={() => setViewingWilayah(null)} className="px-10 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md">Tutup Detail</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}