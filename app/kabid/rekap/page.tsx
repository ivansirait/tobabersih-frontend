'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Building2,
  Truck,
  Users,
  Navigation,
  ClipboardList,
  Info
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type LaporanType = 'wilayah' | 'armada' | 'aduan' | 'supir' | 'rute';

type ExportPayload = {
  type: LaporanType;
  format: 'excel' | 'pdf' | string;
  startDate: string;
  endDate: string;
};

export default function RekapPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    type: LaporanType;
    format: 'excel' | 'pdf';
    startDate: string;
    endDate: string;
  }>({
    type: 'wilayah',
    format: 'excel',
    startDate: '',
    endDate: ''
  });

  const executeExport = async (
    targetType: LaporanType,
    currentFormat: 'excel' | 'pdf',
    start: string,
    end: string
  ) => {
    if (!start || !end) {
      toast.error('Harap pilih rentang tanggal laporan terlebih dahulu');
      return;
    }

    if (new Date(start) > new Date(end)) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal akhir');
      return;
    }

    setLoading(true);
    const loadToast = toast.loading(`Mengompilasi berkas rekap ${targetType}...`);
    const token = localStorage.getItem('token');

    // Normalisasi payload format agar backend selalu dapat string yang sama
    const formatParam = currentFormat === 'excel' ? 'excel' : 'pdf';

    try {
      const endpoint = `${API_BASE_URL}/kabid/export-rekap`;

      const payload: ExportPayload = {
        type: targetType,
        format: formatParam,
        startDate: start,
        endDate: end
      };

      const res = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob',
        validateStatus: () => true
      });

      if (res.status < 200 || res.status >= 300) {
        const contentType = (res.headers['content-type'] || '').toString();
        if (contentType.toLowerCase().includes('application/json')) {
          const text = await res.data.text?.().catch(() => '');
          const msg = (() => {
            try {
              return JSON.parse(text || '{}')?.message || text || 'Gagal mengunduh berkas';
            } catch {
              return text || 'Gagal mengunduh berkas';
            }
          })();
          throw new Error(msg);
        }
        throw new Error(res.data?.toString?.() || `Request gagal (status ${res.status})`);
      }

      const contentTypeHeader = (res.headers['content-type'] || '').toString().toLowerCase();
      const contentDisposition = (res.headers['content-disposition'] || '').toString();

      const inferredMime =
        currentFormat === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';

      const mimeType = contentTypeHeader.includes('application/')
        ? res.headers['content-type'].toString()
        : inferredMime;

      const blob =
        res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: mimeType });

      const blobSize = typeof (blob as any).size === 'number' ? blob.size : 0;
      if (!blobSize) {
        throw new Error('Berkas kosong. Backend mengembalikan response yang tidak valid.');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = currentFormat === 'excel' ? 'xlsx' : 'pdf';

      let filename = `rekap_${targetType}_${start}_ke_${end}.${extension}`;
      const match = contentDisposition.match(/filename\*?=([^;]+)/i);
      if (match?.[1]) {
        const raw = match[1].trim().replace(/(^"|"$)/g, '');
        const cleaned = raw.replace(/^UTF-8''/i, '');
        if (cleaned) filename = decodeURIComponent(cleaned);
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Rekap ${targetType} sukses diunduh!`, { id: loadToast });
    } catch (err: any) {
      console.error('Export error:', err);
      const errorMsg = err?.message || err?.response?.data?.message || 'Gagal mengunduh berkas';
      toast.error(errorMsg, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  // PERBAIKAN: Fungsi ini sekarang hanya memilih tipe laporan saja, TIDAK langsung mendownload berkas
  const handleTypeSelectOnly = (selectedType: LaporanType) => {
    setFormData((prev) => ({ ...prev, type: selectedType }));
  };

  // Fungsi pengeksekusi manual yang dipicu eksklusif oleh tombol di bagian bawah
  const handleManualExport = () => {
    executeExport(formData.type, formData.format, formData.startDate, formData.endDate);
  };

  return (
    <div className="space-y-6 text-black antialiased p-4 md:p-6 max-w-7xl mx-auto font-sans">
      <Toaster position="top-right" />

      {/* ─── BANNER HEADER ─── */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 border border-white/50">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
          Rekapitulasi & Arsip Laporan
        </h1>
        <p className="text-[#5B7078] text-sm mt-1 font-medium">
          Unduh dokumen rekap berkas logistik, kepegawaian, serta aduan dalam format PDF atau Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── FORM CONFIGURATION PANEL ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <Download size={18} className="text-green-600" /> Konfigurasi Ekspor Dokumen
          </h2>

          <hr className="border-gray-100" />

          <div className="space-y-5">
            {/* Opsi 1: Pemilihan Jenis Dokumen Laporan */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                1. Pilih Jenis Laporan Yang Ingin Diarsipkan
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTypeSelectOnly('wilayah')}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                    formData.type === 'wilayah'
                      ? 'border-[#064E3B] bg-emerald-50/40 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={20} className={formData.type === 'wilayah' ? 'text-[#064E3B]' : 'text-gray-400'} />
                    <span className="text-xs md:text-sm">Data Wilayah Operasional</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelectOnly('armada')}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                    formData.type === 'armada'
                      ? 'border-[#064E3B] bg-emerald-50/40 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck size={20} className={formData.type === 'armada' ? 'text-[#064E3B]' : 'text-gray-400'} />
                    <span className="text-xs md:text-sm">Status Armada</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelectOnly('supir')}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                    formData.type === 'supir'
                      ? 'border-[#064E3B] bg-emerald-50/40 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={20} className={formData.type === 'supir' ? 'text-[#064E3B]' : 'text-gray-400'} />
                    <span className="text-xs md:text-sm">Data Supir</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelectOnly('rute')}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                    formData.type === 'rute'
                      ? 'border-[#064E3B] bg-emerald-50/40 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Navigation size={20} className={formData.type === 'rute' ? 'text-[#064E3B]' : 'text-gray-400'} />
                    <span className="text-xs md:text-sm">Data Rute Armada</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelectOnly('aduan')}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left sm:col-span-2 ${
                    formData.type === 'aduan'
                      ? 'border-[#064E3B] bg-emerald-50/40 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList size={20} className={formData.type === 'aduan' ? 'text-[#064E3B]' : 'text-gray-400'} />
                    <span className="text-xs md:text-sm">Laporan Aduan Masyarakat</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Opsi 2: Pemilihan Parameter Rentang Waktu */}
            <div>
              <label className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                2. Tentukan Batasan Waktu Log Data (Wajib)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Dari Tanggal</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-xs font-bold transition-all"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Sampai Tanggal</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-xs font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Opsi 3: Ekstensi Ekspor Dokumen */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                3. Pilih Ekstensi Berkas Dokumen
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'excel' })}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    formData.format === 'excel'
                      ? 'border-[#064E3B] bg-emerald-50/20 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <FileSpreadsheet size={18} className={formData.format === 'excel' ? 'text-green-700' : 'text-gray-400'} />
                  <span className="text-xs">Format Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'pdf' })}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    formData.format === 'pdf'
                      ? 'border-[#064E3B] bg-emerald-50/20 text-[#064E3B] font-extrabold shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  }`}
                >
                  <FileText size={18} className={formData.format === 'pdf' ? 'text-red-700' : 'text-gray-400'} />
                  <span className="text-xs">Format PDF (.pdf)</span>
                </button>
              </div>
            </div>

            {/* Tombol Eksekutor Tunggal Unduhan */}
            <button
              onClick={handleManualExport}
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-[#064E3B] text-white rounded-xl font-bold text-sm hover:bg-[#053f30] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Sedang Mengunduh Data Rekap...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Unduh Dokumen Terpilih ({formData.type})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── SIDEBAR INFORMATION PANEL ─── */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <Info size={18} className="text-blue-600" /> Ringkasan Struktur Berkas
          </h2>
          <hr className="border-gray-100" />

          <div className="space-y-3">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 mb-1">
                <Building2 size={14} className="text-blue-600" /> Data Wilayah
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Mencakup nama sektor geofencing, kode wilayah, batas jangkauan radius, total laporan per wilayah, dan status operasional.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 mb-1">
                <Truck size={14} className="text-green-600" /> Status Armada
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Berisi manifest plat nomor kendaran dinas, nama supir penanggung jawab, status operasional, total tugas yang diselesaikan, dan volume sampah terangkut.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 mb-1">
                <Users size={14} className="text-amber-600" /> Data Supir
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Memuat rekam kontak seluruh personil supir, email dinas, nomor ponsel aktif, status verifikasi akun, total tugas, dan waktu bergabung.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 mb-1">
                <Navigation size={14} className="text-indigo-600" /> Data Rute Armada
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Memetakan nama rute berkala, hari operasional, plat truk penanggung jawab, status aktivitas rute, dan jumlah titik waypoint.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 mb-1">
                <ClipboardList size={14} className="text-purple-600" /> Laporan Aduan Masyarakat
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Menampilkan nomor dokumen laporan, nama pelapor, jenis sampah yang dilaporkan, lokasi kejadian aduan, serta logs status progres penyelesaian akhir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}