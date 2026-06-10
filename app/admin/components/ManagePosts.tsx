"use client";

import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import axios from "axios";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Megaphone,
  Newspaper,
  X,
  Eye,
  Grid3X3,
  List,
  Calendar,
  User,
  Loader2,
  TrendingUp,
  Image as ImageIcon,
  FileQuestion,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "../components/AlertDialog";

interface ManagePostsProps {
  posts?: any[];
  onPostsUpdate?: () => void;
}

type TabType = "SEMUA" | "BERITA" | "PENGUMUMAN";
type ViewMode = "GRID" | "LIST";

const INITIAL_FORM = {
  title: "",
  content: "",
  category: "BERITA",
  imageUrl: "",
  imageFile: null as File | null,
  author_id: 1,
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

export default function ManagePosts({
  posts = [],
  onPostsUpdate,
}: ManagePostsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingPost, setViewingPost] = useState<any>(null);

  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: number | null;
  }>({
    show: false,
    id: null,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("SEMUA");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    content?: string;
    category?: string;
    imageFile?: string;
  }>({});
  const [imagePreview, setImagePreview] = useState<string>("");
  const [postList, setPostList] = useState<any[]>(posts);

  // ========== ALERT STATE ==========
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    open: false,
    type: "info",
    title: "",
    description: "",
  });

  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({ open: true, type, title, description, detailText });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, open: false }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const errors: {
      title?: string;
      content?: string;
      category?: string;
      imageFile?: string;
    } = {};

    const title = formData.title.trim();
    const content = formData.content.trim();

    if (!title) {
      errors.title = "Judul publikasi wajib diisi.";
    } else if (title.length < 5) {
      errors.title = "Judul minimal 5 karakter.";
    } else if (title.length > 120) {
      errors.title = "Judul maksimal 120 karakter.";
    }

    if (!formData.category) {
      errors.category = "Kategori wajib dipilih.";
    }

    if (!content) {
      errors.content = "Isi konten wajib diisi.";
    } else if (content.length < 20) {
      errors.content = "Isi konten minimal 20 karakter.";
    }

    if (formData.imageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      const maxSize = 5 * 1024 * 1024;

      if (!allowedTypes.includes(formData.imageFile.type)) {
        errors.imageFile = "Format gambar harus JPG, PNG, JPEG, atau WEBP.";
      } else if (formData.imageFile.size > maxSize) {
        errors.imageFile = "Ukuran gambar maksimal 5MB.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/posts`);
      const postsData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      setPostList(postsData);
    } catch (err: any) {
      console.error("Gagal memuat posts:", err);
      setPostList([]);
      showAlert(
        "error",
        "Gagal Memuat Konten",
        err?.response?.data?.message ||
          "Data berita dan pengumuman gagal dimuat dari server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!posts.length) {
      fetchPosts();
    } else {
      setPostList(posts);
    }
  }, [posts]);

  const refreshPosts = async () => {
    await fetchPosts();
    if (onPostsUpdate) {
      try {
        onPostsUpdate();
      } catch (err) {
        console.warn("onPostsUpdate error:", err);
      }
    }
  };

  const stats = useMemo(
    () => ({
      total: postList.length,
      berita: postList.filter((p) => p.category === "BERITA").length,
      pengumuman: postList.filter((p) => p.category === "PENGUMUMAN").length,
    }),
    [postList]
  );

  const resolveImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:image")) {
      return url;
    }
    return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const openDetailModal = (post: any) => {
    setViewingPost(post);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteModal({
      show: true,
      id,
    });
  };

  const handleDeleteConfirm = async () => {
    const postId = deleteModal.id;
    if (postId === null) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteModal({ show: false, id: null });
      showAlert(
        "error",
        "Sesi Login Tidak Ditemukan",
        "Token tidak ditemukan. Silakan login ulang sebelum menghapus konten."
      );
      return;
    }

    setDeleting(true);
    setDeleteModal({ show: false, id: postId });

    try {
      const response = await axios.delete(`${BASE_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Gagal menghapus berita");
      }

      showAlert(
        "success",
        "Data berhasil dihapus",
        "Berita atau pengumuman berhasil dihapus dari sistem."
      );

      await refreshPosts();
    } catch (err: any) {
      console.error("Delete error:", err);
      showAlert(
        "error",
        "Gagal Menghapus Konten",
        err?.response?.data?.message ||
          err?.message ||
          "Terjadi kesalahan saat menghapus konten."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert(
        "error",
        "Form Belum Valid",
        "Periksa kembali data yang ditandai merah sebelum menyimpan publikasi."
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showAlert(
        "error",
        "Sesi Login Tidak Ditemukan",
        "Token tidak ditemukan. Silakan login ulang sebelum menyimpan konten."
      );
      return;
    }

    setSubmitting(true);

    let imageUrl = formData.imageUrl;

    if (formData.imageFile) {
      try {
        const uploadForm = new FormData();
        uploadForm.append("image", formData.imageFile);
        const uploadResponse = await axios.post(
          `${BASE_URL}/api/upload`,
          uploadForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        imageUrl = uploadResponse.data?.imageUrl || imageUrl;
      } catch (uploadError: any) {
        console.error("Upload error:", uploadError);
        setSubmitting(false);
        showAlert(
          "error",
          "Gagal Upload Gambar",
          uploadError?.response?.data?.message ||
            "Gambar gagal diunggah. Silakan coba gunakan gambar lain."
        );
        return;
      }
    }

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      imageUrl: imageUrl || null,
      author_id: formData.author_id,
    };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingPost) {
        await axios.put(`${BASE_URL}/api/posts/${editingPost.id}`, payload, config);
        showAlert(
          "edit",
          "Konten Berhasil Diperbarui",
          "Perubahan berita atau pengumuman berhasil disimpan."
        );
      } else {
        await axios.post(`${BASE_URL}/api/posts`, payload, config);
        showAlert(
          "success",
          "Konten Berhasil Ditambahkan",
          "Berita atau pengumuman baru berhasil dipublikasikan."
        );
      }

      setShowModal(false);
      setFormData({ ...INITIAL_FORM });
      setFormErrors({});
      setImagePreview("");
      setEditingPost(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await refreshPosts();
    } catch (err: any) {
      console.error("Submit error:", err);
      showAlert(
        "error",
        editingPost ? "Gagal Memperbarui Konten" : "Gagal Menambahkan Konten",
        err?.response?.data?.message ||
          err?.message ||
          "Terjadi kesalahan saat menyimpan konten."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (post: any = null) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title || "",
        content: post.content || "",
        category: post.category || "BERITA",
        imageUrl: post.imageUrl || post.image_url || "",
        imageFile: null,
        author_id: Number(post.authorId || post.author_id || 1),
      });
      setImagePreview(resolveImageUrl(post.imageUrl || post.image_url || ""));
    } else {
      setEditingPost(null);
      setFormData({ ...INITIAL_FORM });
      setImagePreview("");
    }
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowModal(true);
  };

  const filteredPosts = postList.filter((post) => {
    const matchesTab = activeTab === "SEMUA" || post.category === activeTab;
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    if (category === "BERITA") {
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    }
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
      {/* GLOBAL ALERT */}
      <AlertDialog
        open={alertConfig.open}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
        detailText={alertConfig.detailText}
        onClose={closeAlert}
      />

      {/* LOADING ALERT saat submit */}
      <AlertDialog
        open={submitting}
        type="loading"
        title={editingPost ? "Memperbarui Publikasi" : "Membuat Publikasi"}
        description={
          editingPost
            ? "Mohon tunggu, perubahan konten sedang disimpan ke sistem."
            : "Mohon tunggu, konten baru sedang dipublikasikan ke sistem."
        }
        isLoading={true}
        disableBackdropClose={true}
        onClose={() => {}}
      />

      {/* DELETE CONFIRMATION ALERT */}
      <AlertDialog
        open={deleteModal.show}
        type="delete"
        title="Hapus Konten?"
        description="Konten ini akan dihapus secara permanen dari sistem."
        detailText="Pastikan konten ini memang sudah tidak digunakan sebelum melanjutkan proses hapus."
        buttonText="Hapus"
        cancelText="Batal"
        showCancelButton={true}
        isLoading={deleting}
        disableBackdropClose={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (deleting) return;
          setDeleteModal({ show: false, id: null });
        }}
      />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-3xl p-8 shadow-sm border border-white/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/80 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-4 shadow-sm backdrop-blur-sm">
              Konten & Publikasi
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A2E35] tracking-tight">
              Manajemen Berita
            </h1>
            <p className="text-[#5B7078] mt-2 text-sm md:text-base font-medium max-w-xl">
              Kelola pusat informasi, berita terbaru, dan pengumuman penting
              untuk portal utama Anda dengan mudah.
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Newspaper size={200} />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Postingan", val: stats.total, icon: Newspaper, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          { label: "Berita Aktif", val: stats.berita, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Pengumuman", val: stats.pengumuman, icon: Megaphone, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
        ].map((s, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${s.border} flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER & ACTION BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center sticky top-4 z-40">
        <div className="flex-1 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari judul atau isi konten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="h-px bg-gray-100 lg:h-8 lg:w-px mx-2"></div>
        <div className="flex flex-col sm:flex-row items-center gap-3 px-2 pb-2 lg:pb-0">
          <div className="flex w-full sm:w-auto bg-gray-50 p-1 rounded-xl">
            {(["SEMUA", "BERITA", "PENGUMUMAN"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex bg-gray-50 p-1 rounded-xl">
            <button onClick={() => setViewMode("GRID")} className={`p-2 rounded-lg transition-all ${viewMode === "GRID" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}>
              <Grid3X3 size={18} />
            </button>
            <button onClick={() => setViewMode("LIST")} className={`p-2 rounded-lg transition-all ${viewMode === "LIST" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-400 hover:text-gray-600"}`}>
              <List size={18} />
            </button>
          </div>
          <button onClick={() => openModal()} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A6D55] text-white text-sm font-bold shadow-md hover:bg-[#3a5643] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Tambah Baru
          </button>
        </div>
      </div>

      {/* POSTS GRID / LIST */}
      <AnimatePresence mode="wait">
        {loading && filteredPosts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin text-[#4A6D55]" size={34} />
            <p className="mt-3 text-sm font-medium italic">Memuat data publikasi...</p>
          </div>
        ) : (
          <motion.div layout className={viewMode === "GRID" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-3.5"}>
            {filteredPosts.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-full py-20 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-300">
                  <FileQuestion size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Tidak ada data ditemukan</h3>
                <p className="text-gray-500 text-sm max-w-sm">Mungkin kata kunci pencarian salah, atau belum ada konten yang dipublikasikan pada kategori ini.</p>
              </motion.div>
            ) : (
              filteredPosts.map((post) => {
                const badgeStyle = getCategoryBadge(post.category);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={post.id}
                    className={`bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 group ${
                      viewMode === "LIST"
                        ? "flex flex-col sm:flex-row p-3 gap-4 rounded-2xl items-center"
                        : "flex flex-col rounded-3xl"
                    }`}
                  >
                    <div className={`relative overflow-hidden bg-gray-100 shrink-0 ${viewMode === "GRID" ? "aspect-video w-full" : "aspect-video w-full sm:w-48 rounded-xl"}`}>
                      <img
                        src={resolveImageUrl(post.imageUrl || post.image_url)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                        onError={(e) => ((e.target as HTMLImageElement).src = "https://via.placeholder.com/600x400?text=No+Image")}
                        alt={post.title}
                      />
                      <div className={`absolute left-2.5 z-10 ${viewMode === "GRID" ? "top-3" : "top-2.5"}`}>
                        <span className={`inline-flex items-center rounded-md font-bold bg-white/95 backdrop-blur-sm shadow-sm uppercase tracking-wide border ${viewMode === "GRID" ? "px-3 py-1 text-[10px]" : "px-2 py-0.5 text-[9px]"} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {post.category}
                        </span>
                      </div>
                      {viewMode === "GRID" && <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>}
                    </div>
                    <div className={`flex-1 flex flex-col min-w-0 w-full ${viewMode === "GRID" ? "p-6" : "py-1 pr-2"}`}>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider ${viewMode === "GRID" ? "mb-3" : "mb-1.5"}`}>
                        <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-300" />{new Date(post.createdAt || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span className="flex items-center gap-1"><User size={13} className="text-gray-300" />Admin</span>
                      </div>
                      <h3 className={`font-extrabold text-gray-900 leading-snug group-hover:text-[#4A6D55] transition-colors ${viewMode === "GRID" ? "text-lg mb-2 line-clamp-2" : "text-base mb-1.5 line-clamp-1 sm:line-clamp-2"}`}>{post.title}</h3>
                      <p className={`text-gray-500 leading-relaxed ${viewMode === "GRID" ? "text-sm line-clamp-2 mb-6" : "text-[13px] line-clamp-2 mb-3"}`}>{post.content}</p>
                      <div className={`mt-auto flex items-center gap-2 ${viewMode === "LIST" ? "justify-start sm:justify-end border-none pt-0" : "justify-between pt-4 border-t border-gray-50"}`}>
                        <button onClick={() => openDetailModal(post)} className={`text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold transition-colors flex items-center justify-center gap-2 ${viewMode === "GRID" ? "py-2 px-4 rounded-xl text-xs flex-1" : "py-1.5 px-3 rounded-lg text-[11px]"}`}>
                          <Eye size={14} /> {viewMode === "GRID" ? "Buka Detail" : "Detail"}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openModal(post)} title="Edit Konten" className={`text-gray-500 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors ${viewMode === "GRID" ? "p-2.5 rounded-xl" : "p-1.5 rounded-lg"}`}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteClick(post.id)} title="Hapus Konten" className={`text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors ${viewMode === "GRID" ? "p-2.5 rounded-xl" : "p-1.5 rounded-lg"}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORM MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[28px] shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-white/20"
            >
              <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex justify-between items-start gap-4 bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#4A6D55]/10 text-[#4A6D55] mb-3">
                    {editingPost ? "Mode Edit" : "Konten Baru"}
                  </span>
                  <h2 className="font-extrabold text-xl md:text-2xl text-gray-900">{editingPost ? "Edit Publikasi" : "Buat Publikasi Baru"}</h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Lengkapi data konten dengan rapi agar publikasi mudah dipahami pembaca.</p>
                </div>
                <button onClick={() => { if (submitting) return; setShowModal(false); setFormErrors({}); }} disabled={submitting} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Judul Publikasi <span className="text-red-500">*</span></label>
                      <span className="text-[11px] text-gray-400 font-semibold">{formData.title.length}/120</span>
                    </div>
                    <input
                      name="title"
                      value={formData.title}
                      onChange={(e) => { setFormData({ ...formData, title: e.target.value }); if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: "" })); }}
                      maxLength={120}
                      className={`w-full p-4 bg-white border rounded-xl outline-none text-sm font-medium text-gray-900 shadow-sm transition-all ${formErrors.title ? "border-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`}
                      placeholder="Contoh: Pemerintah Desa Mengadakan Pelatihan UMKM"
                    />
                    {formErrors.title && <p className="mt-2 text-xs font-semibold text-red-500">{formErrors.title}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Kategori Konten <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { value: "BERITA", title: "Berita Portal", desc: "Informasi umum dan kegiatan terbaru.", icon: Newspaper },
                        { value: "PENGUMUMAN", title: "Pengumuman Resmi", desc: "Informasi penting untuk masyarakat.", icon: Megaphone },
                      ].map((item) => {
                        const Icon = item.icon;
                        const active = formData.category === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => { setFormData({ ...formData, category: item.value }); if (formErrors.category) setFormErrors((prev) => ({ ...prev, category: "" })); }}
                            className={`p-4 rounded-2xl border text-left transition-all ${active ? "border-[#4A6D55] bg-[#4A6D55]/10 shadow-sm" : "border-gray-200 bg-white hover:border-[#4A6D55]/40 hover:bg-gray-50"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl ${active ? "bg-[#4A6D55] text-white" : "bg-gray-100 text-gray-500"}`}><Icon size={18} /></div>
                              <div><p className={`text-sm font-extrabold ${active ? "text-[#4A6D55]" : "text-gray-800"}`}>{item.title}</p><p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p></div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {formErrors.category && <p className="mt-2 text-xs font-semibold text-red-500">{formErrors.category}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Visual Utama <span className="text-gray-400 font-normal">(Opsional)</span></label>
                  <div className={`rounded-2xl border-2 border-dashed overflow-hidden transition-all ${formErrors.imageFile ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50"}`}>
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover bg-gray-100" />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between gap-3">
                          <div className="text-white min-w-0"><p className="text-sm font-bold truncate">{formData.imageFile?.name || "Gambar publikasi aktif"}</p><p className="text-xs text-white/80">Format disarankan: JPG, PNG, WEBP. Maksimal 5MB.</p></div>
                          <button type="button" onClick={() => { setFormData((prev) => ({ ...prev, imageFile: null, imageUrl: "" })); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={submitting} className="shrink-0 px-3 py-2 rounded-lg bg-white text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50">Hapus</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={submitting} className="w-full p-6 md:p-8 text-sm font-bold text-gray-500 hover:text-green-600 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#4A6D55]"><ImageIcon size={26} /></div>
                        <div className="text-center"><p>Klik untuk memilih foto unggulan</p><p className="text-xs font-medium text-gray-400 mt-1">JPG, PNG, JPEG, WEBP — maksimal 5MB</p></div>
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormErrors((prev) => ({ ...prev, imageFile: "" }));
                    if (!file) return;
                    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
                    const maxSize = 5 * 1024 * 1024;
                    if (!allowedTypes.includes(file.type)) {
                      setFormErrors((prev) => ({ ...prev, imageFile: "Format gambar harus JPG, PNG, JPEG, atau WEBP." }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }
                    if (file.size > maxSize) {
                      setFormErrors((prev) => ({ ...prev, imageFile: "Ukuran gambar maksimal 5MB." }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }
                    setFormData((prev) => ({ ...prev, imageFile: file }));
                    const reader = new FileReader();
                    reader.onload = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }} />
                  {formErrors.imageFile && <p className="mt-2 text-xs font-semibold text-red-500">{formErrors.imageFile}</p>}
                  {!formData.imageFile && imagePreview && <p className="mt-2 text-xs text-gray-500 italic">Gambar sebelumnya akan tetap digunakan jika tidak diganti.</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Isi Konten <span className="text-red-500">*</span></label><span className="text-[11px] text-gray-400 font-semibold">{formData.content.length} karakter</span></div>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={(e) => { setFormData({ ...formData, content: e.target.value }); if (formErrors.content) setFormErrors((prev) => ({ ...prev, content: "" })); }}
                    rows={8}
                    placeholder="Tulis isi berita atau pengumuman secara jelas, lengkap, dan mudah dipahami..."
                    className={`w-full p-4 bg-white border rounded-xl text-sm leading-relaxed outline-none transition-all text-gray-900 resize-none shadow-sm ${formErrors.content ? "border-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"}`}
                  />
                  {formErrors.content && <p className="mt-2 text-xs font-semibold text-red-500">{formErrors.content}</p>}
                </div>
                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
                  <button type="button" onClick={() => { if (submitting) return; setShowModal(false); setFormErrors({}); }} disabled={submitting} className="sm:flex-1 py-4 rounded-xl text-gray-600 bg-gray-100 font-bold hover:bg-gray-200 transition-all disabled:opacity-50">Batalkan</button>
                  <button type="submit" disabled={submitting} className="sm:flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#3a5643] hover:-translate-y-0.5 transition-all disabled:opacity-50">
                    {submitting ? <><Loader2 className="animate-spin" size={20} /> Menyimpan...</> : (editingPost ? "Simpan Perubahan" : "Simpan & Publikasikan")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {showDetailModal && viewingPost && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-white/20"
            >
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div><h2 className="font-extrabold text-xl text-gray-900">Preview Publikasi</h2><p className="text-xs text-gray-500 mt-1 font-medium">Pratinjau tampilan konten untuk pembaca.</p></div>
                <button onClick={() => setShowDetailModal(false)} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border shadow-sm ${getCategoryBadge(viewingPost.category).bg} ${getCategoryBadge(viewingPost.category).text} ${getCategoryBadge(viewingPost.category).border}`}>{viewingPost.category}</span>
                  <span className="flex items-center gap-1.5"><Calendar size={15} />{new Date(viewingPost.createdAt || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{viewingPost.title}</h1>
                {(viewingPost.imageUrl || viewingPost.image_url) && (
                  <div className="w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm aspect-video">
                    <img src={resolveImageUrl(viewingPost.imageUrl || viewingPost.image_url)} className="w-full h-full object-cover" alt={viewingPost.title} />
                  </div>
                )}
                <div className="text-gray-700 leading-loose text-base md:text-lg whitespace-pre-wrap font-medium">{viewingPost.content}</div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex gap-4">
                <button onClick={() => { setShowDetailModal(false); openModal(viewingPost); }} className="flex-1 py-3.5 bg-white border-2 border-yellow-400 text-yellow-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-50 transition-all"><Edit size={18} /> Edit Konten</button>
                <button onClick={() => { setShowDetailModal(false); handleDeleteClick(viewingPost.id); }} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 shadow-md hover:shadow-lg transition-all"><Trash2 size={18} /> Hapus Permanen</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}