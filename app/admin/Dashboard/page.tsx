"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Dashboard from "../components/Dashboard";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const [laporanList, setLaporanList] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const [laporanRes, postsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/laporan", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/posts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setLaporanList(laporanRes.data.data || []);
      setPosts(postsRes.data.data || []);
      setError(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tampilan Loading dengan Skeleton Effect
  if (loading) {
    return (
      <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="h-8 w-32 md:w-48 bg-gray-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 md:h-32 bg-gray-100 animate-pulse rounded-lg md:rounded-xl" />
          ))}
        </div>
        <div className="h-48 md:h-64 bg-gray-50 animate-pulse rounded-lg md:rounded-xl" />
      </div>
    );
  }

  // Tampilan Error jika server mati atau token expired
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-3 md:p-4 text-center">
        <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-sm max-w-sm mx-auto w-full">
          <div className="text-red-500 text-4xl md:text-5xl mb-3 md:mb-4">⚠️</div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">Gagal Memuat Data</h2>
          <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Pastikan koneksi internet stabil atau coba login kembali.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 md:mt-6 px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#F9FAFB]"
    >
      <Dashboard laporanList={laporanList} posts={posts} />
    </motion.div>
  );
}