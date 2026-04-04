const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Transpile @podium/shared directly from source
  transpilePackages: ['@podium/shared'],
  webpack: (config) => {
    // Resolve @podium/shared to its source directly (no need to build it first)
    config.resolve.alias['@podium/shared'] = path.resolve(__dirname, '../../packages/shared/src/index.ts')
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/api/v1/ws',
  },
}

module.exports = nextConfig
