"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ArrowRight
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [lightbox, setLightbox] = useState<{
    photos: GalleryPhoto[];
    index: number;
  } | null>(null);

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
      index:
        (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length,
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
            {/* Sisi Kiri - Tombol Kembali */}
            <div className="flex-1 flex justify-start">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all font-semibold text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:-translate-x-1 transition-all">
                  <ChevronLeft size={16} />
                </div>
                <span className="hidden sm:inline">Kembali</span>
              </button>
            </div>

            {/* Tengah - Judul */}
            <div className="flex-[2] flex flex-col items-center text-center">
              <h2 className="text-lg md:text-2xl font-black text-gray-900 line-clamp-1">
                {selectedAlbum.title}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <div
                  className={`w-2 h-2 rounded-full bg-green-500 ${
                    loadingDetail ? "animate-pulse" : ""
                  }`}
                />
                <span>
                  {loadingDetail ? "Memuat foto..." : `${photos.length} foto tersedia`}
                </span>
              </div>
            </div>

            {/* Sisi Kanan - Spacer agar judul tepat di tengah */}
            <div className="flex-1" />
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

       {/* Photo grid - Professional & Keren Edition */}
<div className="max-w-7xl mx-auto px-6 py-16 bg-white">
  {loadingDetail ? (
    // Skeleton Loading (Large Grid 3 Kolom)
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="aspect-[4/3] rounded-3xl border border-slate-100 bg-slate-200 animate-pulse"
        />
      ))}
    </div>
  ) : photos.length === 0 ? (
    // Empty State (Desain Minimalis)
    <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-slate-200">
      <Images size={48} className="mx-auto text-slate-300 mb-5 opacity-50" />
      <p className="text-slate-500 font-semibold text-lg">
        Belum ada koleksi foto
      </p>
      <p className="text-slate-400 text-sm mt-1">
        Album ini masih menunggu momen-momen inspiratif Anda.
      </p>
    </div>
  ) : (
    // Render Grid Foto Sinematik
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {photos.map((photo, idx) => (
        <div
          key={photo.id}
          onClick={() => setLightbox({ photos, index: idx })}
          className="group relative aspect-[4/3] cursor-pointer rounded-3xl overflow-hidden bg-white border border-slate-100 hover:shadow-2xl transition-all duration-500 block transform active:scale-[0.99] shadow-sm"
        >
          {/* ── IMAGE LAYER ── */}
          <img
            src={photo.imageUrl}
            alt={photo.caption || `Foto ke-${idx + 1}`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMG;
            }}
          />

          {/* ── INTERACTIVE OVERLAY LAYER ── */}
          {/* Gradient hitam muncul dari bawah saat hover, memberikan kontras untuk teks */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            {/* Ikon 'View' mengembang di tengah (Opsional, tapi keren) */}
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white transform scale-75 group-hover:scale-100 transition-all duration-300 delay-100 shadow-xl border border-white/20">
              <Eye size={22} className="stroke-[2.5]" />
            </div>
          </div>

          {/* ── CAPTION LAYER (DI DALAM FOTO) ── */}
          {/* Caption dan Metadata disembunyikan dan muncul dengan slide-up saat hover */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-75 ease-out">
            <div className="flex flex-col gap-1.5">
              {/* Badge kecil penanda (misalnya: nomor urut) */}
              <span className="text-[10px] font-black tracking-widest text-green-400 uppercase">
                Foto {String(idx + 1).padStart(2, '0')} / {photos.length}
              </span>
              
              {/* Judul Caption - Bold, Putih, line-clamp 2 */}
              {photo.caption && (
                <h4 className="text-base font-semibold text-white leading-snug line-clamp-2 drop-shadow-sm">
                  {photo.caption}
                </h4>
              )}
            </div>
          </div>
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
            {/* Tombol Tutup */}
            <button className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-10">
              <X size={22} />
            </button>

            {/* Navigasi Kiri Kanan */}
            {lightbox.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="absolute left-4 md:left-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="absolute right-4 md:right-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Konten Foto */}
            <div
              className="flex flex-col items-center justify-center max-w-5xl w-full max-h-[90vh] gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.photos[lightbox.index].imageUrl}
                alt={lightbox.photos[lightbox.index].caption || ""}
                className="max-h-[75vh] object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
              <div className="text-center px-4">
                {lightbox.photos[lightbox.index].caption && (
                  <p className="text-white/90 text-sm font-medium mb-1">
                    {lightbox.photos[lightbox.index].caption}
                  </p>
                )}
                <p className="text-white/40 text-xs font-semibold">
                  {lightbox.index + 1} / {lightbox.photos.length}
                </p>
              </div>
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
            ? "bg-slate-900/95 backdrop-blur-md shadow-lg py-2"
            : "bg-slate-900/70 py-4"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0">
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
                className={`hover:text-green-300 transition-colors relative group py-2 ${
                  item === "Galeri" ? "text-green-400" : ""
                }`}
              >
                {item}
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-green-400 transition-all ${
                    item === "Galeri" ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Button Lapor */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-white hover:text-green-400 font-bold px-4 transition-colors">Login</Link>

            <Link
              href="/Warga"
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 text-sm"
            >
              Lapor!
            </Link>
          </div>
        </div>
      </nav>

      {/* Header Orisinal */}
      <div className="bg-slate-900 pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Galeri <span className="text-green-400">Kegiatan</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Dokumentasi kegiatan lingkungan hidup Kabupaten Toba
          </p>
        </div>
      </div>

      {/* Album grid */}
<div className="max-w-7xl mx-auto px-6 py-16">
  {loading ? (
    // Skeleton Loading (Mengikuti style modern dengan animasi pulse & tinggi h-48)
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-3xl overflow-hidden border border-slate-100 animate-pulse bg-white">
          <div className="h-48 bg-slate-200" />
          <div className="p-6 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-6 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ) : filtered.length === 0 ? (
    // Empty State (Mengisi penuh grid saat data kosong + Opacity Icon dikurangi)
    <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
      <Images size={48} className="mx-auto text-slate-300 mb-4 opacity-40" />
      <p className="text-gray-500 font-semibold">
        Belum ada album yang ditambahkan
      </p>
    </div>
  ) : (
    // Render List Album dengan transformasi UI Premium & Interaktif
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {filtered.map((album) => (
        <div
          key={album.id}
          onClick={() => openAlbum(album)}
          className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-300 block cursor-pointer"
        >
          {/* Thumbnail Cover */}
          <div className="h-48 bg-slate-200 overflow-hidden relative">
            <img
              src={album.coverUrl || FALLBACK_IMG}
              alt={album.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMG;
              }}
            />
            {/* Badge Jumlah Foto (Glassmorphism & Mini Text) */}
            <div className="absolute top-4 left-4">
              <span className="bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1">
                <Images size={12} /> {album.photos?.length || 0} Foto
              </span>
            </div>
          </div>

          {/* Konten Card */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest">ALBUM</span>
              {album.createdAt && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                  <Clock size={12} />
                  {new Date(album.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-800 mt-2 mb-3 line-clamp-2 leading-snug">
              {album.title}
            </h3>
            <p className="text-slate-500 text-sm line-clamp-3 mb-4 leading-relaxed">
              {album.description || 'Dokumentasi momen inspiratif dari berbagai inisiatif keberlanjutan dan aksi kebersihan.'}
            </p>

            {/* Action Button Indicator (Animasi gap bergeser saat hover) */}
            <div className="flex items-center gap-2 text-green-600 font-bold text-sm group-hover:gap-3 transition-all">
              Lihat Album <ArrowRight size={16} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      {/* Tombol Kembali ke Beranda */}
      <div className="max-w-7xl mx-auto px-6 pb-20 flex justify-end">
        <Link
          href="/"
          className="flex items-center gap-2 px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
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
      className="group cursor-pointer rounded-3xl overflow-hidden border border-slate-100 hover:border-green-200 hover:shadow-2xl transition-all duration-300 bg-white hover:-translate-y-1 flex flex-col h-full"
    >
      {/* Cover */}
      <div className="relative h-64 overflow-hidden bg-slate-200 flex-shrink-0">
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
            <p className="text-white/60 text-xs font-semibold flex items-center gap-1.5 mt-2">
              <Clock size={11} />
              {fmtDate(album.createdAt)}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        {album.description ? (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {album.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic mb-4">
            Tidak ada deskripsi
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs text-slate-400 font-medium">
            {album.photos?.length || 0} foto tersedia
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 group-hover:gap-2.5 transition-all">
            Lihat Album
            <ChevronRight size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}

``