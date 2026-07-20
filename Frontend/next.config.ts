import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // standalone is for Docker; Vercel uses its own bundler
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@tien-len/shared', '@tien-len/socket'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development' || process.env.VERCEL) {
      return [];
    }
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:4000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
