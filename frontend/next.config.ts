import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only use rewrites for local dev (no NEXT_PUBLIC_API_URL set)
    // Production uses middleware for proxying with custom headers
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
