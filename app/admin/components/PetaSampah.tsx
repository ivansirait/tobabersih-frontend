"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';

import {
  Map as MapIcon,
  Truck,
  Navigation,
  History,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  LayoutGrid,
  ChevronDown,
  MapPin,
  TrendingUp,
  Calendar,
  Route,
  User,
  X,
  FileDown,
  FileSpreadsheet,
  FileText,
  Bell,
  CheckCheck,
  Search,
  BarChart3,
  Activity,
  ArrowUpRight,
  Zap,
  SortAsc,
  ChevronRight,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Operator { id: string; fullName: string; phoneNumber?: string; }
interface TaskAktif { status: string; location?: string; district?: string; }
interface Waypoint { urutan: number; nama: string; lat: number; lng: number; }
interface RuteHariIni { hari: string; namaHari: string; waypoints: Waypoint[]; }
interface TrukAktif {
  id: string; plateNumber: string; status: string;
  currentLat: number | null; currentLong: number | null;
  lastPing: string | null; lastLocation: string | null;
  operator: Operator | null; taskAktif: TaskAktif | null; ruteHariIni: RuteHariIni | null;
}
interface TitikJalur { lat: number; lng: number; timestamp: string; }
interface HistoryEntry {
  jalur: TitikJalur[]; jarakTotalKm: number; durasiMenit: number;
  totalTitik: number; waktuMulai: string | null; waktuSelesai: string | null; ruteJadwal?: RuteHariIni | null;
}
interface RingkasanSelesai {
  totalTitikLokasi: number; jarakTempuhKm: number;
  durasiKerjaMenit: number; durasiKerjaJam: number;
  waktuMulai: string | null; waktuSelesai: string | null;
}
interface RiwayatSelesai {
  trukId: string; plateNumber: string; operatorName: string; tanggal: string;
  ringkasan: RingkasanSelesai; ruteJadwal?: RuteHariIni | null; jalurDilalui?: TitikJalur[];
}

// ============================================================
// ALERT SYSTEM
// ============================================================
type AlertType = 'success' | 'error' | 'warning' | 'info';
interface AlertItem { id: string; type: AlertType; title: string; message: string; timestamp: Date; }

function AlertContainer({ alerts, onDismiss }: { alerts: AlertItem[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) return null;
  const colors: Record<AlertType, { bg: string; border: string; icon: string; title: string }> = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '✅', title: 'text-emerald-800' },
    error:   { bg: 'bg-red-50',     border: 'border-red-300',     icon: '❌', title: 'text-red-800'     },
    warning: { bg: 'bg-amber-50',   border: 'border-amber-300',   icon: '⚠️', title: 'text-amber-800'  },
    info:    { bg: 'bg-blue-50',    border: 'border-blue-300',    icon: 'ℹ️', title: 'text-blue-800'   },
  };
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => {
        const c = colors[alert.type];
        return (
          <div key={alert.id} className={`${c.bg} ${c.border} border rounded-xl p-4 shadow-lg pointer-events-auto flex items-start gap-3`}>
            <span className="text-lg shrink-0 mt-0.5">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${c.title}`}>{alert.title}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{alert.message}</p>
            </div>
            <button onClick={() => onDismiss(alert.id)} className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = '/api';
const WAYPOINT_PASSED_RADIUS_M = 80;

function formatDurasi(menit: number): string {
  if (!menit || menit <= 0) return '-';
  const jam = Math.floor(menit / 60); const sisa = menit % 60;
  if (jam === 0) return `${sisa} mnt`;
  return `${jam}j ${sisa}m`;
}
function formatWaktu(timestamp: string | null): string {
  if (!timestamp) return '-';
  try { return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '-'; }
}
function formatTanggal(iso: string): string {
  try { return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}
function formatTanggalPendek(iso: string): string {
  try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}
function defaultRingkasan(): RingkasanSelesai {
  return { totalTitikLokasi: 0, jarakTempuhKm: 0, durasiKerjaMenit: 0, durasiKerjaJam: 0, waktuMulai: null, waktuSelesai: null };
}
function normalizeRingkasan(raw: any): RingkasanSelesai {
  if (!raw) return defaultRingkasan();
  return {
    totalTitikLokasi: raw.totalTitikLokasi ?? raw.totalTitik          ?? 0,
    jarakTempuhKm:    raw.jarakTempuhKm    ?? raw.jarakTotalKm        ?? 0,
    durasiKerjaMenit: raw.durasiKerjaMenit ?? raw.durasiMenit         ?? 0,
    durasiKerjaJam:   raw.durasiKerjaJam   ?? Math.floor((raw.durasiKerjaMenit ?? raw.durasiMenit ?? 0) / 60),
    waktuMulai:       raw.waktuMulai       ?? null,
    waktuSelesai:     raw.waktuSelesai     ?? null,
  };
}
function hitungJarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isWaypointDilewati(waypoint: Waypoint, jalur: TitikJalur[]): boolean {
  return jalur.some(
    (titik) => hitungJarakMeter(waypoint.lat, waypoint.lng, titik.lat, titik.lng) <= WAYPOINT_PASSED_RADIUS_M
  );
}

// ============================================================
// EXPORT UTILITIES  (tidak berubah)
// ============================================================
async function exportToExcel(riwayatList: RiwayatSelesai[], tanggal: string) {
  const wb = XLSX.utils.book_new();
  const summaryRows: any[][] = [
    ['LAPORAN OPERASIONAL ARMADA PENGANGKUT SAMPAH'],
    [`Tanggal: ${formatTanggal(tanggal)}`],
    [`Total Armada Beroperasi: ${riwayatList.length} unit`],
    [''],
    ['No', 'Plat Nomor', 'Operator', 'Mulai Beroperasi', 'Selesai Beroperasi', 'Total Durasi', 'Jarak Tempuh (km)', 'Titik GPS Tercatat', 'Jumlah Rute'],
  ];
  riwayatList.forEach((r, i) => {
    const ring = normalizeRingkasan(r.ringkasan);
    const jumlahRute = r.ruteJadwal?.waypoints?.length ?? 0;
    const durasi = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)}j ${ring.durasiKerjaMenit % 60}m` : '-';
    summaryRows.push([
      i + 1, r.plateNumber, r.operatorName,
      ring.waktuMulai   ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID',   { hour: '2-digit', minute: '2-digit' }) : '-',
      ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      durasi,
      ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0',
      ring.totalTitikLokasi, jumlahRute,
    ]);
  });
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 4 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  const detailRows: any[][] = [['DETAIL RUTE OPERASIONAL ARMADA'], [`Tanggal: ${formatTanggal(tanggal)}`], ['']];
  riwayatList.forEach((r, i) => {
    const ring    = normalizeRingkasan(r.ringkasan);
    const durasi  = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)} jam ${ring.durasiKerjaMenit % 60} menit` : '-';
    const mulai   = ring.waktuMulai   ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID',   { hour: '2-digit', minute: '2-digit' }) : '-';
    const selesai = ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    detailRows.push([`── ARMADA ${i + 1}: ${r.plateNumber} ──`]);
    detailRows.push(['Operator:', r.operatorName]);
    detailRows.push(['Mulai:', mulai, 'Selesai:', selesai]);
    detailRows.push(['Durasi Kerja:', durasi]);
    detailRows.push(['Jarak Tempuh:', `${ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0'} km`]);
    detailRows.push(['Titik GPS Tercatat:', ring.totalTitikLokasi]);
    detailRows.push(['']);
    const rute = r.ruteJadwal ?? (r as any).ruteHariIni ?? null;
    if (rute?.waypoints && rute.waypoints.length > 0) {
      detailRows.push(['  RUTE YANG DILALUI:']);
      detailRows.push(['  No.', '  Nama Lokasi / Titik', '  Keterangan']);
      rute.waypoints.forEach((wp: Waypoint, idx: number) => {
        const isFirst = idx === 0; const isLast = idx === rute.waypoints.length - 1;
        const ket = isFirst ? 'Titik Awal (START)' : isLast ? 'Titik Akhir (END)' : `Titik Pengangkutan ${idx}`;
        detailRows.push([`  ${wp.urutan}.`, `  ${wp.nama}`, `  ${ket}`]);
      });
    } else {
      detailRows.push(['  Rute: Data rute tidak tersedia']);
    }
    detailRows.push(['', '', '']);
    if (i < riwayatList.length - 1) detailRows.push(['─────────────────────────────────────────────']);
    detailRows.push(['']);
  });
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 22 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Rute');
  const fileName = `Laporan_Armada_${tanggal}.xlsx`;
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob  = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fileName;
}

function buildPDFHtml(riwayatList: RiwayatSelesai[], tanggal: string): string {
  const rows = riwayatList.map((r, i) => {
    const ring    = normalizeRingkasan(r.ringkasan);
    const durasi  = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)}j ${ring.durasiKerjaMenit % 60}m` : '-';
    const mulai   = ring.waktuMulai   ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID',   { hour: '2-digit', minute: '2-digit' }) : '-';
    const selesai = ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const rute      = r.ruteJadwal ?? (r as any).ruteHariIni ?? null;
    const waypoints = rute?.waypoints ?? [];
    const ruteHtml  = waypoints.length > 0
      ? `<table class="rute-table"><thead><tr><th>No</th><th>Nama Lokasi / Titik</th><th>Keterangan</th></tr></thead><tbody>
          ${waypoints.map((wp: Waypoint, idx: number) => {
            const isFirst = idx === 0; const isLast = idx === waypoints.length - 1;
            const ket = isFirst ? 'Titik Awal (START)' : isLast ? 'Titik Akhir (END)' : `Titik Pengangkutan ${idx}`;
            return `<tr><td class="center">${wp.urutan}</td><td><strong>${wp.nama}</strong></td><td class="ket">${ket}</td></tr>`;
          }).join('')}
        </tbody></table>`
      : '<p class="no-data">Data rute tidak tersedia</p>';
    return `
      <div class="truk-block">
        <div class="truk-header">
          <span class="truk-num">Armada ${i + 1}</span>
          <span class="truk-plate">${r.plateNumber}</span>
          <span class="badge-done">Selesai Beroperasi</span>
        </div>
        <div class="truk-meta">
          <div class="meta-row">
            <div class="meta-item"><span class="meta-label">Operator</span><span class="meta-val">${r.operatorName}</span></div>
            <div class="meta-item"><span class="meta-label">Mulai Beroperasi</span><span class="meta-val time">${mulai}</span></div>
            <div class="meta-item"><span class="meta-label">Selesai Beroperasi</span><span class="meta-val time">${selesai}</span></div>
          </div>
          <div class="stats-row">
            <div class="stat-box blue"><span class="stat-val">${ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0'} km</span><span class="stat-label">Jarak Tempuh</span></div>
            <div class="stat-box purple"><span class="stat-val">${durasi}</span><span class="stat-label">Durasi Kerja</span></div>
            <div class="stat-box green"><span class="stat-val">${ring.totalTitikLokasi}</span><span class="stat-label">Titik GPS</span></div>
          </div>
        </div>
        <div class="rute-section">
          <div class="rute-title">Rute yang Dilalui${rute?.namaHari ? ` — ${rute.namaHari}` : ''}</div>
          ${ruteHtml}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>Laporan Armada ${tanggal}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff;padding:24px 32px;width:794px; }
    .kop { border-bottom:3px solid #064E3B;padding-bottom:14px;margin-bottom:20px;display:flex;align-items:flex-start;gap:16px; }
    .kop-logo { width:52px;height:52px;background:#064E3B;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;color:white;font-weight:bold; }
    .kop-text h1 { font-size:16px;font-weight:800;color:#064E3B; }
    .kop-text p  { font-size:10px;color:#6b7280;margin-top:2px; }
    .kop-date { margin-left:auto;text-align:right; }
    .kop-date .date-label { font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase; }
    .kop-date .date-val   { font-size:13px;font-weight:700;color:#064E3B;margin-top:2px; }
    .truk-block { border:1.5px solid #e5e7eb;border-radius:12px;margin-bottom:18px;overflow:hidden; }
    .truk-header { background:#064E3B;color:white;padding:10px 16px;display:flex;align-items:center;gap:10px; }
    .truk-num { font-size:9px;font-weight:700;opacity:0.75;text-transform:uppercase; }
    .truk-plate { font-size:15px;font-weight:800;flex:1; }
    .badge-done { background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:3px 10px;font-size:9px;font-weight:700; }
    .truk-meta { padding:12px 16px;background:#fafafa;border-bottom:1px solid #f3f4f6; }
    .meta-row { display:flex;gap:20px;margin-bottom:10px; }
    .meta-item { display:flex;flex-direction:column;gap:2px; }
    .meta-label { font-size:8.5px;font-weight:700;color:#9ca3af;text-transform:uppercase; }
    .meta-val { font-size:12px;font-weight:700;color:#1f2937; }
    .meta-val.time { font-size:15px;font-weight:800;color:#064E3B; }
    .stats-row { display:flex;gap:10px; }
    .stat-box { flex:1;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid; }
    .stat-box.blue { background:#eff6ff;border-color:#bfdbfe; }
    .stat-box.purple { background:#faf5ff;border-color:#e9d5ff; }
    .stat-box.green { background:#f0fdf4;border-color:#bbf7d0; }
    .stat-val { font-size:13px;font-weight:800;color:#1f2937; }
    .stat-label { font-size:8px;font-weight:600;color:#9ca3af;text-transform:uppercase; }
    .rute-section { padding:12px 16px; }
    .rute-title { font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f3f4f6; }
    .rute-table { width:100%;border-collapse:collapse; }
    .rute-table th { background:#f9fafb;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;padding:6px 8px;border:1px solid #e5e7eb;text-align:left; }
    .rute-table td { padding:6px 8px;border:1px solid #f3f4f6;font-size:10px;color:#374151;vertical-align:middle; }
    .rute-table tr:nth-child(even) td { background:#fafafa; }
    .rute-table td.center { text-align:center;font-weight:700;width:36px; }
    .rute-table td.ket { font-size:9.5px;color:#6b7280; }
    .no-data { font-size:10px;color:#9ca3af;font-style:italic;padding:8px 0; }
    .footer { margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af; }
    .footer strong { color:#374151; }
  </style></head><body>
    <div class="kop">
      <div class="kop-logo">GIS</div>
      <div class="kop-text"><h1>Laporan Operasional Armada Pengangkut Sampah</h1><p>Sistem GIS Monitoring — Rekap Kegiatan Harian</p></div>
      <div class="kop-date"><div class="date-label">Tanggal Operasi</div><div class="date-val">${formatTanggalPendek(tanggal)}</div></div>
    </div>
    ${rows}
    <div class="footer">
      <span>Dicetak pada: <strong>${new Date().toLocaleString('id-ID')}</strong></span>
      <span>Sistem GIS Monitoring Armada — <strong>Laporan Resmi</strong></span>
    </div>
  </body></html>`;
}

async function exportToPDF(riwayatList: RiwayatSelesai[], tanggal: string): Promise<string> {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then((m) => m.default),
  ]);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;z-index:-9999;overflow:visible;';
  container.innerHTML = buildPDFHtml(riwayatList, tanggal);
  document.body.appendChild(container);
  try {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794, scrollX: 0, scrollY: 0, logging: false });
    const pageWidthMm = 210; const pageHeightMm = 297; const marginMm = 10;
    const contentWMm  = pageWidthMm - marginMm * 2;
    const contentHMm  = pageHeightMm - marginMm * 2;
    const totalImgHeightMm = (canvas.height * contentWMm) / canvas.width;
    const pageHeightPx = Math.floor((canvas.height * contentHMm) / totalImgHeightMm);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    let srcY = 0; let pageNum = 0;
    while (srcY < canvas.height) {
      if (pageNum > 0) pdf.addPage();
      const sliceH = Math.min(pageHeightPx, canvas.height - srcY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width; sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      const sliceHeightMm = (sliceH * contentWMm) / canvas.width;
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWMm, sliceHeightMm);
      srcY += sliceH; pageNum++;
    }
    const fileName = `Laporan_Armada_${tanggal}.pdf`;
    pdf.save(fileName);
    return fileName;
  } finally {
    document.body.removeChild(container);
  }
}

// ============================================================
// HOOK: Alert System
// ============================================================
function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const addAlert = useCallback((type: AlertType, title: string, message: string) => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    setAlerts((prev) => [...prev, { id, type, title, message, timestamp: new Date() }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 5000);
  }, []);
  const dismissAlert = useCallback((id: string) => { setAlerts((prev) => prev.filter((a) => a.id !== id)); }, []);
  return { alerts, addAlert, dismissAlert };
}

// ============================================================
// EXPORT MODAL
// ============================================================
function ExportModal({ isOpen, onClose, riwayatList, tanggal, onExportExcel, onExportPDF, isExporting }: {
  isOpen: boolean; onClose: () => void; riwayatList: RiwayatSelesai[]; tanggal: string;
  onExportExcel: () => void; onExportPDF: () => void; isExporting: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!isOpen || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#064E3B] to-emerald-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileDown size={22} />
              <div>
                <h3 className="font-bold text-base">Export Laporan</h3>
                <p className="text-emerald-200 text-xs mt-0.5">{formatTanggalPendek(tanggal)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {riwayatList.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Belum ada data riwayat untuk tanggal ini.</p>
            </div>
          )}
          <div className="space-y-3">
            <button onClick={onExportExcel} disabled={isExporting || riwayatList.length === 0}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"><FileSpreadsheet size={20} /></div>
              <div className="text-left flex-1">
                <p className="font-bold text-sm text-gray-900">Export ke Excel (.xlsx)</p>
                <p className="text-xs text-gray-500 mt-0.5">2 sheet: Ringkasan + Detail Rute lengkap per armada</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 shrink-0">.xlsx</span>
            </button>
            <button onClick={onExportPDF} disabled={isExporting || riwayatList.length === 0}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"><FileText size={20} /></div>
              <div className="text-left flex-1">
                <p className="font-bold text-sm text-gray-900">Export ke PDF</p>
                <p className="text-xs text-gray-500 mt-0.5">Download otomatis — laporan resmi multi-halaman A4</p>
              </div>
              <span className="text-xs font-bold text-blue-600 shrink-0">.pdf</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// RIWAYAT SELESAI CARD
// ============================================================
function RiwayatSelesaiCard({ riwayat }: { riwayat: RiwayatSelesai }) {
  const [expanded, setExpanded] = useState(false);
  const r = normalizeRingkasan(riwayat?.ringkasan);
  const waktuMulai   = r.waktuMulai   ? new Date(r.waktuMulai).toLocaleTimeString('id-ID',   { hour: '2-digit', minute: '2-digit' }) : '-';
  const waktuSelesai = r.waktuSelesai ? new Date(r.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${expanded ? 'border-emerald-200 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-4 flex items-center gap-3 text-left">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0">🚛</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-gray-900 text-sm tracking-wide">{riwayat?.plateNumber ?? '-'}</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wide">✓ Selesai</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <User size={9} className="text-gray-400 shrink-0" />
            {riwayat?.operatorName ?? '-'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {riwayat?.tanggal && (
            <span className="text-[10px] text-gray-400 font-medium hidden sm:block">{formatTanggalPendek(riwayat.tanggal)}</span>
          )}
          <div className={`p-1.5 rounded-lg transition-all ${expanded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="bg-gray-50 rounded-xl flex items-stretch divide-x divide-gray-200 overflow-hidden border border-gray-100">
            {[
              { icon: '📍', val: String(r.totalTitikLokasi),                                      lbl: 'Titik GPS', color: 'text-blue-600'   },
              { icon: '📏', val: r.jarakTempuhKm > 0 ? `${r.jarakTempuhKm.toFixed(1)} km` : '-', lbl: 'Jarak',     color: 'text-amber-600'  },
              { icon: '⏱️', val: formatDurasi(r.durasiKerjaMenit),                                lbl: 'Durasi',    color: 'text-purple-600' },
              { icon: '🕐', val: waktuMulai,                                                       lbl: 'Mulai',     color: 'text-gray-700'   },
              { icon: '🏁', val: waktuSelesai,                                                     lbl: 'Selesai',   color: 'text-gray-700'   },
            ].map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 gap-0.5">
                <span className="text-sm leading-none">{s.icon}</span>
                <span className={`text-xs font-black leading-tight mt-1 text-center ${s.color}`}>{s.val}</span>
                <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-wide leading-none">{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB TRACKING  (tidak berubah sama sekali)
// ============================================================
export function TabTracking({ addAlert }: { addAlert: (type: AlertType, title: string, msg: string) => void }) {
  const [trukAktifList, setTrukAktifList]       = useState<TrukAktif[]>([]);
  const [selectedTruk, setSelectedTruk]         = useState<TrukAktif | null>(null);
  const [MapComponents, setMapComponents]       = useState<any>(null);
  const [selectedDate, setSelectedDate]         = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData]           = useState<Record<string, HistoryEntry>>({});
  const [riwayatSelesai, setRiwayatSelesai]     = useState<RiwayatSelesai[]>([]);
  const [socketStatus, setSocketStatus]         = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [riwayatDate, setRiwayatDate]           = useState(new Date().toISOString().split('T')[0]);
  const [showExportModal, setShowExportModal]   = useState(false);
  const [isExporting, setIsExporting]           = useState(false);

  const mapRef    = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  const flyToTruck = useCallback((lat: number, lng: number) => {
    if (mapRef.current) mapRef.current.flyTo([lat, lng], 15, { duration: 1.2, easeLinearity: 0.5 });
  }, []);

  const handleSelectTruck = useCallback((truk: TrukAktif) => {
    if (selectedTruk?.id === truk.id) { setSelectedTruk(null); }
    else {
      setSelectedTruk(truk);
      if (truk.currentLat != null && truk.currentLong != null) flyToTruck(truk.currentLat, truk.currentLong);
    }
  }, [selectedTruk, flyToTruck]);

  const handleExportExcel = async () => {
    if (riwayatSelesai.length === 0) return;
    setIsExporting(true);
    try { await exportToExcel(riwayatSelesai, riwayatDate); setShowExportModal(false); }
    catch (err: any) { addAlert('error', 'Export Gagal', err.message || 'Terjadi kesalahan.'); }
    finally { setIsExporting(false); }
  };

  const handleExportPDF = async () => {
    if (riwayatSelesai.length === 0) return;
    setIsExporting(true);
    try { await exportToPDF(riwayatSelesai, riwayatDate); setShowExportModal(false); }
    catch (err: any) { addAlert('error', 'Export PDF Gagal', err.message || 'Terjadi kesalahan.'); }
    finally { setIsExporting(false); }
  };

  useEffect(() => {
    loadLeaflet();
    fetchTrukAktif();
    fetchRiwayatSelesai(riwayatDate);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect',       () => { setSocketStatus('connected'); });
    socket.on('disconnect',    () => { setSocketStatus('disconnected'); });
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    socket.on('truck_location_update', (data: {
      truckId: string; latitude: number; longitude: number; timestamp: string;
    }) => {
      setTrukAktifList((prev) =>
        prev.map((t) =>
          t.id === data.truckId
            ? { ...t, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp }
            : t
        )
      );
      setHistoryData((prev) => {
        const existing = prev[data.truckId];
        if (!existing) return prev;
        const titikBaru: TitikJalur = { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp };
        return {
          ...prev,
          [data.truckId]: {
            ...existing,
            jalur: [...existing.jalur, titikBaru],
            totalTitik: existing.jalur.length + 1,
            waktuSelesai: data.timestamp,
          },
        };
      });
      setSelectedTruk((prev) => {
        if (prev?.id === data.truckId) {
          const updated = { ...prev, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp };
          if (mapRef.current) mapRef.current.setView([data.latitude, data.longitude], mapRef.current.getZoom(), { animate: true });
          return updated;
        }
        return prev;
      });
    });

    socket.on('truck_status_update', (data: {
      truckId: string; status: string;
      plateNumber?: string; operatorName?: string; tanggal?: string; data?: any;
    }) => {
      if (data.status === 'AVAILABLE') {
        setTrukAktifList((prev) => {
          const trukYangSelesai = prev.find((t) => t.id === data.truckId);
          if (trukYangSelesai) {
            const ringkasan = normalizeRingkasan(data.data?.ringkasan);
            addAlert('info', 'Armada Selesai', `${trukYangSelesai.plateNumber} telah selesai beroperasi.`);
            setRiwayatSelesai((prevRiwayat) => [
              {
                trukId:       trukYangSelesai.id,
                plateNumber:  data.plateNumber  ?? trukYangSelesai.plateNumber,
                operatorName: data.operatorName ?? trukYangSelesai.operator?.fullName ?? '-',
                tanggal:      data.tanggal      ?? new Date().toISOString(),
                ringkasan,
                ruteJadwal:   trukYangSelesai.ruteHariIni ?? null,
                jalurDilalui: [],
              },
              ...prevRiwayat,
            ]);
          }
          return prev.filter((t) => t.id !== data.truckId);
        });
        setHistoryData((prev) => { const next = { ...prev }; delete next[data.truckId]; return next; });
        setSelectedTruk((prev) => (prev?.id === data.truckId ? null : prev));
      } else {
        fetchTrukAktif();
      }
    });

    return () => { socket.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (trukAktifList.length === 0) return;
    fetchAllHistory();
  }, [selectedDate, trukAktifList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRiwayatSelesai(riwayatDate); }, [riwayatDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTrukAktif = async () => {
    try {
      const res = await axios.get(`${API_URL}/tracking/truk-aktif`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, timeout: 10000,
      });
      if (res.data.success) {
        const semuaTruk = res.data.data as TrukAktif[];
        setTrukAktifList(semuaTruk);
        if (semuaTruk.length === 0) addAlert('info', 'Tidak Ada Armada', 'Belum ada armada yang memiliki jadwal hari ini.');
      } else { setTrukAktifList([]); }
    } catch { setTrukAktifList([]); addAlert('error', 'Gagal Memuat Armada', 'Tidak dapat terhubung ke server.'); }
  };

  const fetchRiwayatSelesai = async (tanggal: string) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await axios.get(`${API_URL}/tracking/riwayat-selesai?tanggal=${tanggal}`, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 10000,
      });
      if (res.data?.success && res.data?.data) {
        const data: RiwayatSelesai[] = (res.data.data as any[]).map((item: any) => ({
          trukId:       item.trukId || item.truckId || '',
          plateNumber:  item.plateNumber || '-',
          operatorName: item.operatorName || item.operator?.fullName || '-',
          tanggal:      item.tanggal || item.date || tanggal,
          ringkasan:    normalizeRingkasan(item.ringkasan ?? item),
          ruteJadwal:   item.ruteJadwal ?? item.ruteHariIni ?? item.rute ?? null,
          jalurDilalui: item.jalur ?? item.jalurDilalui ?? [],
        }));
        setRiwayatSelesai(data);
      }
    } catch (error) { console.warn('fetchRiwayatSelesai:', error); }
  };

  const fetchAllHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token    = localStorage.getItem('token');
      const promises = trukAktifList.map((truk) =>
        axios.get(`${API_URL}/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
        })
          .then((res) => ({ success: true, data: res.data?.data }))
          .catch(() => ({ success: false, data: null }))
      );
      const results  = await Promise.all(promises);
      const newData: Record<string, HistoryEntry> = {};
      results.forEach((result, idx) => {
        newData[trukAktifList[idx].id] = result.data
          ? {
              jalur:         result.data.jalur || [],
              jarakTotalKm:  result.data.jarakTotalKm  ?? 0,
              durasiMenit:   result.data.durasiMenit   ?? 0,
              totalTitik:    result.data.totalTitik    ?? 0,
              waktuMulai:    result.data.waktuMulai    || null,
              waktuSelesai:  result.data.waktuSelesai  || null,
              ruteJadwal:    result.data.ruteJadwal    || null,
            }
          : { jalur: [], jarakTotalKm: 0, durasiMenit: 0, totalTitik: 0, waktuMulai: null, waktuSelesai: null };
      });
      setHistoryData(newData);
    } catch { addAlert('error', 'Gagal Memuat Riwayat', 'Data riwayat perjalanan tidak dapat dimuat.'); }
    finally { setIsLoadingHistory(false); }
  };

  const loadLeaflet = async () => {
    try {
      await import('leaflet/dist/leaflet.css');
      const L = (await import('leaflet')).default;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = await import('react-leaflet');
      setMapComponents({ MapContainer, TileLayer, Marker, Popup, Polyline, useMap, L });
    } catch { addAlert('error', 'Gagal Memuat Peta', 'Library peta tidak dapat dimuat. Refresh halaman.'); }
  };

  if (!MapComponents)
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, L } = MapComponents;

  const MapController = ({ selectedTruk }: { selectedTruk: TrukAktif | null }) => {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    useEffect(() => {
      if (selectedTruk?.currentLat != null && selectedTruk?.currentLong != null)
        map.flyTo([selectedTruk.currentLat, selectedTruk.currentLong], 15, { duration: 1.2, easeLinearity: 0.5 });
    }, [selectedTruk?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };

  const getTrukIcon = (dipilih: boolean) => L.divIcon({
    html: `<div style="background:${dipilih ? '#059669' : '#3b82f6'};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 10px rgba(0,0,0,0.15)${dipilih ? ';outline:3px solid rgba(5,150,105,0.4)' : ''}">🚛</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16],
  });

  const getWaypointIcon = (label: string, isFirst: boolean, isLast: boolean, dilewati: boolean) => {
    let bgColor: string;
    if (dilewati) { bgColor = '#2563EB'; }
    else if (isFirst) { bgColor = '#3b82f6'; }
    else if (isLast) { bgColor = '#EF4444'; }
    else { bgColor = '#EF4444'; }
    return L.divIcon({
      html: `<div style="background:${bgColor};color:white;width:22px;height:22px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.2)${dilewati ? ';opacity:0.8' : ''}">${label}</div>`,
      className: '', iconSize: [22, 22], iconAnchor: [11, 11],
    });
  };

  return (
    <div className="space-y-6">
      <ExportModal
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        riwayatList={riwayatSelesai} tanggal={riwayatDate}
        onExportExcel={handleExportExcel} onExportPDF={handleExportPDF}
        isExporting={isExporting}
      />

      {/* Header Bar */}
{/* ── STAT CARDS TRACKING ─────────────────────────────── */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {/* Card 1 — Armada Aktif */}
  <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
    <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
      <Truck size={22} className="text-white" />
    </div>
    <div>
      <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Armada Aktif</p>
      <p className="text-3xl font-black text-white leading-none mt-0.5">
        {trukAktifList.length}
        <span className="text-sm font-semibold text-emerald-300 ml-1">unit</span>
      </p>
      <p className="text-[10px] text-emerald-300 mt-1">
        {trukAktifList.filter(t => t.status === 'BUSY').length} sedang beroperasi
      </p>
    </div>
  </div>

  {/* Card 2 — Total Jarak Hari Ini */}
  <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
    <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
      <Route size={22} className="text-white" />
    </div>
    <div>
      <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Total Jarak Hari Ini</p>
      <p className="text-3xl font-black text-white leading-none mt-0.5">
        {(
          Object.values(historyData).reduce((sum, e) => sum + (e.jarakTotalKm ?? 0), 0) +
          riwayatSelesai.reduce((sum, r) => sum + normalizeRingkasan(r.ringkasan).jarakTempuhKm, 0)
        ).toFixed(1)}
        <span className="text-sm font-semibold text-emerald-300 ml-1">km</span>
      </p>
      <p className="text-[10px] text-emerald-300 mt-1">
        Aktif + selesai hari ini
      </p>
    </div>
  </div>

  {/* Card 3 — Progress Riwayat */}
  <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl p-5 shadow-sm relative overflow-hidden">
    <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-white/5" />
    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-2">Selesai Hari Ini</p>
    <div className="flex items-end gap-2 mb-3">
      <p className="text-3xl font-black text-white leading-none">{riwayatSelesai.length}</p>
      <p className="text-sm text-emerald-300 mb-0.5 font-semibold">armada</p>
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-emerald-300 font-semibold">Progress operasional</span>
        <span className="text-white font-black">
          {trukAktifList.length + riwayatSelesai.length > 0
            ? Math.round((riwayatSelesai.length / (trukAktifList.length + riwayatSelesai.length)) * 100)
            : 0}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all duration-700"
          style={{
            width: `${trukAktifList.length + riwayatSelesai.length > 0
              ? (riwayatSelesai.length / (trukAktifList.length + riwayatSelesai.length)) * 100
              : 0}%`
          }} />
      </div>
    </div>
  </div>
</div>

{/* Header Bar */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"></div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '680px' }}>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1">
            <MapContainer center={[2.3333, 99.0632]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <MapController selectedTruk={selectedTruk} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {trukAktifList.map((truk) => {
                const entry  = historyData[truk.id];
                const jalur  = entry?.jalur || [];
                const rute   = entry?.ruteJadwal || truk.ruteHariIni;
                const dipilih = selectedTruk?.id === truk.id;
                return (
                  <span key={truk.id}>
                    {truk.currentLat != null && truk.currentLong != null && (
                      <Marker position={[truk.currentLat, truk.currentLong]} icon={getTrukIcon(dipilih)} eventHandlers={{ click: () => handleSelectTruck(truk) }}>
                        <Popup>
                          <div className="p-2 min-w-[180px]">
                            <p className="font-bold text-sm">{truk.plateNumber}</p>
                            <p className="text-xs text-gray-500 mb-1">{truk.operator?.fullName}</p>
                            {truk.lastPing && <p className="text-xs text-gray-400 mb-2">Update: {formatWaktu(truk.lastPing)}</p>}
                            <button onClick={() => window.open(`https://www.google.com/maps?q=${truk.currentLat},${truk.currentLong}`, '_blank')} className="mt-1 w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700">
                              📍 Google Maps
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {rute && rute.waypoints.length >= 2 && (
                      <>
                        {rute.waypoints.slice(0, -1).map((wp: Waypoint, idx: number) => {
                          const wpNext = rute.waypoints[idx + 1];
                          const segmenDilewati = isWaypointDilewati(wp, jalur) && isWaypointDilewati(wpNext, jalur);
                          return (
                            <Polyline key={`seg-${truk.id}-${idx}`} positions={[[wp.lat, wp.lng], [wpNext.lat, wpNext.lng]]} color={segmenDilewati ? '#2563EB' : '#EF4444'} weight={3} opacity={0.85} dashArray={segmenDilewati ? undefined : '8 6'} />
                          );
                        })}
                        {rute.waypoints.map((wp: Waypoint, idx: number) => {
                          const dilewati = isWaypointDilewati(wp, jalur);
                          return (
                            <Marker key={`wp-${truk.id}-${wp.urutan}`} position={[wp.lat, wp.lng]} icon={getWaypointIcon(String(wp.urutan), idx === 0, idx === rute.waypoints.length - 1, dilewati)}>
                              <Popup>
                                <p className="font-bold text-xs">{wp.nama}</p>
                                <p className="text-[10px] text-gray-500">Titik #{wp.urutan}</p>
                                <p className={`text-[10px] font-bold mt-1 ${dilewati ? 'text-blue-600' : 'text-red-500'}`}>{dilewati ? '✅ Sudah dilewati' : '⏳ Belum dilewati'}</p>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </>
                    )}
                    {jalur.length >= 2 && (
                      <>
                        <Polyline positions={jalur.map((t) => [t.lat, t.lng] as [number, number])} color="#93c5fd" weight={10} opacity={0.2} />
                        <Polyline positions={jalur.map((t) => [t.lat, t.lng] as [number, number])} color="#2563EB" weight={4} opacity={0.9} />
                      </>
                    )}
                  </span>
                );
              })}
            </MapContainer>
          </div>
          <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-4 items-center text-[10px] font-bold text-gray-600">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" />Truk Aktif</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />Terpilih</div>
            <div className="flex items-center gap-2">
              <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="6 4"/></svg>
              Rute Belum Dilewati
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#2563EB" strokeWidth="2.5"/></svg>
              Rute Sudah Dilewati / GPS
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-3 overflow-hidden h-full">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Armada Hari Ini</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black">{trukAktifList.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {trukAktifList.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-3xl mb-2">🚛</p>
                  <p className="text-xs text-gray-500 font-semibold">Tidak ada armada aktif</p>
                  <p className="text-[10px] text-gray-400 mt-1">Armada tampil saat ada jadwal hari ini</p>
                </div>
              ) : (
                <div className="space-y-1.5 p-3">
                  {trukAktifList.map((truk) => {
                    const entry   = historyData[truk.id];
                    const dipilih = selectedTruk?.id === truk.id;
                    const hasGPS  = truk.currentLat != null && truk.currentLong != null;
                    return (
                      <div key={truk.id} onClick={() => handleSelectTruck(truk)}
                        className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${dipilih ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="text-xl shrink-0">🚛</div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-gray-900 truncate">{truk.plateNumber}</p>
                            <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                              <User size={9} className="text-gray-400" />{truk.operator?.fullName || '-'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${truk.status === 'BUSY' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {truk.status === 'BUSY' ? '◆ Aktif' : '○ Standby'}
                            </span>
                            {truk.lastPing && <p className="text-[9px] text-gray-400 mt-0.5">{formatWaktu(truk.lastPing)}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          {hasGPS
                            ? <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />GPS Aktif</span>
                            : <span className="text-[9px] font-bold text-gray-400">GPS Tidak Aktif</span>
                          }
                        </div>
                        {entry && (
                          <div className="flex gap-3 mt-2 pt-2 border-t border-gray-200 text-[9px] font-bold">
                            <span className="text-blue-600">📍 {entry.jalur.length} titik</span>
                            {entry.jarakTotalKm > 0 && <span className="text-amber-600">📏 {entry.jarakTotalKm.toFixed(1)} km</span>}
                            {entry.durasiMenit > 0 && <span className="text-purple-600">⏱ {formatDurasi(entry.durasiMenit)}</span>}
                          </div>
                        )}
                        {dipilih && hasGPS && (
                          <p className="text-[9px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1"><MapPin size={9} />Peta diarahkan ke truk ini</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History size={20} className="text-emerald-600" />Riwayat Perjalanan Armada
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Armada yang telah selesai beroperasi — data lengkap operasional harian</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
              <Calendar size={14} className="text-gray-400" />
              <label className="text-xs font-bold text-gray-600">Tanggal:</label>
              <input type="date" value={riwayatDate} onChange={(e) => setRiwayatDate(e.target.value)} className="text-xs font-medium text-gray-700 outline-none bg-transparent" />
              <button onClick={() => fetchRiwayatSelesai(riwayatDate)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><RefreshCw size={13} /></button>
            </div>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#064E3B] hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95">
              <FileDown size={15} />Export Laporan
              {riwayatSelesai.length > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{riwayatSelesai.length}</span>
              )}
            </button>
          </div>
        </div>

        {riwayatSelesai.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-600 font-bold">Belum Ada Riwayat</p>
            <p className="text-sm text-gray-400 mt-1">Riwayat muncul otomatis ketika armada selesai beroperasi, atau pilih tanggal lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {riwayatSelesai.map((riwayat, idx) => (
              <RiwayatSelesaiCard key={`${riwayat?.trukId ?? idx}-${idx}`} riwayat={riwayat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB LAPORAN — REDESIGNED  ✨
// ============================================================

// ─── Status config ─────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',  color: '#EF4444',
    bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',   dot: 'bg-red-500',
  },
  DITINDAKLANJUTI: {
    label: 'Diproses', color: '#F59E0B',
    bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',
  },
  SELESAI: {
    label: 'Selesai',  color: '#10B981',
    bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status as StatusKey] ?? {
    label: status, color: '#6B7280',
    bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400',
  };
}

function buildMarkerHtml(status: string, isSelected: boolean) {
  const cfg  = getStatusCfg(status);
  const size = isSelected ? 22 : 16;
  const ring = isSelected
    ? `box-shadow:0 0 0 4px ${cfg.color}33,0 2px 8px rgba(0,0,0,0.25);`
    : 'box-shadow:0 2px 6px rgba(0,0,0,0.2);';
  return `<div style="background:${cfg.color};width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid white;transition:all 0.2s;${ring}"></div>`;
}

// ─── Donut chart mini ───────────────────────────────────────
function DonutChart({ pending, diproses, selesai, total }: {
  pending: number; diproses: number; selesai: number; total: number;
}) {
  if (total === 0)
    return <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-xs text-gray-400">0</span></div>;
  const r = 24; const cx = 32; const cy = 32; const circ = 2 * Math.PI * r;
  const pDash = circ * (pending  / total);
  const dDash = circ * (diproses / total);
  const sDash = circ * (selesai  / total);
  const dOff  = pDash;
  const sOff  = pDash + dDash;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
      {selesai  > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10B981" strokeWidth="8" strokeDasharray={`${sDash} ${circ - sDash}`} strokeDashoffset={-sOff}  transform="rotate(-90 32 32)" />}
      {diproses > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F59E0B" strokeWidth="8" strokeDasharray={`${dDash} ${circ - dDash}`} strokeDashoffset={-dOff}  transform="rotate(-90 32 32)" />}
      {pending  > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EF4444" strokeWidth="8" strokeDasharray={`${pDash} ${circ - pDash}`} strokeDashoffset={0}      transform="rotate(-90 32 32)" />}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#111827">{total}</text>
    </svg>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function TabLaporan({ addAlert }: { addAlert: (type: AlertType, title: string, msg: string) => void }) {
  const mapElRef      = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const LRef          = useRef<any>(null);
  
  const [mapElReady, setMapElReady]           = useState(false);       // ← TAMBAH INI
  const [mapInitialized, setMapInitialized]   = useState(false);  
  const [laporanList, setLaporanList]               = useState<any[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [selectedStatus, setSelectedStatus]         = useState('semua');
  const [selectedKecamatan, setSelectedKecamatan]   = useState('semua');
  const [kecamatanList, setKecamatanList]           = useState<string[]>([]);
  const [selectedLaporan, setSelectedLaporan]       = useState<any>(null);
  const [showDetail, setShowDetail]                 = useState(false);
  const [showFilter, setShowFilter]                 = useState(false);
  const [activeView, setActiveView]                 = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery]               = useState('');
  const [sortBy, setSortBy]                         = useState<'date' | 'status'>('date');

  // ── Init Leaflet ─────────────────────────────────────────
// ── Init Leaflet ─────────────────────────────────────────

const mapCallbackRef = useCallback((node: HTMLDivElement | null) => {
  if (node !== null) {
    setMapElReady(true);
    (mapCallbackRef as any)._node = node;
  } else {
    setMapElReady(false);
    (mapCallbackRef as any)._node = null;
  }
}, []);



// ── Init Leaflet — dipanggil ulang saat mapElReady berubah ──
useEffect(() => {
  if (!mapElReady) return; // tunggu DOM element siap dulu

  let cancelled = false;

  const init = async () => {
    try {
      await import('leaflet/dist/leaflet.css');
      const L = (await import('leaflet')).default;

      try { await import('leaflet.heat'); } catch {}

      if (cancelled) return;

      LRef.current = L;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // KUNCI: pakai _node dari mapCallbackRef, bukan mapElRef
      const node = (mapCallbackRef as any)._node as HTMLDivElement | null;
      if (!cancelled && node && !(node as any)._leaflet_id) {
        const map = L.map(node, { zoomControl: false }).setView([2.3333, 99.0632], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        leafletMapRef.current = map;
        setMapInitialized(true); // ← ini yang membuat loading overlay hilang
      }
    } catch (err) {
      console.error('Init peta gagal:', err);
      addAlert('error', 'Gagal Memuat Peta', 'Library peta tidak dapat dimuat.');
    }
  };

  init();

  return () => {
    cancelled = true;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      setMapInitialized(false);
    }
  };
}, [mapElReady]); // ← listen ke mapElReady bukan []

// ── Invalidate size saat tab peta aktif ──
useEffect(() => {
  if (activeView === 'map' && leafletMapRef.current && mapInitialized) {
    setTimeout(() => leafletMapRef.current?.invalidateSize(), 150);
  }
}, [activeView, mapInitialized]);



// ── Invalidate size saat activeView berubah ke 'map' ──
useEffect(() => {
  if (activeView === 'map' && leafletMapRef.current && mapInitialized) {
    setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 100);
  }
}, [activeView, mapInitialized]);


  // ── Fetch ────────────────────────────────────────────────
  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await axios.get(`${API_URL}/laporan`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      const data  = res.data?.data || res.data || [];
      setLaporanList(data);
      const kecs = Array.from(new Set(data.map((l: any) => l.location?.name).filter(Boolean))) as string[];
      setKecamatanList(kecs);
      if (data.length === 0) addAlert('info', 'Tidak Ada Laporan', 'Belum ada laporan sampah yang masuk.');
    } catch {
      addAlert('error', 'Gagal Memuat Laporan', 'Tidak dapat terhubung ke server.');
      setLaporanList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLaporan(); }, []); // eslint-disable-line

  // ── Markers ──────────────────────────────────────────────
  useEffect(() => {
    const L   = LRef.current;
    const map = leafletMapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const fil = laporanList.filter(
      (l) => (selectedStatus === 'semua' || l.status === selectedStatus) &&
             (selectedKecamatan === 'semua' || l.location?.name === selectedKecamatan)
    );

    fil.forEach((l) => {
      const lat = parseFloat(l.latitude); const lng = parseFloat(l.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;
      const isSelected = selectedLaporan?.id === l.id;
      const icon = L.divIcon({ html: buildMarkerHtml(l.status, isSelected), className: '', iconSize: [isSelected ? 22 : 16, isSelected ? 22 : 16], iconAnchor: [isSelected ? 11 : 8, isSelected ? 11 : 8] });
      const marker = L.marker([lat, lng], { icon }).addTo(map).on('click', () => { setSelectedLaporan(l); setShowDetail(true); map.flyTo([lat, lng], 15, { duration: 0.8 }); });
      markersRef.current.push(marker);
    });

      const heatPoints = fil.filter((l) => { const lat = parseFloat(l.latitude); const lng = parseFloat(l.longitude); return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0; })
        .map((l) => [parseFloat(l.latitude), parseFloat(l.longitude), 0.6]);
      if (heatPoints.length > 0 && (L as any).heatLayer) {
        try {
          const mapContainer = map.getContainer();
          if (mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0) {
            const heat = (L as any).heatLayer(heatPoints, { radius: 28, blur: 18, maxZoom: 12, gradient: { 0.2: '#34d399', 0.5: '#fbbf24', 0.8: '#f87171', 1.0: '#dc2626' } });
            heat.addTo(map); markersRef.current.push(heat);
          }
        } catch (e) {
          console.warn('Heatmap skip:', e);
        }
      }
    if (markersRef.current.length > 0) {
      try {
        const latLngs = fil.filter((l) => !isNaN(parseFloat(l.latitude)) && !isNaN(parseFloat(l.longitude))).map((l) => [parseFloat(l.latitude), parseFloat(l.longitude)] as [number, number]);
        if (latLngs.length > 0) map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      } catch {}
    }
  }, [laporanList, selectedStatus, selectedKecamatan, selectedLaporan]); // eslint-disable-line

  // ── Stats ────────────────────────────────────────────────
  const total     = laporanList.length;
  const pending   = laporanList.filter((l) => l.status === 'PENDING').length;
  const diproses  = laporanList.filter((l) => l.status === 'DITINDAKLANJUTI').length;
  const selesai   = laporanList.filter((l) => l.status === 'SELESAI').length;
  const resolRate = total > 0 ? Math.round((selesai / total) * 100) : 0;

  const filtered = laporanList
    .filter(
      (l) =>
        (selectedStatus === 'semua' || l.status === selectedStatus) &&
        (selectedKecamatan === 'semua' || l.location?.name === selectedKecamatan) &&
        (searchQuery === '' ||
          l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const order = { PENDING: 0, DITINDAKLANJUTI: 1, SELESAI: 2 };
      return (order[a.status as StatusKey] ?? 3) - (order[b.status as StatusKey] ?? 3);
    });

  const activeFilterCount = (selectedStatus !== 'semua' ? 1 : 0) + (selectedKecamatan !== 'semua' ? 1 : 0);

  return (
    <div className="space-y-4">

      {/* ── STAT CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-2">

        {/* Donut + list - BACKGROUND HIJAU */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl shadow-sm p-6 flex items-center gap-5">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            {selesai > 0 && (
              <circle cx="40" cy="40" r="32" fill="none" stroke="#34D399" strokeWidth="8" 
                strokeDasharray={`${(selesai / total) * 201} 201`} transform="rotate(-90 40 40)" />
            )}
            {diproses > 0 && (
              <circle cx="40" cy="40" r="32" fill="none" stroke="#FBBF24" strokeWidth="8" 
                strokeDasharray={`${(diproses / total) * 201} 201`} 
                strokeDashoffset={`-${(selesai / total) * 201}`} transform="rotate(-90 40 40)" />
            )}
            {pending > 0 && (
              <circle cx="40" cy="40" r="32" fill="none" stroke="#F87171" strokeWidth="8" 
                strokeDasharray={`${(pending / total) * 201} 201`} 
                strokeDashoffset={`-${((selesai + diproses) / total) * 201}`} transform="rotate(-90 40 40)" />
            )}
            <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="800" fill="white">{total}</text>
          </svg>
          
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-0.5">Total Laporan</p>
            <p className="text-3xl font-black text-white leading-none mb-3">{total}</p>
            <div className="space-y-2">
              {(['PENDING', 'DITINDAKLANJUTI', 'SELESAI'] as const).map((key) => {
                const cfg = getStatusCfg(key);
                const count = laporanList.filter((l) => l.status === key).length;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                    <span className="text-[11px] font-semibold text-emerald-200 flex-1">{cfg.label}</span>
                    <span className="text-[11px] font-black text-white">{count}</span>
                    <span className="text-[10px] text-emerald-300">({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress bars - BACKGROUND HIJAU */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Distribusi Status</p>
          {([
            { key: 'PENDING', val: pending, color: '#F87171' },
            { key: 'DITINDAKLANJUTI', val: diproses, color: '#FBBF24' },
            { key: 'SELESAI', val: selesai, color: '#34D399' },
          ] as const).map(({ key, val, color }) => (
            <button key={key} onClick={() => setSelectedStatus(selectedStatus === key ? 'semua' : key)}
              className="w-full transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[11px] font-bold text-emerald-200">{getStatusCfg(key).label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black text-white">{val}</span>
                  <span className="text-[10px] text-emerald-300">({total > 0 ? Math.round((val / total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${total > 0 ? (val / total) * 100 : 0}%`, background: color }} />
              </div>
            </button>
          ))}
        </div>

         {/* Resolution rate - BACKGROUND HIJAU (tetap) */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#065F46] rounded-2xl shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Resolution Rate</p>
            </div>
            <p className="text-5xl font-black text-white leading-none mb-1">{resolRate}<span className="text-2xl text-emerald-300">%</span></p>
            <p className="text-xs text-emerald-300 font-medium">{selesai} dari {total} laporan selesai</p>
          </div>
          <div className="relative mt-4">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${resolRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
              <button onClick={() => setActiveView('map')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeView === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                <MapIcon size={12} /> Peta
              </button>
              <button onClick={() => setActiveView('list')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeView === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                <BarChart3 size={12} /> Daftar
              </button>
            </div>

            {/* Filter button */}
            <button onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${showFilter ? 'bg-[#064E3B] text-white border-[#064E3B]' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
              <Filter size={12} />Filter
              {activeFilterCount > 0 && <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            {selectedKecamatan !== 'semua' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-100 text-blue-700 border-blue-200">
                <MapPin size={9} />{selectedKecamatan}
                <button onClick={() => setSelectedKecamatan('semua')}><X size={9} /></button>
              </span>
            )}
          </div>
          {/* Right side */}

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium hidden sm:block">{filtered.length} laporan</span>
            <button onClick={fetchLaporan} className={`p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all ${loading ? 'animate-spin text-emerald-500' : ''}`}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['semua', 'PENDING', 'DITINDAKLANJUTI', 'SELESAI'] as const).map((s) => {
                    const cfg    = s === 'semua' ? null : getStatusCfg(s);
                    const active = selectedStatus === s;
                    return (
                      <button key={s} onClick={() => setSelectedStatus(s)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                          active ? s === 'semua' ? 'bg-gray-800 text-white border-gray-800' : `${cfg?.badge} ${cfg?.border} border`
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}>
                        {s !== 'semua' && <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg?.dot : 'bg-gray-300'}`} />}
                        {s === 'semua' ? 'Semua' : cfg?.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block">Kecamatan</label>
                <select value={selectedKecamatan} onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-emerald-300">
                  <option value="semua">Semua Kecamatan</option>
                  {kecamatanList.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            {selectedKecamatan !== 'semua' && (
              <button onClick={() => setSelectedKecamatan('semua')}
                className="mt-2 text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                <X size={10} /> Reset filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MAP VIEW ────────────────────────────────────────── */}
     <div
  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
  style={{ height: 560, display: activeView === 'map' ? 'block' : 'none' }}
>
  {loading ? (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-500">Memuat data peta...</p>
      </div>
    </div>
  ) : (
    <div className="relative h-full">
      {/*
       * PENTING: div ini SELALU ada di DOM (tidak conditional),
       * sehingga Leaflet bisa membaca ukuran container dengan benar.
       */}
      <div ref={mapCallbackRef} className="h-full w-full" />

      {/* Loading overlay saat Leaflet belum siap */}
      {!mapInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-[1000]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-400">Memuat peta...</p>
          </div>
        </div>
      )}

    {/* Legend */}
<div className="absolute bottom-10 left-3 z-[999] bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-3 min-w-[120px]">
  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Legenda</p>
  {(Object.entries(STATUS_CONFIG) as [StatusKey, (typeof STATUS_CONFIG)[StatusKey]][]).map(([key, cfg]) => (
    <button key={key}
      onClick={() => setSelectedStatus(selectedStatus === key ? 'semua' : key)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all w-full text-left mb-1 last:mb-0 ${selectedStatus === key ? `${cfg.bg} ${cfg.border} border` : 'hover:bg-gray-50'}`}>
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      <span className="text-[10px] font-bold text-gray-700 flex-1">{cfg.label}</span>
      <span className="text-[10px] font-black" style={{ color: cfg.color }}>
        {laporanList.filter((l) => l.status === key).length}
      </span>
    </button>
  ))}
</div>

{/* Active count chip */}
<div className="absolute top-3 left-3 z-[999] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm px-3 py-1.5 flex items-center gap-2">
  <Activity size={12} className="text-emerald-500" />
  <span className="text-[10px] font-black text-gray-700">{filtered.length} titik ditampilkan</span>
  {selectedStatus !== 'semua' && (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getStatusCfg(selectedStatus).badge}`}>
      {getStatusCfg(selectedStatus).label}
    </span>
  )}
</div>

      {/* Empty overlay */}
      {filtered.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[998]">
          <div className="text-center p-6">
            <MapIcon size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-600 mb-1">Tidak ada laporan</p>
            <p className="text-xs text-gray-400 mb-3">Ubah filter untuk melihat data</p>
            <button
              onClick={() => { setSelectedStatus('semua'); setSelectedKecamatan('semua'); }}
              className="px-4 py-2 bg-[#064E3B] text-white rounded-xl text-xs font-bold">
              Reset Filter
            </button>
          </div>
        </div>
      )}
    </div>
  )}
      </div>
      {/* ── LIST VIEW ────────────────────────────────────────── */}
      {activeView === 'list' && (
        <div>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-36 bg-gray-100 rounded-xl mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-500 mb-1">Tidak ada laporan ditemukan</p>
              <p className="text-xs text-gray-400">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((l) => {
                const cfg = getStatusCfg(l.status);
                return (
                  <div key={l.id} onClick={() => { setSelectedLaporan(l); setShowDetail(true); }}
                    className="bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer overflow-hidden group">
                    <div className="h-36 bg-gray-100 relative overflow-hidden">
                      {l.photoUrl ? (
                        <img src={l.photoUrl} alt="Laporan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 gap-2">
                          <FileText size={28} className="text-gray-300" />
                          <span className="text-[10px] text-gray-300 font-medium">Tidak ada foto</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={12} className="text-gray-600" />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-3">{l.description || 'Tanpa deskripsi'}</p>
                      <div className="flex items-center gap-3 text-[10px] font-medium text-gray-400">
                        {l.location?.name && <span className="flex items-center gap-1"><MapPin size={9} className="shrink-0" /><span className="truncate">{l.location.name}</span></span>}
                        {l.createdAt && <span className="flex items-center gap-1 ml-auto shrink-0"><Calendar size={9} />{new Date(l.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-gray-400 font-medium mt-4">Menampilkan {filtered.length} dari {laporanList.length} laporan</p>
          )}
        </div>
      )}

      {/* ── DETAIL MODAL ─────────────────────────────────────── */}
      {showDetail && selectedLaporan && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden z-10">
            <div className="h-1 w-full" style={{ background: getStatusCfg(selectedLaporan.status).color }} />
            <div className="px-5 pt-4 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-emerald-600" />
                <h3 className="font-black text-gray-900 text-sm">Detail Laporan</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${getStatusCfg(selectedLaporan.status).badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusCfg(selectedLaporan.status).dot}`} />
                  {getStatusCfg(selectedLaporan.status).label}
                </span>
                <button onClick={() => setShowDetail(false)} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"><X size={13} /></button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[65vh]">
              {selectedLaporan.photoUrl && (
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img src={selectedLaporan.photoUrl} alt="Foto Laporan" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Deskripsi</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3">
                    {selectedLaporan.description || 'Tidak ada deskripsi'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {selectedLaporan.location?.name && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={8} /> Lokasi</p>
                      <p className="text-xs font-bold text-gray-800">{selectedLaporan.location.name}</p>
                    </div>
                  )}
                  {selectedLaporan.createdAt && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={8} /> Tanggal</p>
                      <p className="text-xs font-bold text-gray-800">{new Date(selectedLaporan.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  {selectedLaporan.user?.fullName && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 col-span-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={8} /> Pelapor</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[9px] font-black text-emerald-700 shrink-0">
                          {selectedLaporan.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-gray-800">{selectedLaporan.user.fullName}</p>
                      </div>
                    </div>
                  )}
                  {selectedLaporan.jenisSampah && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 col-span-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={8} /> Jenis Sampah</p>
                      <p className="text-xs font-bold text-emerald-700">{selectedLaporan.jenisSampah}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowDetail(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Tutup</button>
              {selectedLaporan.latitude && selectedLaporan.longitude && (
                <button onClick={() => window.open(`https://www.google.com/maps?q=${selectedLaporan.latitude},${selectedLaporan.longitude}`, '_blank')}
                  className="flex-1 py-2.5 bg-[#064E3B] text-white rounded-xl text-xs font-black hover:bg-emerald-800 transition-all flex items-center justify-center gap-2">
                  <MapPin size={13} /> Buka di Maps <ArrowUpRight size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT  (tidak berubah)
// ============================================================
export default function PetaSampah() {
  const [activeTab, setActiveTab] = useState<'tracking' | 'laporan'>('tracking');
  const { alerts, addAlert, dismissAlert } = useAlerts();

  return (
    <>
      <AlertContainer alerts={alerts} onDismiss={dismissAlert} />
      <div className="max-w-7xl mx-auto space-y-8 p-4">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sistem GIS Monitoring</h1>
            <p className="text-gray-500 flex items-center gap-2 text-sm">
              <Navigation size={16} />
              Pantau pergerakan armada &amp; titik sampah secara real-time.
            </p>
          </div>
          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex gap-2">
            <button onClick={() => setActiveTab('tracking')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'tracking' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
              <Truck size={18} />Tracking Armada
            </button>
            <button onClick={() => setActiveTab('laporan')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'laporan' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
              <MapIcon size={18} />Laporan Sampah
            </button>
          </div>
        </div>

      <div style={{ display: activeTab === 'tracking' ? 'block' : 'none' }}>
        <TabTracking addAlert={addAlert} />
      </div>
      <div style={{ display: activeTab === 'laporan' ? 'block' : 'none' }}>
        <TabLaporan addAlert={addAlert} />
      </div>
      </div>
    </>
  );
}