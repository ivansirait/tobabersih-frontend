"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import {
  Plus,
  Trash2,
  Edit3,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Save,
  X,
  Navigation,
  Truck,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Info,
  Power,
  PowerOff,
  Route,
  Search,
  Loader2,
  Eye,
  GripVertical,
  Clock,
  Tag,
  Wand2,
  Ruler,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "../components/AlertDialog";

/* ════════════════════════════════════════════════════════════════════════
 * 1. TYPES
 * ════════════════════════════════════════════════════════════════════════ */

interface Waypoint {
  id: string;
  routeId: string;
  order: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface RouteTemplate {
  id: string;
  truckId: string;
  locationId: string;
  dayOfWeek: string;
  name: string;
  isActive: boolean;
  truck: { id: string; plateNumber: string };
  waypoints: Waypoint[];
  totalWaypoint: number;
}

interface TrukItem {
  id: string;
  plateNumber: string;
  operator?: { id: string; fullName: string } | null;
  driver?: { id: string; fullName: string } | null;
}

interface WilayahItem {
  id: string;
  name: string;
}

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * 2. CONSTANTS
 * ════════════════════════════════════════════════════════════════════════ */

const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

const HARI_COLOR: Record<string, string> = {
  SENIN:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  SELASA: "bg-sky-50 text-sky-700 border-sky-200",
  RABU:   "bg-amber-50 text-amber-700 border-amber-200",
  KAMIS:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  JUMAT:  "bg-rose-50 text-rose-700 border-rose-200",
  SABTU:  "bg-slate-50 text-slate-600 border-slate-200",
  MINGGU: "bg-orange-50 text-orange-700 border-orange-200",
};

const API = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") + "/api"
  : "/api";

const RUTE_PER_PAGE = 10;
const WAKTU_MULAI = { jam: 8, menit: 0 };  // jam keberangkatan default (08:00 WIB)
const INTERVAL_PER_TITIK_MENIT = 15;        // estimasi jeda antar titik

/* ════════════════════════════════════════════════════════════════════════
 * 3. HELPERS — perhitungan jarak, jenis lokasi & estimasi waktu
 *    (Semua dihitung di sisi klien dari data yang sudah ada,
 *    tidak memerlukan field tambahan di backend.)
 * ════════════════════════════════════════════════════════════════════════ */

/** Jarak antar dua koordinat (km) memakai rumus Haversine. */
function jarakHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Total estimasi jarak tempuh rute (km), menjumlahkan jarak antar titik berurutan. */
function totalJarakRuteKm(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    total += jarakHaversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return total;
}

/** Menebak tipe/kategori lokasi dari nama titik (heuristik kata kunci). */
function tebakTipeLokasi(nama: string): string {
  const n = nama.toLowerCase();
  if (n.includes("tpa")) return "Tempat Pembuangan Akhir";
  if (n.includes("kantor") || n.includes("camat") || n.includes("kelurahan") || n.includes("kecamatan")) return "Pusat Administrasi";
  if (n.includes("pasar")) return "Pasar Rakyat";
  if (n.includes("rsud") || n.includes("puskesmas") || n.includes("klinik") || /\brs\b/.test(n)) return "Fasilitas Kesehatan";
  if (n.includes("simpang") || n.includes("persimpangan")) return "Persimpangan Utama";
  if (n.includes("wisata") || n.includes("pantai") || n.includes("taman") || n.includes("alun")) return "Area Publik";
  if (n.includes("sekolah") || n.includes("smp") || n.includes("sma") || n.includes("sd ")) return "Fasilitas Pendidikan";
  return "Lokasi Umum";
}

/** Estimasi jam tiba di titik ke-`index` (mulai dari WAKTU_MULAI, berjeda tetap per titik). */
function estimasiJamTiba(index: number): string {
  const totalMenit = WAKTU_MULAI.jam * 60 + WAKTU_MULAI.menit + index * INTERVAL_PER_TITIK_MENIT;
  const jam   = Math.floor(totalMenit / 60) % 24;
  const menit = totalMenit % 60;
  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")} WIB`;
}

/**
 * Optimasi urutan titik dengan algoritma nearest-neighbor sederhana:
 * mulai dari titik pertama, lalu selalu lompat ke titik terdekat yang belum dikunjungi.
 * Titik bernama "TPA" (titik akhir pembuangan) selalu diletakkan paling akhir.
 */
function optimasiUrutanWaypoint(waypoints: Waypoint[]): Waypoint[] {
  if (waypoints.length <= 2) return waypoints;

  const tpa     = waypoints.filter((w) => w.name.toLowerCase().includes("tpa"));
  const sisanya = waypoints.filter((w) => !w.name.toLowerCase().includes("tpa"));
  if (sisanya.length === 0) return waypoints;

  const terurut: Waypoint[] = [sisanya[0]];
  const belumDikunjungi = sisanya.slice(1);

  while (belumDikunjungi.length > 0) {
    const titikTerakhir = terurut[terurut.length - 1];
    let idxTerdekat = 0;
    let jarakTerpendek = Infinity;
    belumDikunjungi.forEach((w, i) => {
      const jarak = jarakHaversineKm(titikTerakhir.latitude, titikTerakhir.longitude, w.latitude, w.longitude);
      if (jarak < jarakTerpendek) { jarakTerpendek = jarak; idxTerdekat = i; }
    });
    terurut.push(belumDikunjungi[idxTerdekat]);
    belumDikunjungi.splice(idxTerdekat, 1);
  }

  return [...terurut, ...tpa].map((wp, i) => ({ ...wp, order: i + 1 }));
}

/* ════════════════════════════════════════════════════════════════════════
 * 4. PETA LEAFLET
 * ════════════════════════════════════════════════════════════════════════ */

function PetaWaypoint({
  waypoints,
  onMapClick,
  selectedIdx,
  flyTo,
  readonly = false,
}: {
  waypoints: Waypoint[];
  onMapClick?: (lat: number, lng: number) => void;
  selectedIdx?: number | null;
  flyTo?: [number, number] | null;
  readonly?: boolean;
}) {
  const mapRef       = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef   = useRef<any[]>([]);
  const lineRef      = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      await import("leaflet/dist/leaflet.css");
      const L = (await import("leaflet")).default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { center: [2.3333, 99.0632], zoom: 14 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      if (!readonly && onMapClick) {
        map.on("click", (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));
      }
      mapRef.current = map;
      (mapRef.current as any)._L = L;
      setIsReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setIsReady(false);
    };
  }, [onMapClick, readonly]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !flyTo) return;
    mapRef.current.flyTo(flyTo, 16, { duration: 1.2 });
  }, [flyTo, isReady]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    const map = mapRef.current;
    const L   = map._L;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null; }
    if (waypoints.length === 0) return;

    const latlngs: [number, number][] = [];
    waypoints.forEach((wp, idx) => {
      const isTPA      = wp.name.toLowerCase().includes("tpa");
      const isSelected = idx === selectedIdx;
      const bg = isTPA ? "#374151" : isSelected ? "#1d4ed8" : "#4A6D55";
      const icon = L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:8px;width:24px;height:24px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.18);font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center">${isTPA ? "🏁" : wp.order}</div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([wp.latitude, wp.longitude], { icon })
        .addTo(map)
        .bindPopup(`<b>${wp.order}. ${wp.name}</b><br/><span style="color:#6b7280">${tebakTipeLokasi(wp.name)}</span>`);
      markersRef.current.push(marker);
      latlngs.push([wp.latitude, wp.longitude]);
    });

    if (latlngs.length > 1) {
      lineRef.current = L.polyline(latlngs, { color: "#4A6D55", weight: 3, opacity: 0.55, dashArray: "8, 8" }).addTo(map);
    }
    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    }
  }, [waypoints, selectedIdx, isReady]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
      <div ref={containerRef} style={{ height: readonly ? "320px" : "380px", width: "100%" }} />
      {!readonly && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[11px] font-medium text-gray-600 shadow border border-white/50 flex items-center gap-2">
          <Info size={13} className="text-[#4A6D55]" />
          Klik peta untuk mengambil koordinat
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * 5. KOMPONEN KECIL YANG DAPAT DIPAKAI ULANG (presentational, tanpa state)
 * ════════════════════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: number; icon: any; color: string; bg: string;
}) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm">
      <div className={`p-3 rounded-xl ${bg} ${color}`}><Icon size={22} /></div>
      <div>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function BadgeHari({ hari }: { hari: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${HARI_COLOR[hari] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {hari}
    </span>
  );
}

function BadgeStatus({ aktif }: { aktif: boolean }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      aktif ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"
    }`}>
      {aktif ? <Power size={9} /> : <PowerOff size={9} />}
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

/** Kartu metrik kecil di header rute: ikon + label + nilai (Titik Angkut, Jarak Est., dst). */
function MetricPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="text-center px-3">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <p className="text-sm font-bold text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}

/** Baris waypoint pada mode lihat (tidak sedang diedit). */
function WaypointViewItem({ wp, idx }: { wp: Waypoint; idx: number }) {
  const isTPA = wp.name.toLowerCase().includes("tpa");
  return (
    <div className="flex items-center gap-3 bg-white p-3.5 rounded-[18px] border border-gray-100 shadow-sm hover:border-gray-200 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${isTPA ? "bg-gray-600" : "bg-[#4A6D55]"}`}>
        {idx + 1}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-gray-700 truncate block">{wp.name}</span>
        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
          <Tag size={9} /> {tebakTipeLokasi(wp.name)}
        </span>
      </div>
    </div>
  );
}

/** Baris waypoint pada mode edit: drag handle, nomor urut, nama, tipe lokasi, koordinat, jam, naik/turun, hapus. */
function WaypointEditItem({
  wp, idx, total, selected, onSelect, onMoveUp, onMoveDown, onDelete,
  onDragStart, onDragOver, onDrop, isDragOver,
}: {
  wp: Waypoint;
  idx: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  const isTPA = wp.name.toLowerCase().includes("tpa");
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
        selected ? "bg-white border-[#4A6D55]/40 shadow" : "bg-white border-gray-100 hover:border-gray-200"
      } ${isDragOver ? "ring-2 ring-[#4A6D55]/40" : ""}`}
    >
      <span className="text-gray-300 cursor-grab active:cursor-grabbing shrink-0" title="Geser untuk mengurutkan">
        <GripVertical size={15} />
      </span>

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${isTPA ? "bg-gray-600" : "bg-[#4A6D55]"}`}>
        {idx + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{wp.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
            <Tag size={9} /> {tebakTipeLokasi(wp.name)}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}</span>
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
            <Clock size={9} /> {estimasiJamTiba(idx)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={idx === 0}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-20 transition-colors">
          <ArrowUp size={13} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={idx === total - 1}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-20 transition-colors">
          <ArrowDown size={13} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

/** Komponen paginasi yang dapat dipakai ulang. */
function PaginationBar({
  page, totalPages, totalItems, perPage, onChange,
}: {
  page: number; totalPages: number; totalItems: number; perPage: number; onChange: (p: number) => void;
}) {
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, page - delta);
    const end   = Math.min(totalPages, page + delta);
    for (let i = start; i <= end; i++) range.push(i);
    if (start > 1)         range.unshift(-1, 1);
    if (end < totalPages)  range.push(-2, totalPages);
    return range;
  }, [page, totalPages]);

  return (
    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl shadow-sm">
      <p className="text-xs text-gray-400 font-medium">
        Menampilkan{" "}
        <span className="font-semibold text-gray-600">
          {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalItems)}
        </span>{" "}
        dari <span className="font-semibold text-gray-600">{totalItems}</span> rute
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(1)} disabled={page === 1}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all" title="Pertama">
          <ChevronsLeft size={15} />
        </button>
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all" title="Sebelumnya">
          <ChevronLeft size={15} />
        </button>
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, i) =>
            p < 0 ? (
              <span key={`e${i}`} className="px-1 text-gray-400 text-xs font-semibold select-none">…</span>
            ) : (
              <button key={p} type="button" onClick={() => onChange(p)}
                className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-all ${
                  page === p ? "bg-[#4A6D55] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {p}
              </button>
            )
          )}
        </div>
        <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all" title="Berikutnya">
          <ChevronRight size={15} />
        </button>
        <button type="button" onClick={() => onChange(totalPages)} disabled={page === totalPages}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all" title="Terakhir">
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * 6. KOMPONEN UTAMA
 * ════════════════════════════════════════════════════════════════════════ */

export default function ManajemenRute() {
  /* ── State data ───────────────────────────────────────────────────── */
  const [ruteList, setRuteList]       = useState<RouteTemplate[]>([]);
  const [trukList, setTrukList]       = useState<TrukItem[]>([]);
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [filterTruk, setFilterTruk]   = useState("");
  const [filterHari, setFilterHari]   = useState("ALL");
  const [rutePage, setRutePage]       = useState(1);

  /* ── Alert & status submit ───────────────────────────────────────── */
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ open: false, type: "info", title: "", description: "" });
  const [submitting, setSubmitting]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId]     = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState("");

  /* ── Modal: Buat Rute ────────────────────────────────────────────── */
  const [showModalRute, setShowModalRute] = useState(false);
  const [formRute, setFormRute] = useState({ truckId: "", dayOfWeek: "", name: "", locationId: "" });

  /* ── Modal: Edit Info Rute ───────────────────────────────────────── */
  const [showModalEditRute, setShowModalEditRute] = useState(false);
  const [editingRuteInfo, setEditingRuteInfo]     = useState<RouteTemplate | null>(null);
  const [formEditRute, setFormEditRute]           = useState({ truckId: "", dayOfWeek: "", name: "", isActive: true, locationId: "" });
  const [savingEditRute, setSavingEditRute]       = useState(false);

  /* ── Modal: Lihat Detail Rute ────────────────────────────────────── */
  const [viewingRute, setViewingRute] = useState<RouteTemplate | null>(null);

  /* ── Editor Waypoint ──────────────────────────────────────────────── */
  const [editingRuteId, setEditingRuteId]   = useState<string | null>(null);
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>([]);
  const [selectedWpIdx, setSelectedWpIdx]   = useState<number | null>(null);
  const [wpForm, setWpForm]   = useState({ name: "", latitude: "", longitude: "" });
  const [savingWp, setSavingWp]             = useState(false);
  const [wpSearchQuery, setWpSearchQuery]   = useState("");
  const [wpSearching, setWpSearching]       = useState(false);
  const [mapFlyTo, setMapFlyTo]             = useState<[number, number] | null>(null);
  const [dragIdx, setDragIdx]               = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx]       = useState<number | null>(null);
  const wpFormRef = useRef<HTMLDivElement>(null);

  /* ── Helpers umum ─────────────────────────────────────────────────── */
  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) =>
    setAlertConfig({ open: true, type, title, description, detailText });
  const closeAlert = () => setAlertConfig((p) => ({ ...p, open: false }));

  const token = useCallback(() => localStorage.getItem("token"), []);
  const authHeader = useCallback(() => ({ Authorization: `Bearer ${token()}` }), [token]);
  const getErr = (err: any, fallback: string) => err?.response?.data?.message || fallback;

  /* ── Fetch data ───────────────────────────────────────────────────── */
  const fetchRute = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterTruk) params.truckId = filterTruk;
      if (filterHari && filterHari !== "ALL") params.hari = filterHari;
      const res = await axios.get(`${API}/rute`, { headers: authHeader(), params });
      setRuteList(res.data.data || []);
    } catch (err: any) {
      showAlert("error", "Gagal memuat data", "Data rute tidak bisa dimuat.", getErr(err, "Terjadi kesalahan server."));
    } finally {
      setLoading(false);
    }
  }, [filterTruk, filterHari, authHeader]);

  const fetchTruk = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/truks`, { headers: authHeader() });
      setTrukList(res.data.data || []);
    } catch (err: any) {
      showAlert("error", "Gagal memuat armada", "Data truk tidak bisa dimuat.", getErr(err, "Periksa koneksi."));
    }
  }, [authHeader]);

  const fetchWilayah = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/wilayah`, { headers: authHeader() });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setWilayahList(data);
    } catch (err: any) {
      showAlert("error", "Gagal memuat wilayah", "Data wilayah tidak bisa dimuat.", getErr(err, "Periksa koneksi."));
    }
  }, [authHeader]);

  useEffect(() => { fetchRute(); fetchTruk(); fetchWilayah(); }, [fetchRute, fetchTruk, fetchWilayah]);
  useEffect(() => { setRutePage(1); }, [filterTruk, filterHari]);

  /* ── Data turunan (computed) ──────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:    ruteList.length,
    active:   ruteList.filter((r) => r.isActive).length,
    inactive: ruteList.filter((r) => !r.isActive).length,
  }), [ruteList]);

  const filtered = useMemo(() =>
    ruteList.filter((r) => {
      if (filterTruk && r.truckId !== filterTruk) return false;
      if (filterHari && filterHari !== "ALL" && r.dayOfWeek !== filterHari) return false;
      return true;
    }),
    [ruteList, filterTruk, filterHari]
  );

  const ruteTotalPages = Math.max(1, Math.ceil(filtered.length / RUTE_PER_PAGE));
  const paginatedRute  = useMemo(() => {
    const start = (rutePage - 1) * RUTE_PER_PAGE;
    return filtered.slice(start, start + RUTE_PER_PAGE);
  }, [filtered, rutePage]);

  const findOperatorName = (truckId: string) => {
    const truk = trukList.find((t) => t.id === truckId);
    return truk?.operator?.fullName || truk?.driver?.fullName || null;
  };

  /* ── CRUD: Buat Rute ──────────────────────────────────────────────── */
  const handleBuatRute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRute.locationId) {
      showAlert("info", "Wilayah belum dipilih", "Pilih wilayah/lokasi terlebih dahulu sebelum menyimpan rute.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/rute`, formRute, { headers: authHeader() });
      showAlert("success", "Rute berhasil dibuat", "Rute baru telah ditambahkan ke sistem.");
      setShowModalRute(false);
      setFormRute({ truckId: "", dayOfWeek: "", name: "", locationId: "" });
      fetchRute();
    } catch (err: any) {
      showAlert("error", "Gagal membuat rute", getErr(err, "Terjadi kesalahan saat menyimpan."));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── CRUD: Edit Info Rute ─────────────────────────────────────────── */
  const openEditRuteModal = (rute: RouteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRuteInfo(rute);
    setFormEditRute({
      truckId: rute.truckId,
      dayOfWeek: rute.dayOfWeek,
      name: rute.name,
      isActive: rute.isActive,
      locationId: rute.locationId ?? "",
    });
    setShowModalEditRute(true);
  };

  const handleSimpanEditRute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuteInfo) return;

    const tidakAdaPerubahan =
      formEditRute.truckId     === editingRuteInfo.truckId &&
      formEditRute.dayOfWeek   === editingRuteInfo.dayOfWeek &&
      formEditRute.name.trim() === editingRuteInfo.name.trim() &&
      formEditRute.isActive    === editingRuteInfo.isActive &&
      formEditRute.locationId  === (editingRuteInfo.locationId ?? "");

    if (tidakAdaPerubahan) {
      showAlert("info", "Tidak ada perubahan", "Ubah minimal satu data sebelum menyimpan.");
      return;
    }

    setSavingEditRute(true);
    setSubmitting(true);
    try {
      await axios.put(`${API}/rute/${editingRuteInfo.id}`, formEditRute, { headers: authHeader() });
      showAlert("success", "Rute berhasil diperbarui", "Informasi rute telah berhasil disimpan.");
      setShowModalEditRute(false);
      setEditingRuteInfo(null);
      fetchRute();
    } catch (err: any) {
      showAlert("error", "Gagal memperbarui rute", getErr(err, "Terjadi kesalahan."));
    } finally {
      setSavingEditRute(false);
      setSubmitting(false);
    }
  };

  /* ── CRUD: Hapus Rute ─────────────────────────────────────────────── */
  const openDeleteConfirm = (id: string, name: string) => {
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const handleHapusRute = async () => {
    if (!pendingDeleteId) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/rute/${pendingDeleteId}`, { headers: authHeader() });
      showAlert("success", "Rute berhasil dihapus", "Rute telah dihapus secara permanen.");
      setPendingDeleteId(null);
      setPendingDeleteName("");
      fetchRute();
    } catch (err: any) {
      showAlert("error", "Gagal menghapus rute", getErr(err, "Hapus gagal."));
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ── Editor Waypoint ──────────────────────────────────────────────── */
  const openWaypointEditor = (rute: RouteTemplate) => {
    setEditingRuteId(rute.id);
    setLocalWaypoints([...rute.waypoints]);
    setSelectedWpIdx(null);
    setWpForm({ name: "", latitude: "", longitude: "" });
    setWpSearchQuery("");
    setMapFlyTo(null);
    setExpandedId(rute.id);
    setTimeout(() => wpFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  };

  const tutupWaypointEditor = () => {
    setEditingRuteId(null);
    setLocalWaypoints([]);
    setSelectedWpIdx(null);
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setWpForm((p) => ({ ...p, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  }, []);

  const handleSearchWaypoint = async () => {
    if (!wpSearchQuery.trim()) return;
    setWpSearching(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(wpSearchQuery)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const loc  = data[0];
        const lat  = parseFloat(loc.lat);
        const lng  = parseFloat(loc.lon);
        const nama = loc.display_name.split(",")[0].trim();
        setWpForm({ name: nama, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
        setMapFlyTo([lat, lng]);
        showAlert("success", "Lokasi ditemukan", `"${nama}" siap ditambahkan.`);
      } else {
        showAlert("info", "Tidak ditemukan", "Coba kata kunci lain yang lebih spesifik.");
      }
    } catch {
      showAlert("error", "Gagal mencari", "Tidak dapat menghubungi server peta.");
    } finally {
      setWpSearching(false);
    }
  };

  const handleTambahWpLokal = () => {
    if (!wpForm.name || !wpForm.latitude || !wpForm.longitude) {
      showAlert("info", "Data tidak lengkap", "Isi nama dan koordinat lokasi terlebih dahulu.");
      return;
    }
    const newWp: Waypoint = {
      id:        `temp-${Date.now()}`,
      routeId:   editingRuteId!,
      order:     localWaypoints.length + 1,
      name:      wpForm.name,
      latitude:  parseFloat(wpForm.latitude),
      longitude: parseFloat(wpForm.longitude),
    };
    setLocalWaypoints((p) => [...p, newWp]);
    setWpForm({ name: "", latitude: "", longitude: "" });
    setWpSearchQuery("");
    setMapFlyTo(null);
  };

  const handleHapusWpLokal = (idx: number) => {
    setLocalWaypoints((p) => p.filter((_, i) => i !== idx).map((wp, i) => ({ ...wp, order: i + 1 })));
  };

  const moveWp = (idx: number, dir: "up" | "down") => {
    setLocalWaypoints((p) => {
      const arr     = [...p];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  /** Pindahkan titik dari index `from` ke index `to` (dipakai saat drag & drop). */
  const reorderWp = (from: number, to: number) => {
    setLocalWaypoints((p) => {
      if (from === to) return p;
      const arr = [...p];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  const handleOptimasiRute = () => {
    if (localWaypoints.length < 3) {
      showAlert("info", "Titik belum cukup", "Tambahkan minimal 3 titik untuk mengoptimalkan urutan rute.");
      return;
    }
    setLocalWaypoints((p) => optimasiUrutanWaypoint(p));
    showAlert("success", "Urutan dioptimalkan", "Titik telah diurutkan berdasarkan jarak terdekat antar lokasi.");
  };

  const handleSimpanWaypoints = async () => {
    const ruteYangDiedit = ruteList.find((r) => r.id === editingRuteId);
    if (ruteYangDiedit && !findOperatorName(ruteYangDiedit.truckId)) {
      showAlert(
        "error",
        "Armada Belum Memiliki Supir",
        `Rute "${ruteYangDiedit.name}" menggunakan armada ${ruteYangDiedit.truck.plateNumber} yang belum memiliki supir. Assign supir terlebih dahulu di menu Manajemen Armada.`
      );
      return;
    }

    setSavingWp(true);
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/rute/${editingRuteId}/waypoint`,
        { bulk: localWaypoints.map((wp) => ({ name: wp.name, latitude: wp.latitude, longitude: wp.longitude, order: wp.order })) },
        { headers: authHeader() }
      );
      showAlert("success", "Waypoint tersimpan", "Urutan perjalanan rute telah diperbarui.");
      tutupWaypointEditor();
      fetchRute();
    } catch (err: any) {
      showAlert("error", "Gagal menyimpan waypoint", getErr(err, "Coba lagi."));
    } finally {
      setSavingWp(false);
      setSubmitting(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════════
   * RENDER
   * ════════════════════════════════════════════════════════════════════ */

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">

      <AlertDialog open={alertConfig.open} type={alertConfig.type} title={alertConfig.title}
        description={alertConfig.description} detailText={alertConfig.detailText} onClose={closeAlert} />

      <AlertDialog open={submitting} type="loading" title="Memproses"
        description="Mohon tunggu, sedang mengirim data ke server..."
        isLoading disableBackdropClose onClose={() => {}} />

      <AlertDialog
        open={showDeleteConfirm} type="delete" title="Hapus Rute?"
        description={`Rute "${pendingDeleteName}" akan dihapus secara permanen dari sistem.`}
        buttonText="Hapus" showCancelButton
        onConfirm={handleHapusRute}
        onClose={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); setPendingDeleteName(""); }}
      />

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative z-10">
          <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
            Logistik & Navigasi
          </span>
          <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">Manajemen Rute Armada</h1>
          <p className="text-[#5B7078] mt-2 font-medium">Atur titik angkut sampah dan alur perjalanan truk operasional.</p>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Total Rute" value={stats.total}    icon={Route}    color="text-gray-500"  bg="bg-gray-50" />
        <StatCard label="Rute Aktif" value={stats.active}   icon={Power}    color="text-green-600" bg="bg-green-50" />
        <StatCard label="Nonaktif"   value={stats.inactive} icon={PowerOff} color="text-red-500"   bg="bg-red-50" />
      </div>

      {/* ── TOMBOL BUAT RUTE ── */}
      <div className="flex justify-end">
        <button
          onClick={() => { tutupWaypointEditor(); setExpandedId(null); setShowModalRute(true); }}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-semibold shadow hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Buat Rute Baru
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex gap-3 flex-1 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <select
              value={filterTruk}
              onChange={(e) => setFilterTruk(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all appearance-none"
            >
              <option value="">Semua Armada</option>
              {trukList.map((t) => <option key={t.id} value={t.id}>{t.plateNumber}</option>)}
            </select>
          </div>
          <button onClick={fetchRute} className="p-3 bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-[#4A6D55] rounded-xl transition-all border border-gray-100" title="Refresh">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {["ALL", ...HARI_LIST].map((h) => (
            <button
              key={h}
              onClick={() => setFilterHari(h)}
              className={`px-3 py-2 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap ${
                filterHari === h ? "bg-[#4A6D55] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {h === "ALL" ? "Semua" : h.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST RUTE ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14 text-center">
            <div className="flex flex-col items-center text-gray-400 gap-3">
              <Loader2 className="animate-spin text-[#4A6D55]" size={30} />
              <span className="text-sm font-medium">Memuat data rute...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400 text-sm">
            Belum ada rute yang cocok dengan filter.
          </div>
        ) : (
          paginatedRute.map((rute) => {
            const isExpanded   = expandedId === rute.id;
            const isEditing    = editingRuteId === rute.id;
            const namaSupir    = findOperatorName(rute.truckId);
            const jarakKm      = totalJarakRuteKm(isEditing ? localWaypoints : rute.waypoints);
            const jumlahTitik  = isEditing ? localWaypoints.length : rute.waypoints.length;

            return (
              <div
                key={rute.id}
                className={`bg-white rounded-[24px] border transition-all ${
                  isExpanded ? "border-gray-200 shadow-md" : "border-gray-100 shadow-sm hover:border-gray-200"
                }`}
              >
                {/* ── Card Header ── */}
                <div className="p-5 md:p-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rute.id)}
                    className={`p-2 rounded-xl transition-colors shrink-0 ${isExpanded ? "bg-gray-100 text-gray-600" : "text-gray-300 hover:bg-gray-50 hover:text-gray-500"}`}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
                    <Navigation size={16} className="text-[#4A6D55]" />
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <BadgeHari hari={rute.dayOfWeek} />
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{rute.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Truck size={11} className="text-[#4A6D55]" />
                        <span className="font-medium text-gray-600">{rute.truck.plateNumber}</span>
                      </span>
                      {namaSupir ? (
                        <span className="flex items-center gap-1.5">
                          <Navigation size={11} className="text-[#4A6D55]" />
                          <span className="font-medium text-gray-600">{namaSupir}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400">
                          <Navigation size={11} />
                          <span className="font-medium italic">Belum ada supir</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrik ringkas: titik angkut, jarak estimasi, status */}
                  <div className="hidden md:flex items-center divide-x divide-gray-100 shrink-0">
                    <MetricPill icon={MapPin} label="Titik Angkut" value={`${jumlahTitik}`} />
                    <MetricPill icon={Ruler} label="Jarak Est." value={jarakKm > 0 ? `${jarakKm.toFixed(1)} km` : "—"} />
                    <div className="px-3"><BadgeStatus aktif={rute.isActive} /></div>
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end ml-auto">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSimpanWaypoints(); }}
                          disabled={savingWp}
                          className="px-3 py-1.5 bg-[#4A6D55] text-white rounded-lg hover:bg-[#3a5643] transition-colors shadow-sm inline-flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap disabled:opacity-50"
                        >
                          {savingWp ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />} Simpan Perubahan
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); tutupWaypointEditor(); }}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors text-[10px] font-semibold whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); openWaypointEditor(rute); }}
                          className="px-2.5 py-1.5 bg-[#4A6D55] text-white rounded-lg hover:bg-[#3a5643] transition-colors shadow-sm inline-flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap"
                          title="Kelola Titik Rute"
                        >
                          <MapPin size={11} /> Kelola Titik
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewingRute(rute); }}
                          className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm inline-flex"
                          title="Lihat Detail Rute"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => openEditRuteModal(rute, e)}
                          className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors shadow-sm inline-flex"
                          title="Edit Info Rute"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(rute.id, rute.name); }}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm inline-flex"
                          title="Hapus Rute"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Metrik versi mobile (di bawah baris utama) */}
                  <div className="flex md:hidden items-center gap-4 w-full pl-12 -mt-1">
                    <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                      <MapPin size={11} className="text-[#4A6D55]" /> {jumlahTitik} Titik
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                      <Ruler size={11} className="text-[#4A6D55]" /> {jarakKm > 0 ? `${jarakKm.toFixed(1)} km` : "—"}
                    </span>
                    <BadgeStatus aktif={rute.isActive} />
                  </div>
                </div>

                {/* ── Card Body (expanded) ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-6 md:p-8 bg-gray-50/40 rounded-b-[24px]">
                    {isEditing ? (
                      /* ── EDIT WAYPOINT ── */
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                        {/* KIRI: Peta + Form */}
                        <div className="space-y-5">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Konfigurasi Jalur Peta</p>
                          <PetaWaypoint
                            key={editingRuteId ?? "peta"}
                            waypoints={localWaypoints}
                            onMapClick={handleMapClick}
                            selectedIdx={selectedWpIdx}
                            flyTo={mapFlyTo}
                          />
                          <div ref={wpFormRef} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            {/* Cari lokasi */}
                            <div>
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Cari Lokasi</label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                  <input
                                    type="text"
                                    placeholder="Simpang Sibulele, Pasar Horas..."
                                    value={wpSearchQuery}
                                    onChange={(e) => setWpSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchWaypoint(); } }}
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSearchWaypoint}
                                  disabled={wpSearching || !wpSearchQuery.trim()}
                                  className="px-4 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors shadow flex items-center gap-2 disabled:opacity-50"
                                >
                                  {wpSearching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />} Cari
                                </button>
                              </div>
                            </div>
                            <div className="border-t border-gray-100" />
                            {/* Nama */}
                            <div>
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Nama Lokasi</label>
                              <input
                                type="text"
                                placeholder="Simpang Sibulele"
                                value={wpForm.name}
                                onChange={(e) => setWpForm((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-green-500/20 transition-all"
                              />
                              {wpForm.name && (
                                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                  <Tag size={9} /> Terdeteksi sebagai: <span className="font-semibold text-gray-500">{tebakTipeLokasi(wpForm.name)}</span>
                                </p>
                              )}
                            </div>
                            {/* Lat & Lng */}
                            <div className="grid grid-cols-2 gap-3">
                              {(["latitude", "longitude"] as const).map((field) => (
                                <div key={field}>
                                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">{field}</label>
                                  <input
                                    type="text"
                                    placeholder={field === "latitude" ? "-6.200000" : "106.816666"}
                                    value={wpForm[field]}
                                    onChange={(e) => setWpForm((p) => ({ ...p, [field]: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-700 border border-gray-100 outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleTambahWpLokal}
                              className="w-full py-3 bg-[#4A6D55] text-white rounded-2xl text-sm font-semibold hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2 shadow"
                            >
                              <Plus size={16} /> Tambah ke Daftar
                            </button>
                          </div>
                        </div>

                        {/* KANAN: Daftar Titik */}
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                              Daftar Titik Operasional ({localWaypoints.length} Lokasi)
                            </p>
                            <button
                              type="button"
                              onClick={handleOptimasiRute}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors inline-flex items-center gap-1.5"
                              title="Urutkan titik berdasarkan jarak terdekat"
                            >
                              <Wand2 size={12} /> Optimasi Rute
                            </button>
                          </div>

                          <div className="flex-1 space-y-2 overflow-y-auto max-h-[520px] pr-1">
                            {localWaypoints.length === 0 ? (
                              <div className="py-14 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-sm text-gray-400">Belum ada titik yang ditambahkan</p>
                              </div>
                            ) : localWaypoints.map((wp, idx) => (
                              <WaypointEditItem
                                key={wp.id}
                                wp={wp}
                                idx={idx}
                                total={localWaypoints.length}
                                selected={selectedWpIdx === idx}
                                onSelect={() => setSelectedWpIdx(idx)}
                                onMoveUp={() => moveWp(idx, "up")}
                                onMoveDown={() => moveWp(idx, "down")}
                                onDelete={() => handleHapusWpLokal(idx)}
                                isDragOver={dragOverIdx === idx}
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (dragIdx !== null) reorderWp(dragIdx, idx);
                                  setDragIdx(null);
                                  setDragOverIdx(null);
                                }}
                              />
                            ))}
                          </div>

                          <div className="mt-5 flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={handleSimpanWaypoints}
                              disabled={savingWp}
                              className="flex-[2] py-3.5 bg-[#4A6D55] hover:bg-[#3a5643] text-white rounded-2xl font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {savingWp ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                              {savingWp ? "Menyimpan..." : "Simpan Waypoint"}
                            </button>
                            <button type="button" onClick={tutupWaypointEditor}
                              className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-2xl font-semibold hover:bg-gray-50 transition-all">
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── LIHAT WAYPOINT ── */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                            Titik Perjalanan ({rute.waypoints.length})
                          </p>
                          {rute.waypoints.length > 0 && (
                            <p className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                              <Ruler size={11} className="text-[#4A6D55]" /> Estimasi jarak {jarakKm.toFixed(1)} km
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {rute.waypoints.map((wp, idx) => (
                            <WaypointViewItem key={wp.id} wp={wp} idx={idx} />
                          ))}
                          <button
                            type="button"
                            onClick={() => openWaypointEditor(rute)}
                            className="flex items-center justify-center gap-2 p-3.5 rounded-[18px] border border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-[#4A6D55] hover:text-[#4A6D55] transition-all"
                          >
                            <MapPin size={15} /> Kelola Titik Rute
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── PAGINATION ── */}
      {!loading && filtered.length > 0 && (
        <PaginationBar
          page={rutePage}
          totalPages={ruteTotalPages}
          totalItems={filtered.length}
          perPage={RUTE_PER_PAGE}
          onChange={setRutePage}
        />
      )}

      {/* ── MODAL: LIHAT DETAIL RUTE ── */}
      <AnimatePresence>
        {viewingRute && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-gray-100 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl"><Route size={18} /></div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base leading-none">Detail Rute</h3>
                    <p className="text-xs text-gray-400 mt-1">{viewingRute.name}</p>
                  </div>
                </div>
                <button onClick={() => setViewingRute(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Hari", value: viewingRute.dayOfWeek },
                    { label: "Armada", value: viewingRute.truck.plateNumber },
                    { label: "Total Titik", value: `${viewingRute.totalWaypoint} titik` },
                    { label: "Jarak Est.", value: `${totalJarakRuteKm(viewingRute.waypoints).toFixed(1)} km` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="font-semibold text-gray-800 mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end -mt-2">
                  <BadgeStatus aktif={viewingRute.isActive} />
                </div>

                {viewingRute.waypoints.length > 0 ? (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Peta Rute</p>
                      <PetaWaypoint waypoints={viewingRute.waypoints} readonly />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        Titik Perjalanan ({viewingRute.waypoints.length})
                      </p>
                      <div className="space-y-2">
                        {viewingRute.waypoints.map((wp, idx) => (
                          <div key={wp.id} className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              wp.name.toLowerCase().includes("tpa") ? "bg-gray-600" : "bg-[#4A6D55]"
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700">{wp.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1"><Tag size={9} /> {tebakTipeLokasi(wp.name)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}</span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={9} /> {estimasiJamTiba(idx)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
                    Belum ada titik waypoint yang ditambahkan.
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button onClick={() => setViewingRute(null)}
                  className="px-6 py-2.5 bg-gray-800 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors">
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: BUAT RUTE BARU ── */}
      <AnimatePresence>
        {showModalRute && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md min-h-screen sm:min-h-0 overflow-hidden my-auto flex flex-col"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">Registrasi Rute Baru</h3>
                <button onClick={() => setShowModalRute(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleBuatRute} className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Pilih Armada <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <select
                      value={formRute.truckId}
                      onChange={(e) => {
                        const truk = trukList.find((t) => t.id === e.target.value);
                        setFormRute((p) => ({ ...p, truckId: e.target.value, name: truk && p.dayOfWeek ? `Rute ${truk.plateNumber} - ${p.dayOfWeek}` : p.name }));
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium appearance-none"
                    >
                      <option value="">Pilih plat nomor armada</option>
                      {trukList.map((t) => {
                        const driver = t.operator?.fullName || t.driver?.fullName || null;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.plateNumber}{driver ? ` — ${driver}` : " — (Belum ada supir)"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Wilayah / Lokasi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <select
                      value={formRute.locationId}
                      onChange={(e) => setFormRute((p) => ({ ...p, locationId: e.target.value }))}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium appearance-none"
                    >
                      <option value="">Pilih wilayah</option>
                      {wilayahList.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Hari Operasional <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {HARI_LIST.map((h) => (
                      <button key={h} type="button"
                        onClick={() => {
                          const truk = trukList.find((t) => t.id === formRute.truckId);
                          setFormRute((p) => ({ ...p, dayOfWeek: h, name: truk ? `Rute ${truk.plateNumber} - ${h}` : p.name }));
                        }}
                        className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all ${
                          formRute.dayOfWeek === h ? "border-[#4A6D55] bg-[#4A6D55] text-white shadow" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        {h.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Nama Rute <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type="text" value={formRute.name} onChange={(e) => setFormRute((p) => ({ ...p, name: e.target.value }))} required
                      placeholder="Rute BK 1234 AB - SENIN"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all" />
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-semibold shadow hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2">
                    <Plus size={17} /> Daftarkan Rute
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: EDIT INFO RUTE ── */}
  {/* ── MODAL: EDIT INFO RUTE ── */}
<AnimatePresence>
  {showModalEditRute && editingRuteInfo && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0 overflow-hidden my-auto flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Edit Info Rute</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Ubah armada, hari, nama, atau status rute</p>
          </div>
          <button
            onClick={() => { setShowModalEditRute(false); setEditingRuteInfo(null); }}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info box rute yang diedit — netral, tidak mencolok */}
        <div className="px-6 pt-5">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4A6D55]/10 rounded-xl flex items-center justify-center shrink-0">
              <Navigation size={15} className="text-[#4A6D55]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Rute yang diedit</p>
              <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{editingRuteInfo.name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSimpanEditRute} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Baris 1: Armada & Wilayah berdampingan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Armada Truk</label>
              <div className="relative">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <select
                  value={formEditRute.truckId}
                  onChange={(e) => {
                    const truk = trukList.find((t) => t.id === e.target.value);
                    setFormEditRute((p) => ({ ...p, truckId: e.target.value, name: truk ? `Rute ${truk.plateNumber} - ${p.dayOfWeek}` : p.name }));
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 outline-none text-sm font-medium appearance-none"
                >
                  <option value="">Pilih armada</option>
                  {trukList.map((t) => {
                    const driver = t.operator?.fullName || t.driver?.fullName || null;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.plateNumber}{driver ? ` — ${driver}` : " — (Belum ada supir)"}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Wilayah / Lokasi</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <select
                  value={formEditRute.locationId}
                  onChange={(e) => setFormEditRute((p) => ({ ...p, locationId: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 outline-none text-sm font-medium appearance-none"
                >
                  <option value="">Pilih wilayah</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hari Operasional — full width, 7 hari sebaris */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Hari Operasional</label>
            <div className="grid grid-cols-7 gap-2">
              {HARI_LIST.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const truk = trukList.find((t) => t.id === formEditRute.truckId);
                    setFormEditRute((p) => ({ ...p, dayOfWeek: h, name: truk ? `Rute ${truk.plateNumber} - ${h}` : p.name }));
                  }}
                  className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all ${
                    formEditRute.dayOfWeek === h
                      ? "border-[#4A6D55] bg-[#4A6D55]/10 text-[#4A6D55] shadow-sm"
                      : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                  }`}
                >
                  {h.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Baris 2: Nama Rute & Status berdampingan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Nama Rute <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={formEditRute.name}
                  onChange={(e) => setFormEditRute((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Rute BK 1234 AB - SENIN"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 outline-none text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Status Rute</label>
              <div className="relative">
                <Power className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <select
                  value={formEditRute.isActive ? "true" : "false"}
                  onChange={(e) => setFormEditRute((p) => ({ ...p, isActive: e.target.value === "true" }))}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 outline-none text-sm font-medium appearance-none"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
              </div>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => { setShowModalEditRute(false); setEditingRuteInfo(null); }}
              className="flex-1 px-5 py-3.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-all border border-gray-200 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingEditRute}
              className="flex-[2] py-3.5 bg-[#4A6D55] text-white rounded-2xl font-semibold shadow hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {savingEditRute ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {savingEditRute ? "Menyimpan..." : "Simpan Perubahan"}
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