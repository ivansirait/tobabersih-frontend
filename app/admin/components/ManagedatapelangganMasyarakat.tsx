"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Plus, Edit3, Trash2, Search, X, Users,
  MapPin, Eye, FileSpreadsheet, Upload, AlertCircle,
  Download, ChevronLeft, ChevronRight, Truck, CheckCircle2,
  ChevronDown, Loader2, User, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "./AlertDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Pelanggan {
  id: string;
  nama: string;
  alamat: string;
  jenisUsaha: string;
  driverId: string | null;
  driverName: string | null;
  createdAt: string;
}

interface Driver {
  id: string;
  fullName: string;
  isActive: boolean;
}

interface FormData {
  nama: string;
  alamat: string;
  jenisUsaha: string;
  driverId: string;
}

interface FormErrors {
  nama?: string;
  alamat?: string;
  jenisUsaha?: string;
  driverId?: string;
}

interface ImportRow {
  nama: string;
  alamat: string;
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

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const _envBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");
const API_BASE = _envBase.endsWith("/api") ? _envBase : `${_envBase}/api`;

const INITIAL_FORM: FormData = {
  nama: "", alamat: "", jenisUsaha: "", driverId: "",
};

const JENIS_USAHA_OPTIONS = [
  "Rumah Tangga",
  "Hotel Bintang 1",
  "Hotel Bintang 2",
  "Hotel Bintang 3",
  "Asrama",
  "Kantor Pemerintah",
  "Kantor Swasta",
  "Restoran",
  "Café",
  "Villa",
  "Toko/Kedai",
  "Kios Dagang",
  "Pelabuhan",
  "Sekolah",
  "Ruko",
  "Rumah Makan",
  "Panglong",
  "Gereja",
  "Perum Tentara",
];

// ─── JenisUsahaInput (typeahead combobox) ─────────────────────────────────────

function JenisUsahaInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = JENIS_USAHA_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative">
      <Tag
        size={16}
        className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${error ? "text-red-400" : "text-gray-400"}`}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Ketik atau pilih jenis usaha..."
        autoComplete="off"
        className={`w-full pl-11 pr-10 py-3 bg-gray-50/80 rounded-xl outline-none text-base font-medium transition-all border ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
            : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
        }`}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => { setQuery(opt); onChange(opt); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-green-50 hover:text-green-800 transition-colors
                ${query === opt ? "bg-green-50 text-green-700 font-medium" : "text-gray-700"}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 italic">
          Gunakan "{query}" sebagai jenis usaha baru
        </div>
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({
  drivers,
  onClose,
  onDone,
}: {
  drivers: Driver[];
  onClose: () => void;
  onDone: () => void;
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
        .filter((r) => r["Nama Pelanggan"] || r["nama"] || r["Nama"] || r["NAMA"])
        .map((r) => ({
          nama: String(r["Nama Pelanggan"] ?? r["NAMA"] ?? r["nama"] ?? r["Nama"] ?? "").trim(),
          alamat: String(r["Alamat"] ?? r["ALAMAT"] ?? r["alamat"] ?? "").trim(),
          jenisUsaha: String(r["Jenis Usaha"] ?? r["JENIS USAHA"] ?? r["Jenis Retribusi"] ?? r["jenisUsaha"] ?? "Rumah Tangga").trim(),
          status: "pending",
        }));

      setRows(mapped);
      setFileName(file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) return;
    setDone(false);
    setSummary(null);
    parseExcel(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nama Pelanggan", "Alamat", "Jenis Usaha"],
      ["Marudut Sitorus", "Dusun I Tambunan Sunge", "Rumah Tangga"],
      ["Budi Santoso", "Jl. Kartini No. 5", "Toko/Kedai"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_pelanggan_retribusi.xlsx");
  };

  const handleImport = async () => {
    const validated = rows.map((r) =>
      !r.nama ? { ...r, status: "error" as const, errorMsg: "Nama wajib diisi" } : r
    );
    setRows(validated);
    const valid = validated.filter((r) => r.status !== "error");
    if (valid.length === 0) return;

    setImporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/pelanggan/bulk`,
        {
          pelanggan: valid.map(({ nama, alamat, jenisUsaha }) => ({ nama, alamat, jenisUsaha })),
          driverId: selectedDriver || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const results: { nama: string; status: string; message: string }[] = res.data?.results ?? [];
      const resultMap = new Map(results.map((r) => [r.nama, r]));

      setRows(
        validated.map((row) => {
          if (row.status === "error") return row;
          const r = resultMap.get(row.nama);
          return r
            ? { ...row, status: r.status === "success" ? ("success" as const) : ("error" as const), errorMsg: r.status === "error" ? r.message : undefined }
            : { ...row, status: "error" as const, errorMsg: "Tidak ada respons server" };
        })
      );
      setSummary(res.data?.summary ?? null);
      onDone();
    } catch {
      // silent
    } finally {
      setImporting(false);
      setDone(true);
    }
  };

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const activeDrivers = drivers.filter((d) => d.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Import Data</span>
            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mt-1 tracking-tight">
              <FileSpreadsheet size={20} className="text-[#4A6D55]" />
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
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-gray-800">Unduh template Excel</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Kolom: <span className="font-mono font-semibold">Nama Pelanggan, Alamat, Jenis Usaha</span>
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-[#4A6D55] shadow-sm hover:bg-gray-50 transition"
            >
              <FileSpreadsheet size={15} /> Unduh Template
            </button>
          </div>

          {/* Pilih supir */}
          {rows.length > 0 && !done && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Truck size={15} /> Tetapkan ke Supir (opsional)
              </p>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-[#4A6D55]"
              >
                <option value="">— Tanpa supir —</option>
                {activeDrivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Summary */}
          {done && summary && (
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 flex flex-wrap items-center gap-4 shadow-sm">
              <span className="text-sm text-gray-500">Total: <strong>{summary.total}</strong></span>
              <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                <CheckCircle2 size={15} /> {summary.success} berhasil
              </span>
              {summary.error > 0 && (
                <span className="flex items-center gap-1.5 text-red-500 font-bold text-sm">
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
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 cursor-pointer transition
                ${dragOver ? "border-[#4A6D55] bg-green-50" : "border-gray-200 bg-gray-50 hover:border-[#4A6D55] hover:bg-green-50/40"}`}
            >
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-green-100 text-[#4A6D55]">
                <Upload size={28} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-800">Klik atau drag & drop file Excel</p>
                <p className="text-xs text-gray-400 mt-1">Format .xlsx atau .xls · Maks 500 baris</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Preview tabel */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">
                  📄 {fileName} — <span className="text-[#4A6D55]">{rows.length} baris</span>
                  {done && (
                    <span className="ml-2 text-xs text-gray-400">
                      (<span className="text-green-600 font-bold">{successCount} berhasil</span>
                      {errorCount > 0 && <span className="text-red-500 font-bold"> · {errorCount} gagal</span>})
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
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["#", "Nama Pelanggan", "Alamat", "Jenis Usaha", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.status === "error" ? "bg-red-50" : row.status === "success" ? "bg-green-50" : ""}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {row.nama || <span className="text-red-400 italic text-xs">kosong</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.alamat || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{row.jenisUsaha || "-"}</td>
                        <td className="px-4 py-3">
                          {row.status === "pending" && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">Menunggu</span>}
                          {row.status === "success" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold"><CheckCircle2 size={10} /> Berhasil</span>}
                          {row.status === "error" && <span title={row.errorMsg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold"><AlertCircle size={10} /> {row.errorMsg ?? "Gagal"}</span>}
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
          <button onClick={onClose} className="px-6 py-3 rounded-2xl text-gray-600 font-bold hover:bg-gray-100 transition-all text-sm">
            {done ? "Tutup" : "Batal"}
          </button>
          <div className="flex gap-3">
            {rows.length > 0 && !done && (
              <button onClick={handleImport} disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#4A6D55] text-white text-sm font-bold hover:bg-[#395542] transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 active:scale-95">
                {importing ? <><Loader2 size={15} className="animate-spin" /> Mengimport...</> : <><Upload size={15} /> Import {rows.length} Pelanggan</>}
              </button>
            )}
            {done && (
              <button onClick={() => { setRows([]); setFileName(""); setDone(false); setSummary(null); setSelectedDriver(""); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-[#4A6D55] bg-white text-[#4A6D55] text-sm font-bold hover:bg-green-50 transition-all">
                <Upload size={15} /> Import File Lain
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagePelanggan() {
  const [list, setList] = useState<Pelanggan[]>([]);
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
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [exportingAll, setExportingAll] = useState(false);
  const [exportingDrv, setExportingDrv] = useState(false);

  // ── Alert state — identik dengan ManageSupir ──────────────────────────────
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    open: false, type: "info", title: "", description: "",
  });

  // Confirm dialogs — masing-masing punya state sendiri seperti ManageSupir
  const [selectedPelangganForDelete, setSelectedPelangganForDelete] = useState<Pelanggan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({ open: true, type, title, description, detailText });
  };
  const closeAlert = () => setAlertConfig((prev) => ({ ...prev, open: false }));

  const getAuthConfig = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
  };

  const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchList = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page), limit: "12",
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(filterDriver ? { driverId: filterDriver } : {}),
      });
      const res = await axios.get(`${API_BASE}/pelanggan?${params}`, getAuthConfig());
      if (res.data.success) {
        setList(res.data.data ?? []);
        setPagination(res.data.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 1 });
      }
    } catch (error: any) {
      showAlert("error", "Gagal memuat data", "Data pelanggan tidak bisa dimuat. Silakan coba lagi.", getErrorMessage(error, "Terjadi kesalahan pada server."));
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/supir-list`, getAuthConfig());
      if (res.data.success) {
        setDrivers((res.data.data ?? []).filter((d: Driver) => d.isActive));
      }
    } catch {
      try {
        const res = await axios.get(`${API_BASE}/users/drivers`, getAuthConfig());
        if (res.data.success) setDrivers(res.data.data ?? []);
      } catch { /* silent */ }
    }
  };

  useEffect(() => { fetchDrivers(); }, []);
  useEffect(() => { fetchList(1); }, [searchTerm, filterDriver]);

  const stats = useMemo(() => ({
    total: pagination.total,
    tanpaSupir: list.filter((p) => !p.driverId).length,
  }), [pagination, list]);

  // ── Validation ───────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.nama.trim()) errors.nama = "Nama pelanggan wajib diisi";
    if (!formData.alamat.trim()) errors.alamat = "Alamat wajib diisi";
    if (!formData.jenisUsaha.trim()) errors.jenisUsaha = "Jenis usaha wajib dipilih";
    if (!formData.driverId) errors.driverId = "Supir wajib dipilih";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────

      const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;

      // ── CEK PERUBAHAN (khusus mode edit) ──
      if (editingItem && originalData) {
        const hasChanged =
          formData.nama.trim() !== originalData.nama ||
          formData.alamat.trim() !== originalData.alamat ||
          formData.jenisUsaha.trim() !== originalData.jenisUsaha ||
          formData.driverId !== originalData.driverId;

        if (!hasChanged) {
          closeFormModal();
          showAlert("info", "Tidak Ada Perubahan", "Data pelanggan tidak mengalami perubahan apapun.", "Silakan ubah data terlebih dahulu sebelum menyimpan.");
          return;
        }
      }

      setSubmitting(true);
      try {
        const payload = {
          nama: formData.nama.trim(),
          alamat: formData.alamat.trim(),
          jenisUsaha: formData.jenisUsaha.trim(),
          driverId: formData.driverId || null,
        };

        if (editingItem) {
          await axios.put(`${API_BASE}/pelanggan/${editingItem.id}`, payload, getAuthConfig());
        } else {
          await axios.post(`${API_BASE}/pelanggan`, payload, getAuthConfig());
        }

        closeFormModal();  // ← Ganti setShowModal(false) dengan ini
        setSubmitting(false);

        if (editingItem) {
          showAlert("success", "Data berhasil diedit", "Perubahan data pelanggan berhasil disimpan.");
        } else {
          showAlert("success", "Pelanggan berhasil ditambahkan", "Pelanggan baru berhasil didaftarkan ke sistem.");
        }

        fetchList(pagination.page);
      } catch (error: any) {
        setSubmitting(false);
        showAlert("error", "Gagal menyimpan data", "Data pelanggan gagal disimpan. Periksa kembali data yang dimasukkan.", getErrorMessage(error, "Terjadi kesalahan pada server."));
      }
    };

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      setSubmitting(true);
      await axios.delete(`${API_BASE}/pelanggan/${id}`, getAuthConfig());
      setSubmitting(false);
      showAlert("success", "Pelanggan berhasil dihapus", "Data telah dihapus secara permanen dari sistem.");
      fetchList(pagination.page);
    } catch (error: any) {
      setSubmitting(false);
      showAlert("error", "Gagal menghapus data", "Data pelanggan gagal dihapus. Silakan coba lagi.", getErrorMessage(error, "Terjadi kesalahan sistem."));
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const res = await axios.get(`${API_BASE}/pelanggan/export`, { ...getAuthConfig(), responseType: "blob" });
      triggerDownload(res.data, `pelanggan_retribusi_${new Date().toISOString().split("T")[0]}.xlsx`);
      showAlert("success", "Export berhasil", "Data pelanggan berhasil diunduh.");
    } catch (error: any) {
      showAlert("error", "Gagal export", "Data pelanggan gagal diunduh. Silakan coba lagi.", getErrorMessage(error, "Terjadi kesalahan."));
    } finally { setExportingAll(false); }
  };

  const handleExportByDriver = async () => {
    if (!filterDriver) { showAlert("error", "Pilih supir", "Pilih supir terlebih dahulu untuk export."); return; }
    setExportingDrv(true);
    try {
      const res = await axios.get(`${API_BASE}/pelanggan/export/driver/${filterDriver}`, { ...getAuthConfig(), responseType: "blob" });
      const driverName = drivers.find((d) => d.id === filterDriver)?.fullName ?? "supir";
      triggerDownload(res.data, `pelanggan_${driverName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
      showAlert("success", "Export berhasil", `Data supir ${driverName} berhasil diunduh.`);
    } catch (error: any) {
      showAlert("error", "Gagal export", "Data supir gagal diunduh. Silakan coba lagi.", getErrorMessage(error, "Terjadi kesalahan."));
    } finally { setExportingDrv(false); }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (p: Pelanggan) => {
    setEditingItem(p);
    setFormErrors({});
    const data = {
      nama: p.nama,
      alamat: p.alamat || "",
      jenisUsaha: p.jenisUsaha || "",
      driverId: p.driverId || "",
    };
    setOriginalData(data);
    setFormData(data);
    setShowModal(true);
  };

  const closeFormModal = () => {
  setShowModal(false);
  setEditingItem(null);
  setOriginalData(null);
  setFormData(INITIAL_FORM);
  setFormErrors({});
};

  const setField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">

      {/* ─── ALERT SYSTEM — identik dengan ManageSupir ───────────────────── */}

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
        title="Hapus Pelanggan?"
        description={
          selectedPelangganForDelete
            ? `Data "${selectedPelangganForDelete.nama}" akan dihapus secara permanen dari sistem.`
            : "Aksi ini akan menghapus data pelanggan secara permanen."
        }
        buttonText="Hapus"
        showCancelButton={true}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          if (selectedPelangganForDelete) {
            await handleDelete(selectedPelangganForDelete.id);
          }
          setSelectedPelangganForDelete(null);
        }}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedPelangganForDelete(null);
        }}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative z-10">
          <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-3">
            Data Pelanggan
          </span>
          <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">Manajemen Pelanggan Retribusi</h1>
          <p className="text-[#5B7078] mt-2 font-medium">Kelola daftar pelanggan retribusi persampahan per supir</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Total Pelanggan", val: stats.total, bg: "bg-gray-50", color: "text-gray-600", icon: Users },
          { label: "Jumlah Supir", val: drivers.length, bg: "bg-blue-50", color: "text-blue-600", icon: Truck },
          { label: "Tanpa Supir", val: stats.tanpaSupir, bg: "bg-amber-50", color: "text-amber-600", icon: AlertCircle },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <Truck size={16} className="text-gray-400" />
          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent font-medium"
          >
            <option value="">Semua Supir</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#4A6D55] bg-white text-[#4A6D55] text-sm font-bold shadow-sm hover:bg-green-50 active:scale-95 transition-all"
        >
          <FileSpreadsheet size={18} /> Import Excel
        </button>

        {filterDriver ? (
          <button onClick={handleExportByDriver} disabled={exportingDrv}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-blue-500 bg-white text-blue-600 text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50">
            {exportingDrv ? <Loader2 size={16} className="animate-spin" /> : <Download size={18} />}
            Export Supir Ini
          </button>
        ) : (
          <button onClick={handleExportAll} disabled={exportingAll}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 text-sm font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
            {exportingAll ? <Loader2 size={16} className="animate-spin" /> : <Download size={18} />}
            Export Semua
          </button>
        )}

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#4A6D55] text-white text-sm font-bold shadow-lg shadow-green-900/20 hover:bg-[#395542] active:scale-95 transition-all"
        >
          <Plus size={18} /> Tambah Pelanggan
        </button>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <ImportModal
            drivers={drivers}
            onClose={() => setShowImport(false)}
            onDone={() => {
              fetchList(1);
              showAlert("success", "Import selesai", "Data pelanggan berhasil diimport ke sistem.");
            }}
          />
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, alamat, atau jenis usaha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-black text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-gray-400">
            <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
            <p className="italic font-medium text-sm">Memuat data pelanggan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">
                  {["No", "Nama Pelanggan", "Alamat", "Jenis Usaha", "Supir", "Aksi"].map((h) => (
                    <th key={h} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400 italic">
                      {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada data pelanggan."}
                    </td>
                  </tr>
                ) : list.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm font-bold text-gray-400">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-[#4A6D55] border border-gray-100 transition-colors font-black">
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-gray-900">{p.nama}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                        {p.alamat || <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">{p.jenisUsaha || "—"}</td>
                    <td className="px-6 py-5">
                      {p.driverName ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                          <Truck size={10} /> {p.driverName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                          Tanpa Supir
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingItem(p)}
                          className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all shadow-sm"
                          title="Edit Data"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedPelangganForDelete(p); setShowDeleteConfirm(true); }}
                          className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all shadow-sm"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
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
              {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} pelanggan
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchList(pagination.page - 1)} disabled={pagination.page === 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
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
                    <span key={`d${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchList(p as number)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${pagination.page === p ? "bg-[#4A6D55] text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                  )
                )}
              <button onClick={() => fetchList(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden my-auto border border-gray-100"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><User size={20} /></div>
                  <h3 className="font-extrabold text-gray-900 tracking-tight">Detail Pelanggan</h3>
                </div>
                <button type="button" onClick={() => setViewingItem(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 bg-green-50 text-[#4A6D55] border border-green-100 rounded-full flex items-center justify-center text-3xl font-black">
                    {viewingItem.nama.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-xl font-extrabold text-gray-900">{viewingItem.nama}</h4>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                  {[
                    { label: "Alamat", value: viewingItem.alamat || "—" },
                    { label: "Jenis Usaha", value: viewingItem.jenisUsaha || "—" },
                    { label: "Supir", value: viewingItem.driverName || "Belum ditugaskan" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
                      <p className="text-gray-800 font-bold mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all text-base"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden my-auto border border-gray-100 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2.5 tracking-tight">
                  <div className={`p-1.5 rounded-lg ${editingItem ? "bg-amber-50 text-amber-600" : "bg-green-50 text-[#4A6D55]"}`}>
                    <User size={18} />
                  </div>
                  {editingItem ? "Edit Data Pelanggan" : "Tambah Pelanggan Baru"}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <form key={editingItem ? `edit-${editingItem.id}` : "create-pelanggan"} onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>

                {Object.keys(formErrors).length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>Lengkapi semua data yang wajib diisi sebelum menyimpan.</span>
                  </div>
                )}

                {/* Nama */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">
                    Nama Pelanggan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.nama ? "text-red-400" : "text-gray-400"}`} />
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={(e) => setField("nama", e.target.value)}
                      placeholder="Masukkan nama lengkap pelanggan"
                      autoComplete="off"
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-base font-medium transition-all border ${
                        formErrors.nama
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                          : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                      }`}
                    />
                  </div>
                  {formErrors.nama && (
                    <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                      <AlertCircle size={12} className="shrink-0" />{formErrors.nama}
                    </p>
                  )}
                </div>

                {/* Alamat */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.alamat ? "text-red-400" : "text-gray-400"}`} />
                    <input
                      type="text"
                      value={formData.alamat}
                      onChange={(e) => setField("alamat", e.target.value)}
                      placeholder="Dusun I, Jl. Kartini, ..."
                      autoComplete="off"
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 rounded-xl outline-none text-base font-medium transition-all border ${
                        formErrors.alamat
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                          : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                      }`}
                    />
                  </div>
                  {formErrors.alamat && (
                    <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                      <AlertCircle size={12} className="shrink-0" />{formErrors.alamat}
                    </p>
                  )}
                </div>

                {/* Jenis Usaha */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">
                    Jenis Usaha <span className="text-red-500">*</span>
                  </label>
                  <JenisUsahaInput
                    value={formData.jenisUsaha}
                    onChange={(val) => setField("jenisUsaha", val)}
                    error={formErrors.jenisUsaha}
                  />
                  {formErrors.jenisUsaha && (
                    <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                      <AlertCircle size={12} className="shrink-0" />{formErrors.jenisUsaha}
                    </p>
                  )}
                </div>

                {/* Supir */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 tracking-wide">
                    Supir Penanggung Jawab <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Truck size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.driverId ? "text-red-400" : "text-gray-400"}`} />
                    <select
                      value={formData.driverId}
                      onChange={(e) => setField("driverId", e.target.value)}
                      className={`w-full pl-11 pr-10 py-3 bg-gray-50/80 rounded-xl outline-none text-base font-medium transition-all border appearance-none ${
                        formErrors.driverId
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/10"
                          : "border-gray-200 focus:border-[#4A6D55] focus:ring-4 focus:ring-[#4A6D55]/10 focus:bg-white"
                      }`}
                    >
                      <option value="">Pilih Supir...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.fullName}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {formErrors.driverId && (
                    <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1">
                      <AlertCircle size={12} className="shrink-0" />{formErrors.driverId}
                    </p>
                  )}
                  {drivers.length === 0 && (
                    <p className="text-xs text-amber-500 ml-1 flex items-center gap-1">
                      <AlertCircle size={11} /> Belum ada supir aktif terdaftar.
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="pt-4 flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 active:scale-[0.99] text-gray-600 rounded-xl font-bold transition-all text-base text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5 bg-[#4A6D55] hover:bg-[#3d5a46] active:scale-[0.99] text-white rounded-xl font-bold shadow-md shadow-green-900/10 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" /><span>Menyimpan...</span></>
                    ) : (
                      <span>{editingItem ? "Simpan Perubahan" : "Tambah Pelanggan"}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}