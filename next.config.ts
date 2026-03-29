import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
    images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jngvduzxuimqrgjosugu.supabase.co',
        port: '',
      },
    ],
    deviceSizes: [400, 640, 750, 828],
    imageSizes: [400],
    formats: [ 'image/avif', 'image/webp' ],
    // Add caching headers for images
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache for optimized images
  },
  crossOrigin: 'use-credentials',
  // Add header for better cache control
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
}

export default nextConfig;
