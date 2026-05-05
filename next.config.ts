import type { NextConfig } from "next";
import withPWA from "next-pwa";

const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || "http://localhost:5000").replace(/\/$/, "");

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
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_PROXY_TARGET}/uploads/:path*`,
      },
    ];
  },

  reactStrictMode: true,
};

const withPWAConfig = withPWA({
  dest: "public",
  // Disable automatic service worker registration — we'll register manually
  // only for the public Warga pages using a client wrapper component.
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*\.(jpg|jpeg|png|gif|webp|svg\+xml)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https?.*\/api\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /^https?.*\.(js|css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-cache",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
  ],
});

export default withPWAConfig(nextConfig);
