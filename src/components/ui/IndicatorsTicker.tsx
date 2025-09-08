'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useOptimizedTickerIndicators } from '@/hooks/useOptimizedIndicators'
import { IndicatorValue } from '@/types'

interface Indicator {
  code: string
  name: string
  value: number
  unit: string
  change?: number
  trend?: 'up' | 'down' | 'stable'
}

// Componente para cada indicador individual
function IndicatorItem({ indicator }: { indicator: Indicator }) {
  return (
    <div className="flex items-center space-x-2 text-white whitespace-nowrap">
      <span className="text-sm font-semibold text-blue-200">
        {indicator.name}:
      </span>
      <span className="text-sm font-bold">
        {indicator.unit === '%' 
          ? `${indicator.value}%`
          : `${indicator.unit}${indicator.value.toLocaleString('es-CL')}`
        }
      </span>
      {indicator.change !== undefined && indicator.change !== 0 && (
        <div className={`flex items-center space-x-1 ${
          indicator.trend === 'up' 
            ? 'text-green-400' 
            : indicator.trend === 'down'
            ? 'text-red-400'
            : 'text-gray-400'
        }`}>
          {indicator.trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {indicator.trend === 'down' && <TrendingDown className="w-3 h-3" />}
          <span className="text-xs">
            {indicator.change > 0 ? '+' : ''}{indicator.change}
          </span>
        </div>
      )}
    </div>
  )
}

// Convertir IndicatorValue a formato Indicator para el ticker
function convertToTickerFormat(indicatorValue: IndicatorValue): Indicator {
  // Simular cambio y tendencia basado en variación aleatoria pequeña
  const change = (Math.random() - 0.5) * 0.5 // Cambio pequeño para efecto visual
  const trend: 'up' | 'down' | 'stable' = 
    Math.abs(change) < 0.1 ? 'stable' :
    change > 0 ? 'up' : 'down'

  return {
    code: indicatorValue.code.toUpperCase(),
    name: getShortName(indicatorValue.name),
    value: indicatorValue.value,
    unit: getDisplayUnit(indicatorValue.unit, indicatorValue.format_type),
    change: parseFloat(change.toFixed(2)),
    trend
  }
}

// Obtener nombre corto para el ticker
function getShortName(name: string): string {
  const shortNames: Record<string, string> = {
    'Unidad de Fomento': 'UF',
    'Unidad Tributaria Mensual': 'UTM',
    'Dólar Observado': 'USD',
    'Euro': 'EUR',
    'Bitcoin': 'BTC',
    'Tasa de Política Monetaria': 'TPM',
    'Sueldo Mínimo': 'Sueldo Min',
    'Índice de Precios al Consumidor': 'IPC'
  }
  return shortNames[name] || name
}

// Obtener unidad de visualización
function getDisplayUnit(unit: string, formatType: string): string {
  if (formatType === 'percentage') return '%'
  if (unit === 'USD') return 'US$'
  if (unit === 'CLP') return '$'
  return unit
}

export default function IndicatorsTicker() {
  const { 
    indicators: rawIndicators, 
    loading, 
    error, 
    dataSource, 
    cacheStatus 
  } = useOptimizedTickerIndicators()
  const [indicators, setIndicators] = useState<Indicator[]>([])

  // Convertir indicadores del sistema centralizado al formato del ticker
  useEffect(() => {
    if (!loading && rawIndicators) {
      const allIndicators: IndicatorValue[] = [
        ...rawIndicators.monetary,
        ...rawIndicators.currency,
        ...rawIndicators.crypto,
        ...rawIndicators.labor
      ]

      // Filtrar y convertir los indicadores más relevantes para el ticker
      const relevantIndicators = allIndicators.filter(ind => 
        ['uf', 'utm', 'dolar', 'euro', 'bitcoin', 'tpm'].includes(ind.code.toLowerCase())
      )

      const tickerIndicators = relevantIndicators.map(convertToTickerFormat)
      setIndicators(tickerIndicators)
      
      console.log(`📊 Ticker optimizado: ${tickerIndicators.length} indicadores desde: ${dataSource} (cache: ${cacheStatus})`)
    }
  }, [rawIndicators, loading, dataSource, cacheStatus])

  if (loading || indicators.length === 0) {
    return (
      <div className="relative z-10 bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 border-b border-blue-700/30">
        <div className="py-2 px-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-blue-200 text-sm">
              {loading ? 'Cargando indicadores económicos...' : 'Conectando con sistema de indicadores...'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative z-10 bg-gradient-to-r from-slate-800 via-red-900 to-slate-800 border-b border-red-700/30">
        <div className="py-2 px-4">
          <div className="flex items-center justify-center">
            <div className="text-red-200 text-sm">
              Error en indicadores económicos - Reintentando...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 border-b border-blue-700/30 overflow-hidden shadow-lg">
      {/* Efecto de brillo animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent animate-pulse" />
      
      {/* Partículas de fondo sutiles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* Contenido principal */}
      <div className="relative py-2 px-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Label */}
          <div className="flex items-center space-x-2 text-blue-200">
            <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${
              cacheStatus === 'hit' ? 'bg-green-400 shadow-green-400/50' :
              cacheStatus === 'expired' ? 'bg-yellow-400 shadow-yellow-400/50' :
              'bg-blue-400 shadow-blue-400/50'
            }`} />
            <span className="text-sm font-medium hidden sm:block glow-text">
              Indicadores Optimizados
            </span>
            <span className="text-xs font-medium sm:hidden glow-text">
              {cacheStatus === 'hit' ? '⚡ Cache' : 'Live'}
            </span>
          </div>

          {/* Indicadores scrolleables infinitos */}
          <div className="flex-1 mx-4 overflow-hidden">
            <div className="flex space-x-6 animate-marquee-infinite">
              {/* Primera copia del contenido */}
              {indicators.map((indicator, index) => (
                <div
                  key={`original-${indicator.code}-${index}`}
                  className="flex items-center space-x-2 text-white whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm font-semibold text-blue-200">
                    {indicator.name}:
                  </span>
                  <span className="text-sm font-bold">
                    {indicator.unit === '%' 
                      ? `${indicator.value}%`
                      : `${indicator.unit}${indicator.value.toLocaleString('es-CL')}`
                    }
                  </span>
                  {indicator.change !== undefined && indicator.change !== 0 && (
                    <div className={`flex items-center space-x-1 ${
                      indicator.trend === 'up' 
                        ? 'text-green-400' 
                        : indicator.trend === 'down'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {indicator.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {indicator.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      <span className="text-xs">
                        {indicator.change > 0 ? '+' : ''}{indicator.change}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Segunda copia para loop infinito */}
              {indicators.map((indicator, index) => (
                <div
                  key={`duplicate-${indicator.code}-${index}`}
                  className="flex items-center space-x-2 text-white whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm font-semibold text-blue-200">
                    {indicator.name}:
                  </span>
                  <span className="text-sm font-bold">
                    {indicator.unit === '%' 
                      ? `${indicator.value}%`
                      : `${indicator.unit}${indicator.value.toLocaleString('es-CL')}`
                    }
                  </span>
                  {indicator.change !== undefined && indicator.change !== 0 && (
                    <div className={`flex items-center space-x-1 ${
                      indicator.trend === 'up' 
                        ? 'text-green-400' 
                        : indicator.trend === 'down'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {indicator.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {indicator.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      <span className="text-xs">
                        {indicator.change > 0 ? '+' : ''}{indicator.change}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Call to action */}
          <div className="text-right">
            <a 
              href="/accounting/indicators"
              className="text-xs text-blue-300 hover:text-blue-100 transition-colors duration-200 underline decoration-dotted"
            >
              Ver todos →
            </a>
          </div>
        </div>
      </div>

      {/* CSS para animación marquee infinita */}
      <style jsx>{`
        @keyframes marquee-infinite {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-marquee-infinite {
          animation: marquee-infinite 25s linear infinite;
          width: max-content;
        }
        
        .animate-marquee-infinite:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}