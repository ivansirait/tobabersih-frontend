      "use client";

      import { useEffect, useMemo, useState, FormEvent } from "react";
      import axios from "axios";
      import { motion, AnimatePresence } from "framer-motion";
      import {
        Edit3,
        Trash2,
        Search,
        Mail,
        Phone,
        X,
        Users,
        Loader2,
        CheckCircle2,
        XCircle,
        UserPlus,
        Lock,
        Eye,
        EyeOff,
        User,
        Power,
        PowerOff,
        ShieldCheck,
        AlertCircle,
        ChevronDown,
      } from "lucide-react";

      import AlertDialog, { type AlertType } from "./AlertDialog";

      /* =========================
        TYPES
      ========================= */

      interface Supir {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string | null;
        isActive: boolean;
        status?: string; // optional status such as DITUGASKAN
        isAssigned?: boolean;
        createdAt?: string;
      }

      interface FormData {
        fullName: string;
        email: string;
        password: string;
        phoneNumber: string;
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
        
      const INITIAL_FORM_DATA: FormData = {
        fullName: "",
        email: "",
        password: "",
        phoneNumber: "",
        isActive: true,
      };

      /* =========================
        COMPONENT
      ========================= */

      export default function ManageSupir() {
        const [supirList, setSupirList] = useState<Supir[]>([]);
        const [loading, setLoading] = useState<boolean>(true);
        const [submitting, setSubmitting] = useState<boolean>(false);

        const [searchTerm, setSearchTerm] = useState<string>("");
        const [statusFilter, setStatusFilter] = useState<string>("ALL");

        const [showModal, setShowModal] = useState<boolean>(false);
        const [showPassword, setShowPassword] = useState<boolean>(false);
        const [originalData, setOriginalData] = useState<Partial<FormData> | null>(null);

        const [viewingSupir, setViewingSupir] = useState<Supir | null>(null);
        const [editingSupir, setEditingSupir] = useState<Supir | null>(null);

        const [selectedSupirForDelete, setSelectedSupirForDelete] = useState<Supir | null>(null);
        const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

        const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_DATA });
        const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
          setAlertConfig({
            open: true,
            type,
            title,
            description,
            detailText,
          });
        };

        const closeAlert = () => {
          setAlertConfig((prev) => ({ ...prev, open: false }));
        };

        const getAuthConfig = () => {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          return {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          };
        };

        const getErrorMessage = (error: any, fallback: string) => {
          return error?.response?.data?.message || fallback;
        };

        const resetForm = () => {
          setFormData({ ...INITIAL_FORM_DATA });
          setFormErrors({});
          setShowPassword(false);
        };

        /* =========================
          FETCH DATA
        ========================= */

        const fetchSupir = async (): Promise<void> => {
          try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/supir-list`, getAuthConfig());
            setSupirList(response.data.data || []);
          } catch (error: any) {
            showAlert(
              "error",
              "Gagal memuat data",
              "Data supir tidak bisa dimuat. Silakan coba lagi.",
              getErrorMessage(error, "Terjadi kesalahan pada server.")
            );
          } finally {
            setLoading(false);
          }
        };

        useEffect(() => {
          fetchSupir();
        }, []);

        /* =========================
          MEMO DATA
        ========================= */

        const stats = useMemo(() => ({
          total: supirList.length,
          active: supirList.filter((s) => s.isActive).length,
          inactive: supirList.filter((s) => !s.isActive).length,
        }), [supirList]);

        const filteredSupir = useMemo(() => {
          return supirList
            .filter((s) =>
              s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.phoneNumber && s.phoneNumber.includes(searchTerm))
            )
            .filter((s) => {
              if (statusFilter === "ALL") return true;
              if (statusFilter === "ACTIVE") return s.isActive;
              return !s.isActive;
            });
        }, [supirList, searchTerm, statusFilter]);

        /* =========================
          MODAL HANDLERS
        ========================= */

        const openCreateModal = () => {
          setEditingSupir(null);
          setFormData({ ...INITIAL_FORM_DATA });
          setFormErrors({});
          setShowPassword(false);
          setShowModal(true);
        };

      const openEditModal = (supir: Supir) => {
        setEditingSupir(supir);
        setFormErrors({});
        setShowPassword(false);
        const data = {
          fullName: supir.fullName || "",
          email: supir.email || "",
          password: "",
          phoneNumber: supir.phoneNumber || "",
          isActive: supir.isActive,
        };
        setOriginalData(data); // ← tambah ini
        setFormData(data);
        setShowModal(true);
      };

        const closeFormModal = () => {
          setShowModal(false);
          setEditingSupir(null);
          setOriginalData(null);
          resetForm();
        };

        /* =========================
          FORM HANDLERS
        ========================= */

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value, type, checked } = e.target;
          let finalValue: string | boolean = type === "checkbox" ? checked : value;

          if (name === "phoneNumber") {
            finalValue = String(finalValue).replace(/\D/g, "");
          }

          setFormData((prev) => ({ ...prev, [name]: finalValue }));

          if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
          }
        };

        const validateForm = () => {
          const errors: Record<string, string> = {};
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const fullName = formData.fullName.trim();
          const email = formData.email.trim();
          const phoneNumber = formData.phoneNumber.trim();
          const password = formData.password.trim();

          if (!fullName) errors.fullName = "Nama lengkap wajib diisi";
          else if (fullName.length < 3) errors.fullName = "Nama lengkap minimal 3 karakter";

          if (!email) errors.email = "Email akses wajib diisi";
          else if (!emailRegex.test(email)) errors.email = "Format email tidak valid";

          if (!phoneNumber) errors.phoneNumber = "Nomor telepon wajib diisi";
          else if (phoneNumber.length < 10) errors.phoneNumber = "Nomor telepon minimal 10 digit";
          else if (phoneNumber.length > 15) errors.phoneNumber = "Nomor telepon maksimal 15 digit";

          if (!editingSupir) {
            if (!password) errors.password = "Password wajib diisi";
            else if (password.length < 6) errors.password = "Password minimal 6 karakter";
          }

          if (editingSupir && password && password.length < 6) {
            errors.password = "Password baru minimal 6 karakter";
          }

          setFormErrors(errors);
          return Object.keys(errors).length === 0;
        };

            const handleSubmit = async (e: FormEvent): Promise<void> => {
              e.preventDefault();
              if (!validateForm()) return;

              // ── CEK PERUBAHAN (khusus mode edit) ──
              if (editingSupir && originalData) {
                const hasChanged =
                  formData.fullName.trim() !== originalData.fullName ||
                  formData.email.trim() !== originalData.email ||
                  formData.phoneNumber.trim() !== originalData.phoneNumber ||
                  formData.isActive !== originalData.isActive ||
                  formData.password.trim() !== "";

                if (!hasChanged) {
                  closeFormModal();
                  showAlert("info", "Tidak Ada Perubahan", "Data supir tidak mengalami perubahan apapun.", "Silakan ubah data terlebih dahulu sebelum menyimpan.");
                  return;
                }
              }
          setSubmitting(true);

          try {
            const url = editingSupir
              ? `${API_BASE_URL}/supir/${editingSupir.id}`
              : `${API_BASE_URL}/add-operator`;

            const payload: Partial<FormData> = {
              fullName: formData.fullName.trim(),
              email: formData.email.trim().toLowerCase(),
              password: formData.password.trim(),
              phoneNumber: formData.phoneNumber.trim(),
              isActive: formData.isActive,
            };

            if (editingSupir && !payload.password) delete payload.password;

            if (editingSupir) {
              await axios.put(url, payload, getAuthConfig());
            } else {
              await axios.post(url, payload, getAuthConfig());
            }

            // Tutup form dan matikan loading SEGERA
            closeFormModal();
            setSubmitting(false); 
            
            // Tampilkan alert sukses SEGERA
            if (editingSupir) {
              showAlert("success", "Data berhasil diperbarui", "Perubahan profil supir berhasil disimpan ke dalam sistem.");
            } else {
              showAlert("success", "Supir berhasil ditambahkan", "Akun supir baru berhasil terdaftar dan dapat digunakan.");
            }

            // Refresh data tabel di background (tanpa await)
            fetchSupir(); 
          } catch (error: any) {
            setSubmitting(false); 
            showAlert(
              "error",
              "Gagal menyimpan data",
              "Data supir gagal disimpan. Periksa kembali data yang dimasukkan.",
              getErrorMessage(error, "Terjadi kesalahan pada server.")
            );
          }
        };

        /* =========================
          DELETE HANDLER
        ========================= */

        const getSupirDeleteBlockReason = (supir: Supir) => {
          if (supir.status === "DITUGASKAN" || supir.status === "BUSY" || supir.status === "BEKERJA") {
            return "Supir sedang ditugaskan dan tidak dapat dihapus. Selesaikan tugas terlebih dahulu.";
          }

          if (supir.isAssigned) {
            return "Supir sedang ditugaskan dan tidak dapat dihapus. Selesaikan tugas terlebih dahulu.";
          }

          return "";
        };

        const openDeleteConfirm = (supir: Supir) => {
          const blockReason = getSupirDeleteBlockReason(supir);
          if (blockReason) {
            showAlert("error", "Tidak Dapat Menghapus", blockReason);
            return;
          }

          setSelectedSupirForDelete(supir);
          setShowDeleteConfirm(true);
        };

        const handleDelete = async (id: string): Promise<void> => {
          try {
            setSubmitting(true);
            await axios.delete(`${API_BASE_URL}/supir/${id}`, getAuthConfig());
            
            // Matikan loading dan tampilkan alert SEGERA
            setSubmitting(false);
            showAlert("success", "Data berhasil dihapus", "Akun supir telah dihapus secara permanen dari sistem.");
            
            // Refresh data tabel di background
            fetchSupir();
          } catch (error: any) {
            setSubmitting(false);
            showAlert(
              "error",
              "Gagal menghapus data",
              "Akun supir gagal dihapus. Silakan coba lagi.",
              getErrorMessage(error, "Terjadi kesalahan sistem.")
            );
          }
        };

        /* =========================
          RENDER
        ========================= */

        return (
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
            
            {/* ─── ALERT SYSTEM INTEGRATION ────────────────────────────── */}
            
            {/* 1. Global Alert (Notifikasi Success/Error/Info) */}
            <AlertDialog 
              open={alertConfig.open} 
              type={alertConfig.type} 
              title={alertConfig.title} 
              description={alertConfig.description}
              detailText={alertConfig.detailText}
              onClose={closeAlert} 
            />

            {/* 2. Loading Alert (Saat submit / delete / toggle diproses API) */}
            <AlertDialog 
              open={submitting} 
              type="loading" 
              title="Mohon Tunggu" 
              description="Sedang memproses permintaan Anda ke server..."
              isLoading={true} 
              disableBackdropClose={true}
              onClose={() => {}} // Disabled onClose during loading
            />

            {/* 3. Delete Confirm Alert */}
            <AlertDialog
              open={showDeleteConfirm}
              type="delete"
              title="Hapus Supir?"
              description={
                selectedSupirForDelete
                  ? `Akun ${selectedSupirForDelete.fullName} akan dihapus secara permanen dari sistem.`
                  : "Akun supir akan dihapus secara permanen dari sistem."
              }
              buttonText="Hapus"
              showCancelButton={true}
              onConfirm={async () => {
                setShowDeleteConfirm(false); // Tutup dialog konfirmasi dulu
                if (selectedSupirForDelete) {
                  await handleDelete(selectedSupirForDelete.id);
                }
                setSelectedSupirForDelete(null);
              }}
              onClose={() => {
                setShowDeleteConfirm(false);
                setSelectedSupirForDelete(null);
              }}
            />
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />

              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                    Manajemen Pengguna
                  </span>

                  <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
                    Data Akun Supir
                  </h1>

                  <p className="text-[#5B7078] mt-2 font-medium">
                    Kelola akun akses aplikasi mobile untuk supir armada operasional.
                  </p>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {[
                { label: "Total Supir", val: stats.total, icon: Users, color: "text-gray-600", bg: "bg-gray-50" },
                { label: "Supir Aktif", val: stats.active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                { label: "Nonaktif", val: stats.inactive, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
              ].map((s, i) => (
                <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                    <s.icon size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl md:text-2xl font-black truncate text-gray-900">{s.val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ADD BUTTON */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openCreateModal}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                Tambah Supir Baru
              </button>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau telepon supir..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-base transition-all"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto">
                {["ALL", "ACTIVE", "INACTIVE"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                      statusFilter === filter ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {filter === "ALL" ? "Semua" : filter === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm overflow-x-auto border-none">
              <table className="w-full text-left border-spacing-0 min-w-[850px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    <th className="px-6 py-4 w-16">No</th>
                    <th className="px-6 py-4">Profil Supir</th>
                    <th className="px-6 py-4">Kontak Email / Telp</th>
                    <th className="px-6 py-4">Status Akses</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                          <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
                          <span className="italic text-base font-medium">Memuat data supir...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSupir.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic text-base">
                        {searchTerm ? "Tidak ada supir yang cocok dengan pencarian." : "Belum ada data supir terdaftar."}
                      </td>
                    </tr>
                  ) : (
                    filteredSupir.map((supir, index) => (
                      <tr key={supir.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 text-base text-gray-400 font-bold">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 font-bold text-[#4A6D55] shrink-0">
                              {supir.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-base font-bold text-gray-900">{supir.fullName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs md:text-sm text-blue-600 font-mono font-bold">
                              <Mail size={12} className="text-blue-400" />
                              {supir.email}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500 bg-gray-50 w-fit px-2 py-0.5 rounded border border-gray-100">
                              <Phone size={10} className="text-emerald-500" />
                              {supir.phoneNumber || "Belum diatur"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            supir.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {supir.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                            {supir.isActive ? "AKTIF" : "NONAKTIF"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setViewingSupir(supir)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex shadow-sm"
                            title="Lihat Detail"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(supir)}
                            className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex shadow-sm"
                            title="Edit Data"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(supir)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex shadow-sm"
                            title="Hapus Akun"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* FORM MODAL */}
            <AnimatePresence>
              {showModal && (
                <div className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden my-auto flex flex-col border border-gray-100"
                  >
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                      <h3 className="font-extrabold text-gray-800 flex items-center gap-2.5 tracking-tight">
                        {editingSupir ? (
                          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Edit3 size={18} /></div>
                        ) : (
                          <div className="p-1.5 bg-green-50 text-[#4A6D55] rounded-lg"><UserPlus size={18} /></div>
                        )}
                        {editingSupir ? "Edit Profil Supir" : "Registrasi Supir Baru"}
                      </h3>
                      <button
                        type="button"
                        onClick={closeFormModal}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  <form key={editingSupir ? `edit-${editingSupir.id}` : "create-supir"} onSubmit={handleSubmit} className="p-6 space-y-4" autoComplete="off" noValidate>
                    {/* Hidden fields untuk autofill browser */}
                    <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} className="absolute opacity-0 pointer-events-none h-0 w-0" />
                    <input type="password" name="fake_password" autoComplete="new-password" tabIndex={-1} className="absolute opacity-0 pointer-events-none h-0 w-0" />

                    {Object.keys(formErrors).length > 0 && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>Lengkapi semua data yang wajib diisi sebelum menyimpan.</span>
                      </div>
                    )}

                    {/* FIELD NAMA LENGKAP - full width */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 tracking-wide">
                        Nama Lengkap Supir <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.fullName ? "text-red-400" : "text-gray-400"}`} size={16} />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama lengkap supir"
                          className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border ${
                            formErrors.fullName ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10" : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                          }`}
                        />
                      </div>
                      {formErrors.fullName && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1"><AlertCircle size={12} />{formErrors.fullName}</p>}
                    </div>

                    {/* GRID 2 KOLOM: Email & Telepon */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* EMAIL */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 tracking-wide">
                          Email Akses <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.email ? "text-red-400" : "text-gray-400"}`} size={16} />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="contoh: supir@perusahaan.com"
                            className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border ${
                              formErrors.email ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10" : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                            }`}
                          />
                        </div>
                        {formErrors.email && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1"><AlertCircle size={12} />{formErrors.email}</p>}
                      </div>

                      {/* TELEPON */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 tracking-wide">
                          Nomor Telepon <span className="text-red-500">*</span>
                          <span className="text-gray-400 font-normal ml-1">(Angka saja)</span>
                        </label>
                        <div className="relative">
                          <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.phoneNumber ? "text-red-400" : "text-gray-400"}`} size={16} />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={15}
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="Contoh: 08123456789"
                            className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border ${
                              formErrors.phoneNumber ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10" : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                            }`}
                          />
                        </div>
                        {formErrors.phoneNumber && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1"><AlertCircle size={12} />{formErrors.phoneNumber}</p>}
                      </div>
                    </div>

                    {/* PASSWORD - full width */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 tracking-wide">
                        {editingSupir ? "Password Baru" : "Password Akses"}
                        <span className={editingSupir ? "text-gray-400 text-xs font-normal ml-1" : "text-red-500 ml-1"}>
                          {editingSupir ? "(Opsional)" : "*"}
                        </span>
                      </label>
                      <div className="relative">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.password ? "text-red-400" : "text-gray-400"}`} size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={editingSupir ? "Kosongkan jika tidak ingin diubah" : "Minimal 6 karakter"}
                          className={`w-full pl-11 pr-11 py-3 bg-gray-50/80 rounded-xl outline-none text-sm font-medium transition-all border ${
                            formErrors.password ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10" : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.password && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1"><AlertCircle size={12} />{formErrors.password}</p>}
                    </div>

                    {/* STATUS AKUN - Dropdown (Hanya saat edit) */}
                    {editingSupir && (
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 tracking-wide">
                          Status Akun <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Power className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <select
                            name="isActive"
                            value={formData.isActive ? "AKTIF" : "NONAKTIF"}
                            onChange={(e) => {
                              const newValue = e.target.value === "AKTIF";
                              setFormData((prev) => ({ ...prev, isActive: newValue }));
                            }}
                            className="w-full pl-11 pr-10 py-3 bg-gray-50/80 border border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 rounded-xl outline-none text-sm font-medium transition-all appearance-none"
                          >
                            <option value="AKTIF">Aktif</option>
                            <option value="NONAKTIF">Nonaktif</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium pl-1">Status aktif mengizinkan supir mengakses aplikasi mobile.</p>
                      </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="pt-4 flex items-center gap-3 w-full">
                      <button
                        type="button"
                        onClick={closeFormModal}
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
                          <span>{editingSupir ? "Simpan Perubahan" : "Daftarkan Supir"}</span>
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
              {viewingSupir && (
                <div className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden my-auto"
                  >
                    <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck size={20} /></div>
                        <h3 className="font-extrabold text-lg text-gray-800">Detail Supir</h3>
                      </div>
                      <button type="button" onClick={() => setViewingSupir(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="flex flex-col items-center gap-3 pt-2">
                        <div className="w-20 h-20 bg-green-50 text-[#4A6D55] border border-green-100 rounded-full flex items-center justify-center text-3xl font-black shadow-sm">
                          {viewingSupir.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-center">
                          <h4 className="text-xl font-black text-gray-900">{viewingSupir.fullName}</h4>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                            viewingSupir.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {viewingSupir.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                            {viewingSupir.isActive ? "Status: Aktif" : "Status: Nonaktif"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Mail size={18} /></div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alamat Email</p>
                            <p className="text-base font-bold text-gray-800 mt-0.5">{viewingSupir.email}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-green-500"><Phone size={18} /></div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nomor Telepon</p>
                            <p className="text-base font-bold text-gray-800 mt-0.5">{viewingSupir.phoneNumber || "Belum ditambahkan"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t flex justify-end">
                      <button type="button" onClick={() => setViewingSupir(null)} className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md text-base">
                        Tutup Detail
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      }