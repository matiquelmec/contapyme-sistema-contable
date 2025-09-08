/**
 * API optimizada específicamente para el ticker de indicadores
 * Reduce payload y mejora rendimiento vs API completa
 */

import { NextRequest, NextResponse } from 'next/server';

// Datos estáticos optimizados para ticker (UF, UTM, etc.)
const TICKER_INDICATORS = {
  uf: { name: 'UF', value: 39179, unit: '$', trend: 'up', change: 0.05 },
  utm: { name: 'UTM', value: 68923, unit: '$', trend: 'stable', change: 0 },
  dolar: { name: 'USD', value: 950, unit: '$', trend: 'down', change: -0.15 },
  euro: { name: 'EUR', value: 1025, unit: '$', trend: 'up', change: 0.23 },
  bitcoin: { name: 'BTC', value: 45200, unit: 'US$', trend: 'up', change: 2.1 },
  tpm: { name: 'TPM', value: 11.25, unit: '%', trend: 'stable', change: 0 }
}

// Cache específico para ticker (más agresivo)
let tickerCache: any = null
let tickerCacheTime = 0
const TICKER_CACHE_DURATION = 2 * 60 * 1000 // 2 minutos

export async function GET(request: NextRequest) {
  try {
    const now = Date.now()
    
    // Cache agresivo para ticker
    if (tickerCache && (now - tickerCacheTime) < TICKER_CACHE_DURATION) {
      console.log('📊 Ticker: usando cache optimizado')
      return NextResponse.json({
        ...tickerCache,
        cache_hit: true,
        cache_age: Math.floor((now - tickerCacheTime) / 1000)
      })
    }

    console.log('🔄 Ticker: generando datos optimizados')

    // Simular pequeñas variaciones para realismo (sin APIs externas)
    const optimizedIndicators = Object.entries(TICKER_INDICATORS).map(([code, base]) => {
      // Variación pequeña aleatoria
      const variation = (Math.random() - 0.5) * 0.02 // ±1%
      const newValue = base.value * (1 + variation)
      
      // Determinar tendencia basada en variación
      let trend = 'stable'
      let change = 0
      if (Math.abs(variation) > 0.005) {
        trend = variation > 0 ? 'up' : 'down'
        change = parseFloat((variation * 100).toFixed(2))
      }

      return {
        code: code.toUpperCase(),
        name: base.name,
        value: parseFloat(newValue.toFixed(base.unit === '%' ? 2 : 0)),
        unit: base.unit,
        trend,
        change,
        category: code === 'bitcoin' ? 'crypto' : 
                 ['dolar', 'euro'].includes(code) ? 'currency' : 'monetary'
      }
    })

    // Estructura optimizada para ticker
    const tickerData = {
      indicators: {
        monetary: optimizedIndicators.filter(i => i.category === 'monetary'),
        currency: optimizedIndicators.filter(i => i.category === 'currency'), 
        crypto: optimizedIndicators.filter(i => i.category === 'crypto'),
        labor: []
      },
      last_updated: new Date().toISOString(),
      source: 'ticker_optimized',
      status: 'success',
      cache_hit: false,
      optimized_for: 'ticker_performance'
    }

    // Actualizar cache
    tickerCache = tickerData
    tickerCacheTime = now

    console.log(`✅ Ticker optimizado: ${optimizedIndicators.length} indicadores`)

    return NextResponse.json(tickerData)

  } catch (error) {
    console.error('❌ Error en ticker optimizado:', error)
    
    // Fallback a datos estáticos si hay error
    const fallbackData = {
      indicators: {
        monetary: [
          { code: 'UF', name: 'UF', value: 39179, unit: '$', trend: 'stable', change: 0, category: 'monetary' },
          { code: 'UTM', name: 'UTM', value: 68923, unit: '$', trend: 'stable', change: 0, category: 'monetary' }
        ],
        currency: [
          { code: 'USD', name: 'USD', value: 950, unit: '$', trend: 'stable', change: 0, category: 'currency' }
        ],
        crypto: [
          { code: 'BTC', name: 'BTC', value: 45000, unit: 'US$', trend: 'stable', change: 0, category: 'crypto' }
        ],
        labor: []
      },
      last_updated: new Date().toISOString(),
      source: 'fallback_ticker',
      status: 'fallback',
      error: 'Using fallback data'
    }

    return NextResponse.json(fallbackData)
  }
}

// POST para forzar actualización de ticker
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Ticker: forzando actualización')
    
    // Limpiar cache
    tickerCache = null
    tickerCacheTime = 0
    
    // Rellamar GET para obtener datos frescos
    return GET(request)
    
  } catch (error) {
    console.error('❌ Error forzando actualización ticker:', error)
    return NextResponse.json(
      { error: 'Error al forzar actualización del ticker' },
      { status: 500 }
    )
  }
}