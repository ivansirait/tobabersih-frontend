"use client";
import {
  Menu, X, Truck, FileText, LogOut, ChevronLeft,
  LayoutDashboard, Database, ChevronDown, ChevronUp,
  Users, Map, Calendar, ClipboardList, AlertCircle,
  Newspaper, Image as ImageIcon, Settings, Route, GraduationCap
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ activeMenu, setActiveMenu, onLogout }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'data-operasional': true,
    'manajemen-tugas': false
  });


  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);


  useEffect(() => {
    const getGroupIdForMenu = (menuId: string): string | null => {
      const groupMap: Record<string, string[]> = {
        'data-operasional': ['data-supir', 'data-truk', 'data-wilayah', 'manajemen-rute', 'akun-masyarakat'],
        'manajemen-tugas': ['tugas-harian'],
        'manajemen-konten': ['berita', 'galeri', 'edukasi'],
      };

      for (const [groupId, items] of Object.entries(groupMap)) {
        if (items.includes(menuId)) return groupId;
      }
      return null;
    };

    const groupId = getGroupIdForMenu(activeMenu);
    if (groupId) {
      setOpenGroups(prev => ({ ...prev, [groupId]: true }));
    }
  }, [activeMenu]);

  const menuConfig = useMemo(() => [
    { type: "item", id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-emerald-400 to-green-600', href: '/admin' },
    {
      type: "group",
      id: 'data-operasional',
      group: "Data & Operasional",
      icon: Database,
      items: [
        { id: 'data-supir', label: 'Data Supir', icon: Users, color: 'from-sky-400 to-indigo-600', href: '/admin/Supir' },
        { id: 'data-truk', label: 'Data Armada', icon: Truck, color: 'from-amber-400 to-orange-600', href: '/admin/Truk' },
        { id: 'data-wilayah', label: 'Data Wilayah', icon: Map, color: 'from-teal-400 to-green-600', href: '/admin/Wilayah' },
        { id: 'manajemen-rute', label: 'Manajemen Rute', icon: Route, color: 'from-purple-400 to-pink-600', href: '/admin/ManajemenRute' },
        { id: 'akun-masyarakat', label: 'Akun Masyarakat', icon: Users, color: 'from-blue-400 to-indigo-600', href: '/admin/AkunMasyarakat' },
      ]
    },
    { type: "item", id: 'peta-sampah', label: 'Peta Operasional', icon: Map, color: 'from-emerald-500 to-teal-500', href: '/admin/PetaSampah' },
    {
    type: "item", id: 'tugas-aduan', label: 'Tugas Aduan', icon: AlertCircle, color: 'from-lime-300 to-green-500', href: '/admin/LayananAduan'
  },
    {
      type: "group",
      id: 'manajemen-konten',
      group: "Manajemen Konten",
      icon: Newspaper,
      items: [
        { id: 'berita', label: 'Kelola Berita', icon: Newspaper, color: 'from-green-500 to-emerald-600', href: '/admin/berita' },
        { id: 'galeri', label: 'Galeri', icon: ImageIcon, color: 'from-teal-500 to-emerald-600', href: '/admin/galeri' },
        { id: 'edukasi', label: 'Edukasi', icon: GraduationCap, color: 'from-cyan-500 to-blue-600', href: '/admin/edukasi' },
      ]
    }
  ], []);

  const NavItem = useCallback(({ item, isSubItem = false }: { item: any, isSubItem?: boolean }) => {
    const isActive = activeMenu === item.id;

    const handleClick = () => {
      setIsMobileOpen(false);
    };

    if (item.href) {
      return (
        <Link
          href={item.href}
          onClick={handleClick}
          className={`w-full flex items-center gap-3 transition-all duration-300 rounded-xl group relative
            ${isSubItem ? 'px-4 py-2.5 mt-0.5' : 'px-4 py-3.5 mb-1'}
            ${isActive
              ? 'bg-white/10 text-white shadow-[inset_0px_0px_12px_rgba(255,255,255,0.05)]'
              : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}
        >
          {isActive && (
            <div className="absolute left-0 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          )}

          <item.icon size={isSubItem ? 18 : 22}
            className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`}
          />
          <span className={`${isSubItem ? 'text-sm' : 'text-sm'} font-medium tracking-wide`}>{item.label}</span>
        </Link>
      );
    }


    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-3 transition-all duration-300 rounded-xl group relative
          ${isSubItem ? 'px-4 py-2.5 mt-0.5' : 'px-4 py-3.5 mb-1'}
          ${isActive
            ? 'bg-white/10 text-white shadow-[inset_0px_0px_12px_rgba(255,255,255,0.05)]'
            : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}
      >
        {isActive && (
          <div className="absolute left-0 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
        )}

        <item.icon size={isSubItem ? 18 : 22}
          className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`}
        />
        <span className={`${isSubItem ? 'text-sm' : 'text-sm'} font-medium tracking-wide`}>{item.label}</span>
      </button>
    );
  }, [activeMenu, setIsMobileOpen]);

  const GroupItem = useCallback(({ group }: { group: any }) => {
    const isOpen = openGroups[group.id];
    const hasActiveChild = group.items.some((item: any) => item.id === activeMenu);

    return (
      <div className={`mb-2 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-black/10 pb-2' : ''}`}>
        <button
          onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
          className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-300 rounded-xl group
            ${hasActiveChild && !isOpen ? 'text-white' : 'text-emerald-100/60 hover:text-white'}`}
        >
          <group.icon size={22} className={`${hasActiveChild ? 'text-emerald-400' : 'group-hover:text-white'}`} />
          <span className="text-sm font-semibold flex-1 text-left tracking-wide">{group.group}</span>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} className="opacity-40" />
          </div>
        </button>

        <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
          <div className="overflow-hidden">
            <div className="mx-4 mt-1 pl-4 border-l border-white/10 space-y-1">
              {group.items.map((item: any, index: number) => (
                <NavItem key={`${item.id}-${index}`} item={item} isSubItem />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }, [activeMenu, openGroups]);

  return (
    <>

      <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-[#064E3B] border-b border-white/5 z-[60] flex items-center justify-between">
        <div className="w-12 h-12 flex-shrink-0 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
            alt="Logo Kabupaten Toba"
            className="w-full h-full object-contain" />
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>


      <div
        className={`fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden
          ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileOpen(false)}
      />


      <aside
        style={{ backgroundColor: '#064E3B' }}
        className={`fixed left-0 top-0 h-screen z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col w-[280px] shadow-[20px_0_50px_rgba(0,0,0,0.3)]
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >

        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-400 to-green-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="w-12 h-12 flex-shrink-0 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
                  alt="Logo Kabupaten Toba"
                  className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black text-white leading-tight tracking-tighter uppercase">DLH KABUPATEN</h1>
              <p className="text-[11px] font-bold text-emerald-400 tracking-[0.3em]">TOBA</p>
            </div>
          </div>
        </div>


        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {menuConfig.map((item, idx) => {
            if (item.type === 'section-header') {
              return (
                <div key={`header-${idx}`} className="px-4 pt-6 pb-2">
                  <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.25em]">{item.label}</p>
                </div>
              );
            }
            return item.type === 'group' ? (
              <GroupItem key={item.id || idx} group={item} />
            ) : (
              <NavItem key={item.id || idx} item={item} />
            );
          })}
        </nav>


        <div className="p-4 mt-auto">
          <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Administrator</p>
                <p className="text-[10px] text-emerald-400/60 truncate">admin@toba.go.id</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300 rounded-xl font-bold text-xs"
            >
              <LogOut size={16} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(52, 211, 153, 0.2); }
      `}</style>
    </>
  );
}