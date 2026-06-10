"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Clock, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft,
  Newspaper,
} from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  category?: string;
  slug?: string;
  createdAt?: string;
  date?: string;
}

const PENGUMUMAN_CATEGORIES = ['pengumuman', 'PENGUMUMAN', 'Pengumuman'];
const isPengumuman = (cat?: string) => PENGUMUMAN_CATEGORIES.includes(cat || '');
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500';

const fmtDate = (v?: string) => {
  if (!v) return '';
  try { return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return v; }
};
const stripHtml = (html?: string) => html?.replace(/<[^>]+>/g, '') ?? '';

type TabType = 'semua' | 'berita' | 'pengumuman';
const ITEMS_PER_PAGE = 9;

const NAV_LINKS = ['Tentang', 'Edukasi', 'Berita', 'Galeri'];
const navHref = (item: string) => {
  const key = item.toLowerCase();
  if (key === 'berita') return '/berita';
  if (key === 'edukasi') return '/edukasi';
  if (key === 'galeri') return '/galeri';
  return `/#${key}`;
};

export default function BeritaPage() {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('semua');
  const [page, setPage]         = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
      const BASE = rawBase ? rawBase.replace(/\/$/, '') + '/api' : '/api';
      try {
        const res = await axios.get(`${BASE}/posts`);
        const raw = res.data;
        const list: Post[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setPosts(list);
      } catch (err) {}
      setLoading(false);
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setPage(1); }, [activeTab]);

  const filtered = posts.filter(p => {
    if (activeTab === 'berita') return !isPengumuman(p.category);
    if (activeTab === 'pengumuman') return isPengumuman(p.category);
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const featured   = paginated[0];
  const rest       = paginated.slice(1);

  const beritaCount     = posts.filter(p => !isPengumuman(p.category)).length;
  const pengumumanCount = posts.filter(p =>  isPengumuman(p.category)).length;

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : 'bg-slate-900/70'}`}>
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
                className={`hover:text-green-300 transition-colors relative group ${item === 'Berita' ? 'text-green-400' : ''}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-green-400 transition-all ${item === 'Berita' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
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
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

         <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-20 relative z-10">
          
          <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
            <Link href="/" className="hover:text-green-400 transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-green-400 font-semibold">Berita &amp; Pengumuman</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            Berita &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Pengumuman</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Informasi terkini seputar kegiatan, program, dan pengumuman resmi dari Dinas Lingkungan Hidup Kabupaten Toba.
          </p>
        </div>
      </div>

      {/* FILTER TABS (tanpa search bar) */}
      <div className="sticky top-20 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-1">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['semua', 'berita', 'pengumuman'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all ${
                  activeTab === tab
                    ? tab === 'pengumuman' ? 'bg-orange-500 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {tab === 'semua' ? 'Semua' : tab === 'berita' ? 'Berita' : 'Pengumuman'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-20" />
                  <div className="h-5 bg-slate-200 rounded" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Newspaper size={36} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Belum ada konten tersedia</h3>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featured && (
              <Link
                href={`/berita/${featured.slug || featured.id}`}
                className="group block mb-10 rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-300 md:flex"
              >
                <div className="md:w-1/2 h-64 md:h-auto overflow-hidden bg-slate-100 relative">
                  <img
                    src={featured.imageUrl || FALLBACK_IMG}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                  <span className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-widest bg-green-500 text-white px-3 py-1.5 rounded-full">Utama</span>
                </div>
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                  <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 w-fit ${isPengumuman(featured.category) ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {featured.category || 'Berita'}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-snug mb-4 group-hover:text-green-700 transition-colors line-clamp-3">
                    {featured.title}
                  </h2>
                  <p className="text-slate-500 leading-relaxed line-clamp-3 mb-6 text-sm">{stripHtml(featured.content)}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${isPengumuman(featured.category) ? 'text-orange-500' : 'text-green-600'}`}>
                      <Clock size={12} /> {fmtDate(featured.createdAt || featured.date)}
                    </p>
                    <span className="flex items-center gap-2 font-bold text-sm text-green-600 group-hover:gap-3 transition-all">
                      Baca Selengkapnya <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid Posts */}
            {rest.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {rest.map(post => (
                  <Link
                    key={post.id}
                    href={`/berita/${post.slug || post.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img
                        src={post.imageUrl || FALLBACK_IMG}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 w-fit ${isPengumuman(post.category) ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {post.category || 'Berita'}
                      </span>
                      <h3 className="font-bold text-slate-800 text-base line-clamp-2 mb-2 leading-snug group-hover:text-green-700 transition-colors flex-1">
                        {post.title}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">{stripHtml(post.content)}</p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                        <p className={`text-xs font-semibold flex items-center gap-1 ${isPengumuman(post.category) ? 'text-orange-500' : 'text-green-600'}`}>
                          <Clock size={11} /> {fmtDate(post.createdAt || post.date)}
                        </p>
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Baca <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-green-500 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${page === p ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:border-green-500 hover:text-green-600'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-green-500 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            {/* Button kembali - kanan bawah */}
            <div className="flex justify-end mt-4">
              <Link href="/#berita" className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda
              </Link>
            </div>
          </>
        )}
      </main>

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