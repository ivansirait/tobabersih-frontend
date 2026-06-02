"use client";
import { useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import axios from 'axios';
import { 
  Edit, Trash2, Plus, Search, Megaphone, Newspaper, 
  Upload, Image as ImageIcon, X, FilePlus, Eye, 
  CheckCircle, AlertCircle, AlertTriangle,
  Calendar, User, Hash, Loader2, TrendingUp, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AlertDialog from './AlertDialog';
import ConfirmDialog from './ConfirmDialog';

interface ManagePostsProps {
  posts?: any[];
  onPostsUpdate?: () => void;
}

type TabType = 'SEMUA' | 'BERITA' | 'PENGUMUMAN';

const INITIAL_FORM = {
  title: '',
  content: '',
  category: 'BERITA',
  imageUrl: '',
  imageFile: null as File | null,
  author_id: 1,
};

// Gunakan proxy Next.js - panggil /api/* dari frontend
const BASE_URL = '';

export default function ManagePosts({ posts = [], onPostsUpdate }: ManagePostsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingPost, setViewingPost] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successDescription, setSuccessDescription] = useState('');
  const [successIcon, setSuccessIcon] = useState<ReactNode>(<CheckCircle size={24} />);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string>('');
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false, message: '', type: 'success'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('SEMUA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [postList, setPostList] = useState<any[]>(posts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/posts`);
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

  // --- LOGIKA STATISTIK ---
  const stats = useMemo(() => ({
    total: postList.length,
    berita: postList.filter(p => p.category === 'BERITA').length,
    pengumuman: postList.filter(p => p.category === 'PENGUMUMAN').length,
  }), [postList]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) setError('Anda belum login. Silakan refresh halaman.');
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };



  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const openDetailModal = (post: any) => {
    setViewingPost(post);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (id: number, title: string) => {
    setPendingDeleteId(id);
    setPendingDeleteTitle(title);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteId === null) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
      showNotification('Token tidak ditemukan. Silakan login ulang.', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.delete(`${BASE_URL}/api/posts/${pendingDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Gagal menghapus berita');
      }

      setSuccessTitle('Berita berhasil dihapus');
      setSuccessDescription('Berita telah dihapus secara permanen dari sistem.');
      setSuccessIcon(<Trash2 size={24} />);
      setShowSuccessDialog(true);
      if (onPostsUpdate) onPostsUpdate();
      setShowDetailModal(false);
      await refreshPosts();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Gagal menghapus berita';
      showNotification(message, 'error');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setPendingDeleteId(null);
      setPendingDeleteTitle('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
      showNotification('Token tidak ditemukan. Silakan login ulang.', 'error');
      setLoading(false);
      return;
    }

    // Upload file jika ada
    let imageUrl = formData.imageUrl;
    if (formData.imageFile) {
      try {
        const uploadForm = new FormData();
        uploadForm.append('image', formData.imageFile);

        const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, uploadForm, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        imageUrl = uploadResponse.data?.imageUrl || imageUrl;
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        const uploadMessage = uploadError.response?.data?.message || 'Gagal upload gambar';
        showNotification(uploadMessage, 'error');
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
      showNotification('Judul dan konten wajib diisi', 'error');
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

      if (editingPost) {
        setSuccessTitle('Berita berhasil diperbarui');
        setSuccessDescription('Perubahan berita telah disimpan ke sistem.');
        setSuccessIcon(<Edit3 size={24} />);
      } else {
        setSuccessTitle('Berita berhasil ditambahkan');
        setSuccessDescription('Berita baru telah ditambahkan ke sistem.');
        setSuccessIcon(<CheckCircle size={24} />);
      }
      setShowSuccessDialog(true);
      setShowModal(false);
      setFormData(INITIAL_FORM);
      setImagePreview('');
      setEditingPost(null);
      await refreshPosts();
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Gagal menyimpan data';
      showNotification(errorMessage, 'error');
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 text-black relative">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-white border border-gray-100"
          >
            {toast.type === 'success' ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div className="bg-gradient-to-r from-[#DDE9E1] to-[#E8F1EB] rounded-[32px] p-8 shadow-sm border border-white/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="bg-white/60 text-[#4A6D55] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block mb-3">
              Konten & Publikasi
            </span>
            <h1 className="text-3xl font-black text-[#1A2E35] tracking-tight uppercase">Manajemen Berita</h1>
            <p className="text-[#5B7078] mt-2 font-medium">Kelola informasi, pengumuman, dan berita portal utama.</p>
          </div>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Post', val: stats.total, icon: Newspaper, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Berita Aktif', val: stats.berita, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pengumuman', val: stats.pengumuman, icon: Megaphone, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-3xl font-black text-gray-900">{s.val}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shadow-inner`}>
              <s.icon size={28} />
            </div>
          </div>
        ))}
      </div>

<div className="flex justify-end w-full">
  <button 
    onClick={() => openModal()}
    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#4A6D55] text-white font-bold shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2"
  >
    <Plus size={20} strokeWidth={3} /> Tambah Konten
  </button>
</div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="bg-white rounded-[24px] shadow-sm p-4 border border-gray-50 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl w-fit">
          {(['SEMUA', 'BERITA', 'PENGUMUMAN'] as TabType[]).map(tab => (
            <button
              key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-[#4A6D55] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Cari judul atau konten..." value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 outline-none text-sm font-medium" 
          />
        </div>
      </div>

      {/* --- CONTENT LIST --- */}
      <AnimatePresence mode="wait">
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={post.id}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div
                className="relative w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer shrink-0"
                style={{ paddingBottom: '56.25%' }}
                onClick={() => openDetailModal(post)}
              >
                <img
                  src={resolveImageUrl(post.imageUrl || post.image_url)}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                  alt={post.title}
                />
                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1 font-semibold">
                  {post.category}
                </div>
              </div>

              <div className="p-4 flex-1 cursor-pointer" onClick={() => openDetailModal(post)}>
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-2">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(post.createdAt || Date.now()).toLocaleDateString('id-ID')}</span>
                  <span className="flex items-center gap-1"><User size={12} /> Admin</span>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-1 mb-0.5">
                  {post.title}
                </h3>
                {post.content && <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{post.content}</p>}
              </div>

              <div className="border-t border-gray-100 flex shrink-0">
                <button onClick={() => openDetailModal(post)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-[#0B4D33] hover:bg-green-50 transition-colors font-semibold">
                  <Eye size={14} /> Detail
                </button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => openModal(post)} className="px-4 flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors">
                  <Edit size={15} />
                </button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => handleDeleteClick(post.id, post.title)} className="px-4 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-white/20">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#4A6D55] flex items-center justify-center text-white">
                    <FilePlus size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase">{editingPost ? 'Edit Postingan' : 'Postingan Baru'}</h3>
                    <p className="text-xs font-bold text-gray-400">Pastikan informasi yang diinput sudah sesuai.</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Judul Konten</label>
                      <input name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Kategori</label>
                      <select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold">
                        <option value="BERITA">BERITA</option>
                        <option value="PENGUMUMAN">PENGUMUMAN</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Unggah Gambar</label>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-sm font-bold text-gray-600 hover:border-green-300 hover:bg-green-50 transition-all"
                      >
                        Pilih file gambar (JPG/PNG, max 5MB)
                      </button>
                      {formData.imageFile && (
                        <p className="text-xs text-gray-500">Dipilih: {formData.imageFile.name}</p>
                      )}
                      {!formData.imageFile && formData.imageUrl && (
                        <p className="text-xs text-gray-500">Gambar saat ini akan disimpan jika tidak diganti.</p>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setFormData(prev => ({ ...prev, imageFile: file }));
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Isi Konten Berita</label>
                    <textarea name="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={5} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-[24px] text-sm leading-relaxed focus:bg-white transition-all" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-50">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Batal</button>
                  <button type="submit" disabled={loading} className="flex-[2] py-4 bg-[#4A6D55] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#3a5643] transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : 'Simpan & Publikasikan'}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden my-auto border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#4A6D55] flex items-center justify-center text-white">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase">Detail Postingan</h3>
                    <p className="text-xs font-bold text-gray-400">Informasi lengkap konten berita.</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(viewingPost.createdAt || Date.now()).toLocaleDateString('id-ID')}</span>
                  <span className="flex items-center gap-1"><User size={12}/> Admin</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${viewingPost.category === 'BERITA' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {viewingPost.category}
                  </span>
                </div>

                <h1 className="text-3xl font-black text-gray-900 leading-tight">{viewingPost.title}</h1>

                {viewingPost.imageUrl && (
                  <div className="w-full h-64 rounded-[24px] overflow-hidden bg-gray-100">
                    <img 
                      src={resolveImageUrl(viewingPost.imageUrl)} 
                      className="w-full h-full object-cover"
                      alt={viewingPost.title}
                    />
                  </div>
                )}

                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingPost.content}</div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-50">
                  <button onClick={() => { setShowDetailModal(false); openModal(viewingPost); }} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                    <Edit size={16} /> Edit
                  </button>
                  <button onClick={() => { setShowDetailModal(false); handleDeleteClick(viewingPost.id, viewingPost.title); }} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dialog Components */}
      <ConfirmDialog
        open={showConfirmDialog}
        title={`Hapus "${pendingDeleteTitle}"?`}
        description="Berita akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingDeleteId(null);
          setPendingDeleteTitle('');
        }}
      />

      <AlertDialog
        open={showSuccessDialog}
        title={successTitle}
        description={successDescription}
        buttonText="Lanjut"
        icon={successIcon}
        onClose={() => {
          setShowSuccessDialog(false);
          setSuccessTitle('');
          setSuccessDescription('');
          setSuccessIcon(<CheckCircle size={24} />);
        }}
      />
    </div>
  );
}