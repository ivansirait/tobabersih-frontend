"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
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
  CheckCircle2,
  Power,
  PowerOff,
  Route,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertDialog, { type AlertType } from "../components/AlertDialog";

// ─── Types ───────────────────────────────────────────────────
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
}

interface AlertConfig {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  detailText?: string;
}

const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

const HARI_COLOR: Record<string, string> = {
  SENIN: "bg-emerald-50 text-emerald-700 border-emerald-100",
  SELASA: "bg-blue-50 text-blue-700 border-blue-100",
  RABU: "bg-amber-50 text-amber-700 border-amber-100",
  KAMIS: "bg-indigo-50 text-indigo-700 border-indigo-100",
  JUMAT: "bg-rose-50 text-rose-700 border-rose-100",
  SABTU: "bg-slate-50 text-slate-700 border-slate-100",
  MINGGU: "bg-orange-50 text-orange-700 border-orange-100",
};

const API = "/api";
const RUTE_PER_PAGE = 10;

// ─── Sub-komponen Peta (sama seperti sebelumnya, tidak diubah) ──
function PetaWaypoint({
  waypoints,
  onMapClick,
  selectedIdx,
  flyTo,
}: {
  waypoints: Waypoint[];
  onMapClick: (lat: number, lng: number) => void;
  selectedIdx: number | null;
  flyTo?: [number, number] | null;
}) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const lineRef = useRef<any>(null);
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
      map.on("click", (e: any) => { onMapClick(e.latlng.lat, e.latlng.lng); });
      mapRef.current = map;
      (mapRef.current as any)._L = L;
      setIsReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsReady(false);
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !flyTo) return;
    mapRef.current.flyTo(flyTo, 16, { duration: 1.2 });
  }, [flyTo, isReady]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    const map = mapRef.current;
    const L = map._L;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null; }
    if (waypoints.length === 0) return;
    const latlngs: [number, number][] = [];
    waypoints.forEach((wp, idx) => {
      const isTPA = wp.name.toLowerCase().includes("tpa");
      const isSelected = idx === selectedIdx;
      const bg = isTPA ? "#1A2E35" : isSelected ? "#064E3B" : "#059669";
      const icon = L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:8px;width:24px;height:24px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center">${isTPA ? "🏁" : wp.order}</div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([wp.latitude, wp.longitude], { icon })
        .addTo(map)
        .bindPopup(`<b>${wp.order}. ${wp.name}</b>`);
      markersRef.current.push(marker);
      latlngs.push([wp.latitude, wp.longitude]);
    });
    if (latlngs.length > 1) {
      lineRef.current = L.polyline(latlngs, {
        color: "#064E3B", weight: 3, opacity: 0.6, dashArray: "8, 8",
      }).addTo(map);
    }
    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    }
  }, [waypoints, selectedIdx, isReady]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-inner">
      <div ref={containerRef} style={{ height: "380px", width: "100%" }} />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[11px] font-bold text-[#1A2E35] shadow-lg border border-white/50 flex items-center gap-2">
        <Info size={14} className="text-green-600" />
        Klik peta untuk mengambil koordinat lokasi
      </div>
    </div>
  );
}

// ─── Komponen Utama ──────────────────────────────────────────
export default function ManajemenRute() {
  // State data
  const [ruteList, setRuteList] = useState<RouteTemplate[]>([]);
  const [trukList, setTrukList] = useState<TrukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTruk, setFilterTruk] = useState("");
  const [filterHari, setFilterHari] = useState("ALL");
  const [rutePage, setRutePage] = useState(1);

  // ── Alert System (seperti ManageSupir) ──
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    open: false,
    type: "info",
    title: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState("");

  // ── Modal Rute ──
  const [showModalRute, setShowModalRute] = useState(false);
  const [formRute, setFormRute] = useState({ truckId: "", dayOfWeek: "", name: "" });

  // ── Modal Edit Info Rute ──
  const [showModalEditRute, setShowModalEditRute] = useState(false);
  const [editingRuteInfo, setEditingRuteInfo] = useState<RouteTemplate | null>(null);
  const [formEditRute, setFormEditRute] = useState({ truckId: "", dayOfWeek: "", name: "" });
  const [savingEditRute, setSavingEditRute] = useState(false);

  // ── Editor Waypoint ──
  const [editingRuteId, setEditingRuteId] = useState<string | null>(null);
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>([]);
  const [selectedWpIdx, setSelectedWpIdx] = useState<number | null>(null);
  const [wpForm, setWpForm] = useState({ name: "", latitude: "", longitude: "" });
  const [savingWp, setSavingWp] = useState(false);
  const [wpSearchQuery, setWpSearchQuery] = useState("");
  const [wpSearching, setWpSearching] = useState(false);
  const [mapFlyTo, setMapFlyTo] = useState<[number, number] | null>(null);

  // ── Helper Alert ──
  const showAlert = (type: AlertType, title: string, description: string, detailText?: string) => {
    setAlertConfig({
      open: true,
      type,
      title,
      description,
      detailText,
    });
  };
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, open: false }));

  const token = useCallback(() => localStorage.getItem("token"), []);

  const getErrorMessage = (error: any, fallback: string) => {
    return error?.response?.data?.message || fallback;
  };

  // ── Fetch Data ──
  const fetchRute = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterTruk) params.truckId = filterTruk;
      if (filterHari && filterHari !== "ALL") params.hari = filterHari;
      const res = await axios.get(`${API}/rute`, {
        headers: { Authorization: `Bearer ${token()}` },
        params,
      });
      setRuteList(res.data.data || []);
    } catch (error: any) {
      showAlert("error", "Gagal memuat data", "Data rute tidak bisa dimuat.", getErrorMessage(error, "Terjadi kesalahan server."));
    } finally {
      setLoading(false);
    }
  }, [filterTruk, filterHari, token]);

  const fetchTruk = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/truks`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setTrukList(res.data.data || []);
    } catch (error: any) {
      console.error("Gagal fetch truk:", error);
      showAlert("error", "Gagal memuat armada", "Data truk tidak bisa dimuat.", getErrorMessage(error, "Periksa koneksi."));
    }
  }, [token]);

  useEffect(() => {
    fetchRute();
    fetchTruk();
  }, [fetchRute, fetchTruk]);

  useEffect(() => {
    setRutePage(1);
  }, [filterTruk, filterHari]);

  const stats = useMemo(() => ({
    total: ruteList.length,
    active: ruteList.filter((r) => r.isActive).length,
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
  const paginatedRute = useMemo(() => {
    const start = (rutePage - 1) * RUTE_PER_PAGE;
    return filtered.slice(start, start + RUTE_PER_PAGE);
  }, [filtered, rutePage]);

  const rutePageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, rutePage - delta);
    const end = Math.min(ruteTotalPages, rutePage + delta);
    for (let i = start; i <= end; i++) range.push(i);
    if (start > 1) range.unshift(-1, 1);
    if (end < ruteTotalPages) range.push(-2, ruteTotalPages);
    return range;
  }, [rutePage, ruteTotalPages]);

  // ── Handler: Buat Rute ──
  const handleBuatRute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/rute`, formRute, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSubmitting(false);
      showAlert("success", "Rute berhasil dibuat", "Rute baru telah ditambahkan ke sistem.");
      setShowModalRute(false);
      setFormRute({ truckId: "", dayOfWeek: "", name: "" });
      fetchRute();
    } catch (error: any) {
      setSubmitting(false);
      showAlert("error", "Gagal membuat rute", getErrorMessage(error, "Terjadi kesalahan saat menyimpan."));
    }
  };

  // ── Edit Info Rute ──
  const openEditRuteModal = (rute: RouteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRuteInfo(rute);
    setFormEditRute({
      truckId: rute.truckId,
      dayOfWeek: rute.dayOfWeek,
      name: rute.name,
    });
    setShowModalEditRute(true);
  };

  const handleSimpanEditRute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuteInfo) return;
    setSavingEditRute(true);
    setSubmitting(true);
    try {
      await axios.put(
        `${API}/rute/${editingRuteInfo.id}`,
        {
          name: formEditRute.name,
          truckId: formEditRute.truckId,
          dayOfWeek: formEditRute.dayOfWeek,
        },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setSubmitting(false);
      setSavingEditRute(false);
      showAlert("success", "Rute berhasil diperbarui", "Informasi rute telah berhasil disimpan.");
      setShowModalEditRute(false);
      setEditingRuteInfo(null);
      fetchRute();
    } catch (error: any) {
      setSubmitting(false);
      setSavingEditRute(false);
      showAlert("error", "Gagal memperbarui rute", getErrorMessage(error, "Terjadi kesalahan."));
    }
  };

  // ── Toggle Status (tanpa konfirmasi, langsung dengan loading) ──
  const handleToggle = async (ruteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubmitting(true);
    try {
      await axios.patch(`${API}/rute/${ruteId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSubmitting(false);
      showAlert("success", "Status berhasil diubah", "Status rute telah diperbarui.");
      fetchRute();
    } catch (error: any) {
      setSubmitting(false);
      showAlert("error", "Gagal mengubah status", getErrorMessage(error, "Coba lagi nanti."));
    }
  };

  // ── Delete dengan konfirmasi AlertDialog ──
  const openDeleteConfirm = (id: string, name: string) => {
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const handleHapusRute = async () => {
    if (!pendingDeleteId) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/rute/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSubmitting(false);
      showAlert("success", "Rute berhasil dihapus", "Rute telah dihapus secara permanen.");
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
      setPendingDeleteName("");
      fetchRute();
    } catch (error: any) {
      setSubmitting(false);
      showAlert("error", "Gagal menghapus rute", getErrorMessage(error, "Hapus gagal."));
      setShowDeleteConfirm(false);
    }
  };

  // ── Waypoint Editor ──
  const openWaypointEditor = (rute: RouteTemplate) => {
    setEditingRuteId(rute.id);
    setLocalWaypoints([...rute.waypoints]);
    setSelectedWpIdx(null);
    setWpForm({ name: "", latitude: "", longitude: "" });
    setWpSearchQuery("");
    setMapFlyTo(null);
    setExpandedId(rute.id);
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setWpForm((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  }, []);

  const handleSearchWaypoint = async () => {
    if (!wpSearchQuery.trim()) return;
    setWpSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(wpSearchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const loc = data[0];
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lon);
        const namaLokasi = loc.display_name.split(",")[0].trim();
        setWpForm({
          name: namaLokasi,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        });
        setMapFlyTo([lat, lng]);
        showAlert("success", "Lokasi ditemukan", `"${namaLokasi}" siap ditambahkan.`);
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
      id: `temp-${Date.now()}`,
      routeId: editingRuteId!,
      order: localWaypoints.length + 1,
      name: wpForm.name,
      latitude: parseFloat(wpForm.latitude),
      longitude: parseFloat(wpForm.longitude),
    };
    setLocalWaypoints((prev) => [...prev, newWp]);
    setWpForm({ name: "", latitude: "", longitude: "" });
    setWpSearchQuery("");
    setMapFlyTo(null);
  };

  const handleHapusWpLokal = (idx: number) => {
    setLocalWaypoints((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  const moveWp = (idx: number, dir: "up" | "down") => {
    setLocalWaypoints((prev) => {
      const arr = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  const handleSimpanWaypoints = async () => {
    setSavingWp(true);
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/rute/${editingRuteId}/waypoint`,
        {
          bulk: localWaypoints.map((wp) => ({
            name: wp.name,
            latitude: wp.latitude,
            longitude: wp.longitude,
            order: wp.order,
          })),
        },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setSubmitting(false);
      setSavingWp(false);
      showAlert("success", "Waypoint tersimpan", "Urutan perjalanan rute telah diperbarui.");
      setEditingRuteId(null);
      fetchRute();
    } catch (error: any) {
      setSubmitting(false);
      setSavingWp(false);
      showAlert("error", "Gagal menyimpan waypoint", getErrorMessage(error, "Coba lagi."));
    }
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-black">
      {/* ALERT GLOBAL (info/success/error) */}
      <AlertDialog
        open={alertConfig.open}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
        detailText={alertConfig.detailText}
        onClose={closeAlert}
      />

      {/* LOADING ALERT (submitting) */}
      <AlertDialog
        open={submitting}
        type="loading"
        title="Memproses"
        description="Mohon tunggu, sedang mengirim data ke server..."
        isLoading={true}
        disableBackdropClose={true}
        onClose={() => {}}
      />

      {/* DELETE CONFIRM ALERT */}
      <AlertDialog
        open={showDeleteConfirm}
        type="delete"
        title="Hapus Rute?"
        description={`Rute "${pendingDeleteName}" akan dihapus secara permanen dari sistem.`}
        buttonText="Hapus"
        showCancelButton={true}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleHapusRute();
        }}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteId(null);
          setPendingDeleteName("");
        }}
      />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
              Logistik & Navigasi
            </span>
            <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
              Manajemen Rute Armada
            </h1>
            <p className="text-[#5B7078] mt-2 font-medium">
              Atur titik angkut sampah dan alur perjalanan truk operasional.
            </p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Total Rute", val: stats.total, icon: Route, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Rute Aktif", val: stats.active, icon: Power, color: "text-green-600", bg: "bg-green-50" },
          { label: "Nonaktif", val: stats.inactive, icon: PowerOff, color: "text-red-600", bg: "bg-red-50" },
        ].map((s, i) => (
          <div key={`stat-${i}`} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl md:text-2xl font-black truncate text-gray-900">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* BUTTON BUAT RUTE */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingRuteId(null);
            setLocalWaypoints([]);
            setExpandedId(null);
            setShowModalRute(true);
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Buat Rute Baru
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border-none shadow-sm p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex gap-3 flex-1 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filterTruk}
              onChange={(e) => setFilterTruk(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all appearance-none"
            >
              <option value="">Semua Armada</option>
              {trukList.map((t) => (
                <option key={t.id} value={t.id}>{t.plateNumber}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchRute}
            className="p-3 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-xl transition-all border border-gray-100"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto flex-wrap">
          {["ALL", ...HARI_LIST].map((h) => (
            <button
              key={`filter-hari-${h}`}
              onClick={() => setFilterHari(h)}
              className={`px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${
                filterHari === h ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {h === "ALL" ? "Semua" : h.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* LIST RUTE */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center">
            <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="animate-spin text-[#4A6D55]" size={32} />
              <span className="italic text-sm font-medium">Memuat data rute...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400 italic text-sm">
            Belum ada rute yang cocok dengan filter.
          </div>
        ) : (
          paginatedRute.map((rute) => {
            const isExpanded = expandedId === rute.id;
            const isEditing = editingRuteId === rute.id;

            return (
              <div
                key={rute.id}
                className={`bg-white rounded-[24px] border transition-all ${
                  isExpanded
                    ? "border-green-200 shadow-lg ring-4 ring-green-50/60"
                    : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md"
                }`}
              >
                {/* HEADER CARD (sama seperti sebelumnya) */}
                <div className="p-5 md:p-6 flex items-center gap-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rute.id)}
                    className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                      isExpanded ? "bg-green-50 text-green-600" : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 shrink-0">
                    <Navigation size={18} className="text-[#4A6D55]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${HARI_COLOR[rute.dayOfWeek]}`}>
                        {rute.dayOfWeek}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm truncate">{rute.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Truck size={12} className="text-green-600" />
                        <span className="font-bold text-gray-700">{rute.truck.plateNumber}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-green-600" />
                        <span className="font-bold text-gray-700">{rute.totalWaypoint} Titik</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleToggle(rute.id, e)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        rute.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {rute.isActive ? <Power size={10} /> : <PowerOff size={10} />}
                      {rute.isActive ? "AKTIF" : "NONAKTIF"}
                    </button>
                    <div className="h-8 w-px bg-gray-100 hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => openEditRuteModal(rute, e)}
                        className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors inline-flex shadow-sm"
                        title="Edit Info Rute"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirm(rute.id, rute.name);
                        }}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex shadow-sm"
                        title="Hapus Rute"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* BODY EXPANDED (sama seperti asli, hanya mengganti toast dengan showAlert jika ada) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-6 md:p-8 bg-gray-50/40 rounded-b-[24px]">
                    {isEditing ? (
                      /* Mode Edit Waypoint (tidak berubah signifikan) */
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                        {/* LEFT: MAP + FORM TITIK */}
                        <div className="space-y-5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                            Konfigurasi Jalur Peta
                          </p>
                          <PetaWaypoint
                            key={editingRuteId ?? "peta"}
                            waypoints={localWaypoints}
                            onMapClick={handleMapClick}
                            selectedIdx={selectedWpIdx}
                            flyTo={mapFlyTo}
                          />
                          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            {/* Search bar */}
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                                Cari Lokasi / Nama Jalan
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                  <input
                                    type="text"
                                    placeholder="Contoh: Simpang Sibulele, Pasar Horas..."
                                    value={wpSearchQuery}
                                    onChange={(e) => setWpSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchWaypoint(); } }}
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSearchWaypoint}
                                  disabled={wpSearching || !wpSearchQuery.trim()}
                                  className="px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                                >
                                  {wpSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                  Cari
                                </button>
                              </div>
                            </div>
                            <div className="border-t border-gray-100" />
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                Nama Lokasi Titik
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Simpang Sibulele"
                                value={wpForm.name}
                                onChange={(e) => setWpForm((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium transition-all"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                  Latitude
                                </label>
                                <input
                                  type="text"
                                  placeholder="-6.200000"
                                  value={wpForm.latitude}
                                  onChange={(e) => setWpForm((p) => ({ ...p, latitude: e.target.value }))}
                                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-700 border border-gray-100 outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                  Longitude
                                </label>
                                <input
                                  type="text"
                                  placeholder="106.816666"
                                  value={wpForm.longitude}
                                  onChange={(e) => setWpForm((p) => ({ ...p, longitude: e.target.value }))}
                                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-700 border border-gray-100 outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleTambahWpLokal}
                              className="w-full py-3.5 bg-[#4A6D55] text-white rounded-2xl text-sm font-bold hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              <Plus size={18} /> Tambah ke Daftar Waypoint
                            </button>
                          </div>
                        </div>

                        {/* RIGHT: LIST WAYPOINT */}
                        <div className="flex flex-col h-full">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
                            Urutan Perjalanan ({localWaypoints.length})
                          </p>
                          <div className="flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1.5">
                            {localWaypoints.length === 0 ? (
                              <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                                <p className="text-sm text-gray-400 font-medium">
                                  Belum ada titik yang ditambahkan
                                </p>
                              </div>
                            ) : (
                              localWaypoints.map((wp, idx) => (
                                <div
                                  key={wp.id}
                                  onClick={() => setSelectedWpIdx(idx)}
                                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                                    selectedWpIdx === idx
                                      ? "bg-white border-green-500 shadow-md ring-1 ring-green-500/10"
                                      : "bg-white border-gray-100 hover:border-gray-200"
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 ${
                                    wp.name.toLowerCase().includes("tpa") ? "bg-[#1A2E35]" : "bg-[#064E3B]"
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{wp.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); moveWp(idx, "up"); }}
                                      disabled={idx === 0}
                                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-20"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); moveWp(idx, "down"); }}
                                      disabled={idx === localWaypoints.length - 1}
                                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-20"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleHapusWpLokal(idx); }}
                                      className="p-2 hover:bg-red-50 rounded-lg text-red-400"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={handleSimpanWaypoints}
                              disabled={savingWp}
                              className="flex-[2] py-3.5 bg-[#4A6D55] hover:bg-[#3a5643] text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {savingWp ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                              {savingWp ? "Menyimpan..." : "Simpan Semua Waypoint"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingRuteId(null); setLocalWaypoints([]); }}
                              className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mode View Waypoints */
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Titik Perjalanan ({rute.waypoints.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {rute.waypoints.map((wp, idx) => (
                            <div
                              key={wp.id}
                              className="flex items-center gap-3 bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm hover:border-green-200 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                                {idx + 1}
                              </div>
                              <span className="text-sm font-bold text-gray-700 truncate">{wp.name}</span>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => openWaypointEditor(rute)}
                            className="flex items-center justify-center gap-2 p-4 rounded-[20px] border border-dashed border-green-200 text-green-700 text-sm font-bold hover:bg-green-50 transition-all"
                          >
                            <MapPin size={16} /> Tambahkan Titik Rute
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

      {/* PAGINATION (sama seperti sebelumnya) */}
      {!loading && filtered.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl shadow-sm">
          <p className="text-xs text-gray-400 font-medium">
            Menampilkan{" "}
            <span className="font-bold text-gray-600">
              {(rutePage - 1) * RUTE_PER_PAGE + 1}–
              {Math.min(rutePage * RUTE_PER_PAGE, filtered.length)}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-gray-600">{filtered.length}</span>{" "}
            rute
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRutePage(1)}
              disabled={rutePage === 1}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setRutePage((p) => Math.max(1, p - 1))}
              disabled={rutePage === 1}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 mx-1">
              {rutePageNumbers.map((page, i) =>
                page < 0 ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs font-bold">…</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setRutePage(page)}
                    className={`min-w-[34px] h-[34px] rounded-lg text-xs font-bold transition-all ${
                      rutePage === page ? "bg-[#4A6D55] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setRutePage((p) => Math.min(ruteTotalPages, p + 1))}
              disabled={rutePage === ruteTotalPages}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={16} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => setRutePage(ruteTotalPages)}
              disabled={rutePage === ruteTotalPages}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL BUAT RUTE BARU (sama, hanya ada di sini) */}
      <AnimatePresence>
        {showModalRute && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md min-h-screen sm:min-h-0 overflow-hidden my-auto flex flex-col"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-extrabold text-lg text-gray-800">Registrasi Rute Baru</h3>
                <button onClick={() => setShowModalRute(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleBuatRute} className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* form fields sama seperti asli */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Pilih Armada Truk <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={formRute.truckId}
                      onChange={(e) => {
                        const truk = trukList.find((t) => t.id === e.target.value);
                        setFormRute((prev) => ({
                          ...prev,
                          truckId: e.target.value,
                          name: truk && prev.dayOfWeek ? `Rute ${truk.plateNumber} - ${prev.dayOfWeek}` : prev.name,
                        }));
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium appearance-none"
                    >
                      <option value="">Pilih plat nomor armada</option>
                      {trukList.map((t) => (
                        <option key={t.id} value={t.id}>{t.plateNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Hari Operasional <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {HARI_LIST.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const truk = trukList.find((t) => t.id === formRute.truckId);
                          setFormRute((p) => ({
                            ...p,
                            dayOfWeek: h,
                            name: truk ? `Rute ${truk.plateNumber} - ${h}` : p.name,
                          }));
                        }}
                        className={`py-3 text-[10px] font-black rounded-xl border transition-all ${
                          formRute.dayOfWeek === h
                            ? "border-[#4A6D55] bg-[#4A6D55] text-white shadow-lg"
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        {h.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Nama Rute <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formRute.name}
                      onChange={(e) => setFormRute((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Contoh: Rute BK 1234 AB - SENIN"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="pt-4 pb-4 sm:pb-0">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#4A6D55] text-white rounded-2xl font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Daftarkan Rute
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDIT INFO RUTE */}
      <AnimatePresence>
        {showModalEditRute && editingRuteInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md min-h-screen sm:min-h-0 overflow-hidden my-auto flex flex-col"
            >
              <div className="px-6 py-5 border-b flex justify-between items-center bg-amber-50">
                <div>
                  <h3 className="font-extrabold text-lg text-gray-800">Edit Info Rute</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">
                    Ubah armada, hari operasional, dan nama rute
                  </p>
                </div>
                <button onClick={() => { setShowModalEditRute(false); setEditingRuteInfo(null); }} className="p-2 text-gray-400 hover:bg-amber-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 pt-5">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <Navigation size={16} className="text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Rute yang diedit</p>
                    <p className="text-sm font-black text-gray-800 truncate mt-0.5">{editingRuteInfo.name}</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSimpanEditRute} className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Armada Truk
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={formEditRute.truckId}
                      onChange={(e) => {
                        const truk = trukList.find((t) => t.id === e.target.value);
                        setFormEditRute((prev) => ({
                          ...prev,
                          truckId: e.target.value,
                          name: truk ? `Rute ${truk.plateNumber} - ${prev.dayOfWeek}` : prev.name,
                        }));
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none text-sm font-medium appearance-none"
                    >
                      <option value="">Pilih plat nomor armada</option>
                      {trukList.map((t) => (
                        <option key={t.id} value={t.id}>{t.plateNumber}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1 ml-1 font-medium">
                    ⚠️ Mengubah armada tidak akan memindahkan waypoint secara otomatis
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Hari Operasional
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {HARI_LIST.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const truk = trukList.find((t) => t.id === formEditRute.truckId);
                          setFormEditRute((p) => ({
                            ...p,
                            dayOfWeek: h,
                            name: truk ? `Rute ${truk.plateNumber} - ${h}` : p.name,
                          }));
                        }}
                        className={`py-3 text-[10px] font-black rounded-xl border transition-all ${
                          formEditRute.dayOfWeek === h
                            ? "border-amber-500 bg-amber-500 text-white shadow-lg"
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        {h.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Nama Rute <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formEditRute.name}
                      onChange={(e) => setFormEditRute((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Contoh: Rute BK 1234 AB - SENIN"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="pt-4 pb-4 sm:pb-0 flex gap-3">
                  <button type="button" onClick={() => { setShowModalEditRute(false); setEditingRuteInfo(null); }} className="flex-1 px-6 py-4 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all border border-gray-200">
                    Batal
                  </button>
                  <button type="submit" disabled={savingEditRute} className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {savingEditRute ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
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