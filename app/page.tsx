"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Mail, Instagram, Facebook,
  ArrowRight, ChevronRight, ChevronLeft,
  MapPin, Phone, Clock, X, Images,
} from 'lucide-react';

interface GalleryPhoto { id: number; imageUrl: string; caption?: string; }
interface Album { id: number; title: string; description?: string; coverUrl?: string; isSlider?: boolean; photos?: GalleryPhoto[]; }
interface EducationPost {
  id: number;
  judul?: string; title?: string;
  deskripsi?: string | null; content?: string | null;
  media_url?: string; media_type?: string;
  mediaUrl?: string; mediaType?: string;
}
interface Post { id: number; title: string; content: string; imageUrl?: string | null; category?: string; slug?: string; createdAt?: string; date?: string; }

const getEduTitle    = (e: EducationPost) => e.judul     || e.title    || '(Tanpa Judul)';
const getEduDesc     = (e: EducationPost) => e.deskripsi || e.content  || '';
const getEduMediaUrl = (e: EducationPost) => e.mediaUrl  || e.media_url || '';
const getEduMediaType= (e: EducationPost) => (e.mediaType || e.media_type || 'IMAGE').toUpperCase();

// Semua variasi penulisan kategori pengumuman
const PENGUMUMAN_CATEGORIES = ['pengumuman', 'PENGUMUMAN', 'Pengumuman'];
const isPengumuman = (cat?: string) => PENGUMUMAN_CATEGORIES.includes(cat || '');

export default function HomePage() {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [albums, setAlbums]         = useState<Album[]>([]);
  const [educations, setEducations] = useState<EducationPost[]>([]);
  const [loading, setLoading]       = useState(true);

  const [debugInfo, setDebugInfo] = useState<{
    eduStatus: string;
    eduRaw: string;
    eduCount: number;
    eduError: string;
    postsStatus: string;
    postsCount: number;
  }>({ eduStatus: 'pending', eduRaw: '', eduCount: 0, eduError: '', postsStatus: 'pending', postsCount: 0 });

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [sliderIndex, setSliderIndex]     = useState(0);
  const [isScrolled, setIsScrolled]       = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
    const BASE = rawBase ? rawBase.replace(/\/$/, '') + '/api' : '/api';

    try {
      const res = await axios.get(`${BASE}/edukasi`);
      const raw = res.data;
      const list: EducationPost[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setEducations(list.slice(0, 3));
      setDebugInfo(prev => ({ ...prev, eduStatus: 'ok', eduRaw: JSON.stringify(raw, null, 2), eduCount: list.length, eduError: '' }));
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : err?.message || String(err);
      setDebugInfo(prev => ({ ...prev, eduStatus: 'error', eduError: `${err?.response?.status || ''} ${msg}`, eduRaw: '' }));
    }

    try {
      const res = await axios.get(`${BASE}/posts`);
      const raw = res.data;
      const list: Post[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setPosts(list);
      setDebugInfo(prev => ({ ...prev, postsStatus: 'ok', postsCount: list.length }));
    } catch (err: any) {
      setDebugInfo(prev => ({ ...prev, postsStatus: 'error' }));
    }

    try {
      const res = await axios.get(`${BASE}/galleries/albums`);
      setAlbums(res.data ?? []);
    } catch (err) {}

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const sliderAlbums = albums.filter(a => a.isSlider && a.coverUrl);
  useEffect(() => {
    if (sliderAlbums.length <= 1) return;
    const id = setInterval(() => setSliderIndex(p => (p + 1) % sliderAlbums.length), 4000);
    return () => clearInterval(id);
  }, [sliderAlbums.length]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { lightboxPhoto ? setLightboxPhoto(null) : setSelectedAlbum(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [lightboxPhoto, selectedAlbum]);

  // ── FILTER: berita bukan pengumuman, pengumuman khusus kategori pengumuman
  const beritaPosts     = posts.filter(p => !isPengumuman(p.category)).slice(0, 3);
  const pengumumanPosts = posts.filter(p =>  isPengumuman(p.category)).slice(0, 4);

  const fmtDate = (v?: string) => {
    if (!v) return '';
    try { return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return v; }
  };

  const stripHtml = (html?: string) => html?.replace(/<[^>]+>/g, '') ?? '';

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const w = carouselRef.current.scrollWidth / albums.length;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -w : w, behavior: 'smooth' });
  };

  const AlbumCard = ({ album }: { album: Album }) => (
    <div onClick={() => setSelectedAlbum(album)} className="group w-full h-[380px] cursor-pointer">
      <div className="relative h-full rounded-3xl overflow-hidden shadow-xl transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-[0_0_60px_-15px_rgba(34,197,94,0.55)]">
        {album.coverUrl
          ? <img src={album.coverUrl} alt={album.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          : <div className="absolute inset-0 bg-slate-200 flex items-center justify-center"><Images size={50} className="text-slate-400" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 text-white">
          <h3 className="text-2xl font-black leading-tight break-words">{album.title}</h3>
          <p className="text-sm text-white/70 mt-1">{album.photos?.length || 0} Foto tersedia</p>
          <div className="mt-5 flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md transition-all group-hover:bg-green-500/20 group-hover:border-green-400/40">
            <span className="text-sm font-semibold">Lihat Album</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </div>
  );

  const DebugPanel = () => (
    <div className="col-span-3 my-4 border-2 border-orange-400 rounded-2xl overflow-hidden text-left font-mono text-xs">
      <div className="bg-orange-500 text-white px-4 py-2 font-bold flex items-center justify-between">
        <span>🔍 DEBUG PANEL — hapus setelah edukasi berhasil tampil</span>
        <button onClick={fetchData} className="bg-white text-orange-600 px-3 py-1 rounded-lg font-bold hover:bg-orange-50">↺ Retry</button>
      </div>
      <div className="grid grid-cols-2 divide-x divide-orange-200 bg-orange-50">
        <div className="p-3">
          <p className="font-bold text-orange-800 mb-1">Edukasi API</p>
          <p className={`font-bold ${debugInfo.eduStatus === 'ok' ? 'text-green-600' : debugInfo.eduStatus === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
            Status: {debugInfo.eduStatus}
          </p>
          {debugInfo.eduStatus === 'ok' && <p className="text-green-700">Items diterima: {debugInfo.eduCount}</p>}
          {debugInfo.eduError && <p className="text-red-600 mt-1 break-all">Error: {debugInfo.eduError}</p>}
        </div>
        <div className="p-3">
          <p className="font-bold text-orange-800 mb-1">Posts API</p>
          <p className={`font-bold ${debugInfo.postsStatus === 'ok' ? 'text-green-600' : debugInfo.postsStatus === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
            Status: {debugInfo.postsStatus}
          </p>
          {debugInfo.postsStatus === 'ok' && <p className="text-green-700">Items diterima: {debugInfo.postsCount}</p>}
        </div>
      </div>
      {debugInfo.eduRaw && (
        <div className="bg-gray-900 text-green-400 p-4 overflow-auto max-h-64">
          <p className="text-gray-500 mb-2">Raw response dari /api/edukasi:</p>
          <pre className="whitespace-pre-wrap break-all">{debugInfo.eduRaw}</pre>
        </div>
      )}
      {debugInfo.eduStatus === 'error' && (
        <div className="bg-red-50 p-4 text-red-800">
          <p className="font-bold mb-2">Kemungkinan penyebab:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Backend belum jalan di port 5000</li>
            <li>CORS tidak mengizinkan origin frontend</li>
            <li>Route <code>/api/edukasi</code> belum terdaftar di Express</li>
            <li>Perlu set <code>NEXT_PUBLIC_API_URL</code> di .env.local</li>
          </ul>
        </div>
      )}
      {debugInfo.eduStatus === 'ok' && debugInfo.eduCount === 0 && (
        <div className="bg-yellow-50 p-4 text-yellow-800">
          <p className="font-bold">API berhasil dipanggil tapi response kosong []</p>
          <p>Kemungkinan: data di DB belum ada, atau query Prisma filter salah</p>
        </div>
      )}
    </div>
  );

  if (selectedAlbum) {
    const photos = selectedAlbum.photos || [];
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 md:px-8 lg:px-12 h-20 flex items-center justify-between">
            <div className="flex-1">
              <button onClick={() => setSelectedAlbum(null)} className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all font-semibold">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:-translate-x-1 transition-all"><ChevronLeft size={16} /></div>
                <span className="text-sm">Kembali</span>
              </button>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <h2 className="text-lg md:text-2xl font-black text-gray-900">{selectedAlbum.title}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span>{photos.length} foto tersedia</span>
              </div>
            </div>
            <div className="flex-1" />
          </div>
        </div>
        {selectedAlbum.description && (
          <div className="w-full px-4 sm:px-6 md:px-8 pt-8 pb-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
              <h2 className="text-xs font-bold text-green-600 tracking-widest uppercase mb-3">Deskripsi Kegiatan</h2>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed text-justify whitespace-pre-line">{selectedAlbum.description}</p>
            </div>
          </div>
        )}
        <div className="w-full px-4 sm:px-6 md:px-8 py-8">
          {photos.length === 0
            ? <div className="text-center py-20"><Images size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">Belum ada foto</p></div>
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {photos.map(p => (
                  <div key={p.id} onClick={() => setLightboxPhoto(p.imageUrl)} className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img src={p.imageUrl} alt={p.caption || ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
        {lightboxPhoto && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
            <button className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 p-2 rounded-full"><X size={24} /></button>
            <img src={lightboxPhoto} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    );
  }

  const NAV_LINKS = ['Tentang', 'Edukasi', 'Berita', 'Galeri'];
  const navHref = (item: string) => {
    const key = item.toLowerCase();
    if (key === 'berita') return '/berita';
    if (key === 'edukasi') return '/edukasi';
    return `#${key}`;
  };

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500';

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
              <Link key={item} href={navHref(item)} className="hover:text-green-300 transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 transition-all group-hover:w-full" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-white hover:text-green-400 font-bold px-4 transition-colors">Login</Link>
            <Link href="/Warga" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95">Lapor!</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.pexels.com/photos/5424851/pexels-photo-5424851.jpeg" className="w-full h-full object-cover" alt="Background" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20" />
        </div>
        <div className="container mx-auto px-6 relative z-10 max-w-5xl">
          <div className="text-white text-center md:text-left">
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tighter">
              Menjaga <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-200">Kebersihan Toba</span>
            </h1>
            <p className="text-lg md:text-2xl font-medium opacity-95 mb-12 leading-relaxed max-w-3xl">
              Sinergi pemerintah dan masyarakat dalam mewujudkan lingkungan yang asri, bersih, dan berkelanjutan.
            </p>
          </div>
        </div>
      </header>

      {/* TENTANG */}
      <section id="tentang" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative bg-white p-4 rounded-[2rem] shadow-2xl border border-slate-100">
            <img src="https://scontent.fkno2-1.fna.fbcdn.net/v/t39.30808-6/471619320_511556705274811_5925244636833078943_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=2a1932&_nc_ohc=QJT0gElktu8Q7kNvwG5LtsN&_nc_oc=AdpqeJ1bs5718PfItqk6IMQ1xIcdQ2Nl3R0Y2TffmrqkYn0NhBqWCE4Q5eVqKTNJFK4HO-BsVl1dY13gzEMo_0OJ&_nc_zt=23&_nc_ht=scontent.fkno2-1.fna&_nc_gid=7z5o3RCzkQxbCJhUKvCilA&_nc_ss=7b289&oh=00_Af0nEDxlGgkwZ8mGmDY2_6Xy_VH_TTgfOaJkpIyhdY4JhQ&oe=69F73CCF" className="rounded-[1.5rem] w-full h-[400px] object-cover" alt="DLH" />
          </div>
          <div>
            <span className="text-green-600 font-bold tracking-[0.2em] text-xs uppercase">Profil Lembaga</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-4 mb-8">Dinas Lingkungan Hidup <span className="text-green-600 underline decoration-green-200 underline-offset-8">Toba</span></h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">Dinas Lingkungan Hidup Toba berkomitmen meningkatkan pembangunan ekonomi yang berkelanjutan berbasis potensi daerah.</p>
            <div className="space-y-6">
              <div className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600"><MapPin size={24} /></div>
                <div><h4 className="font-bold text-slate-800">Cakupan Wilayah</h4><p className="text-sm text-slate-500">9 kecamatan di Kabupaten Toba</p></div>
              </div>
              <div className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><Clock size={24} /></div>
                <div><h4 className="font-bold text-slate-800">Pelayanan 24/7</h4><p className="text-sm text-slate-500">Siaga pelaporan gangguan lingkungan</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDUKASI */}
      <section id="edukasi" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-green-600 font-bold tracking-widest text-sm">PEMBELAJARAN</span>
            <h2 className="text-4xl font-bold text-slate-800 mt-2">Edukasi <span className="text-green-600">Lingkungan</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                  <div className="h-48 bg-slate-200" /><div className="p-6 space-y-3"><div className="h-4 bg-slate-200 rounded w-20" /><div className="h-6 bg-slate-200 rounded" /></div>
                </div>
              ))
            ) : educations.length > 0 ? (
              educations.map(edu => {
                const title     = getEduTitle(edu);
                const desc      = getEduDesc(edu);
                const mediaUrl  = getEduMediaUrl(edu);
                const mediaType = getEduMediaType(edu);
                return (
                  <div key={edu.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all">
                    <div className="h-48 bg-slate-200 overflow-hidden">
                      {mediaType === 'VIDEO'
                        ? <video src={mediaUrl} className="w-full h-full object-cover" controls />
                        : <img src={mediaUrl || FALLBACK_IMG} alt={title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
                      }
                    </div>
                    <div className="p-6">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-widest">EDUKASI</span>
                      <h3 className="text-xl font-bold text-slate-800 mt-2 mb-3 line-clamp-2">{title}</h3>
                      <p className="text-slate-500 text-sm line-clamp-3 mb-4">{desc}</p>
                      <Link href={`/edukasi/${edu.id}`} className="flex items-center gap-2 text-green-600 font-bold text-sm hover:gap-3 transition-all">
                        Baca Selengkapnya <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="col-span-3 text-center py-4 text-slate-500">Belum ada edukasi tersedia</div>
                <DebugPanel />
              </>
            )}
          </div>

          {/* Tombol Lihat Semua Edukasi */}
          {!loading && (
            <div className="flex justify-center mt-10">
              <Link href="/edukasi" className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 group">
                Lihat Semua Edukasi <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* BERITA & PENGUMUMAN */}
      <section id="berita" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <span className="text-green-600 font-bold tracking-widest text-sm">INFORMASI TERKINI</span>
            <h2 className="text-4xl font-bold text-slate-800 mt-2">Berita <span className="text-green-600">&amp; Pengumuman</span></h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10">

            {/* ── KOLOM KIRI: Berita Portal ── */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-slate-200">
                <span className="w-1 h-6 bg-green-600 rounded-full inline-block flex-shrink-0" />
                <h3 className="text-xl font-bold text-slate-800">Berita Portal</h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-slate-200 rounded-xl mb-3" />
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : beritaPosts.length > 0 ? (
                <>
                  {/* Featured berita */}
                  <article className="mb-5 group">
                    <Link href={`/berita/${beritaPosts[0].slug || beritaPosts[0].id}`}>
                      <div className="overflow-hidden rounded-xl mb-3 bg-slate-100">
                        <img
                          src={beritaPosts[0].imageUrl || FALLBACK_IMG}
                          alt={beritaPosts[0].title}
                          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                        />
                      </div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-2.5 py-1 rounded-full mb-2">
                        {beritaPosts[0].category || 'Berita'}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 mb-1 line-clamp-2 group-hover:text-green-700 transition-colors leading-snug">
                        {beritaPosts[0].title}
                      </h4>
                      <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mb-2">
                        <Clock size={11} /> {fmtDate(beritaPosts[0].createdAt || beritaPosts[0].date)}
                      </p>
                      <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {stripHtml(beritaPosts[0].content)}
                      </p>
                    </Link>
                  </article>

                  {/* Sub berita */}
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    {beritaPosts.slice(1).map(post => (
                      <Link
                        key={post.id}
                        href={`/berita/${post.slug || post.id}`}
                        className="flex gap-4 items-start group pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="w-[110px] h-[78px] flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={post.imageUrl || FALLBACK_IMG}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-green-700 transition-colors leading-snug mb-1">
                            {post.title}
                          </h5>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-1">{stripHtml(post.content)}</p>
                          <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <Clock size={11} /> {fmtDate(post.createdAt || post.date)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">Belum ada berita tersedia.</p>
              )}

              {/* Tombol Lihat Semua Berita */}
              {!loading && beritaPosts.length > 0 && (
                <div className="mt-6">
                  <Link href="/berita" className="flex items-center justify-center gap-2 w-[220px] py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all active:scale-95 group">
                    Lihat Semua Berita <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </div>

            {/* ── KOLOM KANAN: Pengumuman Resmi ── */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-slate-200">
                <span className="w-1 h-6 bg-orange-500 rounded-full inline-block flex-shrink-0" />
                <h3 className="text-xl font-bold text-slate-800">Pengumuman Resmi</h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-slate-200 rounded-xl mb-3" />
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : pengumumanPosts.length > 0 ? (
                <>
                  {/* Featured pengumuman */}
                  <article className="mb-5 group">
                    <Link href={`/berita/${pengumumanPosts[0].slug || pengumumanPosts[0].id}`}>
                      <div className="overflow-hidden rounded-xl mb-3 bg-slate-100">
                        <img
                          src={pengumumanPosts[0].imageUrl || FALLBACK_IMG}
                          alt={pengumumanPosts[0].title}
                          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                        />
                      </div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full mb-2">
                        {pengumumanPosts[0].category || 'Pengumuman'}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
                        {pengumumanPosts[0].title}
                      </h4>
                      <p className="text-xs text-orange-500 font-semibold flex items-center gap-1 mb-2">
                        <Clock size={11} /> {fmtDate(pengumumanPosts[0].createdAt || pengumumanPosts[0].date)}
                      </p>
                      <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {stripHtml(pengumumanPosts[0].content)}
                      </p>
                    </Link>
                  </article>

                  {/* Sub pengumuman */}
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    {pengumumanPosts.slice(1).map(post => (
                      <Link
                        key={post.id}
                        href={`/berita/${post.slug || post.id}`}
                        className="flex gap-4 items-start group pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="w-[110px] h-[78px] flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={post.imageUrl || FALLBACK_IMG}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug mb-1">
                            {post.title}
                          </h5>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-1">{stripHtml(post.content)}</p>
                          <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                            <Clock size={11} /> {fmtDate(post.createdAt || post.date)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">Belum ada pengumuman tersedia.</p>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* GALERI */}
      <section id="galeri" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-green-600 font-bold tracking-widest text-sm">DOKUMENTASI</span>
            <h2 className="text-4xl font-bold text-slate-800 mt-2">Galeri <span className="text-green-600">Kegiatan</span></h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{[1,2,3,4].map(i=><div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
          ) : albums.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Belum ada galeri tersedia</div>
          ) : albums.length <= 4 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{albums.map(a=><AlbumCard key={a.id} album={a}/>)}</div>
          ) : (
            <div className="relative">
              <button onClick={() => scrollCarousel('left')} className="absolute left-0 top-1/2 -translate-y-6 -translate-x-5 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-green-50 border border-slate-100"><ChevronLeft size={20} className="text-slate-600"/></button>
              <div ref={carouselRef} className="grid grid-flow-col auto-cols-[calc(25%-18px)] gap-6 overflow-x-auto scroll-smooth pb-4" style={{scrollbarWidth:'none',msOverflowStyle:'none'}}>
                {albums.map(a=><div key={a.id}><AlbumCard album={a}/></div>)}
              </div>
              <button onClick={() => scrollCarousel('right')} className="absolute right-0 top-1/2 -translate-y-6 translate-x-5 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-green-50 border border-slate-100"><ChevronRight size={20} className="text-slate-600"/></button>
            </div>
          )}
        </div>
      </section>

      {/* SLIDER */}
      {!loading && sliderAlbums.length > 0 && (
        <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-slate-900">
          {sliderAlbums.map((album, index) => (
            <div key={album.id} className={`absolute inset-0 transition-opacity duration-1000 ${index===sliderIndex?'opacity-100':'opacity-0'}`}>
              <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
              <div className="absolute bottom-10 left-10 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2">Dokumentasi Kegiatan</p>
                <h3 className="text-3xl md:text-4xl font-black mb-2">{album.title}</h3>
                {album.description && <p className="text-white/70 text-sm max-w-md">{album.description}</p>}
                <button onClick={()=>setSelectedAlbum(album)} className="mt-4 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
                  <Images size={16}/> Lihat Foto ({album.photos?.length||0})
                </button>
              </div>
            </div>
          ))}
          {sliderAlbums.length>1&&(
            <div className="absolute bottom-6 right-10 flex gap-2">
              {sliderAlbums.map((_,i)=><button key={i} onClick={()=>setSliderIndex(i)} className={`h-2.5 rounded-full transition-all ${i===sliderIndex?'bg-green-400 w-6':'bg-white/50 w-2.5'}`}/>)}
            </div>
          )}
        </section>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 p-1.5 rounded-xl"><img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg" alt="Logo" className="w-full h-full object-contain"/></div>
                <div><span className="text-xl font-black block">DLH TOBA</span><span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">Kabupaten Toba</span></div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Dinas Lingkungan Hidup Kabupaten Toba berkomitmen menjaga kelestarian alam dan kebersihan lingkungan.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6 relative inline-block">Tautan Cepat<span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"/></h3>
              <ul className="space-y-3">{NAV_LINKS.map(i=><li key={i}><Link href={navHref(i)} className="text-slate-400 hover:text-green-400 text-sm flex items-center gap-2 group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>{i}</Link></li>)}</ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6 relative inline-block">Sumber Daya<span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"/></h3>
              <ul className="space-y-3">{[{name:'Perda Lingkungan',path:'/perda'},{name:'Jadwal Angkut',path:'/jadwal'},{name:'Laporan Tahunan',path:'/laporan'},{name:'Edukasi',path:'/edukasi'}].map(l=><li key={l.name}><Link href={l.path} className="text-slate-400 hover:text-green-400 text-sm flex items-center gap-2 group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>{l.name}</Link></li>)}</ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6 relative inline-block">Hubungi Kami<span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"/></h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="flex items-start gap-3"><MapPin size={20} className="text-green-500 flex-shrink-0 mt-0.5"/><span>Jl. Hutabulu Mejan No. 14, Sibola Hotangsas, Kec. Balige, Toba, Sumatera Utara</span></li>
                <li className="flex items-center gap-3"><Phone size={18} className="text-green-500"/><span>(0632) 123-4567</span></li>
                <li className="flex items-center gap-3"><Mail size={18} className="text-green-500"/><span>dislindup@tobakab.go.id</span></li>
              </ul>
              <div className="flex gap-3 pt-4">
                {[{Icon:Facebook,href:'#'},{Icon:Instagram,href:'#'},{Icon:Mail,href:'mailto:dislindup@tobakab.go.id'}].map((s,i)=>(
                  <a key={i} href={s.href} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-green-600 hover:-translate-y-1 transition-all"><s.Icon size={18}/></a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 <span className="text-slate-300 font-semibold">Dinas Lingkungan Hidup Kabupaten Toba</span>. Seluruh hak cipta dilindungi.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/privasi" className="text-slate-500 hover:text-green-400">Kebijakan Privasi</Link>
              <Link href="/syarat" className="text-slate-500 hover:text-green-400">Syarat & Ketentuan</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}