// app/kabid/components/MonitoringMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icon untuk Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Icon untuk truk
const truckIcon = L.divIcon({
  html: `<div style="
    background-color: #10b981;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  ">🚛</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

interface MonitoringMapProps {
  trucks: any[];
  onSelectTruck: (truck: any) => void;
}

export default function MonitoringMap({ trucks, onSelectTruck }: MonitoringMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('monitoring-map').setView([2.3333, 99.0], 11);
      
      // ✅ GANTI TILE LAYER JADI SAMA DENGAN ADMIN (OpenStreetMap, bukan CartoDB Light)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(mapRef.current);
    }

    // Update markers
    trucks.forEach(truck => {
      if (truck.currentLat && truck.currentLong) {
        const lat = parseFloat(truck.currentLat);
        const lng = parseFloat(truck.currentLong);
        
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          if (markersRef.current[truck.id]) {
            markersRef.current[truck.id].setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], { icon: truckIcon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-2 min-w-[200px]">
                  <p class="font-bold text-gray-900 mb-1">${truck.plateNumber}</p>
                  <p class="text-xs text-gray-600 mb-2">Supir: ${truck.sopir || '-'}</p>
                  <p class="text-xs text-gray-600 mb-2">Status: ${truck.status}</p>
                  ${truck.tugasAktif ? `<p class="text-xs text-gray-500 mb-2">Tugas: ${truck.tugasAktif.location?.substring(0, 30)}...</p>` : ''}
                  <button 
                    onclick="window.dispatchEvent(new CustomEvent('selectTruck', { detail: ${JSON.stringify(truck)} }))" 
                    class="mt-2 w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    📊 Lihat Detail
                  </button>
                </div>
              `);
            
            marker.on('click', () => onSelectTruck(truck));
            markersRef.current[truck.id] = marker;
          }
        }
      }
    });

    // Cleanup markers yang sudah tidak ada
    Object.keys(markersRef.current).forEach(id => {
      if (!trucks.find(t => t.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Event listener untuk custom event
    const handleSelectTruck = (e: any) => {
      onSelectTruck(e.detail);
    };
    window.addEventListener('selectTruck', handleSelectTruck);

    return () => {
      window.removeEventListener('selectTruck', handleSelectTruck);
    };
  }, [trucks, onSelectTruck]);

  useEffect(() => {
    // Fit bounds ke semua marker
    const validTrucks = trucks.filter(t => 
      t.currentLat && t.currentLong && 
      parseFloat(t.currentLat) !== 0 && 
      parseFloat(t.currentLong) !== 0
    );
    if (validTrucks.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(
        validTrucks.map(t => [parseFloat(t.currentLat), parseFloat(t.currentLong)] as L.LatLngTuple)
      );
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [trucks]);

  return <div id="monitoring-map" style={{ height: '100%', width: '100%' }} />;
}