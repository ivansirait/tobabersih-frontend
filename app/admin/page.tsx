"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';

// Import Komponen
import Dashboard from './components/Dashboard';
import LoginForm from './components/LoginForm';
import ManagePosts from './components/ManagePosts';
import ManageSupir from './components/ManageSupir';
import ManageTruk from './components/ManageTruk';
import PetaSampah from './components/PetaSampah';
import ManageWilayah from './components/ManageWilayah';
import ManagePenugasan from './components/ManageLayananAduan';
import ManageLaporan from './components/ManageLaporan';
import ManageGalleries from './components/ManageGalleries';
import ManageEdukasi from './components/ManageEdukasi';
import { getRoleRoute, normalizeRole } from '@/lib/authRole';

// --- API Instance ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api'
    : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

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

export default function AdminPage() {
  const router = useRouter();
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [checkingAuth, setCheckingAuth] = useState(true);

  // UI State
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState({ login: false, data: false });

  // Data State
  const [data, setData] = useState({
    laporan: [],
    posts: [],
    supir: [],
    truk: [],
    wilayah: [],
    penugasan: [],
    galleries: []
  });

  const [laporanList, setLaporanList] = useState([]);
  const [posts, setPosts] = useState([]);

  // Format tanggal
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const role = localStorage.getItem('role');

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    try {
      const userData = JSON.parse(user);
      const normalizedRole = normalizeRole(userData.role || role || '');

      if (normalizedRole !== 'ADMIN') {
        router.replace('/unauthorized');
        return;
      }

      setUserRole(normalizedRole);
      setIsLoggedIn(true);
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.replace('/login');
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLaporanList([]);
      setPosts([]);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    setLoading(prev => ({ ...prev, data: true }));

    try {
      // Fetch laporan - coba berbagai endpoint
      try {
      const laporanRes = await axios.get(`${API_BASE_URL}/admin/laporan`, { headers, timeout: 5000 });
        const laporanData = Array.isArray(laporanRes.data) ? laporanRes.data : (laporanRes.data?.data || []);
        setLaporanList(laporanData);
        setData(prev => ({ ...prev, laporan: laporanData }));
        console.log('✅ Laporan berhasil dimuat:', laporanData.length, 'item');
      } catch (err: any) {
        console.warn('⚠️ Fetch laporan admin gagal, coba endpoint umum:', err.message);
        try {
          const laporanRes = await axios.get(`${API_BASE_URL}/laporan`, { headers, timeout: 5000 });
          
          const laporanData = Array.isArray(laporanRes.data) ? laporanRes.data : (laporanRes.data?.data || []);
          setLaporanList(laporanData);
          setData(prev => ({ ...prev, laporan: laporanData }));
          console.log('✅ Laporan dari endpoint umum:', laporanData.length, 'item');
        } catch {
          console.error('❌ Gagal fetch laporan dari semua endpoint');
          setLaporanList([]);
        }
      }

      // Fetch posts/berita
      try {
        const postsRes = await axios.get(`${API_BASE_URL}/posts`, { headers, timeout: 5000 });
        const postsData = Array.isArray(postsRes.data)
          ? postsRes.data
          : Array.isArray(postsRes.data?.data)
            ? postsRes.data.data
            : [];
        setPosts(postsData);
        setData(prev => ({ ...prev, posts: postsData }));
        console.log('✅ Posts berhasil dimuat:', postsData.length, 'item');
      } catch (err: any) {
        console.warn('⚠️ Fetch posts gagal:', err.message);
        setPosts([]);
        setData(prev => ({ ...prev, posts: [] }));
      }
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // Fetch data when logged in + auto-refresh setiap 30 detik
  useEffect(() => {
    if (isLoggedIn) {
      // Fetch data immediately
      fetchAllData();

      // Auto-refresh setiap 30 detik
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh data...');
        fetchAllData();
      }, 30000); // 30 detik

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Handle login
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
        const token =
          res.data.token ||
          res.data.data?.token ||
          res.data.accessToken ||
          res.data.data?.accessToken ||
          'session-login';
        const normalizedRole = normalizeRole(user?.role || res.data.role || res.data.data?.role);

        if (token && token !== 'undefined' && token !== 'null') {
          localStorage.setItem('token', token);
          Cookies.set('token', token, { expires: 1, path: '/', sameSite: 'lax' });
        }
        
        if (user) {
          localStorage.setItem('user', JSON.stringify({ ...user, role: normalizedRole }));
        }
        localStorage.setItem('role', normalizedRole);

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

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Cookies.remove('token');
    setIsLoggedIn(false);
    setUserRole(null);
    window.location.href = '/login';
  };

  // Render active content
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
        // Tugas harian sudah digabung dengan tugas aduan
        return <ManagePenugasan />;
      case 'tugas-aduan':
        return <ManagePenugasan />;
      case 'daftar':
        return <ManageLaporan />;
      case 'data-supir':
        return <ManageSupir />;
      case 'data-truk':
        return <ManageTruk />;
      case 'data-wilayah':
        return <ManageWilayah />;
      case 'berita':
        return <ManagePosts posts={data.posts} onPostsUpdate={fetchAllData} />;
      case 'galeri':
        return <ManageGalleries galleries={data.galleries || []} onGalleriesUpdate={fetchAllData} />;
      case 'edukasi':
        return <ManageEdukasi />;
      default:
        return <Dashboard laporanList={data.laporan} posts={data.posts} />;
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="bg-[#F8FAFB] min-w-0 w-full">
      {/* Render active admin content */}
      {isLoggedIn ? renderActiveContent() : (
        <LoginForm
          credentials={credentials}
          setCredentials={setCredentials}
          onLogin={handleLogin}
          loading={loading.login}
        />
      )}
    </div>
  );
}
