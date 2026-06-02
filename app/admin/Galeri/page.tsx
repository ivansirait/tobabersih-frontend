"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import ManageGalleries from '../components/ManageGalleries';

interface GalleryPhoto {
  id: number;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

interface Album {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  photos?: GalleryPhoto[];
  createdAt: string;
}

export default function GaleriPage() {
  const [galleries, setGalleries] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await axios.get('/api/galleries/albums', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Normalize: response bisa { data: [...] } atau langsung array
      const data = res.data?.data ?? res.data;
      setGalleries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Gagal memuat galeri:', error);
      setGalleries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Memuat galeri...</p>
        </div>
      </div>
    );
  }

  return (
    <ManageGalleries
      galleries={galleries}
      onGalleriesUpdate={fetchGalleries}
    />
  );
}