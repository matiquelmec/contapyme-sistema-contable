/**
 * Sistema de Diseño Unificado - ContaPyme
 * Define todos los tokens de diseño y configuraciones visuales
 */

// Paleta de colores principal
export const colors = {
  // Colores primarios - Azul profesional
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  
  // Colores secundarios - Gris moderno
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Estados semánticos
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Colores especiales
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  
  // Indicadores económicos
  indicators: {
    uf: '#2563eb',
    utm: '#7c3aed',
    usd: '#16a34a',
    eur: '#0891b2',
    btc: '#f97316',
    eth: '#8b5cf6',
  },
}

// Tipografía
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
}

// Espaciado
export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
}

// Bordes y esquinas
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
}

// Sombras
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
  // Sombras de colores para estados
  'primary': '0 4px 14px 0 rgb(37 99 235 / 0.3)',
  'success': '0 4px 14px 0 rgb(34 197 94 / 0.3)',
  'warning': '0 4px 14px 0 rgb(245 158 11 / 0.3)',
  'error': '0 4px 14px 0 rgb(239 68 68 / 0.3)',
}

// Animaciones y transiciones
export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
  // Easing
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

// Breakpoints responsive
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Z-index layers
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
}

// Componentes predefinidos
export const components = {
  // Botones
  button: {
    base: 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    variants: {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 active:bg-primary-800',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500 active:bg-gray-300',
      success: 'bg-success-600 hover:bg-success-700 text-white focus:ring-success-500 active:bg-success-800',
      warning: 'bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500 active:bg-warning-700',
      danger: 'bg-error-600 hover:bg-error-700 text-white focus:ring-error-500 active:bg-error-800',
      ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500 active:bg-gray-200',
      outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500 active:bg-gray-100',
    },
    sizes: {
      xs: 'px-2.5 py-1.5 text-xs rounded-md',
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-4 py-2 text-base rounded-lg',
      xl: 'px-6 py-3 text-base rounded-lg',
    },
  },
  
  // Cards
  card: {
    base: 'bg-white rounded-lg border border-gray-200',
    elevated: 'bg-white rounded-lg shadow-lg',
    interactive: 'bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200',
    glass: 'bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200',
  },
  
  // Inputs
  input: {
    base: 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
    sizes: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    },
    states: {
      error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
    },
  },
  
  // Badges
  badge: {
    base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    variants: {
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-success-100 text-success-800',
      warning: 'bg-warning-100 text-warning-800',
      error: 'bg-error-100 text-error-800',
      gray: 'bg-gray-100 text-gray-800',
    },
  },
  
  // Alerts
  alert: {
    base: 'rounded-lg p-4 text-sm',
    variants: {
      info: 'bg-primary-50 text-primary-800 border border-primary-200',
      success: 'bg-success-50 text-success-800 border border-success-200',
      warning: 'bg-warning-50 text-warning-800 border border-warning-200',
      error: 'bg-error-50 text-error-800 border border-error-200',
    },
  },
}

// Utility classes para aplicar rápidamente
export const utilities = {
  // Glass effect
  glass: 'backdrop-blur-md bg-white/70 border border-white/20',
  glassDark: 'backdrop-blur-md bg-gray-900/70 border border-gray-700/20',
  
  // Gradientes
  gradientPrimary: 'bg-gradient-to-r from-primary-500 to-primary-600',
  gradientSuccess: 'bg-gradient-to-r from-success-500 to-success-600',
  gradientWarning: 'bg-gradient-to-r from-warning-500 to-warning-600',
  gradientError: 'bg-gradient-to-r from-error-500 to-error-600',
  gradientPurple: 'bg-gradient-to-r from-purple-500 to-purple-600',
  
  // Hover effects
  hoverScale: 'hover:scale-105 transition-transform duration-200',
  hoverShadow: 'hover:shadow-lg transition-shadow duration-200',
  hoverBright: 'hover:brightness-110 transition-all duration-200',
  
  // Focus styles
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  
  // Scrollbar
  scrollbar: 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
}

// Exportar todo como un objeto único para fácil acceso
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
  zIndex,
  components,
  utilities,
}