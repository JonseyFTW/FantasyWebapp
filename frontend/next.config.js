/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir option (now default in Next.js 14)
  
  // Output configuration for Railway
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: [],
  },
  
  // Environment variables available on client side
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    return config;
  },
  
  // Experimental features for better production builds
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig