"use client";
import { X, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlertModalProps {
  open: boolean;
  title: string;
  description?: string;
  variant?: 'confirm' | 'success' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function AlertModal({ open, title, description, variant = 'confirm', confirmText = 'Hapus', cancelText = 'Batal', loading = false, onConfirm, onCancel }: AlertModalProps) {
  if (!open) return null;
  const isSuccess = variant === 'success';
  const isError = variant === 'error';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`px-6 pt-6 pb-4 text-center relative ${isSuccess ? 'bg-gradient-to-br from-[#DDE9E1] to-[#E8F1EB]' : isError ? 'bg-gradient-to-br from-red-50 to-rose-100' : 'bg-gray-50'}`}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/40 rounded-full blur-xl" />
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm relative z-10">
            {variant === 'success' && <CheckCircle2 size={36} className="text-[#4A6D55]" />}
            {variant === 'error' && <AlertTriangle size={36} className="text-red-500" />}
            {variant === 'confirm' && <Trash2 size={36} className="text-red-500" />}
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 relative z-10">{title}</h3>
        </div>

        <div className="px-6 py-5 text-center">
          {description && <p className="text-gray-500 text-sm mb-6 leading-relaxed">{description}</p>}
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">{cancelText}</button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all shadow-lg ${variant === 'confirm' || variant === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4A6D55] hover:bg-[#3a5643]'}`}>{loading ? 'Memproses...' : confirmText}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
