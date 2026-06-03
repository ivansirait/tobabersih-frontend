"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Search, UserPlus, 
  Mail, Phone, User, X, Eye, EyeOff, 
  Lock, Loader2, Calendar, Power, PowerOff,
  Hash
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Kabid {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function KelolaKabid() {
  const [kabidList, setKabidList] = useState<Kabid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingKabid, setEditingKabid] = useState<Kabid | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    phoneNumber: '',
    newPassword: '',
    isActive: true
  });

  // Fetch data
  const fetchKabid = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/admin/kabid`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setKabidList(res.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengambil data Kepala Bidang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKabid();
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Open modal for create
  const openCreateModal = () => {
    setEditingKabid(null);
    setFormData({
      email: '', fullName: '', password: '', phoneNumber: '', newPassword: '', isActive: true
    });
    setShowPassword(false);
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (kabid: Kabid) => {
    setEditingKabid(kabid);
    setFormData({
      email: kabid.email,
      fullName: kabid.fullName,
      password: '',
      phoneNumber: kabid.phoneNumber || '',
      newPassword: '',
      isActive: kabid.isActive
    });
    setShowPassword(false);
    setShowModal(true);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

      if (editingKabid) {
        await axios.put(
          `${API_BASE_URL}/admin/kabid/${editingKabid.id}`,
          {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            isActive: formData.isActive,
            newPassword: formData.newPassword || undefined
          },
          config
        );
        toast.success('Data Kepala Bidang diperbarui!');
      } else {
        await axios.post(
          `${API_BASE_URL}/admin/kabid`,
          {
            email: formData.email,
            fullName: formData.fullName,
            password: formData.password,
            phoneNumber: formData.phoneNumber
          },
          config
        );
        toast.success('Akun Kepala Bidang berhasil ditambahkan!');
      }

      setShowModal(false);
      fetchKabid();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete (nonaktifkan)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus/Nonaktifkan akun ${name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/admin/kabid/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      toast.success('Akun Kepala Bidang dinonaktifkan!');
      fetchKabid();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menonaktifkan akun');
    }
  };

  // Toggle status cepat
  const toggleStatus = async (kabid: Kabid) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/admin/kabid/${kabid.id}`,
        { isActive: !kabid.isActive },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      toast.success(`Status ${kabid.fullName} diperbarui`);
      fetchKabid();
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  // Filter berdasarkan search & status
  const filteredKabid = useMemo(() => {
    return kabidList
      .filter(kabid =>
        kabid.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kabid.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (kabid.phoneNumber && kabid.phoneNumber.includes(searchTerm))
      )
      .filter(kabid => statusFilter === 'ALL' ? true : (statusFilter === 'ACTIVE' ? kabid.isActive : !kabid.isActive));
  }, [kabidList, searchTerm, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      <Toaster position="top-right" />
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
              Manajemen Pengguna
            </span>
            <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
              Data Kepala Bidang
            </h1>
            <p className="text-[#5B7078] mt-2 font-medium">
              Kelola akses monitoring, laporan kebersihan, dan akun Kepala Bidang.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={18} /> Tambah Kepala Bidang
        </button>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, email, atau telepon..."
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
              <th className="px-6 py-4">Informasi Pengguna</th>
              <th className="px-6 py-4">Kontak (Email / Telp)</th>
              <th className="hidden md:table-cell px-6 py-4">Tanggal Daftar</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
                    <span className="italic text-sm font-medium">Memuat data pengguna...</span>
                  </div>
                </td>
              </tr>
            ) : filteredKabid.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                  {searchTerm ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data Kepala Bidang.'}
                </td>
              </tr>
            ) : (
              filteredKabid.map((kabid, index) => (
                <tr key={kabid.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-400 font-bold">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 shrink-0">
                        <User size={18} className="text-[#4A6D55]" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900">{kabid.fullName}</span>
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                          <Hash size={10} /> {kabid.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-blue-600 font-mono font-bold">
                        <Mail size={12} className="text-blue-400" /> {kabid.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 bg-gray-50 w-fit px-2 py-0.5 rounded border border-gray-100">
                        <Phone size={10} className="text-emerald-500" /> {kabid.phoneNumber || 'Belum diatur'}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg w-fit border border-gray-100">
                      <Calendar size={12} className="text-gray-400" />
                      {new Date(kabid.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(kabid)} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        kabid.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {kabid.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                      {kabid.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(kabid)}
                      className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex shadow-sm"
                      title="Edit Data"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(kabid.id, kabid.fullName)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex shadow-sm"
                      title="Hapus / Nonaktifkan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL FORM --- */}
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
                  {editingKabid ? 'Edit Data Kepala Bidang' : 'Registrasi Kepala Bidang'}
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
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Alamat Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={!!editingKabid}
                      placeholder="kabid@domain.com"
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
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="08123456789"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                {!editingKabid ? (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                      Password Sementara <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Minimal 6 karakter..."
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
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                      Ganti Password <span className="text-gray-400 normal-case tracking-normal font-normal">(Opsional)</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Ketik password baru jika ingin diubah..."
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
                )}

                {editingKabid && (
                  <label className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-[#4A6D55] bg-white border-gray-300 rounded focus:ring-[#4A6D55] cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-gray-800">Status Akun Aktif</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider">
                        Izinkan pengguna untuk login ke sistem
                      </p>
                    </div>
                  </label>
                )}

                <div className="pt-4 pb-4 sm:pb-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-green-700 text-white rounded-2xl font-bold shadow-lg hover:bg-green-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : (editingKabid ? 'Simpan Perubahan' : 'Simpan Akun Baru')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}