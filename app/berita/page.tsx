"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { Clock, Tag, ChevronRight, ArrowLeft, Search } from "lucide-react";

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

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500";

const fmtDate = (v?: string) => {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return v;
  }
};

const CATEGORY_COLORS: Record<string, string> = {
  "Artikel": "bg-blue-100 text-blue-700",
  "Berita Terkini": "bg-green-100 text-green-700",
  "Berita Kementerian": "bg-purple-100 text-purple-700",
  "Berita UPTD": "bg-orange-100 text-orange-700",
};

const catColor = (cat?: string) =>
  cat && CATEGORY_COLORS[cat]
    ? CATEGORY_COLORS[cat]
    : "bg-slate-100 text-slate-600";

export default function BeritaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";
        const res = await axios.get(`${BASE}/posts`);
        const raw = res.data;
        const list: Post[] = Array.isArray(raw) ? raw : raw?.data ?? [];
        setPosts(list);
      } catch (err) {
        console.error("[posts] FETCH ERROR:", err);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  // Derive categories from posts
  const categories = [
    "Semua",
    ...Array.from(new Set(posts.map((p) => p.category).filter(Boolean) as string[])),
  ];

  const filtered = posts.filter((p) => {
    const matchCat =
      activeCategory === "Semua" || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Recent sidebar: always first 6 posts regardless of filter
  const recentPosts = posts.slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      {/* ── HEADER ── */}
      <div className="bg-slate-900 pt-28 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Daftar <span className="text-green-400">Berita</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Informasi terkini seputar lingkungan hidup Kabupaten Toba
          </p>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="border-b border-slate-100 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berita..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-400 w-56"
            />
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* LEFT: Article list */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 p-4 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-44 h-28 bg-slate-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-3 bg-slate-200 rounded w-24" />
                      <div className="h-5 bg-slate-200 rounded" />
                      <div className="h-4 bg-slate-200 rounded w-4/5" />
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <p className="text-lg font-semibold">Tidak ada berita ditemukan</p>
                <p className="text-sm mt-2">Coba ubah filter atau kata pencarian</p>
              </div>
            ) : (
              filtered.map((post) => (
                <article
                  key={post.id}
                  className="group bg-white rounded-2xl border border-slate-100 hover:border-green-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="w-48 flex-shrink-0 overflow-hidden bg-slate-100">
                      <img
                        src={post.imageUrl || FALLBACK_IMG}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        style={{ minHeight: "140px", maxHeight: "160px" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMG;
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      {/* Category + Date */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {post.category && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${catColor(
                              post.category
                            )}`}
                          >
                            <Tag size={10} />
                            {post.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={12} />
                          {fmtDate(
                            (post as any).createdAt || (post as any).date
                          )}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-base md:text-lg font-bold text-slate-800 mb-2 leading-snug line-clamp-2 group-hover:text-green-700 transition-colors">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                        {post.content}
                      </p>

                      <Link
                        href={`/berita/${post.slug || post.id}`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600 hover:gap-2 transition-all"
                      >
                        Lihat Selengkapnya »
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <aside className="lg:col-span-1">
            {/* Berita Terkini */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">
                  Berita Terkini
                </h3>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="space-y-4">
                {loading
                  ? [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex gap-3 animate-pulse items-start"
                      >
                        <div className="w-20 h-14 bg-slate-200 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  : recentPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/berita/${post.slug || post.id}`}
                        className="flex gap-3 items-start group hover:bg-slate-50 -mx-2 px-2 py-2 rounded-xl transition-colors"
                      >
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={post.imageUrl || FALLBACK_IMG}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMG;
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-green-700 transition-colors leading-snug">
                            {post.title}
                          </h5>
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                            <Clock size={11} />
                            <span>
                              {fmtDate(
                                (post as any).createdAt || (post as any).date
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
              </div>
            </div>

            {/* Kategori */}
            {categories.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 mt-5">
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                  Kategori
                </h3>
                <ul className="space-y-2">
                  {categories
                    .filter((c) => c !== "Semua")
                    .map((cat) => {
                      const count = posts.filter(
                        (p) => p.category === cat
                      ).length;
                      return (
                        <li key={cat}>
                          <button
                            onClick={() => setActiveCategory(cat)}
                            className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-green-50 transition-colors group"
                          >
                            <span className="flex items-center gap-2 text-sm text-slate-700 group-hover:text-green-700 font-medium">
                              <ChevronRight
                                size={14}
                                className="text-slate-400 group-hover:text-green-500"
                              />
                              {cat}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                              {count}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}