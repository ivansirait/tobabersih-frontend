"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import LaporanForm from '@/app/Warga/components/LaporanForm';
import LaporanList from '@/app/Warga/components/LaporanList';

// Gunakan proxy Next.js
const BASE_URL_API = '/api';

export default function Home() {
  const [form, setForm] = useState({ pelapor: '',   email: '', lokasi: '', deskripsi: '', latitude: 0, longitude: 0 });
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("Mencari lokasi...");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uiAlert, setUiAlert] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);
  
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
      const res = await axios.get(`${BASE_URL_API}/laporan`);
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

  const showUiAlert = (
    type: 'success' | 'error' | 'warning',
    title: string,
    message: string
  ) => {
    setUiAlert({ type, title, message });
  };

  const formatWilayahError = (message: string) => {
    const normalizedMessage = String(message || '').replace(/\s+/g, ' ').trim();
    const match = normalizedMessage.match(/berada\s+([\d.,]+)\s*km.*\(([^)]+)\)/i);

    if (!match) {
      return normalizedMessage || 'Laporan tidak dapat dikirim karena lokasi berada di luar wilayah aktif.';
    }

    const distance = match[1];
    const kecamatan = match[2];

    return `Lokasi Anda masih berjarak ${distance} km dari kecamatan aktif terdekat (${kecamatan}). Silakan kirim laporan saat berada di dalam radius wilayah yang aktif.`;
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

  // ✅ VALIDASI NAMA PELAPOR
  if (!form.pelapor || form.pelapor.trim() === '') {
    showUiAlert('warning', 'Validasi Form', 'Nama lengkap tidak boleh kosong.');
    return;
  }

  // ✅ VALIDASI EMAIL
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email || !emailRegex.test(form.email)) {
    showUiAlert('warning', 'Validasi Form', 'Silakan masukkan email yang valid.');
    return;
  }

  if (form.latitude === 0) {
    showUiAlert('warning', 'GPS Belum Siap', 'Harap tunggu lokasi GPS terdeteksi.');
    return;
  }

  if (!form.deskripsi || form.deskripsi.trim() === '') {
    showUiAlert('warning', 'Validasi Form', 'Deskripsi laporan tidak boleh kosong.');
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();

    // 👇 DATA PELAPOR
    formData.append('pelapor', form.pelapor.trim());
    formData.append('email', form.email.trim());

    // 👇 DATA LOKASI
    formData.append('lokasi', form.lokasi.trim());
    formData.append('latitude', form.latitude.toString());
    formData.append('longitude', form.longitude.toString());

    // 👇 DATA LAPORAN
    formData.append('description', form.deskripsi.trim());

    // 👇 FOTO
    if (selectedImage) {
      formData.append('photo', selectedImage);
    }

    const response = await axios.post(
      `${BASE_URL_API}/laporan/create`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log('✅ Laporan berhasil dibuat:', response.data);

    // RESET FORM
    setForm({
      pelapor: '',
      email: '',
      lokasi: '',
      deskripsi: '',
      latitude: 0,
      longitude: 0
    });

    setSelectedImage(null);
    setPreviewUrl(null);

    await fetchLaporan();
    showUiAlert('success', 'Laporan Terkirim', 'Laporan berhasil dikirim. Admin akan mengirim notifikasi ke email Anda.');

  } catch (err: any) {
    console.error("❌ Error:", err);

    let errorMessage = "Gagal mengirim laporan";
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }

    const finalMessage = /kecamatan|wilayah|radius|km/i.test(errorMessage)
      ? formatWilayahError(errorMessage)
      : errorMessage;

    showUiAlert('error', 'Laporan Ditolak', finalMessage);

  } finally {
    setLoading(false);
  }
};

  return (
    <main className="relative p-5 md:p-10 bg-[#f8fafc] min-h-screen">
      <div className="max-w-3xl mx-auto">

        <LaporanForm 
          form={form} setForm={setForm} loading={loading} gpsStatus={gpsStatus}
          previewUrl={previewUrl} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef}
          handleImageChange={handleImageChange} removeImage={() => setPreviewUrl(null)}
          handleSubmit={handleSubmit}
          handleDeteksiLokasi={handleDeteksiLokasi} // ✅ Sekarang fungsi ini ada
        />
      </div>

      {uiAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm scale-150 rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold ${
                    uiAlert.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : uiAlert.type === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {uiAlert.type === 'success' ? '✓' : uiAlert.type === 'warning' ? '!' : '×'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{uiAlert.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{uiAlert.message}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUiAlert(null)}
                  className={`rounded-full px-6 py-2 text-sm font-semibold text-white transition ${
                    uiAlert.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : uiAlert.type === 'warning'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Oke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}