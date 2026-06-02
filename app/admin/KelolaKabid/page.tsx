"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Search, UserPlus, Key, Mail, Phone, User, X, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Kabid {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function KelolaKabid() {
  const [kabidList, setKabidList] = useState<Kabid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingKabid, setEditingKabid] = useState<Kabid | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    phoneNumber: '',
    newPassword: '',
    isActive: true
  });

  // Fetch data
  const fetchKabid = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/admin/kabid`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setKabidList(res.data.data);
    } catch (error: any) {
      console.error('Error fetching kabid:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.error || 'Gagal mengambil data Kepala Bidang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKabid();
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Open modal for create
  const openCreateModal = () => {
    setEditingKabid(null);
    setFormData({
      email: '',
      fullName: '',
      password: '',
      phoneNumber: '',
      newPassword: '',
      isActive: true
    });
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (kabid: Kabid) => {
    setEditingKabid(kabid);
    setFormData({
      email: kabid.email,
      fullName: kabid.fullName,
      password: '',
      phoneNumber: kabid.phoneNumber || '',
      newPassword: '',
      isActive: kabid.isActive
    });
    setShowModal(true);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      if (editingKabid) {
        // UPDATE
        await axios.put(
          `${API_BASE_URL}/admin/kabid/${editingKabid.id}`,
          {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            isActive: formData.isActive,
            newPassword: formData.newPassword || undefined
          },
          config
        );
        toast.success('Data Kepala Bidang berhasil diperbarui!');
      } else {
        // CREATE
        await axios.post(
          `${API_BASE_URL}/admin/kabid`,
          {
            email: formData.email,
            fullName: formData.fullName,
            password: formData.password,
            phoneNumber: formData.phoneNumber
          },
          config
        );
        toast.success('Akun Kepala Bidang berhasil ditambahkan!');
      }

      setShowModal(false);
      fetchKabid();
      resetForm();
    } catch (error: any) {
      console.error('Error saving kabid:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data');
    }
  };

  // Handle delete (nonaktifkan)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Nonaktifkan akun ${name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/admin/kabid/${id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      toast.success('Akun Kepala Bidang dinonaktifkan!');
      fetchKabid();
    } catch (error: any) {
      console.error('Error deleting kabid:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Gagal menonaktifkan akun');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      password: '',
      phoneNumber: '',
      newPassword: '',
      isActive: true
    });
    setEditingKabid(null);
    setShowPassword(false);
  };

  // Filter berdasarkan search
  const filteredKabid = kabidList.filter(kabid =>
    kabid.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kabid.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (kabid.phoneNumber && kabid.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manajemen Kepala Bidang</h2>
            <p className="text-sm text-gray-500 mt-1">
              Kelola akun Kepala Bidang Kebersihan (memiliki akses monitoring & laporan)
            </p>
          </div>
          
          <button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
          >
            <UserPlus size={18} />
            <span>Tambah Kepala Bidang</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, email, atau telepon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredKabid.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? 'Tidak ada data yang cocok' : 'Belum ada data Kepala Bidang'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Lengkap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telepon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Daftar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredKabid.map((kabid, index) => (
                  <tr key={kabid.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <User size={16} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{kabid.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail size={14} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{kabid.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone size={14} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{kabid.phoneNumber || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        kabid.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {kabid.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(kabid.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(kabid)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(kabid.id, kabid.fullName)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                          title="Nonaktifkan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingKabid ? 'Edit Kepala Bidang' : 'Tambah Kepala Bidang Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingKabid}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="kabid@cleancity.com"
                />
              </div>

              {!editingKabid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingKabid}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                      placeholder="Minimal 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {editingKabid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru (Opsional)
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Isi jika ingin mengganti password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="08123456789"
                />
              </div>

              {editingKabid && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Aktif (akun bisa login)
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  {editingKabid ? 'Update Data' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}