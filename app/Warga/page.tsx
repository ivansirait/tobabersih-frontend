"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import LaporanForm from "./components/LaporanForm";

const BASE_URL_API = "/api";

    type FormState = {
      pelapor: string;
      email: string;
      deskripsi: string;
      latitude: number;
      longitude: number;
    };

type FormErrors = {
  pelapor?: string;
  email?: string;
  lokasi?: string;
  photo?: string;
  deskripsi?: string;
};

export default function Home() {
  const [form, setForm] = useState<FormState>({
    pelapor: "",
    email: "",
    deskripsi: "",
    latitude: 0,
    longitude: 0,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState("Mendeteksi lokasi...");
  const [savedLocation, setSavedLocation] = useState<string | null>(null);

  const [uiAlert, setUiAlert] = useState<{
    type: "success" | "error" | "warning";
    title: string;
    message: string;
  } | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ambilLokasiOtomatis();
  }, []);

  function showUiAlert(
    type: "success" | "error" | "warning",
    title: string,
    message: string
  ) {
    setUiAlert({ type, title, message });
  }

  function isValidCoordinate(latitude: number, longitude: number) {
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !(latitude === 0 && longitude === 0)
    );
  }

  function ambilLokasiOtomatis() {
    setGpsStatus("Mendeteksi lokasi...");

    if (!navigator.geolocation) {
      setGpsStatus("Browser tidak mendukung GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        setForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setSavedLocation(
          `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        );

        setGpsStatus("Lokasi berhasil didapat");
      },
      () => {
        setGpsStatus("Gagal mendapatkan lokasi");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function formatWilayahError(message: string) {
    const normalizedMessage = String(message || "").replace(/\s+/g, " ").trim();
    const match = normalizedMessage.match(/berada\s+([\d.,]+)\s*km.*\(([^)]+)\)/i);

    if (!match) {
      return (
        normalizedMessage ||
        "Laporan tidak dapat dikirim karena lokasi berada di luar wilayah aktif."
      );
    }

    const distance = match[1];
    const kecamatan = match[2];

    return `Lokasi Anda masih berjarak ${distance} km dari kecamatan aktif terdekat (${kecamatan}). Silakan kirim laporan saat berada di dalam radius wilayah yang aktif.`;
  }

  function validateForm() {
    const newErrors: FormErrors = {};

    const nama = form.pelapor.trim();
    const email = form.email.trim();
    const deskripsi = form.deskripsi.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nama) {
      newErrors.pelapor = "Nama lengkap wajib diisi.";
    } else if (nama.length < 3) {
      newErrors.pelapor = "Nama lengkap minimal 3 karakter.";
    } else if (nama.length > 100) {
      newErrors.pelapor = "Nama lengkap maksimal 100 karakter.";
    }

    if (!email) {
      newErrors.email = "Email wajib diisi.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Format email tidak valid.";
    } else if (email.length > 150) {
      newErrors.email = "Email maksimal 150 karakter.";
    }

    if (!isValidCoordinate(form.latitude, form.longitude)) {
      newErrors.lokasi =
        "Lokasi otomatis wajib terdeteksi sebelum laporan dikirim. Izinkan akses lokasi pada browser.";
    }

    if (!selectedImage) {
      newErrors.photo = "Lampiran foto wajib diisi.";
    }

    if (!deskripsi) {
      newErrors.deskripsi = "Deskripsi laporan wajib diisi.";
    } else if (deskripsi.length < 10) {
      newErrors.deskripsi = "Deskripsi laporan minimal 10 karakter.";
    } else if (deskripsi.length > 1000) {
      newErrors.deskripsi = "Deskripsi laporan maksimal 1000 karakter.";
    }

    setErrors(newErrors);

    const firstError =
      newErrors.pelapor ||
      newErrors.email ||
      newErrors.lokasi ||
      newErrors.photo ||
      newErrors.deskripsi;

    if (firstError) {
      showUiAlert("warning", "Validasi Form", firstError);

      if (newErrors.lokasi) {
        ambilLokasiOtomatis();
      }

      return false;
    }

    return true;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        photo: "Foto harus berformat JPG, JPEG, PNG, atau WEBP.",
      }));

      showUiAlert(
        "warning",
        "Format Foto Tidak Valid",
        "Foto harus berformat JPG, JPEG, PNG, atau WEBP."
      );

      e.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        photo: "Ukuran foto maksimal 5 MB.",
      }));

      showUiAlert(
        "warning",
        "Ukuran Foto Terlalu Besar",
        "Ukuran foto maksimal 5 MB."
      );

      e.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setQualityError(null);

    setErrors((prev) => ({
      ...prev,
      photo: undefined,
    }));
  }

      function removeImage() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedImage(null);
      setPreviewUrl(null);
      setQualityError(null);

      setErrors((prev) => ({
        ...prev,
        photo: "Lampiran foto wajib diisi.",
      }));

      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setQualityError(null);

    try {
      const formData = new FormData();

      formData.append("pelapor", form.pelapor.trim());
      formData.append("email", form.email.trim());

      formData.append(
        "lokasi",
        `Lokasi otomatis GPS (${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)})`
      );

      formData.append("latitude", String(form.latitude));
      formData.append("longitude", String(form.longitude));
      formData.append("description", form.deskripsi.trim());

      if (selectedImage) {
        formData.append("photo", selectedImage);
      }

const response = await axios.post(
  `${BASE_URL_API}/laporan/create`,
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    validateStatus: (status) => status < 500 // 422 dianggap sukses
  }
);

// 422 tidak akan throw error
if (response.status === 422) {
  // Tangani sebagai response normal, bukan error
  const errorMessage = response.data?.message || "Foto kurang jelas";
  setQualityError(errorMessage);
  setErrors((prev) => ({ ...prev, photo: errorMessage }));
  showUiAlert("warning", "Perhatian", errorMessage); // Tampilkan sebagai warning
  return;
}

      console.log("Laporan berhasil dibuat:", response.data);

      setForm((prev) => ({
        ...prev,
        pelapor: "",
        email: "",
        deskripsi: "",
      }));

      removeImage();
      setErrors({});

      showUiAlert(
        "success",
        "Laporan Terkirim",
        "Laporan berhasil dikirim. Admin akan mengirim notifikasi ke email Anda."
      );
    } catch (err: any) {
  console.error("Error submit laporan:", err);

  if (err.response?.status === 422) {
    const errorMessage =
      err.response?.data?.message ||
      "Gambar tidak memenuhi kriteria. Silakan foto ulang dengan pencahayaan yang lebih baik dan pastikan objek sampah terlihat jelas.";

    setQualityError(errorMessage);

    setErrors((prev) => ({
      ...prev,
      photo: errorMessage,
    }));

    return;
  }

      let errorMessage = "Gagal mengirim laporan.";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      const finalMessage = /kecamatan|wilayah|radius|km/i.test(errorMessage)
        ? formatWilayahError(errorMessage)
        : errorMessage;

      showUiAlert("error", "Laporan Ditolak", finalMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#f8fafc] p-5 md:p-10">
      <div className="mx-auto max-w-3xl">
        <LaporanForm
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          loading={loading}
          gpsStatus={gpsStatus}
          savedLocation={savedLocation}
          previewUrl={previewUrl}
          cameraInputRef={cameraInputRef}
          handleImageChange={handleImageChange}
          removeImage={removeImage}
          handleSubmit={handleSubmit}
          qualityError={qualityError}
          selectedImage={selectedImage}
        />    
      </div>

      {uiAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold ${
                    uiAlert.type === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : uiAlert.type === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {uiAlert.type === "success"
                    ? "✓"
                    : uiAlert.type === "warning"
                    ? "!"
                    : "×"}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {uiAlert.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {uiAlert.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUiAlert(null)}
                  className={`rounded-full px-6 py-2 text-sm font-semibold text-white transition ${
                    uiAlert.type === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : uiAlert.type === "warning"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Oke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}