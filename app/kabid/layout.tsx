'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import KabidSidebar from './components/KabidSidebar';
import { normalizeRole } from '@/lib/authRole';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

export default function KabidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
          console.log('[KABID LAYOUT] ❌ No token or user found');
          router.replace('/login');
          return;
        }

        const user = JSON.parse(userStr);
        const role = normalizeRole(user?.role || localStorage.getItem('role') || '');

        // ✅ Verify token dengan backend menggunakan API_BASE_URL
        try {
          const response = await axios.post(
            `${API_BASE_URL}/auth/verify`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!response.data?.success) {
            console.log('[KABID LAYOUT] ⚠️ Token verification failed');
            localStorage.clear();
            router.replace('/login');
            return;
          }

          console.log(`[KABID LAYOUT] ✅ Token verified for: ${response.data.user?.email}`);
        } catch (apiError) {
          console.error('[KABID LAYOUT] ❌ Token verification error:', apiError);
          localStorage.clear();
          router.replace('/login');
          return;
        }

        // ✅ Check role
        if (role !== 'KABID') {
          console.log(`[KABID LAYOUT] 🔐 User role ${role} is not KABID`);
          router.replace('/unauthorized');
          return;
        }

        setIsLoggedIn(true);
      } catch (error) {
        console.error('[KABID LAYOUT] Error:', error);
        localStorage.clear();
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KabidSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleLogout}
      />
      <main className="md:ml-[300px] min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}