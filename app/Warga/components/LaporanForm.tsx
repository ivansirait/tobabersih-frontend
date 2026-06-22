"use client";

import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import {
  MapPin, Camera, X, Send,
  User, FileText, Mail, AlertCircle, CheckCircle2,
  RefreshCw, ZoomIn, Sun, Focus, Trash2, Loader2
} from "lucide-react";
import Image from "next/image";

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

// ── GPS Status Block ──────────────────────────────────────────
function GpsStatusBlock({
  form,
  gpsStatus,
  savedLocation,
}: {
  form: FormState;
  gpsStatus: string;
  savedLocation?: string | null;
}) {
  const hasCoords = form.latitude !== 0 || form.longitude !== 0;
  const isDetecting = gpsStatus.toLowerCase().includes("mendetek");
  const isFailed =
    gpsStatus.toLowerCase().includes("gagal") ||
    gpsStatus.toLowerCase().includes("tidak");

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Loader2 size={13} className="animate-spin text-blue-500" />
        </div>
        <p className="text-xs text-gray-600">Sedang mendeteksi lokasi GPS…</p>
      </div>
    );
  }

  if (hasCoords) {
    const displayCoords = savedLocation || `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`;
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 size={14} className="text-green-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-green-700">Lokasi berhasil terdeteksi</p>
          <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed font-mono">{displayCoords}</p>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <AlertCircle size={14} className="text-orange-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-orange-700">GPS tidak terdeteksi</p>
          <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
            Pastikan izin lokasi diaktifkan di browser. Laporan tetap bisa dikirim, namun koordinat tidak akan tersimpan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-100">
        <MapPin size={13} className="text-yellow-600" />
      </div>
      <p className="text-xs text-gray-600">{gpsStatus ?? "Mendeteksi lokasi…"}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
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

  const isSubmitDisabled = loading || !!qualityError;

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
        {/* Global form error banner */}
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

          {/* Lampiran Foto */}
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
                <div className={`rounded-xl p-2 transition-all ${
                  errors.photo && !qualityError
                    ? "bg-red-100 text-red-500"
                    : "bg-white text-gray-500 group-hover:text-green-600"
                }`}>
                  <Camera size={24} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Ambil Foto</span>
              </button>

              <input
                type="file"
                accept="image/*"
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

          {/* Blok Info Lokasi — hanya informatif, tidak memblokir submit */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              📍 Lokasi Anda
            </p>
            <GpsStatusBlock
              form={form}
              gpsStatus={gpsStatus}
              savedLocation={savedLocation}
            />
          </div>

          {/* Tombol Kirim */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 py-4 text-base font-bold text-white shadow-lg shadow-green-700/20 transition-all hover:bg-green-800 hover:shadow-green-800/25 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none active:scale-[0.98]"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> Mengirim Laporan…</>
            ) : qualityError ? (
              <><AlertCircle size={20} /> Perbaiki Foto Terlebih Dahulu</>
            ) : (
              <><Send size={20} /> Kirim Laporan</>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}