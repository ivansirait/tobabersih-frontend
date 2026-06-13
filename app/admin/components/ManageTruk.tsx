"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus, Edit, Trash2, Search, Truck, Hash, Tag, Phone, X,
  ChevronDown, RefreshCw, Layers, CheckCircle2, AlertCircle,
  Loader2, User, Eye, MapPin, Calendar, Mail,
} from "lucide-react";
import AlertDialog, { type AlertType } from "../components/AlertDialog";
import { motion, AnimatePresence } from "framer-motion";

/* =========================
   TYPES
========================= */

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
  status: "AVAILABLE" | "BUSY" | "MAINTENANCE";
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

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

/* =========================
   CONFIG
========================= */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api/admin'
  : '/api/admin';

const INITIAL_FORM_DATA = {
  plateNumber: "",
  unitCode: "",
  brand: "",
  truckType: "",
  operatorId: "",
  status: "AVAILABLE",
};

/* =========================
   COMPONENT
========================= */

export default function ManageTruk() {
  const [trukList, setTrukList] = useState<Truk[]>([]);
  const [supirList, setSupirList] = useState<Supir[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTruk, setEditingTruk] = useState<Truk | null>(null);
  const [viewingTruk, setViewingTruk] = useState<Truk | null>(null);
   

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [selectedTrukForDelete, setSelectedTrukForDelete] = useState<Truk | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    open: false,
    type: "info",
    title: "",
    description: "",
  });

  /* =========================
     HELPERS
  ========================= */

  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({ open: true, type, title, description, detailText });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, open: false }));
  };

  const getAuthConfig = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
  };

  const getErrorMessage = (error: any, fallback: string) => {
    return error?.response?.data?.message || fallback;
  };

  /* =========================
     FETCH DATA
  ========================= */

  const fetchTruk = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/truks`, getAuthConfig());
      setTrukList(res.data.data || []);
    } catch (error: any) {
      showAlert("error", "Gagal memuat data", "Data armada gagal dimuat dari server.", getErrorMessage(error, "Terjadi kesalahan pada server."));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupir = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/supir-list`, getAuthConfig());
      const supirData = res.data.data || [];
      setSupirList(supirData.filter((s: Supir) => s.isActive));
    } catch (error) {
      console.error("Error fetching supir:", error);
    }
  };

  useEffect(() => {
    fetchTruk();
    fetchSupir();
  }, []);

  /* =========================
     FORM HANDLERS
  ========================= */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const checkLiveDuplicate = (field: string, value: string) => {
    const isEditing = !!editingTruk;
    const exists = trukList.some(
      (t) =>
        t[field as keyof Truk]?.toString().toLowerCase() === value.toLowerCase() &&
        (isEditing ? t.id !== editingTruk!.id : true)
    );

    if (exists && value.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: `${field === "plateNumber" ? "Plat nomor" : "Kode unit"} "${value}" sudah dipakai`,
      }));
    } else {
      setFormErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData({ ...formData, plateNumber: val });
    checkLiveDuplicate("plateNumber", val);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData({ ...formData, unitCode: val });
    checkLiveDuplicate("unitCode", val);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.plateNumber.trim()) errors.plateNumber = "Nomor plat wajib diisi";
    if (!formData.unitCode.trim()) errors.unitCode = "Kode unit wajib diisi";
    if (!formData.truckType) errors.truckType = "Jenis armada wajib dipilih";
    if (!formData.operatorId) errors.operatorId = "Supir wajib dipilih";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isDuplicate = () => {
    const isEditing = !!editingTruk;

    const duplicatePlate = trukList.find(
      (t) =>
        t.plateNumber.toLowerCase() === formData.plateNumber.toLowerCase() &&
        (isEditing ? t.id !== editingTruk!.id : true)
    );

    const duplicateCode = trukList.find(
      (t) =>
        t.unitCode?.toLowerCase() === formData.unitCode.toLowerCase() &&
        (isEditing ? t.id !== editingTruk!.id : true)
    );

    if (duplicatePlate) {
      showAlert("error", "Duplikasi Data", `Nomor plat "${formData.plateNumber}" sudah terdaftar.`);
      return false;
    }

    if (duplicateCode && formData.unitCode.trim()) {
      showAlert("error", "Duplikasi Data", `Kode unit "${formData.unitCode}" sudah terdaftar.`);
      return false;
    }

    return true;
  };

  /* =========================
     MODAL HANDLERS
  ========================= */

  const openCreateModal = () => {
    setEditingTruk(null);
    setFormData({ ...INITIAL_FORM_DATA });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (truk: Truk) => {
    setEditingTruk(truk);
    setFormErrors({});
    setFormData({
      plateNumber: truk.plateNumber,
      unitCode: truk.unitCode || "",
      brand: truk.brand || "",
      truckType: truk.truckType || "",
      operatorId: truk.operatorId || "",
      status: truk.status,
    });
    setShowModal(true);
  };

  /* =========================
     SUBMIT HANDLER
  ========================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!isDuplicate()) return;

    setSubmitting(true);

    try {
      const config = getAuthConfig();

      if (editingTruk) {
        await axios.put(`${API_BASE_URL}/truks/${editingTruk.id}`, formData, config);
      } else {
        await axios.post(`${API_BASE_URL}/truks`, formData, config);
      }

      setShowModal(false);
      setSubmitting(false);

      showAlert(
        editingTruk ? "edit" : "success",
        editingTruk ? "Data berhasil diedit" : "Data berhasil ditambahkan",
        editingTruk
          ? "Perubahan spesifikasi armada berhasil disimpan."
          : "Unit armada baru sukses terregistrasi."
      );

      fetchTruk();
    } catch (error: any) {
      setSubmitting(false);
      showAlert(
        "error",
        editingTruk ? "Gagal mengedit" : "Gagal menambah",
        getErrorMessage(error, "Terjadi kesalahan. Silakan coba lagi.")
      );
    }
  };

  /* =========================
     DELETE HANDLER
  ========================= */

  const canDeleteTruk = (truk: Truk) => truk.status !== "BUSY";

  const getDeleteBlockReason = (truk: Truk) => {
    if (truk.status === "BUSY") {
      return "Armada yang sedang bertugas tidak dapat dihapus. Ubah status menjadi 'Tersedia' atau 'Servis' terlebih dahulu.";
    }
    return "";
  };

  const openDeleteConfirm = (truk: Truk) => {
    const blockReason = getDeleteBlockReason(truk);
    if (blockReason) {
      showAlert("error", "Tidak Dapat Menghapus", blockReason);
      return;
    }
    setSelectedTrukForDelete(truk);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedTrukForDelete) return;

    setSubmitting(true);

    try {
      await axios.delete(`${API_BASE_URL}/truks/${selectedTrukForDelete.id}`, getAuthConfig());

      setSubmitting(false);
      showAlert("success", "Data berhasil dihapus", "Unit armada telah dihapus dari sistem.");

      fetchTruk();
    } catch (error: any) {
      setSubmitting(false);
      showAlert("error", "Gagal menghapus", getErrorMessage(error, "Terjadi kesalahan sistem."));
    }
  };

  /* =========================
     UTILS
  ========================= */

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE": return { bg: "bg-green-100", text: "text-green-800", label: "Tersedia" };
      case "BUSY":      return { bg: "bg-blue-100",  text: "text-blue-800",  label: "Bertugas" };
      case "MAINTENANCE": return { bg: "bg-red-100", text: "text-red-800",   label: "Servis"   };
      default:          return { bg: "bg-gray-100",  text: "text-gray-800",  label: status     };
    }
  };

  const filteredTruk = trukList.filter(
    (truk) =>
      truk.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truk.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truk.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truk.truckType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truk.operator?.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 text-black">

      {/* ─── ALERT SYSTEM ──────────────────────────────────────────── */}

      {/* 1. Global Alert (success / error / info) */}
      <AlertDialog
        open={alertConfig.open}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
        detailText={alertConfig.detailText}
        onClose={closeAlert}
      />

      {/* 2. Loading Alert (saat API diproses) */}
      <AlertDialog
        open={submitting}
        type="loading"
        title="Mohon Tunggu"
        description="Sedang memproses permintaan Anda ke server..."
        isLoading={true}
        disableBackdropClose={true}
        onClose={() => {}}
      />

      {/* 3. Delete Confirm Alert */}
      <AlertDialog
        open={showDeleteConfirm}
        type="delete"
        title="Yakin Hapus Armada?"
        description={
          selectedTrukForDelete
            ? `Unit ${selectedTrukForDelete.plateNumber} akan dihapus secara permanen dari sistem.`
            : "Aksi ini akan menghapus data armada dari sistem."
        }
        buttonText="Hapus"
        cancelText="Batal"
        showCancelButton={true}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await handleDelete();
          setSelectedTrukForDelete(null);
        }}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedTrukForDelete(null);
        }}
      />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
              Data & Operasional
            </span>
            <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">Manajemen Armada</h1>
            <p className="text-[#5B7078] mt-2 font-medium">Kelola unit armada pengangkut sampah operasional real-time.</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Armada",  val: trukList.length,                                      color: "text-gray-600",  bg: "bg-gray-50",  icon: Truck         },
          { label: "Tersedia",      val: trukList.filter((t) => t.status === "AVAILABLE").length, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2  },
          { label: "Bertugas",      val: trukList.filter((t) => t.status === "BUSY").length,      color: "text-blue-600",  bg: "bg-blue-50",  icon: RefreshCw     },
          { label: "Maintenance",   val: trukList.filter((t) => t.status === "MAINTENANCE").length, color: "text-red-600",  bg: "bg-red-50",   icon: AlertCircle   },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={24} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ADD BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#4A6D55] text-white text-sm font-bold shadow-lg transition-all hover:bg-[#395542] active:scale-95"
        >
          <Plus size={18} /> Tambah Unit Baru
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border-none shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nopol, kode, merek, tipe, atau supir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-black text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-gray-400">
            <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
            <p className="italic font-medium text-sm">Sinkronisasi data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">
                  <th className="px-6 py-4 text-center w-16">No</th>
                  <th className="px-6 py-4">Nomor Polisi / Detail</th>
                  <th className="px-6 py-4">Operator</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTruk.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      Tidak ada armada yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredTruk.map((truk, idx) => {
                    const status = getStatusBadge(truk.status);
                    const canDelete = canDeleteTruk(truk);
                    const deleteReason = getDeleteBlockReason(truk);

                    return (
                      <tr key={truk.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-5 text-center text-sm font-bold text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-[#4A6D55] border border-gray-100 transition-colors">
                              <Truck size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-none">{truk.plateNumber}</p>
                              <div className="text-xs text-gray-500 mt-1.5 space-x-1 flex items-center">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-gray-600 border border-gray-200/50">
                                  {truk.unitCode || "-"}
                                </span>
                                <span>•</span>
                                <span>{truk.brand || "-"}</span>
                                <span>•</span>
                                <span>{truk.truckType || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {truk.operator ? (
                            <div>
                              <p className="text-sm font-bold text-gray-800">{truk.operator.fullName}</p>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                                <Phone size={10} className="text-emerald-500" />
                                {truk.operator.phoneNumber || "-"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs italic text-gray-400 px-2 py-0.5 bg-gray-50 rounded border">Kosong</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${status.bg} ${status.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.text.replace("text", "bg")}`} />
                            {status.label.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right space-x-1.5">
                          <button
                            onClick={() => setViewingTruk(truk)}
                            className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm inline-flex"
                            title="Lihat Detail"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(truk)}
                            className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm inline-flex"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(truk)}
                            className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm inline-flex"
                            title={deleteReason || "Hapus"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto border border-gray-100 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2.5 tracking-tight">
                  <div className={`p-1.5 rounded-lg ${editingTruk ? "bg-amber-50 text-amber-600" : "bg-green-50 text-[#4A6D55]"}`}>
                    <Truck size={18} />
                  </div>
                  {editingTruk ? "Konfigurasi Spesifikasi Unit" : "Registrasi Armada Baru"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nomor Plat */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">
                      Nomor Plat Armada <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.plateNumber ? "text-red-400" : "text-gray-400"}`} size={16} />
                      <input
                        type="text"
                        name="plateNumber"
                        autoComplete="off"
                        value={formData.plateNumber}
                        onChange={handlePlateChange}
                        placeholder="Contoh: BK 1234 ABC"
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-bold uppercase transition-all border ${
                          formErrors.plateNumber
                            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                            : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                        }`}
                      />
                    </div>
                    {formErrors.plateNumber && (
                      <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                        <AlertCircle size={12} />{formErrors.plateNumber}
                      </p>
                    )}
                  </div>

                  {/* Kode Unit */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">
                      Kode Nomor Pintu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.unitCode ? "text-red-400" : "text-gray-400"}`} size={16} />
                      <input
                        type="text"
                        name="unitCode"
                        autoComplete="off"
                        value={formData.unitCode}
                        onChange={handleCodeChange}
                        placeholder="Contoh: T-07 atau RM-12"
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border ${
                          formErrors.unitCode
                            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                            : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                        }`}
                      />
                    </div>
                    {formErrors.unitCode && (
                      <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                        <AlertCircle size={12} />{formErrors.unitCode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Merek */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">
                      Merek Armada <span className="text-gray-400 font-normal">(Opsional)</span>
                    </label>
                    <div className="relative">
                      <Truck className="text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" size={16} />
                      <input
                        type="text"
                        name="brand"
                        autoComplete="off"
                        value={formData.brand}
                        onChange={handleInputChange}
                        placeholder="Mitsubishi, Hino, Isuzu, dll"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Jenis Armada */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 tracking-wide">
                      Jenis Armada <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Layers className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.truckType ? "text-red-400" : "text-gray-400"}`} size={16} />
                      <select
                        name="truckType"
                        value={formData.truckType}
                        onChange={handleInputChange}
                        className={`w-full pl-11 pr-10 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border appearance-none ${
                          formErrors.truckType
                            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                            : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                        }`}
                      >
                        <option value="" disabled>Pilih Jenis Armada</option>
                        <option value="Dump Truck">Dump Truck</option>
                        <option value="Arm Roll">Truck Arm Roll</option>
                        <option value="Compactor">Compactor Truck</option>
                        <option value="Bentor">Bentor</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                    {formErrors.truckType && (
                      <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                        <AlertCircle size={12} />{formErrors.truckType}
                      </p>
                    )}
                  </div>
                </div>

                {/* Supir */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">
                    Supir Penanggung Jawab <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.operatorId ? "text-red-400" : "text-gray-400"}`} size={16} />
                    <select
                      name="operatorId"
                      value={formData.operatorId}
                      onChange={handleInputChange}
                      className={`w-full pl-11 pr-10 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border appearance-none ${
                        formErrors.operatorId
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                          : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                      }`}
                    >
                      <option value="">Pilih Supir...</option>
                      {supirList.map((supir) => (
                        <option key={supir.id} value={supir.id}>{supir.fullName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  {formErrors.operatorId && (
                    <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                      <AlertCircle size={12} />{formErrors.operatorId}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">Status Kondisi Unit</label>
                  <div className="relative">
                    <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-10 py-3 bg-gray-50/80 border border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 rounded-xl outline-none text-sm font-medium transition-all appearance-none text-black"
                    >
                      <option value="AVAILABLE">Tersedia</option>
                      <option value="BUSY">Bertugas di Lapangan</option>
                      <option value="MAINTENANCE">Dalam Perbaikan</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 active:scale-[0.99] text-gray-600 rounded-xl font-bold transition-all text-sm text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5 bg-[#4A6D55] hover:bg-[#3d5a46] active:scale-[0.99] text-white rounded-xl font-bold shadow-md shadow-green-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" /><span>Menyimpan...</span></>
                    ) : (
                      <span>{editingTruk ? "Simpan Perubahan" : "Daftarkan Armada"}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {viewingTruk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-gray-100 flex flex-col text-sm"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Truck size={20} /></div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base leading-none">Detail Spesifikasi Armada</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">ID: {viewingTruk.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTruk(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                {/* Data Kendaraan */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Truck size={14} />Data Kendaraan
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-2xl grid grid-cols-2 gap-4 border border-gray-100">
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Nomor Polisi</p><p className="font-bold text-gray-900 mt-0.5">{viewingTruk.plateNumber}</p></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Kode Unit</p><p className="font-bold text-gray-900 mt-0.5">{viewingTruk.unitCode || "-"}</p></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Merek Armada</p><p className="font-bold text-gray-900 mt-0.5">{viewingTruk.brand || "-"}</p></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Tipe Angkutan</p><p className="font-bold text-gray-900 mt-0.5">{viewingTruk.truckType || "-"}</p></div>
                  </div>
                </div>

                {/* Operator */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={14} />Operator / Supir
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    {viewingTruk.operator ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Nama Lengkap</p><p className="font-bold text-gray-900 mt-0.5">{viewingTruk.operator.fullName}</p></div>
                        <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Nomor Telepon</p><p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1.5"><Phone size={12} className="text-gray-400" />{viewingTruk.operator.phoneNumber || "-"}</p></div>
                        <div className="sm:col-span-2"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Email Terdaftar</p><p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1.5"><Mail size={12} className="text-gray-400" />{viewingTruk.operator.email}</p></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-gray-400">
                        <User size={24} className="mb-2 opacity-30" />
                        <p className="text-xs italic font-medium">Belum ada operator yang ditugaskan</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Lokasi */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin size={14} />Status & Lokasi Terakhir
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Status Operasional</p>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide border ${getStatusBadge(viewingTruk.status).bg} ${getStatusBadge(viewingTruk.status).text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusBadge(viewingTruk.status).text.replace("text", "bg")}`} />
                          {getStatusBadge(viewingTruk.status).label.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Terdaftar Pada</p>
                      <p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(viewingTruk.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Lokasi Terakhir Terdeteksi</p>
                      <p className="font-bold text-gray-900 mt-1 text-xs leading-relaxed">
                        {viewingTruk.lastLocation || "Lokasi GPS belum pernah diperbarui."}
                      </p>
                      {viewingTruk.currentLat && viewingTruk.currentLong && (
                        <p className="text-[10px] text-gray-500 font-mono mt-2 bg-white px-2 py-1 rounded inline-block border border-gray-100">
                          Koordinat: {viewingTruk.currentLat}, {viewingTruk.currentLong}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setViewingTruk(null)}
                  className="px-5 py-2.5 bg-gray-800 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}