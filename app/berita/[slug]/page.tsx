"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock,
  ChevronRight,
  Facebook,
  Twitter,
  MessageCircle,
  ArrowLeft,
  Share2,
} from "lucide-react";

/* ─── Types ─── */
interface Author {
  id?: number;
  fullName?: string;
  name?: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  images?: string[];          // array of extra images for collage
  category?: string;
  slug?: string;
  createdAt?: string;
  date?: string;
  author?: string | Author | null;
  views?: number;
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
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return v;
  }
};

const fmtDateShort = (v?: string) => {
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

// Day-of-week + date label like "Selasa, 12 Mei 2026"
const fmtDateLabel = (v?: string) => {
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Artikel:              { bg: "bg-blue-100",   text: "text-blue-700" },
  "Berita Terkini":     { bg: "bg-green-100",  text: "text-green-700" },
  "Berita Kementerian": { bg: "bg-purple-100", text: "text-purple-700" },
  "Berita UPTD":        { bg: "bg-orange-100", text: "text-orange-700" },
  BERITA:               { bg: "bg-green-100",  text: "text-green-700" },
  ARTIKEL:              { bg: "bg-blue-100",   text: "text-blue-700" },
};

const catStyle = (cat?: string) =>
  (cat && CATEGORY_COLORS[cat]) || { bg: "bg-slate-100", text: "text-slate-600" };

/* ─── Collage Hero ─────────────────────────────────────────
   Shows up to 5 images in a magazine-style grid.
   If only 1 image: full-width single.
   If 2: side-by-side halves.
   If 3: one large left + two stacked right.
   If 4: two rows of two.
   If 5 (like the reference): one large top-left + two top-right + two bottom.
─────────────────────────────────────────────────────── */
function CollageHero({ imgs }: { imgs: string[] }) {
  const list = imgs.slice(0, 5);
  const count = list.length;

  const imgClass = "w-full h-full object-cover";

  if (count === 1) {
    return (
      <div className="w-full" style={{ maxHeight: 420 }}>
        <img src={list[0]} alt="" className="w-full h-auto rounded-xl" 
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5" style={{ height: 380 }}>
        {list.map((src, i) => (
          <div key={i} className="overflow-hidden">
            <img src={src} alt="" className={imgClass}
              onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5" style={{ height: 380 }}>
        <div className="overflow-hidden">
          <img src={list[0]} alt="" className={imgClass}
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
        </div>
        <div className="grid grid-rows-2 gap-0.5">
          {list.slice(1).map((src, i) => (
            <div key={i} className="overflow-hidden">
              <img src={src} alt="" className={imgClass}
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5" style={{ height: 380 }}>
        {list.map((src, i) => (
          <div key={i} className="overflow-hidden">
            <img src={src} alt="" className={imgClass}
              onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
          </div>
        ))}
      </div>
    );
  }

  // 5 images — reference layout:
  // row 1 (60% height): large left (spans 2 cols) | top-right 1 | top-right 2
  // row 2 (40% height): bottom-left | bottom-right (spans 2 cols)
  return (
    <div
      className="grid gap-0.5"
      style={{
        height: 400,
        gridTemplateColumns: "2fr 1fr 1fr",
        gridTemplateRows: "60% 40%",
      }}
    >
      {/* large top-left */}
      <div className="overflow-hidden" style={{ gridRow: "1 / 2", gridColumn: "1 / 2" }}>
        <img src={list[0]} alt="" className={imgClass}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
      {/* top-right 1 */}
      <div className="overflow-hidden" style={{ gridRow: "1 / 2", gridColumn: "2 / 3" }}>
        <img src={list[1]} alt="" className={imgClass}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
      {/* top-right 2 */}
      <div className="overflow-hidden" style={{ gridRow: "1 / 2", gridColumn: "3 / 4" }}>
        <img src={list[2]} alt="" className={imgClass}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
      {/* bottom-left */}
      <div className="overflow-hidden" style={{ gridRow: "2 / 3", gridColumn: "1 / 2" }}>
        <img src={list[3]} alt="" className={imgClass}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
      {/* bottom-right spans 2 cols */}
      <div className="overflow-hidden" style={{ gridRow: "2 / 3", gridColumn: "2 / 4" }}>
        <img src={list[4]} alt="" className={imgClass}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function BeritaDetailPage() {
  const params   = useParams();
  const slugOrId = params?.slug as string;

  const [post,         setPost]         = useState<Post | null>(null);
  const [recentPosts,  setRecentPosts]  = useState<Post[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);

  /* Fetch */
  useEffect(() => {
    if (!slugOrId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });

    const load = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE    = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";

        let single: Post | null = null;

        try {
          const res = await axios.get(`${BASE}/posts/${slugOrId}`);
          const raw = res.data;
          single = raw?.data ?? raw;
        } catch {
          const allRes  = await axios.get(`${BASE}/posts`);
          const allList: Post[] = Array.isArray(allRes.data)
            ? allRes.data
            : allRes.data?.data ?? [];
          single = allList.find(
            (p) => String(p.id) === String(slugOrId) || p.slug === slugOrId
          ) ?? null;
        }

        if (single) {
          setPost(single);
          const allRes  = await axios.get(`${BASE}/posts`);
          const allList: Post[] = Array.isArray(allRes.data)
            ? allRes.data
            : allRes.data?.data ?? [];
          setRecentPosts(allList.filter((p) => p.id !== single!.id).slice(0, 7));
          setRelatedPosts(
            allList
              .filter((p) => p.id !== single!.id && p.category === single!.category)
              .slice(0, 3)
          );
        }
      } catch (err) {
        console.error("[BeritaDetail] Error:", err);
      }
      setLoading(false);
    };

    load();
  }, [slugOrId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /* ─── LOADING ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            <div className="animate-pulse space-y-4">
              <div className="h-72 bg-slate-100 rounded-2xl" />
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-48" />
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${75 + (i % 3)*8}%` }} />
              ))}
            </div>
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-32" />
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-20 h-14 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── NOT FOUND ─── */
  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4">📰</p>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Berita tidak ditemukan</h2>
          <p className="text-slate-500 mb-6 text-sm">URL mungkin sudah tidak valid.</p>
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all text-sm"
          >
            <ArrowLeft size={15} /> Kembali ke Berita
          </Link>
        </div>
      </div>
    );
  }

  const authorName = resolveAuthor(post.author);
  const dateStr    = (post as any).createdAt || post.date;
  const cs         = catStyle(post.category);

  // Build collage image list: use post.images if available, else repeat imageUrl for demo
  const collageImgs: string[] = post.images?.length
    ? post.images
    : post.imageUrl
      ? [post.imageUrl]
      : [FALLBACK_IMG];

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const fbShare    = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
  const twShare    = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(currentUrl)}`;
  const waShare    = `https://wa.me/?text=${encodeURIComponent(post.title + " " + currentUrl)}`;

return (
  <div className="min-h-screen bg-white">

    {/* ══ CONTENT AREA ══ */}
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-10">

        {/* ── ARTIKEL ── */}
        <article>

          {/* Gambar Utama */}
          <div className="mb-6 rounded-xl overflow-hidden">
            <CollageHero imgs={collageImgs} />
          </div>

          {/* Judul */}
          <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-snug mb-2">
            {post.title}
          </h1>

            {/* Meta baris: tanggal · author · share icons */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
                <span>{fmtDateLabel(dateStr)}</span>
                {authorName && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>
                      Oleh{" "}
                      <span className="text-slate-700 font-semibold">{authorName}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Share inline icons */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-0.5">Bagikan:</span>
                <a href={fbShare} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  title="Facebook">
                  <Facebook size={13} />
                </a>
                <a href={twShare} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-400 text-white hover:bg-sky-500 transition-colors"
                  title="Twitter">
                  <Twitter size={13} />
                </a>
                <a href={waShare} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                  title="WhatsApp">
                  <MessageCircle size={13} />
                </a>
              </div>
            </div>

            {/* Category badge */}
            {post.category && (
              <span className={`inline-block text-[11px] font-black px-3 py-0.5 rounded uppercase tracking-wide mb-5 ${cs.bg} ${cs.text}`}>
                {post.category}
              </span>
            )}

            {/* ── KONTEN ── */}
            <div className="text-[15px] leading-[1.85] text-slate-700 text-justify">
              {post.content?.trim().startsWith("<") ? (
                <div
                  dangerouslySetInnerHTML={{ __html: post.content }}
                  className="
                    [&_p]:mb-5 [&_p]:leading-[1.85]
                    [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3
                    [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-2
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5
                    [&_li]:text-slate-700
                    [&_strong]:font-bold [&_strong]:text-slate-900
                    [&_em]:italic
                    [&_blockquote]:border-l-4 [&_blockquote]:border-green-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-5
                    [&_a]:text-green-700 [&_a]:underline hover:[&_a]:text-green-600
                    [&_img]:rounded-xl [&_img]:my-6 [&_img]:w-full
                    [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_th]:bg-slate-50 [&_th]:font-bold
                  "
                />
              ) : (
                post.content
                  ?.split("\n")
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="mb-5 text-slate-700 leading-[1.85]">
                      {para}
                    </p>
                  ))
              )}
            </div>

            {/* ── SHARE BAWAH ── */}
            <div className="mt-10 pt-5 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <Share2 size={14} /> Bagikan artikel ini:
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={fbShare} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all">
                  <Facebook size={13} /> Facebook
                </a>
                <a href={twShare} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-400 text-white text-sm font-semibold hover:bg-sky-500 transition-all">
                  <Twitter size={13} /> Twitter
                </a>
                <a href={waShare} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-all">
                  <MessageCircle size={13} /> WhatsApp
                </a>
                <button onClick={handleCopy}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    copied ? "bg-green-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}>
                  {copied ? "✓ Tersalin!" : "🔗 Salin Link"}
                </button>
              </div>
            </div>

            {/* ── BERITA TERKAIT ── */}
            {relatedPosts.length > 0 && (
              <div className="mt-12">
                <h3 className="text-base font-black text-slate-800 mb-4 pb-3 border-b-2 border-green-600 inline-block">
                  Berita Terkait
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {relatedPosts.map(rp => (
                    <Link
                      key={rp.id}
                      href={`/berita/${rp.slug || rp.id}`}
                      className="group rounded-xl overflow-hidden border border-slate-100 hover:border-green-200 hover:shadow-md transition-all"
                    >
                      <div className="h-36 overflow-hidden bg-slate-100">
                        <img
                          src={rp.imageUrl || FALLBACK_IMG}
                          alt={rp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                          <Clock size={11} />
                          {fmtDateShort((rp as any).createdAt || rp.date)}
                        </p>
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-green-700 transition-colors line-clamp-2 leading-snug">
                          {rp.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Back */}
            <div className="mt-10">
              <Link
                href="/berita"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-green-700 transition-colors group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Kembali ke Semua Berita
              </Link>
            </div>
          </article>

          {/* ══ SIDEBAR ══ */}
          <aside>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-6 overflow-hidden">

              {/* Header sidebar */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b-2 border-green-600">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Berita Terkini
                </h3>
                <Link
                  href="/berita"
                  className="text-xs text-green-600 font-semibold hover:underline flex items-center gap-0.5"
                >
                  Semua <ChevronRight size={12} />
                </Link>
              </div>

              {/* ── Featured first post: large image + title + excerpt ── */}
              {recentPosts.length > 0 && (() => {
                const fp   = recentPosts[0];
                const fpDate = (fp as any).createdAt || fp.date;
                const fpCs = catStyle(fp.category);
                // Plain-text excerpt from content
                const excerpt = fp.content
                  ? fp.content.replace(/<[^>]+>/g, "").slice(0, 100) + "…"
                  : "";

                return (
                  <Link href={`/berita/${fp.slug || fp.id}`} className="group block">
                    {/* Large thumbnail */}
                    <div className="w-full h-44 overflow-hidden bg-slate-100">
                      <img
                        src={fp.imageUrl || FALLBACK_IMG}
                        alt={fp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                    </div>
                    <div className="px-4 py-3 border-b border-slate-100">
                      {fp.category && (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${fpCs.bg} ${fpCs.text}`}>
                          {fp.category}
                        </span>
                      )}
                      <h4 className="text-[13.5px] font-bold text-slate-900 group-hover:text-green-700 transition-colors leading-snug mt-1.5 mb-1 line-clamp-2">
                        {fp.title}
                      </h4>
                      {/* excerpt */}
                      {excerpt && (
                        <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 mb-1">
                          {excerpt}
                        </p>
                      )}
                      <p className="text-[11px] text-orange-500 font-semibold flex items-center gap-1 mt-1">
                        <Clock size={10} /> {fmtDateLabel(fpDate)}
                      </p>
                    </div>
                  </Link>
                );
              })()}

              {/* ── Remaining posts: thumbnail + title + short excerpt ── */}
              <div className="divide-y divide-slate-100">
                {recentPosts.slice(1).map(rp => {
                  const rpDate  = (rp as any).createdAt || rp.date;
                  const isActive = rp.id === post.id;
                  const rpExcerpt = rp.content
                    ? rp.content.replace(/<[^>]+>/g, "").slice(0, 60) + "…"
                    : "";
                  return (
                    <Link
                      key={rp.id}
                      href={`/berita/${rp.slug || rp.id}`}
                      className={`flex gap-3 px-4 py-3 group transition-colors ${
                        isActive ? "bg-green-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-[68px] h-[52px] rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={rp.imageUrl || FALLBACK_IMG}
                          alt={rp.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                        />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-[12.5px] font-semibold line-clamp-2 leading-snug transition-colors ${
                          isActive ? "text-green-700" : "text-slate-800 group-hover:text-green-700"
                        }`}>
                          {rp.title}
                        </h5>
                        {/* short excerpt */}
                        {rpExcerpt && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                            {rpExcerpt}
                          </p>
                        )}
                        <p className={`text-[11px] mt-1 flex items-center gap-1 ${
                          isActive ? "text-green-600" : "text-slate-400"
                        }`}>
                          <Clock size={9} /> {fmtDateShort(rpDate)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Footer sidebar */}
              <div className="px-4 py-3 border-t border-slate-100">
                <Link
                  href="/berita"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all"
                >
                  Lihat Semua Berita <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}