"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import NavbarSupir from '../components/NavbarSupir';
import { Calendar, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function RiwayatTugas() {
  const router = useRouter();
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchRiwayat();
  }, [page]);

  const fetchRiwayat = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `/api/supir/riwayat?page=${page}&limit=10`;
      if (filter.startDate) url += `&startDate=${filter.startDate}`;
      if (filter.endDate) url += `&endDate=${filter.endDate}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRiwayat(res.data.data.tasks);
      setTotalPages(res.data.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetch riwayat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchRiwayat();
  };

  return (
    <main className="min-h-screen bg-[#FDFCF0]">
      <NavbarSupir onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }} />

      <div className="max-w-xl mx-auto py-6 px-5">
        <h1 className="text-2xl font-black text-slate-800 mb-6">Riwayat Tugas</h1>

        {/* Filter */}
        <div className="bg-white p-4 rounded-2xl mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-slate-600">Dari Tanggal</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Sampai Tanggal</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleFilter}
            className="w-full bg-green-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-green-700"
          >
            Terapkan Filter
          </button>
        </div>

        {/* Daftar Riwayat */}
        {loading ? (
          <div className="text-center py-10">Memuat...</div>
        ) : riwayat.length > 0 ? (
          <div className="space-y-3">
            {riwayat.map((item: any) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-slate-400">{item.taskNumber}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {item.type}
                  </span>
                </div>
                <p className="font-semibold text-slate-800">{item.lokasi}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(item.selesaiPada).toLocaleDateString('id-ID')}
                  </span>
                  <span className="font-bold">{item.volume} KG</span>
                </div>
                {item.fotoBukti && (
                  <img src={item.fotoBukti} className="w-16 h-16 object-cover rounded-lg mt-2" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            Belum ada riwayat tugas
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="p-2 bg-white rounded-full disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="py-2">Halaman {page} dari {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
              className="p-2 bg-white rounded-full disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}