"use client";

import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Ya',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        <div className="p-8 md:p-10 flex flex-col items-center text-center">
          <button onClick={onCancel} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>

          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-6 border-8 border-amber-50/50">
            <AlertTriangle size={36} />
          </div>

          <h3 className="font-black text-2xl md:text-3xl text-gray-900 mb-2">{title}</h3>

          {description && (
            <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium max-w-prose mb-6">
              {description}
            </p>
          )}

          <div className="flex w-full gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 px-6 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition shadow-lg"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
