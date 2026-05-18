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
  X,
  Eye,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import PenugasanDetail from "./PenugasanDetail";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

const ITEMS_PER_PAGE = 12;

export default function ManagePenugasan() {
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [itemList, setItemList] = useState<Item[]>([]);

  const [trukList, setTrukList] = useState<any[]>([]);

  const [filter, setFilter] = useState({
    status: "",
  });

  const [formData, setFormData] = useState({
    reportId: "",
    truckId: "",
    driverId: "",
    scheduledAt: "",
    location: "", // 🔥 TAMBAHKAN INI
  });

  // =========================
  // FETCH DATA
  // =========================

  const fetchData = async () => {
    try {
      setLoading(true);

      const [penugasanRes, laporanRes, trukRes] = await Promise.all([
        api.get("/penugasan?type=ADUAN"),
        api.get("/laporan"),
        api.get("/admin/truks"),
      ]);

      const penugasanData = penugasanRes.data.data || [];

      const laporanBaru = (laporanRes.data.data || [])
        .filter(
          (item: any) =>
            item.status === "LAPORAN_BARU" || item.status === "PENDING"
        )
        .map((item: any) => ({
          id: item.id,
          status: "LAPORAN_BARU",
          isLaporanBaru: true,
          taskNumber: null,
          location: item.location || item.description,
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

      setItemList([...laporanBaru, ...penugasanData]);

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

  // =========================
  // FILTER
  // =========================

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

  // =========================
  // PAGINATION
  // =========================

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    setFormData({
      reportId: "",
      truckId: "",
      driverId: "",
      scheduledAt: "",
      location: "", // 🔥 TAMBAHKAN INI
    });
  };

  // =========================
  // OPEN MODAL
  // =========================

  const openTugaskanModal = (item: Item) => {
    setFormData({
      reportId: item.report?.id || item.id,
      truckId: "",
      driverId: "",
      scheduledAt: "",
      location: item.location || item.description || "", // 🔥 TAMBAHKAN INI
    });

    setShowModal(true);
  };

  // =========================
  // INPUT CHANGE
  // =========================

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // SUBMIT
  // =========================

 // Di ManagePenugasan component

const handleSubmit = async (e: any) => {
  e.preventDefault();

  // Validasi frontend
  if (!formData.location) {
    toast.error("Lokasi harus diisi");
    return;
  }

  try {
    // Kirim location bersama data lainnya
    const payload = {
      reportId: formData.reportId,
      truckId: formData.truckId,
      driverId: formData.driverId,
      scheduledAt: formData.scheduledAt,
      location: formData.location, // 🔥 TAMBAHKAN INI
      district: selectedItem?.district || null,
      description: selectedItem?.description || null,
      notes: "",
    };

    await api.post("/penugasan/aduan", payload);

    toast.success("Penugasan berhasil dibuat");
    setShowModal(false);
    resetForm();
    fetchData();
  } catch (error: any) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Gagal membuat penugasan");
  }
};
  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus penugasan ini?")) return;

    try {
      await api.delete(`/penugasan/${id}`);

      toast.success("Penugasan dihapus"); 

      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus");
    }
  };

  // =========================
  // TOLAK
  // =========================

  const handleTolak = async (id: string) => {
    if (!confirm("Tolak laporan ini?")) return;

    try {
      await api.put(`/laporan/${id}/tolak`);

      toast.success("Laporan berhasil ditolak");

      fetchData();
    } catch (error) {
      toast.error("Gagal menolak laporan");
    }
  };

  // =========================
  // STATS
  // =========================

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

  // =========================
  // STATUS BADGE
  // =========================

  const StatusBadge = ({ status }: any) => {
    const styles: any = {
      LAPORAN_BARU:
        "bg-red-100 text-red-700 border-red-200",

      DITUGASKAN:
        "bg-blue-100 text-blue-700 border-blue-200",

      BEKERJA:
        "bg-amber-100 text-amber-700 border-amber-200",

      SELESAI:
        "bg-emerald-100 text-emerald-700 border-emerald-200",

      DITOLAK:
        "bg-slate-200 text-slate-700 border-slate-300",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border shadow-sm ${
          styles[status] || styles.DITUGASKAN
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

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
                Penugasan Aduan
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
          {
            label: "Total Tugas",
            value: stats.total,
            icon: ClipboardList,
            color: "text-gray-600",
            bg: "bg-gray-50",
          },

          {
            label: "Laporan Baru",
            value: stats.laporan_baru,
            icon: FileText,
            color: "text-red-600",
            bg: "bg-red-50",
          },

          {
            label: "Dalam Proses",
            value: stats.dalam_proses,
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },

          {
            label: "Selesai",
            value: stats.selesai,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },

          {
            label: "Driver Aktif",
            value: stats.driver_aktif,
            icon: User,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                {s.label}
              </p>

              <p className="text-sm md:text-xl font-black truncate">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH */}

      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />

          <input
            type="text"
            placeholder="Cari lokasi, driver, pelapor, atau nomor tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
          />
        </div>

        <select
          onChange={(e) =>
            setFilter({
              status: e.target.value,
            })
          }
          className="px-4 py-3 rounded-xl bg-gray-50 border-none outline-none text-sm"
        >
          <option value="">Semua Status</option>

          <option value="LAPORAN_BARU">
            Laporan Baru
          </option>

          <option value="DITUGASKAN">
            Ditugaskan
          </option>

          <option value="BEKERJA">
            Bekerja
          </option>

          <option value="SELESAI">
            Selesai
          </option>
        </select>

          <button
              onClick={fetchData}
              className="px-5 py-3 rounded-2xl bg-white text-[#4A6D55] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
      
            </button>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm overflow-x-auto border-none">
        <table className="w-full text-left border-spacing-0 min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="px-6 py-4">
                Tugas
              </th>

              <th className="px-6 py-4">
                Pelapor
              </th>

              <th className="px-6 py-4">
                Lokasi
              </th>

              <th className="px-6 py-4">
                Driver & Armada
              </th>

              <th className="px-6 py-4">
                Jadwal
              </th>

              <th className="px-6 py-4 text-center">
                Status
              </th>

              <th className="px-6 py-4 text-right">
                Aksi
              </th>
            </tr>
          </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-20"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-20"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border -t hover:bg-slate-50 transition-colors"
                    >
                      {/* TASK */}

                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {item.taskNumber
                              ? `#${item.taskNumber}`
                              : "Laporan Baru"}
                          </span>
                        </div>
                      </td>

                      {/* PELAPOR */}

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User
                          size={14}
                          className="text-gray-500"
                        />
                      </div>

                      <span className="text-sm font-semibold text-gray-700">
                        {item.pelapor ||
                          item.report?.pelapor ||
                          "-"}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {item.location}
                      </p>

                      <p className="text-xs text-gray-400">
                        {item.district}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    {item.status === "LAPORAN_BARU" ? (
                      <span className="text-gray-400 text-sm">
                        Belum Ditugaskan
                      </span>
                    ) : (
                      <div>
                        <p className="font-bold text-sm">
                          {item.driver?.fullName}
                        </p>

                        <p className="text-xs text-blue-600 font-bold">
                          {item.truck?.plateNumber}
                        </p>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-5">
                    {item.scheduledAt ? (
                      <div>
                        <p className="font-bold text-sm">
                          {new Date(
                            item.scheduledAt
                          ).toLocaleDateString("id-ID")}
                        </p>

                        <p className="text-xs text-gray-400">
                          {new Date(
                            item.scheduledAt
                          ).toLocaleTimeString("id-ID")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        -
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-center">
                    <StatusBadge
                      status={item.status}
                    />
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      {item.status === "LAPORAN_BARU" ? (
                        <>
                          <button
                            onClick={() =>
                              openTugaskanModal(item)
                            }
                            className="px-4 py-2 rounded-xl bg-[#4A6D55] text-white text-sm font-bold hover:bg-[#3a5643] transition-all shadow-sm"
                          >
                            Tugaskan
                          </button>

                          <button
                            onClick={() =>
                              handleTolak(item.id)
                            }
                            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all shadow-sm"
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
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex"
                          >
                            <Eye size={16} />
                          </button>

                          

                          {item.status !== "SELESAI" && (
                            <button
                              onClick={() =>
                                openTugaskanModal(item)
                              }
                              className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex shadow-sm"
                            >
                              <Repeat size={16} />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleDelete(item.id)
                            }
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex shadow-sm"
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

        {/* PAGINATION */}

        {!loading && filteredItems.length > 0 && (
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">
              Halaman {currentPage} dari {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentPage(
                    Math.max(1, currentPage - 1)
                  )
                }
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              {Array.from({ length: totalPages }).map(
                (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() =>
                      setCurrentPage(i + 1)
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      currentPage === i + 1
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      totalPages,
                      currentPage + 1
                    )
                  )
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
              }}
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0 overflow-hidden my-auto"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="font-bold text-lg">
                    Buat Penugasan
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Tentukan armada dan jadwal operasional
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowModal(false);

                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Armada / Truk
                  </label>

                  <select
                    required
                    name="truckId"
                    value={formData.truckId}
                    onChange={(e) => {
                      const selectedTruck =
                        trukList.find(
                          (t: any) =>
                            t.id === e.target.value
                        );

                      setFormData({
                        ...formData,
                        truckId: e.target.value,
                        driverId:
                          selectedTruck?.driver?.id ||
                          "",
                      });
                    }}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none text-sm focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">
                      -- Pilih Armada --
                    </option>

                    {trukList.map((t: any) => (
                      <option
                        key={t.id}
                        value={t.id}
                      >
                        {t.plateNumber} -
                        {" "}
                        {t.driver?.fullName ||
                          "Belum Ada Driver"}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.driverId && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                      Driver Terpilih
                    </p>

                    <p className="text-lg font-black text-green-900 mt-1">
                      {
                        trukList.find(
                          (t: any) =>
                            t.id ===
                            formData.truckId
                        )?.driver?.fullName
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Jadwal Pelaksanaan
                  </label>

                  <input
                    type="datetime-local"
                    required
                    name="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none text-sm focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#3a5643] transition-all"
                >
                  Konfirmasi Penugasan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL */}

      {showDetailModal &&
        selectedItem && (
          <PenugasanDetail
            penugasan={selectedItem}
            onClose={() => {
              setShowDetailModal(false);

              setSelectedItem(null);
            }}
          />
        )}
    </div>
  );
}