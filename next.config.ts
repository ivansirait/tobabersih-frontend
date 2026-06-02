import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

// Backend URL untuk server-side proxying
// Gunakan .env.local untuk override default
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || "http://localhost:5000").replace(/\/$/, "");

console.log(`📡 Next.js Proxy Target: ${API_PROXY_TARGET}`);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma.client"],

  allowedDevOrigins: [
    '10.195.21.83',
    'localhost',
    '127.0.0.1',
    '*.ngrok-free.dev',
    '*.ngrok.app',
  ],

  experimental: {},

  // Turbopack configuration for Next.js 16
  turbopack: {},

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${API_PROXY_TARGET}/api/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${API_PROXY_TARGET}/uploads/:path*`,
        },
      ],
    };
  },

  reactStrictMode: true,
};

const withPWAConfig = withPWA({
  dest: "public",
  // Disable automatic service worker registration — we'll register manually
  // only for the public Warga pages using a client wrapper component.
  register: false,
  disable: process.env.NODE_ENV === 'development',
});

export default withPWAConfig(nextConfig);
