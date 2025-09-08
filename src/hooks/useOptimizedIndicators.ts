/**
 * Hook optimizado para indicadores con cache inteligente diferenciado
 * Soluciona actualizaciones frecuentes innecesarias del ticker
 */

import { useState, useEffect, useCallback } from 'react'
import { IndicatorValue, IndicatorsDashboard } from '@/types'

// Cache diferenciado por tipo de uso
interface CacheEntry {
  data: IndicatorsDashboard
  timestamp: number
  source: string
  lastUpdated: string
}

const cacheStore = {
  // Cache para ticker - más duradero
  ticker: null as CacheEntry | null,
  // Cache para página completa - menos duradero
  page: null as CacheEntry | null,
  // Cache para datos críticos - muy duradero
  critical: null as CacheEntry | null
}

const CACHE_DURATIONS = {
  ticker: 2 * 60 * 1000,      // 2 minutos - ticker no necesita datos súper frescos
  page: 5 * 60 * 1000,        // 5 minutos - página completa
  critical: 10 * 60 * 1000    // 10 minutos - datos críticos
}

interface UseOptimizedIndicatorsOptions {
  type: 'ticker' | 'page' | 'critical'
  autoUpdate?: boolean
  priority: 'performance' | 'freshness' | 'balanced'
}

interface UseOptimizedIndicatorsReturn {
  indicators: IndicatorsDashboard
  loading: boolean
  error: string
  lastUpdated: string
  dataSource: string
  cacheStatus: 'hit' | 'miss' | 'expired'
  fetchIndicators: () => Promise<void>
  forceRefresh: () => Promise<void>
}

export function useOptimizedIndicators(options: UseOptimizedIndicatorsOptions): UseOptimizedIndicatorsReturn {
  const { type, autoUpdate = false, priority = 'balanced' } = options
  
  const [indicators, setIndicators] = useState<IndicatorsDashboard>({
    monetary: [], currency: [], crypto: [], labor: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [dataSource, setDataSource] = useState<string>('optimized_system')
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'expired'>('miss')

  // Determinar configuración según tipo y prioridad
  const getConfig = useCallback(() => {
    const configs = {
      ticker: {
        performance: { interval: 5 * 60 * 1000, cache: CACHE_DURATIONS.ticker },    // 5 min
        balanced: { interval: 3 * 60 * 1000, cache: CACHE_DURATIONS.ticker },      // 3 min
        freshness: { interval: 1 * 60 * 1000, cache: 1 * 60 * 1000 }               // 1 min
      },
      page: {
        performance: { interval: 10 * 60 * 1000, cache: CACHE_DURATIONS.page },    // 10 min
        balanced: { interval: 5 * 60 * 1000, cache: CACHE_DURATIONS.page },       // 5 min
        freshness: { interval: 2 * 60 * 1000, cache: 2 * 60 * 1000 }              // 2 min
      },
      critical: {
        performance: { interval: 15 * 60 * 1000, cache: CACHE_DURATIONS.critical }, // 15 min
        balanced: { interval: 10 * 60 * 1000, cache: CACHE_DURATIONS.critical },   // 10 min
        freshness: { interval: 5 * 60 * 1000, cache: 5 * 60 * 1000 }               // 5 min
      }
    }
    return configs[type][priority]
  }, [type, priority])

  const fetchIndicators = useCallback(async (force = false) => {
    try {
      const config = getConfig()
      const now = Date.now()
      const cache = cacheStore[type]

      // Verificar cache si no es forzado
      if (!force && cache && (now - cache.timestamp) < config.cache) {
        console.log(`📋 Cache HIT para ${type} (${priority})`)
        setIndicators(cache.data)
        setLastUpdated(cache.lastUpdated)
        setDataSource(cache.source)
        setCacheStatus('hit')
        setLoading(false)
        return
      }

      console.log(`🔄 Cache MISS/EXPIRED para ${type} - Obteniendo datos...`)
      setCacheStatus(cache ? 'expired' : 'miss')
      setLoading(true)
      setError('')

      // Determinar endpoint según tipo
      let endpoint = '/api/indicators/hybrid'
      if (type === 'ticker') {
        endpoint = '/api/indicators/ticker-optimized' // Nueva API optimizada
      }

      const response = await fetch(endpoint)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar indicadores')
      }

      // Actualizar cache específico
      cacheStore[type] = {
        data: data.indicators,
        timestamp: now,
        source: data.source || 'optimized_system',
        lastUpdated: data.last_updated
      }

      // Actualizar estado
      setIndicators(data.indicators)
      setLastUpdated(data.last_updated)
      setDataSource(data.source || 'optimized_system')
      setCacheStatus('miss')
      
      console.log(`✅ ${type} actualizado desde: ${data.source}`)
      
    } catch (err) {
      console.error(`❌ Error fetching ${type} indicators:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setCacheStatus('miss')
    } finally {
      setLoading(false)
    }
  }, [type, priority, getConfig])

  const forceRefresh = useCallback(async () => {
    console.log(`🔄 Forzando actualización ${type}`)
    await fetchIndicators(true)
  }, [fetchIndicators, type])

  // Fetch inicial
  useEffect(() => {
    fetchIndicators()
  }, [fetchIndicators])

  // Auto-actualización inteligente
  useEffect(() => {
    if (!autoUpdate) return

    const config = getConfig()
    const interval = setInterval(() => {
      console.log(`🔄 Auto-actualización ${type} (cada ${config.interval/1000}s)`)
      fetchIndicators()
    }, config.interval)

    return () => clearInterval(interval)
  }, [autoUpdate, fetchIndicators, getConfig, type])

  return {
    indicators,
    loading,
    error,
    lastUpdated,
    dataSource,
    cacheStatus,
    fetchIndicators,
    forceRefresh
  }
}

// Hooks especializados optimizados
export function useOptimizedTickerIndicators() {
  return useOptimizedIndicators({
    type: 'ticker',
    autoUpdate: true,
    priority: 'performance' // Prioriza rendimiento sobre frescura
  })
}

export function useOptimizedPageIndicators() {
  return useOptimizedIndicators({
    type: 'page',
    autoUpdate: true,
    priority: 'balanced' // Balance entre rendimiento y frescura
  })
}

export function useCriticalIndicators() {
  return useOptimizedIndicators({
    type: 'critical',
    autoUpdate: true,
    priority: 'freshness' // Prioriza frescura para datos críticos
  })
}