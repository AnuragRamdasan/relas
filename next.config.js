/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Disable turbopack for production builds to avoid font loading issues
  experimental: {
    turbo: process.env.NODE_ENV === 'development',
  },
  webpack: (config, { isServer }) => {
    // Handle Prisma client for standalone builds
    if (isServer) {
      config.externals.push('@prisma/client')
    }
    return config
  },
}

module.exports = nextConfig