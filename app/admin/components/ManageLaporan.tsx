"use client";

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import axios from 'axios';
import {
  Search, MapPin, Truck, Clock,
  AlertCircle, X, CheckCircle2, RefreshCw,
  FileText, Trash2, ImageIcon,
  ArrowRightCircle, Loader, Calendar, ChevronDown,
  Phone, Eye
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

interface TruckType {
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
  const [trukList, setTrukList] = useState<TruckType[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [assignmentByReportId, setAssignmentByReportId] = useState<Record<string, any>>({});

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
          map[reportId] = { id: item.id, status: item.status };
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

  // --- Handlers ---
  const handleVerify = async (id: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = action === 'approve' ? 'DITERIMA' : 'DITOLAK';
      await axios.patch(`http://localhost:5000/api/laporan/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Laporan ${action === 'approve' ? 'diterima' : 'ditolak'}`);
      fetchLaporan();
    } catch (error: any) {
      toast.error('Gagal verifikasi');
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLaporanForStatusUpdate) return;
    setStatusLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/laporan/${selectedLaporanForStatusUpdate.id}/status`,
        statusFormData, { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Status berhasil diperbarui');
      setShowStatusUpdateModal(false);
      fetchLaporan();
    } catch (error: any) {
      toast.error('Gagal update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        location: selectedLaporan?.location || selectedLaporan?.description,
        district: selectedLaporan?.district,
        description: selectedLaporan?.description,
        type: 'ADUAN'
      };
      await axios.post('http://localhost:5000/api/penugasan/aduan', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.patch(`http://localhost:5000/api/laporan/${formData.reportId}`, { status: 'DIPROSES' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Penugasan berhasil dibuat');
      setShowConversionModal(false);
      fetchLaporan();
      fetchAssignments();
    } catch (error: any) {
      toast.error('Gagal membuat penugasan');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DITERIMA': return { bg: 'bg-green-100', text: 'text-green-800', label: 'Diterima' };
      case 'DITOLAK': return { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' };
      case 'PENDING': return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Menunggu' };
      case 'DIPROSES': return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Diproses' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />

      {/* HEADER SECTION */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#FFF7ED] to-[#FFEDD5] rounded-[24px] p-8 shadow-sm border border-orange-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-orange-700 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Monitoring & Feedback
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Laporan Masyarakat</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola aduan sampah dan konversi menjadi penugasan unit
              </p>
            </div>
            <button
              onClick={() => { fetchLaporan(); fetchAssignments(); }}
              className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl transition-all shadow-sm border border-orange-100 active:scale-95"
            >
              <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Laporan', val: laporanList.length, color: 'text-gray-600', bg: 'bg-gray-50', icon: FileText },
          { label: 'Perlu Tindakan', val: laporanList.filter(l => l.status === 'PENDING').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Sudah Diterima', val: laporanList.filter(l => l.status === 'DITERIMA').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Ditugaskan', val: Object.keys(assignmentByReportId).length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
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

      {/* TABLE DATA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari wilayah, deskripsi, atau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none text-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-400">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Sinkronisasi data laporan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-12">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Detail Laporan</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Lokasi & Wilayah</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLaporan.map((laporan, idx) => {
                  const status = getStatusBadge(laporan.status);
                  const isAssigned = Boolean(assignmentByReportId[laporan.id]);

                  return (
                    <tr key={laporan.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden border border-gray-200">
                            {laporan.photoUrl ? (
                              <img src={laporan.photoUrl} alt="Report" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={20} /></div>
                            )}
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-bold text-gray-900 leading-tight">#{laporan.reportNumber || laporan.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{laporan.description}"</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-gray-800">{laporan.district}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{laporan.location || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset ${status.bg} ${status.text} ring-black/5`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${status.text.replace('text', 'bg')}`}></span>
                            {status.label}
                          </span>
                          {isAssigned && (
                            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                              <Truck size={10} /> Sudah Ditugaskan
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {laporan.status === 'PENDING' ? (
                            <>
                              <button onClick={() => handleVerify(laporan.id, 'approve')} className="p-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm" title="Terima"><CheckCircle2 size={18} /></button>
                              <button onClick={() => handleVerify(laporan.id, 'reject')} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all shadow-sm" title="Tolak"><X size={18} /></button>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedLaporanForStatusUpdate(laporan);
                                setStatusFormData({ status: laporan.status, adminNotes: '' });
                                setShowStatusUpdateModal(true);
                              }}
                              className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all" title="Update Status"
                            >
                              <RefreshCw size={18} />
                            </button>
                          )}
                          
                          {laporan.status === 'DITERIMA' && !isAssigned && (
                            <button 
                              onClick={() => {
                                setSelectedLaporan(laporan);
                                setFormData(prev => ({ ...prev, reportId: laporan.id }));
                                setShowConversionModal(true);
                              }}
                              className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all"
                            >
                              <ArrowRightCircle size={14} /> Tugas
                            </button>
                          )}
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

      {/* MODAL PENUGASAN (CONVERSION) */}
      {showConversionModal && selectedLaporan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Buat Penugasan Aduan</h3>
              <button onClick={() => setShowConversionModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleConversionSubmit} className="p-8 space-y-5">
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50 mb-2">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Sumber Laporan</p>
                <p className="text-sm font-bold text-gray-800">{selectedLaporan.district}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedLaporan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Pilih Supir</label>
                  <div className="relative">
                    <select 
                      name="driverId" 
                      onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                      required 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 outline-none transition appearance-none bg-white text-sm"
                    >
                      <option value="">Pilih Driver</option>
                      {supirList.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Pilih Unit Truk</label>
                  <div className="relative">
                    <select 
                      name="truckId" 
                      onChange={(e) => setFormData({...formData, truckId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 outline-none transition appearance-none bg-white text-sm"
                    >
                      <option value="">Pilih Truk (Opsional)</option>
                      {trukList.map(t => <option key={t.id} value={t.id}>{t.plateNumber}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Waktu Pelaksanaan</label>
                <input 
                  type="datetime-local" 
                  name="scheduledAt" 
                  onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 outline-none transition text-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Instruksi Khusus</label>
                <textarea 
                  name="notes" 
                  rows={3} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Petunjuk tambahan untuk driver..." 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 outline-none transition text-sm resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowConversionModal(false)} className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" disabled={loadingSubmit} className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                  {loadingSubmit ? <Loader size={18} className="animate-spin" /> : 'Konfirmasi Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPDATE STATUS */}
      {showStatusUpdateModal && selectedLaporanForStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Update Progres</h3>
              <button onClick={() => setShowStatusUpdateModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleStatusUpdate} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Status Baru</label>
                <div className="relative">
                  <select
                    value={statusFormData.status}
                    onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none appearance-none bg-white text-sm font-medium"
                  >
                    <option value="DITERIMA">Diterima</option>
                    <option value="DITINDAKLANJUTI">Ditindaklanjuti</option>
                    <option value="DIPROSES">Sedang Diproses</option>
                    <option value="SELESAI">Selesai</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">Catatan Admin</label>
                <textarea
                  value={statusFormData.adminNotes}
                  onChange={(e) => setStatusFormData({ ...statusFormData, adminNotes: e.target.value })}
                  placeholder="Informasikan perkembangan kepada pelapor..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition text-sm h-28 resize-none"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Mengubah status akan mengirimkan notifikasi email secara otomatis kepada pelapor sebagai transparansi layanan.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowStatusUpdateModal(false)} className="flex-1 px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" disabled={statusLoading} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                  {statusLoading ? <Loader size={18} className="animate-spin" /> : 'Simpan & Beritahu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}