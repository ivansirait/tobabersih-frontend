"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import ManagePosts from "../components/ManagePosts";

export default function BeritaPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true); // 🔥 penting biar UI sync

    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // amanin struktur data
      const safeData = Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setPosts(safeData);
    } catch (error) {
      console.error("Gagal mengambil data berita:", error);
      setPosts([]); // fallback biar gak undefined
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  return <ManagePosts posts={posts} onPostsUpdate={fetchPosts} />;
}