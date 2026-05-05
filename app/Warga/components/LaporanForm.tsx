"use client";
import { MapPin, Camera, Image as ImageIcon, X, Send, User, Crosshair, FileText } from 'lucide-react';
import Image from 'next/image';

export default function LaporanForm({ 
  form, setForm, loading, gpsStatus, previewUrl, 
  cameraInputRef, fileInputRef, handleImageChange, removeImage, handleSubmit,
  handleDeteksiLokasi
}: any) {
  return (
    <section className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header dengan background hijau */}
      <div className="bg-green-700 text-white p-6 text-center">
<div className="flex justify-center mb-3">
  <Image 
    src="/icons/web-app-manifest-512x512.png"
    alt="Dinas Lingkungan Hidup" 
    width={80} 
    height={80}
    className="object-contain"
  />
</div>
        <h2 className="text-xl font-bold">DINAS LINGKUNGAN HIDUP</h2>
        <p className="text-sm opacity-90">KABUPATEN TOBA</p>
      </div>

      <div className="p-6">
        {/* Judul Form */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800">Form Pengaduan</h3>
          <p className="text-sm text-gray-500 mt-1">
            Laporkan penumpukan sampah atau kerusakan lingkungan untuk masa depan yang lebih bersih.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              NAMA LENGKAP
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                className="w-full border border-gray-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
                placeholder="Masukkan nama lengkap" 
                value={form.pelapor} 
                onChange={e => setForm({...form, pelapor: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Lokasi Laporan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deskripsi Lokasi
            </label>
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  className="w-full border border-gray-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
                  placeholder="Pilih atau cari lokasi..." 
                  value={form.lokasi} 
                  onChange={e => setForm({...form, lokasi: e.target.value})} 
                  required 
                />
              </div>
              <button 
                type="button" 
                onClick={handleDeteksiLokasi}
                className="flex items-center justify-center gap-2 w-full border border-green-500 text-green-600 p-3 rounded-lg font-semibold text-sm hover:bg-green-50 transition-all"
              >
                <Crosshair size={18} /> Deteksi Lokasi
              </button>
              <div className={`text-xs font-medium flex items-center gap-1 ${form.latitude !== 0 ? 'text-green-600' : 'text-gray-400'}`}>
                <MapPin size={12} /> {gpsStatus}
              </div>
            </div>
          </div>

          {/* Lampiran Foto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              LAMPIRAN FOTO
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => cameraInputRef.current?.click()} 
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 p-4 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <Camera size={24} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Ambil Foto</span>
              </button>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 p-4 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <ImageIcon size={24} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Pilih dari Galeri</span>
              </button>
              <input type="file" accept="image/*" capture="environment" hidden ref={cameraInputRef} onChange={handleImageChange} />
              <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />
            </div>

            {/* Preview Foto */}
            {previewUrl && (
              <div className="relative mt-3 w-full h-40 rounded-lg overflow-hidden border-2 border-green-200">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={removeImage} 
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Deskripsi / Pesan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DESKRIPSI / PESAN
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea 
                className="w-full border border-gray-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-28" 
                placeholder="Ceritakan detail kejadian atau kondisi di lokasi..." 
                value={form.deskripsi} 
                onChange={e => setForm({...form, deskripsi: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Tombol Kirim */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-green-700 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-800 transition-all flex justify-center items-center gap-2 mt-4"
          >
            {loading ? "Mengirim..." : <><Send size={20} /> Kirim Laporan</>}
          </button>
        </form>
      </div>
    </section>
  );
}