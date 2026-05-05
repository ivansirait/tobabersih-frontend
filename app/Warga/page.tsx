"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import LaporanForm from '@/app/Warga/components/LaporanForm';
import LaporanList from '@/app/Warga/components/LaporanList';

const api = axios.create({
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000 // 30 second timeout
});

const BASE_URL_API =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://quarterly-wrought-fascism.ngrok-free.dev'
    : 'http://localhost:5000';

export default function Home() {
  const [form, setForm] = useState({ pelapor: '', lokasi: '', deskripsi: '', latitude: 0, longitude: 0 });
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("Mencari lokasi...");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ambilLokasiOtomatis();
    fetchLaporan();
  }, []);

  const ambilLokasiOtomatis = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
          setGpsStatus("✅ Lokasi Anda berhasil dideteksi otomatis");
        },
        () => {
          setGpsStatus("⚠️ Gagal akses GPS. Mohon izinkan lokasi.");
        }
      );
    }
  };

  // ✅ PERBAIKAN: Tambahkan alias ini agar prop handleDeteksiLokasi di LaporanForm tidak crash
  const handleDeteksiLokasi = ambilLokasiOtomatis;

  const fetchLaporan = async () => {
    try {
      const res = await api.get(`${BASE_URL_API}/api/laporan`);
      console.log('📦 Response API:', res.data);
      
      let dataArray = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        dataArray = res.data.data;
      } else if (Array.isArray(res.data)) {
        dataArray = res.data;
      } else {
        console.warn('Format tidak dikenal:', res.data);
        dataArray = [];
      }
      
      setLaporanList(dataArray);
    } catch (err) { 
      console.error("Gagal ambil data", err);
      setLaporanList([]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.latitude === 0) {
      return alert("Harap tunggu lokasi GPS!");
    }
    if (!form.deskripsi) {
      return alert("Harap isi deskripsi laporan!");
    }
    
    setLoading(true);

    const formData = new FormData();
    formData.append('latitude', form.latitude.toString());
    formData.append('longitude', form.longitude.toString());
    formData.append('description', form.deskripsi);
    formData.append('jenisSampah', 'CAMPURAN');
    
    if (form.lokasi) {
      formData.append('lokasi', form.lokasi);
    }
    
    if (selectedImage) {
      formData.append('photo', selectedImage);
    }

    try {
      const response = await api.post(`${BASE_URL_API}/api/laporan/create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('✅ Response:', response.data);
      
      setForm({ pelapor: '', lokasi: '', deskripsi: '', latitude: 0, longitude: 0 });
      setSelectedImage(null);
      setPreviewUrl(null);
      
      await fetchLaporan();
      alert("✅ Laporan berhasil dikirim!");
    } catch (err: any) {
      console.error("❌ Error:", err);
      let errorMessage = "Gagal mengirim laporan";
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      alert(`❌ ${errorMessage}`);
    } finally { 
      setLoading(false);
    }
  };

  return (
    <main className="p-5 md:p-10 bg-[#f8fafc] min-h-screen">
      <div className="max-w-3xl mx-auto">

        <LaporanForm 
          form={form} setForm={setForm} loading={loading} gpsStatus={gpsStatus}
          previewUrl={previewUrl} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef}
          handleImageChange={handleImageChange} removeImage={() => setPreviewUrl(null)}
          handleSubmit={handleSubmit}
          handleDeteksiLokasi={handleDeteksiLokasi} // ✅ Sekarang fungsi ini ada
        />
      </div>
    </main>
  );
}