"use client";

import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Truck, 
  Clock, 
  Package, 
  CheckCircle2, 
  FileText // <--- Tambahkan ini
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PenugasanDetailProps = {
  penugasan: any;
  onClose: () => void;
};

export default function PenugasanDetail({ penugasan, onClose }: PenugasanDetailProps) {
  // Config warna status yang lebih modern
  const getStatusStyle = (status: string) => {
    const styles: any = {
      SELESAI: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      DITUGASKAN: 'bg-blue-100 text-blue-700 border-blue-200',
      BEKERJA: 'bg-amber-100 text-amber-700 border-amber-200',
      LAPORAN_BARU: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white sm:rounded-[32px] w-full max-w-2xl max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white"
      >
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-[#1A2E35] tracking-tight uppercase">
              Detail Penugasan
            </h3>
            <p className="text-xs font-bold text-blue-600 mt-0.5 tracking-widest">
              #{penugasan.taskNumber || "ADUAN-BARU"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 active:backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 overflow-y-auto space-y-8">
          
          {/* Status Badge Row */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Saat Ini</span>
            <span className={`px-4 py-1.5 text-xs font-black rounded-full border shadow-sm ${getStatusStyle(penugasan.status)}`}>
              {penugasan.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Info Utama Card */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 leading-tight">{penugasan.location}</p>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mt-1">Kecamatan {penugasan.district || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  {penugasan.scheduledAt ? new Date(penugasan.scheduledAt).toLocaleString('id-ID', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  }) : '-'}
                </p>
                <div className="flex items-center gap-1.5 text-gray-400 mt-0.5">
                  <Clock size={14} />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {penugasan.scheduledAt ? new Date(penugasan.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supir & Truk Grid - Rombak Total agar lebih modern */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><User size={18} /></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personel / Supir</span>
              </div>
              <p className="text-lg font-black text-gray-900">{penugasan.driver?.fullName || "Belum Ditentukan"}</p>
              <p className="text-sm font-bold text-green-600 mt-1">{penugasan.driver?.phoneNumber || "-"}</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Truck size={18} /></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Armada</span>
              </div>
              <p className="text-lg font-black text-gray-900">{penugasan.truck?.plateNumber || "N/A"}</p>
              <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest">Unit Operasional</p>
            </div>
          </div>

          {/* Deskripsi */}
          {penugasan.description && (
            <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-gray-400" />
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Laporan</h4>
              </div>
              <p className="text-gray-700 font-medium leading-relaxed italic">
                "{penugasan.description}"
              </p>
            </div>
          )}

          {/* Volume Card */}
          {penugasan.volumeKg && (
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[24px] text-white shadow-lg shadow-emerald-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Volume Sampah Terangkut</p>
                  <p className="text-4xl font-black mt-1">{penugasan.volumeKg} <span className="text-xl opacity-80">KG</span></p>
                </div>
                <Package size={48} className="opacity-20" />
              </div>
            </div>
          )}

          {/* Timeline - Dibuat lebih Clean */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Log Aktivitas</h4>
            <div className="space-y-3">
              <TimelineItem label="Penugasan Dibuat" time={penugasan.createdAt} />
              {penugasan.startedAt && <TimelineItem label="Pekerjaan Dimulai" time={penugasan.startedAt} isDone />}
              {penugasan.completedAt && <TimelineItem label="Selesai / Rampung" time={penugasan.completedAt} isDone />}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Sub-komponen Timeline agar kode bersih
function TimelineItem({ label, time, isDone }: { label: string, time: any, isDone?: boolean }) {
  return (
    <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={14} className={isDone ? "text-emerald-500" : "text-gray-300"} />
        <span className="text-xs font-bold text-gray-600">{label}</span>
      </div>
      <span className="text-xs font-black text-gray-900">
        {time ? new Date(time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
      </span>
    </div>
  );
}