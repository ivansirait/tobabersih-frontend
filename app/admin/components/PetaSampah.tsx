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
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.data || res.data || [];
      setLaporanList(data);
      const kecamatan = Array.from(new Set(data.map((l: any) => l.location?.name).filter(Boolean))) as string[];
      setKecamatanList(kecamatan);
    } catch (error) { setLaporanList([]); }
  };

  const fetchPolygons = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/wilayah/polygons`);
      setPolygons(res.data || []);
    } catch (error) { setPolygons([]); } finally { setLoading(false); }
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

        <div className="h-[600px] w-full">
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
  const socketRef = useRef<Socket | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadLeaflet();
    fetchTrukAktif();
    const socket = io(apiUrl, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('truck_location_update', (data: any) => {
      setTrukList(prev => prev.map(t => t.id === data.truckId ? { ...t, currentLat: data.latitude, currentLong: data.longitude, lastPing: data.timestamp } : t));
    });
    return () => { socket.disconnect(); };
  }, []);

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* SIDEBAR TRUK */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Armada Aktif</h3>
            <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Live</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {trukList.map(truk => (
              <div key={truk.id} onClick={() => setSelectedTruk(truk)} className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${selectedTruk?.id === truk.id ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${selectedTruk?.id === truk.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400'}`}>🚛</div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{truk.plateNumber}</p>
                    <p className="text-[10px] text-gray-500 truncate uppercase tracking-tighter font-medium">{truk.operator?.fullName || 'No Driver'}</p>
                  </div>
                  <ChevronRight size={14} className={`ml-auto ${selectedTruk?.id === truk.id ? 'text-emerald-500' : 'text-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAP AREA */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-2 w-fit">
          <button onClick={() => setActiveTab('live')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Live tracking</button>
          <button onClick={() => setActiveTab('rekaman')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'rekaman' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Rekaman hasil</button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="h-[550px] w-full">
            <MapContainer center={[2.3333, 99.0632]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {trukList.map(truk => (
                truk.currentLat && <Marker key={truk.id} position={[truk.currentLat, truk.currentLong]} icon={getTrukIcon(selectedTruk?.id === truk.id)}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-gray-900">{truk.plateNumber}</p>
                      <p className="text-xs text-gray-500">{truk.operator?.fullName}</p>
                      <button onClick={() => window.open(`https://www.google.com/maps?q=${truk.currentLat},${truk.currentLong}`, '_blank')} className="mt-2 w-full py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">BUKA GOOGLE MAPS</button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* LEGEND */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full bg-blue-500" /> Aktif
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full bg-emerald-600" /> Terpilih
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <div className="w-8 border-t-2 border-dashed border-emerald-500" /> Jalur Aktual
            </div>
        </div>
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