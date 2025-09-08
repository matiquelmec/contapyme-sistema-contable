'use client';

import { useState, useEffect, useCallback } from 'react';

interface IndicatorData {
  code: string;
  name: string;
  value: number;
  unit: string;
  variation?: number;
  updated_at: string;
  category: string;
}

interface CachedIndicators {
  data: IndicatorData[];
  timestamp: number;
  expires: number;
}

interface UseSmartIndicatorsOptions {
  cacheTime?: number; // en minutos
  backgroundRefresh?: boolean;
  autoRefreshInterval?: number; // en minutos
}

export const useSmartIndicators = (options: UseSmartIndicatorsOptions = {}) => {
  const {
    cacheTime = 5, // 5 minutos por defecto
    backgroundRefresh = true,
    autoRefreshInterval = 10 // 10 minutos
  } = options;

  const [indicators, setIndicators] = useState<IndicatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [canManualRefresh, setCanManualRefresh] = useState(true);

  // Cache keys
  const CACHE_KEY = 'contapyme_indicators_cache';
  const LAST_UPDATE_KEY = 'contapyme_indicators_last_update';

  // Obtener indicadores del cache
  const getCachedIndicators = (): CachedIndicators | null => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const parsed: CachedIndicators = JSON.parse(cached);
      
      // Verificar si el cache ha expirado
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.warn('Error reading indicators cache:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEY);
      }
      return null;
    }
  };

  // Guardar indicadores en cache
  const setCachedIndicators = (data: IndicatorData[]) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData: CachedIndicators = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + (cacheTime * 60 * 1000)
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Error saving indicators cache:', error);
    }
  };

  // Fetch indicadores desde la API
  const fetchIndicators = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setError(null);
      }

      const response = await fetch('/api/indicators', {
        method: 'GET',
        headers: {
          'Cache-Control': options.force ? 'no-cache' : 'max-age=300'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      const indicatorsData = result.data || [];
      
      // Actualizar estado y cache
      setIndicators(indicatorsData);
      setLastUpdate(new Date());
      setCachedIndicators(indicatorsData);
      
      if (!options.silent) {
        setLoading(false);
      }

      console.log(`📊 Indicadores actualizados: ${indicatorsData.length} indicadores`);
      return indicatorsData;

    } catch (error) {
      console.error('Error fetching indicators:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      
      if (!options.silent) {
        setLoading(false);
      }
      
      throw error;
    }
  }, []);

  // Refresh manual con cooldown
  const manualRefresh = useCallback(async () => {
    if (!canManualRefresh) {
      console.log('⏳ Refresh en cooldown, espera un momento...');
      return;
    }

    setCanManualRefresh(false);
    setLoading(true);
    
    try {
      await fetchIndicators({ force: true });
      console.log('🔄 Refresh manual exitoso');
    } catch (error) {
      console.error('❌ Error en refresh manual:', error);
    }
    
    // Cooldown de 30 segundos
    setTimeout(() => {
      setCanManualRefresh(true);
    }, 30000);
  }, [fetchIndicators, canManualRefresh]);

  // Verificar si necesita actualización
  const needsUpdate = useCallback((): boolean => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return true;
    
    const lastUpdateTime = localStorage.getItem(LAST_UPDATE_KEY);
    if (!lastUpdateTime) return true;

    const timeSinceUpdate = Date.now() - parseInt(lastUpdateTime);
    const cacheTimeMs = cacheTime * 60 * 1000;
    
    return timeSinceUpdate > cacheTimeMs;
  }, [cacheTime]);

  // Inicialización inteligente
  useEffect(() => {
    const initializeIndicators = async () => {
      console.log('🚀 Inicializando sistema inteligente de indicadores...');
      
      // Verificar cache primero
      const cached = getCachedIndicators();
      
      if (cached && !needsUpdate()) {
        console.log('📋 Usando indicadores desde cache');
        setIndicators(cached.data);
        setLastUpdate(new Date(cached.timestamp));
        setLoading(false);
        return;
      }

      // Cache expirado o no existe - fetch fresh data
      console.log('🌐 Obteniendo indicadores frescos...');
      try {
        await fetchIndicators();
      } catch (error) {
        // Si falla, intentar usar cache aunque esté expirado
        if (cached) {
          console.log('⚠️ Usando cache expirado como fallback');
          setIndicators(cached.data);
          setLastUpdate(new Date(cached.timestamp));
        }
        setLoading(false);
      }
    };

    initializeIndicators();
  }, [fetchIndicators, needsUpdate]);

  // Auto-refresh en background
  useEffect(() => {
    if (!backgroundRefresh || typeof window === 'undefined') return;

    const backgroundRefreshInterval = setInterval(async () => {
      // Solo actualizar si la página está visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !loading) {
        try {
          console.log('🔄 Auto-refresh en background...');
          await fetchIndicators({ silent: true });
        } catch (error) {
          console.warn('⚠️ Background refresh falló:', error);
        }
      }
    }, autoRefreshInterval * 60 * 1000);

    return () => clearInterval(backgroundRefreshInterval);
  }, [backgroundRefresh, autoRefreshInterval, fetchIndicators, loading]);

  // Limpiar cache cuando se cierra la ventana
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleBeforeUnload = () => {
      // Mantener cache para la próxima sesión
      console.log('💾 Preservando cache de indicadores para próxima sesión');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Trigger update cuando la ventana vuelve a tener foco
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && needsUpdate()) {
        console.log('👁️ Página visible - verificando actualizaciones...');
        fetchIndicators({ silent: true }).catch(console.warn);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchIndicators, needsUpdate]);

  return {
    indicators,
    loading,
    error,
    lastUpdate,
    manualRefresh,
    canManualRefresh,
    needsUpdate: needsUpdate()
  };
};