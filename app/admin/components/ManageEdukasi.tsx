"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "./AlertDialog";
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
  GraduationCap,
  PlaySquare,
  Library,
  Eye,
  Grid3X3,
  List,
  Calendar,
  User,
  BookOpen,
} from "lucide-react";

type MediaType = "IMAGE" | "VIDEO";
type ViewMode = "GRID" | "LIST";

type AlertConfig = {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
};

type DeleteConfirmState = {
  open: boolean;
  item: EdukasiItem | null;
};

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
  judul: "",
  deskripsi: "",
  mediaUrl: "",
};

export default function ManageEdukasi() {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  // Alert global (success, error, info, edit, create)
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    open: false,
    type: "info",
    title: "",
    description: "",
  });

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    item: null,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EdukasiItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<EdukasiItem | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Partial<typeof INITIAL_FORM>>({});
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const authHeader = useMemo(() => {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : { headers: {} };
  }, [token]);

  const apiRoot = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const API_BASE_URL = `${apiRoot}/api/edukasi`;
  const UPLOAD_URL = `${apiRoot}/api/upload`;

  // ========== ALERT HELPERS (sama persis dengan ManageTruk) ==========
  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({ open: true, type, title, description, detailText });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, open: false }));
  };

  // ========== FETCH DATA ==========
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/`, authHeader);
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error: any) {
      showAlert("error", "Gagal memuat data", error?.response?.data?.message || "Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      gambar: items.filter((p) => p.mediaType === "IMAGE").length,
      video: items.filter((p) => p.mediaType === "VIDEO").length,
    }),
    [items]
  );

  const filtered = items.filter((x) => x.judul?.toLowerCase().includes(search.toLowerCase()));

  // ========== FORM HANDLERS ==========
  const resetForm = () => {
    setEditingItem(null);
    setFormData({ ...INITIAL_FORM });
    setFormErrors({});
    setMediaPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openModal = (item: EdukasiItem | null = null) => {
    setFormErrors({});
    if (item) {
      setEditingItem(item);
      setFormData({
        judul: item.judul || "",
        deskripsi: item.deskripsi || "",
        mediaUrl: item.mediaUrl || "",
      });
      setMediaPreview({ url: item.mediaUrl, type: item.mediaType });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const openDetailModal = (item: EdukasiItem) => {
    setViewingItem(item);
    setShowDetailModal(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await axios.post(UPLOAD_URL, fd, {
      headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return res.data.imageUrl;
  };

  const chooseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showAlert("error", "Format tidak valid", "File harus berupa gambar atau video.");
      e.target.value = "";
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      showAlert("error", "Ukuran terlalu besar", "Maksimal ukuran file 1GB.");
      e.target.value = "";
      return;
    }

    const type: MediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
    setMediaPreview({ url: URL.createObjectURL(file), type });
    setUploading(true);

    try {
      const url = await uploadFile(file);
      setFormData((prev) => ({ ...prev, mediaUrl: url }));
      setFormErrors((prev) => ({ ...prev, mediaUrl: "" }));
    } catch (error: any) {
      showAlert("error", "Upload gagal", error?.response?.data?.message || "Gagal mengunggah media.");
      setFormData((prev) => ({ ...prev, mediaUrl: "" }));
      setMediaPreview(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const validateForm = () => {
    const errors: Partial<typeof INITIAL_FORM> = {};
    if (!formData.judul.trim()) errors.judul = "Judul wajib diisi";
    if (!formData.deskripsi.trim()) errors.deskripsi = "Deskripsi wajib diisi";
    if (!formData.mediaUrl || !mediaPreview) errors.mediaUrl = "Media wajib diunggah";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showAlert("error", "Validasi gagal", Object.values(errors)[0] || "Lengkapi semua field.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const isEdit = Boolean(editingItem);
    const targetTitle = formData.judul.trim();
    const normalizedMediaType = mediaPreview?.type.toUpperCase() as "IMAGE" | "VIDEO";

    const payload = {
      judul: targetTitle,
      deskripsi: formData.deskripsi.trim(),
      mediaUrl: formData.mediaUrl,
      mediaType: normalizedMediaType,
    };

    setSubmitting(true);

    try {
      if (editingItem) {
        await axios.put(`${API_BASE_URL}/${editingItem.id}`, payload, authHeader);
      } else {
        await axios.post(`${API_BASE_URL}/`, payload, authHeader);
      }

      closeModal();
      setSubmitting(false);

      showAlert(
        isEdit ? "edit" : "create",
        isEdit ? "Edukasi berhasil diperbarui" : "Edukasi berhasil ditambahkan",
        `${targetTitle} telah ${isEdit ? "diperbarui" : "ditambahkan"} ke sistem.`
      );
      fetchItems();
    } catch (error: any) {
      setSubmitting(false);
      showAlert(
        "error",
        "Gagal menyimpan",
        error?.response?.data?.message || "Terjadi kesalahan saat menyimpan data.",
        error?.response?.data?.error
      );
    }
  };

  // ========== DELETE HANDLERS (sama persis dengan ManageTruk) ==========
  const openDeleteConfirm = (item: EdukasiItem) => {
    setDeleteConfirm({ open: true, item });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, item: null });
  };

  const handleDelete = async () => {
    const target = deleteConfirm.item;
    if (!target) return;

    const id = target.id;
    const targetTitle = target.judul;

    setDeletingId(id);
    setSubmitting(true);
    closeDeleteConfirm();

    try {
      await axios.delete(`${API_BASE_URL}/${id}`, authHeader);

      setItems((prev) => prev.filter((item) => item.id !== id));

      if (viewingItem?.id === id) {
        setShowDetailModal(false);
        setViewingItem(null);
      }
      if (editingItem?.id === id) closeModal();

      setSubmitting(false);
      // ★ Menggunakan type "success" seperti di ManageTruk
      showAlert("success", "Data berhasil dihapus", `Konten "${targetTitle}" telah dihapus dari sistem.`);
      fetchItems();
    } catch (error: any) {
      setSubmitting(false);
      showAlert(
        "error",
        "Gagal menghapus",
        error?.response?.data?.message || "Terjadi kesalahan saat menghapus data.",
        error?.response?.data?.error
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
      {/* ========== ALERT DIALOGS (pola ManageTruk) ========== */}

      {/* 1. Global Alert (success, error, info, edit, create, delete success) */}
      <AlertDialog
        open={alertConfig.open}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
        detailText={alertConfig.detailText}
        onClose={closeAlert}
      />

      {/* 2. Loading Alert (saat submit atau delete) */}
      <AlertDialog
        open={submitting}
        type="loading"
        title="Mohon Tunggu"
        description="Sedang memproses permintaan Anda ke server..."
        isLoading={true}
        disableBackdropClose={true}
        onClose={() => {}}
      />

      {/* 3. Delete Confirmation Alert */}
      <AlertDialog
        open={deleteConfirm.open}
        type="delete"
        title="Yakin Hapus Edukasi?"
        description={deleteConfirm.item ? `Konten "${deleteConfirm.item.judul}" akan dihapus secara permanen.` : "Konten akan dihapus dari sistem."}
        buttonText="Hapus"
        cancelText="Batal"
        showCancelButton={true}
        onConfirm={handleDelete}
        onClose={closeDeleteConfirm}
      />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-3xl p-8 shadow-sm border border-white/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/80 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-4 shadow-sm backdrop-blur-sm">
              Modul Pembelajaran
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A2E35] tracking-tight">
              Manajemen Edukasi
            </h1>
            <p className="text-[#5B7078] mt-2 text-sm md:text-base font-medium max-w-xl">
              Kelola materi pembelajaran, video, dan panduan edukasi untuk pengguna dengan mudah.
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <BookOpen size={200} />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Materi", val: stats.total, icon: Library, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          { label: "Materi Video", val: stats.video, icon: PlaySquare, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Materi Gambar", val: stats.gambar, icon: ImageIcon, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ].map((s, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${s.border} flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}><s.icon size={26} strokeWidth={2.5} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & ACTIONS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center sticky top-4 z-40">
        <div className="flex-1 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari judul edukasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="h-px bg-gray-100 lg:h-8 lg:w-px mx-2"></div>
        <div className="flex flex-col sm:flex-row items-center gap-3 px-2 pb-2 lg:pb-0">
          <div className="hidden sm:flex bg-gray-50 p-1 rounded-xl">
            <button type="button" onClick={() => setViewMode("GRID")} className={`p-2 rounded-lg transition-all ${viewMode === "GRID" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}><Grid3X3 size={18} /></button>
            <button type="button" onClick={() => setViewMode("LIST")} className={`p-2 rounded-lg transition-all ${viewMode === "LIST" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}><List size={18} /></button>
          </div>
          <button type="button" onClick={() => openModal()} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A6D55] text-white text-sm font-bold shadow-md hover:bg-[#3a5643] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Tambah Edukasi
          </button>
        </div>
      </div>

      {/* LIST / GRID VIEW */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-gray-400">
            <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
            <p className="italic font-medium text-sm">Memuat data edukasi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="py-20 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-300"><GraduationCap size={40} /></div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Belum ada materi edukasi</h3>
            <p className="text-gray-500 text-sm max-w-sm mb-6">Tambahkan konten edukasi pertama Anda untuk membagikan informasi bermanfaat.</p>
            <button type="button" onClick={() => openModal()} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Plus size={16} /> Buat Edukasi Pertama
            </button>
          </motion.div>
        ) : (
          <motion.div layout className={viewMode === "GRID" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-3.5"}>
            {filtered.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                className={`bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 group ${viewMode === "LIST" ? "flex flex-col sm:flex-row p-3 gap-4 rounded-2xl items-center" : "flex flex-col rounded-3xl"}`}
              >
                <div className={`relative overflow-hidden bg-gray-100 shrink-0 ${viewMode === "GRID" ? "aspect-video w-full" : "aspect-video w-full sm:w-48 rounded-xl"}`}>
                  {item.mediaType === "IMAGE" ? (
                    <img src={item.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" alt={item.judul} onError={(e) => ((e.target as HTMLImageElement).src = "https://via.placeholder.com/600x400?text=No+Image")} />
                  ) : (
                    <video src={item.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" muted />
                  )}
                  <div className={`absolute left-2.5 z-10 ${viewMode === "GRID" ? "top-3" : "top-2.5"}`}>
                    <span className={`inline-flex items-center gap-1.5 rounded-md font-bold bg-white/95 backdrop-blur-sm shadow-sm uppercase tracking-wide border px-2 py-0.5 text-[10px] ${item.mediaType === "IMAGE" ? "text-emerald-700 border-emerald-200" : "text-blue-700 border-blue-200"}`}>
                      {item.mediaType === "IMAGE" ? <ImageIcon size={10} /> : <VideoIcon size={10} />}
                      {item.mediaType}
                    </span>
                  </div>
                </div>
                <div className={`flex-1 flex flex-col min-w-0 w-full ${viewMode === "GRID" ? "p-6" : "py-1 pr-2"}`}>
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider ${viewMode === "GRID" ? "mb-3" : "mb-1.5"}`}>
                    <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-300" />{new Date(item.createdAt || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="flex items-center gap-1"><User size={13} className="text-gray-300" />Admin</span>
                  </div>
                  <h3 className={`font-extrabold text-gray-900 leading-snug group-hover:text-[#4A6D55] transition-colors ${viewMode === "GRID" ? "text-lg mb-2 line-clamp-2" : "text-base mb-1.5 line-clamp-1 sm:line-clamp-2"}`}>
                    {item.judul}
                  </h3>
                  <p className={`text-gray-500 leading-relaxed ${viewMode === "GRID" ? "text-sm line-clamp-2 mb-6" : "text-[13px] line-clamp-2 mb-3"}`}>
                    {item.deskripsi || <span className="italic">Tanpa deskripsi...</span>}
                  </p>
                  <div className={`mt-auto flex items-center gap-2 ${viewMode === "LIST" ? "justify-start sm:justify-end border-none pt-0" : "justify-between pt-4 border-t border-gray-50"}`}>
                    <button type="button" onClick={() => openDetailModal(item)} className={`text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold transition-colors flex items-center justify-center gap-2 ${viewMode === "GRID" ? "py-2 px-4 rounded-xl text-xs flex-1" : "py-1.5 px-3 rounded-lg text-[11px]"}`}>
                      <Eye size={14} /> {viewMode === "GRID" ? "Buka Detail" : "Detail"}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => openModal(item)} title="Edit Edukasi" className={`text-gray-500 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors ${viewMode === "GRID" ? "p-2.5 rounded-xl" : "p-1.5 rounded-lg"}`}>
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        title="Hapus Edukasi"
                        onClick={() => openDeleteConfirm(item)}
                        className={`text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 ${viewMode === "GRID" ? "p-2.5 rounded-xl" : "p-1.5 rounded-lg"}`}
                      >
                        {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL FORM (Create/Edit) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-extrabold text-xl text-gray-900">{editingItem ? "Edit Edukasi" : "Buat Edukasi Baru"}</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Lengkapi informasi untuk materi edukasi Anda.</p>
                </div>
                <button type="button" onClick={closeModal} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Judul */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Judul Edukasi</label>
                  <input name="judul" value={formData.judul} onChange={(e) => { setFormData({ ...formData, judul: e.target.value }); setFormErrors((prev) => ({ ...prev, judul: "" })); }} placeholder="Tuliskan judul materi..." className={`w-full p-4 bg-white border rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 shadow-sm ${formErrors.judul ? "border-red-400" : "border-gray-200"}`} />
                  {formErrors.judul && <p className="mt-1.5 text-xs font-bold text-red-500">{formErrors.judul}</p>}
                </div>

                {/* Upload Media */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Unggah Media (Gambar/Video)</label>
                  <div onClick={() => !uploading && fileRef.current?.click()} className={`relative w-full p-6 border-2 border-dashed rounded-xl bg-gray-50 flex flex-col items-center justify-center min-h-[180px] cursor-pointer transition-all hover:bg-gray-100 ${formErrors.mediaUrl ? "border-red-300" : "border-gray-200 hover:border-[#4A6D55]"}`}>
                    {mediaPreview ? (
                      <div className="absolute inset-0 p-2">
                        <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">
                          {mediaPreview.type === "IMAGE" ? <img src={mediaPreview.url} alt="preview" className="w-full h-full object-contain" /> : <video src={mediaPreview.url} className="w-full h-full object-contain" muted />}
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <span className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Ganti Media</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center"><Upload size={24} className="text-gray-400" /></div>
                        <div className="text-center"><span className="block text-sm font-bold text-gray-600">Klik untuk memilih file</span><span className="block text-[11px] mt-1">Maksimal 1GB (JPG, PNG, MP4)</span></div>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
                        <Loader2 size={32} className="animate-spin text-[#4A6D55] mb-2" /><span className="text-xs font-bold text-[#4A6D55]">Mengunggah...</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={chooseFile} className="hidden" />
                  {formErrors.mediaUrl && <p className="mt-1.5 text-xs font-bold text-red-500">{formErrors.mediaUrl}</p>}
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Deskripsi Materi</label>
                  <textarea name="deskripsi" value={formData.deskripsi} onChange={(e) => { setFormData({ ...formData, deskripsi: e.target.value }); setFormErrors((prev) => ({ ...prev, deskripsi: "" })); }} rows={5} placeholder="Jabarkan detail materi di sini..." className={`w-full p-4 bg-white border rounded-xl text-sm leading-relaxed outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 resize-none shadow-sm ${formErrors.deskripsi ? "border-red-400" : "border-gray-200"}`} />
                  {formErrors.deskripsi && <p className="mt-1.5 text-xs font-bold text-red-500">{formErrors.deskripsi}</p>}
                </div>

                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-xl text-gray-600 bg-gray-100 font-bold hover:bg-gray-200 transition-all">Batalkan</button>
                  <button type="submit" disabled={submitting || uploading} className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#3a5643] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : editingItem ? "Simpan Perubahan" : "Publikasikan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {showDetailModal && viewingItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div><h2 className="font-extrabold text-xl text-gray-900">Preview Edukasi</h2><p className="text-xs text-gray-500 mt-1 font-medium">Pratinjau tampilan materi untuk pengguna.</p></div>
                <button type="button" onClick={() => setShowDetailModal(false)} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm bg-gray-50 ${viewingItem.mediaType === "IMAGE" ? "text-emerald-700 border-emerald-200" : "text-blue-700 border-blue-200"}`}>
                    {viewingItem.mediaType === "IMAGE" ? <ImageIcon size={14} /> : <VideoIcon size={14} />}{viewingItem.mediaType}
                  </span>
                  <span className="flex items-center gap-1.5"><Calendar size={15} />{new Date(viewingItem.createdAt || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{viewingItem.judul}</h1>
                <div className="w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-sm aspect-video">
                  {viewingItem.mediaType === "IMAGE" ? <img src={viewingItem.mediaUrl} className="w-full h-full object-contain" alt={viewingItem.judul} /> : <video src={viewingItem.mediaUrl} className="w-full h-full object-contain" controls autoPlay={false} />}
                </div>
                <div className="text-gray-700 leading-loose text-base md:text-lg whitespace-pre-wrap font-medium">{viewingItem.deskripsi || <span className="italic text-gray-400">Tidak ada deskripsi tambahan...</span>}</div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex gap-4">
                <button type="button" onClick={() => { setShowDetailModal(false); openModal(viewingItem); }} className="flex-1 py-3.5 bg-white border-2 border-yellow-400 text-yellow-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-50 transition-all">
                  <Edit size={18} /> Edit Konten
                </button>
                <button type="button" disabled={deletingId === viewingItem.id} onClick={() => openDeleteConfirm(viewingItem)} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                  {deletingId === viewingItem.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {deletingId === viewingItem.id ? "Menghapus..." : "Hapus Permanen"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}