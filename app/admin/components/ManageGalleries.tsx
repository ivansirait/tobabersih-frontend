"use client";

import { useState, useRef, useCallback, FormEvent } from 'react';
import axios from 'axios';
import {
  Edit, Trash2, Plus, Search, X,
  FolderOpen, Images, ArrowLeft, Image as ImageIcon,
  Grid3X3, List, Eye, Upload, Camera,
  AlertTriangle, CheckCircle2,
  Loader2, FileImage, CloudUpload, AlignLeft
} from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { useConfirm } from '../../components/ConfirmProvider';
import { motion, AnimatePresence } from "framer-motion";

// Types
interface GalleryPhoto {
  id: number;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

interface Album {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  photos?: GalleryPhoto[];
  createdAt: string;
}

interface ManageGalleriesProps {
  galleries: Album[];
  onGalleriesUpdate: () => void;
}

interface PhotoItem {
  file: File;
  preview: string;
  url: string;
  uploading: boolean;
  done: boolean;
  error: boolean;
}

type ResultVariant = 'success' | 'error';

// --- DIALOG COMPONENTS DENGAN FRAMER MOTION ---

interface ResultModalProps {
  variant: ResultVariant;
  title: string;
  message: string;
  onClose: () => void;
}

function ResultModal({ variant, title, message, onClose }: ResultModalProps) {
  const isSuccess = variant === 'success';
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className={`px-6 pt-8 pb-6 text-center relative overflow-hidden ${isSuccess ? 'bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]' : 'bg-gradient-to-br from-red-50 to-rose-100'}`}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/40 rounded-full blur-xl" />
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm relative z-10">
            {isSuccess ? <CheckCircle2 size={40} className="text-[#4A6D55]" /> : <AlertTriangle size={40} className="text-red-500" />}
          </div>
          <h3 className="text-xl font-black text-gray-900 relative z-10 uppercase tracking-tight">{title}</h3>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">{message}</p>
          <button 
            onClick={onClose} 
            className={`w-full px-4 py-3.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg ${isSuccess ? 'bg-[#4A6D55] hover:bg-[#3a5643]' : 'bg-red-500 hover:bg-red-600'}`}
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface DeleteModalProps {
  deleteConfirm: { type: 'album' | 'photo'; id: number; title?: string };
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteModal({ deleteConfirm, onCancel, onConfirm, isDeleting }: DeleteModalProps) {
  const isAlbum = deleteConfirm.type === 'album';
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="px-10 py-7 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg"><Trash2 size={24} /></div>
            <h3 className="font-extrabold text-lg text-gray-800">{isAlbum ? 'Hapus Album?' : 'Hapus Foto?'}</h3>
          </div>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-gray-500 mb-6 leading-relaxed">
            {isAlbum ? <><span className="font-bold text-gray-800">"{deleteConfirm.title}"</span> beserta semua fotonya akan dihapus secara permanen dari sistem.</> : 'Foto ini akan dihapus secara permanen dari album.'}
          </p>
          <div className="flex gap-4">
            <button onClick={onCancel} disabled={isDeleting} className="flex-1 px-5 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
            <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-5 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {isDeleting ? <><Loader2 size={18} className="animate-spin" /> Menghapus</> : 'Hapus'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ManageGalleries({ galleries, onGalleriesUpdate }: ManageGalleriesProps) {
  const [view, setView] = useState<'albums' | 'album-detail' | 'upload-photos'>('albums');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumForm, setAlbumForm] = useState({ title: '', description: '' });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [photoFiles, setPhotoFiles] = useState<PhotoItem[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'album' | 'photo'; id: number; title?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [resultModal, setResultModal] = useState<{
    variant: ResultVariant;
    title: string;
    message: string;
    onClose: () => void;
  } | null>(null);

  const showResult = (variant: ResultVariant, title: string, message: string, afterClose: () => void) => {
    setResultModal({ variant, title, message, onClose: () => { setResultModal(null); afterClose(); } });
  };

  const API_BASE_URL = 'http://localhost:5000/api/galleries';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post('http://localhost:5000/api/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    return res.data.imageUrl;
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar!'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Maksimal ukuran cover 5MB!'); return; }
    
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverUrl(url);
    } catch {
      toast.error('Gagal upload cover, coba lagi');
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} bukan gambar`); return false; }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} melebihi 5MB`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    
    setPhotoFiles(prev => {
      if (prev.length + validFiles.length > 10) { toast.error('Maksimal 10 foto sekaligus!'); return prev; }
      const newItems: PhotoItem[] = validFiles.map(f => ({
        file: f, preview: URL.createObjectURL(f), url: '', uploading: true, done: false, error: false,
      }));
      
      newItems.forEach(item => {
        uploadFile(item.file)
          .then(url => setPhotoFiles(p => p.map(x => x.preview === item.preview ? { ...x, url, uploading: false, done: true } : x)))
          .catch(() => {
            setPhotoFiles(p => p.map(x => x.preview === item.preview ? { ...x, uploading: false, error: true } : x));
            toast.error(`Gagal upload ${item.file.name}`);
          });
      });
      return [...prev, ...newItems];
    });
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const openAlbumModal = (album: Album | null = null) => {
    setEditingAlbum(album);
    setAlbumForm({ title: album?.title || '', description: album?.description || '' });
    setCoverPreview(album?.coverUrl || null);
    setCoverUrl(album?.coverUrl || '');
    setShowAlbumModal(true);
  };

  const saveAlbum = async (e: FormEvent) => {
    e.preventDefault();
    if (!albumForm.title.trim()) { toast.error('Judul album wajib diisi!'); return; }
    if (uploadingCover) { toast.error('Tunggu cover selesai diupload!'); return; }
    
    try {
      const data = { ...albumForm, coverUrl: coverUrl || null };
      if (editingAlbum) {
        await axios.put(`${API_BASE_URL}/albums/${editingAlbum.id}`, data, authHeader);
        setShowAlbumModal(false);
        showResult('success', 'Album Diperbarui', `Album "${albumForm.title}" berhasil diperbarui.`, () => onGalleriesUpdate());
      } else {
        await axios.post(`${API_BASE_URL}/albums`, data, authHeader);
        setShowAlbumModal(false);
        showResult('success', 'Album Dibuat', `Album "${albumForm.title}" berhasil dibuat.`, () => onGalleriesUpdate());
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan album.');
    }
  };

  const confirm = useConfirm();

  const deleteAlbum = async (id: number) => {
    const albumTitle = deleteConfirm?.title || '';
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/albums/${id}`, authHeader);
      setDeleteConfirm(null);
      setIsDeleting(false);
      showResult('success', 'Album Dihapus', `Album "${albumTitle}" telah dihapus.`, () => {
        setView('albums');
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteConfirm(null);
      showResult('error', 'Gagal Menghapus', err.response?.data?.message || 'Terjadi kesalahan.', () => {});
    }
  };

  const savePhotos = async () => {
    const readyFiles = photoFiles.filter(p => p.done && p.url);
    if (!readyFiles.length) { toast.error('Pilih minimal 1 foto!'); return; }
    if (photoFiles.some(p => p.uploading)) { toast.error('Tunggu semua foto selesai diupload!'); return; }
    
    setSavingPhotos(true);
    try {
      const albumId = selectedAlbum?.id;
      await Promise.all(
        readyFiles.map(p => axios.post(`${API_BASE_URL}/albums/${albumId}/photos`, { imageUrl: p.url, caption: '' }, authHeader))
      );
      setPhotoFiles([]);
      setSavingPhotos(false);
      showResult('success', 'Foto Ditambahkan', `${readyFiles.length} foto berhasil ditambahkan.`, async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/albums/${albumId}`, authHeader);
          setSelectedAlbum(res.data);
        } catch (err) {}
        setView('album-detail');
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setSavingPhotos(false);
      showResult('error', 'Gagal Upload', err.response?.data?.message || 'Gagal menyimpan foto.', () => {});
    }
  };

  const deletePhoto = async (photoId: number) => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/photos/${photoId}`, authHeader);
      const albumId = selectedAlbum?.id;
      setDeleteConfirm(null);
      setIsDeleting(false);
      showResult('success', 'Foto Dihapus', 'Foto berhasil dihapus dari album.', async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/albums/${albumId}`, authHeader);
          setSelectedAlbum(res.data);
        } catch (err) {}
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteConfirm(null);
      showResult('error', 'Gagal Menghapus', err.response?.data?.message || 'Gagal menghapus foto.', () => {});
    }
  };

  const openAlbumDetail = async (album: Album) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/albums/${album.id}`, authHeader);
      setSelectedAlbum(res.data);
    } catch (err) {
      setSelectedAlbum(album);
    }
    setView('album-detail');
  };

  const filteredAlbums = galleries.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER MODALS ---

  const renderAlbumModal = () => (
    <AnimatePresence>
      {showAlbumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto flex flex-col overflow-hidden"
          >
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-lg text-gray-800">
                {editingAlbum ? 'Edit Detail Album' : 'Buat Album Baru'}
              </h3>
              <button onClick={() => setShowAlbumModal(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAlbum} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Foto Sampul Album</label>
                <div 
                  className="relative w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#4A6D55] hover:bg-green-50/50 transition-all" 
                  style={{ paddingBottom: '56.25%' }} 
                  onClick={() => !uploadingCover && coverInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {coverUrl && !uploadingCover && (
                        <div className="absolute bottom-3 left-3 bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <CheckCircle2 size={12} /> Terupload
                        </div>
                      )}
                      {uploadingCover && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2 text-white">
                            <Loader2 size={28} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Mengupload...</span>
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }} className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-black/70 transition-colors font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={12} /> Ganti
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(''); }} className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><ImageIcon size={24} className="text-[#4A6D55]" /></div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-gray-700 block">Klik untuk Upload Sampul</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rasio 16:9 Direkomendasikan</span>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                  Nama Album <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={albumForm.title}
                    onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                    placeholder="Contoh: Kegiatan Sosialisasi 2026"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                  Deskripsi
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 text-gray-400" size={16} />
                  <textarea
                    value={albumForm.description}
                    onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                    rows={3}
                    placeholder="Tuliskan deskripsi singkat..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all text-gray-800 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={uploadingCover}
                  className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-bold shadow-lg hover:bg-[#3a5643] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadingCover ? <><Loader2 size={18} className="animate-spin" /> Sedang Mengupload...</> : editingAlbum ? 'Simpan Perubahan' : 'Buat Album Baru'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // --- RENDER VIEWS ---

  if (view === 'upload-photos' && selectedAlbum) {
    const doneCount = photoFiles.filter(p => p.done).length;
    const uploadingCount = photoFiles.filter(p => p.uploading).length;
    const totalSizeMB = (photoFiles.reduce((acc, p) => acc + (p.file?.size || 0), 0) / (1024 * 1024)).toFixed(1);

    return (
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
        <Toaster position="top-right" />
        {resultModal && <ResultModal {...resultModal} />}

        <div className="bg-white rounded-[24px] shadow-sm p-6 min-h-[600px] border border-gray-100">
          <div className="pb-4 border-b border-gray-100 flex items-center gap-3 mb-6">
            <button onClick={() => { setView('album-detail'); setPhotoFiles([]); }} className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Upload ke Album</span>
              <h2 className="text-lg font-extrabold text-gray-900 truncate max-w-sm">{selectedAlbum.title}</h2>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div 
                onDrop={handleDrop} 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} 
                onDragLeave={() => setIsDragging(false)} 
                onClick={() => photoInputRef.current?.click()} 
                className={`border-2 border-dashed rounded-[24px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all h-96 ${isDragging ? 'border-[#4A6D55] bg-[#DDE9E1]/30 scale-[1.01]' : 'border-gray-200 hover:border-[#4A6D55] hover:bg-gray-50'}`}
              >
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-colors shadow-sm ${isDragging ? 'bg-[#DDE9E1] text-[#4A6D55]' : 'bg-white border border-gray-100 text-gray-400'}`}>
                  <FileImage size={40} />
                </div>
                <div className="text-center px-6">
                  <p className="text-xl font-black text-gray-800">Tarik & Lepas Foto Di Sini</p>
                  <p className="text-sm font-medium text-gray-500 mt-2">Mendukung JPG, PNG, WEBP · Maks 5MB/foto · Maks 10 foto.</p>
                </div>
                <button type="button" className="mt-2 px-8 py-3.5 bg-[#4A6D55] text-white rounded-2xl text-sm font-bold shadow-md hover:bg-[#3a5643] transition-colors" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}>
                  Pilih File Dari Perangkat
                </button>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
            </div>

            <div className="w-full lg:w-80 shrink-0">
              <div className="bg-gray-50 border border-gray-100 rounded-[24px] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                  <span className="text-sm font-extrabold text-gray-800 uppercase tracking-tight">Antrean Upload</span>
                  {photoFiles.length > 0 && <span className="text-[10px] bg-[#4A6D55] text-white px-3 py-1 rounded-full font-bold tracking-wider">{photoFiles.length} FILES</span>}
                </div>
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {photoFiles.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <CloudUpload size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Belum ada file</p>
                    </div>
                  ) : (
                    photoFiles.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm group relative overflow-hidden">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                          <img src={item.preview} alt="" className="w-full h-full object-cover" />
                          {item.uploading && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"><Loader2 size={16} className="text-white animate-spin" /></div>}
                          {item.error && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center"><X size={16} className="text-white" /></div>}
                          {item.done && <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.file.name}</p>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${item.error ? 'bg-red-400 w-full' : item.done ? 'bg-[#4A6D55] w-full' : 'bg-yellow-400 w-2/3 animate-pulse'}`} />
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{item.error ? 'Gagal' : item.done ? 'Selesai' : 'Uploading'}</p>
                        </div>
                        {!item.uploading && (
                          <button onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors shrink-0">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Total Ukuran</span>
                    <span className="text-gray-800">{totalSizeMB} MB</span>
                  </div>
                  <button type="button" onClick={savePhotos} disabled={doneCount === 0 || savingPhotos || uploadingCount > 0} className="w-full py-3.5 bg-[#4A6D55] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#3a5643] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {savingPhotos ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : uploadingCount > 0 ? <><Loader2 size={18} className="animate-spin" /> Menunggu Upload</> : `Simpan ${doneCount > 0 ? `${doneCount} ` : ''}Foto`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'album-detail' && selectedAlbum) {
    const photos = selectedAlbum.photos || [];
    return (
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
        <Toaster position="top-right" />
        {resultModal && <ResultModal {...resultModal} />}
        {renderAlbumModal()}
        {/* Delete handled via ConfirmProvider */}

        <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <button onClick={() => setView('albums')} className="flex items-center gap-2 p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition-colors font-bold text-sm">
              <ArrowLeft size={16} /> Kembali ke Galeri
            </button>
            <button onClick={() => openAlbumModal(selectedAlbum)} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-600 rounded-xl text-xs font-bold hover:bg-yellow-100 transition-colors">
              <Edit size={14} /> Edit Detail Album
            </button>
          </div>

          <div className="relative w-full bg-gray-100 overflow-hidden" style={{ height: '360px' }}>
            {selectedAlbum.coverUrl ? (
              <img src={selectedAlbum.coverUrl} alt={selectedAlbum.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB] flex items-center justify-center"><Images size={80} className="text-white/50" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E35]/90 via-[#1A2E35]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase inline-block mb-3 border border-white/20">
                Detail Album
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md tracking-tight uppercase">{selectedAlbum.title}</h1>
              {selectedAlbum.description && <p className="text-white/80 font-medium text-sm mt-3 max-w-2xl leading-relaxed">{selectedAlbum.description}</p>}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 uppercase tracking-tight">Koleksi Foto</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{photos.length} Media Tersimpan</p>
              </div>
              {photos.length > 0 && (
                <button onClick={() => setView('upload-photos')} className="flex items-center gap-2 px-5 py-3 bg-[#4A6D55] text-white rounded-2xl text-sm font-bold shadow-md hover:bg-[#3a5643] transition-colors">
                  <Plus size={16} /> Tambah Foto
                </button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[24px] border border-gray-100 border-dashed">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-5 relative">
                  <Camera size={40} className="text-gray-300" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#4A6D55] rounded-full flex items-center justify-center shadow-lg border-2 border-white"><Plus size={16} className="text-white" /></div>
                </div>
                <h3 className="text-lg font-extrabold text-gray-800 mb-2">Album Masih Kosong</h3>
                <p className="text-gray-500 font-medium text-sm text-center max-w-sm mb-6">Mulai tambahkan foto untuk mendokumentasikan kegiatan ke dalam album ini.</p>
                <button onClick={() => setView('upload-photos')} className="flex items-center gap-2 bg-[#4A6D55] text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg hover:bg-[#3a5643] transition-colors">
                  <Upload size={18} /> Upload Foto Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className={`group relative overflow-hidden rounded-2xl cursor-pointer bg-gray-100 aspect-square shadow-sm hover:shadow-md transition-all ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
                    <img src={photo.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onClick={() => setLightboxImg(photo.imageUrl)} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error'; }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                      <button onClick={() => setLightboxImg(photo.imageUrl)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:scale-110 transition-transform shadow-lg"><Eye size={18} /></button>
                      <button onClick={async () => {
                        const ok = await confirm({
                          title: 'Hapus Foto?',
                          description: 'Foto ini akan dihapus secara permanen dari album.',
                          confirmText: 'Hapus',
                          cancelText: 'Batal'
                        });
                        if (!ok) return;
                        deletePhoto(photo.id);
                      }} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
                <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#4A6D55] hover:text-[#4A6D55] hover:bg-[#DDE9E1]/30 transition-all cursor-pointer group bg-gray-50" onClick={() => setView('upload-photos')}>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Tambah Foto</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {lightboxImg && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-10 backdrop-blur-md"><X size={24} /></button>
                <img src={lightboxImg} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      <Toaster position="top-right" />
      {resultModal && <ResultModal {...resultModal} />}
      {renderAlbumModal()}
      {/* Delete handled via ConfirmProvider */}

      {/* --- HEADER SECTION --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full -mr-10 -mt-10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase inline-block mb-3 shadow-sm border border-white/40">
              Dokumentasi & Media
            </span>
            <h1 className="text-3xl font-black text-[#1A2E35] tracking-tight uppercase">
              Manajemen Galeri
            </h1>
            <p className="text-[#5B7078] mt-2 font-medium">
              Kelola album dan koleksi foto dokumentasi sistem.
            </p>
          </div>
          <button onClick={() => openAlbumModal()} className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Buat Album Baru
          </button>
        </div>
      </div>

      {/* --- STATS CARD --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-2xl bg-green-50 text-[#4A6D55]"><FolderOpen size={28} /></div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Album</p>
            <p className="text-2xl md:text-3xl font-black truncate text-gray-900 mt-0.5">{galleries.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-500"><Images size={28} /></div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Foto</p>
            <p className="text-2xl md:text-3xl font-black truncate text-gray-900 mt-0.5">{galleries.reduce((acc, g) => acc + (g.photos?.length || 0), 0)}</p>
          </div>
        </div>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi album..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-white text-[#4A6D55] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <Grid3X3 size={14} /> Grid
          </button>
          <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-[#4A6D55] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* --- ALBUM LISTING --- */}
      {filteredAlbums.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-gray-100"><FolderOpen size={40} className="text-gray-300" /></div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight">Belum Ada Album</h3>
          <p className="text-gray-500 font-medium text-sm mb-6 max-w-sm mx-auto">Anda belum membuat album galeri apapun. Silakan buat album pertama Anda.</p>
          <button onClick={() => openAlbumModal()} className="bg-[#4A6D55] text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg hover:bg-[#3a5643] transition-all inline-flex items-center gap-2 text-sm">
            <Plus size={18} /> Buat Album Baru
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="group bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="relative w-full overflow-hidden bg-gray-100 cursor-pointer shrink-0" style={{ paddingBottom: '60%' }} onClick={() => openAlbumDetail(album)}>
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]"><Images size={40} className="text-white/60" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#4A6D55] px-3 py-1.5 rounded-full text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm">
                  <ImageIcon size={12} /> {album.photos?.length || 0} FOTO
                </div>
              </div>
              <div className="p-5 flex-1 cursor-pointer flex flex-col justify-between" onClick={() => openAlbumDetail(album)}>
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900 line-clamp-1 mb-1">{album.title}</h3>
                  <p className="text-sm font-medium text-gray-500 line-clamp-2 leading-relaxed mb-4">{album.description || 'Tidak ada deskripsi.'}</p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 w-fit px-3 py-1.5 rounded-lg">
                  {new Date(album.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="border-t border-gray-50 flex shrink-0 bg-gray-50/50">
                <button onClick={() => openAlbumDetail(album)} className="flex-1 flex items-center justify-center gap-2 py-4 text-sm text-[#4A6D55] hover:bg-[#DDE9E1]/50 transition-colors font-bold"><FolderOpen size={16} /> Buka Album</button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => openAlbumModal(album)} className="px-5 flex items-center justify-center text-yellow-500 hover:bg-yellow-50 transition-colors"><Edit size={18} /></button>
                <div className="w-px bg-gray-100" />
                <button onClick={async () => {
                  const ok = await confirm({
                    title: `Hapus Album "${album.title}"?`,
                    description: `"${album.title}" beserta semua fotonya akan dihapus secara permanen dari sistem.`,
                    confirmText: 'Hapus',
                    cancelText: 'Batal'
                  });
                  if (!ok) return;
                  deleteAlbum(album.id);
                }} className="px-5 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
          <div className="divide-y divide-gray-50">
            {filteredAlbums.map((album) => (
              <div key={album.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-all group cursor-pointer" onClick={() => openAlbumDetail(album)}>
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 shadow-sm border border-gray-100">
                  {album.coverUrl ? <img src={album.coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]"><Images size={24} className="text-white/60" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-gray-900 truncate text-base">{album.title}</h3>
                  {album.description && <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-1">{album.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-gray-600"><ImageIcon size={10} /> {album.photos?.length || 0} Foto</span>
                    <span>{new Date(album.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openAlbumModal(album)} className="p-3 text-yellow-500 hover:bg-yellow-50 rounded-xl transition-colors shadow-sm bg-white border border-gray-100"><Edit size={16} /></button>
                  <button onClick={() => openAlbumDetail(album)} className="p-3 text-[#4A6D55] hover:bg-[#DDE9E1]/50 rounded-xl transition-colors shadow-sm bg-white border border-gray-100"><FolderOpen size={16} /></button>
                  <button onClick={async () => {
                    const ok = await confirm({
                      title: `Hapus Album "${album.title}"?`,
                      description: `"${album.title}" beserta semua fotonya akan dihapus secara permanen dari sistem.`,
                      confirmText: 'Hapus',
                      cancelText: 'Batal'
                    });
                    if (!ok) return;
                    deleteAlbum(album.id);
                  }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors shadow-sm bg-white border border-gray-100"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}