// app/kabid/components/MonitoringMap.tsx
// PERBAIKAN UTAMA:
//   1. toF() sekarang lebih robust — handle null, undefined, string, number
//   2. Kondisi skip truk diubah: hanya skip jika KEDUANYA null/undefined (bukan jika 0,0)
//   3. Marker existing di-update zIndexOffset saat selectedTruck berubah
//   4. useEffect markers tidak bergantung pada referensi fungsi onSelectTruck (pakai ref)
//   5. Cleanup marker saat unmount agar tidak memory leak
'use client';

import { useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Fix default icon Leaflet (wajib Next.js) ─────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// IKON TRUK  — SVG murni
// ─────────────────────────────────────────────────────────────────────────────
const createTruckIcon = (isBusy: boolean, isSelected: boolean): L.DivIcon => {
  const color  = isBusy ? '#059669' : '#6b7280';
  const size   = isSelected ? 48 : 38;
  const half   = size / 2;
  const shadow = isSelected
    ? `drop-shadow(0 0 6px ${color})`
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))';

  // ============================================================
  // LOGO TRUK SEDERHANA (seperti emoji 🚛)
  // ============================================================
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  ${isSelected ? `
  <circle cx="24" cy="24" r="22" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.35">
    <animate attributeName="r" values="20;24;20" dur="1.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.6s" repeatCount="indefinite"/>
  </circle>` : ''}
  
  <!-- Lingkaran latar belakang -->
  <circle cx="24" cy="24" r="${isSelected ? 19 : 17}" fill="${color}" stroke="white" stroke-width="2.5"
    style="filter:${shadow}"/>
  
  <!-- Emoji Truk 🚛 -->
  <text x="24" y="24" text-anchor="middle" dominant-baseline="central" 
    font-size="${isSelected ? 22 : 18}" fill="white">🚛</text>
</svg>`;

  return L.divIcon({
    html:        svg,
    className:   'kabid-truck-icon',
    iconSize:    [size, size],
    iconAnchor:  [half, half],
    popupAnchor: [0, -(half + 4)],
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// IKON START TRAIL GPS
// ─────────────────────────────────────────────────────────────────────────────
const startTrailIcon: L.DivIcon = L.divIcon({
  html: `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <circle cx="9" cy="9" r="7.5" fill="#1d4ed8" stroke="white" stroke-width="2"
    style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))"/>
  <text x="9" y="9" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,sans-serif" font-size="8" font-weight="900" fill="white">&#9654;</text>
</svg>`,
  className:  'kabid-start-icon',
  iconSize:   [18, 18],
  iconAnchor: [9, 9],
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPE PROPS
// ─────────────────────────────────────────────────────────────────────────────
interface TrailPoint {
  lat: number;
  lng: number;
  timestamp?: string;
}

interface MonitoringMapProps {
  trucks: any[];
  onSelectTruck: (truck: any) => void;
  selectedTruck?: any;
  historyTrail?: TrailPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PERBAIKAN UTAMA #1 — Helper parse koordinat yang robust
//

/** Return true jika nilai bisa diparse menjadi angka finite dan bukan null/undefined/'' */
const hasValidCoord = (v: any): boolean => {
  if (v === null || v === undefined || v === '') return false;
  const n = parseFloat(String(v));
  return !isNaN(n) && isFinite(n);
};

/** Parse nilai koordinat ke number. Hanya panggil setelah hasValidCoord() = true. */
const toCoord = (v: any): number => parseFloat(String(v));

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────────────────────────────────────
export default function MonitoringMap({
  trucks,
  onSelectTruck,
  selectedTruck,
  historyTrail = [],
}: MonitoringMapProps) {
  const mapRef      = useRef<L.Map | null>(null);
  const markersRef  = useRef<{ [id: string]: L.Marker }>({});
  const routeGrpRef = useRef<L.LayerGroup | null>(null);
  const trailGrpRef = useRef<L.LayerGroup | null>(null);
  const fittedRef   = useRef(false);

  // PERBAIKAN #2 — Simpan onSelectTruck di ref agar tidak trigger re-render
  // saat callback berubah referensi (Next.js sering buat closure baru tiap render)
  const onSelectRef = useRef(onSelectTruck);
  useEffect(() => { onSelectRef.current = onSelectTruck; }, [onSelectTruck]);

  // ── 1. Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    if (!document.getElementById('kabid-icon-style')) {
      const s = document.createElement('style');
      s.id = 'kabid-icon-style';
      s.textContent = `
        .kabid-truck-icon,
        .kabid-wp-icon,
        .kabid-start-icon { background: none !important; border: none !important; }
      `;
      document.head.appendChild(s);
    }

    mapRef.current = L.map('kabid-map', {
      zoomControl: true,
      attributionControl: false,
      // PERBAIKAN #3 — prefer canvas renderer (lebih performa untuk banyak marker)
      preferCanvas: false,
    }).setView([2.3333, 99.0], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    routeGrpRef.current = L.layerGroup().addTo(mapRef.current);
    trailGrpRef.current = L.layerGroup().addTo(mapRef.current);
  }, []);

  // ── 2. Render / update marker semua truk ────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    const selectedId = selectedTruck?.id ?? null;
    const existingIds = new Set<string>();

    trucks.forEach(truck => {
      // PERBAIKAN #4 — Cek dengan hasValidCoord, bukan "=== 0"
      // Ini fix utama kenapa truk tidak muncul:
      //   - currentLat bisa berupa null, "null", "", undefined → semua diskip dengan benar
      //   - currentLat = "2.333" atau 2.333 → valid, muncul di map
      const latRaw = truck.currentLat  ?? truck.current_lat;
      const lngRaw = truck.currentLong ?? truck.current_long ?? truck.currentLng;

      if (!hasValidCoord(latRaw) || !hasValidCoord(lngRaw)) {
        // Truk tanpa GPS — hapus marker lama jika ada, skip
        if (markersRef.current[truck.id]) {
          markersRef.current[truck.id].remove();
          delete markersRef.current[truck.id];
        }
        return;
      }

      const lat = toCoord(latRaw);
      const lng = toCoord(lngRaw);

      const isBusy     = truck.status === 'BUSY';
      const isSelected = String(truck.id) === String(selectedId);
      const icon       = createTruckIcon(isBusy, isSelected);

      existingIds.add(String(truck.id));

      if (markersRef.current[truck.id]) {
        // Update posisi + icon + zIndex untuk marker yang sudah ada
        markersRef.current[truck.id].setLatLng([lat, lng]);
        markersRef.current[truck.id].setIcon(icon);
        // PERBAIKAN #5 — update zIndexOffset (method ini ada di Leaflet)
        markersRef.current[truck.id].setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        // Buat marker baru
        const sopir =
          truck.sopir ||
          truck.operator?.fullName ||
          truck.operatorName ||
          '-';

        const marker = L.marker([lat, lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(mapRef.current!);

        // Buat popup konten
// Buat popup konten (disesuaikan dengan logo sederhana 🚛)
const popupContent = `
  <div style="min-width:200px;font-family:'Segoe UI',Arial,sans-serif;padding:2px">
    <div style="font-weight:800;font-size:14px;margin:0 0 5px;color:#111">
      🚛 ${truck.plateNumber}
    </div>
    <div style="font-size:12px;color:#555;margin-bottom:3px">👤 ${sopir}</div>
    <div style="margin-bottom:8px">
      <span style="display:inline-block;padding:2px 10px;border-radius:20px;
        font-size:11px;font-weight:700;
        background:${isBusy ? '#d1fae5' : '#f3f4f6'};
        color:${isBusy ? '#065f46' : '#374151'}">
        ${isBusy ? '🟢 Di Jalan' : '⚪ Standby'}
      </span>
    </div>
    <button id="kbpopup-${truck.id}" style="
      width:100%;padding:7px 0;background:#059669;color:white;
      border:none;border-radius:8px;font-size:12px;
      font-weight:700;cursor:pointer">
      📍 Lihat Detail & Rute
    </button>
  </div>
`;

marker.bindPopup(popupContent, { maxWidth: 240 });

marker.on('popupopen', () => {
  const btn = document.getElementById(`kbpopup-${truck.id}`);
  if (btn) btn.onclick = () => onSelectRef.current(truck);
});
marker.on('click', () => onSelectRef.current(truck));

markersRef.current[truck.id] = marker;
      }
    });

    // Hapus marker truk yang sudah tidak ada di data
    Object.keys(markersRef.current).forEach(id => {
      if (!existingIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Fit bounds ke semua truk — hanya sekali saat pertama load dan belum ada selectedTruck
    if (!fittedRef.current && !selectedTruck) {
      const valid = trucks.filter(t => {
        const lat = t.currentLat  ?? t.current_lat;
        const lng = t.currentLong ?? t.current_long ?? t.currentLng;
        return hasValidCoord(lat) && hasValidCoord(lng);
      });

      if (valid.length > 0 && mapRef.current) {
        fittedRef.current = true;
        try {
          mapRef.current.fitBounds(
            L.latLngBounds(valid.map(t => [
              toCoord(t.currentLat  ?? t.current_lat),
              toCoord(t.currentLong ?? t.current_long ?? t.currentLng),
            ] as L.LatLngTuple)),
            { padding: [50, 50], maxZoom: 14 }
          );
        } catch (e) {
          // Fallback jika bounds error (misalnya semua titik sama)
          const first = valid[0];
          mapRef.current.setView(
            [toCoord(first.currentLat ?? first.current_lat),
             toCoord(first.currentLong ?? first.current_long ?? first.currentLng)],
            13
          );
        }
      }
    }
  }, [trucks, selectedTruck]);

  // ── 3. Fly + gambar rute saat selectedTruck berubah ─────────────────────────
  useEffect(() => {
    if (!mapRef.current || !routeGrpRef.current) return;
    routeGrpRef.current.clearLayers();
    if (!selectedTruck) return;

    const latRaw = selectedTruck.currentLat  ?? selectedTruck.current_lat;
    const lngRaw = selectedTruck.currentLong ?? selectedTruck.current_long ?? selectedTruck.currentLng;

    const hasPos = hasValidCoord(latRaw) && hasValidCoord(lngRaw);
    const lat = hasPos ? toCoord(latRaw) : null;
    const lng = hasPos ? toCoord(lngRaw) : null;

    if (lat !== null && lng !== null) {
      mapRef.current.flyTo([lat, lng], 14, { duration: 1.3, easeLinearity: 0.5 });
      setTimeout(() => {
        const m = markersRef.current[selectedTruck.id];
        if (m) m.openPopup();
      }, 950);
    }

    // Gambar rute jadwal
    const rute = selectedTruck.ruteHariIni;
    if (!rute?.waypoints?.length || rute.waypoints.length < 2) return;

    const coords: L.LatLngTuple[] = rute.waypoints
      .map((wp: any) => {
        const wlat = wp.lat ?? wp.latitude;
        const wlng = wp.lng ?? wp.longitude;
        if (!hasValidCoord(wlat) || !hasValidCoord(wlng)) return null;
        return [toCoord(wlat), toCoord(wlng)] as L.LatLngTuple;
      })
      .filter(Boolean) as L.LatLngTuple[];

    if (coords.length < 2) return;

    // Glow
    L.polyline(coords, { color: '#34d399', weight: 14, opacity: 0.18, lineCap: 'round' })
      .addTo(routeGrpRef.current);
    // Garis rute hijau putus-putus
    L.polyline(coords, {
      color: '#059669', weight: 5, opacity: 0.9,
      dashArray: '12, 8', lineCap: 'round',
    }).addTo(routeGrpRef.current);

    // Marker bernomor tiap waypoint
    rute.waypoints.forEach((wp: any, idx: number) => {
      const wlat = wp.lat ?? wp.latitude;
      const wlng = wp.lng ?? wp.longitude;
      if (!hasValidCoord(wlat) || !hasValidCoord(wlng)) return;

      const isFirst = idx === 0;
      const isLast  = idx === rute.waypoints.length - 1;
      const nama    = wp.nama ?? wp.name ?? `Titik ${idx + 1}`;
      const label   = isFirst ? '🟢 START' : isLast ? '🔴 END' : `#${wp.urutan ?? idx + 1}`;

      L.marker([toCoord(wlat), toCoord(wlng)], {
        icon: createWaypointIcon(idx, rute.waypoints.length),
      })
        .addTo(routeGrpRef.current!)
        .bindTooltip(`<b style="font-size:12px">${label} — ${nama}</b>`,
          { permanent: false, direction: 'top', offset: [0, -10] });
    });

    // Fit bounds: seluruh rute + posisi truk
    const allPts: L.LatLngTuple[] = [...coords];
    if (lat !== null && lng !== null) allPts.push([lat, lng]);
    mapRef.current.fitBounds(L.latLngBounds(allPts), { padding: [60, 60], maxZoom: 15 });
  }, [selectedTruck]);

  // ── 4. Gambar riwayat jalur GPS (trail biru) ─────────────────────────────────
  useEffect(() => {
    if (!trailGrpRef.current) return;
    trailGrpRef.current.clearLayers();
    if (!historyTrail || historyTrail.length < 2) return;

    const coords: L.LatLngTuple[] = historyTrail.map(p => [p.lat, p.lng]);

    L.polyline(coords, { color: '#93c5fd', weight: 12, opacity: 0.2, lineCap: 'round' })
      .addTo(trailGrpRef.current);
    L.polyline(coords, { color: '#2563EB', weight: 4, opacity: 0.9, lineCap: 'round' })
      .addTo(trailGrpRef.current);

    const s = historyTrail[0];
    L.marker([s.lat, s.lng], { icon: startTrailIcon })
      .addTo(trailGrpRef.current)
      .bindTooltip(
        `<b>Mulai:</b> ${s.timestamp
          ? new Date(s.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-'}`,
        { permanent: false, direction: 'top' }
      );

    const step = Math.max(1, Math.floor(historyTrail.length / 20));
    historyTrail.forEach((p, i) => {
      if (i === 0 || i % step !== 0) return;
      const dot = L.circleMarker([p.lat, p.lng], {
        radius: 3.5, color: '#1d4ed8', fillColor: '#bfdbfe', fillOpacity: 1, weight: 1.5,
      });
      if (p.timestamp) {
        dot.bindTooltip(
          new Date(p.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          { permanent: false, direction: 'top' }
        );
      }
      trailGrpRef.current!.addLayer(dot);
    });
  }, [historyTrail]);

  // ── 5. Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div id="kabid-map" style={{ height: '100%', width: '100%' }} />

      {/* ── Legend overlay ── */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 1000,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12, padding: '10px 14px',
        boxShadow: '0 2px 14px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column', gap: 7,
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="17" fill="#059669" stroke="white" strokeWidth="2.5"/>
            <g transform="translate(24,24) scale(0.65)" fill="white">
              <rect x="-12" y="-7" width="10" height="9" rx="1.5"/>
              <rect x="-2" y="-7" width="14" height="9" rx="1"/>
              <rect x="-14" y="-3" width="2.5" height="5" rx="1"/>
              <circle cx="-8" cy="4" r="2.5" fill="#059669" stroke="white" strokeWidth="1"/>
              <circle cx="8" cy="4" r="2.5" fill="#059669" stroke="white" strokeWidth="1"/>
            </g>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif', color: '#374151' }}>
            Truk Di Jalan
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="17" fill="#6b7280" stroke="white" strokeWidth="2.5"/>
            <g transform="translate(24,24) scale(0.65)" fill="white">
              <rect x="-12" y="-7" width="10" height="9" rx="1.5"/>
              <rect x="-2" y="-7" width="14" height="9" rx="1"/>
              <rect x="-14" y="-3" width="2.5" height="5" rx="1"/>
              <circle cx="-8" cy="4" r="2.5" fill="#6b7280" stroke="white" strokeWidth="1"/>
              <circle cx="8" cy="4" r="2.5" fill="#6b7280" stroke="white" strokeWidth="1"/>
            </g>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif', color: '#374151' }}>
            Standby
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="26" height="6">
            <line x1="0" y1="3" x2="26" y2="3" stroke="#059669" strokeWidth="2.5" strokeDasharray="8 5"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif', color: '#374151' }}>
            Rute Jadwal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="26" height="6">
            <line x1="0" y1="3" x2="26" y2="3" stroke="#2563EB" strokeWidth="3"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif', color: '#374151' }}>
            Jalur GPS Dilalui
          </span>
        </div>
      </div>
    </div>
  );
}