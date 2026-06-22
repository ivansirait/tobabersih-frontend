"use client";
import { usePathname } from 'next/navigation';
import PWAInstall from './PWAInstall';

export default function PWAInstallWrapper() {
  const pathname = usePathname() || '/';

  if (pathname.startsWith('/Warga') || pathname === '/Warga' || pathname === '/') {
    return <PWAInstall />;
  }

  return null;
}
