"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Search, MapPin, User, Truck, Clock,
  AlertCircle, X, CheckCircle2, RefreshCw,
  FileText, Trash2, ImageIcon,
  ArrowRightCircle, Loader, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
interface Laporan {
  id: string;
  reportNumber?: string;
  district: string;
  location?: string;
  description: string;
  status: string;
  createdAt?: string;
  photoUrl?: string | null;
  phoneNumber?: string;
}

interface Driver {
  id: string;
  fullName: string;
  phoneNumber?: string;
}

interface Truck {
  id: string;
  plateNumber: string;
}

export default function ManageLaporan() {
  // --- State ---
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedLaporan, setSelectedLaporan] = useState<Laporan | null>(null);
  
  const [supirList, setSupirList] = useState<Driver[]>([]);
  const [trukList, setTrukList] = useState<Truck[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const [assignmentByReportId, setAssignmentByReportId] = useState<Record<string, any>>({});

  // ✅ NEW: Status Update Modal State
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [selectedLaporanForStatusUpdate, setSelectedLaporanForStatusUpdate] = useState<Laporan | null>(null);
  const [statusFormData, setStatusFormData] = useState({
    status: '',
    adminNotes: '',
  });
  const [statusLoading, setStatusLoading] = useState(false);

  const [formData, setFormData] = useState({
    reportId: '',
    driverId: '',
    truckId: '',
    scheduledAt: '',
    notes: '',
  });

  // --- API Calls ---
  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/laporan', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allReports = res.data.data || [];
      const activeReports = allReports.filter((item: Laporan) => 
        item.status !== 'SELESAI' && item.status !== 'DIPROSES'
      );
      setLaporanList(activeReports);
    } catch (error) {
      toast.error('Gagal memuat laporan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [supirRes, trukRes] = await Promise.all([
        axios.get('http://localhost:5000/api/penugasan/supir', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/penugasan/truk', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSupirList(supirRes.data.data || []);
      setTrukList(trukRes.data.data || []);
    } catch (error) {
      console.error('Gagal load dropdown', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/penugasan?type=ADUAN', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignments = res.data.data || [];
      const map: Record<string, any> = {};
      assignments.forEach((item: any) => {
        const reportId = item?.report?.id;
        if (reportId) {
          map[reportId] = {
            id: item.id,
            taskNumber: item.taskNumber,
            status: item.status,
            driverName: item.driver?.fullName,
            truckPlate: item.truck?.plateNumber,
          };
        }
      });
      setAssignmentByReportId(map);
    } catch (error) {
      console.error('Gagal load assignments', error);
    }
  };

  useEffect(() => {
    fetchLaporan();
    fetchDropdownData();
    fetchAssignments();
  }, []);

  const filteredLaporan = useMemo(() => {
    return laporanList
      .filter(item =>
        item.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reportNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aAssigned = Boolean(assignmentByReportId[a.id]);
        const bAssigned = Boolean(assignmentByReportId[b.id]);
        if (aAssigned === bAssigned) return 0;
        return aAssigned ? 1 : -1;
      });
  }, [laporanList, searchTerm, assignmentByReportId]);

  const handleVerify = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Yakin ingin ${action === 'approve' ? 'menerima' : 'menolak'} laporan ini?`)) return;
    try {
      const token = localStorage.getItem('token');
      const newStatus = action === 'approve' ? 'DITERIMA' : 'DITOLAK';
      await axios.patch(`http://localhost:5000/api/laporan/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Laporan ${action === 'approve' ? 'diterima' : 'ditolak'}`);
      fetchLaporan();
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal verifikasi');
    }
  };

  // ✅ NEW: Handle Status Update dengan Email Notification
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLaporanForStatusUpdate) return;
    if (!statusFormData.status) {
      toast.error('Silakan pilih status');
      return;
    }

    setStatusLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `http://localhost:5000/api/admin/laporan/${selectedLaporanForStatusUpdate.id}/status`,
        {
          status: statusFormData.status,
          adminNotes: statusFormData.adminNotes,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success || response.data) {
        toast.success(`✅ Status updated - Email notifikasi terkirim ke: ${selectedLaporanForStatusUpdate.phoneNumber || 'pelapor'}`);
        
        fetchLaporan();
        fetchAssignments();
        
        setShowStatusUpdateModal(false);
        setStatusFormData({ status: '', adminNotes: '' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal update status');
      console.error('Status update error:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const openConversionModal = (laporan: Laporan) => {
    if (assignmentByReportId[laporan.id]) {
      toast.error('Laporan ini sudah ditugaskan!');
      return;
    }
    setSelectedLaporan(laporan);
    setFormData({
      reportId: laporan.id,
      driverId: '',
      truckId: '',
      scheduledAt: '',
      notes: '',
    });
    setShowConversionModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.driverId || !formData.scheduledAt) {
      toast.error('Driver dan Waktu Pelaksanaan wajib diisi!');
      return;
    }

    try {
      setLoadingSubmit(true);
      const token = localStorage.getItem('token');
      
      const payload = {
        reportId: formData.reportId,
        driverId: formData.driverId,
        truckId: formData.truckId || null,
        scheduledAt: formData.scheduledAt,
        location: selectedLaporan?.location || selectedLaporan?.description,
        district: selectedLaporan?.district,
        description: selectedLaporan?.description,
        notes: formData.notes,
        type: 'ADUAN'
      };

      await axios.post('http://localhost:5000/api/penugasan/aduan', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await axios.patch(`http://localhost:5000/api/laporan/${formData.reportId}`,
        { status: 'DIPROSES' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Laporan berhasil dikonversi menjadi tugas aduan!');
      setShowConversionModal(false);
      fetchLaporan();
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuat penugasan');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus laporan ini permanen?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/laporan/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Laporan dihapus');
      fetchLaporan();
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal hapus');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans antialiased pb-20">
      <Toaster position="top-right" />
      
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-200">
              <AlertCircle className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Laporan Masuk</h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-0.5">
                <span className="flex items-center gap-1"><FileText size={14} /> {laporanList.length} Total</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1"><Clock size={14} /> Menunggu Tindakan</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { fetchLaporan(); fetchAssignments(); }}
            className="p-3 bg-white hover:bg-orange-50 text-slate-500 hover:text-orange-600 rounded-xl transition-all border border-slate-100"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10">
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 rounded-2xl p-5 flex gap-4">
          <div className="bg-orange-100 text-orange-600 p-2.5 rounded-lg">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Konversi Laporan ke Tugas Aduan</h3>
            <p className="text-sm text-slate-600">Terima laporan, lalu buat tugas aduan untuk driver. Data lokasi dan deskripsi akan terisi otomatis.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari wilayah, deskripsi, atau ID..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Laporan</th>
                  <th className="px-4 py-4">Foto</th>
                  <th className="px-6 py-4">Lokasi & Wilayah</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
<tbody className="divide-y divide-slate-100">
  {loading ? (
    <tr>
      <td colSpan={7} className="py-20 text-center">
        <Loader className="animate-spin mx-auto text-orange-500" size={32} />
        <p className="mt-2 text-slate-400">Memuat data...</p>
      </td>
    </tr>
  ) : filteredLaporan.length === 0 ? (
    <tr>
      <td colSpan={7} className="py-20 text-center text-slate-500">
        Tidak ada laporan yang perlu ditindaklanjuti
      </td>
    </tr>
  ) : (
    filteredLaporan.map((laporan) => {
      const isAssigned = Boolean(assignmentByReportId[laporan.id]);

      return (
        <tr key={laporan.id} className="hover:bg-slate-50/50 transition">
          <td className="px-6 py-4">
            <div className="font-black text-sm">
              #{laporan.reportNumber || laporan.id.slice(0, 8)}
            </div>
            {isAssigned && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                Sudah Ditugaskan
              </span>
            )}
          </td>

          <td className="px-4 py-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              {laporan.photoUrl ? (
                <img
                  src={laporan.photoUrl}
                  alt="foto"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <ImageIcon size={18} className="text-slate-400" />
              )}
            </div>
          </td>

          <td className="px-6 py-4">
            <div className="flex gap-2">
              <MapPin size={16} className="text-slate-400 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{laporan.district}</p>
                <p className="text-xs text-slate-500">
                  {laporan.location || '-'}
                </p>
              </div>
            </div>
          </td>

          <td className="px-6 py-4 max-w-xs truncate">
            {laporan.description}
          </td>

          <td className="px-6 py-4 text-xs">
            {formatDate(laporan.createdAt)}
          </td>

          <td className="px-6 py-4">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                laporan.status === 'DITERIMA'
                  ? 'bg-green-100 text-green-700'
                  : laporan.status === 'DITOLAK'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {laporan.status === 'DITERIMA' && <CheckCircle2 size={12} />}
              {laporan.status === 'DITOLAK' && <X size={12} />}
              {laporan.status === 'PENDING' && <AlertCircle size={12} />}
              {laporan.status}
            </span>
          </td>

          <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-2">
              {laporan.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleVerify(laporan.id, 'approve')}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100"
                  >
                    Terima
                  </button>
                  <button
                    onClick={() => handleVerify(laporan.id, 'reject')}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100"
                  >
                    Tolak
                  </button>
                </>
              )}

              {/* ✅ NEW: Update Status Button */}
              {laporan.status !== 'SELESAI' && laporan.status !== 'PENDING' && (
                <button
                  onClick={() => {
                    setSelectedLaporanForStatusUpdate(laporan);
                    setShowStatusUpdateModal(true);
                  }}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-600"
                >
                  <RefreshCw size={14} /> Update Status
                </button>
              )}

              {laporan.status === 'DITERIMA' && !isAssigned && (
                <button
                  onClick={() => openConversionModal(laporan)}
                  className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <ArrowRightCircle size={14} /> Tugas Aduan
                </button>
              )}

              {laporan.status === 'DITERIMA' && isAssigned && (
                <span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                  Telah Ditugaskan
                </span>
              )}

              <button
                onClick={() => handleDelete(laporan.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    })
  )}
</tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {filteredLaporan.map(laporan => (
              <div key={laporan.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold">#{laporan.reportNumber || laporan.id.slice(0,6)}</span>
                  <span className="text-xs text-slate-500">{formatDate(laporan.createdAt)}</span>
                </div>
                <p className="font-medium">{laporan.district}</p>
                <p className="text-sm line-clamp-2">{laporan.description}</p>
                <div className="flex gap-2 justify-end">
                  {laporan.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleVerify(laporan.id, 'approve')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs">Terima</button>
                      <button onClick={() => handleVerify(laporan.id, 'reject')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs">Tolak</button>
                    </>
                  )}
                  {laporan.status === 'DITERIMA' && !assignmentByReportId[laporan.id] && (
                    <button onClick={() => openConversionModal(laporan)} className="px-4 py-1 bg-orange-500 text-white rounded-lg text-xs">Buat Tugas</button>
                  )}
                  <button onClick={() => handleDelete(laporan.id)} className="p-1 text-red-500">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showConversionModal && selectedLaporan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">Buat Tugas Aduan</h3>
              <button onClick={() => setShowConversionModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleConversionSubmit} className="p-5 space-y-4">
              <div className="bg-orange-50 p-3 rounded-xl">
                <p className="text-xs text-orange-700">Dari laporan: {selectedLaporan.district}</p>
                <p className="text-sm font-medium">{selectedLaporan.description}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Lokasi Kerja</label>
                <input type="text" value={selectedLaporan.location || selectedLaporan.description} disabled className="w-full mt-1 p-2 bg-slate-100 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Driver</label>
                  <select name="driverId" value={formData.driverId} onChange={handleInputChange} required className="w-full mt-1 p-2 border rounded-lg">
                    <option value="">Pilih Driver</option>
                    {supirList.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Truk</label>
                  <select name="truckId" value={formData.truckId} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-lg">
                    <option value="">Pilih Truk</option>
                    {trukList.map(t => <option key={t.id} value={t.id}>{t.plateNumber}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Waktu Pelaksanaan</label>
                <input type="datetime-local" name="scheduledAt" value={formData.scheduledAt} onChange={handleInputChange} required className="w-full mt-1 p-2 border rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-bold">Instruksi Khusus</label>
                <textarea name="notes" rows={3} value={formData.notes} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-lg" placeholder="Petunjuk untuk driver..." />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="submit" disabled={loadingSubmit} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold">
                  {loadingSubmit ? <Loader size={16} className="animate-spin inline" /> : 'Konfirmasi Tugas'}
                </button>
                <button type="button" onClick={() => setShowConversionModal(false)} className="flex-1 border py-2 rounded-xl">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ NEW: Status Update Modal */}
      {showStatusUpdateModal && selectedLaporanForStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">📬 Update Status Laporan</h3>
              <button 
                onClick={() => {
                  setShowStatusUpdateModal(false);
                  setStatusFormData({ status: '', adminNotes: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="p-5 space-y-4">
              {/* Display Report Info */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold">📋 Laporan</p>
                <p className="text-sm font-medium">{selectedLaporanForStatusUpdate.district}</p>
                <p className="text-xs text-gray-600 mt-2">
                  📧 {selectedLaporanForStatusUpdate.phoneNumber || 'Kontak tidak tersedia'}
                </p>
              </div>

              {/* Status Dropdown */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Status Baru</label>
                <select
                  value={statusFormData.status}
                  onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                  required
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Pilih Status --</option>
                  <option value="DITINDAKLANJUTI">🔍 Ditindaklanjuti</option>
                  <option value="DIPROSES">⚙️ Diproses</option>
                  <option value="SELESAI">✅ Selesai</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Catatan Admin (Opsional)</label>
                <textarea
                  value={statusFormData.adminNotes}
                  onChange={(e) => setStatusFormData({ ...statusFormData, adminNotes: e.target.value })}
                  placeholder="Catatan untuk pelapor..."
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                />
              </div>

              {/* Alert */}
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-700">
                ⚠️ Email notifikasi akan dikirim otomatis ke {selectedLaporanForStatusUpdate.phoneNumber || 'kontak pelapor'}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusUpdateModal(false);
                    setStatusFormData({ status: '', adminNotes: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {statusLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" /> Mengirim...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Update & Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}