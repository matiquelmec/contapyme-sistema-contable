'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { IndicatorValue, IndicatorsDashboard } from '@/types';
import { useSmartIndicators } from '@/hooks/useSmartIndicators';
import { RefreshCw, TrendingUp, DollarSign, Zap, Users, Info, Calendar, Clock, Database, ArrowUp, ArrowDown, Minus, BadgeCheck } from 'lucide-react';
import CacheStatus from '@/components/indicators/CacheStatus';

export default function EconomicIndicatorsPage() {
  const { 
    indicators, 
    loading, 
    error, 
    lastUpdate,
    manualRefresh,
    canManualRefresh,
    needsUpdate 
  } = useSmartIndicators({
    cacheTime: 10, // 10 minutos para la página detallada
    backgroundRefresh: true,
    autoRefreshInterval: 15 // 15 minutos
  });

  const [updating, setUpdating] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  // Organizar indicadores por categoría para mantener compatibilidad
  const safeIndicators = Array.isArray(indicators) ? indicators : [];
  const organizedIndicators = {
    monetary: safeIndicators.filter(ind => ind.category === 'monetary'),
    currency: safeIndicators.filter(ind => ind.category === 'currency'),  
    crypto: safeIndicators.filter(ind => ind.category === 'crypto'),
    labor: safeIndicators.filter(ind => ind.category === 'labor')
  };

  // Auto-actualización inteligente (solo una inicialización)
  useEffect(() => {
    const initializeIndicators = async () => {
      if (organizedIndicators.monetary.length === 0 && organizedIndicators.currency.length === 0) {
        console.log('🤖 Sistema inteligente: Actualizando indicadores automáticamente...');
        // El nuevo hook ya maneja la actualización automática
      }
    };
    
    initializeIndicators();
  }, [organizedIndicators.monetary.length, organizedIndicators.currency.length]);

  const updateIndicators = async () => {
    if (!canManualRefresh) return;
    
    try {
      setUpdating(true);
      await manualRefresh();
    } catch (err) {
      console.error('Error updating indicators:', err);
    } finally {
      setUpdating(false);
    }
  };

  const updateWithClaude = async () => {
    try {
      setUpdating(true);

      const allIndicators = safeIndicators;

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

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar con Claude');
      }

      // Forzar actualización del hook
      await manualRefresh();
      console.log(`✅ Actualización exitosa: ${data.results?.filter(r => r.success).length || 0} indicadores`);
      
    } catch (err) {
      console.error('❌ Error con actualización:', err);
      try {
        await updateIndicators();
      } catch (fallbackError) {
        console.error('❌ Sistema de respaldo falló:', fallbackError);
      }
    } finally {
      setUpdating(false);
    }
  };

  const formatValue = (indicator: IndicatorValue): string => {
    const { value, format_type, decimal_places, unit, category } = indicator;
    
    if (format_type === 'currency') {
      if (unit === 'USD' || category === 'crypto' || indicator.code.toLowerCase() === 'bitcoin' || indicator.code.toLowerCase() === 'btc') {
        return `US$${value.toLocaleString('en-US', { 
          minimumFractionDigits: decimal_places || 0,
          maximumFractionDigits: decimal_places || 0
        })}`;
      } else {
        return `$${value.toLocaleString('es-CL', { 
          minimumFractionDigits: decimal_places || 0,
          maximumFractionDigits: decimal_places || 0
        })} CLP`;
      }
    } else if (format_type === 'percentage') {
      return `${value.toFixed(decimal_places || 2)}%`;
    } else {
      // Para casos donde no hay format_type específico, inferir por categoría
      if (category === 'monetary' || category === 'currency') {
        if (unit === 'USD' || indicator.code.toLowerCase() === 'bitcoin' || indicator.code.toLowerCase() === 'btc' || category === 'crypto') {
          return `US$${value.toLocaleString('en-US')}`;
        } else {
          return `$${value.toLocaleString('es-CL')} CLP`;
        }
      } else if (indicator.code === 'tpm' || unit === '%') {
        return `${value.toFixed(decimal_places || 2)}%`;
      } else {
        return value.toLocaleString('es-CL', { 
          minimumFractionDigits: decimal_places || 0,
          maximumFractionDigits: decimal_places || 0
        });
      }
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getIndicatorContext = (indicator: IndicatorValue): string => {
    const code = indicator.code.toLowerCase();
    
    switch (code) {
      case 'uf':
        return 'Valor en pesos chilenos (CLP) de una UF. Se usa para contratos, arriendos e inversiones.';
      case 'utm':
        return 'Valor en pesos chilenos (CLP) de una UTM. Se usa para multas y trámites legales.';
      case 'dolar':
      case 'usd':
        return 'Cuántos pesos chilenos (CLP) vale un dólar estadounidense (USD).';
      case 'euro':
      case 'eur':
        return 'Cuántos pesos chilenos (CLP) vale un euro europeo (EUR).';
      case 'bitcoin':
      case 'btc':
        return 'Valor en dólares estadounidenses (USD) de un Bitcoin. Criptomoneda internacional.';
      case 'ethereum':
      case 'eth':
        return 'Valor en dólares estadounidenses (USD) de un Ethereum. Criptomoneda internacional.';
      case 'tpm':
        return 'Tasa de Política Monetaria del Banco Central. Expresada como porcentaje (%) anual.';
      case 'ipc':
        return 'Índice de Precios al Consumidor. Variación expresada como porcentaje (%).';
      case 'sueldo_minimo':
        return 'Sueldo mínimo mensual en pesos chilenos (CLP) establecido por ley.';
      case 'tasa_desempleo':
        return 'Porcentaje (%) de desempleo nacional según estadísticas oficiales.';
      default:
        return indicator.category === 'monetary' ? 'Valor en pesos chilenos (CLP).' :
               indicator.category === 'currency' ? 'Tipo de cambio en pesos chilenos (CLP).' :
               indicator.category === 'crypto' ? 'Valor en dólares estadounidenses (USD).' :
               'Indicador económico oficial.';
    }
  };

  const getCurrencyBadge = (indicator: IndicatorValue) => {
    const code = indicator.code.toLowerCase();
    
    // Determinar el tipo de moneda/unidad
    if (code === 'tpm' || indicator.unit === '%' || indicator.format_type === 'percentage') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          <Minus className="w-3 h-3 mr-1" />
          Porcentaje
        </span>
      );
    } else if (code === 'bitcoin' || code === 'ethereum' || indicator.category === 'crypto') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
          <Zap className="w-3 h-3 mr-1" />
          USD
        </span>
      );
    } else if (indicator.category === 'currency' && (code === 'dolar' || code === 'euro')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <TrendingUp className="w-3 h-3 mr-1" />
          CLP por unidad
        </span>
      );
    } else if (indicator.category === 'monetary' || code === 'uf' || code === 'utm' || code === 'sueldo_minimo') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          <DollarSign className="w-3 h-3 mr-1" />
          CLP
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          <Database className="w-3 h-3 mr-1" />
          Valor
        </span>
      );
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'monetary':
        return {
          title: 'Indicadores Monetarios',
          icon: DollarSign,
          gradient: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700'
        };
      case 'currency':
        return {
          title: 'Divisas',
          icon: TrendingUp,
          gradient: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700'
        };
      case 'crypto':
        return {
          title: 'Criptomonedas',
          icon: Zap,
          gradient: 'from-orange-500 to-yellow-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700'
        };
      case 'labor':
        return {
          title: 'Empleo y Salarios',
          icon: Users,
          gradient: 'from-purple-500 to-pink-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700'
        };
      default:
        return {
          title: 'Otros',
          icon: Info,
          gradient: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700'
        };
    }
  };

  const renderIndicatorCategory = (category: keyof IndicatorsDashboard, data: IndicatorValue[]) => {
    if (!data || data.length === 0) return null;

    const config = getCategoryConfig(category);
    const Icon = config.icon;

    return (
      <div key={category} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/80 transition-all duration-200">
        <div className={`bg-gradient-to-r ${config.gradient} text-white p-6 rounded-t-2xl`}>
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6" />
            <span className="text-xl font-bold">{config.title}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {data.length} indicadores
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((indicator) => (
              <div 
                key={indicator.code}
                className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20 hover:bg-white/80 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
                onClick={() => setSelectedIndicator(selectedIndicator === indicator.code ? null : indicator.code)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{indicator.name}</h4>
                    <div className="flex items-center space-x-1">
                      {getCurrencyBadge(indicator)}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatValue(indicator)}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(indicator.date)}</span>
                  </div>
                  {indicator.change !== undefined && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      indicator.change >= 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {indicator.change >= 0 ? '↗' : '↘'} {Math.abs(indicator.change).toFixed(2)}%
                    </span>
                  )}
                </div>
                
                {selectedIndicator === indicator.code && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {indicator.description || `Valor actualizado automáticamente desde fuentes oficiales.`}
                    </p>
                    <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                      <strong>Contexto:</strong> {getIndicatorContext(indicator)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        </div>
        
        <Header 
          title="Indicadores Económicos"
          subtitle="Cargando datos en tiempo real..."
          variant="premium"
          showBackButton
          backHref="/accounting"
        />
        
        <div className="relative z-10 max-w-6xl mx-auto py-8 px-4 flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando indicadores económicos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>
      
      {/* Hero Section modernizado - Similar al payroll */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => window.history.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-200"
                >
                  <ArrowUp className="w-5 h-5 rotate-[-90deg]" />
                </button>
                <h1 className="text-3xl sm:text-4xl font-bold">
                  Indicadores Económicos
                </h1>
              </div>
              <p className="text-blue-100 text-lg mb-6">
                UF, UTM, divisas y criptomonedas actualizadas en tiempo real desde fuentes oficiales
              </p>
              
              {/* Quick stats en hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {organizedIndicators.monetary.length}
                  </div>
                  <div className="text-xs text-blue-100">Monetarios</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {organizedIndicators.currency.length}
                  </div>
                  <div className="text-xs text-blue-100">Divisas</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {organizedIndicators.crypto.length}
                  </div>
                  <div className="text-xs text-blue-100">Cripto</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold flex items-center">
                    <BadgeCheck className="w-5 h-5 mr-1" />
                  </div>
                  <div className="text-xs text-blue-100">Oficial</div>
                </div>
              </div>
            </div>
            
            {/* Acciones principales en hero */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto lg:w-auto">
              <Button 
                onClick={updateIndicators}
                disabled={updating || !canManualRefresh}
                className="w-full group relative px-6 py-3 rounded-xl bg-green-500/80 hover:bg-green-500 border border-green-400/50 hover:border-green-400 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-white font-medium"
              >
                <RefreshCw className={`w-5 h-5 group-hover:scale-110 transition-transform ${updating ? 'animate-spin' : ''}`} />
                <span>{!canManualRefresh ? 'Espera 30s' : 'Actualizar Datos'}</span>
              </Button>
              <button 
                onClick={() => window.open('/accounting', '_self')}
                className="w-full group relative px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-white font-medium"
              >
                <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Volver a Contabilidad</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Cache Status Component */}
        <CacheStatus 
          cacheStatus={needsUpdate ? "expired" : "hit"}
          dataSource="Smart System"
          lastUpdated={lastUpdate?.toISOString() || new Date().toISOString()}
          loading={loading}
          onForceRefresh={manualRefresh}
        />

        {/* Currency Legend */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="font-medium">CLP</span> = Pesos Chilenos
            </div>
            <div className="inline-flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">USD</span> = Dólares Estadounidenses
            </div>
            <div className="inline-flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
              <Zap className="w-4 h-4 mr-1" />
              <span className="font-medium">%</span> = Porcentaje
            </div>
          </div>
        </div>

        {/* Status Card */}
        {lastUpdate && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">
                  Última actualización: {lastUpdate.toLocaleString('es-CL')}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Sistema Inteligente
                </span>
              </div>
              {error && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  {error}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Indicators by Category */}
        <div className="space-y-8">
          {renderIndicatorCategory('monetary', organizedIndicators.monetary)}
          {renderIndicatorCategory('currency', organizedIndicators.currency)}
          {renderIndicatorCategory('crypto', organizedIndicators.crypto)}
          {renderIndicatorCategory('labor', organizedIndicators.labor)}
        </div>

        {/* Empty State */}
        {!loading && (!organizedIndicators.monetary.length && !organizedIndicators.currency.length && !organizedIndicators.crypto.length && !organizedIndicators.labor.length) && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay indicadores disponibles</h3>
            <p className="text-gray-600 mb-6">
              Haz clic en "Actualizar" para cargar los indicadores económicos más recientes.
            </p>
            <Button 
              onClick={updateWithClaude}
              disabled={updating}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Cargar Indicadores
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xl font-bold">Acciones Rápidas</span>
            </div>
            <p className="text-green-100">
              Explora otras funcionalidades relacionadas con análisis financiero
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => window.open('/accounting/f29-analysis', '_blank')}
                className="group relative px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <DollarSign className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Análisis F29
              </button>
              <button 
                onClick={() => window.open('/accounting/f29-comparative', '_blank')}
                className="group relative px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Análisis Comparativo
              </button>
              <button 
                onClick={() => window.location.href = '/accounting'}
                className="group relative px-4 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                <Database className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Volver a Contabilidad
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}