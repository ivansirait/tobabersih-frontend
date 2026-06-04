"use client";
import React, { createContext, useContext, useRef, useState } from 'react';
import ConfirmDialog from '../admin/components/ConfirmDialog';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<{ resolve?: (v: boolean) => void }>({});

  const confirm: ConfirmFn = (opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current.resolve = resolve;
    });
  };

  const handleConfirm = () => {
    setOpen(false);
    resolverRef.current.resolve?.(true);
    resolverRef.current.resolve = undefined;
  };

  const handleCancel = () => {
    setOpen(false);
    resolverRef.current.resolve?.(false);
    resolverRef.current.resolve = undefined;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText ?? 'Hapus'}
        cancelText={options.cancelText ?? 'Batal'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
