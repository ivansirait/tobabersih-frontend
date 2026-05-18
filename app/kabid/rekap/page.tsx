// app/kabid/rekap/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { Download, FileText, FileSpreadsheet, Calendar, Truck, Users, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function RekapPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'aduan',
    format: 'excel',
    startDate: '',
    endDate: ''
  });

  const handleExport = async () => {
    if (!formData.startDate || !formData.endDate) {
      toast.error('Harap pilih rentang tanggal');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/kabid/export-rekap`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = formData.format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `rekap_${formData.type}_${new Date().toISOString().slice(0,10)}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Laporan berhasil diunduh');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Gagal mengunduh laporan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rekapitulasi Laporan</h1>
          <p className="text-gray-500 mt-1">Unduh laporan operasional dalam format PDF atau Excel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Export */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Export Data</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Laporan</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'aduan' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.type === 'aduan' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText size={24} className={formData.type === 'aduan' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium">Aduan Masyarakat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'armada' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.type === 'armada' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Truck size={24} className={formData.type === 'armada' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium">Operasional Armada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'wilayah' })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.type === 'wilayah' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MapPin size={24} className={formData.type === 'wilayah' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium">Wilayah Layanan</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format File</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'excel' })}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    formData.format === 'excel' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet size={20} className={formData.format === 'excel' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium">Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'pdf' })}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    formData.format === 'pdf' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText size={20} className={formData.format === 'pdf' ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium">PDF (.pdf)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Unduh Laporan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informasi */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Informasi Laporan</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Laporan Aduan Masyarakat</h3>
              <p className="text-sm text-blue-700">Berisi data laporan masyarakat, status penanganan, waktu respon, dan detail aduan.</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">🚛 Laporan Operasional Armada</h3>
              <p className="text-sm text-green-700">Berisi performa armada, total perjalanan, volume sampah, dan aktivitas supir.</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">🗺️ Laporan Wilayah Layanan</h3>
              <p className="text-sm text-purple-700">Berisi statistik laporan per kecamatan, tingkat penyelesaian, dan hotspot wilayah.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}