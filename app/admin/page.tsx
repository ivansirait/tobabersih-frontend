"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Bell, Settings, Calendar, Search, User, LogOut } from 'lucide-react';

// Import Komponen
import Dashboard from './components/Dashboard';
import LaporanCard from './components/LaporanCard';
import LoginForm from './components/LoginForm';
import ManagePosts from './components/ManagePosts';
import ManageSupir from './components/ManageSupir';
import ManageTruk from './components/ManageTruk';
import PetaSampah from './components/PetaSampah';
import ManageWilayah from './components/ManageWilayah';
import ManagePenugasan from './components/ManagePenugasan';
import ManageLaporan from './components/ManageLaporan';
import ManageAkunMasyarakat from './components/ManageAkunMasyarakat';



// --- API Instance ---
const api = axios.create({
  baseURL: 'http://localhost:5000', // Use backend server URL
  timeout: 15000, // ✅ FIX: tambah timeout global 15 detik
});

const normalizeRole = (role?: string) => {
  const safeRole = (role || '').toLowerCase();
  if (safeRole.includes('admin')) return 'ADMIN';
  if (safeRole.includes('operator') || safeRole.includes('supir')) return 'OPERATOR';
  if (safeRole.includes('warga') || safeRole.includes('masyarakat')) return 'WARGA';
  return role || '';
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.code === 'ECONNABORTED') {
      console.error('[Admin] Request timeout:', error.config?.url);
    } else if (!error.response) {
      console.error('[Admin] Network error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ✅ Helper: normalisasi response ke array
const toArray = (res: any): any[] => {
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  interface AdminData {
  laporan: any[];
  posts: any[];
  educations: any[];
}

const [data, setData] = useState<AdminData>({ laporan: [], posts: [], educations: [] });
  const [loading, setLoading] = useState({ login: false, data: false });

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Cookies.remove('token', { path: '/' });
    setIsLoggedIn(false);
    setUserRole(null);
  }, []);

  // ✅ FIX: fetchAllData dengan error handling per-endpoint
  const fetchAllData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(prev => ({ ...prev, data: true }));

    try {
      // Fetch laporan, posts, dan educations secara terpisah agar salah satu gagal tidak block yang lain
      const [laporanResult, postsResult, educationsResult] = await Promise.allSettled([
        api.get('/api/laporan').catch(err => { throw err; }),
        api.get('/api/posts').catch(err => { throw err; }),
        api.get('/api/education').catch(err => { throw err; }),
      ]);

      const laporanData = laporanResult.status === 'fulfilled'
        ? toArray(laporanResult.value)
        : [];

      const postsData = postsResult.status === 'fulfilled'
        ? toArray(postsResult.value)
        : [];

      const educationsData = educationsResult.status === 'fulfilled'
        ? toArray(educationsResult.value)
        : [];

      if (laporanResult.status === 'rejected') {
        console.error('[Admin] Gagal fetch laporan:', laporanResult.reason?.response?.status, laporanResult.reason?.message);
      }
      if (postsResult.status === 'rejected') {
        console.error('[Admin] Gagal fetch posts:', postsResult.reason?.response?.status, postsResult.reason?.message);
      }
      if (educationsResult.status === 'rejected') {
        console.error('[Admin] Gagal fetch educations:', educationsResult.reason?.response?.status, educationsResult.reason?.message);
      }

      setData({ laporan: laporanData, posts: postsData, educations: educationsData });
      console.log('[Admin] Data fetched:', { laporan: laporanData.length, posts: postsData.length, educations: educationsData.length });
    } catch (error) {
      console.error('[Admin] Fatal error in fetchAllData:', error);
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  }, [isLoggedIn]);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token') || Cookies.get('token');
    const userStr = localStorage.getItem('user');

    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('token', token);
      setIsLoggedIn(true);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserRole(normalizeRole(user.role));
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      Cookies.remove('token', { path: '/' });
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchAllData();
  }, [isLoggedIn, fetchAllData]);

  // --- Auth Handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, login: true }));
    try {
      const res = await api.post('/auth/login', {
        email: credentials.username,
        password: credentials.password
      });

      if (res.data.success) {
        const user = res.data.user || res.data.data?.user || res.data.data || null;
        // Normalize user object
        if (user && user.name && !user.fullName) {
          user.fullName = user.name;
        }
        const token =
          res.data.token ||
          res.data.data?.token ||
          res.data.accessToken ||
          res.data.data?.accessToken ||
          'session-login';
        const normalizedRole = normalizeRole(user?.role || res.data.role || res.data.data?.role);

        localStorage.setItem('token', token);
        Cookies.set('token', token, { expires: 1, path: '/', sameSite: 'lax' });
        if (user) {
          localStorage.setItem('user', JSON.stringify({ ...user, role: normalizedRole }));
        }

        setUserRole(normalizedRole);
        setIsLoggedIn(true);
      } else {
        alert("Login gagal: " + (res.data.message || "Periksa email dan password"));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Kredensial salah atau server bermasalah.";
      alert(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, login: false }));
    }
  };

  const renderActiveContent = () => {
    if (loading.data) {
      return (
        <div className="flex justify-center items-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-500">Memuat data...</span>
        </div>
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard laporanList={data.laporan} posts={data.posts} />;
      case 'peta-sampah':
        return <PetaSampah />;
      case 'tugas-harian':
        return <ManagePenugasan taskType="RUTIN" />;
      case 'tugas-aduan':
        return <ManagePenugasan taskType="ADUAN" />;
      case 'daftar':
        return <ManageLaporan />;
      case 'data-supir':
        return <ManageSupir />;
      case 'data-truk':
        return <ManageTruk />;
      case 'data-wilayah':
        return <ManageWilayah />;
      case 'akun-masyarakat':
        return (
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-0 min-h-[60vh] overflow-hidden">
            <ManageAkunMasyarakat />
          </div>
        );
      case 'edukasi':
        return <ManageEdukasi educations={data.educations} onEdukasiUpdate={fetchAllData} />;
      case 'berita':
        return <ManagePosts posts={data.posts} onPostsUpdate={fetchAllData} />;
      default:
        return <Dashboard laporanList={data.laporan} posts={data.posts} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginForm
        credentials={credentials}
        setCredentials={setCredentials}
        onLogin={handleLogin}
        loading={loading.login}
      />
    );
  }

  const menuWithOwnHeader = ['daftar', 'data-supir', 'data-truk', 'data-wilayah', 'tugas-harian', 'tugas-aduan', 'akun-masyarakat', 'edukasi'];

  return (
    <div className="bg-[#F8FAFB] min-w-0">
        <>
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[24px] p-8 shadow-sm border border-white/50 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-3">
                Overview Panel
              </span>
              <h1 className="text-3xl font-extrabold text-[#1A2E35] tracking-tight">
                Selamat Datang, Admin!
              </h1>
              <p className="text-[#5B7078] mt-2 font-medium">
                Sistem Manajemen Kebersihan Terintegrasi
              </p>
              {userRole && (
                <p className="text-xs text-green-700 mt-1 font-semibold">Role: {userRole}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="bg-white px-5 py-2.5 rounded-2xl flex items-center shadow-sm space-x-3 border border-gray-100">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <Calendar className="text-green-600 w-4 h-4" />
                </div>
                <span className="font-bold text-[#344854] text-sm">{formattedDate}</span>
              </div>

              <div className="flex items-center bg-white/40 p-1.5 rounded-2xl border border-white/60">
                <button className="p-2.5 text-[#5B7078] hover:bg-white rounded-xl transition-all">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-[#5B7078] hover:bg-white rounded-xl transition-all">
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-red-500 hover:bg-white rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              <div className="hidden lg:block h-12 w-[1.5px] bg-[#C5D7CC]/50 mx-2"></div>

              <div className="flex items-center bg-white pl-4 pr-2 py-2 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-right mr-3">
                  <p className="text-sm font-bold text-[#1A2E35]">Administrator</p>
                  <p className="text-[10px] font-bold text-green-600 uppercase">DLH Toba</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2D4A53] flex items-center justify-center text-white shadow-inner">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={menuWithOwnHeader.includes(activeMenu) ? "" : "bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 min-h-[60vh]"}>
          {!menuWithOwnHeader.includes(activeMenu) && (
            <div className="mb-8 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1A2E35] capitalize">
                {activeMenu.replace('-', ' ')}
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari data..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-100 w-64"
                />
              </div>
            </div>
          )}
          {renderActiveContent()}
        </div>
      </>
    </div>
  );
}

// Export API instance untuk digunakan di komponen lain
export { api };
