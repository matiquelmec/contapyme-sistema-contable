'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WorkerTask {
  taskId: string;
  type: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface SeasonalPattern {
  type: 'SEASONAL_PEAK' | 'SEASONAL_LOW';
  month: number;
  monthName: string;
  value: number;
  percentageAboveAverage?: number;
  percentageBelowAverage?: number;
}

interface SeasonalAnalysis {
  hasSeasonality: boolean;
  patterns: SeasonalPattern[];
  confidence: number;
  variation?: number;
  insights: string[];
}

interface TrendProjection {
  period: number;
  periodDisplay: string;
  projectedSales: number;
  confidence: number;
}

interface TrendAnalysis {
  trend: 'GROWING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';
  growth: number;
  slope?: number;
  r2?: number;
  projections: TrendProjection[];
  insights: string[];
}

interface Anomaly {
  period: number;
  value: number;
  deviation?: number;
  type: 'OUTLIER_HIGH' | 'OUTLIER_LOW' | 'SUDDEN_DROP' | 'SUDDEN_SPIKE';
  zScore?: number;
  severity: 'WARNING' | 'CRITICAL';
  previousValue?: number;
  change?: number;
}

interface AnomalyAnalysis {
  anomalies: Anomaly[];
  insights: string[];
}

interface ComparativeAnalysis {
  insights: string[];
  comparisons: any[];
  recommendations: string[];
}

interface AnalysisSummary {
  overallHealth: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  keyInsights: string[];
  actionItems: string[];
  riskFactors: string[];
}

interface FullF29Analysis {
  seasonal: SeasonalAnalysis;
  trends: TrendAnalysis;
  anomalies: AnomalyAnalysis;
  comparative: ComparativeAnalysis;
  summary: AnalysisSummary;
}

export function useF29AnalyticsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const tasksRef = useRef<Map<string, WorkerTask>>(new Map());
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Inicializar Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      console.log('🚀 Inicializando F29 Advanced Analytics Worker...');
      
      const worker = new Worker('/workers/f29-analytics-calculator.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { taskId, success, result, error, type, timestamp } = e.data;

        // Mensaje de inicialización
        if (type === 'WORKER_READY') {
          console.log('✅ F29 Analytics Worker listo:', e.data.message);
          console.log('📊 Capacidades disponibles:', e.data.capabilities);
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
              task.reject(new Error(error || 'Error en F29 Analytics Worker'));
            }
            tasksRef.current.delete(taskId);
          }
        }
      };

      worker.onerror = (error) => {
        console.error('❌ Error en F29 Analytics Worker:', error);
        setWorkerError(error.message || 'Error desconocido en Worker');
        setIsWorkerReady(false);
      };

    } catch (error: any) {
      console.error('❌ Error creando F29 Analytics Worker:', error);
      setWorkerError(error.message || 'Error al crear Worker');
      setIsWorkerReady(false);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        console.log('🔌 Terminando F29 Analytics Worker...');
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
        reject(new Error('F29 Analytics Worker no está disponible'));
        return;
      }

      // Verificar que no se haya terminado el Worker
      if (workerRef.current.onmessage === null) {
        reject(new Error('F29 Analytics Worker terminado'));
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

        // Timeout de seguridad (15 segundos para análisis complejos)
        setTimeout(() => {
          if (tasksRef.current.has(taskId)) {
            tasksRef.current.delete(taskId);
            reject(new Error('Timeout: análisis tomó demasiado tiempo'));
          }
        }, 15000);
      } catch (error) {
        tasksRef.current.delete(taskId);
        reject(new Error(`Error enviando mensaje al Worker: ${error}`));
      }
    });
  }, [isWorkerReady]);

  // Detectar patrones estacionales
  const detectSeasonalPatterns = useCallback(async (f29Data: any[]): Promise<SeasonalAnalysis> => {
    if (!isWorkerReady) {
      return {
        hasSeasonality: false,
        patterns: [],
        confidence: 0,
        insights: ['Worker no disponible - análisis estacional no realizado']
      };
    }

    try {
      return await sendTask('DETECT_SEASONAL_PATTERNS', { f29Data });
    } catch (error) {
      console.warn('Error en análisis estacional:', error);
      return {
        hasSeasonality: false,
        patterns: [],
        confidence: 0,
        insights: ['Error en análisis estacional']
      };
    }
  }, [isWorkerReady, sendTask]);

  // Analizar tendencias y proyecciones
  const analyzeTrends = useCallback(async (f29Data: any[]): Promise<TrendAnalysis> => {
    if (!isWorkerReady) {
      return {
        trend: 'INSUFFICIENT_DATA',
        growth: 0,
        projections: [],
        insights: ['Worker no disponible - análisis de tendencias no realizado']
      };
    }

    try {
      return await sendTask('ANALYZE_TRENDS', { f29Data });
    } catch (error) {
      console.warn('Error en análisis de tendencias:', error);
      return {
        trend: 'INSUFFICIENT_DATA',
        growth: 0,
        projections: [],
        insights: ['Error en análisis de tendencias']
      };
    }
  }, [isWorkerReady, sendTask]);

  // Detectar anomalías
  const detectAnomalies = useCallback(async (f29Data: any[]): Promise<AnomalyAnalysis> => {
    if (!isWorkerReady) {
      return {
        anomalies: [],
        insights: ['Worker no disponible - detección de anomalías no realizada']
      };
    }

    try {
      return await sendTask('DETECT_ANOMALIES', { f29Data });
    } catch (error) {
      console.warn('Error en detección de anomalías:', error);
      return {
        anomalies: [],
        insights: ['Error en detección de anomalías']
      };
    }
  }, [isWorkerReady, sendTask]);

  // Análisis comparativo
  const performComparativeAnalysis = useCallback(async (f29Data: any[]): Promise<ComparativeAnalysis> => {
    if (!isWorkerReady) {
      return {
        insights: [],
        comparisons: [],
        recommendations: ['Worker no disponible - análisis comparativo no realizado']
      };
    }

    try {
      return await sendTask('PERFORM_COMPARATIVE_ANALYSIS', { f29Data });
    } catch (error) {
      console.warn('Error en análisis comparativo:', error);
      return {
        insights: [],
        comparisons: [],
        recommendations: ['Error en análisis comparativo']
      };
    }
  }, [isWorkerReady, sendTask]);

  // Análisis completo F29
  const performFullAnalysis = useCallback(async (f29Data: any[]): Promise<FullF29Analysis> => {
    if (!isWorkerReady) {
      return {
        seasonal: {
          hasSeasonality: false,
          patterns: [],
          confidence: 0,
          insights: []
        },
        trends: {
          trend: 'INSUFFICIENT_DATA',
          growth: 0,
          projections: [],
          insights: []
        },
        anomalies: {
          anomalies: [],
          insights: []
        },
        comparative: {
          insights: [],
          comparisons: [],
          recommendations: []
        },
        summary: {
          overallHealth: 'POOR',
          keyInsights: ['Worker no disponible'],
          actionItems: [],
          riskFactors: ['Sistema de análisis no operativo']
        }
      };
    }

    try {
      console.log(`🧠 Realizando análisis completo F29 de ${f29Data.length} períodos...`);
      const startTime = performance.now();
      
      const result = await sendTask('FULL_F29_ANALYSIS', { f29Data });
      
      const duration = performance.now() - startTime;
      console.log(`✅ Análisis F29 completado en ${Math.round(duration)}ms`);
      
      return result;
    } catch (error) {
      console.warn('Error en análisis completo F29:', error);
      throw error;
    }
  }, [isWorkerReady, sendTask]);

  return {
    isWorkerReady,
    workerError,
    detectSeasonalPatterns,
    analyzeTrends,
    detectAnomalies,
    performComparativeAnalysis,
    performFullAnalysis
  };
}