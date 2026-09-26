/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Pre-renders 100% static HTML for all routes for instant load & 100% SEO
  images: {
    unoptimized: true
  }
};

export default nextConfig;
