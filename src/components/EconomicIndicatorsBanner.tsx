'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface IndicatorValue {
  code: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  format_type: string;
  decimal_places: number;
  source: 'real_data' | 'smart_simulation';
  change?: number;
}

interface IndicatorsDashboard {
  monetary: IndicatorValue[];
  currency: IndicatorValue[];
  crypto: IndicatorValue[];
  labor: IndicatorValue[];
}

export default function EconomicIndicatorsBanner() {
  const [indicators, setIndicators] = useState<IndicatorsDashboard>({
    monetary: [],
    currency: [],
    crypto: [],
    labor: []
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('hybrid_system');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');

  // Combinar todos los indicadores en un array para rotar
  const allIndicators = [
    ...indicators.monetary,
    ...indicators.currency,
    ...indicators.crypto,
    ...indicators.labor
  ];

  // Cargar indicadores al montar e intentar actualización inmediata con Claude
  useEffect(() => {
    const initializeIndicators = async () => {
      // Primero cargar datos existentes rápidamente
      await fetchIndicators();
      
      // Luego intentar actualización con Claude en background
      setTimeout(() => {

        updateWithClaude();
      }, 2000); // Esperar 2 segundos para no bloquear la carga inicial
    };
    
    initializeIndicators();
  }, []);

  // Auto-actualización inteligente con Claude
  useEffect(() => {
    const updateIntervals = {
      crypto: 5 * 60 * 1000,      // Crypto: cada 5 minutos (volátil pero no queremos abusar de Claude)
      currency: 10 * 60 * 1000,   // Divisas: cada 10 minutos
      monetary: 30 * 60 * 1000,   // UF/UTM: cada 30 minutos (menos volátil)
      labor: 2 * 60 * 60 * 1000   // Sueldo mínimo: cada 2 horas (muy estable)
    };

    // Actualización principal con Claude cada 45 minutos (más conservador)
    const claudeInterval = setInterval(() => {
      if (allIndicators.length > 0) {
        updateWithClaude();

      }
    }, 45 * 60 * 1000);

    // Actualización de respaldo híbrida cada 90 minutos (por si Claude falla)
    const fallbackInterval = setInterval(() => {
      fetchIndicators(false);

    }, 90 * 60 * 1000);

    return () => {
      clearInterval(claudeInterval);
      clearInterval(fallbackInterval);
    };
  }, [allIndicators.length]);

  // Rotar indicadores cada 3 segundos
  useEffect(() => {
    if (allIndicators.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allIndicators.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [allIndicators.length]);

  const fetchIndicators = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setUpdateStatus('updating');
      
      const response = await fetch('/api/indicators/hybrid');
      const data = await response.json();

      if (response.ok) {
        setIndicators(data.indicators);
        setDataSource(data.source);
        setLastUpdate(new Date());
        setUpdateStatus('success');
        
        // Limpiar status después de 2 segundos
        setTimeout(() => setUpdateStatus('idle'), 2000);
      } else {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error fetching indicators:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const updateWithClaude = async () => {
    try {
      setUpdateStatus('updating');
      
      const response = await fetch('/api/indicators/claude-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          indicators: allIndicators.map(ind => ({
            code: ind.code,
            name: ind.name,
            description: `${ind.name} - valor actual en tiempo real`
          }))
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Recargar indicadores después de actualización exitosa
        await fetchIndicators(false);
        setUpdateStatus('success');

        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        // Si Claude falla, usar sistema de respaldo

        
        if (response.status === 429) {
          // Rate limit - esperar más tiempo

          setUpdateStatus('error');
          setTimeout(() => setUpdateStatus('idle'), 5000);
        } else if (response.status === 503 || data.fallback_active) {
          // Claude no disponible - usar respaldo inmediatamente

          await fetchIndicators(false);
          setUpdateStatus('success');
          setTimeout(() => setUpdateStatus('idle'), 3000);
        } else {
          setUpdateStatus('error');
          setTimeout(() => setUpdateStatus('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('❌ Error de red con Claude, usando respaldo:', error);
      // En caso de error de red, usar sistema de respaldo
      try {
        await fetchIndicators(false);
        setUpdateStatus('success');
      } catch (fallbackError) {
        console.error('❌ Sistema de respaldo también falló:', fallbackError);
        setUpdateStatus('error');
      }
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  };

  const formatValue = (indicator: IndicatorValue): string => {
    const { value, format_type, decimal_places, unit } = indicator;
    
    if (format_type === 'currency') {
      if (unit === 'USD') {
        return `$${value.toLocaleString('en-US', { 
          minimumFractionDigits: decimal_places || 0,
          maximumFractionDigits: decimal_places || 0
        })} USD`;
      } else {
        return `$${value.toLocaleString('es-CL', { 
          minimumFractionDigits: decimal_places || 0,
          maximumFractionDigits: decimal_places || 0
        })}`;
      }
    } else if (format_type === 'percentage') {
      return `${value.toFixed(decimal_places || 2)}%`;
    } else {
      return value.toLocaleString('es-CL', { 
        minimumFractionDigits: decimal_places || 0,
        maximumFractionDigits: decimal_places || 0
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monetary': return 'from-blue-500 to-indigo-600';
      case 'currency': return 'from-green-500 to-emerald-600';
      case 'crypto': return 'from-orange-500 to-yellow-600';
      case 'labor': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    const baseClass = "w-8 h-8 text-white";
    
    switch (category) {
      case 'monetary':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'currency':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707L16.414 6.7a1 1 0 00-.707-.293H7a2 2 0 00-2 2v11a2 2 0 002 2zM6 10h12M6 14h12M6 18h5" />
          </svg>
        );
      case 'crypto':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'labor':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-8 p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="text-white font-medium">Cargando indicadores económicos...</span>
        </div>
      </div>
    );
  }

  if (allIndicators.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl shadow-xl mb-8 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.348 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Sin indicadores disponibles</h3>
              <p className="text-gray-200 text-sm">No se pudieron cargar los datos económicos</p>
            </div>
          </div>
          <Link 
            href="/accounting/indicators"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            Ver Detalles
          </Link>
        </div>
      </div>
    );
  }

  const currentIndicator = allIndicators[currentIndex];
  const categoryColor = getCategoryColor(currentIndicator.category);

  return (
    <div className="mb-8">
      {/* Minimal Header */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500 font-medium">Indicadores Económicos</p>
      </div>

      {/* Minimal Ticker Strip */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative">        
        {/* Minimal Ticker Container */}
        <div className="relative overflow-hidden py-2">
          {/* Ticker Wrapper */}
          <div className="flex">
            {/* Animated container */}
            <div className="animate-scroll-continuous">
              <div className="ticker-content">
                {allIndicators.map((indicator, index) => (
                  <div 
                    key={`${indicator.code}-${index}`}
                    className="inline-flex items-center gap-2 px-6 py-1 whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.open('/accounting/indicators', '_blank')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {indicator.code}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatValue(indicator)}
                    </span>
                    {indicator.change !== undefined && (
                      <span className={`text-xs ${
                        indicator.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {indicator.change >= 0 ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Duplicate for seamless loop */}
            <div className="animate-scroll-continuous" aria-hidden="true">
              <div className="ticker-content">
                {allIndicators.map((indicator, index) => (
                  <div 
                    key={`${indicator.code}-${index}-copy`}
                    className="inline-flex items-center gap-2 px-6 py-1 whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.open('/accounting/indicators', '_blank')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {indicator.code}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatValue(indicator)}
                    </span>
                    {indicator.change !== undefined && (
                      <span className={`text-xs ${
                        indicator.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {indicator.change >= 0 ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle edge fade */}
        <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
        
        {/* Minimal Status */}
        <div className="bg-gray-50 px-4 py-1 text-center">
          <span className="text-xs text-gray-400">
            🤖 Actualizado automáticamente: {lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            {updateStatus === 'updating' && (
              <span className="ml-2 inline-flex items-center">
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse mr-1"></div>
                Claude actualizando...
              </span>
            )}
            {updateStatus === 'success' && (
              <span className="ml-2 text-green-600">✓ con Claude</span>
            )}
            {updateStatus === 'error' && (
              <span className="ml-2 text-orange-600">⚠ respaldo activo</span>
            )}
          </span>
        </div>
      </div>

    </div>
  );
}