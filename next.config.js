/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,

  images: {
    unoptimized: true
  },

  typescript: {
    ignoreBuildErrors: true
  },

  eslint: {
    ignoreDuringBuilds: true
  },

  experimental: {
    missingSuspenseWithCSRBailout: false
  },

  env: {
    SKIP_ENV_VALIDATION: 'true'
  }
}

module.exports = nextConfig