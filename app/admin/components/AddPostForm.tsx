"use client";
import { useState } from 'react';
import axios from 'axios';

export default function AddPostForm({ refreshData }: { refreshData: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'BERITA',
    imageUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pastikan ID Author diambil dari data login (misal id: 1)
      await axios.post('/api/auth/posts', {
        ...formData,
        authorId: 1 
      });
      alert("Berita Berhasil Ditambahkan!");
      setIsOpen(false);
      refreshData(); // Refresh list berita di dashboard
    } catch (err) {
      alert("Gagal menambah berita");
    }
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">
      + Tambah Berita
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Tambah Berita Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="Judul Berita" className="w-full p-3 border rounded-xl"
            onChange={(e) => setFormData({...formData, title: e.target.value})} required
          />
          <select 
            className="w-full p-3 border rounded-xl"
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            <option value="BERITA">Berita</option>
            <option value="PENGUMUMAN">Pengumuman</option>
            <option value="EDUKASI">Edukasi</option>
          </select>
          <textarea 
            placeholder="Isi Berita" className="w-full p-3 border rounded-xl h-32"
            onChange={(e) => setFormData({...formData, content: e.target.value})} required
          ></textarea>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Simpan</button>
            <button type="button" onClick={() => setIsOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}