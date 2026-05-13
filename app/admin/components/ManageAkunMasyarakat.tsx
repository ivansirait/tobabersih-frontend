"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Plus, Edit3, Trash2, Search, Mail, Phone, X, Users,
  CheckCircle2, XCircle, MapPin, Eye, FileSpreadsheet, Upload,
  AlertCircle, KeyRound, Download
} from "lucide-react";
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AkunMasyarakat {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  region: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  region: string;
  password?: string;
  role?: string;
}

interface ImportRow {
  fullName: string;
  phone: string;
  email: string;
  region: string;
  password?: string;
  status?: "pending" | "success" | "error";
  errorMsg?: string;
}

interface ExportData {
  fullName: string;
  email: string;
  phoneNumber: string;
  region: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE_URL   = "http://localhost:5000/api";
const DEFAULT_PASS   = "Warga123!";
const INITIAL_FORM: FormData = { fullName: "", email: "", phoneNumber: "", region: "" };

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({ onClose }: { onClose: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<"excel" | "csv">("excel");

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `akun_masyarakat_${new Date().toISOString().split("T")[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Data berhasil diexport sebagai ${format.toUpperCase()}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col border border-white/20">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 flex-shrink-0">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Export Data</span>
            <h3 className="text-xl font-medium text-gray-900 flex items-center gap-2 mt-1">
              <Download size={20} className="text-[#064E3B]" />
              Export Data Akun
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Download data akun masyarakat dalam file Excel atau CSV
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-[20px] bg-gray-50 border border-gray-100 px-5 py-4">
            <p className="text-sm font-medium text-gray-800 mb-4">Pilih format export:</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-[16px] bg-white border-2 border-[#064E3B]">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === "excel"}
                  onChange={() => setFormat("excel")}
                  className="accent-[#064E3B]"
                />
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-[#064E3B]" />
                  <div>
                    <p className="font-medium text-gray-900">Microsoft Excel (.xlsx)</p>
                    <p className="text-xs text-gray-400">Format terbaik untuk di Excel atau Google Sheets</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-[16px] bg-white border border-gray-200">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="accent-[#064E3B]"
                />
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">CSV (.csv)</p>
                    <p className="text-xs text-gray-400">Format sederhana untuk aplikasi lainnya</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <AlertCircle size={15} /> Informasi Export
            </p>
            <p className="text-xs text-amber-700">
              • Semua akun masyarakat akan diexport<br />
              • File berisi nama, email, telepon, wilayah, status, dan tanggal dibuat<br />
              • Data diurutkan dari terbaru ke terlama
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 px-8 py-5 flex items-center justify-between gap-3 bg-gray-50/50">
          <button onClick={onClose}
            className="px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all text-sm">
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] bg-[#064E3B] text-white text-sm font-medium hover:bg-[#053f30] transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mengexport...
              </>
            ) : (
              <><Download size={15} /> Export Data</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]                   = useState<ImportRow[]>([]);
  const [fileName, setFileName]           = useState("");
  const [importing, setImporting]         = useState(false);
  const [done, setDone]                   = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [summary, setSummary]             = useState<{ success: number; error: number; total: number } | null>(null);
  const [useCustomPass, setUseCustomPass] = useState(false);
  const [globalPass, setGlobalPass]       = useState("");
  const [showPass, setShowPass]           = useState(false);

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped: ImportRow[] = json.map((r) => ({
        fullName: String(r["Nama Lengkap"] ?? r["name"]     ?? r["fullName"]    ?? "").trim(),
        phone:    String(r["Nomor HP"]    ?? r["phone"]     ?? r["phoneNumber"] ?? "").trim(),
        email:    String(r["Email"]       ?? r["email"]     ?? "").trim(),
        region:   String(r["Wilayah"]     ?? r["region"]    ?? r["Alamat"]      ?? "").trim(),
        password: String(r["Kata Sandi"]  ?? r["password"]  ?? "").trim() || undefined,
        status:   "pending",
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
      ["Nama Lengkap", "Nomor HP", "Email", "Wilayah", "Kata Sandi (Opsional)"],
      ["Budi Santoso",  "081234567890", "budi@email.com",  "Balige",   ""],
      ["Sari Dewi",     "082345678901", "sari@email.com",  "Laguboti", "SariPass123"],
      ["Anton Lumban",  "083456789012", "anton@email.com", "Porsea",   ""],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_akun_masyarakat.xlsx");
  };

  const resolvePassword = (row: ImportRow) => {
    if (useCustomPass && globalPass.trim()) return globalPass.trim();
    if (row.password) return row.password;
    return DEFAULT_PASS;
  };

  const handleImport = async () => {
    setImporting(true);
    const validated: ImportRow[] = rows.map((r) =>
      !r.fullName || !r.email
        ? { ...r, status: "error", errorMsg: "Nama & Email wajib diisi" }
        : r
    );
    const valid   = validated.filter((r) => r.status !== "error");
    const invalid = validated.filter((r) => r.status === "error");
    setRows([...validated]);

    if (valid.length === 0) {
      setImporting(false); setDone(true);
      setSummary({ success: 0, error: invalid.length, total: rows.length });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/users/bulk`,
        {
          users: valid.map((r) => ({
            fullName:    r.fullName,
            email:       r.email,
            phoneNumber: r.phone,
            region:      r.region || "",
            password:    resolvePassword(r),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const results: { email: string; status: string; message: string }[] = res.data?.results ?? [];
      const resultMap = new Map(results.map((r) => [r.email, r]));

      const final: ImportRow[] = validated.map((row) => {
        if (row.status === "error") return row;
        const result = resultMap.get(row.email);
        if (!result) return { ...row, status: "error", errorMsg: "Tidak ada respons server" };
        return {
          ...row,
          status:   result.status === "success" ? "success" : "error",
          errorMsg: result.status === "error"   ? result.message : undefined,
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
  const errorCount   = rows.filter((r) => r.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 flex-shrink-0">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Import Data</span>
            <h3 className="text-xl font-medium text-gray-900 flex items-center gap-2 mt-1">
              <FileSpreadsheet size={20} className="text-[#064E3B]" />
              Import Akun dari Excel
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Hingga 500 akun · Password default: <span className="font-mono font-semibold text-[#064E3B]">{DEFAULT_PASS}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-8 space-y-5">

          {/* Download Template */}
          <div className="flex items-center justify-between rounded-[20px] bg-gray-50 border border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Belum punya template?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Wajib: <span className="font-mono font-semibold">Nama Lengkap, Email</span>
                {" "}· Opsional: <span className="font-mono font-semibold">Nomor HP, Wilayah, Kata Sandi</span>
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-[20px] bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-[#064E3B] shadow-sm hover:bg-gray-50 transition"
            >
              <FileSpreadsheet size={15} /> Unduh Template
            </button>
          </div>

          {/* Password Setting */}
          {rows.length > 0 && !done && (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <KeyRound size={15} /> Pengaturan Kata Sandi
              </p>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={!useCustomPass} onChange={() => setUseCustomPass(false)} className="accent-[#064E3B]" />
                Gunakan password default: <span className="font-mono font-semibold text-[#064E3B]">{DEFAULT_PASS}</span>
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" checked={useCustomPass} onChange={() => setUseCustomPass(true)} className="accent-[#064E3B]" />
                  Gunakan satu password untuk semua:
                </label>
                {useCustomPass && (
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type={showPass ? "text" : "password"}
                      value={globalPass}
                      onChange={(e) => setGlobalPass(e.target.value)}
                      placeholder="Masukkan password..."
                      className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#064E3B] pr-10 text-black"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                      {showPass ? "Sembunyikan" : "Lihat"}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-amber-700 bg-amber-100 rounded-[16px] px-3 py-2">
                💡 Jika kolom <span className="font-mono font-semibold">Kata Sandi</span> diisi di Excel, password per baris akan digunakan (kecuali opsi custom diaktifkan).
              </p>
            </div>
          )}

          {/* Summary */}
          {done && summary && (
            <div className="rounded-[20px] border border-gray-100 bg-white px-5 py-4 flex flex-wrap items-center gap-4 shadow-sm">
              <span className="text-sm text-gray-500">Total: <strong>{summary.total}</strong></span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                <CheckCircle2 size={15} /> {summary.success} berhasil didaftarkan
              </span>
              {summary.error > 0 && (
                <span className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                  <AlertCircle size={15} /> {summary.error} gagal
                </span>
              )}
            </div>
          )}

          {/* Drop Zone */}
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

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    📄 {fileName} — <span className="text-[#064E3B]">{rows.length} baris</span>
                  </p>
                  {done && (
                    <p className="text-xs mt-0.5 text-gray-400">
                      <span className="text-green-600 font-medium">{successCount} berhasil</span>
                      {errorCount > 0 && <span className="text-red-500 font-medium"> · {errorCount} gagal</span>}
                    </p>
                  )}
                </div>
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
                      {["#", "Nama Lengkap", "Nomor HP", "Email", "Wilayah", "Kata Sandi", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {rows.map((row, i) => (
                      <tr key={i} className={
                        row.status === "error"   ? "bg-red-50"   :
                        row.status === "success" ? "bg-green-50" : ""
                      }>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.fullName || <span className="text-red-400 italic text-xs">kosong</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.phone || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {row.email || <span className="text-red-400 italic text-xs">kosong</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.region || "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {useCustomPass && globalPass
                            ? <span className="text-amber-600">custom</span>
                            : row.password
                              ? <span className="text-blue-500">dari excel</span>
                              : <span className="text-gray-400">default</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "pending" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Menunggu</span>
                          )}
                          {row.status === "success" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              <CheckCircle2 size={10} /> Berhasil
                            </span>
                          )}
                          {row.status === "error" && (
                            <span title={row.errorMsg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                              <AlertCircle size={10} /> {row.errorMsg ?? "Gagal"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-8 py-5 flex items-center justify-between gap-3 bg-gray-50/50">
          <button onClick={onClose}
            className="px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all text-sm">
            {done ? "Tutup" : "Batal"}
          </button>

          <div className="flex gap-3">
            {rows.length > 0 && !done && (
              <button
                onClick={handleImport}
                disabled={importing || (useCustomPass && !globalPass.trim())}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] bg-[#064E3B] text-white text-sm font-medium hover:bg-[#053f30] transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mendaftarkan {rows.length} akun...
                  </>
                ) : (
                  <><Upload size={15} /> Import & Daftarkan {rows.length} Akun</>
                )}
              </button>
            )}
            {done && (
              <button
                onClick={() => { setRows([]); setFileName(""); setDone(false); setSummary(null); setUseCustomPass(false); setGlobalPass(""); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[24px] border border-[#064E3B] bg-white text-[#064E3B] text-sm font-medium hover:bg-green-50 transition-all"
              >
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
  const [akunList,          setAkunList]          = useState<AkunMasyarakat[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [submitting,        setSubmitting]        = useState(false);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [showModal,         setShowModal]         = useState(false);
  const [showImport,        setShowImport]        = useState(false);
  const [showExport,        setShowExport]        = useState(false);
  const [viewingAkun,       setViewingAkun]       = useState<AkunMasyarakat | null>(null);
  const [editingAkun,       setEditingAkun]       = useState<AkunMasyarakat | null>(null);
  const [pendingDeleteId,   setPendingDeleteId]   = useState<string | null>(null);
  const [deleting,          setDeleting]          = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle,      setSuccessTitle]      = useState('');
  const [successDescription,setSuccessDescription]= useState('');
  const [successIcon,       setSuccessIcon]       = useState<any>(<CheckCircle2 size={24} />);
  const [formData,          setFormData]          = useState<FormData>(INITIAL_FORM);

  const fetchAkun = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res   = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setAkunList(res.data.data || []);
      else toast.error(res.data.message || "Gagal memuat data");
    } catch (err: any) {
      if (err.response?.data?.message) toast.error(err.response.data.message);
      else if (!err.response)          toast.error("Tidak dapat terhubung ke server");
      else                             toast.error("Gagal memuat data akun masyarakat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAkun(); }, []);

  const stats = useMemo(() => ({
    total:    akunList.length,
    active:   akunList.filter((a) => a.isActive).length,
    inactive: akunList.filter((a) => !a.isActive).length,
  }), [akunList]);

  const filteredAkun = akunList.filter((a) =>
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token  = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload: any = {
        fullName:    formData.fullName,
        email:       formData.email,
        phoneNumber: formData.phoneNumber || null,
        region:      formData.region || null,
      };

      let res;
      if (editingAkun) {
        if (formData.password?.trim()) payload.password = formData.password.trim();
        res = await axios.put(`${API_BASE_URL}/users/${editingAkun.id}`, payload, config);
        if (res.data.success) {
          setSuccessTitle('Data berhasil diedit');
          setSuccessDescription('Perubahan akun berhasil disimpan.');
          setSuccessIcon(<Edit3 size={24} />);
        }
      } else {
        payload.password = formData.password?.trim() || DEFAULT_PASS;
        payload.role     = "WARGA";
        res = await axios.post(`${API_BASE_URL}/users`, payload, config);
        if (res.data.success) {
          setSuccessTitle('Akun berhasil didaftarkan');
          setSuccessDescription(`Akun masyarakat baru berhasil ditambahkan.${!formData.password?.trim() ? ` Password default: ${DEFAULT_PASS}` : ""}`);
          setSuccessIcon(<CheckCircle2 size={24} />);
        }
      }

      if (!res.data.success) throw new Error(res.data.message || 'Gagal menyimpan data');

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchAkun();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.delete(`${API_BASE_URL}/users/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSuccessTitle('Data berhasil dihapus');
        setSuccessDescription(res.data.message || 'Akun masyarakat telah dihapus secara permanen.');
        setSuccessIcon(<Trash2 size={24} />);
        setShowSuccessDialog(true);
        fetchAkun();
      } else {
        throw new Error(res.data.message || 'Gagal menghapus akun');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menghapus akun");
    } finally {
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingAkun(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  };

  // Auto-generate email based on full name
  const generateEmail = (fullName: string) => {
    if (!fullName) return "";
    const name = fullName.toLowerCase().replace(/\s+/g, "");
    return `${name}@gmail.com`;
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fullName = e.target.value;
    setFormData(prev => ({
      ...prev,
      fullName,
      email: generateEmail(fullName) // Auto-fill email
    }));
  };

  const openEditModal = (akun: AkunMasyarakat) => {
    setEditingAkun(akun);
    setFormData({ fullName: akun.fullName, email: akun.email, phoneNumber: akun.phoneNumber || "", region: akun.region || "", password: "" });
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-right" />

      <AlertDialog
        open={showSuccessDialog}
        title={successTitle}
        description={successDescription}
        buttonText="OK"
        icon={successIcon}
        onClose={() => setShowSuccessDialog(false)}
      />

      {/* HEADER */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Data & Operasional
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Akun Masyarakat</h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Kelola akun akses untuk anggota masyarakat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Akun',  val: stats.total,    color: 'text-gray-600',  bg: 'bg-gray-50',  icon: Users        },
          { label: 'Akun Aktif', val: stats.active,   color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Nonaktif',   val: stats.inactive, color: 'text-red-600',   bg: 'bg-red-50',   icon: XCircle      },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-[24px] ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-medium text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ACTION BUTTONS — Import Excel di kiri, Export di tengah, Tambah di kanan */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[24px] border border-[#064E3B] bg-white text-[#064E3B] text-sm font-medium transition-all duration-200 shadow-sm hover:bg-green-50 active:scale-95"
        >
          <FileSpreadsheet size={18} />
          Import Excel
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[24px] border border-gray-300 bg-white text-gray-700 text-sm font-medium transition-all duration-200 shadow-sm hover:bg-gray-50 active:scale-95"
        >
          <Download size={18} />
          Export Data
        </button>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[24px] bg-[#064E3B] text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-slate-200 hover:bg-[#053f30] active:scale-95"
        >
          <Plus size={18} /> Tambah Akun Baru
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            fetchAkun();
            toast.success("Import selesai! Akun berhasil didaftarkan ke sistem.");
          }}
        />
      )}

      {/* TABLE */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, email, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-[24px] focus:ring-2 focus:ring-green-500/20 outline-none text-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-400">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p>Sinkronisasi data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Informasi Akun</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Kontak</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Alamat</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Kata Sandi</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAkun.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                      {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada akun masyarakat."}
                    </td>
                  </tr>
                ) : filteredAkun.map((akun, idx) => (
                  <tr key={akun.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-5 text-center text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors font-medium">
                          {akun.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-none">{akun.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase tracking-tighter">ID: {akun.id.toString().slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" /> {akun.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Phone size={12} /> {akun.phoneNumber || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-gray-600">{akun.region || 'Tidak ada alamat'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-mono">
                        <KeyRound size={10} /> ••••••••
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${
                        akun.isActive
                          ? 'bg-green-100 text-green-800 ring-green-600/20'
                          : 'bg-red-100 text-red-800 ring-red-600/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${akun.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                        {akun.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingAkun(akun)} className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(akun)} className="p-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => { setPendingDeleteId(akun.id); setShowConfirmDialog(true); }} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VIEW DETAIL */}
      {viewingAkun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-medium text-gray-900">Detail Akun Masyarakat</h3>
              <button onClick={() => setViewingAkun(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-green-100 text-green-700 rounded-[24px] flex items-center justify-center text-3xl font-black shadow-inner">
                  {viewingAkun.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-900">{viewingAkun.fullName}</h4>
                  <span className={`text-xs font-medium uppercase tracking-widest ${viewingAkun.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    Akun {viewingAkun.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Alamat Email</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Mail size={16} className="text-green-600" /> {viewingAkun.email}</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Nomor Telepon</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><Phone size={16} className="text-green-600" /> {viewingAkun.phoneNumber || 'Tidak ada nomor'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Alamat / Wilayah</label>
                  <p className="text-gray-700 font-medium flex items-center gap-2 mt-1"><MapPin size={16} className="text-green-600" /> {viewingAkun.region || 'Tidak ada alamat'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Kata Sandi</label>
                  <p className="text-gray-500 font-mono flex items-center gap-2 mt-1"><KeyRound size={14} className="text-green-600" /> ••••••••</p>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">ID Akun</label>
                  <p className="text-gray-700 font-mono text-sm">{viewingAkun.id}</p>
                </div>
              </div>
              <button onClick={() => setViewingAkun(null)} className="w-full py-4 bg-gray-900 text-white rounded-[24px] font-medium hover:bg-gray-800 transition-all">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-medium text-gray-900">
                  {editingAkun ? 'Edit Akun Masyarakat' : 'Tambah Akun Baru'}
                </h3>
                {!editingAkun && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Jika kata sandi dikosongkan, akan menggunakan: <span className="font-mono font-semibold text-[#064E3B]">{DEFAULT_PASS}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  required
                  value={formData.fullName}
                  onChange={handleFullNameChange}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition font-medium text-black"
                />
                <p className="text-xs text-gray-500 mt-1">Email otomatis terisi berdasarkan nama: <span className="font-mono text-[#064E3B]">{formData.email}</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email" required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">Alamat / Wilayah</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Contoh: Balige, Laguboti"
                    className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                  />
                </div>
              </div>

              {/* Kata Sandi */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 ml-1">
                  {editingAkun ? "Kata Sandi Baru" : "Kata Sandi"}
                </label>
                <input
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAkun ? "Kosongkan jika tidak ingin mengubah" : `Default: ${DEFAULT_PASS}`}
                  className="w-full px-4 py-3 rounded-[24px] border border-gray-200 focus:border-green-500 outline-none transition text-black"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-[24px] text-gray-600 font-medium hover:bg-gray-100 transition-all">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#064E3B] text-white px-6 py-3 rounded-[24px] font-medium hover:bg-[#053f30] shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : (editingAkun ? 'Simpan Perubahan' : 'Daftarkan Akun')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Hapus Akun Masyarakat?"
        description="Aksi ini akan menghapus akun masyarakat secara permanen dari sistem."
        confirmText={deleting ? "Menghapus..." : "Ya, Hapus"}
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmDialog(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}