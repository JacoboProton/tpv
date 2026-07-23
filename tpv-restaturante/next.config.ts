import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow the v0 preview proxy origins to access Next.js dev resources
  // (HMR, chunks, RSC). These are blocked cross-origin by default in
  // Next.js 16, which breaks client-side hydration inside the preview.
  allowedDevOrigins: ['*.vusercontent.net', '*.vercel.run'],
};

export default nextConfig;
