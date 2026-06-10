"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarSupir from './components/NavbarSupir';
import TugasCard from './components/TugasCard';
import FormSelesai from './components/FormSelesai';
import { Truck, ClipboardList, CheckCircle, Clock, Map as MapIcon, BarChart3 } from 'lucide-react';
import { normalizeRole } from '@/lib/authRole';

export default function HalamanSupir() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tugasList, setTugasList] = useState([]);
  const [stats, setStats] = useState({ baru: 0, proses: 0, selesai: 0 });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [showFormSelesai, setShowFormSelesai] = useState(false);

  useEffect(() => {
    // Cek login status
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      
      // Cek apakah role-nya OPERATOR (supir)
      const role = normalizeRole(userData.role || localStorage.getItem('role') || '');
      if (role !== 'OPERATOR') {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
      setIsLoggedIn(true);
      fetchTugas();
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  // 🔴 PASTIKAN ENDPOINTNYA BENAR
const fetchTugas = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Panggil melalui proxy Next.js
    const res = await axios.get('/api/supir-op/tugas/aduan', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // BUKAN: /api/laporan atau yang lain
    setTugasList(res.data.data);
    
    // Hitung statistik
    const data = res.data.data;
    const total = data.length;
    const selesai = data.filter((t: any) => t.status === 'SELESAI').length;
    const proses = data.filter((t: any) => 
      ['DITERIMA', 'DALAM_PERJALANAN', 'TIBA', 'BEKERJA'].includes(t.status)
    ).length;
    const baru = data.filter((t: any) => t.status === 'DITUGASKAN').length;

    setStats({ baru, proses, selesai });
    
  } catch (error) {
    console.error('Error fetch tugas:', error);
    // Fallback ke data dummy untuk testing
    setTugasList([]);
  } finally {
    setLoading(false);
  }
};

  // Fallback ke endpoint lama (untuk sementara)
  const fetchTugasLegacy = async () => {
    try {
      const res = await axios.get('/api/laporan');
      const allData = res.data;

      setStats({
        baru: allData.filter((l: any) => l.status === 'PENDING' || l.status === 'BARU').length,
        proses: allData.filter((l: any) => l.status === 'DIPROSES' || l.status === 'DITINDAKLANJUTI').length,
        selesai: allData.filter((l: any) => l.status === 'SELESAI').length,
      });

      const filterTugas = allData.filter((l: any) => 
        l.status === 'DIPROSES' || l.status === 'DITINDAKLANJUTI'
      );
      setTugasList(filterTugas);
    } catch (err) {
      console.error("Gagal ambil data legacy");
    }
  };

  const handleSelesai = (tugas: any) => {
    setSelectedTugas(tugas);
    setShowFormSelesai(true);
  };

  const handleFormSelesaiSubmit = async (data: { volume: number, photo: File | null }) => {
    if (!selectedTugas) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('volume', data.volume.toString());
      if (data.photo) {
        formData.append('foto', data.photo);
        formData.append('type', 'AFTER');
      }

      // 🔴 PERBAIKAN: Gunakan endpoint yang benar
      await axios.post(
        `${selectedTugas?.id ? '/api/supir/tugas/' + selectedTugas.id : ''}/volume`,
        { volume: data.volume },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.photo) {
        await axios.post(
          `/api/supir/tugas/${selectedTugas.id}/foto`,
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            } 
          }
        );
      }

      alert('✅ Tugas selesai!');
      setShowFormSelesai(false);
      fetchTugas();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Gagal menyelesaikan tugas');
    }
  };

  // Tampilkan loading screen
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-[#FDFCF0]">
      <NavbarSupir onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }} />

      <div className="max-w-xl mx-auto py-6 px-5 pb-24">
        {/* Nama Driver */}
        <div className="mb-6">
          <p className="text-slate-400 text-sm font-medium">Selamat Bekerja,</p>
          <h1 className="text-2xl font-black text-slate-800 uppercase">{user?.fullName || 'Driver'}</h1>
        </div>

        {/* SEKSI STATUS TUGAS */}
        <h2 className="font-bold text-slate-800 mb-4">Status Tugas Anda</h2>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard icon={<ClipboardList size={20}/>} count={stats.baru} label="Baru" color="orange" />
          <StatCard icon={<Clock size={20}/>} count={stats.proses} label="Proses" color="blue" />
          <StatCard icon={<CheckCircle size={20}/>} count={stats.selesai} label="Selesai" color="green" />
        </div>

        {/* SEKSI FITUR UTAMA */}
        <h2 className="font-bold text-slate-800 mb-4">Fitur Utama</h2>
        <div className="grid grid-cols-4 gap-4 mb-10">
          <MenuIcon icon={<ClipboardList className="text-green-700"/>} label="Daftar Tugas" active />
          <MenuIcon icon={<CheckCircle className="text-green-700"/>} label="Riwayat" />
          <MenuIcon icon={<MapIcon className="text-green-700"/>} label="Peta Lokasi" />
          <MenuIcon icon={<BarChart3 className="text-green-700"/>} label="Statistik" />
        </div>

        {/* DAFTAR TUGAS AKTIF */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-800">Tugas Penjemputan</h2>
          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold">
            {tugasList.length} Lokasi
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 animate-pulse font-bold">Memuat Tugas...</div>
        ) : tugasList.length > 0 ? (
          <div className="grid gap-4">
            {tugasList.map((item: any) => (
              <TugasCard 
                key={item.id} 
                item={item} 
                onSelesai={() => handleSelesai(item)} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[30px] p-10 text-center border-2 border-dashed border-slate-200">
            <Truck size={40} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-400 text-sm font-bold">Tidak ada tugas aktif.</p>
          </div>
        )}
      </div>

      {/* Modal Form Selesai */}
      {showFormSelesai && selectedTugas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <FormSelesai
              tugas={selectedTugas}
              onSubmit={handleFormSelesaiSubmit}
              onCancel={() => setShowFormSelesai(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

// Komponen StatCard
function StatCard({ icon, count, label, color }: any) {
  const colors: any = {
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600"
  };
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
      <div className={`${colors[color]} w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2`}>
        {icon}
      </div>
      <p className="text-xl font-black text-slate-800">{count}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
    </div>
  );
}

// Komponen MenuIcon
function MenuIcon({ icon, label, active = false }: any) {
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${active ? 'bg-green-100 border-2 border-green-500' : 'bg-green-50 hover:bg-green-100'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{label}</span>
    </div>
  );
}