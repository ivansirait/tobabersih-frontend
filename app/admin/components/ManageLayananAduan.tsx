"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Trash2,
  Search,
  User,
  RefreshCw,
  Repeat,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
  Clock,
  CheckCircle2,
  FileText,
  MapPin,
  Calendar,
  Truck,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import PenugasanDetail from "./PenugasanDetail";
import AlertDialog, { type AlertType } from "./AlertDialog";

const API_BASE_URL = "/api";
const ITEMS_PER_PAGE = 12;

const formatCoordinate = (coord: any, decimals: number = 5): string | null => {
  if (!coord) return null;
  const num = typeof coord === "string" ? parseFloat(coord) : coord;
  return Number.isFinite(num) ? num.toFixed(decimals) : null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = {} as any;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const isOverdue = (item: any): boolean => {
  if (!item.scheduledAt) return false;
  if (item.status === "SELESAI" || item.status === "BEKERJA" || item.status === "LAPORAN_BARU") return false;
  return Date.now() > new Date(item.scheduledAt).getTime();
};

interface Penugasan {
  id: string;
  taskNumber?: string;
  status: string;
  location: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  scheduledAt?: string;
  createdAt?: string;
  description?: string;
  notes?: string;
  pelapor?: string;
  report?: {
    id: string;
    description?: string;
    jenisSampah?: string;
    pelapor?: string;
    latitude?: number;
    longitude?: number;
  };
  driver?: { id: string; fullName: string };
  truck?: { id: string; plateNumber: string };
}

interface Item extends Penugasan {
  isLaporanBaru?: boolean;
}

interface Truk {
  id: string;
  plateNumber: string;
  unitCode?: string | null;
  brand?: string | null;
  truckType?: string | null;
  operatorId?: string | null;
  operator?: { id: string; fullName: string; email?: string; phoneNumber?: string | null } | null;
  driver?: { id: string; fullName: string } | null;
  status: string;
}

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

export default function ManagePenugasan() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [trukList, setTrukList] = useState<Truk[]>([]);
  const [filter, setFilter] = useState({ status: "" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reportId: "", truckId: "", driverId: "", scheduledAt: "", location: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ open: false, type: "info", title: "", description: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showTolakConfirm, setShowTolakConfirm] = useState(false);
  const [pendingTolakId, setPendingTolakId] = useState<string | null>(null);
  const [pendingTolakName, setPendingTolakName] = useState<string>("");

  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({ open: true, type, title, description, detailText });
  };
  const closeAlert = () => setAlertConfig((prev) => ({ ...prev, open: false }));
  const getErrorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

  const toDateTimeLocalValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toDateTimeLocalValue(now);
  };

  const getDriverFromTruck = (truk: Truk) => {
    if (truk.operator) return { id: truk.operator.id, fullName: truk.operator.fullName };
    if (truk.driver) return { id: truk.driver.id, fullName: truk.driver.fullName };
    return null;
  };
  const getDriverName = (truk: Truk) => getDriverFromTruck(truk)?.fullName ?? "Belum Ada Driver";
  const getDriverId = (truk: Truk) => getDriverFromTruck(truk)?.id ?? "";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [penugasanRes, laporanRes, trukRes] = await Promise.all([
        api.get("/penugasan?type=ADUAN"),
        api.get("/laporan"),
        api.get("/admin/truks"),
      ]);

      const penugasanData = (penugasanRes.data.data || []).map((item: any) => ({
  ...item,
  scheduledAt: item.scheduledAt ?? item.scheduled_at ?? null,
}));
      const assigned = new Set(penugasanData.map((p: any) => p.report?.id).filter(Boolean));

      const laporanBaru = (laporanRes.data.data || [])
        .filter((item: any) =>
          (item.status === "LAPORAN_BARU" || item.status === "PENDING") && !assigned.has(item.id)
        )
        .map((item: any) => ({
          id: item.id,
          status: "LAPORAN_BARU",
          isLaporanBaru: true,
          taskNumber: null,
          location:
            typeof item.location === "string"
              ? item.location
              : item.location?.name || item.description || "Lokasi tidak tersedia",
          latitude: item.latitude || item.koordinat?.latitude,
          longitude: item.longitude || item.koordinat?.longitude,
          district: item.jenisSampah,
          description: item.description,
          pelapor: item.pelapor,
          createdAt: item.createdAt,
          report: {
            id: item.id,
            description: item.description,
            jenisSampah: item.jenisSampah,
            pelapor: item.pelapor,
            latitude: item.latitude || item.koordinat?.latitude,
            longitude: item.longitude || item.koordinat?.longitude,
          },
        }));

      const combined = [...laporanBaru, ...penugasanData];
      const seen = new Set<string>();
      const deduplicated = combined.filter((item: any) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setItemList(deduplicated);
      setTrukList(trukRes.data.data || []);
      setCurrentPage(1);
    } catch (error: any) {
      showAlert("error", "Gagal memuat data", "Data penugasan tidak bisa dimuat.", getErrorMessage(error, "Terjadi kesalahan pada server."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filter]);

  const getEffectiveStatus = (item: Item): string => {
    if (item.status === "DITUGASKAN" && isOverdue(item)) return "TIDAK_DIKERJAKAN";
    return item.status;
  };

  const filteredItems = useMemo(() => {
    return itemList.filter((item) => {
      const s = searchTerm.toLowerCase();
      const matchSearch =
        (item.location || "").toLowerCase().includes(s) ||
        (item.description || "").toLowerCase().includes(s) ||
        (item.driver?.fullName || "").toLowerCase().includes(s) ||
        (item.pelapor || "").toLowerCase().includes(s) ||
        (item.taskNumber || "").toLowerCase().includes(s);
      const effectiveStatus = getEffectiveStatus(item);
      const matchStatus = filter.status ? effectiveStatus === filter.status : true;
      return matchSearch && matchStatus;
    });
  }, [itemList, searchTerm, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    for (let i = start; i <= end; i++) range.push(i);
    if (start > 1) range.unshift(-1, 1);
    if (end < totalPages) range.push(-2, totalPages);
    return range;
  }, [currentPage, totalPages]);

  const resetForm = () => {
    setFormData({ reportId: "", truckId: "", driverId: "", scheduledAt: "", location: "" });
    setFormErrors({});
    setIsEditMode(false);
    setEditingId(null);
  };

  const isTruckAvailable = (truckId: string, scheduledAt: string, excludeId?: string): boolean => {
    const sel = new Date(scheduledAt).getTime();
    return !itemList
      .filter((i) => i.status !== "LAPORAN_BARU" && i.truck?.id === truckId && i.scheduledAt && i.id !== excludeId)
      .some((i) => Math.abs(sel - new Date(i.scheduledAt!).getTime()) < 2 * 60 * 60 * 1000);
  };

  const validateForm = (isEdit = false) => {
    const errors: { [key: string]: string } = {};
    if (!formData.truckId) {
      errors.truckId = "Armada harus dipilih";
    } else {
      const t = trukList.find((t) => t.id === formData.truckId);
      if (!t || !getDriverId(t)) errors.truckId = "Armada harus memiliki driver.";
    }
 if (!formData.scheduledAt) {
  errors.scheduledAt = "Jadwal pelaksanaan wajib diisi";
} else {
  const d = new Date(formData.scheduledAt);
  if (d < new Date()) errors.scheduledAt = "Jadwal tidak boleh kurang dari waktu sekarang";
  else if (formData.truckId && !isTruckAvailable(formData.truckId, formData.scheduledAt, isEdit ? editingId || undefined : undefined))
    errors.scheduledAt = "Armada sudah ada penugasan dalam rentang 2 jam.";
}

    if (!formData.location.trim()) errors.location = "Lokasi penugasan wajib diisi";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openTugaskanModal = (item: Item) => {
    setSelectedItem(item);
    const loc =
      typeof item.location === "string"
        ? item.location
        : (item.location as any)?.name || (item.location as any)?.address || item.description || "";
    setFormData({ reportId: item.report?.id || item.id, truckId: "", driverId: "", scheduledAt: "", location: loc });
    setIsEditMode(false);
    setEditingId(null);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      reportId: item.report?.id || item.id,
      truckId: item.truck?.id || "",
      driverId: item.driver?.id || "",
      scheduledAt: item.scheduledAt ? toDateTimeLocalValue(new Date(item.scheduledAt)) : "",
      location: item.location || "",
    });
    setIsEditMode(true);
    setEditingId(item.id);
    setFormErrors({});
    setShowModal(true);
  };

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) setFormErrors({ ...formErrors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateForm(isEditMode)) return;
    setSubmitting(true);
    try {
      const payload = {
        reportId: formData.reportId, truckId: formData.truckId, driverId: formData.driverId,
        scheduledAt: formData.scheduledAt, location: formData.location.trim(),
        district: selectedItem?.district || null, description: selectedItem?.description || null, notes: "",
      };
      if (isEditMode && editingId) {
        await api.put(`/penugasan/${editingId}`, payload);
        showAlert("success", "Penugasan berhasil diperbarui", "Data penugasan telah diubah.");
      } else {
        await api.post("/penugasan/aduan", payload);
        showAlert("success", "Penugasan berhasil dibuat", "Laporan aduan telah ditugaskan ke armada.");
      }
      setShowModal(false);
      resetForm();
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      showAlert("error", isEditMode ? "Gagal memperbarui" : "Gagal membuat penugasan", "Terjadi kesalahan saat menyimpan.", getErrorMessage(error, "Silakan coba lagi."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/penugasan/${pendingDeleteId}`);
      showAlert("success", "Penugasan berhasil dihapus", "Data penugasan telah dihapus secara permanen.");
      fetchData();
    } catch (error: any) {
      showAlert("error", "Gagal menghapus penugasan", "Terjadi kesalahan.", getErrorMessage(error, "Silakan coba lagi."));
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
      setPendingDeleteName("");
    }
  };

  const handleTolak = async () => {
    if (!pendingTolakId) return;
    setSubmitting(true);
    try {
      await api.put(`/laporan/${pendingTolakId}/tolak`);
      showAlert("success", "Laporan berhasil ditolak", "Status laporan telah diubah menjadi ditolak.");
      fetchData();
    } finally {
      setSubmitting(false);
      setShowTolakConfirm(false);
      setPendingTolakId(null);
      setPendingTolakName("");
    }
  };

  const stats = {
    total: itemList.length,
    laporan_baru: itemList.filter((i) => i.status === "LAPORAN_BARU").length,
    dalam_proses: itemList.filter((i) => i.status === "DITUGASKAN" || i.status === "BEKERJA").length,
    selesai: itemList.filter((i) => i.status === "SELESAI").length,
    driver_aktif: new Set(itemList.filter((i) => i.status !== "LAPORAN_BARU").map((i) => i.driver?.id)).size,
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
      LAPORAN_BARU: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/10", dot: "bg-red-500" },
      DITUGASKAN: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/10", dot: "bg-blue-500" },
      BEKERJA: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/10", dot: "bg-amber-500" },
      SELESAI: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/10", dot: "bg-emerald-500" },
      DITOLAK: { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-600/10", dot: "bg-slate-400" },
      TIDAK_DIKERJAKAN: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-600/10", dot: "bg-orange-500" },
    };
    const style = styles[status] || styles.DITUGASKAN;
    const label = status === "TIDAK_DIKERJAKAN" ? "Tidak Dikerjakan" : status.replace(/_/g, " ");
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset whitespace-nowrap ${style.bg} ${style.text} ${style.ring}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${style.dot}`} />
        {label}
      </span>
    );
  };

  const selectedTruck = trukList.find((t) => t.id === formData.truckId);
  const selectedDriverName = selectedTruck ? getDriverName(selectedTruck) : "";
  const hasDriver = selectedTruck ? !!getDriverId(selectedTruck) : false;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      {/* Alerts */}
      <AlertDialog open={alertConfig.open} type={alertConfig.type} title={alertConfig.title} description={alertConfig.description} detailText={alertConfig.detailText} onClose={closeAlert} />
      <AlertDialog open={submitting} type="loading" title="Mohon Tunggu" description="Sedang memproses permintaan Anda ke server..." isLoading={true} disableBackdropClose={true} onClose={() => {}} />
      <AlertDialog
        open={showDeleteConfirm}
        type="delete"
        title="Hapus Penugasan?"
        description={pendingDeleteName ? `Penugasan "${pendingDeleteName}" akan dihapus secara permanen.` : "Data penugasan akan dihapus secara permanen."}
        buttonText={deleteLoading ? "Menghapus..." : "Hapus"}
        showCancelButton={!deleteLoading}
        onConfirm={handleDelete}
        onClose={() => { if (!deleteLoading) { setShowDeleteConfirm(false); setPendingDeleteId(null); setPendingDeleteName(""); } }}
      />
      <AlertDialog
        open={showTolakConfirm}
        type="delete"
        title="Tolak Laporan?"
        description={pendingTolakName ? `Laporan "${pendingTolakName}" akan ditolak.` : "Laporan akan ditolak dan statusnya diubah."}
        buttonText="Ya, Tolak"
        showCancelButton={true}
        onConfirm={handleTolak}
        onClose={() => { setShowTolakConfirm(false); setPendingTolakId(null); setPendingTolakName(""); }}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
              Operasional & Monitoring
            </span>
            <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
              Penugasan Aduan Masyarakat
            </h1>
            <p className="text-[#5B7078] mt-2 font-medium">
              Monitoring laporan warga dan distribusi armada operasional.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: "Total Tugas", value: stats.total, icon: ClipboardList, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Laporan Baru", value: stats.laporan_baru, icon: FileText, color: "text-red-600", bg: "bg-red-50" },
          { label: "Dalam Proses", value: stats.dalam_proses, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Selesai", value: stats.selesai, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Driver Aktif", value: stats.driver_aktif, icon: User, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-sm md:text-xl font-black truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari deskripsi, driver, pelapor, atau nomor tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
          />
        </div>
        <select
          onChange={(e) => setFilter({ status: e.target.value })}
          className="px-4 py-3 rounded-xl bg-gray-50 border-none outline-none text-sm focus:ring-2 focus:ring-green-500/20"
        >
          <option value="">Semua Status</option>
          <option value="LAPORAN_BARU">Laporan Baru</option>
          <option value="DITUGASKAN">Ditugaskan</option>
          <option value="BEKERJA">Bekerja</option>
          <option value="SELESAI">Selesai</option>
          <option value="TIDAK_DIKERJAKAN">Tidak Dikerjakan</option>
        </select>
        <button onClick={fetchData} className="px-5 py-3 rounded-xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-200 transition-all flex items-center gap-2 justify-center">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border-none">

        {/* ── Desktop Table ── */}
        <div className="hidden md:block overflow-x-hidden">
          <table className="w-full text-left table-fixed">
            <colgroup>
              <col style={{ width: "16%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                <th className="px-5 py-4">Pelapor</th>
                <th className="px-5 py-4">Deskripsi</th>
                <th className="px-5 py-4">Driver & Armada</th>
                <th className="px-5 py-4">Jadwal</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
                      <span>Memuat data penugasan...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const effectiveStatus = getEffectiveStatus(item);
                  const overdue = effectiveStatus === "TIDAK_DIKERJAKAN";
                  return (
                    <tr key={item.id} className={`transition-colors group ${overdue ? "bg-orange-50/30" : "hover:bg-gray-50/80"}`}>

                      {/* ── Pelapor + Lokasi ── */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${overdue ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"}`}>
                            <User size={13} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {item.pelapor || item.report?.pelapor || "Anonim"}
                            </p>
                            {/* Lokasi / koordinat di bawah nama */}
                            {formatCoordinate(item.latitude) && formatCoordinate(item.longitude) ? (
                              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={9} className="shrink-0" />
                                <span className="font-mono truncate">{formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}</span>
                              </p>
                            ) : item.location ? (
                              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={9} className="shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </p>
                            ) : item.district ? (
                              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={9} className="shrink-0" /> {item.district}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* ── Deskripsi ── */}
                      <td className="px-5 py-4">
                        {item.description || item.report?.description ? (
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                            {item.description || item.report?.description}
                          </p>
                        ) : (
                          <span className="text-xs italic text-gray-400">-</span>
                        )}
                      </td>

                      {/* ── Driver & Armada ── */}
                      <td className="px-5 py-4">
                        {item.status === "LAPORAN_BARU" ? (
                          <span className="text-xs italic text-gray-400">Belum Ditugaskan</span>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 truncate">{item.driver?.fullName || "Tanpa Driver"}</p>
                            <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-gray-600 mt-1">
                              <Truck size={9} /> {item.truck?.plateNumber || "-"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ── Jadwal ── */}
                      <td className="px-5 py-4">

                    {item.scheduledAt ? (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dijadwalkan</p>
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Calendar size={11} className={`shrink-0 ${overdue ? "text-orange-500" : "text-gray-400"}`} />
                          <span className={overdue ? "text-orange-500" : ""}>
                            {new Date(item.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {overdue && <AlertTriangle size={10} className="text-orange-500" />}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs italic text-gray-400">-</span>
                    )}

                      </td>

                      {/* ── Status ── */}
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={effectiveStatus} />
                      </td>

                      {/* ── Aksi ── */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end items-center gap-1.5 flex-wrap">
                          {item.status === "LAPORAN_BARU" ? (
                            <>
                              <button
                                onClick={() => openTugaskanModal(item)}
                                className="px-3 py-1.5 rounded-xl bg-[#4A6D55] text-white text-xs font-bold hover:bg-[#3a5643] transition-all shadow-sm whitespace-nowrap"
                              >
                                Tugaskan
                              </button>
                              <button
                                onClick={() => { setPendingTolakId(item.id); setPendingTolakName(item.location || "Laporan"); setShowTolakConfirm(true); }}
                                className="px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-all shadow-sm whitespace-nowrap"
                              >
                                Tolak
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setSelectedItem(item); setShowDetailModal(true); }}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex"
                                title="Lihat Detail"
                              >
                                <Eye size={14} />
                              </button>
                              {item.status !== "SELESAI" && (
                                <button onClick={() => openEditModal(item)} className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors inline-flex" title="Edit">
                                  <Repeat size={14} />
                                </button>
                              )}
                              {(item.status === "DITUGASKAN" || item.status === "BEKERJA") && (
                                <button
                                  onClick={() => { setPendingDeleteId(item.id); setPendingDeleteName(item.taskNumber || item.location || "Penugasan"); setShowDeleteConfirm(true); }}
                                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card Layout ── */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <Loader2 className="animate-spin text-[#4A6D55]" size={28} />
              <span className="text-sm italic">Memuat data...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="py-16 text-center text-gray-400 italic text-sm">Tidak ada data ditemukan.</div>
          ) : (
            paginatedItems.map((item) => {
              const effectiveStatus = getEffectiveStatus(item);
              const overdue = effectiveStatus === "TIDAK_DIKERJAKAN";
              return (
                <div key={item.id} className={`p-4 ${overdue ? "bg-orange-50/30" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${overdue ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                        <User size={13} />
                      </div>
                      <span className="text-sm font-bold text-gray-800 truncate">
                        {item.pelapor || item.report?.pelapor || "Anonim"}
                      </span>
                    </div>
                    <StatusBadge status={effectiveStatus} />
                  </div>
                  {/* Lokasi */}
                  {item.location && (
                    <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </p>
                  )}
                  {/* Deskripsi */}
                  {(item.description || item.report?.description) && (
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                      {item.description || item.report?.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    {item.status !== "LAPORAN_BARU" && item.driver && (
                      <span className="flex items-center gap-1"><User size={10} /> {item.driver.fullName}</span>
                    )}
                    {item.truck && (
                      <span className="flex items-center gap-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        <Truck size={9} /> {item.truck.plateNumber}
                      </span>
                    )}
                   {item.scheduledAt && (
                    <span className={`flex items-center gap-1 ${overdue ? "text-orange-500 font-semibold" : ""}`}>
                      <Calendar size={10} />
                      {new Date(item.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {overdue && <AlertTriangle size={10} />}
                    </span>
                  )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === "LAPORAN_BARU" ? (
                      <>
                        <button onClick={() => openTugaskanModal(item)} className="flex-1 py-2 rounded-xl bg-[#4A6D55] text-white text-xs font-bold hover:bg-[#3a5643] transition-all">Tugaskan</button>
                        <button onClick={() => { setPendingTolakId(item.id); setPendingTolakName(item.location || "Laporan"); setShowTolakConfirm(true); }} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all">Tolak</button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedItem(item); setShowDetailModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Eye size={14} /></button>
                        {item.status !== "SELESAI" && (
                          <button onClick={() => openEditModal(item)} className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"><Repeat size={14} /></button>
                        )}
                        {(item.status === "DITUGASKAN" || item.status === "BEKERJA") && (
                          <button onClick={() => { setPendingDeleteId(item.id); setPendingDeleteName(item.taskNumber || item.location || "Penugasan"); setShowDeleteConfirm(true); }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 font-medium">
              Menampilkan{" "}
              <span className="font-bold text-gray-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span>
              {" "}dari <span className="font-bold text-gray-600">{filteredItems.length}</span> penugasan
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsLeft size={16} /></button>
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={16} /></button>
              <div className="flex items-center gap-1 mx-1">
                {pageNumbers.map((page, i) =>
                  page < 0 ? (
                    <span key={`e-${i}`} className="px-1 text-gray-400 text-xs font-bold select-none">…</span>
                  ) : (
                    <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`min-w-[34px] h-[34px] rounded-lg text-xs font-bold transition-all ${currentPage === page ? "bg-[#4A6D55] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>{page}</button>
                  )
                )}
              </div>
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size={16} /></button>
              <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tugaskan / Edit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-lg min-h-screen sm:min-h-0 overflow-hidden my-auto"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="font-bold text-lg text-gray-900">{isEditMode ? "Edit Penugasan" : "Buat Penugasan"}</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">
                    {isEditMode ? "Ubah armada, jadwal, atau lokasi" : "Tentukan armada dan jadwal operasional"}
                  </p>
                </div>
                <button onClick={() => { setShowModal(false); resetForm(); setSelectedItem(null); }} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Armada */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Armada / Truk <span className="text-red-500">*</span>
                  </label>
                  <select
                    required name="truckId" value={formData.truckId}
                    onChange={(e) => {
                      const sel = trukList.find((t) => t.id === e.target.value);
                      setFormData({ ...formData, truckId: e.target.value, driverId: sel ? getDriverId(sel) : "" });
                      if (formErrors.truckId) setFormErrors({ ...formErrors, truckId: "" });
                    }}
                    className={`w-full p-3.5 bg-gray-50 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 font-medium ${formErrors.truckId ? "border-red-400" : "border-gray-100 focus:border-green-500"}`}
                  >
                    <option value="">-- Pilih Armada --</option>
                    {trukList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.plateNumber}{t.unitCode ? ` (${t.unitCode})` : ""} - {getDriverName(t)}{!getDriverId(t) ? " ⚠️ Tanpa Driver" : ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.truckId && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.truckId}</p>}
                </div>

                {formData.truckId && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl p-4 ${hasDriver ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}
                  >
                    {hasDriver ? (
                      <>
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 size={12} /> Driver Terpilih</p>
                        <p className="text-lg font-black text-green-900 mt-1">{selectedDriverName}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">⚠️ Armada Tanpa Driver</p>
                        <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">Armada ini belum memiliki driver. Silakan assign driver terlebih dahulu di menu Manajemen Armada.</p>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Jadwal */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Jadwal Pelaksanaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local" required name="scheduledAt" value={formData.scheduledAt}
                    onChange={handleInputChange} min={getCurrentDateTimeLocal()}
                    className={`w-full p-3.5 bg-gray-50 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 font-medium ${formErrors.scheduledAt ? "border-red-400" : "border-gray-100 focus:border-green-500"}`}
                  />
                  {formErrors.scheduledAt
                    ? <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.scheduledAt}</p>
                   : <p className="mt-1 text-[11px] text-gray-500 ml-1">Tidak boleh bentrok dalam rentang 2 jam dengan penugasan lain.</p>
                  }
                </div>

                {/* Lokasi */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Lokasi Penugasan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required name="location" rows={3} value={formData.location} onChange={handleInputChange}
                    className={`w-full p-3.5 bg-gray-50 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 font-medium resize-none ${formErrors.location ? "border-red-400" : "border-gray-100 focus:border-green-500"}`}
                    placeholder="Masukkan alamat lengkap lokasi penugasan"
                  />
                  {formErrors.location && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.location}</p>}
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); setSelectedItem(null); }} className="flex-1 px-6 py-4 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all">
                    Batal
                  </button>
                  <button
                    type="submit" disabled={(!hasDriver && !!formData.truckId) || submitting}
                    className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 hover:bg-[#3a5643] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                    {isEditMode ? "Simpan Perubahan" : "Konfirmasi Penugasan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <PenugasanDetail penugasan={selectedItem} onClose={() => { setShowDetailModal(false); setSelectedItem(null); }} />
      )}
    </div>
  );
}