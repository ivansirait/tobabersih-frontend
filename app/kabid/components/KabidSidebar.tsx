'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  LayoutDashboard,
  Truck,
  BarChart3,
  MapPin,
  Download,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
}

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
}

export default function KabidSidebar(_props: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Kepala Bidang');
  const [userEmail, setUserEmail] = useState('kabid@toba.go.id');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = useMemo<MenuItem[]>(() => [
    { id: 'dashboard', label: 'Dashboard Kinerja', icon: LayoutDashboard, href: '/kabid' },
    { id: 'monitoring', label: 'Monitoring Armada', icon: Truck, href: '/kabid/monitoring-armada' },
    { id: 'statistik', label: 'Statistik & Analitik', icon: BarChart3, href: '/kabid/statistik' },
    { id: 'peta', label: 'Peta Aduan', icon: MapPin, href: '/kabid/peta-aduan' },
    { id: 'rekap', label: 'Rekapitulasi Laporan', icon: Download, href: '/kabid/rekap' },
  ], []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      setUserName(user.name || user.fullName || 'Kepala Bidang');
      setUserEmail(user.email || 'kabid@toba.go.id');
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      router.push('/login');
    }
  };

  const NavItem = ({ item, isSubItem = false }: { item: MenuItem; isSubItem?: boolean }) => {
   const isActive =item.href === '/kabid'  ? pathname === '/kabid'  : pathname.startsWith(item.href);

    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 mb-1 transition-all duration-300 rounded-xl group relative ${
          isSubItem ? 'ml-3' : ''
        } ${
          isActive
            ? 'bg-white/10 text-white shadow-inner'
            : 'text-emerald-100/60 hover:text-white hover:bg-white/5'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 w-1 h-6 bg-emerald-400 rounded-r-full" />
        )}
        <item.icon size={22} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`} />
        <span className="text-sm font-medium tracking-wide">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-[#064E3B] border-b border-white/5 z-[60] flex items-center justify-between">
        <div className="w-12 h-12 flex-shrink-0 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
            alt="Logo Kabupaten Toba"
            className="w-full h-full object-contain"
          />
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside
        style={{ backgroundColor: '#064E3B' }}
        className={`fixed left-0 top-0 h-screen z-50 transition-all duration-500 ease-in-out flex flex-col w-[280px] shadow-[20px_0_50px_rgba(0,0,0,0.3)] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
                alt="Logo Kabupaten Toba"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black text-white leading-tight tracking-tighter uppercase">DLH KABUPATEN</h1>
              <p className="text-[11px] font-bold text-emerald-400 tracking-[0.3em]">TOBA</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-emerald-400/60 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{isLoggingOut ? 'LOGGING OUT...' : 'LOGOUT'}</span>
            </button>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(52, 211, 153, 0.2);
        }
      `}</style>
    </>
  );
}
