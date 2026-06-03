"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  Edit, Trash2, Plus, Search, Megaphone, Newspaper, 
  X, Eye, Grid3X3, List, Calendar, User, Loader2, 
  TrendingUp, Image as ImageIcon, FileQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

interface ManagePostsProps {
  posts?: any[];
  onPostsUpdate?: () => void;
}

type TabType = 'SEMUA' | 'BERITA' | 'PENGUMUMAN';
type ViewMode = 'GRID' | 'LIST';

const INITIAL_FORM = {
  title: '',
  content: '',
  category: 'BERITA',
  imageUrl: '',
  imageFile: null as File | null,
  author_id: 1,
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ManagePosts({ posts = [], onPostsUpdate }: ManagePostsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingPost, setViewingPost] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null}>({ show: false, id: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('SEMUA');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [postList, setPostList] = useState<any[]>(posts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/posts`);
      const postsData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      setPostList(postsData);
    } catch (err: any) {
      console.error('Gagal memuat posts:', err);
      setPostList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!posts.length) {
      fetchPosts();
    } else {
      setPostList(posts);
    }
  }, [posts]);

  const refreshPosts = async () => {
    await fetchPosts();
    if (onPostsUpdate) {
      try {
        onPostsUpdate();
      } catch (err) {
        console.warn('onPostsUpdate error:', err);
      }
    }
  };

  const stats = useMemo(() => ({
    total: postList.length,
    berita: postList.filter(p => p.category === 'BERITA').length,
    pengumuman: postList.filter(p => p.category === 'PENGUMUMAN').length,
  }), [postList]);

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const openDetailModal = (post: any) => {
    setViewingPost(post);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteModal({ show: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.id === null) return;
    setLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error('Token tidak ditemukan. Silakan login ulang.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.delete(`${BASE_URL}/api/posts/${deleteModal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Gagal menghapus berita');
      }

      toast.success('Berita berhasil dihapus!');
      if (onPostsUpdate) onPostsUpdate();
      fetchPosts();
      setDeleteModal({ show: false, id: null });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus berita');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error('Token tidak ditemukan. Silakan login ulang.');
      setLoading(false);
      return;
    }

    let imageUrl = formData.imageUrl;
    if (formData.imageFile) {
      try {
        const uploadForm = new FormData();
        uploadForm.append('image', formData.imageFile);
        const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, uploadForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        imageUrl = uploadResponse.data?.imageUrl || imageUrl;
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        toast.error(uploadError.response?.data?.message || 'Gagal upload gambar');
        setLoading(false);
        return;
      }
    }

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      imageUrl: imageUrl || null,
      author_id: formData.author_id,
    };

    if (!payload.title || !payload.content) {
      toast.error('Judul dan konten wajib diisi');
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = editingPost
        ? await axios.put(`${BASE_URL}/api/posts/${editingPost.id}`, payload, config)
        : await axios.post(`${BASE_URL}/api/posts`, payload, config);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Gagal menyimpan data');
      }

      toast.success(editingPost ? 'Berita berhasil diperbarui!' : 'Berita berhasil ditambahkan!');
      setShowModal(false);
      setFormData(INITIAL_FORM);
      setImagePreview('');
      setEditingPost(null);
      await refreshPosts();
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (post: any = null) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title || '',
        content: post.content || '',
        category: post.category || 'BERITA',
        imageUrl: post.imageUrl || post.image_url || '',
        imageFile: null,
        author_id: Number(post.authorId || post.author_id || 1),
      });
      setImagePreview(resolveImageUrl(post.imageUrl || post.image_url || ''));
    } else {
      setEditingPost(null);
      setFormData(INITIAL_FORM);
      setImagePreview('');
    }
    setShowModal(true);
  };

  const filteredPosts = postList.filter(post => {
    const matchesTab = activeTab === 'SEMUA' || post.category === activeTab;
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    if (category === 'BERITA') {
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    }
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 text-[#1A2E35] font-sans">
      <Toaster position="top-right" />

      {/* --- HEADER --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-3xl p-8 shadow-sm border border-white/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/80 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-4 shadow-sm backdrop-blur-sm">
              Konten & Publikasi
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A2E35] tracking-tight">Manajemen Berita</h1>
            <p className="text-[#5B7078] mt-2 text-sm md:text-base font-medium max-w-xl">
              Kelola pusat informasi, berita terbaru, dan pengumuman penting untuk portal utama Anda dengan mudah.
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Newspaper size={200} />
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Postingan', val: stats.total, icon: Newspaper, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Berita Aktif', val: stats.berita, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Pengumuman', val: stats.pengumuman, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((s, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${s.border} flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- SEARCH, FILTER & ACTION BAR --- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center sticky top-4 z-40">
        <div className="flex-1 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Cari judul atau isi konten..." value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder-gray-400" 
            />
          </div>
        </div>

        <div className="h-px bg-gray-100 lg:h-8 lg:w-px mx-2"></div>

        <div className="flex flex-col sm:flex-row items-center gap-3 px-2 pb-2 lg:pb-0">
          <div className="flex w-full sm:w-auto bg-gray-50 p-1 rounded-xl">
            {(['SEMUA', 'BERITA', 'PENGUMUMAN'] as TabType[]).map(tab => (
              <button
                key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex bg-gray-50 p-1 rounded-xl">
            <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}><Grid3X3 size={18}/></button>
            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}><List size={18}/></button>
          </div>

          <button 
            onClick={() => openModal()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A6D55] text-white text-sm font-bold shadow-md hover:bg-[#3a5643] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Tambah Baru
          </button>
        </div>
      </div>

      {/* --- CONTENT LIST --- */}
      <AnimatePresence mode="wait">
        <motion.div 
          layout 
          className={viewMode === 'GRID' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-3.5"}
        >
          {filteredPosts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="col-span-full py-20 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-300">
                <FileQuestion size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Tidak ada data ditemukan</h3>
              <p className="text-gray-500 text-sm max-w-sm">Mungkin kata kunci pencarian salah, atau belum ada konten yang dipublikasikan pada kategori ini.</p>
            </motion.div>
          ) : filteredPosts.map((post) => {
            const badgeStyle = getCategoryBadge(post.category);
            return (
              <motion.div
                layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                key={post.id}
                className={`bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 group ${
                  viewMode === 'LIST' ? 'flex flex-col sm:flex-row p-3 gap-4 rounded-2xl items-center' : 'flex flex-col rounded-3xl'
                }`}
              >
                {/* --- BAGIAN GAMBAR --- */}
                <div className={`relative overflow-hidden bg-gray-100 shrink-0 ${
                  viewMode === 'GRID' ? 'aspect-video w-full' : 'aspect-video w-full sm:w-48 rounded-xl'
                }`}>
                  <img 
                    src={resolveImageUrl(post.imageUrl || post.image_url)} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=No+Image'; }}
                    alt={post.title}
                  />
                  <div className={`absolute left-2.5 z-10 ${viewMode === 'GRID' ? 'top-3' : 'top-2.5'}`}>
                    <span className={`inline-flex items-center rounded-md font-bold bg-white/95 backdrop-blur-sm shadow-sm uppercase tracking-wide border ${
                      viewMode === 'GRID' ? 'px-3 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]'
                    } ${badgeStyle.text} ${badgeStyle.border}`}>
                      {post.category}
                    </span>
                  </div>
                  {viewMode === 'GRID' && <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>}
                </div>

                {/* --- BAGIAN KONTEN --- */}
                <div className={`flex-1 flex flex-col min-w-0 w-full ${viewMode === 'GRID' ? 'p-6' : 'py-1 pr-2'}`}>
                  
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider ${
                    viewMode === 'GRID' ? 'mb-3' : 'mb-1.5'
                  }`}>
                    <span className="flex items-center gap-1"><Calendar size={13} className="text-gray-300"/> {new Date(post.createdAt || Date.now()).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                    <span className="flex items-center gap-1"><User size={13} className="text-gray-300"/> Admin</span>
                  </div>
                  
                  <h3 className={`font-extrabold text-gray-900 leading-snug group-hover:text-[#4A6D55] transition-colors ${
                    viewMode === 'GRID' ? 'text-lg mb-2 line-clamp-2' : 'text-base mb-1.5 line-clamp-1 sm:line-clamp-2'
                  }`}>
                    {post.title}
                  </h3>
                  
                  <p className={`text-gray-500 leading-relaxed ${
                    viewMode === 'GRID' ? 'text-sm line-clamp-2 mb-6' : 'text-[13px] line-clamp-2 mb-3'
                  }`}>
                    {post.content}
                  </p>

                  {/* --- BAGIAN TOMBOL AKSI --- */}
                  <div className={`mt-auto flex items-center gap-2 ${
                    viewMode === 'LIST' ? 'justify-start sm:justify-end border-none pt-0' : 'justify-between pt-4 border-t border-gray-50'
                  }`}>
                    <button 
                      onClick={() => openDetailModal(post)} 
                      className={`text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold transition-colors flex items-center justify-center gap-2 ${
                        viewMode === 'GRID' ? 'py-2 px-4 rounded-xl text-xs flex-1' : 'py-1.5 px-3 rounded-lg text-[11px]'
                      }`}
                    >
                      <Eye size={14}/> {viewMode === 'GRID' ? 'Buka Detail' : 'Detail'}
                    </button>
                    
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => openModal(post)} 
                        title="Edit Konten"
                        className={`text-gray-500 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors ${
                          viewMode === 'GRID' ? 'p-2.5 rounded-xl' : 'p-1.5 rounded-lg'
                        }`}
                      >
                        <Edit size={14}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(post.id)} 
                        title="Hapus Konten"
                        className={`text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors ${
                          viewMode === 'GRID' ? 'p-2.5 rounded-xl' : 'p-1.5 rounded-lg'
                        }`}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-extrabold text-xl text-gray-900">{editingPost ? 'Edit Publikasi' : 'Buat Publikasi Baru'}</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Lengkapi form di bawah untuk menayangkan konten.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Judul Publikasi</label>
                    <input name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 shadow-sm" placeholder="Tuliskan judul yang menarik..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Kategori Konten</label>
                    <div className="relative">
                      <select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-bold text-gray-700 shadow-sm appearance-none cursor-pointer">
                        <option value="BERITA">BERITA PORTAL</option>
                        <option value="PENGUMUMAN">PENGUMUMAN RESMI</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Visual Utama (Opsional)</label>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-5 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-3"
                    >
                      <ImageIcon size={20} /> Pilih Foto Unggulan (Max 5MB)
                    </button>
                    {formData.imageFile && <div className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg inline-block border border-blue-100">File siap diunggah: {formData.imageFile.name}</div>}
                    {!formData.imageFile && imagePreview && <p className="text-xs text-gray-500 italic">Gambar sebelumnya akan dipertahankan jika tidak diganti.</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setFormData(prev => ({ ...prev, imageFile: file }));
                      if (file) { const reader = new FileReader(); reader.onload = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Isi Konten</label>
                  <textarea name="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={7} placeholder="Jabarkan detail informasi di sini..." className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm leading-relaxed outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 resize-none shadow-sm" />
                </div>

                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl text-gray-600 bg-gray-100 font-bold hover:bg-gray-200 transition-all">Batalkan</button>
                  <button type="submit" disabled={loading} className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#3a5643] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan & Publikasikan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DETAIL MODAL --- */}
      <AnimatePresence>
        {showDetailModal && viewingPost && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-extrabold text-xl text-gray-900">Preview Publikasi</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Pratinjau tampilan konten untuk pembaca.</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border shadow-sm ${getCategoryBadge(viewingPost.category).bg} ${getCategoryBadge(viewingPost.category).text} ${getCategoryBadge(viewingPost.category).border}`}>
                    {viewingPost.category}
                  </span>
                  <span className="flex items-center gap-1.5"><Calendar size={15}/> {new Date(viewingPost.createdAt || Date.now()).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{viewingPost.title}</h1>

                {viewingPost.imageUrl && (
                  <div className="w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm aspect-video">
                    <img 
                      src={resolveImageUrl(viewingPost.imageUrl)} 
                      className="w-full h-full object-cover"
                      alt={viewingPost.title}
                    />
                  </div>
                )}

                <div className="text-gray-700 leading-loose text-base md:text-lg whitespace-pre-wrap font-medium">
                  {viewingPost.content}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t flex gap-4">
                <button onClick={() => { setShowDetailModal(false); openModal(viewingPost); }} className="flex-1 py-3.5 bg-white border-2 border-yellow-400 text-yellow-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-50 transition-all">
                  <Edit size={18} /> Edit Konten
                </button>
                <button onClick={() => { setShowDetailModal(false); handleDeleteClick(viewingPost.id); }} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 shadow-md hover:shadow-lg transition-all">
                  <Trash2 size={18} /> Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {deleteModal.show && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-5 border-8 border-red-50/50">
                  <Trash2 size={36} strokeWidth={2.5} />
                </div>
                <h3 className="font-black text-2xl text-gray-900 mb-2">Hapus Konten?</h3>
                <p className="text-gray-500 leading-relaxed font-medium mb-8">
                  Konten ini akan dihapus secara permanen dan tidak dapat dikembalikan dari sistem.
                </p>
                <div className="flex w-full gap-3">
                  <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Batal</button>
                  <button onClick={handleDeleteConfirm} disabled={loading} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}