"use client";
import { useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Search, Truck, 
  Phone, X, ChevronDown, RefreshCw, 
  CheckCircle2, AlertCircle, LayoutGrid
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';
import toast, { Toaster } from 'react-hot-toast';

interface Truk {
  id: string;
  plateNumber: string;
  unitCode: string | null;
  brand: string | null;
  truckType: string | null;
  operatorId: string | null;
  operator?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
  } | null;
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
  lastLocation: string | null;
  lastPing: string | null;
  currentLat: string | null;
  currentLong: string | null;
  createdAt: string;
}

interface Supir {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
}

export default function ManageTruk() {
  const [trukList, setTrukList] = useState<Truk[]>([]);
  const [supirList, setSupirList] = useState<Supir[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTruk, setEditingTruk] = useState<Truk | null>(null);
  
  const [formData, setFormData] = useState({
    plateNumber: '',
    unitCode: '',
    brand: '',
    truckType: '',
    operatorId: '',
    status: 'AVAILABLE',
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<ReactNode>(<CheckCircle2 size={24} />);

  const fetchTruk = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/truks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrukList(res.data.data || []);
    } catch (error) {
      console.error('Error fetching truk:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupir = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/supir-list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const supirData = res.data.data || [];
      setSupirList(supirData.filter((s: any) => s.isActive));
    } catch (error) {
      console.error('Error fetching supir:', error);
    }
  };

  useEffect(() => {
    fetchTruk();
    fetchSupir();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setEditingTruk(null);
    setFormData({
      plateNumber: '',
      unitCode: '',
      brand: '',
      truckType: '',
      operatorId: '',
      status: 'AVAILABLE',
    });
    setShowModal(true);
  };

  const openEditModal = (truk: Truk) => {
    setEditingTruk(truk);
    setFormData({
      plateNumber: truk.plateNumber,
      unitCode: truk.unitCode || '',
      brand: truk.brand || '',
      truckType: truk.truckType || '',
      operatorId: truk.operatorId || '',
      status: truk.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingTruk) {
        await axios.put(`http://localhost:5000/api/admin/truks/${editingTruk.id}`, formData, config);
        toast.success('Data berhasil diedit', { icon: '✏️' });
        setSuccessTitle('Data berhasil diedit');
        setSuccessDescription('Perubahan armada berhasil disimpan.');
        setSuccessIcon(<Edit size={24} />);
      } else {
        await axios.post('http://localhost:5000/api/admin/truks', formData, config);
        toast.success('Data berhasil diperbaharui', { icon: '✅' });
        setSuccessTitle('Data berhasil ditambahkan');
        setSuccessDescription('Unit armada baru berhasil ditambahkan.');
        setSuccessIcon(<CheckCircle2 size={24} />);
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchTruk();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan data');
    }
  };

  const openDeleteConfirm = (id: string) => {
    setPendingDeleteId(id);
    setShowConfirmDialog(true);
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/truks/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

        toast.success('Data berhasil dihapus', { icon: '🗑️' });

        setSuccessTitle('Data berhasil dihapus');
        setSuccessDescription('Unit armada telah dihapus dari sistem.');
        setSuccessIcon(<Trash2 size={24} />);
        setShowSuccessDialog(true);

      fetchTruk();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menghapus');
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return { bg: 'bg-green-100', text: 'text-green-800', label: 'Tersedia' };
      case 'BUSY': return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bertugas' };
      case 'MAINTENANCE': return { bg: 'bg-red-100', text: 'text-red-800', label: 'Servis' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  const filteredTruk = trukList.filter(truk => 
    truk.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truk.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truk.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truk.truckType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truk.operator?.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Armada</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola unit armada pengangkut sampah
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Armada', val: trukList.length, color: 'text-gray-600', bg: 'bg-gray-50', icon: Truck },
          { label: 'Tersedia', val: trukList.filter(t => t.status === 'AVAILABLE').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Bertugas', val: trukList.filter(t => t.status === 'BUSY').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
          { label: 'Maintenance', val: trukList.filter(t => t.status === 'MAINTENANCE').length, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
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
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#4A6D55] text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Unit Baru
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nopol, kode, merek, tipe, atau supir..."
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-12">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Nomor Polisi / Detail</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Operator</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTruk.map((truk, idx) => {
                  const status = getStatusBadge(truk.status);
                  return (
                    <tr key={truk.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                            <Truck size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{truk.plateNumber}</p>
                            <div className="text-xs text-gray-500 mt-1 space-x-1">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-[10px] font-mono">
                                {truk.unitCode || '-'}
                              </span>
                              <span>•</span>
                              <span>{truk.brand || '-'}</span>
                              <span>•</span>
                              <span className="text-gray-400">{truk.truckType || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {truk.operator ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-gray-700">{truk.operator.fullName}</p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Phone size={10} /> {truk.operator.phoneNumber || '-'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${status.bg} ${status.text} ring-black/5`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${status.text.replace('text', 'bg')}`}></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditModal(truk)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit size={18} /></button>
                          <button onClick={() => openDeleteConfirm(truk.id)} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        title="Yakin Hapus Armada?"
        description="Aksi ini akan menghapus data armada secara permanen."
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingDeleteId(null);
        }}
      />

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{editingTruk ? 'Edit Unit Truk' : 'Registrasi Truk Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Nomor Polisi</label>
                  <input
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleInputChange}
                    placeholder="BK 1234 ABC"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition font-bold uppercase text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Kode Unit</label>
                  <input
                    name="unitCode"
                    value={formData.unitCode}
                    onChange={handleInputChange}
                    placeholder="Contoh: 07, 12"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Merek</label>
                  <input
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="Mitsubishi, Hino, Isuzu"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Jenis Armada</label>
                 <select
  name="truckType"
  value={formData.truckType}
  onChange={handleInputChange}
  required
  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition text-black appearance-none bg-white"
>
  <option value="" disabled>Pilih Jenis Armada</option>
  <optgroup label="Angkutan Besar">
    <option value="Dump Truck">Dump Truck</option>
    <option value="Arm Roll">Arm Roll (Hook Lift)</option>
    <option value="Compactor">Compactor Truck (Pemadat)</option>
  </optgroup>
  <optgroup label="Angkutan Kecil & Lingkungan">
    <option value="Truk ELF">Truk ELF (4 Roda)</option>
    <option value="Pick-Up">Pick-Up Bak</option>
    <option value="Motor Roda 3">Motor Roda 3 (Tossa)</option>
  </optgroup>
  <optgroup label="Layanan Khusus">
    <option value="Truk Tinja">Truk Tangki Tinja</option>
    <option value="Road Sweeper">Road Sweeper (Penyapu Jalan)</option>
  </optgroup>
</select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Supir</label>
                  <div className="relative">
                    <select
                      name="operatorId"
                      value={formData.operatorId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 appearance-none focus:border-green-500 outline-none transition font-medium text-black"
                    >
                      <option value="">Pilih Supir (Opsional)</option>
                      {supirList.map(supir => <option key={supir.id} value={supir.id}>{supir.fullName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Kondisi Unit</label>
                  <div className="relative">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 appearance-none focus:border-green-500 outline-none transition text-black font-medium"
                    >
                      <option value="AVAILABLE">Tersedia</option>
                      <option value="BUSY">Bertugas</option>
                      <option value="MAINTENANCE">Servis</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" className="flex-1 bg-[#4A6D55] text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95">
                  {editingTruk ? 'Simpan Perubahan' : 'Daftarkan Truk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}