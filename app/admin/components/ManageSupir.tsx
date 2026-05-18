"use client";

import { useState, useEffect, FormEvent, useMemo, type ReactNode } from "react";
import axios from "axios";
import {
  Plus, Edit3, Trash2, Search, Mail, Phone, X, Users,
  Loader2, CheckCircle2, XCircle, Activity, UserPlus,
  UserCog, Lock, Eye, BadgeCheck, LayoutGrid, ChevronDown
} from "lucide-react";
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import toast, { Toaster } from "react-hot-toast";

// Types
interface Supir {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt?: string;
}

interface FormData {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  isActive: boolean;
}

const API_BASE_URL = "http://localhost:5000/api/admin";
const INITIAL_FORM_DATA: FormData = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  isActive: true,
};

export default function ManageSupir() {
  const [supirList, setSupirList] = useState<Supir[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [viewingSupir, setViewingSupir] = useState<Supir | null>(null);
  const [editingSupir, setEditingSupir] = useState<Supir | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<ReactNode>(<CheckCircle2 size={24} />);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [selectedSupirForToggle, setSelectedSupirForToggle] = useState<Supir | null>(null);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);

  const fetchSupir = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/supir-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSupirList(response.data.data || []);
    } catch (error) {
      toast.error("Gagal memuat data supir");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupir();
  }, []);

  const stats = useMemo(() => ({
    total: supirList.length,
    active: supirList.filter((s) => s.isActive).length,
    inactive: supirList.filter((s) => !s.isActive).length,
  }), [supirList]);

  const filteredSupir = supirList.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const url = editingSupir ? `${API_BASE_URL}/supir/${editingSupir.id}` : `${API_BASE_URL}/add-operator`;

      if (editingSupir) {
        await axios.put(url, formData, config);
        setSuccessTitle('Data berhasil diedit');
        setSuccessDescription('Perubahan supir berhasil disimpan.');
        setSuccessIcon(<Edit3 size={24} />);
      } else {
        await axios.post(url, formData, config);
        setSuccessTitle('Data berhasil ditambahkan');
        setSuccessDescription('Supir baru berhasil ditambahkan ke sistem.');
        setSuccessIcon(<CheckCircle2 size={24} />);
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchSupir();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!pendingDeleteId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/supir/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessTitle('Data berhasil dihapus');
      setSuccessDescription('Data supir telah dihapus secara permanen.');
      setSuccessIcon(<Trash2 size={24} />);
      setShowSuccessDialog(true);
      fetchSupir();
    } catch (error: any) {
      toast.error("Gagal menghapus supir");
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
    }
  };

  const toggleStatus = async (supir: Supir): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/supir/${supir.id}`, 
        { ...supir, isActive: !supir.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Supir berhasil ${!supir.isActive ? "diaktifkan" : "dinonaktifkan"}`);
      fetchSupir();
    } catch (error) {
      toast.error("Gagal mengubah status");
    }
  };

  const openCreateModal = () => {
    setEditingSupir(null);
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  const openEditModal = (supir: Supir) => {
    setEditingSupir(supir);
    setFormData({
      fullName: supir.fullName,
      email: supir.email,
      password: "",
      phoneNumber: supir.phoneNumber || "",
      isActive: supir.isActive,
    });
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />
      
      <AlertDialog
        open={showSuccessDialog}
        title={successTitle}
        description={successDescription}
        buttonText="OK"
        icon={successIcon}
        onClose={() => setShowSuccessDialog(false)}
      />

      {/* HEADER */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Data & Operasional
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Akun Supir</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola akun akses untuk supir armada Anda
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Supir', val: stats.total, color: 'text-gray-600', bg: 'bg-gray-50', icon: Users },
          { label: 'Supir Aktif', val: stats.active, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Nonaktif', val: stats.inactive, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#064E3B] text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Supir Baru
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau email supir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-black"
            />
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Informasi Supir</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Kontak</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSupir.map((supir, idx) => (
                  <tr key={supir.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors font-bold">
                          {supir.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{supir.fullName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" /> {supir.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Phone size={12} /> {supir.phoneNumber || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => {
                          setSelectedSupirForToggle(supir);
                          setShowToggleConfirm(true);
                        }}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset transition-all ${
                        supir.isActive 
                          ? 'bg-green-100 text-green-800 ring-green-600/20' 
                          : 'bg-red-100 text-red-800 ring-red-600/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${supir.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {supir.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingSupir(supir)} className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(supir)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => { setPendingDeleteId(supir.id); setShowConfirmDialog(true); }} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VIEW DETAIL */}
      {viewingSupir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Detail Supir</h3>
              <button onClick={() => setViewingSupir(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner">
                  {viewingSupir.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-900">{viewingSupir.fullName}</h4>
                  <span className={`text-xs font-bold uppercase tracking-widest ${viewingSupir.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingSupir.isActive ? 'Akun Aktif' : 'Akun Nonaktif'}
                  </span>
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alamat Email</label>
                   <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Mail size={16} className="text-green-600"/> {viewingSupir.email}</p>
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nomor Telepon</label>
                   <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Phone size={16} className="text-green-600"/> {viewingSupir.phoneNumber || 'Tidak ada nomor'}</p>
                 </div>
              </div>
              <button onClick={() => setViewingSupir(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{editingSupir ? 'Edit Data Supir' : 'Registrasi Supir Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Nama Lengkap</label>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Masukkan nama lengkap supir"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@perusahaan.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                  {editingSupir ? "Password Baru (Opsional)" : "Password Akses"}
                </label>
                <input
                  type="password"
                  required={!editingSupir}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingSupir ? "Kosongkan jika tidak ingin mengubah" : "Minimal 6 karakter"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : (editingSupir ? 'Simpan Perubahan' : 'Daftarkan Supir')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOGS */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Data Supir?"
        description="Aksi ini akan menghapus akun supir secara permanen dari sistem."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmDialog(false); setPendingDeleteId(null); }}
      />

      <ConfirmDialog
        open={showToggleConfirm}
        title={selectedSupirForToggle?.isActive ? "Nonaktifkan Supir?" : "Aktifkan Supir?"}
        description={selectedSupirForToggle?.isActive 
          ? "Supir ini tidak akan bisa masuk ke aplikasi mobile sementara waktu." 
          : "Berikan kembali akses aplikasi mobile kepada supir ini."}
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
        onConfirm={() => {
          if (selectedSupirForToggle) toggleStatus(selectedSupirForToggle);
          setShowToggleConfirm(false);
          setSelectedSupirForToggle(null);
        }}
        onCancel={() => { setShowToggleConfirm(false); setSelectedSupirForToggle(null); }}
      />
    </div>
  );
}