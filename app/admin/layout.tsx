"use client";
import Sidebar from "./components/Sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');

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
    if (path.includes('/admin/Galeri')) return 'galeri';
    if (path.includes('/admin/edukasi')) return 'edukasi';
    if (path.includes('/admin/pengaturan')) return 'pengaturan';
    return 'dashboard';
  };

  // Update activeMenu saat pathname berubah
  useEffect(() => {
    const menuId = getMenuIdFromPath(pathname);
    setActiveMenu(menuId);
  }, [pathname]);

  // Fungsi logout yang nanti dikirim ke Sidebar
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.push("/login");
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. SIDEBAR: Akan selalu tampil di semua sub-halaman admin */}
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onLogout={handleLogout} />

      {/* 2. KONTEN UTAMA: Area ini yang akan berubah isinya */}
      <main className="flex-1 transition-all duration-300 min-w-0 ml-0 md:ml-[280px] lg:ml-[280px] xl:ml-[280xl]">
        <div className={`p-3 md:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto pt-16 md:pt-0 ${
          isMobile ? 'px-3 py-4' : ''
        }`}>
          {children}
          {/* 'children' di sini adalah isi dari page.tsx folder yang kamu buat */}
        </div>
      </main>
    </div>
  );
}