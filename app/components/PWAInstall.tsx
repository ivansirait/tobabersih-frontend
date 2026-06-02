"use client";
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // ✅ PERBAIKAN: Unregister semua service worker lama untuk clear cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister();
          console.log('🗑️ Service worker lama dihapus');
        });
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('CleanCity berhasil dipasang! 🎉');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // ✅ PERBAIKAN: Hanya daftarkan SW di production
    // Di development next-pwa tidak generate sw.js, jadi skip agar tidak 404
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => console.log('✅ SW terdaftar:', reg))
        .catch((err) => console.error('❌ SW gagal:', err));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Terima kasih! Aplikasi sedang dipasang...');
    } else {
      toast.error('Instalasi dibatalkan');
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-green-200 p-4 animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Download className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Pasang CleanCity</h3>
              <p className="text-xs text-slate-500">Akses lebih cepat dari home screen</p>
            </div>
          </div>
          <button onClick={() => setShowPrompt(false)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200"
          >
            Nanti
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700"
          >
            Pasang Sekarang
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}