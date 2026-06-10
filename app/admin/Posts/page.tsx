  "use client";
  import { useState, useEffect } from 'react';
  import axios from 'axios';
  import { Edit, Trash2, Plus, Search, Calendar, User } from 'lucide-react';
  import toast, { Toaster } from 'react-hot-toast';
  import { useConfirm } from '../../components/ConfirmProvider';

  export const dynamic = 'force-dynamic';

  interface ManagePostsProps {
    posts?: any[];
    onPostsUpdate: () => void;
  }

  export default function ManagePosts({ posts = [], onPostsUpdate }: ManagePostsProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState<any>(null);
    const confirm = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
      title: '',
      slug: '',
      content: '',
      category: 'BERITA',
      imageUrl: '',
      author_id: 1
    });

    // Cek token saat komponen dimuat
    useEffect(() => {
      const token = localStorage.getItem('token');
      console.log('Token di ManagePosts:', token ? 'Ada' : 'Tidak ada');
      if (!token) {
        setError('Anda belum login. Silakan refresh halaman atau login ulang.');
      }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
      setError(null);
    };

    const generateSlug = (title: string) => {
      return title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);
    };

    const openModal = (post: any = null) => {
      // Cek token sebelum membuka modal
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sesi Anda telah berakhir. Silakan login ulang.');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
        return;
      }

      if (post) {
        setEditingPost(post);
        setFormData({
          title: post.title || '',
          slug: post.slug || '',
          content: post.content || '',
          category: post.category || 'BERITA',
          imageUrl: post.imageUrl || '',
          author_id: post.authorId || 1
        });
      } else {
        setEditingPost(null);
        setFormData({
          title: '',
          slug: '',
          content: '',
          category: 'BERITA',
          imageUrl: '',
          author_id: 1
        });
      }
      setError(null);
      setShowModal(true);
    };

    const validateForm = () => {
      if (!formData.title.trim()) {
        setError('Judul tidak boleh kosong');
        return false;
      }
      if (!formData.content.trim()) {
        setError('Konten tidak boleh kosong');
        return false;
      }
      return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) return;
      
      // Cek token lagi sebelum submit
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sesi Anda telah berakhir. Silakan login ulang.');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
        return;
      }

      setLoading(true);
      setError(null);

      // Generate slug from title if not provided
      const generatedSlug = formData.slug || generateSlug(formData.title);
      
      const dataToSend = {
        title: formData.title.trim(),
        slug: generatedSlug,
        content: formData.content.trim(),
        category: formData.category,
        imageUrl: formData.imageUrl || null,
        author_id: formData.author_id
      };

      console.log('Mengirim data dengan token:', token.substring(0, 20) + '...');
      console.log('Data yang dikirim:', dataToSend);

      try {
        const config = {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        let response;
        if (editingPost) {
          response = await axios.put(
            `/api/posts/${editingPost.id}`, 
            dataToSend, 
            config
          );
          console.log('Update response:', response.data);
          toast.success('Berita berhasil diperbarui!');
        } else {
          response = await axios.post(
            '/api/posts', 
            dataToSend, 
            config
          );
          console.log('Create response:', response.data);
          toast.success('Berita berhasil ditambahkan!');
        }
        
        setShowModal(false);
        onPostsUpdate();
        
      } catch (error: any) {
        console.error('Error saving post:', error);
        
        if (error.response?.status === 401) {
          setError('Sesi Anda telah berakhir. Silakan login ulang.');
          // Hapus token yang tidak valid
          localStorage.removeItem('token');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 2000);
        } else if (error.response?.status === 403) {
          setError('Anda tidak memiliki izin untuk melakukan ini.');
        } else if (error.response) {
          setError(`Gagal menyimpan: ${error.response.data?.message || error.response.statusText}`);
        } else if (error.request) {
          setError('Tidak ada response dari server. Periksa koneksi Anda.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    const handleDelete = async (id: number) => {
      const ok = await confirm({
        title: 'Hapus Berita?',
        description: 'Aksi ini akan menghapus berita secara permanen dari sistem.',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      });
      if (!ok) return;

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sesi Anda telah berakhir. Silakan login ulang.');
        return;
      }

      try {
        await axios.delete(`/api/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Berita berhasil dihapus!');
        onPostsUpdate();
      } catch (error: any) {
        console.error('Error deleting post:', error);
        if (error.response?.status === 401) {
          setError('Sesi Anda telah berakhir. Silakan login ulang.');
          localStorage.removeItem('token');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 2000);
        } else {
          toast.error(error.response?.data?.message || 'Gagal menghapus berita');
        }
      }
    };

    const filteredPosts = posts.filter(post => 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Tampilkan pesan error jika token tidak ada
    if (error && error.includes('belum login')) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Login Ulang
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Toaster position="top-right" />
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Kelola Berita Homepage</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari berita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            {/* Add Button */}
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Tambah Berita</span>
            </button>
          </div>

        {/* Delete confirmation handled by ConfirmProvider */}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Belum ada berita. Silakan tambah berita baru.
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredPosts.map((post: any) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image */}
                  {post.imageUrl && (
                    <div className="md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {post.author?.fullName || 'Admin'}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {post.category}
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{post.content}</p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(post)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form - Sama seperti sebelumnya */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            {/* ... konten modal tetap sama ... */}
          </div>
        )}
      </div>
    );
  }