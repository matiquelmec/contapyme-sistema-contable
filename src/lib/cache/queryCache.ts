/**
 * ⚡ Sistema de Cache para Consultas Frecuentes
 * Optimiza performance cachéando resultados de APIs pesadas
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos default

  /**
   * Obtener datos del cache o ejecutar query si no existe/expiró
   */
  async get<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Si existe en cache y no ha expirado, retornar
    if (cached && (now - cached.timestamp) < cached.ttl) {
      console.log(`🔥 CACHE HIT: ${key}`);
      return cached.data;
    }

    // Ejecutar query y cachear resultado
    console.log(`💾 CACHE MISS: ${key} - Ejecutando query...`);
    try {
      const data = await queryFn();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // Si hay error pero existe cache expirado, retornar cache
      if (cached) {
        console.log(`⚠️ CACHE FALLBACK: ${key} - Usando cache expirado por error`);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Establecer valor en cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`✅ CACHED: ${key} (TTL: ${ttl/1000}s)`);
  }

  /**
   * Invalidar cache por clave específica
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ CACHE INVALIDATED: ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidar cache por patrón
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(`🗑️ CACHE PATTERN INVALIDATED: ${pattern} (${deleted} entries)`);
    }
    return deleted;
  }

  /**
   * Limpiar cache expirado
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 CACHE CLEANUP: ${cleaned} expired entries removed`);
    }
    return cleaned;
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      expired,
      active: this.cache.size - expired
    };
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ CACHE CLEARED COMPLETELY');
  }
}

// Singleton global
export const queryCache = new QueryCache();

// Hook para usar cache en componentes React
import { useCallback } from 'react';

export function useQueryCache() {
  const getCached = useCallback(async <T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    return queryCache.get(key, queryFn, ttl);
  }, []);

  const invalidateCache = useCallback((key: string) => {
    return queryCache.invalidate(key);
  }, []);

  const invalidatePattern = useCallback((pattern: string) => {
    return queryCache.invalidatePattern(pattern);
  }, []);

  return {
    getCached,
    invalidateCache,
    invalidatePattern,
    cacheStats: queryCache.getStats()
  };
}

// Configuraciones específicas por tipo de consulta
export const CACHE_CONFIGS = {
  // Empleados - se actualiza poco
  EMPLOYEES: {
    ttl: 10 * 60 * 1000, // 10 minutos
    keys: {
      list: (companyId: string) => `employees:${companyId}`,
      detail: (employeeId: string) => `employee:${employeeId}`
    }
  },
  
  // Configuraciones de nómina - muy estable
  PAYROLL_CONFIG: {
    ttl: 30 * 60 * 1000, // 30 minutos
    keys: {
      settings: (companyId: string) => `payroll-config:${companyId}`,
      indicators: () => 'economic-indicators'
    }
  },
  
  // Liquidaciones - se actualiza frecuentemente
  LIQUIDATIONS: {
    ttl: 2 * 60 * 1000, // 2 minutos
    keys: {
      list: (companyId: string, period?: string) => 
        `liquidations:${companyId}${period ? `:${period}` : ''}`,
      detail: (liquidationId: string) => `liquidation:${liquidationId}`
    }
  },

  // Indicadores económicos - actualizados mensualmente
  ECONOMIC_INDICATORS: {
    ttl: 60 * 60 * 1000, // 1 hora
    keys: {
      current: () => 'indicators:current',
      period: (year: number, month: number) => `indicators:${year}-${month}`
    }
  }
} as const;

// Funciones helper para invalidación específica
export const cacheHelpers = {
  // Invalidar cache cuando se crea/actualiza/elimina empleado
  invalidateEmployees: (companyId: string, employeeId?: string) => {
    queryCache.invalidatePattern(`employees:${companyId}`);
    if (employeeId) {
      queryCache.invalidate(`employee:${employeeId}`);
    }
  },

  // Invalidar cache cuando se guarda liquidación
  invalidateLiquidations: (companyId: string, period?: string) => {
    queryCache.invalidatePattern(`liquidations:${companyId}`);
    if (period) {
      queryCache.invalidate(`liquidations:${companyId}:${period}`);
    }
  },

  // Invalidar configuraciones cuando se actualizan
  invalidateConfigs: (companyId: string) => {
    queryCache.invalidate(`payroll-config:${companyId}`);
  }
};

// Auto-cleanup cada 5 minutos
setInterval(() => {
  queryCache.cleanup();
}, 5 * 60 * 1000);

export default queryCache;