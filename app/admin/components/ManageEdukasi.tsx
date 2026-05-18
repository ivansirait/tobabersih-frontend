'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Upload,
  Loader2,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react';

type MediaType = 'IMAGE' | 'VIDEO';

type ToastType = 'success' | 'error' | 'info';

type EdukasiItem = {
  id: number;
  judul: string;
  deskripsi?: string | null;
  mediaUrl: string;
  mediaType: MediaType;
  createdAt?: string;
};

type ResultModalProps = {
  variant: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
};

function Toast({ message, type }: { message: string; type: ToastType }) {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-semibold text-white ${bgColor}`}>
      <Icon size={18} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ResultModal({ variant, title, message, onClose }: ResultModalProps) {
  const isSuccess = variant === 'success';
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div
          className={`px-6 pt-8 pb-6 text-center relative overflow-hidden ${
            isSuccess ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30 relative z-10">
            {isSuccess ? <CheckCircle2 size={40} className="text-white" /> : <AlertTriangle size={40} className="text-white" />}
          </div>
          <h3 className="text-xl font-black text-white relative z-10">{title}</h3>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>
          <button
            onClick={onClose}
            className={`w-full px-4 py-3 text-white rounded-xl font-bold text-sm transition-colors ${
              isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

type MediaPreview = {
  url: string;
  type: MediaType;
};

type EdukasiModalProps = {
  editing: EdukasiItem | null;
  judul: string;
  deskripsi: string;
  preview: MediaPreview | null;
  uploading: boolean;
  onChangeJudul: (v: string) => void;
  onChangeDeskripsi: (v: string) => void;
  onChooseFile: (file: File) => Promise<void>;
  onSubmit: () => Promise<void>;
  onClose: () => void;
};

function EdukasiModal({
  editing,
  judul,
  deskripsi,
  preview,
  uploading,
  onChangeJudul,
  onChangeDeskripsi,
  onChooseFile,
  onSubmit,
  onClose,
}: EdukasiModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChooseFile(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0B4D33] px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{editing ? 'Edit Edukasi' : 'Buat Edukasi Baru'}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Judul Edukasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={judul}
              onChange={(e) => onChangeJudul(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
              placeholder="Contoh: Cara Membuang Sampah yang Benar"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Media (Foto/Video) <span className="text-red-500">*</span></label>
            <div
              className="relative w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#0B4D33] hover:bg-green-50 transition-all"
              style={{ paddingBottom: '56.25%' }}
              onClick={() => !uploading && fileRef.current?.click()}
            >
              {preview ? (
                <>
                  {preview.type === 'IMAGE' ? (
                    <img src={preview.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                      <video src={preview.url} className="w-full h-full object-cover" controls={false} muted />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />

                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                    {preview.type === 'IMAGE' ? <ImageIcon size={14} /> : <VideoIcon size={14} />}
                    {preview.type}
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 size={28} className="animate-spin" />
                        <span className="text-sm font-medium">Mengupload...</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // clearing handled outside via setting null
                      }}
                      className="hidden"
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center">
                    <Upload size={22} className="text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold">Pilih Foto/Video</span>
                  <span className="text-xs text-gray-300">Maks 5MB • Format: image/* atau video/*</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handlePick} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label>
            <textarea
              value={deskripsi}
              onChange={(e) => onChangeDeskripsi(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors resize-none"
              placeholder="Deskripsi edukasi...
"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={uploading}
              className="flex-1 px-4 py-3 bg-[#0B4D33] text-white rounded-xl text-sm font-bold hover:bg-[#093d28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : editing ? 'Simpan Perubahan' : 'Buat Edukasi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageEdukasi() {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [search, setSearch] = useState('');

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [result, setResult] = useState<{
    variant: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const showResult = (variant: 'success' | 'error', title: string, message: string) => {
    setResult({ variant, title, message });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EdukasiItem | null>(null);

  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<EdukasiItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : { headers: {} };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/edukasi` : 'http://localhost:5000/api/edukasi';

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    // backend multer field name = image
    fd.append('image', file);
    const res = await axios.post('http://localhost:5000/api/upload', fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data.imageUrl;
  };

  const refresh = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/`, authHeader);
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((x) => x.judul?.toLowerCase().includes(search.toLowerCase()));

  const openModal = (item: EdukasiItem | null = null) => {
    setEditing(item);
    setJudul(item?.judul || '');
    setDeskripsi(item?.deskripsi || '');
    setMediaPreview(item ? { url: item.mediaUrl, type: item.mediaType } : null);
    setMediaUrl(item?.mediaUrl || '');
    setModalOpen(true);
  };

  const chooseFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('File harus berupa gambar atau video', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maksimal ukuran file 5MB', 'error');
      return;
    }

    const type: MediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    setMediaPreview({ url: URL.createObjectURL(file), type });
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setMediaUrl(url);
      showToast('Upload berhasil', 'success');
    } catch {
      showToast('Gagal upload media', 'error');
      setMediaUrl('');
      setMediaPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!judul.trim()) {
      showToast('Judul wajib diisi', 'error');
      return;
    }
    if (!mediaUrl || !mediaPreview) {
      showToast('Media wajib diupload', 'error');
      return;
    }

    const normalizedMediaType = String(mediaPreview.type).toUpperCase() as 'IMAGE' | 'VIDEO';

    const payload = {
      judul: judul.trim(),
      deskripsi: deskripsi.trim() ? deskripsi.trim() : null,
      mediaUrl,
      mediaType: normalizedMediaType,
    };

    try {
      if (editing) {
        await axios.put(`${API_BASE_URL}/${editing.id}`, payload, authHeader);
        setModalOpen(false);
        showResult('success', 'Edukasi Diperbarui!', 'Data edukasi berhasil diperbarui.');
      } else {
        await axios.post(`${API_BASE_URL}/`, payload, authHeader);
        setModalOpen(false);
        showResult('success', 'Edukasi Dibuat!', 'Data edukasi berhasil dibuat.');
      }

      setTimeout(() => {
        setResult(null);
        refresh();
      }, 800);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal menyimpan edukasi.';
      showResult('error', 'Gagal Menyimpan', msg);
    }
  };

  const remove = async (item: EdukasiItem) => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/${item.id}`, authHeader);
      setDeleteConfirm(null);
      setIsDeleting(false);
      showResult('success', 'Dihapus!', 'Edukasi berhasil dihapus.');
      setTimeout(() => {
        setResult(null);
        refresh();
      }, 800);
    } catch (err: any) {
      setIsDeleting(false);
      showResult('error', 'Gagal Menghapus', err?.response?.data?.message || 'Terjadi kesalahan.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {result && (
        <ResultModal
          variant={result.variant}
          title={result.title}
          message={result.message}
          onClose={() => setResult(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Edukasi</h2>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} edukasi tersedia</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Cari edukasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B4D33] focus:border-transparent w-full sm:w-52 text-sm bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          <button
            onClick={() => openModal(null)}
            className="bg-[#0B4D33] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#093d28] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} /> Tambah Edukasi
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-bold text-lg">Belum ada edukasi</p>
          <button
            onClick={() => openModal(null)}
            className="bg-[#0B4D33] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#093d28] transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Buat Edukasi Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((x) => (
            <div key={x.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
              <div className="relative w-full bg-gray-100" style={{ paddingBottom: '56.25%' }}>
                {x.mediaType === 'IMAGE' ? (
                  <img src={x.mediaUrl} alt={x.judul} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <video src={x.mediaUrl} className="absolute inset-0 w-full h-full object-cover" muted controls={false} />
                )}
                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1 font-medium">
                  {x.mediaType === 'IMAGE' ? <ImageIcon size={10} /> : <VideoIcon size={10} />}
                  {x.mediaType}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 line-clamp-1">{x.judul}</h3>
                {x.deskripsi ? <p className="text-xs text-gray-500 mt-1 line-clamp-2">{x.deskripsi}</p> : <p className="text-xs text-gray-400 mt-1">(Tanpa deskripsi)</p>}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openModal(x)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors text-sm font-semibold"
                  >
                    <Edit size={16} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(x)}
                    className="w-11 flex items-center justify-center px-2 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    aria-label="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <EdukasiModal
          editing={editing}
          judul={judul}
          deskripsi={deskripsi}
          preview={mediaPreview}
          uploading={uploading}
          onChangeJudul={setJudul}
          onChangeDeskripsi={setDeskripsi}
          onChooseFile={chooseFile}
          onSubmit={submit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 px-5 py-6 text-center relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/30 relative z-10">
                <Trash2 size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-white relative z-10">Hapus Edukasi?</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-6">
                "{deleteConfirm.judul}" akan dihapus permanen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => remove(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Menghapus...
                    </>
                  ) : (
                    'Ya, Hapus'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

