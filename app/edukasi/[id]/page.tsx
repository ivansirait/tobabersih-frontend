"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, Clock } from "lucide-react";

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
  createdAt?: string;
}

const getTitle    = (e: EducationPost) => e.judul    || e.title    || "(Tanpa Judul)";
const getDesc     = (e: EducationPost) => e.deskripsi || e.content  || "";
const getMediaUrl = (e: EducationPost) => e.mediaUrl  || e.media_url || "";
const getMediaType= (e: EducationPost) => (e.mediaType || e.media_type || "IMAGE").toUpperCase();

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800";

const fmtDate = (v?: string) => {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return v; }
};

export default function EdukasiDetailPage() {
  const params   = useParams();
  const id       = params?.id as string;

  const [post, setPost]       = useState<EducationPost | null>(null);
  const [others, setOthers]   = useState<EducationPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || "";
        const BASE = rawBase ? rawBase.replace(/\/$/, "") + "/api" : "/api";

        const [detailRes, allRes] = await Promise.all([
          axios.get(`${BASE}/edukasi/${id}`),
          axios.get(`${BASE}/edukasi`),
        ]);

        const raw = detailRes.data;
        setPost(raw?.data ?? raw);

        const allRaw = allRes.data;
        const list: EducationPost[] = Array.isArray(allRaw) ? allRaw : allRaw?.data ?? [];
        setOthers(list.filter((e) => String(e.id) !== String(id)).slice(0, 4));
      } catch (err) {
        console.error("[edukasi detail] FETCH ERROR:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f8fb] pt-28 px-6">
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-40" />
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-80 bg-slate-200 rounded-3xl" />
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-slate-200 rounded" />)}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f4f8fb] flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-xl font-bold text-slate-700 mb-4">Materi tidak ditemukan</p>
          <Link href="/edukasi" className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-all">
            <ArrowLeft size={16} /> Kembali ke Edukasi
          </Link>
        </div>
      </div>
    );
  }

  const title     = getTitle(post);
  const desc      = getDesc(post);
  const mediaUrl  = getMediaUrl(post);
  const mediaType = getMediaType(post);

  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-100 pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-5">
            <Link href="/" className="hover:text-teal-600 transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <Link href="/edukasi" className="hover:text-teal-600 transition-colors">Edukasi</Link>
            <ChevronRight size={14} />
            <span className="text-slate-600 line-clamp-1">{title}</span>
          </nav>

          <span className="inline-block text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full mb-4">
            Edukasi Lingkungan
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight max-w-3xl">
            {title}
          </h1>

          {post.createdAt && (
            <div className="flex items-center gap-2 mt-4 text-sm text-slate-400">
              <Clock size={14} />
              <span>{fmtDate(post.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Article */}
          <article className="lg:col-span-2">
            {/* Media */}
            <div className="rounded-3xl overflow-hidden bg-slate-100 mb-8">
              {mediaType === "VIDEO" ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full rounded-3xl"
                  style={{ maxHeight: "420px" }}
                />
              ) : (
                <img
                  src={mediaUrl || FALLBACK_IMG}
                  alt={title}
                  className="w-full object-cover"
                  style={{ maxHeight: "420px" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                />
              )}
            </div>

            {/* Content */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              {desc.startsWith("<") ? (
                <div
                  dangerouslySetInnerHTML={{ __html: desc }}
                  className="prose prose-lg max-w-none text-slate-700 [&_p]:mb-4 [&_p]:leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-teal-700 [&_h2]:mt-8 [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2"
                />
              ) : (
                <div className="space-y-4">
                  {desc
                    .split("\n")
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i} className="text-slate-700 leading-relaxed text-base">
                        {para}
                      </p>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link
                href="/edukasi"
                className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                <ArrowLeft size={15} /> Kembali ke Daftar Edukasi
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 p-5 sticky top-24">
              <h3 className="text-base font-bold text-slate-800 mb-5 pb-3 border-b border-slate-100">
                Materi Lainnya
              </h3>
              <div className="space-y-4">
                {others.length === 0 ? (
                  <p className="text-sm text-slate-400">Tidak ada materi lain</p>
                ) : (
                  others.map((edu) => {
                    const t  = getTitle(edu);
                    const mu = getMediaUrl(edu);
                    const mt = getMediaType(edu);
                    return (
                      <Link
                        key={edu.id}
                        href={`/edukasi/${edu.id}`}
                        className="flex gap-3 items-start group -mx-2 px-2 py-2 rounded-2xl hover:bg-teal-50 transition-colors"
                      >
                        <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {mt === "VIDEO" ? (
                            <video src={mu} className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={mu || FALLBACK_IMG}
                              alt={t}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                            {t}
                          </h5>
                          <span className="text-xs text-teal-500 font-semibold mt-1 block">
                            Baca →
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  href="/edukasi"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-all"
                >
                  Lihat Semua Materi
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}