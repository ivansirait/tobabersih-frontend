"use client";

import { useState, useEffect, ReactNode, useMemo } from 'react';
import axios from 'axios';
import { 
  Plus, Edit3, Trash2, Search, Mail, Phone, X, Users,
  CheckCircle2, XCircle, Eye, Lock,
  BadgeCheck, UserCog
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';

const API_BASE_URL = '/api';

interface Kabid {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
}

interface FormData {
  email: string;
  fullName: string;
  password: string;
  phoneNumber: string;
  newPassword: string;
  isActive: boolean;
}

export default function KelolaKabid() {
  const [kabidList, setKabidList] = useState<Kabid[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingKabid, setViewingKabid] = useState<Kabid | null>(null);
  const [editingKabid, setEditingKabid] = useState<Kabid | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<ReactNode>(<CheckCircle2 size={24} />);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Aksi Gagal');
  const [errorDescription, setErrorDescription] = useState('Terjadi kesalahan. Silakan coba lagi.');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    password: '',
    phoneNumber: '',
    newPassword: '',
    isActive: true
  });

  const showErrorAlert = (message: string, title = 'Aksi Gagal') => {
    setErrorTitle(title);
    setErrorDescription(message || 'Terjadi kesalahan. Silakan coba lagi.');
    setShowErrorDialog(true);
  };

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
      setKabidList(res.data.data);
    } catch (error: any) {
      console.error('Error fetching kabid:', error);
      toast.error(error.response?.data?.error || 'Gagal mengambil data Kepala Bidang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKabid();
  }, []);

  const stats = useMemo(() => ({
    total: kabidList.length,
    active: kabidList.filter((k) => k.isActive).length,
    inactive: kabidList.filter((k) => !k.isActive).length,
  }), [kabidList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // ✅ Nomor telepon: hanya angka, max 13 digit
    if (name === 'phoneNumber') {
      const onlyDigits = value.replace(/\D/g, '').slice(0, 13);
      setFormData({ ...formData, phoneNumber: onlyDigits });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const openCreateModal = () => {
    setEditingKabid(null);
    setShowPassword(false);
    // ✅ Reset penuh — pastikan tidak ada sisa nilai dari sesi edit sebelumnya
    setFormData({
      email: '',
      fullName: '',
      password: '',
      phoneNumber: '',
      newPassword: '',
      isActive: true
    });
    setShowModal(true);
  };

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
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // ✅ Validasi semua field wajib saat CREATE
    if (!editingKabid) {
      if (!formData.fullName.trim()) {
        showErrorAlert('Nama lengkap wajib diisi.', 'Form Tidak Lengkap');
        setSubmitting(false);
        return;
      }
      if (!formData.email.trim()) {
        showErrorAlert('Email wajib diisi.', 'Form Tidak Lengkap');
        setSubmitting(false);
        return;
      }
      if (!formData.phoneNumber.trim()) {
        showErrorAlert('Nomor telepon wajib diisi.', 'Form Tidak Lengkap');
        setSubmitting(false);
        return;
      }
      if (formData.phoneNumber.length < 10 || formData.phoneNumber.length > 13) {
        showErrorAlert('Nomor telepon harus 10–13 digit angka.', 'Format Tidak Valid');
        setSubmitting(false);
        return;
      }
      if (!formData.phoneNumber.startsWith('0') && !formData.phoneNumber.startsWith('62')) {
        showErrorAlert('Nomor telepon harus diawali 0 atau 62.', 'Format Tidak Valid');
        setSubmitting(false);
        return;
      }
      if (!formData.password.trim()) {
        showErrorAlert('Password wajib diisi.', 'Form Tidak Lengkap');
        setSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        showErrorAlert('Password minimal 6 karakter.', 'Form Tidak Lengkap');
        setSubmitting(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      if (editingKabid) {
        // UPDATE
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
        setSuccessTitle('Data berhasil diedit');
        setSuccessDescription('Perubahan Kepala Bidang berhasil disimpan.');
        setSuccessIcon(<Edit3 size={24} />);
      } else {
        // CREATE
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
        setSuccessTitle('Data berhasil ditambahkan');
        setSuccessDescription('Akun Kepala Bidang baru berhasil ditambahkan ke sistem.');
        setSuccessIcon(<CheckCircle2 size={24} />);
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchKabid();
      resetForm();
    } catch (error: any) {
      console.error('Error saving kabid:', error);
      showErrorAlert(
        error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data',
        'Gagal Menyimpan'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Handle delete — alert sudah diperbaiki menjadi "dihapus"
  const handleDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE_URL}/admin/kabid/${pendingDeleteId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // ✅ Teks diperbaiki: "dihapus" bukan "dinonaktifkan"
        setSuccessTitle('Akun Berhasil Dihapus');
        setSuccessDescription(`Akun Kepala Bidang "${pendingDeleteName}" telah dihapus dari sistem.`);
        setSuccessIcon(<Trash2 size={24} />);
        setShowSuccessDialog(true);
        fetchKabid();
      } else {
        throw new Error(response.data.message);
      }
      
    } catch (error: any) {
      console.error('Error delete kabid:', error);
      showErrorAlert(
        error.response?.data?.message || 'Gagal menghapus akun', 
        'Operasi Gagal'
      );
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setPendingDeleteName('');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      password: '',
      phoneNumber: '',
      newPassword: '',
      isActive: true
    });
    setEditingKabid(null);
    setShowPassword(false);
  };

  const filteredKabid = kabidList.filter(kabid =>
    kabid.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kabid.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (kabid.phoneNumber && kabid.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />
      
        <AlertDialog
          open={showSuccessDialog}
          title={successTitle}
          description={successDescription}
          buttonText="OK"
          type="success"
          onClose={() => setShowSuccessDialog(false)}
        />

      {/* Error Dialog */}
      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{errorTitle}</h3>
                  <p className="text-sm text-slate-500 mt-1">Operasi tidak dapat dilanjutkan.</p>
                </div>
              </div>
              <button
                onClick={() => setShowErrorDialog(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-600">{errorDescription}</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowErrorDialog(false)}
                className="rounded-full bg-rose-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/10 transition hover:bg-rose-700"
              >
                Oke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Manajemen User
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Kepala Bidang</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola akun akses untuk Kepala Bidang Kebersihan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Kepala Bidang', val: stats.total, color: 'text-gray-600', bg: 'bg-gray-50', icon: Users },
          { label: 'Akun Aktif', val: stats.active, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
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

      {/* Tombol Tambah */}
      <div className="flex justify-end mt-4">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#064E3B] text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Kepala Bidang
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, email, atau telepon..."
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
        ) : filteredKabid.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              {searchTerm ? 'Tidak ada data yang cocok' : 'Belum ada data Kepala Bidang'}
            </p>
            {!searchTerm && (
              <button
                onClick={openCreateModal}
                className="mt-4 text-green-600 font-medium hover:text-green-700"
              >
                + Tambah Kepala Bidang sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Informasi Kepala Bidang</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Kontak</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal Daftar</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredKabid.map((kabid, index) => (
                  <tr key={kabid.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors font-bold">
                          {kabid.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{kabid.fullName}</p>
                          <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <BadgeCheck size={12} className="text-purple-500" />
                            Kepala Bidang
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" /> {kabid.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Phone size={12} /> {kabid.phoneNumber || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${
                          kabid.isActive 
                            ? 'bg-green-100 text-green-800 ring-green-600/20' 
                            : 'bg-red-100 text-red-800 ring-red-600/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${kabid.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {kabid.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(kabid.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setViewingKabid(kabid)} 
                          className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openEditModal(kabid)} 
                          className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"
                          title="Edit"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setPendingDeleteId(kabid.id);
                            setPendingDeleteName(kabid.fullName);
                            setShowConfirmDialog(true);
                          }} 
                          className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"
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
        )}
      </div>

      {/* MODAL VIEW DETAIL */}
      {viewingKabid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Detail Kepala Bidang</h3>
              <button onClick={() => setViewingKabid(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner">
                  {viewingKabid.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-900">{viewingKabid.fullName}</h4>
                  <span className={`text-xs font-bold uppercase tracking-widest ${viewingKabid.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingKabid.isActive ? 'Akun Aktif' : 'Akun Nonaktif'}
                  </span>
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alamat Email</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1">
                    <Mail size={16} className="text-purple-600" /> {viewingKabid.email}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nomor Telepon</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1">
                    <Phone size={16} className="text-purple-600" /> {viewingKabid.phoneNumber || 'Tidak ada nomor'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Registrasi</label>
                  <p className="text-gray-700 font-medium mt-1">
                    {new Date(viewingKabid.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1">
                    <UserCog size={16} className="text-purple-600" /> Kepala Bidang Kebersihan
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingKabid(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM CREATE / EDIT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">
                {editingKabid ? 'Edit Data Kepala Bidang' : 'Tambah Kepala Bidang Baru'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!!editingKabid}
                    placeholder="kabid@cleancity.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                {/* Nomor Telepon */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="08123456789"
                    inputMode="numeric"
                    maxLength={13}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                  />
                  <p className="text-[10px] text-gray-400 ml-1 mt-1">
                    Angka saja, 10–13 digit, diawali 0 atau 62
                  </p>
                </div>
              </div>

              {/* Password — hanya saat CREATE */}
              {!editingKabid && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <XCircle size={18} /> : <Lock size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Baru — hanya saat EDIT */}
              {editingKabid && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                    Password Baru <span className="text-gray-400">(Opsional)</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Isi jika ingin mengganti password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                  />
                </div>
              )}

              {/* Status Akun — hanya saat EDIT */}
              {editingKabid && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                    Status Akun
                  </label>
                  <select
                    name="isActive"
                    value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black bg-white"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </div>
              )}

              {/* Info wajib isi — hanya saat CREATE */}
              {!editingKabid && (
                <p className="text-xs text-gray-400 ml-1">
                  <span className="text-red-500">*</span> Semua field wajib diisi
                </p>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }} 
                  className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : (editingKabid ? 'Simpan Perubahan' : 'Tambah Kepala Bidang')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Data Kepala Bidang?"
        description={`Aksi ini akan menghapus akun Kepala Bidang "${pendingDeleteName}" secara permanen dari sistem.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => { 
          setShowConfirmDialog(false); 
          setPendingDeleteId(null);
          setPendingDeleteName('');
        }}
      />
    </div>
  );
}