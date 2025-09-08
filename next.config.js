/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimización máxima de rendimiento
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  
  // Configuración de imágenes optimizada
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  
  // Configuración TypeScript y ESLint rápida
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimizaciones experimentales para velocidad
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    missingSuspenseWithCSRBailout: false,
  },
  
  // Webpack optimizado para velocidad máxima
  webpack: (config, { dev }) => {
    if (dev) {
      // Configuración de desarrollo ultra-rápida
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
      
      // Optimizar para velocidad en desarrollo
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Cache optimizado
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minuto
    pagesBufferLength: 2,
  },
  
  // Headers para performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
}

module.exports = nextConfig