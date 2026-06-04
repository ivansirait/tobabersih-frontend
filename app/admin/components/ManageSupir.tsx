"use client";

import { useState, useEffect, FormEvent, useMemo, type ReactNode } from "react";
import axios from "axios";
import {
  Plus, Edit3, Trash2, Search, Mail, Phone, X, Users,
  Loader2, CheckCircle2, XCircle, UserPlus, Lock, 
  Eye, EyeOff, User, Calendar, Power, PowerOff, ShieldCheck, Hash
} from "lucide-react";
import ConfirmDialog from './ConfirmDialog';
import AlertModal from '../../components/AlertModal';
import { useConfirm } from '../../components/ConfirmProvider';
import AlertDialog from './AlertDialog';
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [viewingSupir, setViewingSupir] = useState<Supir | null>(null);
  const [editingSupir, setEditingSupir] = useState<Supir | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirm = useConfirm();
  
  // AlertDialog state
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

  const filteredSupir = useMemo(() => {
    return supirList
      .filter(s =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phoneNumber && s.phoneNumber.includes(searchTerm))
      )
      .filter(s => statusFilter === 'ALL' ? true : (statusFilter === 'ACTIVE' ? s.isActive : !s.isActive));
  }, [supirList, searchTerm, statusFilter]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const url = editingSupir ? `${API_BASE_URL}/supir/${editingSupir.id}` : `${API_BASE_URL}/add-operator`;

      if (editingSupir) {
        await axios.put(url, formData, config);
        setSuccessTitle('Data berhasil diperbarui');
        setSuccessDescription('Perubahan profil supir berhasil disimpan ke dalam sistem.');
        setSuccessIcon(<Edit3 size={24} className="text-yellow-500" />);
      } else {
        await axios.post(url, formData, config);
        setSuccessTitle('Supir berhasil ditambahkan');
        setSuccessDescription('Akun supir baru berhasil terdaftar dan dapat digunakan.');
        setSuccessIcon(<CheckCircle2 size={24} className="text-green-500" />);
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
      setSuccessDescription('Akun supir telah dihapus secara permanen dari sistem.');
      setSuccessIcon(<Trash2 size={24} className="text-red-500" />);
      setShowSuccessDialog(true);
      fetchSupir();
    } catch (error: any) {
      toast.error("Gagal menghapus supir");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const openDeleteConfirm = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Supir?',
      description: 'Aksi ini akan menghapus unit supir secara permanen dari sistem.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
    });

    if (!ok) return;

    setPendingDeleteId(id);
    await handleDelete();
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
    setShowPassword(false);
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
    setShowPassword(false);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      <Toaster position="top-right" />
      
      <AlertDialog
        open={showSuccessDialog}
        title={successTitle}
        description={successDescription}
        buttonText="Tutup"
        icon={successIcon}
        onClose={() => setShowSuccessDialog(false)}
      />

      {/* --- HEADER SECTION --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
              Manajemen Pengguna
            </span>
            <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
              Data Akun Supir
            </h1>
            <p className="text-[#5B7078] mt-2 font-medium">
              Kelola akun akses aplikasi mobile untuk supir armada operasional.
            </p>
          </div>
        </div>
      </div>

      {/* --- STATS CARD --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Total Supir', val: stats.total, icon: Users, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Supir Aktif', val: stats.active, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Nonaktif', val: stats.inactive, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl md:text-2xl font-black truncate text-gray-900">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={18} /> Tambah Supir Baru
        </button>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, email, atau telepon supir..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
            <button 
              key={f} onClick={() => setStatusFilter(f)} 
              className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${statusFilter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {f === 'ALL' ? 'Semua' : f === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm overflow-x-auto border-none">
        <table className="w-full text-left border-spacing-0 min-w-[850px]">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="px-6 py-4 w-16">No</th>
              <th className="px-6 py-4">Profil Supir</th>
              <th className="px-6 py-4">Kontak (Email / Telp)</th>
              <th className="px-6 py-4">Status Akses</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
                    <span className="italic text-sm font-medium">Memuat data supir...</span>
                  </div>
                </td>
              </tr>
            ) : filteredSupir.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                  {searchTerm ? 'Tidak ada supir yang cocok dengan pencarian.' : 'Belum ada data supir terdaftar.'}
                </td>
              </tr>
            ) : (
              filteredSupir.map((supir, idx) => (
                <tr key={supir.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 font-bold text-[#4A6D55] shrink-0">
                        {supir.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900">{supir.fullName}</span>
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                          <Hash size={10} /> {supir.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-blue-600 font-mono font-bold">
                        <Mail size={12} className="text-blue-400" /> {supir.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 bg-gray-50 w-fit px-2 py-0.5 rounded border border-gray-100">
                        <Phone size={10} className="text-emerald-500" /> {supir.phoneNumber || 'Belum diatur'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { setSelectedSupirForToggle(supir); setShowToggleConfirm(true); }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        supir.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {supir.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                      {supir.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => setViewingSupir(supir)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex shadow-sm" title="Lihat Detail">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEditModal(supir)} className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex shadow-sm" title="Edit Data">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => openDeleteConfirm(supir.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex shadow-sm" title="Hapus Akun">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL FORM EDIT/ADD --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-lg min-h-screen sm:min-h-0 overflow-hidden my-auto flex flex-col"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-extrabold text-lg text-gray-800">
                  {editingSupir ? 'Edit Data Supir' : 'Registrasi Supir Baru'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                      Email Akses <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="email"
                        required
                        disabled={!!editingSupir}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="supir@domain.com"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                      Nomor Telepon
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="0812xxxx"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    {editingSupir ? "Ganti Password" : "Password Akses"} <span className={editingSupir ? "normal-case text-gray-400 font-normal tracking-normal" : "text-red-500"}>{editingSupir ? "(Opsional)" : "*"}</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingSupir}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingSupir ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                      className="w-full pl-11 pr-11 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {editingSupir && (
                  <label className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-[#4A6D55] bg-white border-gray-300 rounded focus:ring-[#4A6D55] cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-gray-800">Status Akun Aktif</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider">
                        Izinkan supir masuk ke aplikasi mobile.
                      </p>
                    </div>
                  </label>
                )}

                <div className="pt-4 pb-4 sm:pb-0">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-bold shadow-lg hover:bg-[#3a5643] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : (editingSupir ? 'Simpan Perubahan' : 'Daftarkan Supir')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL VIEW DETAIL --- */}
      <AnimatePresence>
        {viewingSupir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden my-auto"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck size={20} /></div>
                  <h3 className="font-extrabold text-lg text-gray-800">Detail Supir</h3>
                </div>
                <button onClick={() => setViewingSupir(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="w-20 h-20 bg-green-50 text-[#4A6D55] border border-green-100 rounded-full flex items-center justify-center text-3xl font-black shadow-sm">
                    {viewingSupir.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <h4 className="text-xl font-black text-gray-900">{viewingSupir.fullName}</h4>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-[10px] font-bold uppercase tracking-wider ${viewingSupir.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {viewingSupir.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                      {viewingSupir.isActive ? 'Status: Aktif' : 'Status: Nonaktif'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Mail size={18} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alamat Email</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingSupir.email}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-green-500"><Phone size={18} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor Telepon</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingSupir.phoneNumber || 'Belum ditambahkan'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end">
                <button onClick={() => setViewingSupir(null)} className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md text-sm">
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm handled via global ConfirmProvider */}

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