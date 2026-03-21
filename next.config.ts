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
    deviceSizes: [400, 640, 750, 828],  // Your modal is 400px max
    imageSizes: [400],
    formats: ['image/avif', 'image/webp'],  // Modern formats = smaller files
  }
}

export default nextConfig;
