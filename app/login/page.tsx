"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Mail, Lock, LogIn, Eye, EyeOff, Leaf } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const normalizeRole = (role?: string) => {
  const safeRole = (role || '').toLowerCase();
  if (safeRole.includes('admin')) return 'admin';
  if (safeRole.includes('kabid')) return 'kabid';
  if (safeRole.includes('operator') || safeRole.includes('supir')) return 'supir';
  if (safeRole.includes('warga') || safeRole.includes('masyarakat')) return 'warga';
  return '';
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });

      if (res.data?.success) {
        const user = res.data.user || res.data.data?.user || res.data.data || null;
        const token =
          res.data.token ||
          res.data.data?.token ||
          res.data.accessToken ||
          res.data.data?.accessToken ||
          'session-login';
        const role = normalizeRole(res.data.role || user?.role || res.data.data?.role);

        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        localStorage.setItem('token', token);
        Cookies.set('token', token, { expires: 1, path: '/', sameSite: 'lax' });

        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'kabid') {
          router.push('/kabid');
        } else if (role === 'supir') {
          router.push('/Supir');
        } else if (role === 'warga') {
          router.push('/Warga');
        } else {
          router.push('/');
        }
      } else {
        setError(res.data?.message || 'Login gagal.');
      }
    } catch (err: any) {
      // Menangkap pesan error dari backend
      setError(err.response?.data?.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F0] flex items-center justify-center p-6 font-sans">
      {/* Container Utama */}
      <div className="bg-white w-full max-w-[880px] flex flex-col md:flex-row rounded-[1.5rem] shadow-2xl overflow-hidden border border-gray-100">
        
        {/* SISI KIRI: Brand Identity */}
        <div className="w-full md:w-1/2 bg-[#1B4332] flex flex-col items-center justify-center p-12 relative overflow-hidden">

          <div className="relative z-10 flex flex-col items-center">
            {/* Area Logo PNG */}
            <div className="mb-6 flex justify-center">
               <div className="w-50 h-50 md:w-54 md:h-54 ">
                <img 
                  src="/dlh.png" 
                  alt="Logo DLH" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback jika gambar tidak ditemukan
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Fallback Icon jika img error */}
                <Leaf className="text-[#40916C] w-full h-full hidden img-error:block" />
              </div>
            </div>

           <div className="space-y-3">
              <h1 className="text-white text-xl font-black tracking-[0.1em] uppercase leading-none">
                DINAS Lingkungan Hidup
              </h1>
              <h2 className="text-[#74C69D] text-xl font-medium tracking-[0.1em] uppercase">
                Kabupaten Toba
              </h2>
              </div>
          </div>
        </div>

        {/* SISI KANAN: Login Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 bg-white flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h3 className="text-2xl font-bold text-[#1B4332] tracking-tight">Selamat Datang</h3>
            <p className="text-gray-400 text-sm mt-2">Silakan login untuk mengakses layanan</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded-r-lg animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Instansi</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1B4332] transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  // Penambahan text-black di sini
                  className="w-full pl-12 pr-4 py-3.5 text-black bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B4332]/10 focus:border-[#1B4332] focus:bg-white outline-none text-sm transition-all"
                  placeholder="name@dlh.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kata Sandi</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black-300 group-focus-within:text-[#1B4332] transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // Penambahan text-black di sini
                  className="w-full pl-12 pr-12 py-3.5 text-black bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B4332]/10 focus:border-[#1B4332] focus:bg-white outline-none text-sm transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#1B4332] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B4332] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#2d5a44] active:scale-[0.98] transition-all shadow-xl shadow-[#1B4332]/20 flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>MASUK SEKARANG</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col items-center space-y-4">
            <p className="text-[13px] text-gray-500">
              Belum punya akun?{' '}
              <Link href="/register" className="text-[#1B4332] font-bold hover:text-[#40916C] transition-colors">
                Daftar Warga
              </Link>
            </p>
            <Link href="/" className="text-[11px] font-black text-gray-300 hover:text-[#1B4332] transition-colors uppercase tracking-[0.2em]">
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}