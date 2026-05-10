"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Trash2, Camera, Newspaper, Mail, Instagram, Facebook, ArrowRight, ChevronRight, ChevronLeft, MapPin, Phone, Clock, ShieldCheck, Leaf, Users, X, Images, ChevronDown } from 'lucide-react';

interface GalleryPhoto {
  id: number;
  imageUrl: string;
  caption?: string;
}

interface Album {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  isSlider?: boolean;
  photos?: GalleryPhoto[];
}

interface EducationPost {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  createdAt?: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [educations, setEducations] = useState<EducationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const albumsRes = await axios.get('http://localhost:5000/api/galleries/albums');
      setAlbums(albumsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const [postsRes, albumsRes] = await Promise.all([
  //       //   axios.get('http://localhost:5000/api/posts'),
  //         axios.get('http://localhost:5000/api/galleries/albums'),
  //       ]);
  //       // setPosts(postsRes.data.slice(0, 3));
  //       setAlbums(albumsRes.data);
  //     } catch (error) {
  //       console.error('Error fetching data:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  const sliderAlbums = albums.filter(a => a.isSlider && a.coverUrl);

  useEffect(() => {
    if (sliderAlbums.length <= 1) return;
    const interval = setInterval(() => {
      setSliderIndex(prev => (prev + 1) % sliderAlbums.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sliderAlbums.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxPhoto) setLightboxPhoto(null);
        else if (selectedAlbum) setSelectedAlbum(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxPhoto, selectedAlbum]);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.scrollWidth / albums.length;
      carouselRef.current.scrollBy({
        left: dir === 'left' ? -itemWidth : itemWidth,
        behavior: 'smooth'
      });
    }
  };

const AlbumCard = ({ album }: { album: Album }) => {
  const totalPhotos = album.photos?.length || 0;

  return (
    <div
      onClick={() => setSelectedAlbum(album)}
      className="group w-full h-[380px] cursor-pointer"
    >
      <div
        className="relative h-full rounded-3xl overflow-hidden shadow-xl
        transition-all duration-500 ease-in-out
        group-hover:scale-[1.03]
        group-hover:shadow-[0_0_60px_-15px_rgba(34,197,94,0.55)]"
      >
        {/* Background Image */}
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="absolute inset-0 w-full h-full object-cover
            transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
            <Images size={50} className="text-slate-400" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-6 text-white">

          <h3 className="text-2xl font-black leading-tight break-words">
            {album.title}
          </h3>

          <p className="text-sm text-white/70 mt-1">
            {totalPhotos} Foto tersedia
          </p>

          {/* Button */}
          <div
            className="mt-5 flex items-center justify-between px-4 py-3 rounded-xl
            bg-white/10 border border-white/20 backdrop-blur-md
            transition-all duration-300
            group-hover:bg-green-500/20 group-hover:border-green-400/40"
          >
            <span className="text-sm font-semibold">
              Lihat Album
            </span>

            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </div>  
        </div>
      </div>
    </div>
  );
};

  // ── HALAMAN DETAIL ALBUM ─────────────────────────────────────────
  if (selectedAlbum) {
    const photos = selectedAlbum.photos || [];
    return (
      <div className="min-h-screen bg-gray-50">

    {/* Header Sticky */}
  <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
    <div className="w-full px-4 md:px-8 lg:px-12 h-20 flex items-center justify-between">

    {/* Tombol Kembali */}
    <div className="flex-1 flex justify-start">
      <button
        onClick={() => setSelectedAlbum(null)}
        className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl
        bg-green-600 text-white border border-green-600
        hover:bg-green-700 hover:border-green-700
        active:scale-95 transition-all duration-300
        shadow-sm hover:shadow-md font-semibold"
      >
        <div
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center
          group-hover:-translate-x-1 transition-all duration-300"
        >
          <ChevronLeft size={16} />
        </div>

        <span className="text-sm">
          Kembali
        </span>
      </button>
    </div>

      {/* Judul */}
      <div className="flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-lg md:text-2xl font-black text-gray-900 leading-tight">
          {selectedAlbum.title}
        </h2>

        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{photos.length} foto tersedia</span>
        </div>
      </div>

      {/* Spacer kanan biar balance */}
      <div className="flex-1"></div>

    </div>
  </div>

      {/* Deskripsi Album */}
      {selectedAlbum.description && (
        <div className="w-full px-4 sm:px-6 md:px-8 pt-8 pb-4">
          
          {/* Container full */}
          <div className="w-full">
            
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
              
              {/* Judul */}
              <h2 className="text-xs font-bold text-green-600 tracking-widest uppercase mb-3">
                Deskripsi Kegiatan
              </h2>

              {/* Isi */}
              <p className="
                text-gray-700 
                text-sm md:text-base 
                leading-relaxed 
                text-justify
                whitespace-pre-line
              ">
                {selectedAlbum.description}
              </p>

            </div>
          </div>
        </div>
      )}

      {/* Konten foto */}
      <div className="w-full px-4 sm:px-6 md:px-8 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <Images size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Album ini belum memiliki foto</p>
          </div>
        ) : (
          <>

      {/* GRID FOTO*/}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setLightboxPhoto(photo.imageUrl)}
            className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-300"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={photo.imageUrl}
                alt={photo.caption || ""}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

              {/* Caption Hover */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-sm font-medium line-clamp-2">
                    {photo.caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>

        {/* Lightbox */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <button className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-10">
              <X size={24} />
            </button>
            <img
              src={lightboxPhoto}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // ── HALAMAN UTAMA ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white selection:bg-green-100 selection:text-green-900">

      {/* NAVBAR - TRANSPARAN */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
                alt="Logo Kabupaten Toba"
                className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className={`text-xs md:text-sm font-black uppercase tracking-tight transition-colors duration-300 ${isScrolled ? 'text-white' : 'text-white'}`}>Dinas Lingkungan Hidup</h1>
              <p className={`text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${isScrolled ? 'text-green-400' : 'text-green-200'}`}>Kabupaten Toba</p>
            </div>
          </div>
          <div className={`hidden lg:flex gap-8 font-semibold transition-colors duration-300 ${isScrolled ? 'text-white/90' : 'text-white/90'}`}>
            {['Tentang', 'Edukasi', 'Berita', 'Galeri', 'Visi', 'Kontak'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className={`transition-colors relative group ${isScrolled ? 'hover:text-green-400' : 'hover:text-green-300'}`}>
                {item}
                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full ${isScrolled ? 'bg-green-400' : 'bg-green-400'}`}></span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-white-600 hover:text-green-600 font-bold px-4">Login</Link>
            <Link href="/Warga" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95">Lapor!</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - FULL SCREEN */}
      <header className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image dengan overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/5424851/pexels-photo-5424851.jpeg?_gl=1*14j4d3a*_ga*Mjc4NDE2MTExLjE3Nzc0MjM3MTM.*_ga_8JE65Q40S6*czE3Nzc0MjkxNzkkbzIkZzEkdDE3Nzc0MzAzNjckajU5JGwwJGgw"
            className="w-full h-full object-cover"
            alt="Background Toba"
          />
          {/* Gradient overlay lebih halus */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20"></div>
        </div>

        {/* Konten Hero */}
        <div className="container mx-auto px-6 relative z-10 max-w-5xl">
          <div className="text-white text-center md:text-left">
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tighter">
              Menjaga <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-200">Kebersihan Toba</span>
            </h1>
            <p className="text-lg md:text-2xl font-medium opacity-95 mb-12 leading-relaxed max-w-3xl">
              Sinergi pemerintah dan masyarakat dalam mewujudkan lingkungan yang asri, bersih, dan berkelanjutan untuk generasi mendatang.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">

            </div>
          </div>
        </div>


      </header>

      {/* TENTANG SECTION - Better Spacing */}
      <section id="tentang" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute -bottom-8 right-12 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <div className="relative bg-white p-4 rounded-[2rem] shadow-2xl border border-slate-100">
                <img src="https://scontent.fkno2-1.fna.fbcdn.net/v/t39.30808-6/471619320_511556705274811_5925244636833078943_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=2a1932&_nc_ohc=QJT0gElktu8Q7kNvwG5LtsN&_nc_oc=AdpqeJ1bs5718PfItqk6IMQ1xIcdQ2Nl3R0Y2TffmrqkYn0NhBqWCE4Q5eVqKTNJFK4HO-BsVl1dY13gzEMo_0OJ&_nc_zt=23&_nc_ht=scontent.fkno2-1.fna&_nc_gid=7z5o3RCzkQxbCJhUKvCilA&_nc_ss=7b289&oh=00_Af0nEDxlGgkwZ8mGmDY2_6Xy_VH_TTgfOaJkpIyhdY4JhQ&oe=69F73CCF" className="rounded-[1.5rem] w-full h-[400px] object-cover" alt="Environmental" />
              </div>
            </div>
            <div>
              <span className="text-green-600 font-bold tracking-[0.2em] text-xs uppercase">Profil Lembaga</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-4 mb-8">Dinas Lingkungan Hidup <span className="text-green-600 underline decoration-green-200 underline-offset-8">Toba</span></h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Dinas Lingkungan Hidup Toba berkomitmen meningkatkan pembangunan ekonomi yang berkelanjutan berbasis potensi daerah dan mendukung kemandirian daerah.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600"><MapPin size={24} /></div>
                  <div><h4 className="font-bold text-slate-800">Cakupan Wilayah</h4><p className="text-sm text-slate-500">9 kecamatan di Kabupaten Toba</p></div>
                </div>
                <div className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><Clock size={24} /></div>
                  <div><h4 className="font-bold text-slate-800">Pelayanan 24/7</h4><p className="text-sm text-slate-500">Siaga pelaporan gangguan lingkungan</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISI MISI */}
      <section id="visi" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900">Arah Strategis Kami</h2>
            <div className="h-1.5 w-24 bg-green-500 mx-auto mt-4 rounded-full"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="group bg-slate-900 p-10 rounded-[2.5rem] text-white hover:shadow-2xl hover:shadow-green-900/20 transition-all duration-500">
              <span className="text-6xl font-black opacity-20 group-hover:opacity-40 transition-opacity italic">Visi</span>
              <p className="text-5xl font-medium leading-relaxed mt-5 italic text-green-50">
                <strong className="text-4xl font-bold">"Toba Mantap 2029"</strong>
              </p>
              <p className="text-2xl font-medium leading-relaxed mt-4 italic text-green-50"></p>
              <p className="text-2xl font-medium leading-relaxed mt-4 italic text-green-50">
                Maju Daerahnya Sejahtera Rakyatnya dan Berkelanjutan Pembangunannya
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl transition-all duration-500">
              <div className="relative mb-8">
                <span className="text-6xl font-black text-slate-900 relative z-10 italic">Misi</span>

                <h3 className="text-4xl font-extrabold text-slate-900 relative z-10 tracking-tight">
                  Langkah <span className="text-green-600">Nyata</span>
                </h3>
                <div className="w-20 h-1.5 bg-green-500 rounded-full mt-2"></div>
              </div>

              <div className="space-y-4">
                {["Membangun Sumber Daya Manusia yang berdaya saing dan berakhlak",
                  "Membangun Infrastruktur yang terintegrasi berkualitas dan merata",
                  "Meningkatkan pembangunan ekonomi yang berkelanjutan berbasis potensi daerah dan mendukung kemandirian daerah",
                  "Mewujudkan tata kelola pemerintahan yang baik dan bersih sebagai pelayan(parhobas) rakyat",
                  "Meningkatkan keamanan dan ketertiban",
                  "Melestarikan nilai budaya dan kearifan lokal"].map((misi, i) => (

                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <ChevronRight size={14} className="text-white" />
                      </div>
                      <p className="text-slate-700 font-semibold leading-snug group-hover:text-slate-900 transition-colors">
                        {misi}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDUKASI */}
      <section id="edukasi" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative flex items-center justify-center mb-12">
            <div className="text-center">
              <span className="text-green-600 font-bold tracking-widest text-sm">PEMBELAJARAN</span>
              <h2 className="text-4xl font-bold text-slate-800 mt-2">Edukasi <span className="text-green-600">Lingkungan</span></h2>
            </div>
            <Link
              href="/education" className="absolute right-0 flex items-center gap-2 px-6 py-3 bg-green-600
              hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-green-100 active:scale-95 group"
            >
              Lihat Semua Edukasi
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                  <div className="h-48 bg-slate-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-6 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="col-span-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
                <p className="text-yellow-800 font-semibold mb-2">Catatan: Edukasi tidak dapat dimuat</p>
                <p className="text-yellow-700 text-sm">{error}</p>
              </div>
            ) : educations.length > 0 ? (
              educations.map((education) => (
                <div key={education.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all">
                  <div className="h-48 bg-slate-200 overflow-hidden">
                    {education.mediaType === 'VIDEO' ? (
                      <video
                        src={education.mediaUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        controls
                      />
                    ) : (
                      <img
                        src={education.mediaUrl || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500"}
                        alt={education.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500';
                        }}
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-bold text-green-600 uppercase tracking-widest">
                      EDUKASI
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 mt-2 mb-3 line-clamp-2">
                      {education.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-3 mb-4">
                      {education.content}
                    </p>
                    <Link
                      href={`/education/${education.id}`}
                      className="flex items-center gap-2 text-green-600 font-bold text-sm hover:gap-3 transition-all"
                    >
                      Baca Selengkapnya
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-slate-500">
                Belum ada edukasi tersedia
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BERITA */}
      <section id="berita" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="relative flex items-center justify-center mb-12">
            <div className="text-center">
              <span className="text-green-600 font-bold tracking-widest text-sm">INFORMASI TERKINI</span>
              <h2 className="text-4xl font-bold text-slate-800 mt-2">Berita <span className="text-green-600">Terbaru</span></h2>
            </div>
            <Link
              href="/berita" className="absolute right-0 flex items-center gap-2 px-6 py-3 bg-green-600 
              hover:bg-green-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-green-100 active:scale-95 group">
              Lihat Semua Berita
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                  <div className="h-48 bg-slate-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-6 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="col-span-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
                <p className="text-yellow-800 font-semibold mb-2">Catatan: Berita tidak dapat dimuat</p>
                <p className="text-yellow-700 text-sm">{error}</p>
              </div>
            ) : posts.length > 0 ? (
              posts.map((post: any) => (
                <div key={post.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all">
                  <div className="h-48 bg-slate-200 overflow-hidden">
                    <img src={post.imageUrl || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=500"} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{post.category || 'BERITA'}</span>
                    <h3 className="text-xl font-bold text-slate-800 mt-2 mb-3 line-clamp-2">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-3 mb-4">{post.content}</p>
                    <Link href={`/berita/${post.slug || post.id}`} className="flex items-center gap-2 text-green-600 font-bold text-sm hover:gap-3 transition-all">
                      Baca Selengkapnya <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-slate-500">Belum ada berita</div>
            )}
          </div>
        </div>
      </section>

      {/* GALERI */}
      <section id="galeri" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-green-600 font-bold tracking-widest text-sm">DOKUMENTASI</span>
            <h2 className="text-4xl font-bold text-slate-800 mt-2">Galeri <span className="text-green-600">Kegiatan</span></h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
{[1, 2, 3, 4].map(i => (
  <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse"></div>
))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <X size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-900 mb-2">Gagal Memuat Galeri</h3>
              <p className="text-red-700 mb-6">{error}</p>
              <button
                onClick={() => fetchData()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                Coba Lagi
              </button>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Belum ada galeri tersedia</div>
          ) : albums.length <= 4 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {albums.map(album => <AlbumCard key={album.id} album={album} />)}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => scrollCarousel('left')}
                className="absolute left-0 top-1/2 -translate-y-6 -translate-x-5 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-green-50 transition-colors border border-slate-100"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>

              <div
                ref={carouselRef}
                className="grid grid-flow-col auto-cols-[calc(25%-18px)] gap-6 overflow-x-auto scroll-smooth pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {albums.map(album => (
                  <div key={album.id}>
                    <AlbumCard album={album} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => scrollCarousel('right')}
                className="absolute right-0 top-1/2 -translate-y-6 translate-x-5 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-green-50 transition-colors border border-slate-100"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SLIDER */}
      {
        !loading && sliderAlbums.length > 0 && (
          <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-slate-900">
            {sliderAlbums.map((album, index) => (
              <div key={album.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === sliderIndex ? 'opacity-100' : 'opacity-0'}`}>
                <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2">Dokumentasi Kegiatan</p>
                  <h3 className="text-3xl md:text-4xl font-black mb-2">{album.title}</h3>
                  {album.description && <p className="text-white/70 text-sm max-w-md">{album.description}</p>}
                  <button
                    onClick={() => setSelectedAlbum(album)}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                  >
                    <Images size={16} /> Lihat Foto ({album.photos?.length || 0})
                  </button>
                </div>
              </div>
            ))}
            {sliderAlbums.length > 1 && (
              <div className="absolute bottom-6 right-10 flex gap-2">
                {sliderAlbums.map((_, i) => (
                  <button key={i} onClick={() => setSliderIndex(i)} className={`h-2.5 rounded-full transition-all ${i === sliderIndex ? 'bg-green-400 w-6' : 'bg-white/50 w-2.5'}`} />
                ))}
              </div>
            )}
          </section>
        )
      }

      {/* FOOTER */}
      <footer id="kontak" className="bg-slate-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex-shrink-0 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Toba_Regency_%282020%29.svg"
                    alt="Logo Kabupaten Toba"
                    className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight block">DLH TOBA</span>
                  <span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">Kabupaten Toba</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dinas Lingkungan Hidup Kabupaten Toba berkomitmen untuk menjaga kelestarian alam dan kebersihan lingkungan demi masa depan Toba yang lebih bersih.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg mb-6 relative inline-block">
                Tautan Cepat
                <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"></span>
              </h3>
              <ul className="space-y-3">
                {['Tentang', 'Edukasi', 'Berita', 'Galeri', 'Visi'].map((item) => (
                  <li key={item}>
                    <Link href={`#${item.toLowerCase()}`} className="text-slate-400 hover:text-green-400 transition-colors text-sm flex items-center gap-2 group">
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg mb-6 relative inline-block">
                Sumber Daya
                <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"></span>
              </h3>
              <ul className="space-y-3">
                {[
                  { name: 'Perda Lingkungan', path: '/perda' },
                  { name: 'Jadwal Angkut', path: '/jadwal' },
                  { name: 'Laporan Tahunan', path: '/laporan' },
                  { name: 'Edukasi', path: '/education' }
                ].map((link) => (
                  <li key={link.name}>
                    <Link href={link.path} className="text-slate-400 hover:text-green-400 transition-colors text-sm flex items-center gap-2 group">
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <h3 className="font-bold text-white text-lg mb-6 relative inline-block">
                Hubungi Kami
                <span className="absolute -bottom-1.5 left-0 w-8 h-1 bg-green-500 rounded-full"></span>
              </h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Jl. Hutabulu Mejan No. 14, Sibola Hotangsas, Kec. Balige, Toba, Sumatera Utara</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-green-500 flex-shrink-0" />
                  <span>(0632) 123-4567</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-green-500 flex-shrink-0" />
                  <span>dislindup@tobakab.go.id</span>
                </li>
              </ul>

              <div className="flex gap-3 pt-2">
                {[
                  { Icon: Facebook, href: '#' },
                  { Icon: Instagram, href: '#' },
                  { Icon: Mail, href: 'mailto:dislindup@tobakab.go.id' }
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-green-600 hover:-translate-y-1 transition-all duration-300"
                  >
                    <social.Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>


          <div className="border-t border-slate-800 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
              <div className="text-slate-500 text-sm">
                <p>© 2026 <span className="text-slate-300 font-semibold">Dinas Lingkungan Hidup Kabupaten Toba</span>. Seluruh hak cipta dilindungi.</p>
              </div>
              <div className="flex gap-6 text-sm">
                <Link href="/privasi" className="text-slate-500 hover:text-green-400 transition-colors">Kebijakan Privasi</Link>
                <Link href="/syarat" className="text-slate-500 hover:text-green-400 transition-colors">Syarat & Ketentuan</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}