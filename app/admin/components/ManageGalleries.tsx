"use client";

import { useState, useRef, useCallback } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  X,
  FolderOpen,
  Images,
  ArrowLeft,
  Image as ImageIcon,
  Grid3X3,
  List,
  Eye,
  Upload,
  Camera,
  CheckCircle2,
  Loader2,
  FileImage,
  CloudUpload,
  Calendar,
  FileQuestion,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "./AlertDialog";

// --- PORTAL & TYPES ---
function FullscreenPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

interface GalleryPhoto { id: number; imageUrl: string; caption?: string; createdAt: string; }
interface Album { id: number; title: string; description?: string; coverUrl?: string; photos?: GalleryPhoto[]; createdAt: string; }
interface ManageGalleriesProps { galleries: Album[]; onGalleriesUpdate: () => void; }
interface PhotoItem { file: File; preview: string; url: string; uploading: boolean; done: boolean; error: boolean; }
type ResultVariant = AlertType;

interface StatusAlertState {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  buttonText?: string;
  detailText?: string;
  isLoading?: boolean;
  disableBackdropClose?: boolean;
  afterClose?: () => void;
}

const defaultStatusAlert: StatusAlertState = {
  open: false,
  type: "info",
  title: "",
  description: "",
};

// --- MAIN COMPONENT ---

export default function ManageGalleries({ galleries, onGalleriesUpdate }: ManageGalleriesProps) {
  // Navigation States
  const [view, setView] = useState<"albums" | "album-detail" | "upload-photos">("albums");
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  // Form States
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumForm, setAlbumForm] = useState({ title: "", description: "" });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Upload States
  const [photoFiles, setPhotoFiles] = useState<PhotoItem[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [statusAlert, setStatusAlert] = useState<StatusAlertState>(defaultStatusAlert);

  // Delete Modal States
  const [deleteModal, setDeleteModal] = useState<{ type: "album" | "photo"; id: number; title: string; message: string; } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingType, setDeletingType] = useState<"album" | "photo" | null>(null);

  // API Config
  const API_ROOT = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const API_BASE_URL = `${API_ROOT}/api/galleries`;
  const UPLOAD_URL = `${API_ROOT}/api/upload`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const authHeader = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

  // --- ALERT HANDLERS (konsisten dengan ManageTruk) ---
  const closeStatusAlert = () => {
    if (statusAlert.isLoading) return;
    const afterClose = statusAlert.afterClose;
    setStatusAlert(defaultStatusAlert);
    afterClose?.();
  };

  const showLoadingAlert = (title: string, description: string) => {
    setStatusAlert({
      ...defaultStatusAlert,
      open: true,
      type: "loading",
      title,
      description,
      isLoading: true,
      disableBackdropClose: true,
    });
  };

  const showResult = (
    variant: ResultVariant,
    title: string,
    message: string,
    afterClose: () => void = () => {}
  ) => {
    setStatusAlert({
      ...defaultStatusAlert,
      open: true,
      type: variant,
      title,
      description: message,
      buttonText: variant === "loading" ? "Memproses..." : "Selesai",
      afterClose,
    });
  };

  const renderStatusAlert = () => (
    <AlertDialog
      open={statusAlert.open}
      type={statusAlert.type}
      title={statusAlert.title}
      description={statusAlert.description}
      buttonText={statusAlert.buttonText}
      detailText={statusAlert.detailText}
      isLoading={statusAlert.isLoading}
      disableBackdropClose={statusAlert.disableBackdropClose}
      onClose={closeStatusAlert}
    />
  );

  // --- UTILS ---
  const resolveImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:image")) return url;
    return `${API_ROOT}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const fd = new FormData(); fd.append("image", file);
    const res = await axios.post(UPLOAD_URL, fd, { headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    return res.data.imageUrl;
  }, [UPLOAD_URL, token]);

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showResult("error", "Format File Salah", "File sampul harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showResult("error", "Ukuran File Terlalu Besar", "Maksimal ukuran cover adalah 5MB.");
      return;
    }

    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      setCoverUrl(await uploadFile(file));
    } catch {
      showResult("error", "Gagal Upload Cover", "Cover gagal diupload. Silakan coba lagi.");
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} bukan gambar`); return false; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} melebihi 5MB`); return false; }
      return true;
    });

    if (!validFiles.length) return;

    setPhotoFiles((prev) => {
      if (prev.length + validFiles.length > 10) { toast.error("Maksimal 10 foto sekaligus!"); return prev; }
      const newItems: PhotoItem[] = validFiles.map((file) => ({ file, preview: URL.createObjectURL(file), url: "", uploading: true, done: false, error: false }));
      
      newItems.forEach((item) => {
        uploadFile(item.file)
          .then((url) => setPhotoFiles((curr) => curr.map((p) => p.preview === item.preview ? { ...p, url, uploading: false, done: true } : p)))
          .catch(() => {
            setPhotoFiles((curr) => curr.map((p) => p.preview === item.preview ? { ...p, uploading: false, error: true } : p));
            toast.error(`Gagal upload ${item.file.name}`);
          });
      });
      return [...prev, ...newItems];
    });
  }, [uploadFile]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  // --- ALBUM & PHOTO CRUD ---
  const openAlbumModal = (album: Album | null = null) => {
    setEditingAlbum(album);
    setAlbumForm({ title: album?.title || "", description: album?.description || "" });
    setCoverPreview(album?.coverUrl ? resolveImageUrl(album.coverUrl) : null);
    setCoverUrl(album?.coverUrl || "");
    setShowAlbumModal(true);
  };

  const saveAlbum = async (e: FormEvent) => {
    e.preventDefault();

    if (!albumForm.title.trim()) {
      showResult("error", "Judul Belum Diisi", "Judul album wajib diisi sebelum data disimpan.");
      return;
    }

    if (uploadingCover) {
      showResult("error", "Cover Masih Diproses", "Tunggu foto sampul selesai diupload terlebih dahulu.");
      return;
    }

    setSavingAlbum(true);
    showLoadingAlert(
      editingAlbum ? "Menyimpan Perubahan" : "Membuat Album",
      "Mohon tunggu, data album sedang diproses."
    );

    try {
      const data = { ...albumForm, coverUrl: coverUrl || null };
      const savedAlbumTitle = albumForm.title.trim();

      if (editingAlbum) {
        await axios.put(`${API_BASE_URL}/albums/${editingAlbum.id}`, data, authHeader);
        setShowAlbumModal(false);
        setEditingAlbum(null);
        showResult(
          "success", // konsisten dengan ManageTruk
          "Album Berhasil Diperbarui",
          `Album "${savedAlbumTitle}" berhasil diperbarui.`,
          onGalleriesUpdate
        );
      } else {
        await axios.post(`${API_BASE_URL}/albums`, data, authHeader);
        setShowAlbumModal(false);
        setEditingAlbum(null);
        showResult(
          "success", // konsisten dengan ManageTruk
          "Album Berhasil Dibuat",
          `Album "${savedAlbumTitle}" berhasil dibuat.`,
          onGalleriesUpdate
        );
      }
    } catch (err: any) {
      showResult(
        "error",
        "Gagal Menyimpan",
        err?.response?.data?.message || "Gagal menyimpan album."
      );
    } finally {
      setSavingAlbum(false);
    }
  };

  const savePhotos = async () => {
    const readyFiles = photoFiles.filter((p) => p.done && p.url);

    if (!readyFiles.length) {
      showResult("error", "Foto Belum Dipilih", "Pilih minimal 1 foto yang berhasil diupload sebelum menyimpan.");
      return;
    }

    if (photoFiles.some((p) => p.uploading)) {
      showResult("error", "Upload Belum Selesai", "Tunggu semua foto selesai diupload terlebih dahulu.");
      return;
    }

    setSavingPhotos(true);
    showLoadingAlert(
      "Menyimpan Foto",
      "Mohon tunggu, foto sedang disimpan ke album."
    );

    try {
      const albumId = selectedAlbum?.id;

      await Promise.all(
        readyFiles.map((p) =>
          axios.post(
            `${API_BASE_URL}/albums/${albumId}/photos`,
            { imageUrl: p.url, caption: "" },
            authHeader
          )
        )
      );

      setPhotoFiles([]);

      try {
        if (albumId) {
          setSelectedAlbum((await axios.get(`${API_BASE_URL}/albums/${albumId}`, authHeader)).data);
        }
      } catch {}

      setView("album-detail");

      showResult(
        "success", // konsisten dengan ManageTruk
        "Foto Berhasil Ditambahkan",
        `${readyFiles.length} foto berhasil ditambahkan ke album.`,
        onGalleriesUpdate
      );
    } catch (err: any) {
      showResult(
        "error",
        "Gagal Upload",
        err.response?.data?.message || "Gagal menyimpan foto."
      );
    } finally {
      setSavingPhotos(false);
    }
  };

  const openAlbumDetail = async (album: Album) => {
    try { setSelectedAlbum((await axios.get(`${API_BASE_URL}/albums/${album.id}`, authHeader)).data); } 
    catch { setSelectedAlbum(album); }
    setView("album-detail");
  };

  // --- DELETE LOGIC & MODALS ---
  const deleteWithFallback = async (url: string) => {
    try { await axios.delete(url, authHeader); } 
    catch (err: any) {
      if ([404, 405, 307, 308].includes(err?.response?.status)) { await axios.delete(`${url}/`, authHeader); return; }
      throw err;
    }
  };

  const openDeleteAlbumModal = (album: Album) => {
    setDeleteModal({ type: "album", id: album.id, title: "Hapus Album?", message: `Album "${album.title}" beserta semua fotonya akan dihapus secara permanen dan tidak dapat dikembalikan.` });
  };

  const openDeletePhotoModal = (photoId: number) => {
    setDeleteModal({ type: "photo", id: photoId, title: "Hapus Foto?", message: "Foto ini akan dihapus secara permanen dari album dan tidak dapat dikembalikan." });
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) return;
    setDeleteModal(null);
  };

  const deleteAlbum = async (id: number) => {
    const targetAlbum = galleries.find((album) => Number(album.id) === Number(id));
    const albumTitle = targetAlbum?.title || selectedAlbum?.title || "Album";

    await deleteWithFallback(`${API_BASE_URL}/albums/${id}`);
    return albumTitle;
  };

  const deletePhoto = async (photoId: number) => {
    const albumId = selectedAlbum?.id;
    await deleteWithFallback(`${API_BASE_URL}/photos/${photoId}`);

    setSelectedAlbum((prev) =>
      prev
        ? {
            ...prev,
            photos: (prev.photos || []).filter(
              (photo) => Number(photo.id) !== Number(photoId)
            ),
          }
        : prev
    );

    try {
      if (albumId) {
        axios
          .get(`${API_BASE_URL}/albums/${albumId}`, authHeader)
          .then((res) => setSelectedAlbum(res.data));
      }
    } catch {}
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    const currentDelete = deleteModal;
    setDeletingId(currentDelete.id);
    setDeletingType(currentDelete.type);

    try {
      if (currentDelete.type === "album") {
        const albumTitle = await deleteAlbum(currentDelete.id);

        setDeleteModal(null);
        setSelectedAlbum(null);
        setView("albums");

        // ✅ PERUBAHAN: tipe "delete" → "success" agar konsisten dengan ManageTruk
        showResult(
          "success",
          "Album Berhasil Dihapus",
          `Album "${albumTitle}" telah dihapus secara permanen.`,
          onGalleriesUpdate
        );
      } else {
        await deletePhoto(currentDelete.id);

        setDeleteModal(null);

        // ✅ PERUBAHAN: tipe "delete" → "success"
        showResult(
          "success",
          "Foto Berhasil Dihapus",
          "Foto berhasil dihapus dari album.",
          onGalleriesUpdate
        );
      }
    } catch (err: any) {
      setDeleteModal(null);
      showResult(
        "error",
        "Gagal Menghapus",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Terjadi kesalahan saat menghapus data."
      );
    } finally {
      setDeletingId(null);
      setDeletingType(null);
    }
  };

  const renderDeleteModal = () => (
    <AlertDialog
      open={!!deleteModal}
      type="delete"
      title={deleteModal?.title || "Hapus Data?"}
      description={deleteModal?.message || "Data yang dihapus tidak dapat dikembalikan."}
      detailText="Pastikan data yang dipilih sudah benar sebelum menghapus."
      showCancelButton
      cancelText="Batal"
      buttonText="Hapus"
      isLoading={deletingId !== null}
      disableBackdropClose={deletingId !== null}
      onConfirm={confirmDelete}
      onClose={closeDeleteModal}
    />
  );

  const renderAlbumModal = () => (
    <FullscreenPortal>
      <AnimatePresence>
        {showAlbumModal && (
          <div className="fixed inset-0 w-screen h-screen min-h-screen z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-extrabold text-xl text-gray-900">{editingAlbum ? "Edit Album" : "Buat Album Baru"}</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Lengkapi form di bawah untuk mengatur galeri.</p>
                </div>
                <button type="button" onClick={() => setShowAlbumModal(false)} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={saveAlbum} className="p-8 space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nama Album</label>
                  <input type="text" required value={albumForm.title} onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })} placeholder="Contoh: Kegiatan Sosialisasi 2026" className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Foto Sampul</label>
                  <div className="relative w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-[#4A6D55] hover:bg-green-50/30 transition-all flex flex-col items-center justify-center min-h-[200px]" onClick={() => !uploadingCover && coverInputRef.current?.click()}>
                    {coverPreview ? (
                      <>
                        <img src={coverPreview} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-black/20" />
                        {coverUrl && !uploadingCover && (<div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={14} /> Terupload</div>)}
                        {uploadingCover && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2 text-white"><Loader2 size={32} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Mengunggah...</span></div>
                          </div>
                        )}
                        <div className="relative z-10 flex gap-2 mt-12">
                          <button type="button" onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }} className="bg-white/90 backdrop-blur-md text-gray-800 px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"><ImageIcon size={14} /> Ganti</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(""); }} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"><X size={14} /> Hapus</button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center mb-2"><ImageIcon size={24} className="text-gray-400" /></div>
                        <span className="text-sm font-bold text-gray-600">Pilih File Sampul</span>
                        <span className="text-xs font-medium text-gray-400">Maksimal 5MB JPG/PNG/WEBP</span>
                      </div>
                    )}
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Deskripsi Album</label>
                  <textarea value={albumForm.description} onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })} rows={4} placeholder="Tuliskan deskripsi singkat..." className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm leading-relaxed outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 resize-none shadow-sm" />
                </div>
                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={() => setShowAlbumModal(false)} className="flex-1 py-4 rounded-xl text-gray-600 bg-gray-100 font-bold hover:bg-gray-200 transition-all">Batal</button>
                  <button type="submit" disabled={uploadingCover || savingAlbum} className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#3a5643] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                    {savingAlbum ? <><Loader2 className="animate-spin" size={20} /> Menyimpan...</> : uploadingCover ? <><Loader2 className="animate-spin" size={20} /> Mengunggah...</> : editingAlbum ? "Simpan Perubahan" : "Buat Album"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FullscreenPortal>
  );

  const filteredAlbums = galleries.filter((a) => a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || a.description?.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- RENDER VIEW 3: UPLOAD PHOTOS ---
  if (view === "upload-photos" && selectedAlbum) {
    const doneCount = photoFiles.filter((p) => p.done).length;
    const uploadingCount = photoFiles.filter((p) => p.uploading).length;
    const totalSizeMB = (photoFiles.reduce((acc, p) => acc + (p.file?.size || 0), 0) / (1024 * 1024)).toFixed(1);

    return (
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
        <Toaster position="top-right" />
        {renderStatusAlert()}

        <div className="bg-white rounded-3xl shadow-sm p-6 min-h-[600px] border border-gray-100">
          <div className="pb-4 border-b border-gray-100 flex items-center gap-4 mb-6">
            <button type="button" onClick={() => { setView("album-detail"); setPhotoFiles([]); }} className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors"><ArrowLeft size={20} /></button>
            <div><span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Upload ke Album</span><h2 className="text-xl font-extrabold text-gray-900 truncate max-w-md">{selectedAlbum.title}</h2></div>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => photoInputRef.current?.click()} className={`border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all h-96 bg-gray-50 ${isDragging ? "border-[#4A6D55] bg-green-50/30 scale-[1.01]" : "border-gray-200 hover:border-[#4A6D55] hover:bg-green-50/30"}`}>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400"><CloudUpload size={40} className={isDragging ? "text-[#4A6D55]" : ""} /></div>
                <div className="text-center px-6"><p className="text-xl font-bold text-gray-800">Tarik & Lepas Foto Di Sini</p><p className="text-sm font-medium text-gray-500 mt-2">Mendukung JPG, PNG, WEBP · Maks 5MB/foto · Maks 10 foto.</p></div>
                <button type="button" className="mt-4 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}><FolderOpen size={16} /> Pilih Dari Perangkat</button>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
            </div>
            <div className="w-full lg:w-96 shrink-0">
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden flex flex-col h-full max-h-[500px] shadow-sm">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Antrean Upload</span>
                  {photoFiles.length > 0 && (<span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-bold">{photoFiles.length} File</span>)}
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-gray-50/50">
                  {photoFiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><FileImage size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm font-bold">Belum ada foto yang dipilih</p></div>
                  ) : (
                    photoFiles.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                          <img src={item.preview} alt="" className="w-full h-full object-cover" />
                          {item.uploading && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"><Loader2 size={16} className="text-white animate-spin" /></div>}
                          {item.error && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center"><X size={16} className="text-white" /></div>}
                          {item.done && <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"><CheckCircle2 size={10} className="text-white" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate mb-1.5">{item.file.name}</p>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${item.error ? "bg-red-400 w-full" : item.done ? "bg-[#4A6D55] w-full" : "bg-blue-400 w-2/3 animate-pulse"}`} />
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">{item.error ? "Gagal Upload" : item.done ? "Selesai" : "Sedang Upload..."}</p>
                        </div>
                        {!item.uploading && (<button type="button" onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))} className="p-2 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>)}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-5 bg-white border-t border-gray-100 space-y-4">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider"><span>Total Ukuran</span><span className="text-[#4A6D55]">{totalSizeMB} MB</span></div>
                  <button type="button" onClick={savePhotos} disabled={doneCount === 0 || savingPhotos || uploadingCount > 0} className="w-full py-3.5 bg-[#4A6D55] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#3a5643] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {savingPhotos ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : uploadingCount > 0 ? <><Loader2 size={18} className="animate-spin" /> Menunggu Upload</> : `Simpan ${doneCount > 0 ? `${doneCount} ` : ""}Foto`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER VIEW 2: ALBUM DETAIL ---
  if (view === "album-detail" && selectedAlbum) {
    const photos = selectedAlbum.photos || [];
    return (
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
        <Toaster position="top-right" />
        {renderStatusAlert()}
        {renderAlbumModal()}
        {renderDeleteModal()}

        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <button type="button" onClick={() => setView("albums")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-bold text-sm shadow-sm border border-gray-200"><ArrowLeft size={16} /> Kembali ke Galeri</button>
            <button type="button" onClick={() => openAlbumModal(selectedAlbum)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"><Edit size={16} /> Edit Detail Album</button>
          </div>
          <div className="relative w-full bg-gray-100 overflow-hidden" style={{ height: "360px" }}>
            {selectedAlbum.coverUrl ? <img src={resolveImageUrl(selectedAlbum.coverUrl)} alt={selectedAlbum.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB] flex items-center justify-center"><Images size={80} className="text-[#4A6D55]/30" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E35]/90 via-[#1A2E35]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase inline-block mb-3 border border-white/20">Detail Album</span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-md tracking-tight">{selectedAlbum.title}</h1>
              {selectedAlbum.description && <p className="text-white/80 font-medium text-sm md:text-base mt-4 max-w-3xl leading-relaxed">{selectedAlbum.description}</p>}
            </div>
          </div>
          <div className="p-6 md:p-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="text-center sm:text-left"><h2 className="text-2xl font-extrabold text-gray-900">Koleksi Foto</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{photos.length} Media Tersimpan</p></div>
              {photos.length > 0 && (<button type="button" onClick={() => setView("upload-photos")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4A6D55] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#3a5643] transition-colors hover:-translate-y-0.5"><Plus size={18} /> Tambah Foto</button>)}
            </div>
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-gray-200 border-dashed">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 relative text-gray-300"><Camera size={32} /><div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#4A6D55] rounded-full flex items-center justify-center shadow-md border-2 border-white"><Plus size={16} className="text-white" /></div></div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Album Masih Kosong</h3>
                <p className="text-gray-500 text-sm text-center max-w-sm mb-6">Mulai tambahkan foto untuk mendokumentasikan kegiatan ke dalam album ini.</p>
                <button type="button" onClick={() => setView("upload-photos")} className="flex items-center justify-center gap-2 bg-[#4A6D55] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-[#3a5643] transition-all hover:-translate-y-0.5"><Upload size={18} /> Upload Foto Pertama</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className={`group relative overflow-hidden rounded-2xl bg-gray-100 aspect-square shadow-sm hover:shadow-lg transition-all ${index === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <img src={resolveImageUrl(photo.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x400?text=Error"; }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      <button type="button" onClick={() => setLightboxImg(resolveImageUrl(photo.imageUrl))} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 hover:scale-110 transition-all shadow-lg"><Eye size={18} /></button>
                      <button type="button" disabled={deletingType === "photo" && deletingId === photo.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeletePhotoModal(photo.id); }} className="w-10 h-10 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:scale-110 hover:bg-red-500 transition-all shadow-lg disabled:opacity-50">
                        {deletingType === "photo" && deletingId === photo.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#4A6D55] hover:text-[#4A6D55] hover:bg-[#DDE9E1]/30 transition-all cursor-pointer group bg-gray-50" onClick={() => setView("upload-photos")}>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                  <span className="text-xs font-bold mt-1">Tambah Foto</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {lightboxImg && (
            <FullscreenPortal>
              <div className="fixed inset-0 w-screen h-screen min-h-screen bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }} className="absolute -top-12 right-0 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-10"><X size={24} /></button>
                  <img src={lightboxImg} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </motion.div>
              </div>
            </FullscreenPortal>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- RENDER VIEW 1: ALBUMS LIST ---
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
      <Toaster position="top-right" />
      {renderStatusAlert()}
      {renderAlbumModal()}
      {renderDeleteModal()}

      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-3xl p-8 shadow-sm border border-white/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/80 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-4 shadow-sm backdrop-blur-sm">Dokumentasi & Media</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Galeri</h1>
            <p className="text-[#5B7078] mt-2 text-sm md:text-base font-medium max-w-xl">Kelola album dan koleksi foto dokumentasi sistem secara terpusat.</p>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none"><Images size={200} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="p-4 rounded-xl bg-indigo-50 text-indigo-600"><FolderOpen size={26} strokeWidth={2.5} /></div>
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Album</p><p className="text-2xl font-black text-gray-800 leading-none">{galleries.length}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="p-4 rounded-xl bg-blue-50 text-blue-600"><Images size={26} strokeWidth={2.5} /></div>
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Foto</p><p className="text-2xl font-black text-gray-800 leading-none">{galleries.reduce((acc, gallery) => acc + (gallery.photos?.length || 0), 0)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center sticky top-4 z-40">
        <div className="flex-1 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari nama atau deskripsi album..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder-gray-400" />
          </div>
        </div>
        <div className="h-px bg-gray-100 lg:h-8 lg:w-px mx-2" />
        <div className="flex flex-col sm:flex-row items-center gap-3 px-2 pb-2 lg:pb-0">
          <div className="hidden sm:flex bg-gray-50 p-1 rounded-xl">
            <button type="button" onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}><Grid3X3 size={18} /></button>
            <button type="button" onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}><List size={18} /></button>
          </div>
          <button type="button" onClick={() => openAlbumModal()} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A6D55] text-white text-sm font-bold shadow-md hover:bg-[#3a5643] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"><Plus size={18} /> Tambah Album</button>
        </div>
      </div>

      {filteredAlbums.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-20 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-300"><FileQuestion size={40} /></div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Album</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">Mungkin pencarian Anda tidak cocok, atau Anda belum membuat album sama sekali.</p>
          <button type="button" onClick={() => openAlbumModal()} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"><Plus size={18} /> Buat Album Baru</button>
        </motion.div>
      ) : viewMode === "grid" ? (
        <AnimatePresence mode="wait">
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlbums.map((album) => (
              <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={album.id} className="bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 group flex flex-col rounded-3xl">
                <div className="relative overflow-hidden bg-gray-100 shrink-0 aspect-video w-full cursor-pointer" onClick={() => openAlbumDetail(album)}>
                  {album.coverUrl ? <img src={resolveImageUrl(album.coverUrl)} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]"><Images size={40} className="text-[#4A6D55]/30" /></div>}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wide shadow-sm border border-gray-200 text-gray-700"><ImageIcon size={12} /> {album.photos?.length || 0} Foto</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3"><span className="flex items-center gap-1"><Calendar size={13} className="text-gray-300" /> {new Date(album.createdAt).toLocaleDateString("id-ID")}</span></div>
                  <h3 className="font-extrabold text-gray-900 leading-snug group-hover:text-[#4A6D55] text-lg mb-2 line-clamp-2 cursor-pointer transition-colors" onClick={() => openAlbumDetail(album)}>{album.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm line-clamp-2 mb-6 flex-1">{album.description || <span className="italic text-gray-300">Tanpa deskripsi...</span>}</p>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <button type="button" onClick={(e) => { e.stopPropagation(); openAlbumDetail(album); }} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold transition-colors flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs flex-1 mr-2"><FolderOpen size={14} /> Buka Detail</button>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openAlbumModal(album); }} className="text-gray-500 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors p-2.5 rounded-xl"><Edit size={14} /></button>
                      <button type="button" disabled={deletingType === "album" && deletingId === album.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteAlbumModal(album); }} className="text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors p-2.5 rounded-xl disabled:opacity-50">
                        {deletingType === "album" && deletingId === album.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div layout className="flex flex-col gap-3.5">
            {filteredAlbums.map((album) => (
              <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={album.id} className="bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 group flex flex-col sm:flex-row p-3 gap-4 rounded-2xl items-center cursor-pointer" onClick={() => openAlbumDetail(album)}>
                <div className="relative overflow-hidden bg-gray-100 shrink-0 aspect-video w-full sm:w-48 rounded-xl">
                  {album.coverUrl ? <img src={resolveImageUrl(album.coverUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]"><Images size={24} className="text-[#4A6D55]/40" /></div>}
                </div>
                <div className="flex-1 flex flex-col min-w-0 w-full py-1 pr-2">
                  <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-300" /> {new Date(album.createdAt).toLocaleDateString("id-ID")}</span>
                    <span className="flex items-center gap-1 text-[#4A6D55] bg-green-50 px-2 py-0.5 rounded-md border border-green-100"><ImageIcon size={12} /> {album.photos?.length || 0} Foto</span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 leading-snug group-hover:text-[#4A6D55] text-base mb-1.5 line-clamp-1 sm:line-clamp-2 transition-colors">{album.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-[13px] line-clamp-2">{album.description || <span className="italic text-gray-300">Tanpa deskripsi...</span>}</p>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0 pt-4 sm:pt-0 border-t sm:border-none border-gray-50 mt-2 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openAlbumDetail(album); }} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold transition-colors py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-2"><FolderOpen size={14} /> Detail</button>
                  <div className="hidden sm:block w-px h-6 bg-gray-100 mx-1" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); openAlbumModal(album); }} className="text-gray-500 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors p-1.5 rounded-lg"><Edit size={14} /></button>
                  <button type="button" disabled={deletingType === "album" && deletingId === album.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteAlbumModal(album); }} className="text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors p-1.5 rounded-lg disabled:opacity-50">
                    {deletingType === "album" && deletingId === album.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}