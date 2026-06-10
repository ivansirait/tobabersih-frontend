"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Plus, Edit3, Trash2, Search, X, Users,
  CheckCircle2, XCircle, MapPin, Eye, FileSpreadsheet,
  Upload, AlertCircle, Download, ChevronLeft, ChevronRight,
  Truck,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Pelanggan {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  region: string | null;
  jenisUsaha: string | null;
  isActive: boolean;
  driverId: string | null;
  driverName: string | null;
}

interface Driver {
  id: string;
  fullName: string;
}

interface FormData {
  fullName: string;
  phoneNumber: string;
  region: string;
  jenisUsaha: string;
  driverId: string;
}

interface ImportRow {
  fullName: string;
  phoneNumber: string;
  region: string;
  jenisUsaha: string;
  status?: "pending" | "success" | "error";
  errorMsg?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE_URL = "http://localhost:5000/api";
const INITIAL_FORM: FormData = {
  fullName: "", phoneNumber: "", region: "", jenisUsaha: "Rumah Tangga", driverId: "",
};
const JENIS_USAHA_OPTIONS = [
  "Rumah Tangga", "Hotel Bintang 1", "Hotel Bintang 2", "Hotel Bintang 3",
  "Asrama", "Kantor Pemerintah", "Restoran", "Café", "Villa",
  "Toko/Kedai", "Pelabuhan", "Sekolah", "Ruko", "Rumah Makan",
  "Panglong", "Gereja",
];

// ─── Import Modal ────────────────────────────────────────────────────────────

function ImportModal({
  onClose, onDone, drivers,
}: {
  onClose: () => void;
  onDone: () => void;
  drivers: Driver[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [summary, setSummary] = useState<{ success: number; error: number; total: number } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped: ImportRow[] = json
        .filter((r) => r["Nama Pelanggan"] || r["fullName"] || r["nama"])
        .map((r) => ({
          fullName: String(r["Nama Pelanggan"] ?? r["fullName"] ?? r["nama"] ?? "").trim(),
          phoneNumber: String(r["No. Telepon"] ?? r["Nomor HP"] ?? r["phoneNumber"] ?? "").trim(),
          region: String(r["Alamat"] ?? r["region"] ?? "").trim(),
          jenisUsaha: String(r["Jenis Usaha"] ?? r["jenisUsaha"] ?? "Rumah Tangga").trim(),
          status: "pending",
        }));

      setRows(mapped);
      setFileName(file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error("Hanya file .xlsx atau .xls"); return; }
    setDone(false); setSummary(null);
    parseExcel(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nama Pelanggan", "Alamat", "Jenis Usaha", "No. Telepon"],
      ["Marudut Sitorus", "Dusun I Tambunan Sunge", "Rumah Tangga", "081234567890"],
      ["Budi Santoso", "Jl. Kartini No. 5", "Toko/Kedai", "082345678901"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_pelanggan_retribusi.xlsx");
  };

  const handleImport = async () => {
    setImporting(true);
    const validated = rows.map((r) => {
      if (!r.fullName) return { ...r, status: "error" as const, errorMsg: "Nama wajib diisi" };
      return r;
    });
    setRows(validated);
    const valid = validated.filter((r) => r.status !== "error");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/users/bulk`,
        {
          users: valid.map((r) => ({
            fullName: r.fullName,
            phoneNumber: r.phoneNumber,
            region: r.region,
            jenisUsaha: r.jenisUsaha,
          })),
          driverId: selectedDriver || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const results: { nama: string; status: string; message: string }[] = res.data?.results ?? [];
      const resultMap = new Map(results.map((r) => [r.nama, r]));

      const final: ImportRow[] = validated.map((row) => {
        if (row.status === "error") return row;
        const result = resultMap.get(row.fullName);
        if (!result) return { ...row, status: "error" as const, errorMsg: "Tidak ada respons server" };
        return {
          ...row,
          status: result.status === "success" ? "success" as const : "error" as const,
          errorMsg: result.status === "error" ? result.message : undefined,
        };
      });

      setRows(final);
      setSummary(res.data?.summary ?? null);
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal melakukan import");
    } finally {
      setImporting(false);
      setDone(true);
    }
  };

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Import Data</span>
            <h3 className="text-xl font-medium text-gray-900 flex items-center gap-2 mt-1">
              <FileSpreadsheet size={20} className="text-[#064E3B]" />
              Import Pelanggan dari Excel
            </h3>
            <p className="text-xs text-gray-400 mt-1">Format sesuai data retribusi persampahan · Maks 500 baris</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-8 space-y-5">
          {/* Template */}
          <div className="flex items-center justify-between rounded-[20px] bg-gray-50 border border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Unduh template Excel</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Kolom: <span className="font-mono font-semibold">Nama Pelanggan, Alamat, Jenis Usaha, No. Telepon</span>
              </p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-[20px] bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-[#064E3B] shadow-sm hover:bg-gray-50 transition">
              <FileSpreadsheet size={15} /> Unduh Template
            </button>
          </div>

          {/* Pilih supir */}
          {rows.length > 0 && !done && (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Truck size={15} /> Tetapkan ke Supir (opsional)
              </p>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full rounded-[16px] border border-amber-300 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-[#064E3B]"
              >
                <option value="">— Tanpa supir —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Summary */}
          {done && summary && (
            <div className="rounded-[20px] border border-gray-100 bg-white px-5 py-4 flex flex-wrap items-center gap-4 shadow-sm">
              <span className="text-sm text-gray-500">Total: <strong>{summary.total}</strong></span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                <CheckCircle2 size={15} /> {summary.success} berhasil
              </span>
              {summary.error > 0 && (
                <span className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                  <AlertCircle size={15} /> {summary.error} gagal
                </span>
              )}
            </div>
          )}

          {/* Dropzone */}
          {rows.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-14 cursor-pointer transition
                ${dragOver ? "border-[#064E3B] bg-green-50" : "border-gray-200 bg-gray-50 hover:border-[#064E3B] hover:bg-green-50/40"}`}
            >
              <div className="h-16 w-16 flex items-center justify-center rounded-[20px] bg-green-100 text-[#064E3B]">
                <Upload size={28} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">Klik atau drag & drop file Excel</p>
                <p className="text-xs text-gray-400 mt-1">Format: .xlsx, .xls · Maks 500 baris</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Preview tabel */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">
                  📄 {fileName} — <span className="text-[#064E3B]">{rows.length} baris</span>
                  {done && (
                    <span className="ml-2 text-xs text-gray-400">
                      (<span className="text-green-600 font-medium">{successCount} berhasil</span>
                      {errorCount > 0 && <span className="text-red-500 font-medium"> · {errorCount} gagal</span>})
                    </span>
                  )}
                </p>
                {!importing && !done && (
                  <button onClick={() => { setRows([]); setFileName(""); }}
                    className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                    <X size={13} /> Ganti file
                  </button>
                )}
              </div>
              <div className="overflow-x-auto rounded-[20px] border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50/50">
                    <tr>
                      {["#", "Nama Pelanggan", "Alamat", "Jenis Usaha", "No. Telepon", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.status === "error" ? "bg-red-50" : row.status === "success" ? "bg-green-50" : ""}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.fullName || <span className="text-red-400 italic text-xs">kosong</span>}</td>
                        <td className="px-4 py-3 text-gray-500">{row.region || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{row.jenisUsaha || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{row.phoneNumber || "-"}</td>
                        <td className="px-4 py-3">
                          {row.status === "pending" && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">Menunggu</span>}
                          {row.status === "success" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs"><CheckCircle2 size={10} /> Berhasil</span>}
                          {row.status === "error" && <span title={row.errorMsg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs"><AlertCircle size={10} /> {row.errorMsg ?? "Gagal"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-8 py-5 flex items-center justify-between gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all text-sm">
            {done ? "Tutup" : "Batal"}
          </button>
          <div className="flex gap-3">
            {rows.length > 0 && !done && (
              <button onClick={handleImport} disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] bg-[#064E3B] text-white text-sm font-medium hover:bg-[#053f30] transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 active:scale-95">
                {importing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengimport...</> : <><Upload size={15} /> Import {rows.length} Pelanggan</>}
              </button>
            )}
            {done && (
              <button onClick={() => { setRows([]); setFileName(""); setDone(false); setSummary(null); setSelectedDriver(""); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] border border-[#064E3B] bg-white text-[#064E3B] text-sm font-medium hover:bg-green-50 transition-all">
                <Upload size={15} /> Import File Lain
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageAkunMasyarakat() {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewingItem, setViewingItem] = useState<Pelanggan | null>(null);
  const [editingItem, setEditingItem] = useState<Pelanggan | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successDescription, setSuccessDescription] = useState("");
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingDriver, setExportingDriver] = useState(false);

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchPelanggan = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(filterDriver ? { driverId: filterDriver } : {}),
      });
      const res = await axios.get(`${API_BASE_URL}/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPelangganList(res.data.data ?? []);
        setPagination(res.data.pagination ?? { page: 1, limit: 12, total: res.data.data?.length ?? 0, totalPages: 1 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setDrivers(res.data.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchDrivers(); }, []);
  useEffect(() => { fetchPelanggan(1); }, [searchTerm, filterDriver]);

const stats = useMemo(() => ({
  total: pagination.total,
  active: pelangganList.filter((p) => p.isActive).length,
  inactive: pelangganList.filter((p) => !p.isActive).length,
}), [pelangganList, pagination]);

  // ── Submit form ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || null,
        region: formData.region || null,
        jenisUsaha: formData.jenisUsaha,
        driverId: formData.driverId || null,
      };

      if (editingItem) {
        const res = await axios.put(`${API_BASE_URL}/users/${editingItem.id}`, payload, config);
        if (!res.data.success) throw new Error(res.data.message);
        setSuccessTitle("Data berhasil diedit");
        setSuccessDescription("Perubahan pelanggan berhasil disimpan.");
      } else {
        const res = await axios.post(`${API_BASE_URL}/users`, payload, config);
        if (!res.data.success) throw new Error(res.data.message);
        setSuccessTitle("Pelanggan berhasil ditambahkan");
        setSuccessDescription("Pelanggan baru berhasil didaftarkan ke sistem.");
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchPelanggan(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE_URL}/users/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSuccessTitle("Pelanggan berhasil dihapus");
        setSuccessDescription("Data pelanggan telah dihapus dari sistem.");
        setShowSuccessDialog(true);
        fetchPelanggan(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menghapus pelanggan");
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setDeleting(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pelanggan_retribusi_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data berhasil diexport");
    } catch {
      toast.error("Gagal export data");
    } finally {
      setExportingAll(false);
    }
  };

  const handleExportDriver = async () => {
    if (!filterDriver) { toast.error("Pilih supir terlebih dahulu untuk export per supir"); return; }
    setExportingDriver(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/export/driver/${filterDriver}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const driverName = drivers.find((d) => d.id === filterDriver)?.fullName ?? "supir";
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pelanggan_${driverName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Data supir ${driverName} berhasil diexport`);
    } catch {
      toast.error("Gagal export data supir");
    } finally {
      setExportingDriver(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => { setEditingItem(null); setFormData(INITIAL_FORM); setShowModal(true); };
  const openEditModal = (p: Pelanggan) => {
    setEditingItem(p);
    setFormData({
      fullName: p.fullName,
      phoneNumber: p.phoneNumber || "",
      region: p.region || "",
      jenisUsaha: p.jenisUsaha || "Rumah Tangga",
      driverId: p.driverId || "",
    });
    setShowModal(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />

<AlertDialog
  open={showSuccessDialog}
  title={successTitle}
  description={successDescription}
  buttonText="OK"
  type="success"
  onClose={() => setShowSuccessDialog(false)}
/>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
        <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
          Data & Operasional
        </span>
        <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Pelanggan Retribusi</h1>
        <p className="text-[#5B7078] mt-2 font-medium">Kelola data pelanggan retribusi persampahan per supir</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Pelanggan", val: stats.total, color: "text-gray-600", bg: "bg-gray-50", icon: Users },
          { label: "Aktif", val: stats.active, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
          { label: "Nonaktif", val: stats.inactive, color: "text-red-600", bg: "bg-red-50", icon: XCircle },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-[24px] ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <p className="text-2xl font-medium text-gray-900">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter supir + Tombol aksi */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[24px] px-4 py-2.5 shadow-sm">
          <Truck size={16} className="text-gray-400" />
          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent"
          >
            <option value="">Semua Supir</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>
        </div>

        <div className="flex-1" />

        <button onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[24px] border border-[#064E3B] bg-white text-[#064E3B] text-sm font-medium shadow-sm hover:bg-green-50 active:scale-95 transition-all">
          <FileSpreadsheet size={18} /> Import Excel
        </button>

        {filterDriver ? (
          <button onClick={handleExportDriver} disabled={exportingDriver}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[24px] border border-blue-500 bg-white text-blue-600 text-sm font-medium shadow-sm hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50">
            {exportingDriver ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            Export Supir Ini
          </button>
        ) : (
          <button onClick={handleExportAll} disabled={exportingAll}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[24px] border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
            {exportingAll ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            Export Semua
          </button>
        )}

        <button onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[24px] bg-[#4A6D55] text-white text-sm font-medium shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95 transition-all">
          <Plus size={18} /> Tambah Pelanggan
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { fetchPelanggan(1); toast.success("Import selesai!"); }}
          drivers={drivers}
        />
      )}

      {/* Tabel */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, alamat, atau jenis usaha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-[24px] focus:ring-2 focus:ring-green-500/20 outline-none text-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-400">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p>Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Nama Pelanggan</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Alamat</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Jenis Usaha</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">No. Telepon</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Supir</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pelangganList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">
                      {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada data pelanggan."}
                    </td>
                  </tr>
                ) : pelangganList.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors font-medium">
                          {p.fullName.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-gray-900">{p.fullName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" /> {p.region || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">{p.jenisUsaha || "-"}</td>
                    <td className="px-6 py-5 text-sm text-gray-500">{p.phoneNumber || "-"}</td>
                    <td className="px-6   py-5">
                      {p.driverName ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          <Truck size={10} /> {p.driverName}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${p.isActive ? "bg-green-100 text-green-800 ring-green-600/20" : "bg-red-100 text-red-800 ring-red-600/20"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${p.isActive ? "bg-green-600" : "bg-red-600"}`} />
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingItem(p)} className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(p)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => { setPendingDeleteId(p.id); setShowConfirmDialog(true); }} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} pelanggan
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPelanggan(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-[12px] border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchPelanggan(p as number)}
                      className={`w-9 h-9 rounded-[12px] text-sm font-medium transition-all ${pagination.page === p ? "bg-[#064E3B] text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => fetchPelanggan(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-[12px] border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-medium text-gray-900">Detail Pelanggan</h3>
              <button onClick={() => setViewingItem(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-green-100 text-green-700 rounded-[24px] flex items-center justify-center text-3xl font-black">
                  {viewingItem.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-900">{viewingItem.fullName}</h4>
                  <span className={`text-xs font-medium uppercase tracking-widest ${viewingItem.isActive ? "text-green-600" : "text-red-600"}`}>
                    {viewingItem.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                {[
                  { label: "Alamat", value: viewingItem.region || "Tidak ada alamat", icon: MapPin },
                  { label: "Jenis Usaha", value: viewingItem.jenisUsaha || "-" },
                  { label: "No. Telepon", value: viewingItem.phoneNumber || "Tidak ada nomor" },
                  { label: "Supir", value: viewingItem.driverName || "Belum ditugaskan" },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{label}</label>
                    <p className="text-gray-700 font-medium flex items-center gap-2 mt-1">
                      {Icon && <Icon size={16} className="text-green-600" />} {value}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={() => setViewingItem(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-[24px] font-medium hover:bg-gray-800 transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-medium text-gray-900">
                {editingItem ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Nama Pelanggan <span className="text-red-500">*</span></label>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Alamat / Wilayah</label>
                  <input
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Dusun I, Jl. Kartini, ..."
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">No. Telepon</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Jenis Usaha</label>
                  <select
                    value={formData.jenisUsaha}
                    onChange={(e) => setFormData({ ...formData, jenisUsaha: e.target.value })}
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black bg-white"
                  >
                    {JENIS_USAHA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Tugaskan ke Supir</label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black bg-white"
                  >
                    <option value="">— Tanpa supir —</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-[#4A6D55] text-white px-6 py-3 rounded-[24px] font-medium hover:bg-[#053f30] shadow-lg shadow-slate-200 transition-all duration-200 active:scale-95 disabled:opacity-50">
                  {submitting ? "Memproses..." : editingItem ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Pelanggan?"
        description="Aksi ini akan menghapus data pelanggan secara permanen dari sistem."
        confirmText={deleting ? "Menghapus..." : "Hapus"}
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmDialog(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}