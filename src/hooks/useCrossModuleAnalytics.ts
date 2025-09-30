'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WorkerTask {
  taskId: string;
  type: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface ROICorrelation {
  year: string;
  investment: number;
  sales: number;
  roi: number;
  efficiency: number;
}

interface AssetsROIAnalysis {
  insights: string[];
  correlations: ROICorrelation[];
  recommendations: string[];
  metrics: {
    totalAssetValue: number;
    totalSales: number;
    assetToSalesRatio: number;
    avgROI: number;
  };
}

interface EconomicCorrelation {
  code: string;
  indicatorName: string;
  correlation: number;
  periods: number;
  avgSales: number;
  avgIndicator: number;
}

interface EconomicCorrelationsAnalysis {
  correlations: EconomicCorrelation[];
  insights: string[];
  predictions: string[];
  metrics: {
    salesVolatility: number;
    strongCorrelations: number;
    totalPeriods: number;
  };
}

interface BusinessHealthComponent {
  growth: number;
  margin: number;
  stability: number;
  insights: string[];
}

interface AssetsHealthComponent {
  roi: number;
  utilization: number;
  age: number;
  insights: string[];
}

interface EconomicHealthComponent {
  volatility: number;
  diversification: number;
  insights: string[];
}

interface IntegratedBusinessHealth {
  overallScore: number;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  components: {
    f29: BusinessHealthComponent;
    assets: AssetsHealthComponent;
    economic: EconomicHealthComponent;
  };
  integralInsights: string[];
  strategicRecommendations: string[];
}

interface ExecutiveSummary {
  overallAssessment: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  score: number;
  keyStrengths: string[];
  majorRisks: string[];
  strategicPriorities: string[];
  businessIntelligence: string[];
}

interface FullCrossModuleAnalysis {
  assetsROI: AssetsROIAnalysis;
  economicCorrelations: EconomicCorrelationsAnalysis;
  integratedHealth: IntegratedBusinessHealth;
  executiveSummary: ExecutiveSummary;
}

export function useCrossModuleAnalytics() {
  const workerRef = useRef<Worker | null>(null);
  const tasksRef = useRef<Map<string, WorkerTask>>(new Map());
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Inicializar Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      console.log('🔗 Inicializando Cross-Module Analytics Worker...');
      
      const worker = new Worker('/workers/cross-module-analytics.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { taskId, success, result, error, type, timestamp } = e.data;

        // Mensaje de inicialización
        if (type === 'WORKER_READY') {
          console.log('✅ Cross-Module Analytics Worker listo:', e.data.message);
          console.log('🔗 Capacidades cross-module:', e.data.capabilities);
          setIsWorkerReady(true);
          setWorkerError(null);
          return;
        }

        // Resolver tarea específica
        if (taskId) {
          const task = tasksRef.current.get(taskId);
          if (task) {
            if (success) {
              task.resolve(result);
            } else {
              task.reject(new Error(error || 'Error en Cross-Module Analytics Worker'));
            }
            tasksRef.current.delete(taskId);
          }
        }
      };

      worker.onerror = (error) => {
        console.error('❌ Error en Cross-Module Analytics Worker:', error);
        setWorkerError(error.message || 'Error desconocido en Worker');
        setIsWorkerReady(false);
      };

    } catch (error: any) {
      console.error('❌ Error creando Cross-Module Analytics Worker:', error);
      setWorkerError(error.message || 'Error al crear Worker');
      setIsWorkerReady(false);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        console.log('🔌 Terminando Cross-Module Analytics Worker...');
        workerRef.current.terminate();
        workerRef.current = null;
      }
      tasksRef.current.clear();
    };
  }, []);

  // Función genérica para enviar tareas al Worker
  const sendTask = useCallback((type: string, data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Verificar que el Worker esté disponible
      if (!workerRef.current || !isWorkerReady) {
        reject(new Error('Cross-Module Analytics Worker no está disponible'));
        return;
      }

      // Verificar que no se haya terminado el Worker
      if (workerRef.current.onmessage === null) {
        reject(new Error('Cross-Module Analytics Worker terminado'));
        return;
      }

      const taskId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Guardar tarea para resolver después
      tasksRef.current.set(taskId, {
        taskId,
        type,
        resolve,
        reject,
        timestamp: Date.now()
      });

      try {
        // Enviar al Worker
        workerRef.current.postMessage({
          type,
          data,
          taskId
        });

        // Timeout de seguridad (20 segundos para análisis complejos)
        setTimeout(() => {
          if (tasksRef.current.has(taskId)) {
            tasksRef.current.delete(taskId);
            reject(new Error('Timeout: análisis cross-module tomó demasiado tiempo'));
          }
        }, 20000);
      } catch (error) {
        tasksRef.current.delete(taskId);
        reject(new Error(`Error enviando mensaje al Worker: ${error}`));
      }
    });
  }, [isWorkerReady]);

  // Analizar ROI de activos fijos vs F29
  const analyzeAssetsROI = useCallback(async (f29Data: any[], fixedAssetsData: any[]): Promise<AssetsROIAnalysis> => {
    if (!isWorkerReady) {
      return {
        insights: ['Worker no disponible - análisis de ROI no realizado'],
        correlations: [],
        recommendations: [],
        metrics: {
          totalAssetValue: 0,
          totalSales: 0,
          assetToSalesRatio: 0,
          avgROI: 0
        }
      };
    }

    try {
      return await sendTask('ANALYZE_ASSETS_ROI', { f29Data, fixedAssetsData });
    } catch (error) {
      console.warn('Error en análisis de ROI de activos:', error);
      return {
        insights: ['Error en análisis de ROI de activos'],
        correlations: [],
        recommendations: [],
        metrics: {
          totalAssetValue: 0,
          totalSales: 0,
          assetToSalesRatio: 0,
          avgROI: 0
        }
      };
    }
  }, [isWorkerReady, sendTask]);

  // Analizar correlaciones con indicadores económicos
  const analyzeEconomicCorrelations = useCallback(async (f29Data: any[], economicIndicators: any[]): Promise<EconomicCorrelationsAnalysis> => {
    if (!isWorkerReady) {
      return {
        correlations: [],
        insights: ['Worker no disponible - análisis de correlaciones económicas no realizado'],
        predictions: [],
        metrics: {
          salesVolatility: 0,
          strongCorrelations: 0,
          totalPeriods: 0
        }
      };
    }

    try {
      return await sendTask('ANALYZE_ECONOMIC_CORRELATIONS', { f29Data, economicIndicators });
    } catch (error) {
      console.warn('Error en análisis de correlaciones económicas:', error);
      return {
        correlations: [],
        insights: ['Error en análisis de correlaciones económicas'],
        predictions: [],
        metrics: {
          salesVolatility: 0,
          strongCorrelations: 0,
          totalPeriods: 0
        }
      };
    }
  }, [isWorkerReady, sendTask]);

  // Análisis integrado de salud empresarial
  const performIntegratedAnalysis = useCallback(async (
    f29Data: any[], 
    fixedAssetsData: any[], 
    economicIndicators: any[]
  ): Promise<IntegratedBusinessHealth> => {
    if (!isWorkerReady) {
      return {
        overallScore: 0,
        overallHealth: 'POOR',
        components: {
          f29: { growth: 0, margin: 0, stability: 0, insights: [] },
          assets: { roi: 0, utilization: 0, age: 0, insights: [] },
          economic: { volatility: 0, diversification: 0, insights: [] }
        },
        integralInsights: ['Worker no disponible'],
        strategicRecommendations: ['Sistema de análisis no operativo']
      };
    }

    try {
      return await sendTask('PERFORM_INTEGRATED_ANALYSIS', { 
        f29Data, 
        fixedAssetsData, 
        economicIndicators 
      });
    } catch (error) {
      console.warn('Error en análisis integrado:', error);
      throw error;
    }
  }, [isWorkerReady, sendTask]);

  // Análisis cross-module completo
  const performFullCrossModuleAnalysis = useCallback(async (
    f29Data: any[], 
    fixedAssetsData: any[], 
    economicIndicators: any[]
  ): Promise<FullCrossModuleAnalysis> => {
    if (!isWorkerReady) {
      return {
        assetsROI: {
          insights: [],
          correlations: [],
          recommendations: [],
          metrics: { totalAssetValue: 0, totalSales: 0, assetToSalesRatio: 0, avgROI: 0 }
        },
        economicCorrelations: {
          correlations: [],
          insights: [],
          predictions: [],
          metrics: { salesVolatility: 0, strongCorrelations: 0, totalPeriods: 0 }
        },
        integratedHealth: {
          overallScore: 0,
          overallHealth: 'POOR',
          components: {
            f29: { growth: 0, margin: 0, stability: 0, insights: [] },
            assets: { roi: 0, utilization: 0, age: 0, insights: [] },
            economic: { volatility: 0, diversification: 0, insights: [] }
          },
          integralInsights: ['Worker no disponible'],
          strategicRecommendations: []
        },
        executiveSummary: {
          overallAssessment: 'POOR',
          score: 0,
          keyStrengths: [],
          majorRisks: ['Sistema de análisis no operativo'],
          strategicPriorities: [],
          businessIntelligence: []
        }
      };
    }

    try {
      console.log(`🔗 Realizando análisis cross-module completo...`, {
        f29Periods: f29Data.length,
        assets: fixedAssetsData.length,
        indicators: economicIndicators.length
      });
      
      const startTime = performance.now();
      
      const result = await sendTask('FULL_CROSS_MODULE_ANALYSIS', { 
        f29Data, 
        fixedAssetsData, 
        economicIndicators 
      });
      
      const duration = performance.now() - startTime;
      console.log(`✅ Análisis cross-module completado en ${Math.round(duration)}ms`);
      
      return result;
    } catch (error) {
      console.warn('Error en análisis cross-module completo:', error);
      throw error;
    }
  }, [isWorkerReady, sendTask]);

  return {
    isWorkerReady,
    workerError,
    analyzeAssetsROI,
    analyzeEconomicCorrelations,
    performIntegratedAnalysis,
    performFullCrossModuleAnalysis
  };
}