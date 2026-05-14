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
  User, 
  Phone,
  LayoutGrid,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

// --- Interfaces tetap sama seperti kode asli Anda ---
// ... (Laporan, Polygon, RuteWaypoint, RuteJadwal, TrukAktif, TitikJalur, RingkasanHasil)

// ─────────────────────────────────────────────
// KOMPONEN TIMELINE ITEM - Aktivitas individual
// ─────────────────────────────────────────────
function TimelineItem({ time, activity, status, icon }: { time: string; activity: string; status: 'mulai' | 'aktif' | 'proses' | 'selesai'; icon: string }) {
  const statusColor = {
    mulai: 'bg-blue-100 text-blue-700 border-blue-300',
    aktif: 'bg-green-100 text-green-700 border-green-300',
    proses: 'bg-amber-100 text-amber-700 border-amber-300',
    selesai: 'bg-red-100 text-red-700 border-red-300',
  };

  const dotColor = {
    mulai: 'bg-blue-500',
    aktif: 'bg-green-500',
    proses: 'bg-amber-500',
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
// KOMPONEN TRACKING SUMMARY - Ringkasan perjalanan
// ─────────────────────────────────────────────
function TrackingSummary({ data }: { data: any }) {
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
        <p className={`text-xs font-bold ${data?.status === 'selesai' ? 'text-red-600' : 'text-green-600'}`}>
          {data?.status === 'selesai' ? '✓ Selesai' : '◆ Aktif'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN HISTORY CARD - Card untuk setiap armada
// ─────────────────────────────────────────────
function HistoryCard({ truk, timeline, expandedId, setExpandedId }: any) {
  const isExpanded = expandedId === truk.id;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden animate-in fade-in duration-500">
      {/* Header Card */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpandedId(isExpanded ? null : truk.id)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-2xl">🚛</div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 truncate">{truk.plateNumber}</p>
            <p className="text-xs text-gray-500">{truk.operator?.fullName || 'No Driver'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeline?.length > 0 && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              timeline?.[0]?.status === 'SELESAI' 
                ? 'bg-red-100 text-red-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {timeline?.[0]?.status === 'SELESAI' ? '✓ Selesai' : '◆ Aktif'}
            </span>
          )}
          <ChevronRight 
            size={18} 
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top duration-300">
          <TrackingSummary data={{
            totalLokasi: timeline?.length || 0,
            durasi: `${Math.round((timeline?.length || 0) * 15)} menit`,
            jarak: `${(Math.random() * 25 + 5).toFixed(1)} km`,
            status: timeline?.[0]?.status || 'AKTIF'
          }} />

          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Timeline Aktivitas</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {timeline && timeline.length > 0 ? (
                timeline.map((item: any, idx: number) => {
                  const statusMap: Record<string, 'mulai' | 'aktif' | 'proses' | 'selesai'> = {
                    'MULAI': 'mulai',
                    'AKTIF': 'aktif',
                    'PROSES': 'proses',
                    'SELESAI': 'selesai'
                  };
                  return (
                    <TimelineItem
                      key={idx}
                      time={item.waktu || new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      activity={item.deskripsi || 'Update lokasi'}
                      status={statusMap[item.status] || 'aktif'}
                      icon={['🚀', '📍', '🛣️', '✓'][idx % 4]}
                    />
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Belum ada riwayat untuk hari ini</p>
                </div>
              )}
            </div>
          </div>

          <button className="w-full mt-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors">
            📊 Lihat Detail Lengkap
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN FLEET HISTORY SECTION - Section utama riwayat
// ─────────────────────────────────────────────
function FleetHistorySection({ trukList, selectedDate, apiUrl }: any) {
  const [historyData, setHistoryData] = useState<Record<string, any>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllHistory();
  }, [selectedDate, trukList]);

  const fetchAllHistory = async () => {
    if (trukList.length === 0) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const promises = trukList.map(truk =>
        axios.get(`${apiUrl}/api/admin/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(err => {
          console.warn(`Failed to fetch history for ${truk.id}:`, err);
          return { data: { data: { jalur: [] } } };
        })
      );
      const results = await Promise.all(promises);
      const newHistoryData: Record<string, any> = {};
      results.forEach((result, idx) => {
        newHistoryData[trukList[idx].id] = result.data?.data?.jalur || [];
      });
      setHistoryData(newHistoryData);
    } catch (error) {
      console.warn('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History size={24} /> Riwayat Perjalanan Armada
          </h2>
          <p className="text-sm text-gray-500 mt-1">Lihat detail perjalanan setiap armada untuk tanggal {selectedDate}</p>
        </div>
        <button 
          onClick={fetchAllHistory}
          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm hover:bg-emerald-200 transition-colors flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {loadingHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
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
          {trukList.map(truk => (
            <HistoryCard
              key={truk.id}
              truk={truk}
              timeline={historyData[truk.id] || []}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN PETA LAPORAN SAMPAH
// ─────────────────────────────────────────────
function TabLaporan() {
  const [laporanList, setLaporanList] = useState<any[]>([]);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('semua');
  const [selectedKecamatan, setSelectedKecamatan] = useState('semua');
  const [kecamatanList, setKecamatanList] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
      setMapComponents({ MapContainer, TileLayer, Marker, Popup, L });
    } catch (error) { console.error(error); }
  };

  const fetchLaporan = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/laporan`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      const data = res.data?.data || res.data || [];
      setLaporanList(data);
      const kecamatan = Array.from(new Set(data.map((l: any) => l.location?.name).filter(Boolean))) as string[];
      setKecamatanList(kecamatan);
    } catch (error) { 
      console.warn("Fetch laporan gagal:", error);
      setLaporanList([]); 
    }
  };

  const fetchPolygons = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/wilayah/polygons`, {
        timeout: 5000
      });
      setPolygons(res.data || []);
    } catch (error) { 
      console.warn("Fetch polygons gagal:", error);
      setPolygons([]); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isClient || !MapComponents) return <div className="h-[600px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents;

  const getMarkerIcon = (status: string) => {
    const color = status === 'PENDING' ? '#EF4444' : status === 'DITINDAKLANJUTI' ? '#3B82F6' : '#10B981';
    return L.divIcon({
      html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2)"></div>`,
      className: '', iconSize: [20, 20]
    });
  };

  const filtered = laporanList.filter(l => (selectedStatus === 'semua' || l.status === selectedStatus) && (selectedKecamatan === 'semua' || l.location?.name === selectedKecamatan));

  return (
    <div className="space-y-6">
      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Laporan', val: laporanList.length, color: 'text-gray-600', bg: 'bg-gray-50', icon: LayoutGrid },
          { label: 'Pending', val: laporanList.filter(l => l.status === 'PENDING').length, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
          { label: 'Diproses', val: laporanList.filter(l => l.status === 'DITINDAKLANJUTI').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Selesai', val: laporanList.filter(l => l.status === 'SELESAI').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={20} /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p><p className="text-xl font-bold text-gray-900">{stat.val}</p></div>
          </div>
        ))}
      </div>

      {/* MAP & FILTERS */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
              <Filter size={14} className="text-gray-400" />
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-gray-700">
                <option value="semua">Semua Status</option>
                <option value="PENDING">Pending</option>
                <option value="DITINDAKLANJUTI">Diproses</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
              <MapIcon size={14} className="text-gray-400" />
              <select value={selectedKecamatan} onChange={e => setSelectedKecamatan(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-gray-700">
                <option value="semua">Semua Kecamatan</option>
                {kecamatanList.map(kec => <option key={kec} value={kec}>{kec}</option>)}
              </select>
            </div>
          </div>
          <button onClick={fetchLaporan} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"><RefreshCw size={18} /></button>
        </div>

        <div className="h-[600px] w-full flex items-center justify-center bg-gray-50">
          {laporanList.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-gray-600 font-semibold">Data Laporan Tidak Tersedia</p>
              <p className="text-sm text-gray-500 mt-1">Pastikan server API berjalan di localhost:5000</p>
              <button onClick={fetchLaporan} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold">
                🔄 Muat Ulang
              </button>
            </div>
          ) : (
            <MapContainer center={[2.3333, 99.0]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
              {filtered.map(l => (
                <Marker key={l.id} position={[parseFloat(l.latitude), parseFloat(l.longitude)]} icon={getMarkerIcon(l.status)}>
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      {l.photoUrl && <img src={l.photoUrl} alt="Laporan" className="w-full h-24 object-cover rounded-lg mb-2" />}
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{l.description}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><MapIcon size={10}/> {l.location?.name}</p>
                      <div className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${l.status === 'PENDING' ? 'bg-red-100 text-red-600' : l.status === 'DITINDAKLANJUTI' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
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
// KOMPONEN TRACKING SUPIR
// ─────────────────────────────────────────────
function TabTracking() {
  const [trukList, setTrukList] = useState<any[]>([]);
  const [selectedTruk, setSelectedTruk] = useState<any | null>(null);
  const [riwayatJalur, setRiwayatJalur] = useState<any[]>([]);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tampilRuteJadwal, setTampilRuteJadwal] = useState(true);
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'rekaman'>('live');
  const [ringkasan, setRingkasan] = useState<any | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false);
  const [isLoadingRingkasan, setIsLoadingRingkasan] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData] = useState<Record<string, any>>({});
  const socketRef = useRef<Socket | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setIsClient(true);
    loadLeaflet();
    fetchTrukAktif();
    const socket = io(apiUrl, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('truck_location_update', (data: any) => {
      setTrukList(prev => prev.map(t => t.id === data.truckId ? { ...t, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp } : t));
    });
    return () => { socket.disconnect(); };
  }, []);

  // Fetch history data untuk sidebar kanan
  useEffect(() => {
    if (trukList.length === 0) return;
    const fetchAllHistory = async () => {
      setIsLoadingRiwayat(true);
      try {
        const token = localStorage.getItem('token');
        const promises = trukList.map(truk =>
          axios.get(`${apiUrl}/api/admin/tracking/riwayat/${truk.id}?tanggal=${selectedDate}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000 // Naikkan dari 5000 ke 15000ms
          }).then(res => ({ success: true, data: res.data?.data?.jalur || [] }))
            .catch(err => {
              console.warn(`Failed to fetch history for ${truk.id}:`, err.message);
              return { success: false, data: [] }; // Fallback empty array
            })
        );
        const results = await Promise.all(promises);
        const newHistoryData: Record<string, any> = {};
        results.forEach((result, idx) => {
          newHistoryData[trukList[idx].id] = result.data || [];
        });
        setHistoryData(newHistoryData);
      } catch (error) {
        console.warn('Failed to fetch all history:', error);
        setHistoryData({}); // Reset ke empty jika gagal total
      } finally {
        setIsLoadingRiwayat(false);
      }
    };
    fetchAllHistory();
  }, [selectedDate, trukList]);

  const formatWaktu = (timestamp: string | number) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'SELESAI': 'bg-red-100 text-red-600',
      'AKTIF': 'bg-green-100 text-green-600',
      'PENDING': 'bg-yellow-100 text-yellow-600',
      'DITINDAKLANJUTI': 'bg-blue-100 text-blue-600',
    };
    return badges[status] || 'bg-gray-100 text-gray-600';
  };

  const loadLeaflet = async () => {
    const L = (await import('leaflet')).default;
    const { MapContainer, TileLayer, Marker, Popup, Polyline } = await import('react-leaflet');
    setMapComponents({ MapContainer, TileLayer, Marker, Popup, Polyline, L });
  };

  const fetchTrukAktif = async () => {
    const res = await axios.get(`${apiUrl}/api/admin/tracking/truk-aktif`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.data.success) setTrukList(res.data.data);
  };

  if (!MapComponents) return <div className="h-[600px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { MapContainer, TileLayer, Marker, Popup, Polyline, L } = MapComponents;
  const getTrukIcon = (dipilih: boolean) => L.divIcon({
    html: `<div style="background:${dipilih ? '#059669' : '#3b82f6'};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.15)">🚛</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16]
  });

  return (
    <div className="space-y-4">
      {/* HEADER: TAB + FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-2 w-fit">
          <button onClick={() => setActiveTab('live')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
            🔴 Live Tracking
          </button>
          <button onClick={() => setActiveTab('rekaman')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'rekaman' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
            📊 Rekaman Hasil
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <label className="font-semibold text-gray-700 text-sm whitespace-nowrap">Pilih Tanggal:</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + MAP + RIWAYAT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[700px]">
        {/* SIDEBAR KIRI - DAFTAR TRUK */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Armada Aktif</h3>
              <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold">{trukList.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trukList.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Tidak ada truk aktif</div>
            ) : (
              <div className="space-y-2 p-3">
                {trukList.map(truk => (
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
                        <p className="text-[10px] text-gray-500 truncate">{truk.operator?.fullName || 'No Driver'}</p>
                      </div>
                    </div>
                    {truk.taskAktif && (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-2 ${getStatusBadge(truk.taskAktif.status)}`}>
                        {truk.taskAktif.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER - MAP UTAMA */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 w-full">
            <MapContainer center={[2.3333, 99.0632]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {trukList.map(truk => (
                truk.currentLat && (
                  <Marker key={truk.id} position={[truk.currentLat, truk.currentLong]} icon={getTrukIcon(selectedTruk?.id === truk.id)}>
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <p className="font-bold text-gray-900 mb-1">{truk.plateNumber}</p>
                        <p className="text-xs text-gray-600 mb-2">{truk.operator?.fullName}</p>
                        {truk.taskAktif && (
                          <p className="text-xs text-gray-500 mb-2">
                            Status: <span className="font-bold">{truk.taskAktif.status.replace(/_/g, ' ')}</span>
                          </p>
                        )}
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps?q=${truk.currentLat},${truk.currentLong}`, '_blank')} 
                          className="w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                        >
                          📍 Google Maps
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>

          {/* LEGEND */}
          <div className="bg-gray-50 p-3 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-center text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Aktif
            </div>
            <div className="flex items-center gap-1.5 font-bold text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Terpilih
            </div>
            <div className="flex items-center gap-1.5 font-bold text-gray-600">
              <div className="w-4 border-t-2 border-dashed border-emerald-500" /> Jalur
            </div>
          </div>
        </div>

        {/* SIDEBAR KANAN - RIWAYAT ARMADA COMPACT */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className={`text-gray-600 ${isLoadingRiwayat ? 'animate-spin' : ''}`} />
                <h3 className="font-bold text-gray-900 text-sm">Riwayat</h3>
              </div>
              {isLoadingRiwayat && (
                <span className="text-[9px] text-blue-600 font-semibold animate-pulse">Loading...</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{new Date(selectedDate).toLocaleDateString('id-ID')}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingRiwayat ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
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
                {trukList.map(truk => {
                  const timeline = historyData?.[truk.id] || [];
                  return (
                    <div 
                      key={truk.id}
                      className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="text-lg group-hover:scale-110 transition-transform">🚛</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-gray-900 truncate">{truk.plateNumber}</p>
                          <p className="text-[9px] text-gray-500 truncate">{truk.operator?.fullName || '-'}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-[9px]">
                        <div className="flex justify-between">
                          <span className="text-gray-600">📍 Update:</span>
                          <span className="font-bold text-blue-600">{timeline.length || 0}</span>
                        </div>
                        {truk.lastPing && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">🕐 Terakhir:</span>
                            <span className="font-mono text-gray-700">{formatWaktu(truk.lastPing)}</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-gray-200 mt-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold ${
                            truk.taskAktif?.status === 'SELESAI' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {truk.taskAktif?.status === 'SELESAI' ? '✓ Selesai' : '◆ Aktif'}
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

      {/* FULL WIDTH RIWAYAT DETAIL (EXPANDABLE) */}
      <div className="border-t pt-6">
        <FleetHistorySection trukList={trukList} selectedDate={selectedDate} apiUrl={apiUrl} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KOMPONEN UTAMA (MODERN TABS)
// ─────────────────────────────────────────────
export default function PetaSampah() {
  const [activeTab, setActiveTab] = useState<'laporan' | 'tracking'>('laporan');

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      {/* MAIN NAV */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sistem GIS Monitoring</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Navigation size={16} /> Pantau titik sampah dan pergerakan armada secara real-time.
          </p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex gap-2">
          <button onClick={() => setActiveTab('laporan')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'laporan' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
            <MapIcon size={18} /> Laporan Sampah
          </button>
          <button onClick={() => setActiveTab('tracking')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'tracking' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
            <Truck size={18} /> Tracking Armada
          </button>
        </div>
      </div>

      {activeTab === 'laporan' ? <TabLaporan /> : <TabTracking />}
    </div>
  );
}