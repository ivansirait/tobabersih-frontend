"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Plus, Edit3, Trash2, Search, Mail, Phone, X, Users,
  CheckCircle2, XCircle, MapPin, Eye
} from "lucide-react";
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import toast, { Toaster } from "react-hot-toast";

// Types
interface AkunMasyarakat {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  region: string | null;   // This is the "Alamat" field
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  region: string;  // "Alamat" field
  password?: string;
  role?: string;
}

const API_BASE_URL = "http://localhost:5000/api";
const INITIAL_FORM_DATA: FormData = {
  fullName: "",
  email: "",
  phoneNumber: "",
  region: ""
};

export default function ManageAkunMasyarakat() {
  const [akunList, setAkunList] = useState<AkunMasyarakat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [showModal, setShowModal] = useState<boolean>(false);
  const [viewingAkun, setViewingAkun] = useState<AkunMasyarakat | null>(null);
  const [editingAkun, setEditingAkun] = useState<AkunMasyarakat | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<any>(<CheckCircle2 size={24} />);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  const fetchAkun = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend mengembalikan { success: true, data: users }
      if (response.data.success) {
        setAkunList(response.data.data || []);
      } else {
        toast.error(response.data.message || "Gagal memuat data");
      }
    } catch (error: any) {
      console.error("API Error:", error);

      // Cek apakah error dari backend
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      }
      // Cek untuk error network
      else if (error.code === 'ECONNABORTED') {
        toast.error("Request timeout, coba lagi");
      }
      // Error tidak terkoneksi ke backend
      else if (!error.response) {
        toast.error("Tidak dapat terhubung ke server");
      }
      // Error lainnya
      else {
        toast.error("Gagal memuat data akun masyarakat");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAkun();
  }, []);

  const stats = useMemo(() => ({
    total: akunList.length,
    active: akunList.filter((a) => a.isActive).length,
    inactive: akunList.filter((a) => !a.isActive).length,
  }), [akunList]);

  const filteredAkun = akunList.filter(a =>
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: any): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Prepare data sesuai backend requirements
      const dataToSend: any = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || null,
      };

      // Tambahkan password hanya untuk create (tidak untuk update)
      if (!editingAkun) {
        dataToSend.password = "123456"; // Password default sesuai backend
        dataToSend.role = "WARGA";
      }

      let response;
      if (editingAkun) {
        response = await axios.put(`${API_BASE_URL}/users/${editingAkun.id}`, dataToSend, config);
        console.log("Update response:", response.data);

        // Backend mengembalikan { success: true, data: updatedUser }
        if (response.data.success) {
          setSuccessTitle('Data berhasil diedit');
          setSuccessDescription('Perubahan akun berhasil disimpan.');
          setSuccessIcon(<Edit3 size={24} />);
        }
      } else {
        response = await axios.post(`${API_BASE_URL}/users`, dataToSend, config);
        console.log("Create response:", response.data);

        // Backend mengembalikan { success: true, data: createdUser }
        if (response.data.success) {
          setSuccessTitle('Data berhasil ditambahkan');
          setSuccessDescription('Akun masyarakat baru berhasil ditambahkan ke sistem.');
          setSuccessIcon(<CheckCircle2 size={24} />);
        }
      }

      // Check jika response tidak success meskipun status 200
      if (!response.data.success) {
        throw new Error(response.data.message || 'Gagal menyimpan data');
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchAkun();
    } catch (error: any) {
      console.error("Submit error:", error);

      // Cek apakah error dari backend validation
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      }
      // Cek untuk error email duplikat
      else if (error.response?.status === 400 && error.response?.data?.message?.includes("Email")) {
        toast.error("Email sudah terdaftar");
      }
      // Error network atau timeout
      else if (error.code === 'ECONNABORTED') {
        toast.error("Request timeout, coba lagi");
      }
      // Error lainnya
      else {
        toast.error("Gagal menyimpan data");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!pendingDeleteId) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_BASE_URL}/users/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend mengembalikan { success: true, data: deletedUser, message: "Berhasil dihapus" }
      if (response.data.success) {
        setSuccessTitle('Data berhasil dihapus');
        setSuccessDescription(response.data.message || 'Akun masyarakat telah dihapus secara permanen.');
        setSuccessIcon(<Trash2 size={24} />);
        setShowSuccessDialog(true);
        fetchAkun();
      } else {
        throw new Error(response.data.message || 'Gagal menghapus akun');
      }
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.response?.data?.message || "Gagal menghapus akun");
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingAkun(null);
    // Reset form dengan password kosong untuk create mode
    setFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      region: ""
    });
    setShowModal(true);
  };

  const openEditModal = (akun: AkunMasyarakat) => {
    setEditingAkun(akun);
    setFormData({
      fullName: akun.fullName,
      email: akun.email,
      phoneNumber: akun.phoneNumber || "",
      region: akun.region || ""
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
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Akun Masyarakat</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola akun akses untuk anggota masyarakat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Akun', val: stats.total, color: 'text-gray-600', bg: 'bg-gray-50', icon: Users },
          { label: 'Akun Aktif', val: stats.active, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Nonaktif', val: stats.inactive, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-[24px] ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-medium text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[24px] bg-[#064E3B] text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Akun Baru
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, email, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-[24px] focus:ring-2 focus:ring-green-500/20 outline-none text-black"
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
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Informasi Akun</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Kontak</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Alamat</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAkun.map((akun, idx) => (
                  <tr key={akun.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors font-medium">
                          {akun.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-none">{akun.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase tracking-tighter">ID: {akun.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" /> {akun.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Phone size={12} /> {akun.phoneNumber || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-gray-600">{akun.region || 'Tidak ada alamat'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset transition-all ${
                        akun.isActive
                          ? 'bg-green-100 text-green-800 ring-green-600/20'
                          : 'bg-red-100 text-red-800 ring-red-600/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${akun.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {akun.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingAkun(akun)} className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(akun)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => { setPendingDeleteId(akun.id); setShowConfirmDialog(true); }} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
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
      {viewingAkun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-medium text-gray-900">Detail Akun Masyarakat</h3>
              <button onClick={() => setViewingAkun(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-green-100 text-green-700 rounded-[24px] flex items-center justify-center text-3xl font-black shadow-inner">
                  {viewingAkun.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-900">{viewingAkun.fullName}</h4>
                  <span className={`text-xs font-medium uppercase tracking-widest ${viewingAkun.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    Akun {viewingAkun.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                 <div>
                   <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Alamat Email</label>
                   <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Mail size={16} className="text-green-600"/> {viewingAkun.email}</p>
                 </div>
                 <div>
                   <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Nomor Telepon</label>
                   <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Phone size={16} className="text-green-600"/> {viewingAkun.phoneNumber || 'Tidak ada nomor'}</p>
                 </div>
                 <div>
                   <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Alamat</label>
                   <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><MapPin size={16} className="text-green-600"/> {viewingAkun.region || 'Tidak ada alamat'}</p>
                 </div>
                 <div>
                   <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">ID Akun</label>
                   <p className="text-gray-700 font-mono text-sm">{viewingAkun.id}</p>
                 </div>
              </div>
              <button onClick={() => setViewingAkun(null)} className="w-full py-4 bg-gray-900 text-white rounded-[24px] font-medium hover:bg-gray-800 transition-all">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-medium text-gray-900">{editingAkun ? 'Edit Akun Masyarakat' : 'Tambah Akun Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Nama Lengkap</label>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Alamat/Wilayah</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Contoh: Balige, Laguboti"
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all">Batal</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-[24px] font-medium hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : (editingAkun ? 'Simpan Perubahan' : 'Daftarkan Akun')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Akun Masyarakat?"
        description="Aksi ini akan menghapus akun masyarakat secara permanen dari sistem."
        confirmText={deleting ? "Menghapus..." : "Ya, Hapus"}
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmDialog(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}