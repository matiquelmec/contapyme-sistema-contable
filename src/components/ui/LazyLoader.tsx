import React, { Suspense, memo } from 'react';

// ✅ OPTIMIZACIÓN: Cache de componentes lazy
const componentCache = new Map<string, React.ComponentType<any>>();

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error }>;
}

// Simple loading spinner component
const SimpleSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="mt-4 text-sm text-gray-600 text-center">Cargando...</div>
    </div>
  </div>
);

export const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  children, 
  fallback: CustomFallback, 
  errorFallback: ErrorFallback 
}) => {
  const FallbackComponent = CustomFallback || SimpleSpinner;

  return (
    <Suspense fallback={<FallbackComponent />}>
      {children}
    </Suspense>
  );
};

// Hook para lazy loading de componentes pesados
export const useLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
  return React.lazy(importFn);
};

// Componente para lazy loading de rutas
export const LazyRoute: React.FC<{
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  props?: Record<string, any>;
}> = ({ component: Component, props = {} }) => {
  return (
    <LazyLoader>
      <Component {...props} />
    </LazyLoader>
  );
};