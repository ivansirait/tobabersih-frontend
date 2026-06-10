// app/kabid/monitoring-armada/page.tsx
  // PERBAIKAN UTAMA:
  //   1. Normalisasi field backend: taskAktif → tugasAktif (backend kirim "taskAktif")
  //   2. Semua truk (BUSY & non-BUSY) di-fetch — bukan hanya BUSY, agar marker muncul
  //   3. Socket.io real-time: posisi truk update langsung tanpa tunggu polling 30 detik
  //   4. Endpoint kabid mungkin pakai /kabid/monitoring-armada — normalisasi semua field
  //   5. Debug panel (toggle) untuk melihat raw data truk di console
  'use client';

  import { useState, useEffect, useCallback, useRef } from 'react';
  import axios from 'axios';
  import dynamic from 'next/dynamic';
  import {
    Truck, MapPin, RefreshCw, Activity, Gauge,
    TrendingUp, Compass, User, AlertCircle, X,
    History, Clock, Route, ChevronDown, ChevronUp, Wifi, WifiOff,
  } from 'lucide-react';
  import toast, { Toaster } from 'react-hot-toast';

<<<<<<< Updated upstream
const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL = rawBase ? rawBase.replace(/\/$/, '') + '/api' : 'http://localhost:5000/api';
// Dynamic import untuk peta (Leaflet) agar terhindar dari issue SSR Next.js
const MonitoringMap = dynamic(() => import('../components/MonitoringMap'), { ssr: false });
=======
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const SOCKET_URL   = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  // Lazy-load peta (no SSR)
  const MonitoringMap = dynamic(() => import('../components/MonitoringMap'), { ssr: false });
>>>>>>> Stashed changes

  // ── Tipe data ─────────────────────────────────────────────────────────────────
  interface TrailPoint {
    lat: number;
    lng: number;
    timestamp?: string;
  }

  interface HistoryEntry {
    jalur:        TrailPoint[];
    jarakTotalKm: number;
    durasiMenit:  number;
    totalTitik:   number;
    waktuMulai:   string | null;
    waktuSelesai: string | null;
  }

  // ── Utility ───────────────────────────────────────────────────────────────────
  const fmtTime = (ts: string | null) => {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '-'; }
  };

  /**
   * PERBAIKAN UTAMA: Normalisasi satu truk dari backend.
   *
   * Backend trackingController.getTrukAktif() mengembalikan field "taskAktif",
   * tapi page lama mengakses "tugasAktif" → undefined → popup & drawer kosong.
   *
   * Juga: currentLat/currentLong bisa berupa Decimal (Prisma) → perlu toString/Number.
   */
  const normalizeTruck = (raw: any): any => ({
    ...raw,
    id:          String(raw.id),
    // Koordinat — Prisma Decimal bisa berupa object, string, atau number
    currentLat:  raw.currentLat  != null ? String(raw.currentLat)  : null,
    currentLong: raw.currentLong != null ? String(raw.currentLong) : null,
    // Normalisasi field taskAktif → tugasAktif (frontend pakai "tugasAktif")
    tugasAktif:  raw.tugasAktif ?? raw.taskAktif ?? null,
    // Normalisasi nama supir dari berbagai field yang mungkin dikirim backend
    sopir:
      raw.sopir ||
      raw.operator?.fullName ||
      raw.operatorName ||
      null,
  });

  // ── Komponen kartu statistik ──────────────────────────────────────────────────
  function StatCard({ label, value, icon: Icon, border, bg }: {
    label: string; value: string | number;
    icon: any; border: string; bg: string;
  }) {
    return (
      <div className={`bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm ${border} border-l-[5px] flex items-center justify-between hover:shadow-md transition-all`}>
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 font-mono leading-none pt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
    );
  }

  // ── Panel riwayat GPS (collapsible) ───────────────────────────────────────────
  function RiwayatPanel({ truck, history, isLoading, selectedDate, onDateChange }: {
    truck: any;
    history: HistoryEntry | null;
    isLoading: boolean;
    selectedDate: string;
    onDateChange: (d: string) => void;
  }) {
    const jalur = history?.jalur ?? [];
    return (
      <div className="mt-4 bg-white rounded-[18px] border border-blue-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3.5 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-blue-600" />
            <h3 className="font-extrabold text-xs text-blue-900 uppercase tracking-wide">
              Riwayat Jalur GPS — {truck.plateNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-gray-400 py-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Memuat riwayat GPS...
            </div>
          ) : jalur.length === 0 ? (
            <div className="text-center py-5 text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-xs font-bold">Tidak ada data GPS pada tanggal ini</p>
              <p className="text-[11px] mt-1 text-gray-400">Truk belum melakukan perjalanan atau data belum tercatat</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Titik GPS',  value: history?.totalTitik ?? jalur.length,                         icon: '📍', cls: 'bg-blue-50 text-blue-700' },
                  { label: 'Jarak',      value: `${(history?.jarakTotalKm ?? 0).toFixed(1)} km`,             icon: '📏', cls: 'bg-amber-50 text-amber-700' },
                  { label: 'Mulai',      value: fmtTime(history?.waktuMulai ?? null),                        icon: '🟢', cls: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Selesai',    value: fmtTime(history?.waktuSelesai ?? null),                      icon: '🔴', cls: 'bg-red-50 text-red-700' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 ${s.cls} border border-white/60`}>
                    <div className="text-lg mb-0.5">{s.icon}</div>
                    <div className="text-[9px] font-black uppercase tracking-wide opacity-60">{s.label}</div>
                    <div className="font-extrabold text-sm font-mono mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-1.5">
                  <Clock size={11} className="text-gray-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                    Timeline ({jalur.length} titik)
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 scrollbar-none">
                  {jalur.slice(0, 50).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-1.5 hover:bg-blue-50/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="font-mono text-[10px] text-gray-500 w-10 shrink-0">
                        {p.timestamp ? fmtTime(p.timestamp) : `#${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-gray-500 tabular-nums">
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </span>
                    </div>
                  ))}
                  {jalur.length > 50 && (
                    <div className="px-4 py-2 text-center text-[10px] text-gray-400 font-bold">
                      +{jalur.length - 50} titik lainnya
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Halaman utama ─────────────────────────────────────────────────────────────
  export default function MonitoringArmada() {
    const [loading, setLoading]             = useState(true);
    const [armada, setArmada]               = useState<any[]>([]);
    const [statistik, setStatistik]         = useState<any>({});
    const [selectedTruck, setSelectedTruck] = useState<any>(null);
    const [isClient, setIsClient]           = useState(false);
    const [isConnected, setIsConnected]     = useState(false);

    // Riwayat GPS
    const [historyTrail, setHistoryTrail]   = useState<TrailPoint[]>([]);
    const [historyEntry, setHistoryEntry]   = useState<HistoryEntry | null>(null);
    const [isLoadingHist, setIsLoadingHist] = useState(false);
    const [selectedDate, setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
    const [showRiwayat, setShowRiwayat]     = useState(false);

    // Ref untuk armada (dipakai di socket callback tanpa stale closure)
    const armadaRef = useRef<any[]>([]);
    useEffect(() => { armadaRef.current = armada; }, [armada]);

    // ── Fetch data armada ────────────────────────────────────────────────────────
    const fetchArmada = useCallback(async () => {
      try {
        const token = localStorage.getItem('token');

        // PERBAIKAN: Coba endpoint kabid dulu, fallback ke endpoint tracking
        // Endpoint kabid mengembalikan semua truk (termasuk STANDBY)
        // Endpoint tracking hanya BUSY — ini penyebab truk tidak muncul!
        let data: any = null;

        try {
          const res = await axios.get(`${API_BASE_URL}/kabid/monitoring-armada`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          data = res.data?.data;
        } catch {
          // Fallback ke endpoint tracking jika kabid endpoint tidak ada
          const res = await axios.get(`${API_BASE_URL}/tracking/truk-aktif`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          data = { armada: res.data?.data ?? [], statistik: {} };
        }

        const rawArmada: any[] = data?.armada ?? data ?? [];
        const normalized = rawArmada.map(normalizeTruck);

        // Debug: log ke console untuk verifikasi data
        console.log('[MonitoringArmada] Data armada:', normalized.map(t => ({
          id:         t.id,
          plate:      t.plateNumber,
          status:     t.status,
          lat:        t.currentLat,
          lng:        t.currentLong,
          hasGPS:     t.currentLat != null && t.currentLong != null,
        })));

        setArmada(normalized);
        setStatistik(data?.statistik ?? {});
      } catch (err) {
        console.error('[MonitoringArmada] fetchArmada error:', err);
        toast.error('Gagal memuat data telemetri armada');
      } finally {
        setLoading(false);
      }
    }, []);

    // ── Socket.io real-time update posisi truk ───────────────────────────────────
    useEffect(() => {
      setIsClient(true);
      fetchArmada();
      const iv = setInterval(fetchArmada, 30_000);

      // Coba koneksi Socket.io untuk update real-time
      // Jika socket.io-client tidak di-install, gracefully skip
      let socket: any = null;
      const connectSocket = async () => {
        try {
          const { io } = await import('socket.io-client');
          const token = localStorage.getItem('token');
          socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
          });

          socket.on('connect', () => {
            setIsConnected(true);
            console.log('[Socket] Connected:', socket.id);
          });

          socket.on('disconnect', () => {
            setIsConnected(false);
          });

          // PERBAIKAN: Update posisi truk di state langsung saat event masuk
          // Ini yang membuat truk bergerak di peta real-time tanpa polling
          socket.on('truck_location_update', (payload: {
            truckId: string;
            latitude: number;
            longitude: number;
            timestamp: string;
          }) => {
            setArmada(prev => prev.map(t =>
              String(t.id) === String(payload.truckId)
                ? {
                    ...t,
                    currentLat:  String(payload.latitude),
                    currentLong: String(payload.longitude),
                    lastPing:    payload.timestamp,
                  }
                : t
            ));

            // Update selectedTruck juga jika yang update adalah truk yang dipilih
            setSelectedTruck((prev: any) => {
              if (!prev || String(prev.id) !== String(payload.truckId)) return prev;
              return {
                ...prev,
                currentLat:  String(payload.latitude),
                currentLong: String(payload.longitude),
                lastPing:    payload.timestamp,
              };
            });
          });

          // Update status truk (BUSY / AVAILABLE)
          socket.on('truck_status_update', (payload: {
            truckId: string;
            status: string;
            plateNumber: string;
          }) => {
            setArmada(prev => prev.map(t =>
              String(t.id) === String(payload.truckId)
                ? { ...t, status: payload.status }
                : t
            ));
            setSelectedTruck((prev: any) => {
              if (!prev || String(prev.id) !== String(payload.truckId)) return prev;
              return { ...prev, status: payload.status };
            });
          });

        } catch (e) {
          // socket.io-client tidak ada atau gagal koneksi — tidak masalah, polling tetap jalan
          console.warn('[Socket] Tidak bisa terhubung, pakai polling:', e);
        }
      };

      connectSocket();

      return () => {
        clearInterval(iv);
        if (socket) socket.disconnect();
      };
    }, [fetchArmada]);

    // ── Fetch riwayat jalur GPS ──────────────────────────────────────────────────
    const fetchHistory = useCallback(async (truckId: string, date: string) => {
      setIsLoadingHist(true);
      setHistoryTrail([]);
      setHistoryEntry(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${API_BASE_URL}/tracking/riwayat/${truckId}?tanggal=${date}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = res.data?.data;
        if (d) {
          const jalur: TrailPoint[] = (d.jalur || []).map((p: any) => ({
            lat:       typeof p.lat === 'number' ? p.lat : parseFloat(p.lat),
            lng:       typeof p.lng === 'number' ? p.lng : parseFloat(p.lng),
            timestamp: p.timestamp,
          }));
          setHistoryTrail(jalur);
          setHistoryEntry({
            jalur,
            jarakTotalKm: d.jarakTotalKm ?? 0,
            durasiMenit:  d.durasiMenit  ?? 0,
            totalTitik:   d.totalTitik   ?? jalur.length,
            waktuMulai:   d.waktuMulai   ?? null,
            waktuSelesai: d.waktuSelesai ?? null,
          });
        }
      } catch (e: any) {
        console.warn('[MonitoringArmada] Riwayat GPS:', e?.message);
      } finally {
        setIsLoadingHist(false);
      }
    }, []);

    const handleSelectTruck = useCallback((truck: any) => {
      const normalized = normalizeTruck(truck);
      setSelectedTruck(normalized);
      setShowRiwayat(false);
      fetchHistory(normalized.id, selectedDate);
      setTimeout(() => {
        document.getElementById('kbid-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    }, [fetchHistory, selectedDate]);

    const handleDateChange = useCallback((date: string) => {
      setSelectedDate(date);
      if (selectedTruck) fetchHistory(selectedTruck.id, date);
    }, [selectedTruck, fetchHistory]);

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium animate-pulse">Menghubungkan ke satelit GPS armada...</p>
        </div>
      );
    }

    // Hitung truk yang punya GPS valid untuk ditampilkan di header
    const trukDenganGPS = armada.filter(t => t.currentLat != null && t.currentLong != null).length;

    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 text-black antialiased">
        <Toaster position="top-right" />

        {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-6 md:p-8 shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 shadow-sm">
                <Compass size={12} /> Real-Time Fleet Management
              </span>
              {/* Indikator koneksi Socket.io */}
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isConnected ? 'Live Socket' : 'Polling 30s'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A2E35] tracking-tight uppercase">
              Monitoring Armada
            </h1>
            <p className="text-[#5B7078] text-sm mt-1 font-medium">
              Live tracking GPS, rute jadwal, dan riwayat perjalanan truk pengangkut sampah.
              {trukDenganGPS > 0 && (
                <span className="ml-2 text-emerald-700 font-bold">
                  • {trukDenganGPS}/{armada.length} truk aktif GPS
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchArmada}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#064E3B] text-white text-xs font-bold rounded-xl hover:bg-[#053f30] transition-all shadow-md active:scale-95 shrink-0"
          >
            <RefreshCw size={14} /> Segarkan Data GPS
          </button>
        </div>

        {/* ─── STATISTIK ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Armada"          value={armada.length}                                         icon={Truck}      border="border-blue-500"    bg="bg-blue-50 text-blue-600"      />
          <StatCard label="Perjalanan Hari Ini"   value={statistik.totalPerjalananHariIni ?? armada.filter((t: any) => t.status === 'BUSY').length} icon={Activity}   border="border-emerald-500" bg="bg-emerald-50 text-emerald-600" />
          <StatCard label="Rata-rata Ritase"      value={`${statistik.rataRataRitase ?? 0} Rit`}               icon={Gauge}      border="border-purple-500"  bg="bg-purple-50 text-purple-600"  />
          <StatCard label="GPS Aktif"             value={`${trukDenganGPS} Unit`}                               icon={TrendingUp} border="border-amber-500"   bg="bg-amber-50 text-amber-600"    />
        </div>

        {/* ─── PETA + SIDEBAR DAFTAR ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Peta (2/3) */}
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <h2 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="text-emerald-600" size={16} />
                Satelit Live Tracking Map
              </h2>
              {selectedTruck && (
                <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  ● Fokus: {selectedTruck.plateNumber}
                </span>
              )}
              {trukDenganGPS === 0 && (
                <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  ⚠ Belum ada truk dengan GPS aktif
                </span>
              )}
            </div>
            <div className="h-[520px] w-full relative">
              {isClient && (
                <MonitoringMap
                  trucks={armada}
                  onSelectTruck={handleSelectTruck}
                  selectedTruck={selectedTruck}
                  historyTrail={historyTrail}
                />
              )}
            </div>
          </div>

          {/* Sidebar daftar armada (1/3) */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[573px]">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h2 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="text-emerald-600" size={16} />
                Status Logistik Armada
              </h2>
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 scrollbar-none">
              {armada.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2 h-full">
                  <Truck size={36} className="text-gray-200" />
                  <span className="text-xs font-bold text-gray-500">Tidak Ada Data Armada</span>
                  <span className="text-[10px] text-gray-400">Coba segarkan data atau cek koneksi API</span>
                </div>
              ) : (
                armada.map((truck: any) => {
                  const isSelected = String(selectedTruck?.id) === String(truck.id);
                  const hasGPS     = truck.currentLat != null && truck.currentLong != null;
                  const hasRoute   = (truck.ruteHariIni?.waypoints?.length ?? 0) > 0;
                  const namaSopir  = truck.sopir || 'Supir belum ditugaskan';

                  return (
                    <div
                      key={truck.id}
                      onClick={() => handleSelectTruck(truck)}
                      className={`p-4 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-600'
                          : 'border-transparent hover:bg-gray-50 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-extrabold text-sm text-gray-900 tracking-tight font-mono">
                            {truck.plateNumber}
                          </p>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <User size={12} className="text-gray-400" />
                            {namaSopir}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-md tracking-wide uppercase ${
                          truck.status === 'BUSY'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {truck.status === 'BUSY' ? 'DI JALAN' : 'STANDBY'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {hasGPS ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            GPS Aktif
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            GPS Tidak Aktif
                          </div>
                        )}
                        {hasRoute && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                            <Route size={9} />
                            {truck.ruteHariIni.waypoints.length} titik rute
                          </div>
                        )}
                      </div>

                      {truck.tugasAktif && (
                        <div className="mt-2 text-[11px] bg-white border border-gray-100 p-2 rounded-lg text-gray-600">
                          <span className="font-bold text-gray-400 block uppercase text-[8px] tracking-wider mb-0.5">
                            Destinasi Tugas
                          </span>
                          <p className="line-clamp-1 font-medium">{truck.tugasAktif.location}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── DRAWER DETAIL TRUK ─────────────────────────────────────────────── */}
        {selectedTruck && (
          <div
            id="kbid-drawer"
            className="bg-white rounded-[24px] border border-gray-200 shadow-xl relative overflow-hidden"
          >
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

            <div className="p-5 md:p-6">
              <button
                onClick={() => { setSelectedTruck(null); setHistoryTrail([]); setHistoryEntry(null); }}
                className="absolute right-4 top-5 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              {/* ── Header ── */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-gray-900 font-mono tracking-tight">
                      {selectedTruck.plateNumber}
                    </h2>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md tracking-wide uppercase ${
                      selectedTruck.status === 'BUSY'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {selectedTruck.status === 'BUSY' ? 'Operasional' : 'Siaga Pul'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-1">
                    <User size={13} className="text-gray-400" />
                    Driver:{' '}
                    <span className="text-gray-800 font-bold">
                      {selectedTruck.sopir || selectedTruck.operator?.fullName || '-'}
                    </span>
                  </p>
                  {/* Koordinat saat ini untuk debug */}
                  {selectedTruck.currentLat && (
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      📍 {parseFloat(selectedTruck.currentLat).toFixed(5)}, {parseFloat(selectedTruck.currentLong).toFixed(5)}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setShowRiwayat(v => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all"
                >
                  <History size={13} />
                  {showRiwayat ? 'Sembunyikan' : 'Lihat'} Riwayat GPS
                  {showRiwayat ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* ── Metrik dari riwayat nyata ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">
                    Jarak Tempuh Hari Ini
                  </span>
                  <p className="text-lg font-extrabold text-gray-800 font-mono">
                    {historyEntry
                      ? historyEntry.jarakTotalKm.toFixed(1)
                      : isLoadingHist ? '…' : '—'}
                    <span className="text-xs text-gray-400 font-sans font-bold ml-1">km</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">
                    Titik GPS Terekam
                  </span>
                  <p className="text-lg font-extrabold text-gray-800 font-mono">
                    {historyEntry ? historyEntry.totalTitik : isLoadingHist ? '…' : '—'}
                    <span className="text-xs text-gray-400 font-sans font-bold ml-1">titik</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">
                    Durasi Operasional
                  </span>
                  <p className="text-lg font-extrabold text-gray-800 font-mono">
                    {historyEntry?.durasiMenit
                      ? `${Math.floor(historyEntry.durasiMenit / 60)}j : ${String(historyEntry.durasiMenit % 60).padStart(2, '0')}m`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* ── Rute jadwal hari ini ── */}
              {selectedTruck.ruteHariIni && (
                <div className="mb-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                    <Route size={14} /> Rute Jadwal — {selectedTruck.ruteHariIni.namaHari}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTruck.ruteHariIni.waypoints.map((wp: any, idx: number) => {
                      const isFirst = idx === 0;
                      const isLast  = idx === selectedTruck.ruteHariIni.waypoints.length - 1;
                      const nama    = wp.nama ?? wp.name ?? `Titik ${idx + 1}`;
                      return (
                        <span key={idx} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                          isFirst ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : isLast ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-white text-emerald-700 border-emerald-200'
                        }`}>
                          <span className="font-black">{idx + 1}.</span>
                          {nama}
                          {isFirst && ' 🏁'}
                          {isLast && ' 📍'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Manifes tugas aktif ── */}
              {selectedTruck.tugasAktif && (
                <div className="mb-4 bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                    <AlertCircle size={14} /> Manifes Tugas Pengangkutan
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                    <p>
                      <span className="font-bold text-gray-400 uppercase text-[9px] block mb-0.5">Titik Sektor Muatan</span>
                      {selectedTruck.tugasAktif.location}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400 uppercase text-[9px] block mb-0.5">Waktu Keberangkatan</span>
                      {new Date(selectedTruck.tugasAktif.scheduledAt).toLocaleString('id-ID', {
                        dateStyle: 'medium', timeStyle: 'short',
                      })} WIB
                    </p>
                  </div>
                </div>
              )}

              {/* ── Panel riwayat GPS (collapsible) ── */}
              {showRiwayat && (
                <RiwayatPanel
                  truck={selectedTruck}
                  history={historyEntry}
                  isLoading={isLoadingHist}
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }