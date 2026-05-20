"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { useMemo, useEffect, useState } from 'react';

// Fix icon default Leaflet agar muncul di Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Icon untuk hasil pencarian atau checkpoint
const searchIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Komponen untuk otomatis geser kamera peta
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

interface AreaHighlight {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  isWithin: boolean;
  distance?: number;
}

export default function WilayahMap({
  markerPos,
  radius,
  onMarkerDrag,
  wilayahData = [],
  highlightAreas = []
}: {
  markerPos: any; // Diubah ke any untuk fleksibilitas interceptor data rute vs single marker
  radius: number;
  onMarkerDrag?: (lat: number, lng: number) => void; // Dibuat opsional agar mode tinjauan rute tidak crash
  wilayahData?: any[];
  highlightAreas?: AreaHighlight[];
}) {
  const [isCalculating, setIsCalculating] = useState(false);

  // ─── 1. INTERCEPTOR KOORDINAT AMAN (PENCEGAH CRASH LAT OF NULL) ───
  const { safeCenter, isRouteMode, polylinePoints } = useMemo(() => {
    // Kasus rute: data yang masuk berupa array multidimensi [[lat, lng], [lat, lng], ...]
    if (Array.isArray(markerPos) && Array.isArray(markerPos[0])) {
      const validPoints = markerPos.filter((pt: any) => pt && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])));
      if (validPoints.length > 0) {
        return {
          safeCenter: [Number(validPoints[0][0]), Number(validPoints[0][1])] as [number, number],
          isRouteMode: true,
          polylinePoints: validPoints as [number, number][]
        };
      }
    }

    // Kasus single wilayah marker biasa: data yang masuk berupa [lat, lng]
    if (Array.isArray(markerPos) && markerPos.length >= 2) {
      const lat = Number(markerPos[0]);
      const lng = Number(markerPos[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          safeCenter: [lat, lng] as [number, number],
          isRouteMode: false,
          polylinePoints: []
        };
      }
    }

    // Default Fallback koordinat pusat Toba jika prop bernilai null/kosong
    return {
      safeCenter: [2.3494, 99.1039] as [number, number],
      isRouteMode: false,
      polylinePoints: []
    };
  }, [markerPos]);

  const eventHandlers = useMemo(() => ({
    dragend(e: any) {
      const marker = e.target;
      if (marker != null && onMarkerDrag) {
        const { lat, lng } = marker.getLatLng();
        onMarkerDrag(lat, lng);
      }
    },
  }), [onMarkerDrag]);

  // Fungsi untuk menghitung jarak antara dua titik
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius bumi dalam kilometer
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <MapContainer
      center={safeCenter}
      zoom={13}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ChangeView center={safeCenter} />

      {/* MODE A: JALUR NAVIGASI RUTE (Render Polyline Jalur & Pin Berurutan) */}
      {isRouteMode ? (
        <>
          <Polyline 
            positions={polylinePoints} 
            pathOptions={{ color: '#059669', weight: 4, opacity: 0.8 }} 
          />
          {polylinePoints.map((pos, index) => (
            <Marker key={`checkpoint-${index}`} position={pos} icon={searchIcon}>
              <Popup>
                <div className="text-xs font-bold font-sans">
                  <span className="text-emerald-700">Checkpoint {index + 1}</span>
                  <p className="text-gray-400 font-mono mt-0.5 text-[10px]">{pos[0]}, {pos[1]}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      ) : (
        /* MODE B: GEOFENCING WILAYAH (Render Draggable Marker Tunggal & Radius Circle) */
        <>
          <Marker
            draggable={onMarkerDrag ? true : false}
            eventHandlers={eventHandlers}
            position={safeCenter}
            icon={defaultIcon}
          />

          <Circle
            center={safeCenter}
            radius={radius || 0}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '5, 10'
            }}
          />
        </>
      )}

      {/* Tampilkan semua wilayah dari database data */}
      {(wilayahData || []).map((wilayah) => {
        const lat = parseFloat(wilayah.latitude);
        const lng = parseFloat(wilayah.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <React.Fragment key={`wilayah-${wilayah.id}`}>
            <Circle
              center={[lat, lng]}
              radius={wilayah.radius || 5000}
              pathOptions={{
                color: wilayah.isActive ? '#3b82f6' : '#9ca3af',
                fillColor: wilayah.isActive ? '#3b82f6' : '#9ca3af',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '3, 3'
              }}
            />

            <Marker
              position={[lat, lng]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="text-xs font-bold px-1 text-gray-800">
                  {wilayah.name}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* Highlight area untuk hasil pencarian */}
      {(highlightAreas || []).map((area) => {
        if (!area.center || isNaN(area.center[0]) || isNaN(area.center[1])) return null;

        return (
          <React.Fragment key={`highlight-${area.id}`}>
            <Circle
              center={area.center}
              radius={area.radius}
              pathOptions={{
                color: area.isWithin ? '#22c55e' : '#ef4444',
                fillColor: area.isWithin ? '#22c55e' : '#ef4444',
                fillOpacity: area.isWithin ? 0.3 : 0.1,
                weight: 3
              }}
            />

            <Marker
              position={area.center}
              icon={searchIcon}
            >
              <Popup>
                <div className="text-xs font-bold font-sans">
                  <div className="text-green-600">✓ {area.name}</div>
                  {area.distance !== undefined && (
                    <div className="text-xs text-gray-600 font-normal mt-0.5">
                      {area.distance} km dari marker utama
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* Loading indicator */}
      {isCalculating && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Mendeteksi wilayah...</span>
          </div>
        </div>
      )}
    </MapContainer>
  );
}