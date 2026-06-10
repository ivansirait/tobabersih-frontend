// components/LaporanForm.tsx
"use client";

import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import {
  MapPin, Camera, X, Send,
  User, FileText, Mail, AlertCircle, CheckCircle2,
  RefreshCw, ZoomIn, Sun, Focus, Trash2
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export type FormState = {
  pelapor: string;
  email: string;
  deskripsi: string;
  latitude: number;
  longitude: number;
};

export type FormErrors = {
  pelapor?: string;
  email?: string;
  photo?: string;
  deskripsi?: string;
};

type Wilayah = {
  id?: string;
  name?: string;
  code?: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number;
  isActive?: boolean;
};

type LaporanFormProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  errors: FormErrors;
  setErrors: Dispatch<SetStateAction<FormErrors>>;
  loading: boolean;
  gpsStatus: string;
  savedLocation?: string | null;
  previewUrl: string | null;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  handleSubmit: (e: FormEvent) => void;
  selectedImage?: File | null;
  qualityError?: string | null;
};

function PhotoQualityAlert({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  const tips = (() => {
    const r = reason.toLowerCase();
    if (r.includes("buram") || r.includes("blur")) return [
      { icon: Focus, text: "Pegang kamera dengan stabil, tempelkan siku ke badan" },
      { icon: ZoomIn, text: "Dekati objek sampah, minimal 1 meter jaraknya" },
      { icon: Sun, text: "Ketuk layar kamera pada objek agar fokus otomatis" },
    ];
    if (r.includes("gelap") || r.includes("terang") || r.includes("cahaya")) return [
      { icon: Sun, text: "Pastikan sumber cahaya ada di belakang kamera, bukan di depan" },
      { icon: Sun, text: "Hindari foto di bawah sinar matahari langsung ke lensa" },
      { icon: ZoomIn, text: "Coba pindah ke area yang lebih terang / teduh" },
    ];
    if (r.includes("kecil") || r.includes("coverage") || r.includes("jauh") || r.includes("terdeteksi")) return [
      { icon: ZoomIn, text: "Dekatkan kamera ke tumpukan sampah, objek harus mengisi minimal 30% layar" },
      { icon: Focus, text: "Pastikan sampah terlihat jelas dan tidak tertutup benda lain" },
      { icon: Camera, text: "Ambil foto dari sudut atas / samping agar sampah lebih terlihat" },
    ];
    return [
      { icon: ZoomIn, text: "Dekatkan kamera dan pastikan sampah mengisi frame foto" },
      { icon: Sun, text: "Pastikan pencahayaan cukup, tidak gelap atau terlalu terang" },
      { icon: Focus, text: "Pastikan foto tidak buram — tahan nafas saat mengambil foto" },
    ];
  })();

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-md">
      <div className="flex items-start gap-3 bg-red-600 px-4 py-3.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <AlertCircle size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Foto Tidak Lolos Verifikasi</p>
          <p className="mt-0.5 text-xs text-red-100 leading-relaxed">{reason}</p>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          💡 Yang perlu diperbaiki:
        </p>
        <div className="space-y-2.5">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <tip.icon size={14} />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100">
          <div className="text-center">
            <div className="mx-auto mb-1.5 flex h-14 w-full items-center justify-center rounded-lg bg-red-50 border-2 border-dashed border-red-300">
              <div className="flex flex-col items-center gap-0.5">
                <Trash2 size={12} className="text-red-400" />
                <span className="text-[9px] text-red-400 font-medium">Terlalu jauh</span>
              </div>
            </div>
            <p className="text-[10px] text-red-500 font-semibold">❌ Salah</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1.5 flex h-14 w-full items-center justify-center rounded-lg bg-green-50 border-2 border-dashed border-green-300">
              <div className="flex flex-col items-center gap-0.5">
                <Trash2 size={22} className="text-green-600" />
                <span className="text-[9px] text-green-600 font-medium">Jelas & dekat</span>
              </div>
            </div>
            <p className="text-[10px] text-green-600 font-semibold">✅ Benar</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95 shadow-sm shadow-red-200"
        >
          <RefreshCw size={16} />
          Ganti Foto & Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default function LaporanForm({
  form,
  setForm,
  errors,
  setErrors,
  loading,
  gpsStatus,
  savedLocation,
  previewUrl,
  cameraInputRef,
  handleImageChange,
  removeImage,
  handleSubmit,
  selectedImage,
  qualityError,
}: LaporanFormProps) {
  // State untuk verifikasi wilayah (tetap ada, tapi tidak memblokir tombol)
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [activeWilayah, setActiveWilayah] = useState<Wilayah | null>(null);
  const [wilayahMessage, setWilayahMessage] = useState<string | null>(null);
  const [isLocationRegistered, setIsLocationRegistered] = useState<boolean>(true);
  const [isCheckingLocation, setIsCheckingLocation] = useState<boolean>(false);
  const [checkTrigger, setCheckTrigger] = useState<number>(0);

  const isValidCoordinate = (latitude: number, longitude: number) => {
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      !(latitude === 0 && longitude === 0)
    );
  };

  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadius = 6371000;
    return earthRadius * c;
  };

  const parseCoordinate = (value: number | string | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const extractWilayahList = (payload: unknown): Wilayah[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as Wilayah[];
    const obj = payload as Record<string, unknown>;
    const candidates: unknown[] = [
      obj['data'], obj['items'], obj['result'],
      (obj['data'] as any)?.data,
      (obj['data'] as any)?.items,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c as Wilayah[];
    }
    for (const key of ['wilayah', 'data', 'items', 'result']) {
      const v = obj[key];
      if (Array.isArray(v)) return v as Wilayah[];
    }
    return [];
  };

  const findActiveWilayah = (latitude: number, longitude: number, areas: Wilayah[]) => {
    const activeAreas = areas.filter((area) => area.isActive && area.radius !== undefined);
    let best: Wilayah | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const area of activeAreas) {
      const lat = parseCoordinate(area.latitude);
      const lon = parseCoordinate(area.longitude);
      const radius = area.radius ?? 0;
      if (lat === null || lon === null || radius <= 0) continue;

      const distance = getDistanceMeters(latitude, longitude, lat, lon);
      if (distance <= radius && distance < bestDistance) {
        bestDistance = distance;
        best = area;
      }
    }
    return best;
  };

  useEffect(() => {
    const checkWilayahAdmin = async () => {
      if (!isValidCoordinate(form.latitude, form.longitude)) {
        setIsLocationRegistered(false);
        setActiveWilayah(null);
        setWilayahMessage("Lokasi belum terdeteksi atau tidak valid.");
        return;
      }

      setIsCheckingLocation(true);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
        const response = await fetch(`/api/wilayah/public`, {
          cache: 'no-store',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API Error] Status: ${response.status}, Detail: ${errorText}`);
          if (response.status === 401) {
            setWilayahMessage('Gagal memverifikasi wilayah. Jika Anda sudah login, coba refresh halaman atau masuk ulang.');
          }
          throw new Error(`Gagal memuat data wilayah; status ${response.status}`);
        }

        const payload = await response.json();
        const list = extractWilayahList(payload);
        setWilayahList(list);

        const matchedWilayah = findActiveWilayah(form.latitude, form.longitude, list);
        setActiveWilayah(matchedWilayah);

        if (matchedWilayah) {
          setIsLocationRegistered(true);
          setWilayahMessage(
            `Lokasi Anda berada di dalam wilayah aktif "${matchedWilayah.name || matchedWilayah.code || 'terdaftar'}".`
          );
        } else {
          setIsLocationRegistered(false);
          const activeCount = list.filter((area) => area.isActive).length;
          setWilayahMessage(
            activeCount === 0
              ? 'Belum ada wilayah operasional aktif terdaftar. Silakan hubungi admin.'
              : 'Lokasi saat ini tidak berada dalam wilayah operasional aktif yang terdaftar.'
          );
        }
      } catch (error) {
        console.error('Gagal memverifikasi wilayah:', error);
        setIsLocationRegistered(false);
        setActiveWilayah(null);
        setWilayahMessage('Tidak dapat memverifikasi wilayah saat ini. Silakan coba lagi.');
      } finally {
        setIsCheckingLocation(false);
      }
    };

    checkWilayahAdmin();
  }, [form.latitude, form.longitude, checkTrigger]);

  // Helper UI
  const hasErrors = Object.values(errors).some(Boolean);

  const inputBaseClass =
    "w-full rounded-xl border bg-white p-3.5 pl-11 text-sm text-gray-800 shadow-sm outline-none transition-all placeholder:text-gray-400";
  const normalInputClass = "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100";
  const errorInputClass = "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100";
  const labelClass = "mb-2 block text-sm font-semibold text-gray-800";

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const FieldError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
        <span className="leading-relaxed">{message}</span>
      </div>
    );
  };

  // ✅ PERUBAHAN: Tombol kirim hanya dinonaktifkan saat loading atau foto bermasalah.
  // Lokasi tidak terdeteksi atau sedang verifikasi TIDAK memblokir tombol.
  const isSubmitDisabled = loading || !!qualityError || !isLocationRegistered || isCheckingLocation;

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/70">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-green-700 via-green-700 to-emerald-800 p-7 text-center text-white">
        <div className="mb-4 flex justify-center">
          <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
            <Image
              src="/icons/web-app-manifest-512x512.png"
              alt="Dinas Lingkungan Hidup"
              width={78}
              height={78}
              loading="eager"
              className="object-contain"
            />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-wide">DINAS LINGKUNGAN HIDUP</h2>
        <p className="mt-1 text-sm text-green-50">KABUPATEN TOBA</p>
      </div>

      <div className="p-6 md:p-7">
        {hasErrors && !qualityError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">Form belum lengkap</p>
                <p className="mt-1 text-sm leading-relaxed text-red-700">
                  Periksa kembali bagian yang ditandai merah sebelum mengirim laporan.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Nama Lengkap */}
          <div>
            <label className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className={`absolute left-3.5 top-3.5 ${errors.pelapor ? "text-red-400" : "text-gray-400"}`} size={18} />
              <input
                type="text"
                className={`${inputBaseClass} ${errors.pelapor ? errorInputClass : normalInputClass}`}
                placeholder="Masukkan nama lengkap"
                value={form.pelapor}
                onChange={(e) => { setForm({ ...form, pelapor: e.target.value }); clearError("pelapor"); }}
              />
            </div>
            <FieldError message={errors.pelapor} />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className={`absolute left-3.5 top-3.5 ${errors.email ? "text-red-400" : "text-gray-400"}`} size={18} />
              <input
                type="email"
                className={`${inputBaseClass} ${errors.email ? errorInputClass : normalInputClass}`}
                placeholder="contoh@email.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError("email"); }}
              />
            </div>
            <FieldError message={errors.email} />
          </div>

          {/* Lampiran Foto (hanya kamera) */}
          <div>
            <label className={labelClass}>
              Lampiran Foto <span className="text-red-500">*</span>
            </label>

            <div className="flex">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={`group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-all ${
                  errors.photo && !qualityError
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-green-500 hover:bg-green-50"
                }`}
              >
                <div
                  className={`rounded-xl p-2 transition-all ${
                    errors.photo && !qualityError
                      ? "bg-red-100 text-red-500"
                      : "bg-white text-gray-500 group-hover:text-green-600"
                  }`}
                >
                  <Camera size={24} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Ambil Foto</span>
              </button>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="environment"
                hidden
                ref={cameraInputRef}
                onChange={handleImageChange}
              />
            </div>

            {!selectedImage && !qualityError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Foto harus <strong>jelas, terang</strong>, dan sampah terlihat mengisi sebagian besar gambar.
                  Sistem akan memverifikasi foto otomatis.
                </p>
              </div>
            )}

            {selectedImage && !qualityError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                <span>Foto dipilih: <span className="font-semibold">{selectedImage.name}</span></span>
              </div>
            )}

            {errors.photo && !qualityError && <FieldError message={errors.photo} />}

            {previewUrl && !qualityError && (
              <div className="relative mt-4 h-44 w-full overflow-hidden rounded-2xl border border-green-200 bg-green-50 shadow-sm">
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow-lg transition hover:bg-red-700"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {qualityError && (
              <PhotoQualityAlert
                reason={qualityError}
                onRetry={() => {
                  removeImage();
                  setTimeout(() => cameraInputRef.current?.click(), 100);
                }}
              />
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-gray-800">
                Deskripsi / Pesan <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${form.deskripsi.length >= 1000 ? "text-red-500" : "text-gray-400"}`}>
                {form.deskripsi.length}/1000
              </span>
            </div>
            <div className="relative">
              <FileText className={`absolute left-3.5 top-3.5 ${errors.deskripsi ? "text-red-400" : "text-gray-400"}`} size={18} />
              <textarea
                className={`h-32 w-full resize-none rounded-xl border bg-white p-3.5 pl-11 text-sm text-gray-800 shadow-sm outline-none transition-all placeholder:text-gray-400 ${
                  errors.deskripsi ? errorInputClass : normalInputClass
                }`}
                placeholder="Deskripsi Detail Lokasi Sampah..."
                value={form.deskripsi}
                onChange={(e) => { setForm({ ...form, deskripsi: e.target.value }); clearError("deskripsi"); }}
                maxLength={1000}
              />
            </div>
            <FieldError message={errors.deskripsi} />
          </div>

          {/* Blok Info Lokasi + Verifikasi Wilayah Aktif (hanya info, tidak memblokir tombol) */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                📍 Lokasi Anda
              </p>
              {form.latitude !== 0 && !isCheckingLocation && (
                <button
                  type="button"
                  onClick={() => setCheckTrigger(prev => prev + 1)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-100 px-2 py-1 rounded-md"
                >
                  <RefreshCw size={10} /> Cek Ulang
                </button>
              )}
            </div>

            {/* Status GPS & Alamat */}
            {savedLocation ? (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Lokasi Anda sudah tersimpan</p>
                  <p className="mt-0.5 text-[11px] text-gray-600 leading-relaxed">{savedLocation}</p>
                </div>
              </div>
            ) : form.latitude !== 0 ? (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Lokasi Anda sudah tersimpan</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    {`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}
                  </p>
                </div>
              </div>
            ) : (gpsStatus ?? "").toLowerCase().includes("gagal") || (gpsStatus ?? "").toLowerCase().includes("tidak") ? (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600">Lokasi tidak terdeteksi</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
                    Pastikan izin lokasi diaktifkan di pengaturan browser Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                  <MapPin size={13} className="text-yellow-600" />
                </div>
                <p className="text-xs text-gray-600">{gpsStatus ?? "Mendeteksi lokasi..."}</p>
              </div>
            )}

            {/* Informasi verifikasi wilayah aktif */}
            {isCheckingLocation && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <RefreshCw size={14} className="animate-spin" />
                <span>Memverifikasi wilayah jangkauan...</span>
              </div>
            )}

            {!isCheckingLocation && wilayahMessage && (
              <div className={`mt-3 rounded-xl border px-3 py-2 text-xs shadow-sm ${
                isLocationRegistered ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-orange-200 bg-orange-50 text-orange-800'
              }`}>
                <div className="flex items-start gap-2">
                  {isLocationRegistered ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-orange-600" />
                  )}
                  <span className="leading-relaxed">{wilayahMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Kirim - selalu aktif kecuali loading atau foto bermasalah */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 py-4 text-base font-bold text-white shadow-lg shadow-green-700/20 transition-all hover:bg-green-800 hover:shadow-green-800/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
          {loading ? (
            <><span className="h-5 w-5 animate-spin ..." /> Mengirim Laporan...</>
          ) : isCheckingLocation ? (
            <><span className="h-5 w-5 animate-spin ..." /> Memverifikasi Wilayah...</>  // ← TAMBAH INI
          ) : qualityError ? (
            <><AlertCircle size={20} /> Perbaiki Foto Terlebih Dahulu</>
          ) : !isLocationRegistered ? (
            <><AlertCircle size={20} /> Lokasi di Luar Wilayah Operasional</>  // ← TAMBAH INI
          ) : (
            <><Send size={20} /> Kirim Laporan</>
          )}
          </button>
        </form>
      </div>
    </section>
  );
}