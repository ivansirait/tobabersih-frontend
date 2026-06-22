"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight } from "lucide-react";

interface EducationPost {
  id: number;
  judul?: string;
  title?: string;
  deskripsi?: string | null;
  content?: string | null;
  media_url?: string;
  media_type?: string;
  mediaUrl?: string;
  mediaType?: string;
}

const getTitle    = (e: EducationPost) => e.judul    || e.title    || "(Tanpa Judul)";
const getDesc     = (e: EducationPost) => e.deskripsi || e.content  || "";
const getMediaUrl = (e: EducationPost) => e.mediaUrl  || e.media_url || "";
const getMediaType= (e: EducationPost) => (e.mediaType || e.media_type || "IMAGE").toUpperCase();

const FALLBACK_IMG = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600";

const NAV_LINKS = ["Tentang", "Edukasi", "Berita", "Galeri"];
const navHref = (item: string) => {
  const key = item.toLowerCase();
  if (key === "berita") return "/berita";
  if (key === "edukasi") return "/edukasi";
  if (key === "galeri") return "/galeri";
  return `/#${key}`;
};

export default function EdukasiListPage() {
  const [items, setItems]     = useState<EducationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";
        const res = await axios.get(`${BASE}/edukasi`);
        const raw = res.data;
        const list: EducationPost[] = Array.isArray(raw) ? raw : raw?.data ?? [];
        setItems(list);
      } catch (err) {
        console.error("[edukasi] FETCH ERROR:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f8fb]">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-slate-900/95 backdrop-blur-md shadow-lg" : "bg-slate-900/70"}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-xs md:text-sm font-black uppercase tracking-tight text-white">Dinas Lingkungan Hidup</h1>
              <p className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-green-400">Kabupaten Toba</p>
            </div>
          </div>
          <div className="hidden lg:flex gap-8 font-semibold text-white/90">
            {NAV_LINKS.map(item => (
              <Link
                key={item}
                href={navHref(item)}
                className={`hover:text-green-300 transition-colors relative group ${item === "Edukasi" ? "text-green-400" : ""}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-green-400 transition-all ${item === "Edukasi" ? "w-full" : "w-0 group-hover:w-full"}`} />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-white hover:text-green-400 font-bold px-4 transition-colors">Login</Link>
            <Link href="/Warga" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95">Lapor!</Link>
          </div>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <div className="relative pt-20 bg-slate-900 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
         <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-20 relative z-10">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
            <Link href="/" className="hover:text-green-400 transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-green-400 font-semibold">Edukasi Lingkungan</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            Edukasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Lingkungan</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Informasi dan materi pembelajaran seputar lingkungan hidup untuk meningkatkan kesadaran masyarakat.
          </p>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                <div className="h-52 bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold">Belum ada materi edukasi</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {items.map((edu) => {
              const title     = getTitle(edu);
              const desc      = getDesc(edu);
              const mediaUrl  = getMediaUrl(edu);
              const mediaType = getMediaType(edu);
              return (
                <div
                  key={edu.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="h-52 bg-slate-100 overflow-hidden flex-shrink-0">
                    {mediaType === "VIDEO" ? (
                      <video src={mediaUrl} className="w-full h-full object-cover" controls />
                    ) : (
                      <img
                        src={mediaUrl || FALLBACK_IMG}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Edukasi</span>
                    <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2 leading-snug">{title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed flex-1">{desc}</p>
                    <Link
                      href={`/edukasi/${edu.id}`}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 hover:gap-3 transition-all"
                    >
                      Baca Selengkapnya <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Button kembali - kanan bawah */}
        {!loading && items.length > 0 && (
          <div className="flex justify-end mt-10">
            <Link
              href="/#edukasi"
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda
            </Link>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white pt-10 pb-8 mt-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 <span className="text-slate-300 font-semibold">Dinas Lingkungan Hidup Kabupaten Toba</span>. Seluruh hak cipta dilindungi.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-slate-500 hover:text-green-400">Beranda</Link>
              <Link href="/privasi" className="text-slate-500 hover:text-green-400">Kebijakan Privasi</Link>
            </div>  
          </div>
        </div>
      </footer>
    </div>
  );
}