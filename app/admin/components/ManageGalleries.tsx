"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Edit, Trash2, Plus, Search, X,
  FolderOpen, Images, ArrowLeft, Image,
  Grid3X3, List, Eye, Upload, Camera,
  AlertTriangle, CheckCircle2,
  Loader2, FileImage, CloudUpload
} from 'lucide-react';

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
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`px-6 pt-8 pb-6 text-center relative overflow-hidden ${isSuccess ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30 relative z-10">
            {isSuccess ? <CheckCircle2 size={40} className="text-white" /> : <AlertTriangle size={40} className="text-white" />}
          </div>
          <h3 className="text-xl font-black text-white relative z-10">{title}</h3>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>
          <button onClick={onClose} className={`w-full px-4 py-3 text-white rounded-xl font-bold text-sm transition-colors ${isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

interface AlbumModalProps {
  editingAlbum: Album | null;
  albumForm: { title: string; description: string };
  setAlbumForm: (v: { title: string; description: string }) => void;
  coverPreview: string | null;
  setCoverPreview: (v: string | null) => void;
  coverUrl: string;
  setCoverUrl: (v: string) => void;
  uploadingCover: boolean;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function AlbumModal({
  editingAlbum, albumForm, setAlbumForm, coverPreview, setCoverPreview,
  coverUrl, setCoverUrl, uploadingCover, coverInputRef, onCoverChange, onSubmit, onClose
}: AlbumModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0B4D33] px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{editingAlbum ? 'Edit Album' : 'Buat Album Baru'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Sampul Album</label>
            <div className="relative w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#0B4D33] hover:bg-green-50 transition-all" style={{ paddingBottom: '56.25%' }} onClick={() => !uploadingCover && coverInputRef.current?.click()}>
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {coverUrl && !uploadingCover && (
                    <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Terupload
                    </div>
                  )}
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 size={28} className="animate-spin" />
                        <span className="text-sm font-medium">Mengupload...</span>
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }} className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/70 transition-colors font-medium flex items-center gap-1.5">
                    <Image size={12} /> Ganti
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(''); }} className="absolute top-3 right-3 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center"><Image size={22} /></div>
                  <span className="text-sm font-semibold">Upload foto sampul</span>
                  <span className="text-xs text-gray-300">Rasio 16:9 direkomendasikan</span>
                </div>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={onCoverChange} className="hidden" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Album <span className="text-red-500">*</span></label>
            <input type="text" value={albumForm.title} onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors" placeholder="Contoh: Kegiatan Gotong Royong 2025" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label>
            <textarea value={albumForm.description} onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors resize-none" placeholder="Deskripsi singkat tentang album ini..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Batal</button>
            <button type="submit" disabled={uploadingCover} className="flex-1 px-4 py-3 bg-[#0B4D33] text-white rounded-xl text-sm font-bold hover:bg-[#093d28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {uploadingCover ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : editingAlbum ? 'Simpan Perubahan' : 'Buat Album'}
            </button>
          </div>
        </form>
      </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 px-5 py-6 text-center relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/30 relative z-10">
            <Trash2 size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-black text-white relative z-10">{isAlbum ? 'Hapus Album?' : 'Hapus Foto?'}</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500 mb-6">
            {isAlbum ? <><span className="font-semibold text-gray-700">"{deleteConfirm.title}"</span> beserta semua fotonya akan dihapus secara permanen.</> : 'Foto ini akan dihapus secara permanen.'}
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={isDeleting} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Batal</button>
            <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isDeleting ? <><Loader2 size={15} className="animate-spin" /> Menghapus...</> : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ToastType = 'success' | 'error' | 'info';
interface ToastProps { message: string; type: ToastType; }
function Toast({ message, type }: ToastProps) {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-semibold text-white ${bgColor}`}>
      <Icon size={18} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

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
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [resultModal, setResultModal] = useState<{
    variant: ResultVariant;
    title: string;
    message: string;
    onClose: () => void;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const showResult = (variant: ResultVariant, title: string, message: string, afterClose: () => void) => {
    setResultModal({ variant, title, message, onClose: () => { setResultModal(null); afterClose(); } });
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/galleries`
    : 'http://localhost:5000/api/galleries';


  // Ambil token dari localStorage saat render (client component)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeader = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : { headers: {} };


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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('File harus berupa gambar!', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Maksimal ukuran cover 5MB!', 'error'); return; }
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverUrl(url);
    } catch {
      showToast('Gagal upload cover, coba lagi', 'error');
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) { showToast(`${f.name} bukan file gambar`, 'error'); return false; }
      if (f.size > 5 * 1024 * 1024) { showToast(`${f.name} melebihi 5MB`, 'error'); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setPhotoFiles(prev => {
      if (prev.length + validFiles.length > 10) { showToast('Maksimal 10 foto sekaligus!', 'error'); return prev; }
      const newItems: PhotoItem[] = validFiles.map(f => ({
        file: f, preview: URL.createObjectURL(f), url: '', uploading: true, done: false, error: false,
      }));
      newItems.forEach(item => {
        uploadFile(item.file)
          .then(url => setPhotoFiles(p => p.map(x => x.preview === item.preview ? { ...x, url, uploading: false, done: true } : x)))
          .catch(() => {
            setPhotoFiles(p => p.map(x => x.preview === item.preview ? { ...x, uploading: false, error: true } : x));
            showToast(`Gagal upload ${item.file.name}`, 'error');
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

  const saveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.title.trim()) { showToast('Judul album wajib diisi!', 'error'); return; }
    if (uploadingCover) { showToast('Tunggu cover selesai diupload!', 'error'); return; }
    try {
      const data = { ...albumForm, coverUrl: coverUrl || null };
      if (editingAlbum) {
        await axios.put(`${API_BASE_URL}/albums/${editingAlbum.id}`, data, authHeader);
        setShowAlbumModal(false);
        showResult('success', 'Album Diperbarui!', `Album "${albumForm.title}" berhasil diperbarui.`, () => {
          onGalleriesUpdate();
        });
      } else {
        await axios.post(`${API_BASE_URL}/albums`, data, authHeader);
        setShowAlbumModal(false);
        showResult('success', 'Album Dibuat!', `Album "${albumForm.title}" berhasil dibuat.`, () => {
          onGalleriesUpdate();
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal menyimpan album.';
      showResult('error', 'Gagal Menyimpan', msg, () => {});
    }
  };

  const deleteAlbum = async (id: number) => {
    const albumTitle = deleteConfirm?.title || '';
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/albums/${id}`, authHeader);
      setDeleteConfirm(null);
      setIsDeleting(false);
      showResult('success', 'Album Dihapus!', `Album "${albumTitle}" berhasil dihapus.`, () => {
        setView('albums');
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteConfirm(null);
      const errorMsg = err.response?.data?.message || 'Terjadi kesalahan saat menghapus album.';
      showResult('error', 'Gagal Menghapus', errorMsg, () => {});
    }
  };

  const savePhotos = async () => {
    const readyFiles = photoFiles.filter(p => p.done && p.url);
    if (!readyFiles.length) { showToast('Pilih minimal 1 foto!', 'error'); return; }
    if (photoFiles.some(p => p.uploading)) { showToast('Tunggu semua foto selesai diupload!', 'error'); return; }
    setSavingPhotos(true);
    try {
      const albumId = selectedAlbum?.id;
      await Promise.all(
        readyFiles.map(p =>
          axios.post(`${API_BASE_URL}/albums/${albumId}/photos`, { imageUrl: p.url, caption: '' }, authHeader)
        )
      );
      setPhotoFiles([]);
      setSavingPhotos(false);
      showResult('success', 'Foto Ditambahkan!', `${readyFiles.length} foto berhasil ditambahkan.`, async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/albums/${albumId}`, authHeader);
          setSelectedAlbum(res.data);
        } catch (err) {
          console.error('Error refreshing album:', err);
        }
        setView('album-detail');
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setSavingPhotos(false);
      const errorMsg = err.response?.data?.message || 'Gagal menyimpan foto.';
      showResult('error', 'Gagal Upload Foto', errorMsg, () => {});
    }
  };

  const deletePhoto = async (photoId: number) => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/photos/${photoId}`, authHeader);
      const albumId = selectedAlbum?.id;
      setDeleteConfirm(null);
      setIsDeleting(false);
      showResult('success', 'Foto Dihapus!', 'Foto berhasil dihapus dari album.', async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/albums/${albumId}`, authHeader);
          setSelectedAlbum(res.data);
        } catch (err) {
          console.error('Error refreshing album:', err);
        }
        onGalleriesUpdate();
      });
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteConfirm(null);
      const errorMsg = err.response?.data?.message || 'Gagal menghapus foto.';
      showResult('error', 'Gagal Menghapus Foto', errorMsg, () => {});
    }
  };

  const openAlbumDetail = async (album: Album) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/albums/${album.id}`, authHeader);
      setSelectedAlbum(res.data);
    } catch (err: any) {
      console.error('Error fetching album detail:', err);
      setSelectedAlbum(album);
    }
    setView('album-detail');
  };

  const openUploadView = () => {
    setPhotoFiles([]);
    setView('upload-photos');
  };

  const filteredAlbums = galleries.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const doneCount = photoFiles.filter(p => p.done).length;
  const uploadingCount = photoFiles.filter(p => p.uploading).length;
  const totalSizeMB = (photoFiles.reduce((acc, p) => acc + (p.file?.size || 0), 0) / (1024 * 1024)).toFixed(1);

  if (view === 'upload-photos' && selectedAlbum) {
    return (
      <div className="bg-white rounded-xl shadow-sm min-h-[600px]">
        {toast && <Toast message={toast.message} type={toast.type} />}
        {resultModal && <ResultModal {...resultModal} />}

        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => { setView('album-detail'); setPhotoFiles([]); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Kembali
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500 truncate max-w-[200px]">{selectedAlbum.title}</span>
        </div>

        <div className="p-6 flex gap-6">
          <div className="flex-1">
            <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => photoInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all h-80 ${isDragging ? 'border-[#0B4D33] bg-green-50 scale-[1.01]' : 'border-gray-200 hover:border-[#0B4D33] hover:bg-gray-50'}`}>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-green-100' : 'bg-gray-100'}`}>
                <FileImage size={36} className={isDragging ? 'text-[#0B4D33]' : 'text-gray-400'} />
              </div>
              <div className="text-center px-6">
                <p className="text-lg font-semibold text-gray-700">Drag & Drop Foto</p>
                <p className="text-sm text-gray-400 mt-1">Atau pilih file dari komputer Anda.<br />Mendukung JPG, PNG, WEBP · Maks 5MB per foto · Maks 10 foto.</p>
              </div>
              <button type="button" className="px-6 py-2.5 bg-[#0B4D33] text-white rounded-xl text-sm font-semibold hover:bg-[#093d28] transition-colors" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}>
                Pilih File
              </button>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
          </div>

          <div className="w-72 shrink-0">
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">Antrian Upload</span>
                {photoFiles.length > 0 && <span className="text-xs bg-[#0B4D33] text-white px-2.5 py-0.5 rounded-full font-semibold">{photoFiles.length} Files</span>}
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {photoFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-300">
                    <CloudUpload size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Belum ada file dipilih</p>
                  </div>
                ) : (
                  photoFiles.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 group">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        {item.uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={14} className="text-white animate-spin" /></div>}
                        {item.error && <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center"><X size={14} className="text-white" /></div>}
                        {item.done && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-tl-md flex items-center justify-center"><CheckCircle2 size={10} className="text-white" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.file.name}</p>
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${item.error ? 'bg-red-400 w-full' : item.done ? 'bg-[#0B4D33] w-full' : 'bg-[#0B4D33] w-2/3 animate-pulse'}`} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.error ? 'Gagal diupload' : item.done ? 'Siap disimpan' : 'Mengupload...'}</p>
                      </div>
                      {!item.uploading && (
                        <button onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Total Size</span>
                  <span className="font-semibold">{totalSizeMB} MB</span>
                </div>
                <button type="button" onClick={savePhotos} disabled={doneCount === 0 || savingPhotos || uploadingCount > 0} className="w-full py-2.5 bg-[#0B4D33] text-white rounded-xl text-sm font-semibold hover:bg-[#093d28] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {savingPhotos ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : uploadingCount > 0 ? <><Loader2 size={16} className="animate-spin" /> Menunggu upload...</> : `Upload ${doneCount > 0 ? `${doneCount} ` : ''}Foto`}
                </button>
                <button type="button" onClick={() => { setView('album-detail'); setPhotoFiles([]); }} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Batal</button>
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {toast && <Toast message={toast.message} type={toast.type} />}
        {resultModal && <ResultModal {...resultModal} />}

        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => setView('albums')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Kembali
          </button>
        </div>

        <div className="relative w-full bg-gray-900 overflow-hidden" style={{ height: '340px' }}>
          {selectedAlbum.coverUrl ? <img src={selectedAlbum.coverUrl} alt={selectedAlbum.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"><Images size={64} className="text-gray-600" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black text-white drop-shadow-lg">{selectedAlbum.title}</h1>
              {selectedAlbum.description && <p className="text-white/70 text-sm mt-1 max-w-lg line-clamp-2">{selectedAlbum.description}</p>}
            </div>
            <button onClick={() => openAlbumModal(selectedAlbum)} className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-amber-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-colors shadow-lg shrink-0">
              <Edit size={14} /> Edit Sampul Album
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Koleksi Foto <span className="ml-2 text-sm font-normal text-gray-400">({photos.length} foto)</span></h2>
            {photos.length > 0 && (
              <button onClick={openUploadView} className="flex items-center gap-2 px-4 py-2 bg-[#0B4D33] text-white rounded-xl text-sm font-semibold hover:bg-[#093d28] transition-colors">
                <Plus size={15} /> Tambah Foto
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-5">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center"><Camera size={36} className="text-gray-400" /></div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0B4D33] rounded-full flex items-center justify-center shadow-lg"><Plus size={14} className="text-white" /></div>
              </div>
              <h3 className="text-base font-bold text-gray-700 mb-1.5">Belum ada foto</h3>
              <p className="text-gray-400 text-sm text-center max-w-xs mb-5">Mulai tambahkan foto ke album ini untuk mendokumentasikan kegiatan</p>
              <button onClick={openUploadView} className="flex items-center gap-2 bg-[#0B4D33] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#093d28] transition-colors">
                <Upload size={16} /> Upload Foto Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {photos.map((photo, index) => (
                <div key={photo.id} className={`group relative overflow-hidden rounded-xl cursor-pointer bg-gray-100 aspect-square ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <img src={photo.imageUrl} alt={photo.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onClick={() => setLightboxImg(photo.imageUrl)} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x200?text=Error'; }} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setLightboxImg(photo.imageUrl)} className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-md"><Eye size={14} /></button>
                    <button onClick={() => setDeleteConfirm({ type: 'photo', id: photo.id })} className="w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300 hover:border-[#0B4D33] hover:text-[#0B4D33] hover:bg-green-50 transition-all cursor-pointer group" onClick={openUploadView}>
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Tambah</span>
              </div>
            </div>
          )}
        </div>

        {lightboxImg && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
            <button className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-10"><X size={24} /></button>
            <img src={lightboxImg} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {showAlbumModal && (
          <AlbumModal editingAlbum={editingAlbum} albumForm={albumForm} setAlbumForm={setAlbumForm} coverPreview={coverPreview} setCoverPreview={setCoverPreview} coverUrl={coverUrl} setCoverUrl={setCoverUrl} uploadingCover={uploadingCover} coverInputRef={coverInputRef} onCoverChange={handleCoverChange} onSubmit={saveAlbum} onClose={() => setShowAlbumModal(false)} />
        )}
        {deleteConfirm && (
          <DeleteModal deleteConfirm={deleteConfirm} isDeleting={isDeleting} onCancel={() => setDeleteConfirm(null)} onConfirm={() => {
            const snap = deleteConfirm;
            if (snap.type === 'album') deleteAlbum(snap.id); else deletePhoto(snap.id);
          }} />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {resultModal && <ResultModal {...resultModal} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Galeri</h2>
          <p className="text-sm text-gray-400 mt-0.5">{galleries.length} album tersedia</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Cari album..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent w-full sm:w-52 text-sm bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`px-3.5 py-2.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><Grid3X3 size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`px-3.5 py-2.5 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><List size={16} /></button>
          </div>
          <button onClick={() => openAlbumModal()} className="bg-[#0B4D33] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#093d28] transition-colors flex items-center justify-center gap-2 text-sm"><Plus size={16} /> Tambah Album</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-[#0B4D33] shrink-0"><FolderOpen size={22} /></div>
          <div>
            <p className="text-3xl font-black text-gray-900">{galleries.length}</p>
            <p className="text-sm font-semibold text-gray-600">Total Album</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 shrink-0"><Images size={22} /></div>
          <div>
            <p className="text-3xl font-black text-gray-900">{galleries.reduce((acc, g) => acc + (g.photos?.length || 0), 0)}</p>
            <p className="text-sm font-semibold text-gray-600">Total Foto</p>
          </div>
        </div>
      </div>

      {filteredAlbums.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><FolderOpen size={36} className="text-gray-300" /></div>
          <p className="text-gray-700 font-bold text-lg">Belum ada album</p>
          <button onClick={() => openAlbumModal()} className="bg-[#0B4D33] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#093d28] transition-colors inline-flex items-center gap-2 text-sm"><Plus size={16} /> Buat Album Pertama</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              <div className="relative w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer shrink-0" style={{ paddingBottom: '56.25%' }} onClick={() => openAlbumDetail(album)}>
                {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="absolute inset-0 flex items-center justify-center"><Images size={36} className="text-gray-300" /></div>}
                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1 font-medium"><Image size={10} /> {album.photos?.length || 0} foto</div>
              </div>
              <div className="p-4 flex-1 cursor-pointer" onClick={() => openAlbumDetail(album)}>
                <h3 className="font-bold text-gray-900 line-clamp-1 mb-0.5">{album.title}</h3>
                {album.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{album.description}</p>}
                <p className="text-xs text-gray-400">{new Date(album.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="border-t border-gray-100 flex shrink-0">
                <button onClick={() => openAlbumDetail(album)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-[#0B4D33] hover:bg-green-50 transition-colors font-semibold"><FolderOpen size={14} /> Lihat Detail</button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => openAlbumModal(album)} className="px-4 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"><Edit size={15} /></button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => setDeleteConfirm({ type: 'album', id: album.id, title: album.title })} className="px-4 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all group cursor-pointer" onClick={() => openAlbumDetail(album)}>
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {album.coverUrl ? <img src={album.coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Images size={22} className="text-gray-300" /></div>}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-gray-900 truncate max-w-full">{album.title}</h3>
                {album.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 break-words leading-relaxed">{album.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{album.photos?.length || 0} foto · {new Date(album.createdAt).toLocaleDateString('id-ID')}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openAlbumModal(album)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16} /></button>
                <button onClick={() => openAlbumDetail(album)} className="p-2.5 text-[#0B4D33] hover:bg-green-50 rounded-xl transition-colors"><FolderOpen size={16} /></button>
                <button onClick={() => setDeleteConfirm({ type: 'album', id: album.id, title: album.title })} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAlbumModal && (
        <AlbumModal editingAlbum={editingAlbum} albumForm={albumForm} setAlbumForm={setAlbumForm} coverPreview={coverPreview} setCoverPreview={setCoverPreview} coverUrl={coverUrl} setCoverUrl={setCoverUrl} uploadingCover={uploadingCover} coverInputRef={coverInputRef} onCoverChange={handleCoverChange} onSubmit={saveAlbum} onClose={() => setShowAlbumModal(false)} />
      )}
      {deleteConfirm && (
        <DeleteModal deleteConfirm={deleteConfirm} isDeleting={isDeleting} onCancel={() => setDeleteConfirm(null)} onConfirm={() => {
          const snap = deleteConfirm;
          if (snap.type === 'album') deleteAlbum(snap.id); else deletePhoto(snap.id);
        }} />
      )}
    </div>
  );
}