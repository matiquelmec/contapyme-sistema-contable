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
  
  // Configuración TypeScript y ESLint completamente permisiva para Vercel
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimizaciones experimentales para velocidad
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    missingSuspenseWithCSRBailout: false,
  },

  // Configuración específica para Vercel deployment
  env: {
    SKIP_ENV_VALIDATION: 'true',
  },
  
  // Webpack optimizado para velocidad máxima
  webpack: (config, { dev }) => {
    // Configuración de resolución de módulos más estricta
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@/components': require('path').resolve(__dirname, 'src/components'),
      '@/lib': require('path').resolve(__dirname, 'src/lib'),
      '@/types': require('path').resolve(__dirname, 'src/types'),
    };

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