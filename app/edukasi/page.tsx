"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, BookOpen } from "lucide-react";

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

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600";

export default function EdukasiListPage() {
  const [items, setItems]   = useState<EducationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  const filtered = items.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      getTitle(e).toLowerCase().includes(q) ||
      getDesc(e).toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-100 pt-24 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-600 text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={15} /> Kembali ke Beranda
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-teal-600 font-bold tracking-widest text-xs uppercase mb-2">
                PEMBELAJARAN
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">
                Edukasi{" "}
                <span className="text-teal-500">Lingkungan</span>
              </h1>
              <p className="text-slate-500 mt-3 text-base">
                Informasi dan materi pembelajaran seputar lingkungan hidup
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Cari materi edukasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-teal-400 w-64 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse"
              >
                <div className="h-52 bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-4/5" />
                  <div className="h-4 bg-slate-200 rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold">Tidak ada materi ditemukan</p>
            <p className="text-sm mt-1">Coba ubah kata pencarian</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {filtered.map((edu) => {
              const title     = getTitle(edu);
              const desc      = getDesc(edu);
              const mediaUrl  = getMediaUrl(edu);
              const mediaType = getMediaType(edu);

              return (
                <div
                  key={edu.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Media */}
                  <div className="h-52 bg-slate-100 overflow-hidden flex-shrink-0">
                    {mediaType === "VIDEO" ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={mediaUrl || FALLBACK_IMG}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMG;
                        }}
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">
                      Edukasi
                    </span>
                    <h3 className="text-lg font-bold text-teal-700 mb-3 line-clamp-2 leading-snug">
                      {title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed flex-1">
                      {desc}
                    </p>

                    <Link
                      href={`/edukasi/${edu.id}`}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 hover:gap-3 transition-all"
                    >
                      Baca Selengkapnya <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}