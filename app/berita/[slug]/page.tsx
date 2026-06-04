"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock,
  Tag,
  ArrowLeft,
  ChevronRight,
  Facebook,
  Twitter,
  Link2,
} from "lucide-react";

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  category?: string;
  slug?: string;
  createdAt?: string;
  date?: string;
  author?: string;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800";

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
  Artikel: "bg-blue-100 text-blue-700",
  "Berita Terkini": "bg-green-100 text-green-700",
  "Berita Kementerian": "bg-purple-100 text-purple-700",
  "Berita UPTD": "bg-orange-100 text-orange-700",
};

const catColor = (cat?: string) =>
  cat && CATEGORY_COLORS[cat]
    ? CATEGORY_COLORS[cat]
    : "bg-slate-100 text-slate-600";

export default function BeritaDetailPage() {
  const params = useParams();
  const slugOrId = params?.slug as string;

  const [post, setPost] = useState<Post | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slugOrId) return;

    const fetchPost = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";

        // Try to fetch single post
        const res = await axios.get(`${BASE}/posts/${slugOrId}`);
        const raw = res.data;
        const single: Post = raw?.data ?? raw;
        setPost(single);

        // Fetch all posts for sidebar & related
        const allRes = await axios.get(`${BASE}/posts`);
        const allRaw = allRes.data;
        const allList: Post[] = Array.isArray(allRaw)
          ? allRaw
          : allRaw?.data ?? [];
        setRecentPosts(allList.slice(0, 6));
        setRelatedPosts(
          allList
            .filter(
              (p) =>
                p.id !== single.id && p.category === single.category
            )
            .slice(0, 3)
        );
      } catch (err) {
        console.error("[post detail] FETCH ERROR:", err);
      }
      setLoading(false);
    };

    fetchPost();
  }, [slugOrId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 pt-28 pb-10">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-32" />
              <div className="h-10 bg-slate-200 rounded" />
              <div className="h-10 bg-slate-200 rounded w-3/4" />
              <div className="h-80 bg-slate-200 rounded-2xl" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-slate-200 rounded" />
              ))}
            </div>
            <div className="hidden lg:block space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-40" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-20 h-14 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-800 mb-4">
            Berita tidak ditemukan
          </p>
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all"
          >
            <ArrowLeft size={16} />
            Kembali ke Berita
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── BREADCRUMB BAR ── */}
      <div className="bg-slate-900 pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-green-400 transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <Link
              href="/berita"
              className="hover:text-green-400 transition-colors"
            >
              Berita
            </Link>
            {post.category && (
              <>
                <ChevronRight size={14} />
                <span className="text-slate-300">{post.category}</span>
              </>
            )}
          </nav>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight max-w-3xl">
            {post.title}
          </h1>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* ── ARTICLE ── */}
          <article className="lg:col-span-2">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {post.category && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${catColor(
                    post.category
                  )}`}
                >
                  <Tag size={11} />
                  {post.category}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <Clock size={14} />
                {fmtDate((post as any).createdAt || (post as any).date)}
              </span>
              {post.author && (
                <span className="text-sm text-slate-400">
                  oleh{" "}
                  <span className="font-semibold text-slate-700">
                    {post.author}
                  </span>
                </span>
              )}
            </div>

            {/* Hero Image */}
            <div className="rounded-2xl overflow-hidden mb-8 bg-slate-100">
              <img
                src={post.imageUrl || FALLBACK_IMG}
                alt={post.title}
                className="w-full object-cover"
                style={{ maxHeight: "450px" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed">
              {/* Render content: jika HTML gunakan dangerouslySetInnerHTML,
                  jika teks biasa tampilkan sebagai paragraf */}
              {post.content?.startsWith("<") ? (
                <div
                  dangerouslySetInnerHTML={{ __html: post.content }}
                  className="[&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-8 [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1"
                />
              ) : (
                post.content
                  ?.split("\n")
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="mb-4 text-slate-700">
                      {para}
                    </p>
                  ))
              )}
            </div>

            {/* Share */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-600 mb-3">
                Bagikan artikel ini:
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.href : ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
                >
                  <Facebook size={16} />
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    post.title
                  )}&url=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.href : ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-all"
                >
                  <Twitter size={16} />
                  Twitter
                </a>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  <Link2 size={16} />
                  {copied ? "Tersalin!" : "Salin Link"}
                </button>
              </div>
            </div>

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                  Berita Terkait
                </h3>
                <div className="grid sm:grid-cols-3 gap-5">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/berita/${rp.slug || rp.id}`}
                      className="group rounded-xl overflow-hidden border border-slate-100 hover:border-green-200 hover:shadow-md transition-all"
                    >
                      <div className="h-36 overflow-hidden bg-slate-100">
                        <img
                          src={rp.imageUrl || FALLBACK_IMG}
                          alt={rp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMG;
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                          <Clock size={11} />
                          {fmtDate(
                            (rp as any).createdAt || (rp as any).date
                          )}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-green-700 transition-colors line-clamp-2">
                          {rp.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-1">
            {/* Berita Terkini */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-5 pb-3 border-b border-slate-100">
                Berita Terkini
              </h3>
              <div className="space-y-4">
                {recentPosts.map((rp) => (
                  <Link
                    key={rp.id}
                    href={`/berita/${rp.slug || rp.id}`}
                    className={`flex gap-3 items-start group -mx-2 px-2 py-2 rounded-xl transition-colors ${
                      rp.id === post.id
                        ? "bg-green-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      <img
                        src={rp.imageUrl || FALLBACK_IMG}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMG;
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h5
                        className={`text-sm font-semibold line-clamp-2 leading-snug transition-colors ${
                          rp.id === post.id
                            ? "text-green-700"
                            : "text-slate-800 group-hover:text-green-700"
                        }`}
                      >
                        {rp.title}
                      </h5>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                        <Clock size={11} />
                        <span>
                          {fmtDate(
                            (rp as any).createdAt || (rp as any).date
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  href="/berita"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all"
                >
                  Lihat Semua Berita
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}