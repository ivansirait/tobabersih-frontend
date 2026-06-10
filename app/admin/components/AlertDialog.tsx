"use client";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  PlusCircle,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type AlertType =
  | "success"
  | "create"
  | "edit"
  | "delete"
  | "delete-success"
  | "info"
  | "error"
  | "loading";

interface AlertDialogProps {
  open: boolean;
  type: AlertType;
  title: string;
  description: string;
  buttonText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  detailText?: string;
  onConfirm?: () => void;
  onClose: () => void;
  isLoading?: boolean;
  disableBackdropClose?: boolean;
}

interface TypeStyles {
  badge: string;
  badgeText: string;
  iconRing: string;
  iconColor: string;
  ringBorderColor: string;
  primaryBtn: string;
  progressGradient: string;
}

const getStyles = (type: AlertType): TypeStyles => {
  switch (type) {
    case "success":
    case "create":
    case "edit":
    case "delete-success":
    case "loading":
      return {
        badge: "bg-[#064E3B]/10 text-[#064E3B]",
        badgeText: type === "success" ? "Berhasil" : type === "create" ? "Tambah Baru" : type === "edit" ? "Perbarui" : type === "delete-success" ? "Berhasil Dihapus" : "Memproses",
        iconRing: "bg-[#064E3B]/10",
        iconColor: "text-[#064E3B]",
        ringBorderColor: "#064E3B",
        primaryBtn: "bg-gradient-to-br from-[#064E3B] to-[#05402f] hover:from-[#08634e] hover:to-[#064E3B] shadow-lg shadow-emerald-200",
        progressGradient: "from-[#064E3B] to-[#08634e]",
      };
    case "delete":
    case "error":
      return {
        badge: "bg-red-50 text-red-600",
        badgeText: type === "delete" ? "Hapus" : "Gagal",
        iconRing: "bg-red-50",
        iconColor: "text-red-500",
        ringBorderColor: "#fca5a5",
        primaryBtn: "bg-gradient-to-br from-red-500 to-red-400 hover:from-red-600 hover:to-red-500 shadow-lg shadow-red-200",
        progressGradient: "from-red-400 to-red-500",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-600",
        badgeText: "Info",
        iconRing: "bg-slate-100",
        iconColor: "text-slate-600",
        ringBorderColor: "#cbd5e1",
        primaryBtn: "bg-gradient-to-br from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-200",
        progressGradient: "from-slate-400 to-slate-500",
      };
  }
};

const getIcon = (type: AlertType, isLoading: boolean) => {
  if (isLoading || type === "loading") return <Loader2 size={36} strokeWidth={2} className="animate-spin" />;
  switch (type) {
    case "success": case "delete-success": return <CheckCircle2 size={36} strokeWidth={2} />;
    case "create": return <PlusCircle size={36} strokeWidth={2} />;
    case "edit": return <Edit3 size={36} strokeWidth={2} />;
    case "delete": return <Trash2 size={36} strokeWidth={2} />;
    case "error": return <XCircle size={36} strokeWidth={2} />;
    default: return <AlertCircle size={36} strokeWidth={2} />;
  }
};

const getBadgeIcon = (type: AlertType) => {
  if (type === "loading") return <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />;
  switch (type) {
    case "success": case "delete-success": return <CheckCircle2 size={12} strokeWidth={2.5} />;
    case "create": return <PlusCircle size={12} strokeWidth={2.5} />;
    case "edit": return <Edit3 size={12} strokeWidth={2.5} />;
    case "delete": return <Trash2 size={12} strokeWidth={2.5} />;
    case "error": return <XCircle size={12} strokeWidth={2.5} />;
    default: return <AlertCircle size={12} strokeWidth={2.5} />;
  }
};

const getConfirmIcon = (type: AlertType) => {
  switch (type) {
    case "delete": return <Trash2 size={18} strokeWidth={2} />;
    case "create": return <PlusCircle size={18} strokeWidth={2} />;
    case "edit": return <Edit3 size={18} strokeWidth={2} />;
    case "success": case "delete-success": return <CheckCircle2 size={18} strokeWidth={2} />;
    case "error": return <RefreshCw size={18} strokeWidth={2} />;
    default: return null;
  }
};

const getDetailIcon = (type: AlertType) => {
  if (type === "delete") return <Trash2 size={15} strokeWidth={2} />;
  if (type === "error") return <XCircle size={15} strokeWidth={2} />;
  return <AlertCircle size={15} strokeWidth={2} />;
};

const KEYFRAME_ID = "alert-dialog-keyframes";

function useProgressKeyframes() {
  useEffect(() => {
    if (document.getElementById(KEYFRAME_ID)) return;
    const style = document.createElement("style");
    style.id = KEYFRAME_ID;
    style.textContent = `@keyframes alertProgressBar { 0% { width: 8%; margin-left: 0%; } 50% { width: 60%; margin-left: 20%; } 100% { width: 8%; margin-left: 92%; } }`;
    document.head.appendChild(style);
  }, []);
}

export default function AlertDialog({
  open, type, title, description, buttonText, cancelText = "Batal",
  showCancelButton = false, detailText, onConfirm, onClose,
  isLoading = false, disableBackdropClose = false,
}: AlertDialogProps) {
  useProgressKeyframes();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  const styles = getStyles(type);
  const finalButtonText = buttonText ?? (type === "create" ? "Tambah" : type === "edit" ? "Simpan" : type === "delete" ? "Hapus" : type === "delete-success" ? "Selesai" : type === "error" ? "Coba Lagi" : type === "loading" ? "Memproses..." : "Mengerti");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !disableBackdropClose && !isLoading && onClose()} />
      <div className="relative w-full max-w-[480px] rounded-3xl bg-white px-6 py-8 sm:px-8 sm:py-9 text-center shadow-2xl shadow-black/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${styles.badge}`}>
            {getBadgeIcon(type)} {styles.badgeText}
          </span>
        </div>
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center">
            <svg className="absolute" style={{ width: 106, height: 106 }} viewBox="0 0 106 106" fill="none">
              <circle cx="53" cy="53" r="51" stroke={styles.ringBorderColor} strokeWidth="1.5" strokeDasharray="6 5" strokeLinecap="round" opacity="0.7" />
            </svg>
            <div className={`w-[82px] h-[82px] rounded-full flex items-center justify-center ${styles.iconRing} ${styles.iconColor}`}>
              {getIcon(type, isLoading)}
            </div>
          </div>
        </div>
        <h2 className="text-[20px] font-bold text-slate-900 mb-3">{title}</h2>
        <p className="text-[14px] text-slate-500 max-w-[360px] mx-auto">{description}</p>
        {detailText && (
          <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-slate-50 text-left border border-slate-100">
            <span className="mt-[1px] text-slate-400 flex-shrink-0">{getDetailIcon(type)}</span>
            <p className="text-[13px] text-slate-500">{detailText}</p>
          </div>
        )}
        {(isLoading || type === "loading") && (
          <div className="mt-4 w-full h-[3px] rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${styles.progressGradient}`} style={{ animation: "alertProgressBar 1.8s ease-in-out infinite" }} />
          </div>
        )}
        <div className="mt-6 mb-5 h-px bg-slate-100" />
        <div className={`grid gap-3 ${showCancelButton ? "grid-cols-2" : "grid-cols-1"}`}>
          {showCancelButton && (
            <button onClick={onClose} disabled={isLoading} className="h-[50px] rounded-[14px] bg-slate-100 text-[14px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-200 disabled:opacity-50">
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm || onClose} disabled={isLoading && type !== "loading"} className={`flex h-[50px] items-center justify-center gap-2.5 rounded-[14px] text-[14px] font-semibold text-white ${styles.primaryBtn}`}>
            {isLoading || type === "loading" ? <><Loader2 size={18} className="animate-spin" /> Memproses...</> : <>{getConfirmIcon(type)} {finalButtonText}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}