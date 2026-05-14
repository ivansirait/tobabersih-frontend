"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus, Trash2, Edit3, MapPin, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, Save, X, Navigation, Truck, 
  RefreshCw, Search, ArrowUp, ArrowDown, Info
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
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

const HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
const HARI_COLOR: Record<string, string> = {
  SENIN: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  SELASA: 'bg-blue-50 text-blue-700 border-blue-100',
  RABU: 'bg-amber-50 text-amber-700 border-amber-100',
  KAMIS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  JUMAT: 'bg-rose-50 text-rose-700 border-rose-100',
  SABTU: 'bg-slate-50 text-slate-700 border-slate-100',
  MINGGU: 'bg-orange-50 text-orange-700 border-orange-100',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── Sub-komponen: Peta Leaflet Inline ──────────────────────
function PetaWaypoint({
  waypoints,
  onMapClick,
  selectedIdx,
}: {
  waypoints: Waypoint[];
  onMapClick: (lat: number, lng: number) => void;
  selectedIdx: number | null;
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
      await import('leaflet/dist/leaflet.css');
      const L = (await import('leaflet')).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [2.3333, 99.0632],
        zoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      (mapRef.current as any)._L = L;
      setIsReady(true);
    })();

    return () => { cancelled = true; };
  }, [onMapClick]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    const map = mapRef.current;
    const L = map._L;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null; }

    if (waypoints.length === 0) return;

    const latlngs: [number, number][] = [];

    waypoints.forEach((wp, idx) => {
      const isTPA = wp.name.toLowerCase().includes('tpa');
      const isSelected = idx === selectedIdx;
      const bg = isTPA ? '#1A2E35' : isSelected ? '#064E3B' : '#059669';

      const icon = L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:8px;width:24px;height:24px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center">${isTPA ? '🏁' : wp.order}</div>`,
        className: '',
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
        color: '#064E3B',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map);
    }

    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    }
  }, [waypoints, selectedIdx, isReady]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-inner group">
      <div ref={containerRef} style={{ height: '380px', width: '100%' }} />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[11px] font-bold text-[#1A2E35] shadow-lg border border-white/50 flex items-center gap-2">
        <Info size={14} className="text-green-600" />
        Klik peta untuk mengambil koordinat lokasi
      </div>
    </div>
  );
}

// ─── Komponen Utama ──────────────────────────────────────────
export default function ManajemenRute() {
  const [ruteList, setRuteList] = useState<RouteTemplate[]>([]);
  const [trukList, setTrukList] = useState<TrukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showModalRute, setShowModalRute] = useState(false);
  const [formRute, setFormRute] = useState({ truckId: '', dayOfWeek: '', name: '' });

  const [editingRuteId, setEditingRuteId] = useState<string | null>(null);
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>([]);
  const [selectedWpIdx, setSelectedWpIdx] = useState<number | null>(null);
  const [wpForm, setWpForm] = useState({ name: '', latitude: '', longitude: '' });
  const [savingWp, setSavingWp] = useState(false);

  const [filterTruk, setFilterTruk] = useState('');
  const [filterHari, setFilterHari] = useState('');

  const token = useCallback(() => localStorage.getItem('token'), []);

  const fetchRute = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterTruk) params.truckId = filterTruk;
      if (filterHari) params.hari = filterHari;

      const res = await axios.get(`${API}/api/rute`, {
        headers: { Authorization: `Bearer ${token()}` },
        params,
      });
      setRuteList(res.data.data || []);
    } catch (e) {
      toast.error('Gagal memuat data rute');
    } finally {
      setLoading(false);
    }
  }, [filterTruk, filterHari, token]);

  const fetchTruk = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/truks`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setTrukList(res.data.data || []);
    } catch (err) {
      console.error('Gagal fetch truk:', err);
    }
  }, [token]);

  useEffect(() => { fetchRute(); fetchTruk(); }, [fetchRute, fetchTruk]);

  const handleBuatRute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/rute`, formRute, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      toast.success('Rute berhasil dibuat');
      setShowModalRute(false);
      setFormRute({ truckId: '', dayOfWeek: '', name: '' });
      fetchRute();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat rute');
    }
  };

  const handleToggle = async (ruteId: string) => {
    try {
      await axios.patch(`${API}/api/rute/${ruteId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchRute();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleHapusRute = async (ruteId: string, name: string) => {
    if (!confirm(`Hapus rute "${name}"?`)) return;
    try {
      await axios.delete(`${API}/api/rute/${ruteId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      toast.success('Rute dihapus');
      fetchRute();
    } catch {
      toast.error('Gagal menghapus rute');
    }
  };

  const openWaypointEditor = (rute: RouteTemplate) => {
    setEditingRuteId(rute.id);
    setLocalWaypoints([...rute.waypoints]);
    setSelectedWpIdx(null);
    setWpForm({ name: '', latitude: '', longitude: '' });
    setExpandedId(rute.id);
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setWpForm(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  }, []);

  const handleTambahWpLokal = () => {
    if (!wpForm.name || !wpForm.latitude || !wpForm.longitude) {
      toast.error('Lengkapi data lokasi');
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
    setLocalWaypoints(prev => [...prev, newWp]);
    setWpForm({ name: '', latitude: '', longitude: '' });
  };

  const handleHapusWpLokal = (idx: number) => {
    setLocalWaypoints(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  const moveWp = (idx: number, dir: 'up' | 'down') => {
    setLocalWaypoints(prev => {
      const arr = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr.map((wp, i) => ({ ...wp, order: i + 1 }));
    });
  };

  const handleSimpanWaypoints = async () => {
    setSavingWp(true);
    try {
      await axios.post(`${API}/api/rute/${editingRuteId}/waypoint`, {
        bulk: localWaypoints.map(wp => ({
          name: wp.name,
          latitude: wp.latitude,
          longitude: wp.longitude,
          order: wp.order,
        })),
      }, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success('Waypoint disimpan');
      setEditingRuteId(null);
      fetchRute();
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSavingWp(false);
    }
  };

  const filtered = useMemo(() => ruteList.filter(r => {
    if (filterTruk && r.truckId !== filterTruk) return false;
    if (filterHari && r.dayOfWeek !== filterHari) return false;
    return true;
  }), [ruteList, filterTruk, filterHari]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 antialiased text-[#1A2E35]">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[32px] p-8 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase inline-block mb-3">
                Logistik & Navigasi
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight flex items-center gap-3">
                <Navigation className="text-[#064E3B]" size={32} />
                Manajemen Rute Armada
              </h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Atur titik angkut sampah dan alur perjalanan truk operasional
              </p>
            </div>
          </div>
        </div>
      </div>

<div className="flex justify-end">
  <button
    onClick={() => setShowModalRute(true)}
    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#064E3B] text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-green-900/10 hover:bg-[#053f30] active:scale-95"
  >
    <Plus size={18} /> Buat Rute Baru
  </button>
</div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-2">
          <Search size={16} /> Filter:
        </div>
        <div className="flex gap-3 flex-1">
          <select
            value={filterTruk}
            onChange={e => setFilterTruk(e.target.value)}
            className="px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none border border-transparent focus:bg-white focus:border-green-500/30 transition min-w-[180px]"
          >
            <option value="">Semua Armada</option>
            {trukList.map(t => <option key={t.id} value={t.id}>{t.plateNumber}</option>)}
          </select>
          <select
            value={filterHari}
            onChange={e => setFilterHari(e.target.value)}
            className="px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none border border-transparent focus:bg-white focus:border-green-500/30 transition min-w-[160px]"
          >
            <option value="">Semua Hari</option>
            {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <button
          onClick={fetchRute}
          className="p-3 bg-gray-50 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-xl transition-all border border-gray-100"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* LIST RUTE */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Sinkronisasi data rute...</p>
          </div>
        ) : filtered.map(rute => {
          const isExpanded = expandedId === rute.id;
          const isEditing = editingRuteId === rute.id;

          return (
            <div
              key={rute.id}
              className={`bg-white rounded-[28px] border transition-all duration-300 ${
                isExpanded 
                ? 'border-green-200 shadow-xl shadow-green-900/5 ring-4 ring-green-50/50' 
                : 'border-gray-100 shadow-sm hover:border-gray-200'
              }`}
            >
              <div className="p-6 flex items-center gap-5">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rute.id)}
                  className={`p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${HARI_COLOR[rute.dayOfWeek]}`}>
                      {rute.dayOfWeek}
                    </span>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{rute.name}</h3>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="flex items-center gap-2 text-xs text-gray-500">
                      <Truck size={14} className="text-green-600" /> 
                      <span className="font-bold text-gray-700">{rute.truck.plateNumber}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={14} className="text-green-600" /> 
                      <span className="font-bold text-gray-700">{rute.totalWaypoint} Titik</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold ${
                    rute.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {rute.isActive ? '● Aktif' : '○ Nonaktif'}
                  </span>
                  <div className="h-10 w-[1px] bg-gray-100 mx-1" />
                  <div className="flex gap-1.5">
                    <button onClick={() => openWaypointEditor(rute)} className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"><Edit3 size={20}/></button>
                    <button onClick={() => handleToggle(rute.id)} className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all">{rute.isActive ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button>
                    <button onClick={() => handleHapusRute(rute.id, rute.name)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-50 p-8 bg-gray-50/30 rounded-b-[28px]">
                  {isEditing ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Konfigurasi Jalur Peta</h4>
                        </div>
                        <PetaWaypoint waypoints={localWaypoints} onMapClick={handleMapClick} selectedIdx={selectedWpIdx} />
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Lokasi Titik</label>
                            <input
                              type="text"
                              placeholder="Contoh: Simpang Sibulele"
                              value={wpForm.name}
                              onChange={e => setWpForm(p => ({ ...p, name: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-bold transition"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Latitude</label>
                              <input type="text" value={wpForm.latitude} readOnly className="w-full px-4 py-3 bg-gray-100 rounded-xl text-xs font-mono text-gray-500 border-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Longitude</label>
                              <input type="text" value={wpForm.longitude} readOnly className="w-full px-4 py-3 bg-gray-100 rounded-xl text-xs font-mono text-gray-500 border-none" />
                            </div>
                          </div>
                          <button onClick={handleTambahWpLokal} className="w-full py-4 bg-[#1A2E35] text-white rounded-2xl text-sm font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                            <Plus size={18} /> Tambah ke Daftar Waypoint
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col h-full">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Urutan Perjalanan ({localWaypoints.length})</h4>
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-2 custom-scrollbar">
                          {localWaypoints.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                              <p className="text-sm text-gray-400 font-medium">Belum ada titik yang ditambahkan</p>
                            </div>
                          ) : localWaypoints.map((wp, idx) => (
                            <div
                              key={wp.id}
                              onClick={() => setSelectedWpIdx(idx)}
                              className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedWpIdx === idx ? 'bg-white border-green-500 shadow-md ring-1 ring-green-500/10' : 'bg-white border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                                wp.name.toLowerCase().includes('tpa') ? 'bg-[#1A2E35]' : 'bg-[#064E3B]'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{wp.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); moveWp(idx, 'up'); }} disabled={idx === 0} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-10"><ArrowUp size={16}/></button>
                                <button onClick={e => { e.stopPropagation(); moveWp(idx, 'down'); }} disabled={idx === localWaypoints.length - 1} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-10"><ArrowDown size={16}/></button>
                                <button onClick={e => { e.stopPropagation(); handleHapusWpLokal(idx); }} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><X size={16}/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={handleSimpanWaypoints}
                            disabled={savingWp}
                            className="flex-[2] py-4 bg-[#064E3B] hover:bg-[#053f30] text-white rounded-2xl font-bold shadow-lg shadow-green-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {savingWp ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                            {savingWp ? 'Menyimpan...' : 'Simpan Semua Waypoint'}
                          </button>
                          <button
                            onClick={() => { setEditingRuteId(null); setLocalWaypoints([]); }}
                            className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {rute.waypoints.map((wp, idx) => (
                        <div key={wp.id} className="flex items-center gap-3 bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm group hover:border-green-200 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-bold text-gray-700 truncate">{wp.name}</span>
                        </div>
                      ))}
                      <button onClick={() => openWaypointEditor(rute)} className="flex items-center justify-center gap-2 p-4 rounded-[20px] border border-dashed border-green-200 text-green-700 text-sm font-bold hover:bg-green-50 transition-all">
                        <Edit3 size={16} /> Edit Rute
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL BUAT RUTE */}
      {showModalRute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[36px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
            <div className="px-10 py-8 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-[#1A2E35] text-2xl">Registrasi Rute</h3>
                <button onClick={() => setShowModalRute(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-400">Tentukan armada dan hari operasional</p>
            </div>

            <form onSubmit={handleBuatRute} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Armada Truk</label>
                <select
                  value={formRute.truckId}
                  onChange={e => {
                    const truk = trukList.find(t => t.id === e.target.value);
                    setFormRute(prev => ({
                      ...prev,
                      truckId: e.target.value,
                      name: truk && prev.dayOfWeek ? `Rute ${truk.plateNumber} - ${prev.dayOfWeek}` : prev.name,
                    }));
                  }}
                  required
                  className="w-full px-5 py-4 bg-gray-50 border-none focus:ring-2 focus:ring-green-500/20 rounded-2xl text-sm font-bold outline-none transition"
                >
                  <option value="">Plat Nomor Armada</option>
                  {trukList.map(t => <option key={t.id} value={t.id}>{t.plateNumber}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hari Operasional</label>
                <div className="grid grid-cols-4 gap-2">
                  {HARI_LIST.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        const truk = trukList.find(t => t.id === formRute.truckId);
                        setFormRute(p => ({
                          ...p,
                          dayOfWeek: h,
                          name: truk ? `Rute ${truk.plateNumber} - ${h}` : p.name,
                        }));
                      }}
                      className={`py-3 text-[10px] font-black rounded-xl border transition-all ${
                        formRute.dayOfWeek === h
                          ? 'border-[#064E3B] bg-[#064E3B] text-white shadow-lg shadow-green-200'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {h.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Rute</label>
                <input
                  type="text"
                  value={formRute.name}
                  onChange={e => setFormRute(p => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-5 py-4 bg-gray-50 border-none focus:ring-2 focus:ring-green-500/20 rounded-2xl text-sm font-bold outline-none transition"
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-4 bg-[#064E3B] hover:bg-[#053f30] text-white font-bold rounded-2xl shadow-xl shadow-green-900/10 transition-all active:scale-95">
                  Daftarkan Rute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}