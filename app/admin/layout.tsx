"use client";
import Sidebar from "./components/Sidebar"; // Sesuaikan path-nya
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  // Fungsi logout yang nanti dikirim ke Sidebar
  const handleLogout = () => {
    localStorage.removeItem("token");
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
      <Sidebar onLogout={handleLogout} />

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