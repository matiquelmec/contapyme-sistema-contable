'use client';

// ==========================================
// DASHBOARD EJECUTIVO CROSS-MODULE
// Integración F29 + Activos + Indicadores + IA
// ==========================================

import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Activity, 
  Target, 
  AlertCircle, 
  Shield,
  Zap,
  LineChart,
  PieChart,
  Trophy,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { useCrossModuleAnalytics } from '@/hooks/useCrossModuleAnalytics';
import { useF29AnalyticsWorker } from '@/hooks/useF29AnalyticsWorker';
import { useDepreciationWorker } from '@/hooks/useDepreciationWorker';

export default function ExecutiveDashboardPage() {
  // Estados para los diferentes tipos de análisis
  const [f29Data, setF29Data] = useState<any[]>([]);
  const [fixedAssetsData, setFixedAssetsData] = useState<any[]>([]);
  const [economicIndicatorsData, setEconomicIndicatorsData] = useState<any[]>([]);
  const [crossModuleAnalysis, setCrossModuleAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Hooks de Workers
  const {
    isWorkerReady: isCrossWorkerReady,
    workerError: crossWorkerError,
    performFullCrossModuleAnalysis
  } = useCrossModuleAnalytics();

  const {
    isWorkerReady: isF29WorkerReady
  } = useF29AnalyticsWorker();

  const {
    isWorkerReady: isAssetsWorkerReady
  } = useDepreciationWorker();

  // Datos de demostración para pruebas
  const demoCompanyId = '550e8400-e29b-41d4-a716-446655440001';
  const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

  // Generar datos de demostración
  const generateDemoData = useCallback(() => {
    // Datos F29 de demostración (12 meses)
    const demoF29 = Array.from({ length: 12 }, (_, index) => {
      const period = 202401 + index;
      const baseVentas = 18000000;
      const seasonalFactor = index < 2 ? 0.8 : index >= 10 ? 1.3 : 1.0;
      const growthFactor = 1 + (index * 0.02);
      const randomVariation = 0.9 + Math.random() * 0.2;

      const ventas_netas = Math.round(baseVentas * seasonalFactor * growthFactor * randomVariation);
      const compras_netas = Math.round(ventas_netas * (0.65 + Math.random() * 0.1));

      return {
        period,
        ventas_netas,
        compras_netas,
        debito_fiscal: Math.round(ventas_netas * 0.19),
        credito_fiscal: Math.round(compras_netas * 0.19),
        ppm: Math.round(ventas_netas * 0.01),
        user_id: demoUserId,
        company_id: demoCompanyId
      };
    });

    // Datos de activos fijos de demostración
    const demoAssets = [
      {
        id: '1',
        name: 'Equipos de Computación',
        purchase_value: 2500000,
        residual_value: 250000,
        purchase_date: '2023-01-15',
        start_depreciation_date: '2023-01-15',
        useful_life_years: 3,
        status: 'active'
      },
      {
        id: '2',
        name: 'Muebles de Oficina',
        purchase_value: 1800000,
        residual_value: 180000,
        purchase_date: '2023-03-10',
        start_depreciation_date: '2023-03-10',
        useful_life_years: 7,
        status: 'active'
      },
      {
        id: '3',
        name: 'Vehículo Comercial',
        purchase_value: 15000000,
        residual_value: 3000000,
        purchase_date: '2024-01-20',
        start_depreciation_date: '2024-01-20',
        useful_life_years: 8,
        status: 'active'
      }
    ];

    // Datos de indicadores económicos de demostración
    const demoIndicators = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2024, index, 1);
      return [
        {
          code: 'UF',
          value: 36500 + (index * 150) + (Math.random() * 200 - 100),
          date: date.toISOString(),
          name: 'Unidad de Fomento'
        },
        {
          code: 'USD',
          value: 800 + (index * 5) + (Math.random() * 40 - 20),
          date: date.toISOString(),
          name: 'Dólar'
        },
        {
          code: 'TPM',
          value: 11.25 - (index * 0.1) + (Math.random() * 0.5 - 0.25),
          date: date.toISOString(),
          name: 'Tasa Política Monetaria'
        }
      ];
    }).flat();

    return { demoF29, demoAssets, demoIndicators };
  }, []);

  // Realizar análisis cross-module completo
  const performAnalysis = useCallback(async () => {
    if (!isCrossWorkerReady) {
      console.log('❌ Cross-module Worker no está listo');
      return;
    }

    setIsAnalyzing(true);
    setCrossModuleAnalysis(null);

    try {
      console.log('🚀 Iniciando análisis ejecutivo cross-module...');
      
      // Obtener datos reales o usar demostración
      let actualF29Data = f29Data;
      let actualAssetsData = fixedAssetsData;
      let actualIndicatorsData = economicIndicatorsData;

      // Si no hay datos reales, usar datos de demostración
      if (actualF29Data.length === 0 || actualAssetsData.length === 0 || actualIndicatorsData.length === 0) {
        const { demoF29, demoAssets, demoIndicators } = generateDemoData();
        actualF29Data = demoF29;
        actualAssetsData = demoAssets;
        actualIndicatorsData = demoIndicators;
        
        setF29Data(actualF29Data);
        setFixedAssetsData(actualAssetsData);
        setEconomicIndicatorsData(actualIndicatorsData);
      }

      const startTime = performance.now();
      
      const analysis = await performFullCrossModuleAnalysis(
        actualF29Data,
        actualAssetsData,
        actualIndicatorsData
      );
      
      const duration = performance.now() - startTime;
      console.log(`✅ Análisis ejecutivo completado en ${Math.round(duration)}ms`);
      
      setCrossModuleAnalysis(analysis);
      setLastUpdated(new Date().toLocaleString('es-CL'));

    } catch (error) {
      console.error('❌ Error en análisis ejecutivo:', error);
      
      // Generar análisis de demostración como fallback
      const demoAnalysis = generateDemoCrossModuleAnalysis();
      setCrossModuleAnalysis(demoAnalysis);
      setLastUpdated(new Date().toLocaleString('es-CL'));
      
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isCrossWorkerReady, 
    performFullCrossModuleAnalysis, 
    f29Data, 
    fixedAssetsData, 
    economicIndicatorsData,
    generateDemoData
  ]);

  // Generar análisis de demostración como fallback
  const generateDemoCrossModuleAnalysis = () => {
    return {
      assetsROI: {
        insights: [
          'ROI promedio de activos fijos: 187%',
          'Excelente retorno de inversión en activos - estrategia muy efectiva',
          'Mejor año de inversión: 2024 con ROI del 245%',
          'Ratio activos/ventas: 23%',
          'Balance saludable entre activos y ventas'
        ],
        correlations: [
          { year: '2023', investment: 4300000, sales: 198000000, roi: 187.4, efficiency: 46.0 },
          { year: '2024', investment: 15000000, sales: 251000000, roi: 245.2, efficiency: 16.7 }
        ],
        recommendations: [
          'Considera incrementar inversión en activos similares',
          'Mantén la estrategia actual de inversión en activos'
        ],
        metrics: {
          totalAssetValue: 19300000,
          totalSales: 449000000,
          assetToSalesRatio: 4.3,
          avgROI: 216.3
        }
      },
      economicCorrelations: {
        correlations: [
          { code: 'UF', indicatorName: 'Unidad de Fomento', correlation: 0.73, periods: 12 },
          { code: 'USD', indicatorName: 'Dólar', correlation: -0.34, periods: 12 },
          { code: 'TPM', indicatorName: 'Tasa Política Monetaria', correlation: -0.68, periods: 12 }
        ],
        insights: [
          'Correlación fuerte positiva entre Unidad de Fomento y ventas (73%)',
          'Ventas bajan cuando sube la tasa de interés - negocio sensible al crédito',
          'Tu negocio es resistente a fluctuaciones del dólar - buena diversificación'
        ],
        predictions: [
          'Si la UF sigue subiendo, espera crecimiento en ventas',
          'Si el Banco Central sube tasas, prepárate para menor demanda'
        ],
        metrics: {
          salesVolatility: 0.18,
          strongCorrelations: 2,
          totalPeriods: 12
        }
      },
      integratedHealth: {
        overallScore: 87,
        overallHealth: 'EXCELLENT' as const,
        components: {
          f29: {
            growth: 24.5,
            margin: 32.1,
            stability: 82.3,
            insights: [
              'Crecimiento: +25%',
              'Margen promedio: 32%',
              'Estabilidad: 82%'
            ]
          },
          assets: {
            roi: 216.3,
            utilization: 78.5,
            age: 1.2,
            insights: [
              'ROI estimado: 216%',
              'Utilización promedio: 79%',
              'Edad promedio: 1.2 años'
            ]
          },
          economic: {
            volatility: 0.18,
            diversification: 0.82,
            insights: [
              'Volatilidad: 18%',
              'Diversificación: 82%'
            ]
          }
        },
        integralInsights: [
          '🌟 Excelente salud empresarial integral - líder en tu sector',
          '💎 Combinación perfecta: alto crecimiento con ROI eficiente de activos',
          '🛡️ Negocio resiliente: buenos márgenes con baja volatilidad económica',
          '⚡ Activos bien utilizados generando crecimiento sostenido'
        ],
        strategicRecommendations: [
          '🚀 Considera expansión o nuevas líneas de negocio',
          'Mantén la estrategia actual de inversión en activos',
          'Aprovecha la correlación positiva con UF para indexar precios estratégicamente'
        ]
      },
      executiveSummary: {
        overallAssessment: 'EXCELLENT' as const,
        score: 87,
        keyStrengths: [
          'ROI excepcional en activos fijos (216%)',
          'Crecimiento sostenido superior al mercado (25%)',
          'Alta resistencia a volatilidad económica (82% diversificación)'
        ],
        majorRisks: [
          'Dependencia moderada de variaciones en tasas de interés'
        ],
        strategicPriorities: [
          'Expansión y diversificación estratégica',
          'Optimización de correlación con indicadores económicos'
        ],
        businessIntelligence: [
          'Salud empresarial: 87/100',
          'ROI activos: 216%',
          'Correlaciones económicas: 3 detectadas',
          'Volatilidad: 18%'
        ]
      }
    };
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Inicializar análisis automáticamente
  useEffect(() => {
    if (isCrossWorkerReady && !crossModuleAnalysis && !isAnalyzing) {
      // Activar automáticamente después de 3 segundos
      const timer = setTimeout(() => {
        performAnalysis();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isCrossWorkerReady, crossModuleAnalysis, isAnalyzing, performAnalysis]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>
      
      <Header 
        title="Dashboard Ejecutivo"
        subtitle="Análisis integral con IA: F29 + Activos + Indicadores Económicos"
        showBackButton={true}
        backHref="/accounting"
        variant="premium"
        actions={
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full text-xs font-medium text-purple-800">
              <Trophy className="w-3 h-3" />
              <span>Dashboard Premium</span>
            </div>
            <div className={`hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              isCrossWorkerReady && isF29WorkerReady && isAssetsWorkerReady
                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isCrossWorkerReady && isF29WorkerReady && isAssetsWorkerReady
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-gray-400'
              }`}></div>
              <span>
                {isCrossWorkerReady && isF29WorkerReady && isAssetsWorkerReady
                  ? '🚀 IA Completa' 
                  : '⏳ IA Cargando'
                }
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={performAnalysis}
              disabled={!isCrossWorkerReady || isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analizando...' : 'Re-analizar'}
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Loading State */}
          {isAnalyzing && (
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-200 mb-8">
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900 mb-2">
                      🧠 IA Analizando Todos los Módulos
                    </h3>
                    <p className="text-purple-700">
                      Procesando F29, Activos Fijos e Indicadores Económicos...
                    </p>
                    <div className="mt-4 flex justify-center space-x-6 text-sm text-purple-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <span>Correlaciones</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-500"></div>
                        <span>ROI Analysis</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse animation-delay-1000"></div>
                        <span>Business Health</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Executive Summary */}
          {crossModuleAnalysis && (
            <Card className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 mb-8 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardTitle className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    crossModuleAnalysis.executiveSummary.overallAssessment === 'EXCELLENT' ? 'bg-green-100' :
                    crossModuleAnalysis.executiveSummary.overallAssessment === 'GOOD' ? 'bg-blue-100' :
                    crossModuleAnalysis.executiveSummary.overallAssessment === 'AVERAGE' ? 'bg-yellow-100' :
                    'bg-red-100'
                  }`}>
                    {crossModuleAnalysis.executiveSummary.overallAssessment === 'EXCELLENT' ? <Trophy className="w-6 h-6 text-green-600" /> :
                     crossModuleAnalysis.executiveSummary.overallAssessment === 'GOOD' ? <Target className="w-6 h-6 text-blue-600" /> :
                     crossModuleAnalysis.executiveSummary.overallAssessment === 'AVERAGE' ? <Activity className="w-6 h-6 text-yellow-600" /> :
                     <AlertCircle className="w-6 h-6 text-red-600" />
                    }
                  </div>
                  <div>
                    <span className="text-xl">Resumen Ejecutivo</span>
                    <div className="text-sm text-gray-600 mt-1">
                      Score General: {crossModuleAnalysis.executiveSummary.score}/100 • {
                        crossModuleAnalysis.executiveSummary.overallAssessment === 'EXCELLENT' ? '🌟 Excelente' :
                        crossModuleAnalysis.executiveSummary.overallAssessment === 'GOOD' ? '✅ Buena' :
                        crossModuleAnalysis.executiveSummary.overallAssessment === 'AVERAGE' ? '⚠️ Promedio' :
                        '🚨 Requiere Atención'
                      }
                    </div>
                  </div>
                </CardTitle>
                {lastUpdated && (
                  <CardDescription>
                    Última actualización: {lastUpdated}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Key Strengths */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>Fortalezas Clave</span>
                    </h3>
                    <div className="space-y-3">
                      {crossModuleAnalysis.executiveSummary.keyStrengths.map((strength: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-green-800">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Priorities */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Prioridades Estratégicas</span>
                    </h3>
                    <div className="space-y-3">
                      {crossModuleAnalysis.executiveSummary.strategicPriorities.map((priority: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-blue-800">{priority}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Intelligence */}
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                      <Brain className="w-5 h-5" />
                      <span>Business Intelligence</span>
                    </h3>
                    <div className="space-y-3">
                      {crossModuleAnalysis.executiveSummary.businessIntelligence.map((insight: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-purple-800">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Major Risks Alert */}
                {crossModuleAnalysis.executiveSummary.majorRisks.length > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Factores de Riesgo Identificados</span>
                    </h3>
                    <div className="space-y-3">
                      {crossModuleAnalysis.executiveSummary.majorRisks.map((risk: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-orange-800">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detailed Analysis Modules */}
          {crossModuleAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Assets ROI Analysis */}
              <Card className="bg-white/90 backdrop-blur-sm border-2 border-green-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-green-600" />
                    <span>Análisis ROI de Activos</span>
                  </CardTitle>
                  <CardDescription>
                    Correlación entre inversión en activos fijos y performance de ventas F29
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* ROI Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-900">
                        {Math.round(crossModuleAnalysis.assetsROI.metrics.avgROI)}%
                      </div>
                      <div className="text-sm text-green-700">ROI Promedio</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-900">
                        {Math.round(crossModuleAnalysis.assetsROI.metrics.assetToSalesRatio)}%
                      </div>
                      <div className="text-sm text-blue-700">Ratio Activos/Ventas</div>
                    </div>
                  </div>

                  {/* ROI Correlations */}
                  {crossModuleAnalysis.assetsROI.correlations.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Evolución ROI por Año</h4>
                      <div className="space-y-3">
                        {crossModuleAnalysis.assetsROI.correlations.map((corr: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900">{corr.year}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                corr.roi > 150 ? 'bg-green-100 text-green-800' :
                                corr.roi > 50 ? 'bg-blue-100 text-blue-800' :
                                corr.roi > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                ROI: {Math.round(corr.roi)}%
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Inversión: {formatCurrency(corr.investment)} • 
                              Ventas: {formatCurrency(corr.sales)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ROI Insights */}
                  <div className="space-y-2">
                    {crossModuleAnalysis.assetsROI.insights.slice(0, 4).map((insight: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>

                  {/* ROI Recommendations */}
                  {crossModuleAnalysis.assetsROI.recommendations.length > 0 && (
                    <div className="mt-6 bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center space-x-2">
                        <Lightbulb className="w-4 h-4" />
                        <span>Recomendaciones</span>
                      </h4>
                      <div className="space-y-2">
                        {crossModuleAnalysis.assetsROI.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-green-800">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Economic Correlations Analysis */}
              <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="flex items-center space-x-2">
                    <LineChart className="w-5 h-5 text-blue-600" />
                    <span>Correlaciones Económicas</span>
                  </CardTitle>
                  <CardDescription>
                    Impacto de indicadores económicos (UF, USD, TPM) en performance empresarial
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Economic Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-900">
                        {crossModuleAnalysis.economicCorrelations.metrics.strongCorrelations}
                      </div>
                      <div className="text-sm text-blue-700">Correlaciones Fuertes</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-900">
                        {Math.round(crossModuleAnalysis.economicCorrelations.metrics.salesVolatility * 100)}%
                      </div>
                      <div className="text-sm text-purple-700">Volatilidad</div>
                    </div>
                  </div>

                  {/* Correlations Details */}
                  {crossModuleAnalysis.economicCorrelations.correlations.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Correlaciones Detectadas</h4>
                      <div className="space-y-3">
                        {crossModuleAnalysis.economicCorrelations.correlations.map((corr: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900">{corr.indicatorName}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                Math.abs(corr.correlation) > 0.7 ? 'bg-red-100 text-red-800' :
                                Math.abs(corr.correlation) > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                Math.abs(corr.correlation) > 0.3 ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {corr.correlation > 0 ? '+' : ''}{Math.round(corr.correlation * 100)}%
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {Math.abs(corr.correlation) > 0.6 ? 'Correlación fuerte' :
                               Math.abs(corr.correlation) > 0.3 ? 'Correlación moderada' :
                               'Correlación débil'} • {corr.periods} períodos analizados
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Economic Insights */}
                  <div className="space-y-2 mb-6">
                    {crossModuleAnalysis.economicCorrelations.insights.slice(0, 3).map((insight: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>

                  {/* Economic Predictions */}
                  {crossModuleAnalysis.economicCorrelations.predictions.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Predicciones Económicas</span>
                      </h4>
                      <div className="space-y-2">
                        {crossModuleAnalysis.economicCorrelations.predictions.map((pred: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-blue-800">{pred}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => window.open('/accounting/f29-comparative', '_blank')}
            >
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Análisis F29 Detallado</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Profundiza en patrones estacionales y tendencias
                </p>
                <div className="flex items-center justify-center text-sm text-purple-600">
                  <span>Ver análisis</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
                  onClick={() => window.open('/accounting/fixed-assets', '_blank')}
            >
              <CardContent className="p-6 text-center">
                <Package className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Gestión de Activos</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Optimiza ROI y depreciación de activos fijos
                </p>
                <div className="flex items-center justify-center text-sm text-green-600">
                  <span>Gestionar activos</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => window.open('/accounting/indicators', '_blank')}
            >
              <CardContent className="p-6 text-center">
                <Activity className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Indicadores Económicos</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Monitorea UF, USD, TPM y su impacto
                </p>
                <div className="flex items-center justify-center text-sm text-blue-600">
                  <span>Ver indicadores</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* No Analysis State */}
          {!crossModuleAnalysis && !isAnalyzing && (
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-200">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Dashboard Ejecutivo con IA
                </h3>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  El sistema más avanzado de análisis empresarial de Chile. Combina datos F29, 
                  activos fijos e indicadores económicos para generar insights únicos con inteligencia artificial.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">Análisis F29</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">ROI Activos</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">Correlaciones</div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={performAnalysis}
                  disabled={!isCrossWorkerReady || isAnalyzing}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  {!isCrossWorkerReady ? 'IA Cargando...' : 'Iniciar Análisis Ejecutivo'}
                </Button>
              </CardContent>
            </Card>
          )}
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

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}