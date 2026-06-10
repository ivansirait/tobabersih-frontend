"use client";

import { useState, useEffect, useMemo, ReactNode } from "react";
import axios from "axios";
import {
  Trash2,
  Search,
  User,
  RefreshCw,
  Repeat,
  ClipboardList,
  // ✅ [PERUBAHAN 1] Tambah ChevronsLeft & ChevronsRight — sebelumnya tidak ada di import
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
  Clock,
  CheckCircle2,
  FileText,
  Edit3,
  MapPin,
  Calendar,
  Truck
} from "lucide-react";

import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import PenugasanDetail from "./PenugasanDetail";
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';

const API_BASE_URL = "/api";

// ✅ [PERUBAHAN 2] Konstanta ITEMS_PER_PAGE — dipindah ke level modul agar konsisten dengan ManageSupir
const ITEMS_PER_PAGE = 12;

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

interface Penugasan {
  id: string;
  taskNumber?: string;
  status: string;
  location: string;
  district?: string;
  scheduledAt?: string;
  description?: string;
  notes?: string;
  pelapor?: string;

  report?: {
    id: string;
    description?: string;
    jenisSampah?: string;
    pelapor?: string;
  };

  driver?: {
    id: string;
    fullName: string;
  };

  truck?: {
    id: string;
    plateNumber: string;
  };
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
  operator?: {
    id: string;
    fullName: string;
    email?: string;
    phoneNumber?: string | null;
  } | null;
  driver?: {
    id: string;
    fullName: string;
  } | null;
  status: string;
}

const MIN_SCHEDULE_DAYS = 3;

export default function ManagePenugasan() {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [trukList, setTrukList] = useState<Truk[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showConfirmTolakDialog, setShowConfirmTolakDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<ReactNode>(<CheckCircle2 size={24} />);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [pendingTolakId, setPendingTolakId] = useState<string | null>(null);
  const [pendingTolakName, setPendingTolakName] = useState<string>('');

  const [filter, setFilter] = useState({
    status: "",
  });

  const [formData, setFormData] = useState({
    reportId: "",
    truckId: "",
    driverId: "",
    scheduledAt: "",
    location: "",
  });

  const toDateTimeLocalValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getMinimumScheduleDate = () => {
    const minDate = new Date();
    minDate.setSeconds(0, 0);
    minDate.setDate(minDate.getDate() + MIN_SCHEDULE_DAYS);
    return minDate;
  };

  const minScheduleValue = toDateTimeLocalValue(getMinimumScheduleDate());

  const getDriverFromTruck = (truk: Truk) => {
    if (truk.operator) {
      return { id: truk.operator.id, fullName: truk.operator.fullName };
    }
    if (truk.driver) {
      return { id: truk.driver.id, fullName: truk.driver.fullName };
    }
    return null;
  };

  const getDriverName = (truk: Truk): string => {
    const driver = getDriverFromTruck(truk);
    return driver ? driver.fullName : "Belum Ada Driver";
  };

  const getDriverId = (truk: Truk): string => {
    const driver = getDriverFromTruck(truk);
    return driver ? driver.id : "";
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [penugasanRes, laporanRes, trukRes] = await Promise.all([
        api.get("/penugasan?type=ADUAN"),
        api.get("/laporan"),
        api.get("/admin/truks"),
      ]);

      const penugasanData = penugasanRes.data.data || [];

      const laporanYangSudahDitugaskan = new Set(
        penugasanData
          .map((p: any) => p.report?.id)
          .filter(Boolean)
      );

      const laporanBaru = (laporanRes.data.data || [])
        .filter((item: any) =>
          (item.status === "LAPORAN_BARU" || item.status === "PENDING") &&
          !laporanYangSudahDitugaskan.has(item.id)
        )
        .map((item: any) => ({
          id: item.id,
          status: "LAPORAN_BARU",
          isLaporanBaru: true,
          taskNumber: null,
          location: typeof item.location === "string"
            ? item.location
            : item.location?.name || item.description || "Lokasi tidak tersedia",
          district: item.jenisSampah,
          description: item.description,
          pelapor: item.pelapor,
          report: {
            id: item.id,
            description: item.description,
            jenisSampah: item.jenisSampah,
            pelapor: item.pelapor,
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
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ [PERUBAHAN 3] useEffect reset halaman ke 1 setiap search atau filter berubah — diambil dari pola ManageSupir
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter]);

  const filteredItems = useMemo(() => {
    return itemList.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchSearch =
        (item.location || "").toLowerCase().includes(search) ||
        (item.driver?.fullName || "").toLowerCase().includes(search) ||
        (item.pelapor || "").toLowerCase().includes(search) ||
        (item.taskNumber || "").toLowerCase().includes(search);

      const matchStatus = filter.status
        ? item.status === filter.status
        : true;

      return matchSearch && matchStatus;
    });
  }, [itemList, searchTerm, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // ✅ [PERUBAHAN 4] Computed pageNumbers dengan ellipsis — identik dengan ManageSupir, sebelumnya tidak ada
  const penugasanPageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    for (let i = start; i <= end; i++) range.push(i);
    if (start > 1) range.unshift(-1, 1);       // -1 = ellipsis kiri
    if (end < totalPages) range.push(-2, totalPages); // -2 = ellipsis kanan
    return range;
  }, [currentPage, totalPages]);

  const resetForm = () => {
    setFormData({
      reportId: "",
      truckId: "",
      driverId: "",
      scheduledAt: "",
      location: "",
    });
  };

  const openTugaskanModal = (item: Item) => {
    setSelectedItem(item);

    let locationString = "";
    if (typeof item.location === "string") {
      locationString = item.location;
    } else if (item.location && typeof item.location === "object") {
      locationString = (item.location as any)?.name || (item.location as any)?.address || "";
    } else {
      locationString = item.description || "";
    }

    setFormData({
      reportId: item.report?.id || item.id,
      truckId: "",
      driverId: "",
      scheduledAt: "",
      location: locationString,
    });
    setShowModal(true);
  };

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.location) {
      toast.error("Lokasi harus diisi");
      return;
    }

    if (!formData.driverId) {
      toast.error("Armada yang dipilih tidak memiliki driver");
      return;
    }

    const selectedSchedule = new Date(formData.scheduledAt);
    const minScheduleDate = getMinimumScheduleDate();

    if (Number.isNaN(selectedSchedule.getTime()) || selectedSchedule.getTime() < minScheduleDate.getTime()) {
      toast.error(`Jadwal penugasan minimal ${MIN_SCHEDULE_DAYS} hari dari sekarang.`);
      return;
    }

    try {
      const payload = {
        reportId: formData.reportId,
        truckId: formData.truckId,
        driverId: formData.driverId,
        scheduledAt: formData.scheduledAt,
        location: formData.location,
        district: selectedItem?.district || null,
        description: selectedItem?.description || null,
        notes: "",
      };

      await api.post("/penugasan/aduan", payload);

      setSuccessTitle('Penugasan berhasil dibuat');
      setSuccessDescription('Laporan aduan telah ditugaskan ke armada.');
      setSuccessIcon(<CheckCircle2 size={24} />);
      setShowSuccessDialog(true);
      setShowModal(false);
      resetForm();
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Gagal membuat penugasan");
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await api.delete(`/penugasan/${pendingDeleteId}`);
      setSuccessTitle('Penugasan berhasil dihapus');
      setSuccessDescription('Penugasan telah dihapus secara permanen.');
      setSuccessIcon(<Trash2 size={24} />);
      setShowSuccessDialog(true);
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus");
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setPendingDeleteName('');
    }
  };

  const handleTolak = async () => {
    if (!pendingTolakId) return;

    try {
      await api.put(`/laporan/${pendingTolakId}/tolak`);
      setSuccessTitle('Laporan berhasil ditolak');
      setSuccessDescription('Status laporan telah diubah menjadi ditolak.');
      setSuccessIcon(<Edit3 size={24} />);
      setShowSuccessDialog(true);
      fetchData();
    } catch (error) {
      toast.error("Gagal menolak laporan");
    } finally {
      setShowConfirmTolakDialog(false);
      setPendingTolakId(null);
      setPendingTolakName('');
    }
  };

  const stats = {
    total: itemList.length,
    laporan_baru: itemList.filter((i) => i.status === "LAPORAN_BARU").length,
    dalam_proses: itemList.filter(
      (i) => i.status === "DITUGASKAN" || i.status === "BEKERJA"
    ).length,
    selesai: itemList.filter((i) => i.status === "SELESAI").length,
    driver_aktif: new Set(
      itemList
        .filter((i) => i.status !== "LAPORAN_BARU")
        .map((i) => i.driver?.id)
    ).size,
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string, text: string, ring: string }> = {
      LAPORAN_BARU: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/10" },
      DITUGASKAN: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/10" },
      BEKERJA: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/10" },
      SELESAI: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/10" },
      DITOLAK: { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-600/10" },
    };
    const style = styles[status] || styles.DITUGASKAN;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${style.text.replace('text', 'bg')}`}></span>
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const selectedTruck = trukList.find((t) => t.id === formData.truckId);
  const selectedDriverName = selectedTruck ? getDriverName(selectedTruck) : "";
  const hasDriver = selectedTruck ? !!getDriverId(selectedTruck) : false;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="mb-8">
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
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: "Total Tugas", value: stats.total, icon: ClipboardList, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Laporan Baru", value: stats.laporan_baru, icon: FileText, color: "text-red-600", bg: "bg-red-50" },
          { label: "Dalam Proses", value: stats.dalam_proses, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Selesai", value: stats.selesai, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Driver Aktif", value: stats.driver_aktif, icon: User, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((s, i) => (
          <div key={`penugasan-stat-${i}`} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-sm md:text-xl font-black truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari lokasi, driver, pelapor, atau nomor tugas..."
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
        </select>

        <button
          onClick={fetchData}
          className="px-5 py-3 rounded-xl bg-gray-50 text-gray-500 font-bold hover:bg-gray-200 transition-all flex items-center gap-2 justify-center"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border-none overflow-x-auto">
        <table className="w-full text-left border-spacing-0 min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <th className="px-6 py-4">Pelapor</th>
              <th className="px-6 py-4">Lokasi</th>
              <th className="px-6 py-4">Driver & Armada</th>
              <th className="px-6 py-4">Jadwal</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-20 text-gray-400 italic">Memuat data penugasan...</td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20 text-gray-400 italic">Tidak ada data ditemukan.</td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                  {/* PELAPOR */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {item.pelapor || item.report?.pelapor || "Anonim"}
                      </span>
                    </div>
                  </td>

                  {/* LOKASI */}
                  <td className="px-6 py-5">
                    <p className="font-bold text-sm text-gray-900">{item.location}</p>
                    <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {item.district || "Area tidak terdeteksi"}
                    </p>
                  </td>

                  {/* DRIVER & ARMADA */}
                  <td className="px-6 py-5">
                    {item.status === "LAPORAN_BARU" ? (
                      <span className="text-xs italic text-gray-400">Belum Ditugaskan</span>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{item.driver?.fullName || "Tanpa Driver"}</p>
                        <p className="text-[10px] font-mono mt-1">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-600 flex items-center gap-1 w-fit">
                            <Truck size={10} /> {item.truck?.plateNumber || "-"}
                          </span>
                        </p>
                      </div>
                    )}
                  </td>

                  {/* JADWAL */}
                  <td className="px-6 py-5">
                    {item.scheduledAt ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          {new Date(item.scheduledAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400" />
                          {new Date(item.scheduledAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs italic text-gray-400">-</span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-5 text-center">
                    <StatusBadge status={item.status} />
                  </td>

                  {/* AKSI */}
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {item.status === "LAPORAN_BARU" ? (
                        <>
                          <button
                            onClick={() => openTugaskanModal(item)}
                            className="px-4 py-2 rounded-xl bg-[#4A6D55] text-white text-xs font-bold hover:bg-[#3a5643] transition-all shadow-sm"
                          >
                            Tugaskan
                          </button>
                          <button
                            onClick={() => {
                              setPendingTolakId(item.id);
                              setPendingTolakName(item.location || 'Laporan');
                              setShowConfirmTolakDialog(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-all shadow-sm"
                          >
                            Tolak
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDetailModal(true);
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex"
                          >
                            <Eye size={16} />
                          </button>

                          {item.status !== "SELESAI" && (
                            <button
                              onClick={() => openTugaskanModal(item)}
                              className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors inline-flex"
                            >
                              <Repeat size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setPendingDeleteId(item.id);
                              setPendingDeleteName(item.location || 'Penugasan');
                              setShowConfirmDialog(true);
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ✅ [PERUBAHAN 5] Blok pagination — diubah total dari versi lama (hanya ChevronLeft/Right + nomor halaman sederhana)
            menjadi versi baru identik dengan ManageSupir:
            - Tambah ChevronsLeft (ke halaman pertama) dan ChevronsRight (ke halaman terakhir)
            - Tambah info teks "Menampilkan X–Y dari Z penugasan"
            - Gunakan penugasanPageNumbers dengan ellipsis (…) untuk banyak halaman
            - Tombol nomor halaman aktif pakai warna brand #4A6D55 */}
        {!loading && filteredItems.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Info range data */}
            <p className="text-xs text-gray-400 font-medium">
              Menampilkan{" "}
              <span className="font-bold text-gray-600">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-gray-600">{filteredItems.length}</span>{" "}
              penugasan
            </p>

            {/* Navigasi halaman */}
            <div className="flex items-center gap-1">
              {/* Ke halaman pertama */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman pertama"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Halaman sebelumnya */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Nomor halaman dengan ellipsis */}
              <div className="flex items-center gap-1 mx-1">
                {penugasanPageNumbers.map((page, i) =>
                  page < 0 ? (
                    <span
                      key={`penugasan-ellipsis-${i}`}
                      className="px-1 text-gray-400 text-xs font-bold select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[34px] h-[34px] rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-[#4A6D55] text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              {/* Halaman berikutnya */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {/* Ke halaman terakhir */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PENUGASAN */}
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
                  <h2 className="font-bold text-lg text-gray-900">Buat Penugasan</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">
                    Tentukan armada dan jadwal operasional
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                    setSelectedItem(null);
                  }}
                  className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Armada / Truk
                  </label>
                  <select
                    required
                    name="truckId"
                    value={formData.truckId}
                    onChange={(e) => {
                      const selectedTruck = trukList.find(
                        (t) => t.id === e.target.value
                      );
                      const driverId = selectedTruck
                        ? getDriverId(selectedTruck)
                        : "";

                      setFormData({
                        ...formData,
                        truckId: e.target.value,
                        driverId,
                      });
                    }}
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium"
                  >
                    <option value="">-- Pilih Armada --</option>
                    {trukList.map((t) => {
                      const driverName = getDriverName(t);
                      const hasDriverForTruck = !!getDriverId(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.plateNumber}
                          {t.unitCode ? ` (${t.unitCode})` : ""} -{" "}
                          {driverName}
                          {!hasDriverForTruck ? " ⚠️" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {formData.truckId && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`border rounded-2xl p-4 ${hasDriver ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}>
                    {hasDriver ? (
                      <>
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Driver Terpilih
                        </p>
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

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Jadwal Pelaksanaan
                  </label>
                  <input
                    type="datetime-local"
                    required
                    name="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={handleInputChange}
                    min={minScheduleValue}
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 ml-1">
                    Minimal jadwal {MIN_SCHEDULE_DAYS} hari dari waktu saat ini.
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                      setSelectedItem(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!hasDriver && !!formData.truckId}
                    className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 hover:bg-[#3a5643] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    Konfirmasi Penugasan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedItem && (
        <PenugasanDetail
          penugasan={selectedItem}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {/* DIALOGS */}
      <AlertDialog
        open={showSuccessDialog}
        title={successTitle}
        description={successDescription}
        buttonText="OK"
        icon={successIcon}
        onClose={() => setShowSuccessDialog(false)}
      />
      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Data Penugasan?"
        description={`Aksi ini akan menghapus penugasan "${pendingDeleteName}" secara permanen dari sistem.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingDeleteId(null);
          setPendingDeleteName('');
        }}
      />

      <ConfirmDialog
        open={showConfirmTolakDialog}
        title="Tolak Laporan?"
        description={`Aksi ini akan menolak laporan "${pendingTolakName}" secara permanen.`}
        confirmText="Ya, Tolak"
        cancelText="Batal"
        onConfirm={handleTolak}
        onCancel={() => {
          setShowConfirmTolakDialog(false);
          setPendingTolakId(null);
          setPendingTolakName('');
        }}
      />
    </div>
  );
}