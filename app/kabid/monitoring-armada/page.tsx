'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  Truck, MapPin, RefreshCw, Activity, Gauge, TrendingUp, Compass, User,
  AlertCircle, X, History, Calendar, FileDown, FileSpreadsheet, FileText,
  Clock, Route, ChevronDown, Navigation,
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
  totalTitik: number; waktuMulai: string | null; waktuSelesai: string | null;
  ruteJadwal?: RuteHariIni | null;
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
// CONSTANTS & HELPERS
// ============================================================
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = rawBase ? rawBase.replace(/\/$/, '') + '/api' : '/api';
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
    totalTitikLokasi: raw.totalTitikLokasi ?? raw.totalTitik ?? 0,
    jarakTempuhKm:    raw.jarakTempuhKm    ?? raw.jarakTotalKm ?? 0,
    durasiKerjaMenit: raw.durasiKerjaMenit ?? raw.durasiMenit ?? 0,
    durasiKerjaJam:   raw.durasiKerjaJam   ?? Math.floor((raw.durasiKerjaMenit ?? raw.durasiMenit ?? 0) / 60),
    waktuMulai:       raw.waktuMulai ?? null,
    waktuSelesai:     raw.waktuSelesai ?? null,
  };
}
function hitungJarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isWaypointDilewati(waypoint: Waypoint, jalur: TitikJalur[]): boolean {
  return jalur.some((titik) => hitungJarakMeter(waypoint.lat, waypoint.lng, titik.lat, titik.lng) <= WAYPOINT_PASSED_RADIUS_M);
}

// ============================================================
// ALERT SYSTEM
// ============================================================
type AlertType = 'success' | 'error' | 'warning' | 'info';
interface AlertItem { id: string; type: AlertType; title: string; message: string; }

function AlertContainer({ alerts, onDismiss }: { alerts: AlertItem[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) return null;
  const colors: Record<AlertType, { bg: string; border: string; icon: string; title: string }> = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '✅', title: 'text-emerald-800' },
    error:   { bg: 'bg-red-50',     border: 'border-red-300',     icon: '❌', title: 'text-red-800' },
    warning: { bg: 'bg-amber-50',   border: 'border-amber-300',   icon: '⚠️', title: 'text-amber-800' },
    info:    { bg: 'bg-blue-50',    border: 'border-blue-300',    icon: 'ℹ️', title: 'text-blue-800' },
  };
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => {
        const c = colors[alert.type];
        return (
          <div key={alert.id} className={`${c.bg} ${c.border} border rounded-xl p-4 shadow-lg pointer-events-auto flex items-start gap-3`}>
            <span className="text-lg shrink-0">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${c.title}`}>{alert.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
            </div>
            <button onClick={() => onDismiss(alert.id)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const addAlert = useCallback((type: AlertType, title: string, message: string) => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    setAlerts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 5000);
  }, []);
  const dismissAlert = useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);
  return { alerts, addAlert, dismissAlert };
}

// ============================================================
// EXPORT UTILITIES
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
    const durasi = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)}j ${ring.durasiKerjaMenit % 60}m` : '-';
    summaryRows.push([
      i + 1, r.plateNumber, r.operatorName,
      ring.waktuMulai   ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID',   { hour: '2-digit', minute: '2-digit' }) : '-',
      ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      durasi,
      ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0',
      ring.totalTitikLokasi,
      r.ruteJadwal?.waypoints?.length ?? 0,
    ]);
  });
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 4 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  const detailRows: any[][] = [['DETAIL RUTE OPERASIONAL ARMADA'], [`Tanggal: ${formatTanggal(tanggal)}`], ['']];
  riwayatList.forEach((r, i) => {
    const ring = normalizeRingkasan(r.ringkasan);
    const durasi = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)} jam ${ring.durasiKerjaMenit % 60} menit` : '-';
    detailRows.push([`── ARMADA ${i + 1}: ${r.plateNumber} ──`]);
    detailRows.push(['Operator:', r.operatorName]);
    detailRows.push(['Mulai:', ring.waktuMulai ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-', 'Selesai:', ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-']);
    detailRows.push(['Durasi:', durasi]);
    detailRows.push(['Jarak:', `${ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0'} km`]);
    detailRows.push(['Titik GPS:', ring.totalTitikLokasi]);
    detailRows.push(['']);
    const rute = r.ruteJadwal ?? null;
    if (rute?.waypoints?.length) {
      detailRows.push(['  RUTE:']);
      detailRows.push(['  No.', '  Nama Lokasi', '  Keterangan']);
      rute.waypoints.forEach((wp: Waypoint, idx: number) => {
        const ket = idx === 0 ? 'START' : idx === rute.waypoints.length - 1 ? 'END' : `Titik ${idx}`;
        detailRows.push([`  ${wp.urutan}.`, `  ${wp.nama}`, `  ${ket}`]);
      });
    }
    detailRows.push(['']);
  });
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 22 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Rute');
  const fileName = `Laporan_Armada_${tanggal}.xlsx`;
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fileName;
}

function buildPDFHtml(riwayatList: RiwayatSelesai[], tanggal: string): string {
  const rows = riwayatList.map((r, i) => {
    const ring = normalizeRingkasan(r.ringkasan);
    const durasi = ring.durasiKerjaMenit > 0 ? `${Math.floor(ring.durasiKerjaMenit / 60)}j ${ring.durasiKerjaMenit % 60}m` : '-';
    const mulai = ring.waktuMulai ? new Date(ring.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const selesai = ring.waktuSelesai ? new Date(ring.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const waypoints = r.ruteJadwal?.waypoints ?? [];
    const ruteHtml = waypoints.length > 0
      ? `<table class="rute-table"><thead><tr><th>No</th><th>Nama Lokasi</th><th>Keterangan</th></tr></thead><tbody>
          ${waypoints.map((wp: Waypoint, idx: number) => {
            const ket = idx === 0 ? 'START' : idx === waypoints.length - 1 ? 'END' : `Titik ${idx}`;
            return `<tr><td class="center">${wp.urutan}</td><td><strong>${wp.nama}</strong></td><td class="ket">${ket}</td></tr>`;
          }).join('')}</tbody></table>`
      : '<p class="no-data">Data rute tidak tersedia</p>';
    return `
      <div class="truk-block">
        <div class="truk-header">
          <span class="truk-num">Armada ${i + 1}</span>
          <span class="truk-plate">${r.plateNumber}</span>
          <span class="badge-done">Selesai</span>
        </div>
        <div class="truk-meta">
          <div class="meta-row">
            <div class="meta-item"><span class="meta-label">Operator</span><span class="meta-val">${r.operatorName}</span></div>
            <div class="meta-item"><span class="meta-label">Mulai</span><span class="meta-val time">${mulai}</span></div>
            <div class="meta-item"><span class="meta-label">Selesai</span><span class="meta-val time">${selesai}</span></div>
          </div>
          <div class="stats-row">
            <div class="stat-box blue"><span class="stat-val">${ring.jarakTempuhKm > 0 ? ring.jarakTempuhKm.toFixed(2) : '0'} km</span><span class="stat-label">Jarak</span></div>
            <div class="stat-box purple"><span class="stat-val">${durasi}</span><span class="stat-label">Durasi</span></div>
            <div class="stat-box green"><span class="stat-val">${ring.totalTitikLokasi}</span><span class="stat-label">Titik GPS</span></div>
          </div>
        </div>
        <div class="rute-section"><div class="rute-title">Rute${r.ruteJadwal?.namaHari ? ` — ${r.ruteJadwal.namaHari}` : ''}</div>${ruteHtml}</div>
      </div>`;
  }).join('');
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>Laporan Armada ${tanggal}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff;padding:24px 32px;width:794px}
    .kop{border-bottom:3px solid #064E3B;padding-bottom:14px;margin-bottom:20px;display:flex;align-items:flex-start;gap:16px}
    .kop-logo{width:52px;height:52px;background:#064E3B;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;color:white;font-weight:bold}
    .kop-text h1{font-size:16px;font-weight:800;color:#064E3B}.kop-text p{font-size:10px;color:#6b7280;margin-top:2px}
    .kop-date{margin-left:auto;text-align:right}.kop-date .date-label{font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase}
    .kop-date .date-val{font-size:13px;font-weight:700;color:#064E3B;margin-top:2px}
    .truk-block{border:1.5px solid #e5e7eb;border-radius:12px;margin-bottom:18px;overflow:hidden}
    .truk-header{background:#064E3B;color:white;padding:10px 16px;display:flex;align-items:center;gap:10px}
    .truk-num{font-size:9px;font-weight:700;opacity:.75;text-transform:uppercase}.truk-plate{font-size:15px;font-weight:800;flex:1}
    .badge-done{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:3px 10px;font-size:9px;font-weight:700}
    .truk-meta{padding:12px 16px;background:#fafafa;border-bottom:1px solid #f3f4f6}.meta-row{display:flex;gap:20px;margin-bottom:10px}
    .meta-item{display:flex;flex-direction:column;gap:2px}.meta-label{font-size:8.5px;font-weight:700;color:#9ca3af;text-transform:uppercase}
    .meta-val{font-size:12px;font-weight:700;color:#1f2937}.meta-val.time{font-size:15px;font-weight:800;color:#064E3B}
    .stats-row{display:flex;gap:10px}.stat-box{flex:1;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid}
    .stat-box.blue{background:#eff6ff;border-color:#bfdbfe}.stat-box.purple{background:#faf5ff;border-color:#e9d5ff}.stat-box.green{background:#f0fdf4;border-color:#bbf7d0}
    .stat-val{font-size:13px;font-weight:800;color:#1f2937}.stat-label{font-size:8px;font-weight:600;color:#9ca3af;text-transform:uppercase}
    .rute-section{padding:12px 16px}.rute-title{font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f3f4f6}
    .rute-table{width:100%;border-collapse:collapse}.rute-table th{background:#f9fafb;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;padding:6px 8px;border:1px solid #e5e7eb;text-align:left}
    .rute-table td{padding:6px 8px;border:1px solid #f3f4f6;font-size:10px;color:#374151}.rute-table tr:nth-child(even) td{background:#fafafa}
    .rute-table td.center{text-align:center;font-weight:700;width:36px}.rute-table td.ket{font-size:9.5px;color:#6b7280}
    .no-data{font-size:10px;color:#9ca3af;font-style:italic;padding:8px 0}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
  </style></head><body>
    <div class="kop">
      <div class="kop-logo">GIS</div>
      <div class="kop-text"><h1>Laporan Operasional Armada Pengangkut Sampah</h1><p>Sistem GIS Monitoring — Rekap Kegiatan Harian</p></div>
      <div class="kop-date"><div class="date-label">Tanggal Operasi</div><div class="date-val">${formatTanggalPendek(tanggal)}</div></div>
    </div>
    ${rows}
    <div class="footer"><span>Dicetak: <strong>${new Date().toLocaleString('id-ID')}</strong></span><span>Sistem GIS Monitoring — <strong>Laporan Resmi</strong></span></div>
  </body></html>`;
}

async function exportToPDF(riwayatList: RiwayatSelesai[], tanggal: string): Promise<string> {
  const [{ jsPDF }, html2canvas] = await Promise.all([import('jspdf'), import('html2canvas').then((m) => m.default)]);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;z-index:-9999;';
  container.innerHTML = buildPDFHtml(riwayatList, tanggal);
  document.body.appendChild(container);
  try {
    await new Promise((r) => setTimeout(r, 600));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794 });
    const pageW = 210; const pageH = 297; const margin = 10;
    const cW = pageW - margin * 2; const cH = pageH - margin * 2;
    const totalH = (canvas.height * cW) / canvas.width;
    const pageHpx = Math.floor((canvas.height * cH) / totalH);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    let srcY = 0; let pg = 0;
    while (srcY < canvas.height) {
      if (pg > 0) pdf.addPage();
      const sliceH = Math.min(pageHpx, canvas.height - srcY);
      const sc = document.createElement('canvas'); sc.width = canvas.width; sc.height = sliceH;
      const ctx = sc.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sc.width, sc.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      pdf.addImage(sc.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, cW, (sliceH * cW) / canvas.width);
      srcY += sliceH; pg++;
    }
    const fileName = `Laporan_Armada_${tanggal}.pdf`; pdf.save(fileName); return fileName;
  } finally { document.body.removeChild(container); }
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
                <p className="text-xs text-gray-500 mt-0.5">2 sheet: Ringkasan + Detail Rute lengkap</p>
              </div>
              <span className="text-xs font-bold text-emerald-600">.xlsx</span>
            </button>
            <button onClick={onExportPDF} disabled={isExporting || riwayatList.length === 0}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"><FileText size={20} /></div>
              <div className="text-left flex-1">
                <p className="font-bold text-sm text-gray-900">Export ke PDF</p>
                <p className="text-xs text-gray-500 mt-0.5">Laporan resmi multi-halaman A4</p>
              </div>
              <span className="text-xs font-bold text-blue-600">.pdf</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// RIWAYAT CARD
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
            <User size={9} className="text-gray-400 shrink-0" />{riwayat?.operatorName ?? '-'}
          </p>
        </div>
        <div className={`p-1.5 rounded-lg transition-all ${expanded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
          <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="bg-gray-50 rounded-xl flex items-stretch divide-x divide-gray-200 overflow-hidden border border-gray-100">
            {[
              { icon: '📍', val: String(r.totalTitikLokasi), lbl: 'Titik GPS', color: 'text-blue-600' },
              { icon: '📏', val: r.jarakTempuhKm > 0 ? `${r.jarakTempuhKm.toFixed(1)} km` : '-', lbl: 'Jarak', color: 'text-amber-600' },
              { icon: '⏱️', val: formatDurasi(r.durasiKerjaMenit), lbl: 'Durasi', color: 'text-purple-600' },
              { icon: '🕐', val: waktuMulai, lbl: 'Mulai', color: 'text-gray-700' },
              { icon: '🏁', val: waktuSelesai, lbl: 'Selesai', color: 'text-gray-700' },
            ].map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 gap-0.5">
                <span className="text-sm leading-none">{s.icon}</span>
                <span className={`text-xs font-black leading-tight mt-1 text-center ${s.color}`}>{s.val}</span>
                <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-wide leading-none">{s.lbl}</span>
              </div>
            ))}
          </div>
          {/* Daftar rute waypoints */}
          {riwayat.ruteJadwal?.waypoints && riwayat.ruteJadwal.waypoints.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Rute yang Dilalui</p>
              <div className="space-y-1">
                {riwayat.ruteJadwal.waypoints.map((wp, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${idx === 0 ? 'bg-emerald-500' : idx === riwayat.ruteJadwal!.waypoints.length - 1 ? 'bg-red-500' : 'bg-blue-500'}`}>{wp.urutan}</span>
                    <span className="text-gray-700 font-medium truncate">{wp.nama}</span>
                    {idx === 0 && <span className="text-[9px] text-emerald-600 font-bold shrink-0">START</span>}
                    {idx === riwayat.ruteJadwal!.waypoints.length - 1 && <span className="text-[9px] text-red-500 font-bold shrink-0">END</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MonitoringArmada() {
  const [trukAktifList, setTrukAktifList]       = useState<TrukAktif[]>([]);
  const [selectedTruk, setSelectedTruk]         = useState<TrukAktif | null>(null);
  const [MapComponents, setMapComponents]       = useState<any>(null);
  const [selectedDate, setSelectedDate]         = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData]           = useState<Record<string, HistoryEntry>>({});
  const [riwayatSelesai, setRiwayatSelesai]     = useState<RiwayatSelesai[]>([]);
  const [riwayatDate, setRiwayatDate]           = useState(new Date().toISOString().split('T')[0]);
  const [showExportModal, setShowExportModal]   = useState(false);
  const [isExporting, setIsExporting]           = useState(false);
  const [socketStatus, setSocketStatus]         = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [statistik, setStatistik]               = useState<any>({});

  const { alerts, addAlert, dismissAlert } = useAlerts();
  const mapRef    = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // ─── Fly to truck ──────────────────────────────────────
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

  // ─── Export handlers ───────────────────────────────────
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

  // ─── Init: Leaflet + Socket + Fetch ────────────────────
  useEffect(() => {
    loadLeaflet();
    fetchTrukAktif();
    fetchRiwayatSelesai(riwayatDate);
    fetchStatistik();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;
    socket.on('connect',       () => setSocketStatus('connected'));
    socket.on('disconnect',    () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    socket.on('truck_location_update', (data: { truckId: string; latitude: number; longitude: number; timestamp: string }) => {
      setTrukAktifList((prev) =>
        prev.map((t) => t.id === data.truckId ? { ...t, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp } : t)
      );
      setHistoryData((prev) => {
        const existing = prev[data.truckId];
        if (!existing) return prev;
        const titikBaru: TitikJalur = { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp };
        return { ...prev, [data.truckId]: { ...existing, jalur: [...existing.jalur, titikBaru], totalTitik: existing.jalur.length + 1, waktuSelesai: data.timestamp } };
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

    socket.on('truck_status_update', (data: { truckId: string; status: string; plateNumber?: string; operatorName?: string; tanggal?: string; data?: any }) => {
      if (data.status === 'AVAILABLE') {
        setTrukAktifList((prev) => {
          const trukYangSelesai = prev.find((t) => t.id === data.truckId);
          if (trukYangSelesai) {
            const ringkasan = normalizeRingkasan(data.data?.ringkasan);
            addAlert('info', 'Armada Selesai', `${trukYangSelesai.plateNumber} telah selesai beroperasi.`);
            setRiwayatSelesai((prevRiwayat) => [{
              trukId: trukYangSelesai.id,
              plateNumber:  data.plateNumber  ?? trukYangSelesai.plateNumber,
              operatorName: data.operatorName ?? trukYangSelesai.operator?.fullName ?? '-',
              tanggal:      data.tanggal      ?? new Date().toISOString(),
              ringkasan, ruteJadwal: trukYangSelesai.ruteHariIni ?? null, jalurDilalui: [],
            }, ...prevRiwayat]);
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
  }, []); // eslint-disable-line

  useEffect(() => {
    if (trukAktifList.length === 0) return;
    fetchAllHistory();
  }, [selectedDate, trukAktifList.length]); // eslint-disable-line

  useEffect(() => { fetchRiwayatSelesai(riwayatDate); }, [riwayatDate]); // eslint-disable-line

  // ─── Fetch functions ───────────────────────────────────
  const fetchTrukAktif = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tracking/truk-aktif`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      if (res.data.success) setTrukAktifList(res.data.data as TrukAktif[]);
      else setTrukAktifList([]);
    } catch { setTrukAktifList([]); addAlert('error', 'Gagal Memuat Armada', 'Tidak dapat terhubung ke server.'); }
  };

  const fetchStatistik = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/kabid/monitoring-armada`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      if (res.data?.data?.statistik) setStatistik(res.data.data.statistik);
    } catch { /* silent */ }
  };

  const fetchRiwayatSelesai = async (tanggal: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tracking/riwayat-selesai?tanggal=${tanggal}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
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
      const token = localStorage.getItem('token');
      const promises = trukAktifList.map((truk) =>
        axios.get(`${API_URL}/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 })
          .then((res) => ({ success: true, data: res.data?.data }))
          .catch(() => ({ success: false, data: null }))
      );
      const results = await Promise.all(promises);
      const newData: Record<string, HistoryEntry> = {};
      results.forEach((result, idx) => {
        newData[trukAktifList[idx].id] = result.data
          ? { jalur: result.data.jalur || [], jarakTotalKm: result.data.jarakTotalKm ?? 0, durasiMenit: result.data.durasiMenit ?? 0, totalTitik: result.data.totalTitik ?? 0, waktuMulai: result.data.waktuMulai || null, waktuSelesai: result.data.waktuSelesai || null, ruteJadwal: result.data.ruteJadwal || null }
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

  // ─── Stats derived ─────────────────────────────────────
  const totalJarakHariIni = (
    Object.values(historyData).reduce((sum, e) => sum + (e.jarakTotalKm ?? 0), 0) +
    riwayatSelesai.reduce((sum, r) => sum + normalizeRingkasan(r.ringkasan).jarakTempuhKm, 0)
  ).toFixed(1);
  const progressPct = trukAktifList.length + riwayatSelesai.length > 0
    ? Math.round((riwayatSelesai.length / (trukAktifList.length + riwayatSelesai.length)) * 100) : 0;

  // ─── Loading state ─────────────────────────────────────
  if (!MapComponents)
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-400 animate-pulse">Menghubungkan ke satelit GPS armada...</p>
      </div>
    );

  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, L } = MapComponents;

  const MapController = ({ selectedTruk }: { selectedTruk: TrukAktif | null }) => {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    useEffect(() => {
      if (selectedTruk?.currentLat != null && selectedTruk?.currentLong != null)
        map.flyTo([selectedTruk.currentLat, selectedTruk.currentLong], 15, { duration: 1.2, easeLinearity: 0.5 });
    }, [selectedTruk?.id]); // eslint-disable-line
    return null;
  };

  const getTrukIcon = (dipilih: boolean) => L.divIcon({
    html: `<div style="background:${dipilih ? '#059669' : '#3b82f6'};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 10px rgba(0,0,0,0.15)${dipilih ? ';outline:3px solid rgba(5,150,105,0.4)' : ''}">🚛</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16],
  });

  const getWaypointIcon = (label: string, isFirst: boolean, isLast: boolean, dilewati: boolean) => {
    const bgColor = dilewati ? '#2563EB' : isFirst ? '#3b82f6' : '#EF4444';
    return L.divIcon({
      html: `<div style="background:${bgColor};color:white;width:22px;height:22px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.2)${dilewati ? ';opacity:0.8' : ''}">${label}</div>`,
      className: '', iconSize: [22, 22], iconAnchor: [11, 11],
    });
  };

  return (
    <>
      <AlertContainer alerts={alerts} onDismiss={dismissAlert} />
      <ExportModal
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        riwayatList={riwayatSelesai} tanggal={riwayatDate}
        onExportExcel={handleExportExcel} onExportPDF={handleExportPDF}
        isExporting={isExporting}
      />

      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">

        {/* ── HEADER ──────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 mb-2 shadow-sm">
              <Compass size={12} /> Real-Time Fleet Management
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">Monitoring Armada</h1>
            <p className="text-[#5B7078] text-sm mt-1 font-medium">Live tracking GPS, rute harian, dan rekap operasional armada pengangkut sampah.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Socket status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${socketStatus === 'connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : socketStatus === 'connecting' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : socketStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
              {socketStatus === 'connected' ? 'Live' : socketStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
            </div>
            <button onClick={() => { fetchTrukAktif(); fetchStatistik(); }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#064E3B] text-white text-xs font-bold rounded-xl hover:bg-[#053f30] transition-all shadow-md active:scale-95">
              <RefreshCw size={14} />Segarkan Data
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Armada Bertugas', value: trukAktifList.length, sub: `${trukAktifList.filter(t => t.status === 'BUSY').length} sedang aktif`, icon: Truck, color: 'border-blue-500', iconBg: 'bg-blue-50 text-blue-600' },
            { label: 'Total Jarak Hari Ini', value: `${totalJarakHariIni} km`, sub: 'Aktif + selesai', icon: Route, color: 'border-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600' },
            { label: 'Selesai Beroperasi', value: riwayatSelesai.length, sub: `Progress ${progressPct}%`, icon: Activity, color: 'border-purple-500', iconBg: 'bg-purple-50 text-purple-600' },
            { label: 'Total Perjalanan', value: statistik.totalPerjalananHariIni || '-', sub: 'Hari ini', icon: TrendingUp, color: 'border-amber-500', iconBg: 'bg-amber-50 text-amber-600' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className={`bg-white rounded-2xl p-4 md:p-5 border border-gray-100 border-l-[5px] ${stat.color} shadow-sm flex items-center justify-between hover:shadow-md transition-all`}>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide leading-none">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 font-mono leading-none pt-1">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MAP + SIDEBAR ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '680px' }}>
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <h2 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="text-emerald-600" size={16} />
                  Live Tracking Map
                </h2>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{trukAktifList.length} armada bertugas hari ini</span>
            </div>
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
                              <button onClick={() => window.open(`https://www.google.com/maps?q=${truk.currentLat},${truk.currentLong}`, '_blank')} className="w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700">
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
            {/* Map legend */}
            <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-4 items-center text-[10px] font-bold text-gray-600 shrink-0">
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

          {/* Sidebar — Daftar armada bertugas */}
          <div className="lg:col-span-1 flex flex-col gap-3 overflow-hidden h-full">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Truck size={15} className="text-emerald-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Status Armada Hari Ini</h3>
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black">{trukAktifList.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {trukAktifList.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-3xl mb-2">🚛</p>
                    <p className="text-xs text-gray-500 font-semibold">Tidak ada armada bertugas</p>
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
                          {/* Supir info */}
                          {truk.operator && (
                            <div className="mt-1.5 flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-100">
                              <User size={9} className="text-emerald-500 shrink-0" />
                              <span className="text-[9px] font-bold text-gray-600 truncate">{truk.operator.fullName}</span>
                              {truk.operator.phoneNumber && <span className="text-[9px] text-gray-400 ml-auto shrink-0">{truk.operator.phoneNumber}</span>}
                            </div>
                          )}
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

        {/* ── RIWAYAT SELESAI ───────────────────────────────── */}
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
    </>
  );
}