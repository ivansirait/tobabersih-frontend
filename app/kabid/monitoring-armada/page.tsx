// app/kabid/monitoring-armada/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Clock, Navigation, RefreshCw, Activity, Gauge, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Dynamic import untuk peta (Leaflet)
const MonitoringMap = dynamic(() => import('../components/MonitoringMap'), { ssr: false });

export default function MonitoringArmada() {
  const [loading, setLoading] = useState(true);
  const [armada, setArmada] = useState([]);
  const [statistik, setStatistik] = useState<any>({});
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchArmada();
    const interval = setInterval(fetchArmada, 30000); // refresh setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const fetchArmada = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/kabid/monitoring-armada`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArmada(res.data.data.armada);
      setStatistik(res.data.data.statistik);
    } catch (error) {
      console.error('Error fetching armada:', error);
      toast.error('Gagal memuat data armada');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Monitoring Armada</h1>
          <p className="text-gray-500 mt-1">Live tracking dan performa armada pengangkut sampah</p>
        </div>
        <button
          onClick={fetchArmada}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Statistik Armada */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Truck className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Armada Aktif</p>
              <p className="text-2xl font-bold">{statistik.totalArmada || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <Activity className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Perjalanan Hari Ini</p>
              <p className="text-2xl font-bold">{statistik.totalPerjalananHariIni || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Gauge className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Rata-rata Ritase</p>
              <p className="text-2xl font-bold">{statistik.rataRataRitase || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <TrendingUp className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Armada Paling Aktif</p>
              <p className="text-xl font-bold">{statistik.armadaPalingAktif?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Map & Armada List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="text-green-600" size={18} />
              Live Tracking Armada
            </h2>
          </div>
          <div className="h-[500px] w-full">
            {isClient && <MonitoringMap trucks={armada} onSelectTruck={setSelectedTruck} />}
          </div>
        </div>

        {/* Daftar Armada */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Truck className="text-green-600" size={18} />
              Daftar Armada Aktif
            </h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {armada.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Tidak ada armada aktif
              </div>
            ) : (
              armada.map((truck: any) => (
                <div
                  key={truck.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTruck?.id === truck.id ? 'bg-green-50' : ''}`}
                  onClick={() => setSelectedTruck(truck)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{truck.plateNumber}</p>
                      <p className="text-sm text-gray-500">{truck.sopir || 'Tidak ada supir'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${truck.status === 'BUSY' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {truck.status === 'BUSY' ? 'Aktif' : 'Siaga'}
                    </span>
                  </div>
                  {truck.currentLat && truck.currentLong && (
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={12} />
                      <span>Live tracking aktif</span>
                    </div>
                  )}
                  {truck.tugasAktif && (
                    <div className="mt-2 text-xs text-gray-500">
                      Tugas: {truck.tugasAktif.location.substring(0, 30)}...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Armada yang Dipilih */}
      {selectedTruck && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedTruck.plateNumber}</h2>
              <p className="text-gray-500">Supir: {selectedTruck.sopir || '-'}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedTruck.status === 'BUSY' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {selectedTruck.status === 'BUSY' ? 'Dalam Perjalanan' : 'Siaga'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Jarak Hari Ini</p>
              <p className="text-xl font-bold">- km</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Jumlah Ritase</p>
              <p className="text-xl font-bold">-</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Estimasi Waktu Operasional</p>
              <p className="text-xl font-bold">-</p>
            </div>
          </div>

          {selectedTruck.tugasAktif && (
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-700">Tugas Aktif</p>
              <p className="text-sm mt-1">{selectedTruck.tugasAktif.location}</p>
              <p className="text-xs text-blue-600 mt-1">
                Jadwal: {new Date(selectedTruck.tugasAktif.scheduledAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}