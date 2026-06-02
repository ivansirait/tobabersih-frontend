"use client";
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

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
  ChevronRight,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Operator {
  id: string;
  fullName: string;
  phoneNumber?: string;
}

interface TaskAktif {
  status: string;
  location?: string;
  district?: string;
}

interface Waypoint {
  urutan: number;
  nama: string;
  lat: number;
  lng: number;
}

interface RuteHariIni {
  hari: string;
  namaHari: string;
  waypoints: Waypoint[];
}

interface TrukAktif {
  id: string;
  plateNumber: string;
  status: string;          // 'BUSY' | 'AVAILABLE'
  currentLat: number | null;
  currentLong: number | null;
  lastPing: string | null;
  lastLocation: string | null;
  operator: Operator | null;
  taskAktif: TaskAktif | null;
  ruteHariIni: RuteHariIni | null;
}

interface TitikJalur {
  lat: number;
  lng: number;
  timestamp: string;
}

interface HistoryEntry {
  jalur: TitikJalur[];
  jarakTotalKm: number;
  durasiMenit: number;
  totalTitik: number;
  waktuMulai: string | null;
  waktuSelesai: string | null;
  ruteJadwal?: RuteHariIni | null;
}

// ============================================================
// CONSTANTS
// ============================================================
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = '/api';

// ─────────────────────────────────────────────
// HELPER: format durasi menit → "Xj Ym"
// ─────────────────────────────────────────────
function formatDurasi(menit: number): string {
  if (!menit || menit <= 0) return '-';
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  if (jam === 0) return `${sisa} menit`;
  return `${jam}j ${sisa}m`;
}

// ─────────────────────────────────────────────
// HELPER: apakah truk masih bekerja?
// Status BUSY = masih kerja, AVAILABLE = sudah selesai
// ─────────────────────────────────────────────
function isTrukAktif(truk: TrukAktif): boolean {
  return truk.status === 'BUSY';
}

// ─────────────────────────────────────────────
// KOMPONEN TIMELINE ITEM
// ─────────────────────────────────────────────
function TimelineItem({
  time,
  activity,
  status,
  icon,
}: {
  time: string;
  activity: string;
  status: 'mulai' | 'aktif' | 'proses' | 'selesai';
  icon: string;
}) {
  const statusColor = {
    mulai:   'bg-blue-100 text-blue-700 border-blue-300',
    aktif:   'bg-green-100 text-green-700 border-green-300',
    proses:  'bg-amber-100 text-amber-700 border-amber-300',
    selesai: 'bg-red-100 text-red-700 border-red-300',
  };
  const dotColor = {
    mulai:   'bg-blue-500',
    aktif:   'bg-green-500',
    proses:  'bg-amber-500',
    selesai: 'bg-red-500',
  };
  return (
    <div className="flex gap-4 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${dotColor[status]} shadow-sm`}>
          {icon}
        </div>
        <div className="w-0.5 h-12 bg-gray-200 mt-2 last:hidden" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-bold text-gray-600">{time}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor[status]}`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-700">{activity}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN TRACKING SUMMARY
// ─────────────────────────────────────────────
function TrackingSummary({ data }: {
  data: { totalLokasi: number; durasi: string; jarak: string; status: string };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-200">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600 font-semibold">Lokasi Update</p>
        <p className="text-2xl font-bold text-blue-600">{data?.totalLokasi || 0}</p>
      </div>
      <div className="bg-green-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600 font-semibold">Durasi Kerja</p>
        <p className="text-sm font-bold text-green-600">{data?.durasi || '-'}</p>
      </div>
      <div className="bg-amber-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600 font-semibold">Jarak Tempuh</p>
        <p className="text-sm font-bold text-amber-600">{data?.jarak || '-'}</p>
      </div>
      <div className="bg-purple-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600 font-semibold">Status</p>
        <p className={`text-xs font-bold ${data?.status === 'SELESAI' ? 'text-red-600' : 'text-green-600'}`}>
          {data?.status === 'SELESAI' ? '✓ Selesai' : '◆ Aktif'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN HISTORY CARD
// Multi-expand: setiap card bisa dibuka sendiri-sendiri
// Status berdasarkan truk.status (BUSY=aktif, AVAILABLE=selesai)
// ─────────────────────────────────────────────
function HistoryCard({
  truk,
  historyEntry,
  isExpanded,
  onToggle,
}: {
  truk: TrukAktif;
  historyEntry: HistoryEntry | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const jalur        = historyEntry?.jalur || [];
  const jarakKm      = historyEntry?.jarakTotalKm ?? 0;
  const durasiMenit  = historyEntry?.durasiMenit ?? 0;

  // Status berdasarkan truk.status — BUKAN dari waktuSelesai
  const sedangBekerja = isTrukAktif(truk);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-2xl">🚛</div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 truncate">{truk.plateNumber}</p>
            <p className="text-xs text-gray-500">{truk.operator?.fullName || 'No Driver'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            sedangBekerja
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}>
            {sedangBekerja ? '◆ Aktif' : '✓ Selesai'}
          </span>
          <ChevronRight
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          <TrackingSummary data={{
            totalLokasi: jalur.length,
            durasi:      formatDurasi(durasiMenit),
            jarak:       jarakKm > 0 ? `${jarakKm.toFixed(2)} km` : '-',
            status:      sedangBekerja ? 'AKTIF' : 'SELESAI',
          }} />

          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Timeline Titik Lokasi</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {jalur.length > 0 ? (
                jalur.map((titik, idx) => (
                  <TimelineItem
                    key={idx}
                    time={new Date(titik.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                    activity={`Titik #${idx + 1} — ${titik.lat.toFixed(5)}, ${titik.lng.toFixed(5)}`}
                    status={
                      idx === 0
                        ? 'mulai'
                        : idx === jalur.length - 1 && !sedangBekerja
                        ? 'selesai'
                        : 'aktif'
                    }
                    icon={['🚀', '📍', '🛣️', '✓'][idx % 4]}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Belum ada riwayat untuk tanggal ini</p>
                </div>
              )}
            </div>
          </div>

          {historyEntry?.waktuMulai && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Mulai:</span>
                <span className="font-bold">
                  {new Date(historyEntry.waktuMulai).toLocaleTimeString('id-ID', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              {historyEntry.waktuSelesai && (
                <div className="flex justify-between">
                  <span>Terakhir update:</span>
                  <span className="font-bold">
                    {new Date(historyEntry.waktuSelesai).toLocaleTimeString('id-ID', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN FLEET HISTORY SECTION
// expandedIds = Set<string> → banyak card bisa terbuka sekaligus
// ─────────────────────────────────────────────
function FleetHistorySection({
  trukList,
  selectedDate,
}: {
  trukList: TrukAktif[];
  selectedDate: string;
}) {
  const [historyData, setHistoryData]   = useState<Record<string, HistoryEntry>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Ubah dari single string → Set agar multi-expand
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllHistory();
  }, [selectedDate, trukList]);

  const fetchAllHistory = async () => {
    if (trukList.length === 0) return;
    setLoadingHistory(true);
    try {
      const token    = localStorage.getItem('token');
      const promises = trukList.map((truk) =>
        axios
          .get(`${API_URL}/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          })
          .then((res) => ({ success: true, data: res.data?.data }))
          .catch((err) => {
            console.warn(`Failed history ${truk.id}:`, err.message);
            return { success: false, data: null };
          })
      );
      const results = await Promise.all(promises);
      const newData: Record<string, HistoryEntry> = {};
      results.forEach((result, idx) => {
        newData[trukList[idx].id] = result.data
          ? {
              jalur:        result.data.jalur        || [],
              jarakTotalKm: result.data.jarakTotalKm ?? 0,
              durasiMenit:  result.data.durasiMenit  ?? 0,
              totalTitik:   result.data.totalTitik   ?? 0,
              waktuMulai:   result.data.waktuMulai   || null,
              waktuSelesai: result.data.waktuSelesai || null,
              ruteJadwal:   result.data.ruteJadwal   || null,
            }
          : { jalur: [], jarakTotalKm: 0, durasiMenit: 0, totalTitik: 0, waktuMulai: null, waktuSelesai: null };
      });
      setHistoryData(newData);
    } catch (error) {
      console.warn('fetchAllHistory error:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History size={24} /> Riwayat Perjalanan Armada
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Detail perjalanan setiap armada — {selectedDate}
          </p>
        </div>
        <button
          onClick={fetchAllHistory}
          disabled={loadingHistory}
          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm hover:bg-emerald-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loadingHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : trukList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-600 font-semibold">Tidak ada armada aktif</p>
          <p className="text-sm text-gray-500 mt-1">Armada akan tampil ketika mulai bekerja</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trukList.map((truk) => (
            <HistoryCard
              key={truk.id}
              truk={truk}
              historyEntry={historyData[truk.id] || null}
              isExpanded={expandedIds.has(truk.id)}
              onToggle={() => toggleExpand(truk.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN TAB LAPORAN SAMPAH
// ─────────────────────────────────────────────
function TabLaporan() {
  const [laporanList, setLaporanList]           = useState<any[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedStatus, setSelectedStatus]     = useState('semua');
  const [selectedKecamatan, setSelectedKecamatan] = useState('semua');
  const [kecamatanList, setKecamatanList]       = useState<string[]>([]);
  const [isClient, setIsClient]                 = useState(false);
  const [MapComponents, setMapComponents]       = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    loadLeaflet();
    fetchLaporan();
    fetchPolygons();
  }, []);

  const loadLeaflet = async () => {
    try {
      await import('leaflet/dist/leaflet.css');
      const L = (await import('leaflet')).default;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
      setMapComponents({ MapContainer, TileLayer, Marker, Popup, L });
    } catch (error) {
      console.error('Leaflet load error:', error);
    }
  };

  const fetchLaporan = async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await axios.get(`${API_URL}/laporan`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const data = res.data?.data || res.data || [];
      setLaporanList(data);
      const kecamatan = Array.from(
        new Set(data.map((l: any) => l.location?.name).filter(Boolean))
      ) as string[];
      setKecamatanList(kecamatan);
    } catch (error) {
      console.warn('Fetch laporan gagal:', error);
      setLaporanList([]);
    }
  };

  const fetchPolygons = async () => {
    try {
      await axios.get(`${API_URL}/wilayah/polygons`, { timeout: 5000 });
    } catch (error) {
      console.warn('Fetch polygons gagal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isClient || !MapComponents)
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents;

  const getMarkerIcon = (status: string) => {
    const color =
      status === 'PENDING' ? '#EF4444' : status === 'DITINDAKLANJUTI' ? '#3B82F6' : '#10B981';
    return L.divIcon({
      html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2)"></div>`,
      className: '',
      iconSize:  [20, 20],
    });
  };

  const filtered = laporanList.filter(
    (l) =>
      (selectedStatus === 'semua' || l.status === selectedStatus) &&
      (selectedKecamatan === 'semua' || l.location?.name === selectedKecamatan)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Laporan',  val: laporanList.length, color: 'text-gray-600',    bg: 'bg-gray-50',    icon: LayoutGrid    },
          { label: 'Pending',        val: laporanList.filter((l) => l.status === 'PENDING').length,          color: 'text-red-600',   bg: 'bg-red-50',   icon: AlertCircle   },
          { label: 'Diproses',       val: laporanList.filter((l) => l.status === 'DITINDAKLANJUTI').length,  color: 'text-blue-600',  bg: 'bg-blue-50',  icon: Clock         },
          { label: 'Selesai',        val: laporanList.filter((l) => l.status === 'SELESAI').length,          color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
              <Filter size={14} className="text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none text-gray-700"
              >
                <option value="semua">Semua Status</option>
                <option value="PENDING">Pending</option>
                <option value="DITINDAKLANJUTI">Diproses</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
              <MapIcon size={14} className="text-gray-400" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none text-gray-700"
              >
                <option value="semua">Semua Kecamatan</option>
                {kecamatanList.map((kec) => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={fetchLaporan} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="h-[600px] w-full">
          {laporanList.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-4xl mb-2">🗺️</p>
                <p className="text-gray-600 font-semibold">Data Laporan Tidak Tersedia</p>
                <p className="text-sm text-gray-500 mt-1">Pastikan server API berjalan</p>
                <button
                  onClick={fetchLaporan}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                >
                  🔄 Muat Ulang
                </button>
              </div>
            </div>
          ) : (
            <MapContainer center={[2.3333, 99.0]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
              {filtered.map((l) => (
                <Marker
                  key={l.id}
                  position={[parseFloat(l.latitude), parseFloat(l.longitude)]}
                  icon={getMarkerIcon(l.status)}
                >
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      {l.photoUrl && (
                        <img src={l.photoUrl} alt="Laporan" className="w-full h-24 object-cover rounded-lg mb-2" />
                      )}
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{l.description}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <MapIcon size={10} /> {l.location?.name}
                      </p>
                      <div className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                        l.status === 'PENDING'
                          ? 'bg-red-100 text-red-600'
                          : l.status === 'DITINDAKLANJUTI'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {l.status}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN TAB TRACKING
// ─────────────────────────────────────────────
function TabTracking() {
  const [trukList, setTrukList]           = useState<TrukAktif[]>([]);
  const [selectedTruk, setSelectedTruk]   = useState<TrukAktif | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [activeTab, setActiveTab]         = useState<'live' | 'rekaman'>('live');
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false);
  const [selectedDate, setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData]     = useState<Record<string, HistoryEntry>>({});
  const [socketStatus, setSocketStatus]   = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadLeaflet();
    fetchTrukAktif();

    // Socket.io connect langsung ke backend (bukan /api proxy)
    const socket = io(SOCKET_URL, {
      transports:          ['websocket', 'polling'],
      path:                '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay:   2000,
    });
    socketRef.current = socket;

    socket.on('connect',       () => setSocketStatus('connected'));
    socket.on('disconnect',    () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    // Update posisi truk real-time
    socket.on('truck_location_update', (data: {
      truckId: string; latitude: number; longitude: number; timestamp: string;
    }) => {
      setTrukList((prev) =>
        prev.map((t) =>
          t.id === data.truckId
            ? { ...t, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp }
            : t
        )
      );
      // Tambah titik ke historyData agar jalur biru langsung update
      setHistoryData((prev) => {
        const existing = prev[data.truckId];
        if (!existing) return prev;
        return {
          ...prev,
          [data.truckId]: {
            ...existing,
            jalur: [
              ...existing.jalur,
              { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp },
            ],
            waktuSelesai: data.timestamp,
          },
        };
      });
    });

    // Update status truk
    socket.on('truck_status_update', (data: { truckId: string; status: string }) => {
      if (data.status === 'AVAILABLE') {
        // Truk selesai → update status di list (jangan hapus, tetap tampil sebagai selesai)
        setTrukList((prev) =>
          prev.map((t) =>
            t.id === data.truckId ? { ...t, status: 'AVAILABLE' } : t
          )
        );
      } else {
        fetchTrukAktif();
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (trukList.length === 0) return;
    fetchAllHistory();
  }, [selectedDate, trukList.length]);

  const fetchAllHistory = async () => {
    setIsLoadingRiwayat(true);
    try {
      const token    = localStorage.getItem('token');
      const promises = trukList.map((truk) =>
        axios
          .get(`${API_URL}/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          })
          .then((res) => ({ success: true, data: res.data?.data }))
          .catch((err) => {
            console.warn(`Failed history ${truk.id}:`, err.message);
            return { success: false, data: null };
          })
      );
      const results  = await Promise.all(promises);
      const newData: Record<string, HistoryEntry> = {};
      results.forEach((result, idx) => {
        newData[trukList[idx].id] = result.data
          ? {
              jalur:        result.data.jalur        || [],
              jarakTotalKm: result.data.jarakTotalKm ?? 0,
              durasiMenit:  result.data.durasiMenit  ?? 0,
              totalTitik:   result.data.totalTitik   ?? 0,
              waktuMulai:   result.data.waktuMulai   || null,
              waktuSelesai: result.data.waktuSelesai || null,
              ruteJadwal:   result.data.ruteJadwal   || null,
            }
          : { jalur: [], jarakTotalKm: 0, durasiMenit: 0, totalTitik: 0, waktuMulai: null, waktuSelesai: null };
      });
      setHistoryData(newData);
    } catch (error) {
      console.warn('fetchAllHistory error:', error);
    } finally {
      setIsLoadingRiwayat(false);
    }
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
      const { MapContainer, TileLayer, Marker, Popup, Polyline } = await import('react-leaflet');
      setMapComponents({ MapContainer, TileLayer, Marker, Popup, Polyline, L });
    } catch (error) {
      console.error('Leaflet load error:', error);
    }
  };

  const fetchTrukAktif = async () => {
    try {
      const res = await axios.get(`${API_URL}/tracking/truk-aktif`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 10000,
      });
      if (res.data.success) {
        setTrukList(res.data.data);
      } else {
        setTrukList([]);
      }
    } catch (error: any) {
      console.error('Gagal fetch truk aktif:', error.message);
      setTrukList([]);
    }
  };

  const formatWaktu = (timestamp: string | null): string => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  const getStatusBadge = (status: string): string => {
    const badges: Record<string, string> = {
      SELESAI:          'bg-red-100 text-red-600',
      AKTIF:            'bg-green-100 text-green-600',
      PENDING:          'bg-yellow-100 text-yellow-600',
      DITINDAKLANJUTI:  'bg-blue-100 text-blue-600',
      DITERIMA:         'bg-blue-100 text-blue-600',
      DALAM_PERJALANAN: 'bg-purple-100 text-purple-600',
      TIBA:             'bg-orange-100 text-orange-600',
      BEKERJA:          'bg-emerald-100 text-emerald-600',
    };
    return badges[status] || 'bg-gray-100 text-gray-600';
  };

  if (!MapComponents)
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const { MapContainer, TileLayer, Marker, Popup, Polyline, L } = MapComponents;

  const getTrukIcon = (dipilih: boolean) =>
    L.divIcon({
      html: `<div style="background:${dipilih ? '#059669' : '#3b82f6'};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.15)">🚛</div>`,
      className: '',
      iconSize:   [32, 32],
      iconAnchor: [16, 16],
    });

  // Ikon waypoint rute (merah = belum dilalui)
  const getWaypointIcon = (label: string) =>
    L.divIcon({
      html: `<div style="background:#EF4444;color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${label}</div>`,
      className:  '',
      iconSize:   [24, 24],
      iconAnchor: [12, 12],
    });

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-2 w-fit">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'live' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🔴 Live Tracking
            </button>
            <button
              onClick={() => setActiveTab('rekaman')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'rekaman' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              📊 Rekaman Hasil
            </button>
          </div>

          {/* Indikator Socket.io */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <div className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected'    ? 'bg-green-500 animate-pulse'
              : socketStatus === 'connecting' ? 'bg-yellow-400 animate-pulse'
              : 'bg-red-500'
            }`} />
            <span className={
              socketStatus === 'connected'    ? 'text-green-600'
              : socketStatus === 'connecting' ? 'text-yellow-600'
              : 'text-red-500'
            }>
              {socketStatus === 'connected' ? 'Live' : socketStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <label className="font-semibold text-gray-700 text-sm whitespace-nowrap">Pilih Tanggal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={fetchTrukAktif}
            className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
            title="Refresh daftar truk"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[700px]">
        {/* SIDEBAR KIRI — daftar truk */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Armada Aktif</h3>
              <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold">
                {trukList.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trukList.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                <p className="text-2xl mb-2">🚛</p>
                Tidak ada truk aktif
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {trukList.map((truk) => (
                  <div
                    key={truk.id}
                    onClick={() => setSelectedTruk(truk)}
                    className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${
                      selectedTruk?.id === truk.id
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-xl">🚛</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900 truncate">{truk.plateNumber}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {truk.operator?.fullName || 'No Driver'}
                        </p>
                      </div>
                    </div>
                    {/* Status berdasarkan truk.status */}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                      isTrukAktif(truk) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {isTrukAktif(truk) ? '◆ Bekerja' : '✓ Selesai'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — PETA */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 w-full">
            <MapContainer
              center={[2.3333, 99.0632]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />

              {/* ── Untuk setiap truk: tampilkan marker + rute merah + jalur biru ── */}
              {trukList.map((truk) => {
                const entry    = historyData[truk.id];
                const jalur    = entry?.jalur || [];
                // Rute jadwal: ambil dari historyData atau dari trukAktif langsung
                const rute     = entry?.ruteJadwal || truk.ruteHariIni;
                const dipilih  = selectedTruk?.id === truk.id;

                return (
                  <span key={truk.id}>
                    {/* Marker posisi truk terkini */}
                    {truk.currentLat && (
                      <Marker
                        position={[truk.currentLat, truk.currentLong!]}
                        icon={getTrukIcon(dipilih)}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <p className="font-bold text-gray-900 mb-1">{truk.plateNumber}</p>
                            <p className="text-xs text-gray-600 mb-1">{truk.operator?.fullName}</p>
                            {truk.lastPing && (
                              <p className="text-xs text-gray-400 mb-2">Update: {formatWaktu(truk.lastPing)}</p>
                            )}
                            <p className="text-xs mb-2">
                              Status:{' '}
                              <span className={`font-bold ${isTrukAktif(truk) ? 'text-green-600' : 'text-red-500'}`}>
                                {isTrukAktif(truk) ? 'Bekerja' : 'Selesai'}
                              </span>
                            </p>
                            <button
                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps?q=${truk.currentLat},${truk.currentLong}`,
                                  '_blank'
                                )
                              }
                              className="w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                            >
                              📍 Google Maps
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/*
                      ── RUTE JADWAL (merah, garis putus-putus) ──
                      Selalu tampil jika truk punya rute hari ini.
                      Ini adalah jalur yang DIRENCANAKAN sebelum truk bergerak.
                    */}
                    {rute && rute.waypoints.length >= 2 && (
                      <Polyline
                        positions={rute.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number])}
                        color="#EF4444"
                        weight={3}
                        opacity={0.85}
                        dashArray="8 5"
                      />
                    )}

                    {/* Marker waypoint rute (hanya untuk truk yang dipilih agar tidak ramai) */}
                    {dipilih && rute && rute.waypoints.map((wp) => (
                      <Marker
                        key={`wp-${truk.id}-${wp.urutan}`}
                        position={[wp.lat, wp.lng]}
                        icon={getWaypointIcon(String(wp.urutan))}
                      >
                        <Popup>
                          <div className="p-1">
                            <p className="font-bold text-xs">{wp.nama}</p>
                            <p className="text-[10px] text-gray-500">Titik #{wp.urutan}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/*
                      ── JALUR GPS YANG SUDAH DILALUI (biru, solid) ──
                      Ini rekaman pergerakan nyata truk — berubah jadi biru
                      setelah truk update lokasi. Selalu tampil (bukan hanya truk dipilih)
                      agar semua truk di peta kelihatan jalurnya.
                    */}
                    {jalur.length >= 2 && (
                      <Polyline
                        positions={jalur.map((t) => [t.lat, t.lng] as [number, number])}
                        color="#2563EB"
                        weight={4}
                        opacity={0.85}
                      />
                    )}
                  </span>
                );
              })}
            </MapContainer>
          </div>

          {/* LEGEND */}
          <div className="bg-gray-50 p-3 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-center text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Truk Aktif
            </div>
            <div className="flex items-center gap-1.5 font-bold text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Terpilih
            </div>
            <div className="flex items-center gap-2 font-bold text-gray-600">
              <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="6 4"/></svg>
              Rute Jadwal
            </div>
            <div className="flex items-center gap-2 font-bold text-gray-600">
              <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke="#2563EB" strokeWidth="3"/></svg>
              Jalur GPS Dilalui
            </div>
          </div>
        </div>

        {/* SIDEBAR KANAN — riwayat ringkas */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History
                  size={16}
                  className={`text-gray-600 ${isLoadingRiwayat ? 'animate-spin' : ''}`}
                />
                <h3 className="font-bold text-gray-900 text-sm">Riwayat</h3>
              </div>
              {isLoadingRiwayat && (
                <span className="text-[9px] text-blue-600 font-semibold animate-pulse">Loading...</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingRiwayat ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-gray-100 rounded-lg animate-pulse h-24" />
                ))}
              </div>
            ) : trukList.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-xs text-gray-500">Belum ada armada</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {trukList.map((truk) => {
                  const entry    = historyData?.[truk.id];
                  const jalurCount = entry?.jalur?.length || 0;
                  const sedangAktif = isTrukAktif(truk);
                  return (
                    <div
                      key={truk.id}
                      onClick={() => setSelectedTruk(truk)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTruk?.id === truk.id
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-200 bg-gradient-to-br from-slate-50 to-gray-50 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="text-lg">🚛</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-gray-900 truncate">{truk.plateNumber}</p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {truk.operator?.fullName || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 text-[9px]">
                        <div className="flex justify-between">
                          <span className="text-gray-600">📍 Titik GPS:</span>
                          <span className="font-bold text-blue-600">{jalurCount}</span>
                        </div>
                        {entry && entry.jarakTotalKm > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">📏 Jarak:</span>
                            <span className="font-bold text-amber-600">
                              {entry.jarakTotalKm.toFixed(1)} km
                            </span>
                          </div>
                        )}
                        {truk.lastPing && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">🕐 Update:</span>
                            <span className="font-mono text-gray-700">{formatWaktu(truk.lastPing)}</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-gray-200 mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold ${
                            sedangAktif ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {sedangAktif ? '◆ Bekerja' : '✓ Selesai'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH RIWAYAT DETAIL */}
      <div className="border-t pt-6">
        <FleetHistorySection trukList={trukList} selectedDate={selectedDate} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────
export default function PetaSampah() {
  const [activeTab, setActiveTab] = useState<'laporan' | 'tracking'>('laporan');

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sistem GIS Monitoring</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Navigation size={16} /> Pantau titik sampah dan pergerakan armada secara real-time.
          </p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex gap-2">
          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'laporan' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MapIcon size={18} /> Laporan Sampah
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tracking' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Truck size={18} /> Tracking Armada
          </button>
        </div>
      </div>

      {activeTab === 'laporan' ? <TabLaporan /> : <TabTracking />}
    </div>
  );
}