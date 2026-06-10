"use client";
import Sidebar from "./components/Sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { normalizeRole } from '@/lib/authRole';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Map path ke menu ID
  const getMenuIdFromPath = (path: string) => {
    if (path === '/admin' || path === '/admin/') return 'dashboard';
    // Di dalam fungsi getMenuIdFromPath, tambahkan:
    if (path.includes('/admin/KelolaKabid')) return 'manajemen-pengguna'; 
    if (path.includes('/admin/Supir')) return 'data-supir';
    if (path.includes('/admin/Truk')) return 'data-truk';
    if (path.includes('/admin/Wilayah')) return 'data-wilayah';
    if (path.includes('/admin/ManajemenRute')) return 'manajemen-rute';
    if (path.includes('/admin/AkunMasyarakat')) return 'akun-masyarakat';
    if (path.includes('/admin/PetaSampah')) return 'peta-sampah';
    if (path.includes('/admin/LayananAduan')) return 'tugas-aduan';
    if (path.includes('/admin/berita')) return 'berita';
    // Sidebar: href Galeri adalah /admin/galleries (huruf kecil)
    if (path.includes('/admin/galleries') || path.includes('/admin/Galeri')) return 'galleries';

    if (path.includes('/admin/edukasi')) return 'edukasi';
    if (path.includes('/admin/pengaturan')) return 'pengaturan';
    return 'dashboard';
  };

  // Update activeMenu saat pathname berubah
  useEffect(() => {
    const menuId = getMenuIdFromPath(pathname);
    setActiveMenu(menuId);
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    console.log('[ADMIN LAYOUT DEBUG] Token exists:', !!token);
    console.log('[ADMIN LAYOUT DEBUG] User string:', userStr);

    if (!token || !userStr) {
      console.log('[ADMIN LAYOUT] Redirecting to /login - no token or user');
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const storedRole = localStorage.getItem("role");
      const extractedRole = user?.role;
      
      console.log('[ADMIN LAYOUT DEBUG] Parsed user:', user);
      console.log('[ADMIN LAYOUT DEBUG] User role field:', extractedRole);
      console.log('[ADMIN LAYOUT DEBUG] Stored role in localStorage:', storedRole);
      
      const role = normalizeRole(extractedRole || storedRole || "");
      
      console.log('[ADMIN LAYOUT DEBUG] Normalized role:', role);

      if (role !== "ADMIN") {
        console.log('[ADMIN LAYOUT] Redirecting to /unauthorized - role is', role);
        router.replace("/unauthorized");
        return;
      }

      console.log('[ADMIN LAYOUT] Authorization successful');
      setIsAuthorized(true);
    } catch (error) {
      console.error('[ADMIN LAYOUT] Parse error:', error);
      router.replace("/login");
    }
  }, [router]);

  // Fungsi logout yang nanti dikirim ke Sidebar
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.replace("/login");
  };

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. SIDEBAR: Akan selalu tampil di semua sub-halaman admin */}
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onLogout={handleLogout} />

      {/* 2. KONTEN UTAMA: Area ini yang akan berubah isinya */}
      <main className="flex-1 transition-all duration-300 min-w-0 ml-0 md:ml-[280px] lg:ml-[280px] xl:ml-[280xl]">
    <div className={`p-3 md:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto pt-16 md:pt-0 text-[16px] md:text-[18px] ${
      isMobile ? 'px-3 py-4' : ''
    }`}>
          {children}
        </div>
      </main>
    </div>
  );
}