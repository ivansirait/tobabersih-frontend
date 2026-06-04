"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Upload,
  Loader2,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  PlaySquare,
  Library,
  FilePlus,
  Eye,
  Grid3X3,
  List,
  Calendar,
  User
} from 'lucide-react';
import { useConfirm } from '../../components/ConfirmProvider';

type MediaType = 'IMAGE' | 'VIDEO';
type ViewMode = 'GRID' | 'LIST';

type EdukasiItem = {
  id: number;
  judul: string;
  deskripsi?: string | null;
  mediaUrl: string;
  mediaType: MediaType;
  createdAt?: string;
};

type MediaPreview = {
  url: string;
  type: MediaType;
};

const INITIAL_FORM = {
  judul: '',
  deskripsi: '',
  mediaUrl: '',
};

export default function ManageEdukasi() {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');

  // UI States
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EdukasiItem | null>(null);
  const confirm = useConfirm();
  
  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<EdukasiItem | null>(null);

  // Form States
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : { headers: {} };
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/edukasi` : 'http://localhost:5000/api/edukasi';

  // --- FUNGSI DATA ---
  const refresh = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/`, authHeader);
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // --- STATISTIK ---
  const stats = useMemo(() => ({
    total: items.length,
    gambar: items.filter(p => p.mediaType === 'IMAGE').length,
    video: items.filter(p => p.mediaType === 'VIDEO').length,
  }), [items]);

  const filtered = items.filter((x) => x.judul?.toLowerCase().includes(search.toLowerCase()));

  // --- HANDLERS ---
  const openModal = (item: EdukasiItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        judul: item.judul || '',
        deskripsi: item.deskripsi || '',
        mediaUrl: item.mediaUrl || '',
      });
      setMediaPreview({ url: item.mediaUrl, type: item.mediaType });
    } else {
      setEditingItem(null);
      setFormData(INITIAL_FORM);
      setMediaPreview(null);
    }
    setShowModal(true);
  };

  const openDetailModal = (item: EdukasiItem) => {
    setViewingItem(item);
    setShowDetailModal(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post('http://localhost:5000/api/upload', fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data.imageUrl;
  };

  const chooseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showNotification('File harus berupa gambar atau video', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showNotification('Maksimal ukuran file 50MB', 'error');
      return;
    }

    const type: MediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    setMediaPreview({ url: URL.createObjectURL(file), type });
    setUploading(true);
    
    try {
      const url = await uploadFile(file);
      setFormData(prev => ({ ...prev, mediaUrl: url }));
      showNotification('Upload media berhasil', 'success');
    } catch {
      showNotification('Gagal upload media', 'error');
      setFormData(prev => ({ ...prev, mediaUrl: '' }));
      setMediaPreview(null);
    } finally {
      setUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim()) {
      showNotification('Judul wajib diisi', 'error');
      return;
    }
    if (!formData.mediaUrl || !mediaPreview) {
      showNotification('Media wajib diupload', 'error');
      return;
    }

    setLoading(true);
    const normalizedMediaType = String(mediaPreview.type).toUpperCase() as 'IMAGE' | 'VIDEO';
    const payload = {
      judul: formData.judul.trim(),
      deskripsi: formData.deskripsi.trim() ? formData.deskripsi.trim() : null,
      mediaUrl: formData.mediaUrl,
      mediaType: normalizedMediaType,
    };

    try {
      if (editingItem) {
        await axios.put(`${API_BASE_URL}/${editingItem.id}`, payload, authHeader);
        showNotification('Edukasi berhasil diperbarui!', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/`, payload, authHeader);
        showNotification('Edukasi berhasil ditambahkan!', 'success');
      }
      setShowModal(false);
      refresh();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Gagal menyimpan edukasi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item?: EdukasiItem) => {
    const target = item;
    if (!target) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/${target.id}`, authHeader);
      showNotification('Edukasi berhasil dihapus!', 'success');
      refresh();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Gagal menghapus edukasi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 text-black relative">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-white border border-gray-100"
          >
            {toast.type === 'success' ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[32px] p-8 shadow-sm border border-white/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-3">
              Modul Pembelajaran
            </span>
            <h1 className="text-3xl font-black text-[#1A2E35] tracking-tight uppercase">Manajemen Edukasi</h1>
            <p className="text-[#5B7078] mt-2 font-medium">Kelola materi pembelajaran, video, dan panduan edukasi.</p>
          </div>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Materi', val: stats.total, icon: Library, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Materi Video', val: stats.video, icon: PlaySquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Materi Gambar', val: stats.gambar, icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-3xl font-black text-gray-900">{s.val}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shadow-inner`}>
              <s.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end w-full">
        <button 
          onClick={() => openModal()}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} strokeWidth={3} /> Tambah Edukasi
        </button>
      </div>

      {/* --- SEARCH & VIEW CONTROLS --- */}
      <div className="bg-white rounded-[24px] shadow-sm p-4 border border-gray-50 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex flex-1 w-full gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Cari judul edukasi..." value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all" 
            />
          </div>
          {/* Tombol Grid/List View */}
          <div className="hidden sm:flex border border-gray-100 rounded-2xl overflow-hidden p-1 bg-gray-50">
            <button onClick={() => setViewMode('GRID')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Grid3X3 size={18}/></button>
            <button onClick={() => setViewMode('LIST')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={18}/></button>
          </div>
        </div>
      </div>

      {/* --- CONTENT LIST --- */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-gray-50 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <GraduationCap size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-bold text-lg uppercase tracking-widest text-[12px] mb-6">Belum ada materi edukasi</p>
          <button onClick={() => openModal()} className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold text-xs hover:bg-gray-100 transition-all inline-flex items-center gap-2">
            <Plus size={16} /> Buat Edukasi Pertama
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            layout 
            className={viewMode === 'GRID' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}
          >
            {filtered.map((item) => (
              <motion.div
                layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                key={item.id}
                className={`bg-white rounded-[24px] border border-gray-100 overflow-hidden hover:shadow-xl transition-all group ${viewMode === 'LIST' ? 'flex items-center p-4' : ''}`}
              >
                <div className={`${viewMode === 'GRID' ? 'h-48 w-full' : 'w-32 h-32 rounded-2xl'} overflow-hidden relative bg-gray-100 shrink-0`}>
                  {item.mediaType === 'IMAGE' ? (
                    <img 
                      src={item.mediaUrl} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={item.judul}
                      onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                    />
                  ) : (
                    <video src={item.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted controls={false} />
                  )}
                  
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-white/20 flex items-center gap-1.5 ${item.mediaType === 'IMAGE' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {item.mediaType === 'IMAGE' ? <ImageIcon size={10} /> : <VideoIcon size={10} />}
                      {item.mediaType}
                    </span>
                  </div>
                </div>

                <div className={`p-6 flex-1 flex flex-col h-full ${viewMode === 'LIST' ? 'py-2' : ''}`}>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-2">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(item.createdAt || Date.now()).toLocaleDateString('id-ID')}</span>
                    <span className="flex items-center gap-1"><User size={12}/> Admin</span>
                  </div>
                  <h3 className={`font-black text-gray-900 leading-tight mb-2 group-hover:text-[#4A6D55] transition-colors line-clamp-2 ${viewMode === 'GRID' ? 'text-lg' : 'text-base'}`}>
                    {item.judul}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 leading-relaxed">
                    {item.deskripsi || <span className="italic text-gray-300">Tanpa deskripsi...</span>}
                  </p>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-50 mt-auto">
                    <button onClick={() => openDetailModal(item)} className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                      <Eye size={14}/> Detail
                    </button>
                    <button onClick={() => openModal(item)} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100"><Edit size={16}/></button>
                    <button onClick={async () => {
                      const ok = await confirm({
                        title: `Hapus Edukasi "${item.judul}"?`,
                        description: 'Konten ini akan dihapus secara permanen dan tidak dapat dikembalikan dari sistem.',
                        confirmText: 'Hapus',
                        cancelText: 'Batal'
                      });
                      if (!ok) return;
                      remove(item);
                    }} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#4A6D55] flex items-center justify-center text-white">
                    <FilePlus size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase">{editingItem ? 'Edit Edukasi' : 'Edukasi Baru'}</h3>
                    <p className="text-xs font-bold text-gray-400">Pastikan materi edukasi jelas dan informatif.</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>

              <form onSubmit={submit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Judul Edukasi</label>
                    <input 
                      value={formData.judul} 
                      onChange={e => setFormData({...formData, judul: e.target.value})} 
                      required 
                      placeholder="Contoh: Cara Membuang Sampah yang Benar"
                      className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:bg-white transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Unggah Media (Gambar/Video)</label>
                    <div 
                      onClick={() => !uploading && fileRef.current?.click()}
                      className={`relative w-full rounded-2xl border-2 border-dashed ${mediaPreview ? 'border-gray-200' : 'border-gray-300'} bg-gray-50 overflow-hidden cursor-pointer hover:border-[#4A6D55] hover:bg-green-50/30 transition-all flex flex-col items-center justify-center min-h-[200px]`}
                    >
                      {mediaPreview ? (
                        <>
                          {mediaPreview.type === 'IMAGE' ? (
                            <img src={mediaPreview.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                          ) : (
                            <div className="absolute inset-0 bg-black flex items-center justify-center">
                              <video src={mediaPreview.url} className="w-full h-full object-cover opacity-80" controls={false} muted />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                            {mediaPreview.type === 'IMAGE' ? <ImageIcon size={14} /> : <VideoIcon size={14} />} {mediaPreview.type}
                          </div>
                          
                          <div className="relative z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-gray-700 shadow-sm mt-8">
                            Klik untuk mengganti media
                          </div>
                        </>
                      ) : (
                         <div className="flex flex-col items-center gap-2 text-gray-400">
                           <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-2xl flex items-center justify-center mb-2">
                             <Upload size={24} className="text-[#4A6D55]" />
                           </div>
                           <span className="text-sm font-bold text-gray-600">Pilih File Gambar atau Video</span>
                           <span className="text-[10px] font-black uppercase tracking-widest">Maksimal 50MB (JPG/PNG/MP4)</span>
                         </div>
                      )}

                      {uploading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                          <Loader2 size={32} className="animate-spin text-[#4A6D55] mb-2" />
                          <span className="text-xs font-black uppercase tracking-widest text-[#4A6D55]">Mengunggah...</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,video/*" onChange={chooseFile} className="hidden" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Deskripsi Materi</label>
                    <textarea 
                      value={formData.deskripsi} 
                      onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
                      rows={4} 
                      placeholder="Tuliskan detail edukasi..."
                      className="w-full p-4 border border-gray-100 bg-gray-50 rounded-[24px] text-sm leading-relaxed focus:bg-white transition-all resize-none" 
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-50">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Batal</button>
                  <button type="submit" disabled={loading || uploading} className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                    {loading ? <Loader2 className="animate-spin" /> : (editingItem ? 'Simpan Perubahan' : 'Publikasikan')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DETAIL MODAL --- */}
      <AnimatePresence>
        {showDetailModal && viewingItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden my-auto border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#4A6D55] flex items-center justify-center text-white">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase">Detail Materi Edukasi</h3>
                    <p className="text-xs font-bold text-gray-400">Pratinjau lengkap konten pembelajaran.</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(viewingItem.createdAt || Date.now()).toLocaleDateString('id-ID')}</span>
                  <span className="flex items-center gap-1"><User size={12}/> Admin</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${viewingItem.mediaType === 'IMAGE' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {viewingItem.mediaType === 'IMAGE' ? <ImageIcon size={10}/> : <VideoIcon size={10}/>} {viewingItem.mediaType}
                  </span>
                </div>

                <h1 className="text-3xl font-black text-gray-900 leading-tight">{viewingItem.judul}</h1>

                <div className="w-full rounded-[24px] overflow-hidden bg-black flex items-center justify-center relative">
                  {viewingItem.mediaType === 'IMAGE' ? (
                    <img 
                      src={viewingItem.mediaUrl} 
                      className="w-full max-h-[400px] object-contain"
                      alt={viewingItem.judul}
                    />
                  ) : (
                    <video 
                      src={viewingItem.mediaUrl} 
                      className="w-full max-h-[400px] object-contain" 
                      controls 
                      autoPlay={false}
                    />
                  )}
                </div>

                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {viewingItem.deskripsi || <span className="italic text-gray-400">Tidak ada deskripsi tambahan untuk materi ini.</span>}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-50">
                  <button onClick={() => { setShowDetailModal(false); openModal(viewingItem); }} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                    <Edit size={16} /> Edit
                  </button>
                  <button onClick={async () => {
                    const ok = await confirm({
                      title: `Hapus Edukasi "${viewingItem?.judul}"?`,
                      description: 'Konten ini akan dihapus secara permanen dan tidak dapat dikembalikan dari sistem.',
                      confirmText: 'Hapus',
                      cancelText: 'Batal'
                    });
                    if (!ok) return;
                    setShowDetailModal(false);
                    if (viewingItem) remove(viewingItem);
                  }} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete handled via ConfirmProvider */}
      
    </div>
  );
}