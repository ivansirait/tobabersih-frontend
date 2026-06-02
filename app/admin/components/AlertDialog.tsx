"use client";

import { X, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  buttonText?: string;
  onClose: () => void;
  icon?: ReactNode;
}

export default function AlertDialog({
  open,
  title,
  description,
  buttonText = 'OK',
  onClose,
  icon,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm scale-150 rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header dengan icon dan title */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              {icon ?? <CheckCircle2 size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600">{description ?? 'Operasi berhasil dilakukan.'}</p>
        </div>

        {/* Button */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/10 transition hover:bg-emerald-700"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

