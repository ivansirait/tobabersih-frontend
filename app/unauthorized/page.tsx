'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, Home, LogOut } from 'lucide-react'
import { useEffect } from 'react'

export default function UnauthorizedPage() {
  const router = useRouter()

  const handleLogout = () => {
    // Hapus token dari cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
    router.push('/login')
  }

  const handleHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Akses Ditolak</h1>
            <p className="text-gray-600">
              Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
          </div>

          {/* Description */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-left">
            <p className="text-sm font-semibold text-red-900">
              Kemungkinan penyebab:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
              <li>Role akun Anda tidak sesuai dengan halaman ini</li>
              <li>Token akses sudah kadaluarsa</li>
              <li>Anda mencoba mengakses area terbatas</li>
            </ul>
          </div>

          {/* Action Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
            <p className="text-sm text-blue-800">
              <strong>Info Akun:</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Hubungi administrator jika Anda merasa ini adalah kesalahan.
            </p>
          </div>

          {/* Button Group */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleHome}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Beranda</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Kode Kesalahan: 403 Forbidden
            </p>
            <p className="text-xs text-gray-500">
              Jika masalah berlanjut, hubungi support@tobabershi.id
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
