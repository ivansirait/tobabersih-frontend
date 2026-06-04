"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Mail, Lock, User, Phone, LogIn, ArrowLeft } from 'lucide-react';
import { validatePhone, validateEmail } from '@/app/lib/validation';
import toast, { Toaster } from 'react-hot-toast';

export default function RegisterWargaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi email dan telepon
    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.valid) {
      setError(emailCheck.message || 'Email tidak valid');
      toast.error(emailCheck.message || 'Email tidak valid');
      return;
    }

    const phoneCheck = validatePhone(formData.phoneNumber);
    if (!phoneCheck.valid) {
      setError(phoneCheck.message || 'Nomor telepon tidak valid');
      toast.error(phoneCheck.message || 'Nomor telepon tidak valid');
      return;
    }

    // Validasi password
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber
      });

      if (response.data.success) {
        // Simpan token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect ke halaman utama Warga
        router.push('/Warga');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8">
        <Toaster position="top-right" />
        {/* Tombol Kembali */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-green-600 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Kembali</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <User className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Daftar Akun Warga</h2>
          <p className="text-gray-500 mt-2">Bergabung untuk melaporkan sampah</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Masukkan nama lengkap"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="contoh@email.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="08123456789"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Minimal 6 karakter"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ulangi password"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Tombol Daftar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Daftar Sekarang</span>
              </>
            )}
          </button>
        </form>

        {/* Link ke Login */}
        <p className="text-center mt-6 text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/Warga/login" className="text-green-600 font-semibold hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}