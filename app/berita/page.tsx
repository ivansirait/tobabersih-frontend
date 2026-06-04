"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { Clock, Search, Home, ChevronRight } from "lucide-react";

/* ─── Types ─── */
interface Author {
  id?: number;
  fullName?: string;
  name?: string;
}

interface Post {
  id: number;
  title: string;
  content?: string;
  excerpt?: string;
  imageUrl?: string | null;
  category?: string;
  slug?: string;
  createdAt?: string;
  date?: string;
  author?: string | Author | null;
}

/* ─── Helpers ─── */
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800";

const resolveAuthor = (a?: string | Author | null): string => {
  if (!a) return "";
  if (typeof a === "string") return a;
  if (typeof a === "object") return a.fullName || a.name || "";
  return String(a);
};

const fmtDate = (v?: string) => {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch { return v; }
};

const stripHtml = (html: string = "") =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const getExcerpt = (post: Post, maxLen = 100) => {
  const src = post.excerpt || post.content || "";
  const plain = stripHtml(src);
  return plain.length > maxLen ? plain.slice(0, maxLen) + "..." : plain;
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Artikel:              { bg: "bg-blue-100",   text: "text-blue-700" },
  "Berita Terkini":     { bg: "bg-green-100",  text: "text-green-700" },
  "Berita Kementerian": { bg: "bg-purple-100", text: "text-purple-700" },
  "Berita UPTD":        { bg: "bg-orange-100", text: "text-orange-700" },
  BERITA:               { bg: "bg-green-100",  text: "text-green-700" },
};
const catStyle = (cat?: string) =>
  (cat && CATEGORY_COLORS[cat]) || { bg: "bg-slate-100", text: "text-slate-600" };

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function BeritaListPage() {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [query,   setQuery]   = useState("");
  const fetchDone = useRef(false);

  useEffect(() => {
    if (fetchDone.current) return;
    fetchDone.current = true;

    const load = async () => {
      try {
        setLoading(true);
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE    = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";
        const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${BASE}/posts`, { headers, timeout: 6000 });
        const list: Post[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        setPosts(list);
        setError(false);
      } catch (err) {
        console.error("[BeritaList]", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = posts.filter(p =>
    query === "" ||
    p.title?.toLowerCase().includes(query.toLowerCase()) ||
    p.category?.toLowerCase().includes(query.toLowerCase())
  );

  /* ─── LOADING ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-xl animate-pulse">
              <div className="w-32 h-24 bg-slate-100 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-slate-200 rounded-full" />
                  <div className="h-4 w-28 bg-slate-100 rounded" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-orange-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── ERROR ─── */
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-4">
        <p className="text-4xl mb-3">⚠️</p>
        <h2 className="text-lg font-bold text-slate-800">Gagal Memuat Berita</h2>
        <p className="text-slate-500 text-sm mt-1 mb-5">Periksa koneksi atau server backend.</p>
        <button
          onClick={() => { fetchDone.current = false; setError(false); setLoading(true); window.location.reload(); }}
          className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          🔄 Coba Lagi
        </button>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Breadcrumb / Tombol Beranda ── */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold text-xs hover:bg-green-700 transition-colors"
          >
            <Home size={13} /> Beranda
          </Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-slate-600 font-medium text-xs">Berita</span>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berita..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white"
          />
        </div>

        {/* Info count */}
        {query && (
          <p className="text-sm text-slate-500 mb-4">
            Menampilkan <strong>{filtered.length}</strong> hasil untuk "<em>{query}</em>"
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-500 font-medium">Tidak ada berita ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(post => {
              const dateStr    = (post as any).createdAt || post.date;
              const cs         = catStyle(post.category);
              const authorName = resolveAuthor(post.author);
              const href       = `/berita/${post.slug || post.id}`;

              return (
                <article
                  key={post.id}
                  className="flex gap-4 bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                >
                  {/* Thumbnail */}
                  <Link href={href} className="flex-shrink-0">
                    <div className="w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={post.imageUrl || FALLBACK_IMG}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                    </div>
                  </Link>

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    {/* Category + Tanggal */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {post.category && (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cs.bg} ${cs.text}`}>
                          {post.category}
                        </span>
                      )}
                      <span className="text-slate-300 text-xs">•</span>
                      {dateStr && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {fmtDate(dateStr)}
                        </span>
                      )}
                    </div>

                    {/* Judul */}
                    <Link href={href}>
                      <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-snug group-hover:text-green-700 transition-colors line-clamp-2 mb-1">
                        {post.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed mb-2">
                      {getExcerpt(post)}
                    </p>

                    {/* Lihat Selengkapnya */}
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Lihat Selengkapnya »
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}