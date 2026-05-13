"use client";
import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
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

// Icon untuk hasil pencarian
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
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Komponen untuk menghitung jarak

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
  markerPos: [number, number];
  radius: number;
  onMarkerDrag: (lat: number, lng: number) => void;
  wilayahData?: any[];
  highlightAreas?: AreaHighlight[];
}) {
  const [isCalculating, setIsCalculating] = useState(false);

  const eventHandlers = useMemo(() => ({
    dragend(e: any) {
      const marker = e.target;
      if (marker != null) {
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

  // Deteksi wilayah yang dekat dengan marker
  const detectNearbyWilayah = async (center: [number, number]) => {
    setIsCalculating(true);
    try {
      const response = await fetch('/api/admin/wilayah/polygons', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wilayah data');
      }

      const wilayahList = await response.json();

      const areas = wilayahList.map((wilayah: any) => {
        const distance = calculateDistance(
          center[0],
          center[1],
          wilayah.center[0],
          wilayah.center[1]
        );
        const isWithin = distance <= (wilayah.radius / 1000); // Convert meter to km

        return {
          id: wilayah.id,
          name: wilayah.name,
          center: wilayah.center,
          radius: wilayah.radius,
          isWithin,
          distance: parseFloat(distance.toFixed(2))
        };
      });

      return areas;
    } catch (error) {
      console.error('Error detecting nearby wilayah:', error);
      return [];
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <MapContainer
      center={markerPos}
      zoom={13}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ChangeView center={markerPos} />

      {/* Marker draggable */}
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={markerPos}
        icon={defaultIcon}
      />

      {/* Circle untuk radius marker */}
      <Circle
        center={markerPos}
        radius={radius}
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 10'
        }}
      />

      {/* Tampilkan semua wilayah dari data */}
      {wilayahData.map((wilayah) => (
        <React.Fragment key={`wilayah-${wilayah.id}`}>
          <Circle
            center={[parseFloat(wilayah.latitude), parseFloat(wilayah.longitude)]}
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
            position={[parseFloat(wilayah.latitude), parseFloat(wilayah.longitude)]}
            icon={defaultIcon}
          >
            <div className="text-xs font-bold bg-white px-2 py-1 rounded shadow-md">
              {wilayah.name}
            </div>
          </Marker>
        </React.Fragment>
      ))}

      {/* Highlight area untuk hasil pencarian */}
      {highlightAreas.map((area) => (
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
            <div className="text-xs font-bold px-2 py-1 rounded shadow-md bg-white border">
              <div className="text-green-600">✓ {area.name}</div>
              {area.distance !== undefined && (
                <div className="text-xs text-gray-600">
                  {area.distance} km dari marker
                </div>
              )}
            </div>
          </Marker>
        </React.Fragment>
      ))}

      {/* Loading indicator */}
      {isCalculating && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Mendeteksi wilayah...</span>
          </div>
        </div>
      )}
    </MapContainer>
  );
}