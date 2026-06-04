"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import LaporanForm from '@/app/Warga/components/LaporanForm';
import LaporanList from '@/app/Warga/components/LaporanList';
import Link from 'next/link';

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
  const [edukasiList, setEdukasiList] = useState<any[]>([]);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [albumsList, setAlbumsList] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ambilLokasiOtomatis();
    fetchLaporan();
    fetchEdukasi();
    fetchPosts();
    fetchGalleries();
  }, []);

  const parseApiArray = (raw: any) => {
    if (raw && raw.success && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [];
  };

  const fetchEdukasi = async () => {
    try {
      const res = await axios.get(`${BASE_URL_API}/edukasi`);
      setEdukasiList(parseApiArray(res.data));
    } catch (err) {
      console.warn('Gagal ambil edukasi', err);
      setEdukasiList([]);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${BASE_URL_API}/posts`);
      setPostsList(parseApiArray(res.data));
    } catch (err) {
      console.warn('Gagal ambil posts', err);
      setPostsList([]);
    }
  };

  const fetchGalleries = async () => {
    try {
      const res = await axios.get(`${BASE_URL_API}/galleries`);
      // some APIs return { data: albums } or array
      setAlbumsList(parseApiArray(res.data));
    } catch (err) {
      console.warn('Gagal ambil galleries', err);
      setAlbumsList([]);
    }
  };

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

      {/* EDUKASI, BERITA, GALERI UNTUK WARGA */}
      <div className="max-w-3xl mx-auto mt-10 space-y-12">
        {/* EDUKASI */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold text-slate-800">Edukasi</h2>
            <Link href="/edukasi" className="text-sm text-green-600 font-semibold">Lihat Semua</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {edukasiList.length === 0 ? (
              <div className="text-gray-500">Belum ada edukasi tersedia.</div>
            ) : (
              edukasiList.slice(0,4).map((it:any) => (
                <div key={it.id || it._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2">{it.judul || it.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3">{it.deskripsi?.slice(0,120) || it.excerpt || ''}</p>
                  <div className="mt-3 text-right">
                    <Link href={`/edukasi/${it.id || it._id || ''}`} className="text-sm text-green-600 font-semibold">Baca</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* BERITA */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold text-slate-800">Berita</h2>
            <Link href="/berita" className="text-sm text-green-600 font-semibold">Lihat Semua</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {postsList.length === 0 ? (
              <div className="text-gray-500">Belum ada berita tersedia.</div>
            ) : (
              postsList.slice(0,4).map((p:any) => (
                <div key={p.id || p._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3">{p.excerpt || p.content?.slice(0,120) || ''}</p>
                  <div className="mt-3 text-right">
                    <Link href={`/berita/${p.id || p._id || ''}`} className="text-sm text-green-600 font-semibold">Baca</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* GALERI */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold text-slate-800">Galeri</h2>
            <Link href="/galeri" className="text-sm text-green-600 font-semibold">Lihat Semua</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {albumsList.length === 0 ? (
              <div className="text-gray-500">Belum ada album.</div>
            ) : (
              albumsList.slice(0,6).map((a:any) => (
                <Link key={a.id || a._id} href={`/galeri/${a.id || a._id || ''}`} className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="w-full h-40 bg-gray-50 overflow-hidden">
                    <img src={a.coverUrl || a.cover || '/api/placeholder'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={a.title || a.nama} />
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{a.title || a.nama}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{(a.photos && a.photos.length) ? `${a.photos.length} Foto` : (a.count ? `${a.count} Foto` : '')}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
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