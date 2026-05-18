'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

// Fix marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Marker berdasarkan status (sama dengan admin)
const getMarkerIcon = (status: string) => {
  let color = '#6b7280';
  if (status === 'PENDING') color = '#ef4444';        // Merah
  else if (status === 'DITINDAKLANJUTI') color = '#f59e0b'; // Kuning
  else if (status === 'SELESAI') color = '#10b981';   // Hijau

  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [14, 14]
  });
};

const kecamatanIcon = L.divIcon({
  html: `<div style="
    background-color: #3b82f6;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  ">🏢</div>`,
  className: '',
  iconSize: [24, 24]
});

interface PetaAduanMapProps {
  titikAduan: any[];
  kecamatan: any[];
  center: [number, number];
  zoom: number;
  onSelectPoint?: (point: any) => void;
}

export default function PetaAduanMap({ titikAduan, kecamatan, center, zoom }: PetaAduanMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('peta-aduan-map').setView(center, zoom);
      
      // ✅ GANTI TILE LAYER JADI SAMA DENGAN ADMIN
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add titik aduan markers (marker warna: merah/kuning/hijau)
    let addedMarkers = 0;
    titikAduan.forEach(point => {
      const lat = parseFloat(point.lat);
      const lng = parseFloat(point.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const marker = L.marker([lat, lng], { icon: getMarkerIcon(point.status) })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2 max-w-xs">
              <p class="font-bold mb-1">${point.deskripsi?.substring(0, 50) || 'Laporan'}</p>
              <p class="text-sm text-gray-600">Status: ${point.status}</p>
              ${point.kecamatan ? `<p class="text-sm text-gray-600">Kecamatan: ${point.kecamatan}</p>` : ''}
              ${point.jenis ? `<p class="text-sm text-gray-600">Jenis: ${point.jenis}</p>` : ''}
              ${point.foto ? `<img src="${point.foto}" class="mt-2 rounded max-h-32 object-cover" alt="Foto" />` : ''}
              <p class="text-xs text-gray-400 mt-1">${new Date(point.waktu).toLocaleString()}</p>
            </div>
          `);
        markersRef.current.push(marker);
        addedMarkers++;
      }
    });
    console.log(`✅ Added ${addedMarkers} markers from ${titikAduan.length} points`);

    // Add kecamatan markers (icon 🏢)
    kecamatan.forEach(kec => {
      if (kec.center && kec.center.length === 2 && kec.center[0] !== 0 && kec.center[1] !== 0) {
        const marker = L.marker([kec.center[0], kec.center[1]], { icon: kecamatanIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2">
              <strong>${kec.name}</strong><br/>
              ${kec.code ? `Kode: ${kec.code}` : ''}
            </div>
          `);
        markersRef.current.push(marker);
      }
    });

    // Heatmap layer (opsional)
    const heatPoints = titikAduan
      .filter(p => {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map(p => [parseFloat(p.lat), parseFloat(p.lng), 0.5]);

    if (heatPoints.length > 0 && (L as any).heatLayer) {
      if (heatLayerRef.current) heatLayerRef.current.remove();
      heatLayerRef.current = (L as any).heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 10 }).addTo(mapRef.current);
    }

    // Fit bounds ke semua marker jika ada
    if (markersRef.current.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    }

  }, [titikAduan, kecamatan, center, zoom]);

  return <div id="peta-aduan-map" style={{ height: '100%', width: '100%' }} />;
}