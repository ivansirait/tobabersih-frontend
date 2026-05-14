"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Plus,
  Trash2,
  Search,
  Calendar,
  User,
  Truck,
  MapPin,
  X,
  Eye,
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  Repeat,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import toast, { Toaster } from "react-hot-toast";
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

interface Laporan {
  id: string;
  status: "LAPORAN_BARU" | "PENDING";
  location: string;
  district?: string;
  description?: string;
  jenisSampah?: string;
  pelapor?: string;
}

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
    driver?: {
      id: string;
      fullName: string;
    };
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

  const [supirList, setSupirList] = useState<any[]>([]);

  const [filter, setFilter] = useState({
    status: "",
  });

  const [formData, setFormData] = useState({
    reportId: "",
    truckId: "",
    driverId: "",
    scheduledAt: "",
  });

  // =========================
  // FETCH DATA
  // =========================

  const fetchData = async () => {
    try {
      setLoading(true);

      const [penugasanRes, laporanRes, trukRes, supirRes] = await Promise.all([
        api.get("/penugasan?type=ADUAN"),
        api.get("/laporan"),
        api.get("/admin/truks"),
        api.get("/admin/supir-list"),
      ]);

      const penugasanData = penugasanRes.data.data || [];

      // =========================
      // LAPORAN BARU (Belum Ditugaskan)
      // =========================

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

      // =========================
      // GABUNGKAN (Laporan Baru + Penugasan)
      // =========================

      setItemList([...laporanBaru, ...penugasanData]);

      setTrukList(trukRes.data.data || []);
      setSupirList(supirRes.data.data || []);

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
  // FILTER & PAGINATION
  // =========================

  const filteredItems = useMemo(() => {
    return itemList.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchSearch =
        (item.location || "").toLowerCase().includes(search) ||
        (item.driver?.fullName || "")
          .toLowerCase()
          .includes(search) ||
        (item.pelapor || "")
          .toLowerCase()
          .includes(search) ||
        (item.taskNumber || "")
          .toLowerCase()
          .includes(search);

      const matchStatus = filter.status ? item.status === filter.status : true;

      return matchSearch && matchStatus;
    });
  }, [itemList, searchTerm, filter]);

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
    });
  };

  // =========================
  // OPEN TUGASKAN MODAL
  // =========================

  const openTugaskanModal = (item: Item) => {
    setFormData({
      reportId: item.report?.id || item.id,
      truckId: "",
      driverId: "",
      scheduledAt: "",
    });

    setShowModal(true);
  };

  // =========================
  // HANDLE INPUT
  // =========================

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // SUBMIT TUGASKAN
  // =========================

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      await api.post("/penugasan/aduan", formData);

      toast.success("Penugasan berhasil dibuat");

      setShowModal(false);

      resetForm();

      fetchData();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Gagal membuat penugasan"
      );
    }
  };

  // =========================
  // TOLAK LAPORAN
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
  // DELETE PENUGASAN
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
  // GET STATS
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
      LAPORAN_BARU: "bg-red-100 text-red-700 border-red-200",

      DITUGASKAN: "bg-blue-100 text-blue-700 border-blue-200",

      BEKERJA: "bg-amber-100 text-amber-700 border-amber-200",

      SELESAI: "bg-emerald-100 text-emerald-700 border-emerald-200",

      DITOLAK: "bg-slate-200 text-slate-700 border-slate-300",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-black border ${
          styles[status] || styles.DITUGASKAN
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20">
      <Toaster position="top-right" />

      {/* HEADER */}

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">
              Penugasan Aduan Warga
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Monitoring laporan dan penugasan armada
            </p>
          </div>

          <button
            onClick={fetchData}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* CONTENT */}

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* STATS CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Total Tugas
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                <ClipboardList size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Laporan Baru
                </p>
                <p className="text-3xl font-black text-red-600 mt-1">
                  {stats.laporan_baru}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl text-red-600">
                <FileText size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Dalam Proses
                </p>
                <p className="text-3xl font-black text-blue-600 mt-1">
                  {stats.dalam_proses}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Selesai
                </p>
                <p className="text-3xl font-black text-emerald-600 mt-1">
                  {stats.selesai}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Driver Aktif
                </p>
                <p className="text-3xl font-black text-indigo-600 mt-1">
                  {stats.driver_aktif}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                <User size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}

        <div className="bg-white p-5 rounded-3xl border mb-6 flex gap-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Cari lokasi, driver, pelapor, atau nomor tugas..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            onChange={(e) =>
              setFilter({
                status: e.target.value,
              })
            }
            className="px-4 py-3 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>

        {/* TABLE */}

        <div className="bg-white rounded-3xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-bold">
                    Tugas
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold">
                    Pelapor
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold">
                    Lokasi
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold">
                    Driver & Armada
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold">
                    Jadwal
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-bold">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-bold">
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
                      className="border-t hover:bg-slate-50 transition-colors"
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
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <User size={14} className="text-slate-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {item.pelapor || item.report?.pelapor || "-"}
                          </span>
                        </div>
                      </td>

                      {/* LOKASI */}

                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-sm">
                            {item.location}
                          </p>

                          <p className="text-xs text-slate-500">
                            {item.district}
                          </p>
                        </div>
                      </td>

                      {/* DRIVER */}

                      <td className="px-6 py-5">
                        {item.status ===
                        "LAPORAN_BARU" ? (
                          <span className="text-slate-400 text-sm">
                            Belum Ditugaskan
                          </span>
                        ) : (
                          <div>
                            <p className="font-bold text-sm">
                              {item.driver?.fullName}
                            </p>

                            <p className="text-xs text-indigo-600 font-bold">
                              {item.truck?.plateNumber}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* JADWAL */}

                      <td className="px-6 py-5">
                        {item.scheduledAt ? (
                          <div>
                            <p className="font-bold text-sm">
                              {new Date(
                                item.scheduledAt
                              ).toLocaleDateString(
                                "id-ID"
                              )}
                            </p>

                            <p className="text-xs text-slate-500">
                              {new Date(
                                item.scheduledAt
                              ).toLocaleTimeString(
                                "id-ID"
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">
                            -
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-5 text-center">
                        <StatusBadge
                          status={item.status}
                        />
                      </td>

                      {/* ACTION */}

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {/* ===================== */}
                          {/* LAPORAN BARU */}
                          {/* ===================== */}

                          {item.status ===
                          "LAPORAN_BARU" ? (
                            <>
                              <button
                                onClick={() =>
                                  openTugaskanModal(
                                    item
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                              >
                                Tugaskan
                              </button>

                              <button
                                onClick={() =>
                                  handleTolak(
                                    item.id
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                              >
                                Tolak
                              </button>
                            </>
                          ) : (
                            <>
                              {/* DETAIL */}

                              <button
                                onClick={() => {
                                  setSelectedItem(
                                    item
                                  );

                                  setShowDetailModal(
                                    true
                                  );
                                }}
                                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                              >
                                <Eye size={18} />
                              </button>

                              {/* ALIHKAN */}

                              {item.status !==
                                "SELESAI" && (
                                <button
                                  onClick={() =>
                                    openTugaskanModal(
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                                  title="Alihkan ke Driver Lain"
                                >
                                  <Repeat size={18} />
                                </button>
                              )}

                              {/* DELETE */}

                              <button
                                onClick={() =>
                                  handleDelete(
                                    item.id
                                  )
                                }
                                className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                <Trash2 size={18} />
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
          </div>

          {/* PAGINATION */}

          {!loading && filteredItems.length > 0 && (
            <div className="bg-slate-50 px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-slate-600 font-semibold">
                Halaman {currentPage} dari {totalPages} ({filteredItems.length} data)
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.max(1, currentPage - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }).map(
                    (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() =>
                          setCurrentPage(i + 1)
                        }
                        className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                          currentPage === i + 1
                            ? "bg-blue-500 text-white"
                            : "border hover:bg-white"
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(totalPages, currentPage + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================================== */}
      {/* MODAL TUGASKAN */}
      {/* ===================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* HEADER */}

            <div className="px-8 py-6 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
              <div>
                <h2 className="text-xl font-black">
                  Buat Penugasan Aduan
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Tentukan armada dan jadwal untuk laporan warga
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);

                  resetForm();
                }}
                className="hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-8 space-y-6"
            >
              {/* ARMADA */}

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Pilih Armada / Truk
                </label>

                <select
                  required
                  name="truckId"
                  value={formData.truckId}
                  onChange={(e) => {
                    const selectedTruck =
                      trukList.find(
                        (t: any) =>
                          t.id ===
                          e.target.value
                      );

                    setFormData({
                      ...formData,

                      truckId:
                        e.target.value,

                      driverId:
                        selectedTruck
                          ?.driver?.id ||
                        selectedTruck
                          ?.operatorId ||
                        "",
                    });
                  }}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="">
                    -- Pilih Armada --
                  </option>

                  {trukList.map((t: any) => (
                    <option
                      key={t.id}
                      value={t.id}
                    >
                      {t.plateNumber} -{" "}
                      {t.operator?.fullName ||
                        t.driver?.fullName ||
                        "Belum Ada Driver"}
                    </option>
                  ))}
                </select>
              </div>

              {/* DRIVER OTOMATIS */}

              {formData.driverId && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
                  <p className="text-xs text-blue-600 uppercase font-black mb-1">
                    ✓ Driver Terpilih
                  </p>

                  <p className="text-lg font-black text-blue-900">
                    {
                      trukList.find(
                        (t: any) =>
                          t.id ===
                          formData.truckId
                      )?.operator?.fullName ||
                      trukList.find(
                        (t: any) =>
                          t.id ===
                          formData.truckId
                      )?.driver?.fullName
                    }
                  </p>

                  <p className="text-sm text-blue-700 font-semibold mt-2">
                    Plat:{" "}
                    {
                      trukList.find(
                        (t: any) =>
                          t.id ===
                          formData.truckId
                      )?.plateNumber
                    }
                  </p>
                </div>
              )}

              {/* JADWAL */}

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Jadwal Pelaksanaan
                </label>

                <input
                  type="datetime-local"
                  required
                  name="scheduledAt"
                  value={
                    formData.scheduledAt
                  }
                  onChange={
                    handleInputChange
                  }
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              {/* BUTTON */}

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Konfirmasi Penugasan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);

                    resetForm();
                  }}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
