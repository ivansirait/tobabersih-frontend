"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft, Images, X, ChevronLeft, ChevronRight,
  Clock, Eye,
} from "lucide-react";

// ── TYPES ──────────────────────────────────────────────────────────────────
interface GalleryPhoto {
  id: number;
  imageUrl: string;
  caption?: string;
}

interface Album {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  isSlider?: boolean;
  photos?: GalleryPhoto[];
  createdAt?: string;
}

// ── HELPERS ────────────────────────────────────────────────────────────────
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800";

 const NAV_LINKS = ["Tentang", "Edukasi", "Berita", "Galeri"];

const navHref = (item: string) => {
  const key = item.toLowerCase();

  if (key === "berita") return "/berita";
  if (key === "edukasi") return "/edukasi";
  if (key === "galeri") return "/galeri";

  return `/#${key}`;
};

const fmtDate = (v?: string) => {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return v;
  }
};

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function GaleriPage() {
  const [albums, setAlbums]               = useState<Album[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const fn = () => setIsScrolled(window.scrollY > 50);
  window.addEventListener("scroll", fn);
  return () => window.removeEventListener("scroll", fn);
}, []);

  // Detail album view
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Lightbox
  const [lightbox, setLightbox]           = useState<{ photos: GalleryPhoto[]; index: number } | null>(null);

  // ── FETCH ALBUMS ──
  useEffect(() => {
    const fetchAlbums = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";
        const res = await axios.get(`${BASE}/galleries/albums`);
        const raw = res.data;
        const list: Album[] = Array.isArray(raw) ? raw : raw?.data ?? [];
        setAlbums(list);
      } catch (err) {
        console.error("[galeri] FETCH ERROR:", err);
      }
      setLoading(false);
    };
    fetchAlbums();
  }, []);

  // ── FETCH ALBUM DETAIL ──
  const openAlbum = async (album: Album) => {
    setLoadingDetail(true);
    setSelectedAlbum(album); // tampilkan header dulu
    try {
      const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
      const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";
      const res = await axios.get(`${BASE}/galleries/albums/${album.id}`);
      const raw = res.data;
      setSelectedAlbum(raw?.data ?? raw);
    } catch {
      // fallback: tetap tampilkan data album yang sudah ada
    }
    setLoadingDetail(false);
  };

  // ── KEYBOARD SHORTCUT ──
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) return setLightbox(null);
        if (selectedAlbum) return setSelectedAlbum(null);
      }
      if (lightbox) {
        if (e.key === "ArrowRight") nextPhoto();
        if (e.key === "ArrowLeft") prevPhoto();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lightbox, selectedAlbum]);

  // ── LIGHTBOX NAV ──
  const nextPhoto = () => {
    if (!lightbox) return;
    setLightbox({
      photos: lightbox.photos,
      index: (lightbox.index + 1) % lightbox.photos.length,
    });
  };
  const prevPhoto = () => {
    if (!lightbox) return;
    setLightbox({
      photos: lightbox.photos,
      index: (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length,
    });
  };

const filtered = albums;

  // ── DETAIL VIEW ────────────────────────────────────────────────────────
  if (selectedAlbum) {
    const photos = selectedAlbum.photos || [];

    return (
      <div className="min-h-screen bg-gray-50">

        {/* Sticky header detail */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedAlbum(null)}
              className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all font-semibold text-sm"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:-translate-x-1 transition-all">
                <ChevronLeft size={16} />
              </div>
              Kembali
            </button>

            <div className="flex flex-col items-center text-center">
              <h2 className="text-lg md:text-2xl font-black text-gray-900 line-clamp-1">
                {selectedAlbum.title}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>
                  {loadingDetail ? "Memuat foto..." : `${photos.length} foto tersedia`}
                </span>
              </div>
            </div>

            <div className="w-24" /> {/* spacer */}
          </div>
        </div>

        {/* Description */}
        {selectedAlbum.description && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
              <h3 className="text-xs font-bold text-green-600 tracking-widest uppercase mb-3">
                Deskripsi Kegiatan
              </h3>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-line">
                {selectedAlbum.description}
              </p>
            </div>
          </div>
        )}

        {/* Photo grid */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {loadingDetail ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-24">
              <Images size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-semibold">Belum ada foto di album ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setLightbox({ photos, index: idx })}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || ""}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye size={24} className="text-white drop-shadow" />
                    </div>
                  </div>
                  {photo.caption && (
                    <p className="px-3 py-2 text-xs text-slate-500 line-clamp-1 font-medium">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-10">
              <X size={22} />
            </button>

            {/* Prev */}
            {lightbox.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div className="flex items-center justify-center w-screen h-screen" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightbox.photos[lightbox.index].imageUrl}
                alt={lightbox.photos[lightbox.index].caption || ""}
                className="object-contain rounded-xl shadow-2xl"
                
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
              {lightbox.photos[lightbox.index].caption && (
                <p className="text-white/70 text-sm font-medium text-center">
                  {lightbox.photos[lightbox.index].caption}
                </p>
              )}
              <p className="text-white/40 text-xs font-semibold">
                {lightbox.index + 1} / {lightbox.photos.length}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ALBUM LIST VIEW ────────────────────────────────────────────────────
return (
  <div className="min-h-screen bg-white">

    {/* NAVBAR */}
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-900/95 backdrop-blur-md shadow-lg"
          : "bg-slate-900/70"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex justify-between items-center">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="leading-tight">
            <h1 className="text-xs md:text-sm font-black uppercase tracking-tight text-white">
              Dinas Lingkungan Hidup
            </h1>

            <p className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-green-400">
              Kabupaten Toba
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="hidden lg:flex gap-8 font-semibold text-white/90">
          {NAV_LINKS.map((item) => (
            <Link
              key={item}
              href={navHref(item)}
              className={`hover:text-green-300 transition-colors relative group ${
                item === "Galeri"
                  ? "text-green-400"
                  : ""
              }`}
            >
              {item}

              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-green-400 transition-all ${
                  item === "Galeri"
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </Link>
          ))}
        </div>

        {/* Button Lapor */}
        <div className="flex items-center gap-3">
          <Link
            href="/Warga"
            className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95"
          >
            Lapor!
          </Link>
        </div>

      </div>
    </nav>


      {/* Header */}
      <div className="bg-slate-900 pt-28 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Galeri <span className="text-green-400">Kegiatan</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Dokumentasi kegiatan lingkungan hidup Kabupaten Toba
          </p>
        </div>
      </div>




      {/* Album grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                <div className="h-64 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Images size={48} className="mx-auto text-slate-300 mb-4" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => openAlbum(album)}
              />
            ))}
          </div>
        )}
      </div>
            {/* Tombol Kembali ke Beranda */}
      <div className="max-w-7xl mx-auto px-6 pb-12 flex justify-end">
        <Link
          href="/"
          className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 group"
        >
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </Link>
      </div>

    </div>
  );
}

// ── ALBUM CARD ─────────────────────────────────────────────────────────────
function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden border border-slate-100 hover:border-green-200 hover:shadow-2xl transition-all duration-300 bg-white hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative h-64 overflow-hidden bg-slate-200">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMG;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <Images size={48} className="text-slate-400" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Photo count badge */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
          <Images size={12} />
          {album.photos?.length || 0} foto
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-white text-xl font-black leading-snug line-clamp-2 drop-shadow">
            {album.title}
          </h3>
          {album.createdAt && (
            <p className="text-white/60 text-xs font-semibold flex items-center gap-1.5 mt-1.5">
              <Clock size={11} />
              {fmtDate(album.createdAt)}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4">
        {album.description ? (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {album.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic mb-3">Tidak ada deskripsi</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {album.photos?.length || 0} foto tersedia
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 group-hover:gap-2.5 transition-all">
            Lihat Album
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}