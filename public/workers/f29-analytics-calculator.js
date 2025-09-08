// =============================================
// WEB WORKER: F29 ADVANCED ANALYTICS ENGINE
// Análisis comparativo inteligente para PyMEs chilenas
// =============================================

// ========================================
// DETECCIÓN DE PATRONES ESTACIONALES
// ========================================

function detectSeasonalPatterns(f29Data) {
  if (!Array.isArray(f29Data) || f29Data.length < 6) {
    return {
      hasSeasonality: false,
      patterns: [],
      confidence: 0,
      insights: []
    };
  }

  // Agrupar por mes del año para detectar estacionalidad
  const monthlyData = {};
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  f29Data.forEach(f29 => {
    if (f29.period && f29.ventas_netas) {
      const month = parseInt(f29.period.toString().slice(-2)) - 1; // 0-11
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }
      monthlyData[month].push(parseFloat(f29.ventas_netas));
    }
  });

  // Calcular promedios mensuales y detectar patrones
  const monthlyAverages = [];
  const patterns = [];
  
  for (let month = 0; month < 12; month++) {
    if (monthlyData[month] && monthlyData[month].length > 0) {
      const avg = monthlyData[month].reduce((sum, val) => sum + val, 0) / monthlyData[month].length;
      monthlyAverages[month] = avg;
    }
  }

  // Detectar meses pico y valle
  const validAverages = monthlyAverages.filter(avg => avg !== undefined);
  if (validAverages.length >= 6) {
    const maxAvg = Math.max(...validAverages);
    const minAvg = Math.min(...validAverages);
    const variation = ((maxAvg - minAvg) / minAvg) * 100;

    // Si hay más de 30% de variación, hay estacionalidad significativa
    if (variation > 30) {
      const peakMonth = monthlyAverages.indexOf(maxAvg);
      const lowMonth = monthlyAverages.indexOf(minAvg);

      patterns.push({
        type: 'SEASONAL_PEAK',
        month: peakMonth,
        monthName: monthNames[peakMonth],
        value: maxAvg,
        percentageAboveAverage: ((maxAvg - (validAverages.reduce((s, v) => s + v, 0) / validAverages.length)) / (validAverages.reduce((s, v) => s + v, 0) / validAverages.length)) * 100
      });

      patterns.push({
        type: 'SEASONAL_LOW',
        month: lowMonth,
        monthName: monthNames[lowMonth],
        value: minAvg,
        percentageBelowAverage: (((validAverages.reduce((s, v) => s + v, 0) / validAverages.length) - minAvg) / (validAverages.reduce((s, v) => s + v, 0) / validAverages.length)) * 100
      });

      return {
        hasSeasonality: true,
        patterns,
        confidence: Math.min(95, 60 + (variation - 30) * 0.5),
        variation: Math.round(variation),
        insights: generateSeasonalInsights(patterns, variation)
      };
    }
  }

  return {
    hasSeasonality: false,
    patterns: [],
    confidence: 0,
    insights: ['No se detectaron patrones estacionales significativos con los datos disponibles.']
  };
}

function generateSeasonalInsights(patterns, variation) {
  const insights = [];
  const peakPattern = patterns.find(p => p.type === 'SEASONAL_PEAK');
  const lowPattern = patterns.find(p => p.type === 'SEASONAL_LOW');

  if (peakPattern) {
    insights.push(`${peakPattern.monthName} es tu mes más fuerte con ventas ${Math.round(peakPattern.percentageAboveAverage)}% superiores al promedio`);
  }

  if (lowPattern) {
    insights.push(`${lowPattern.monthName} es tu mes más débil con ventas ${Math.round(lowPattern.percentageBelowAverage)}% por debajo del promedio`);
  }

  if (variation > 50) {
    insights.push('Tu negocio tiene alta estacionalidad - considera ajustar inventario y capital de trabajo según estos patrones');
  }

  // Insights específicos por meses chilenos
  if (peakPattern) {
    if ([11, 0].includes(peakPattern.month)) { // Diciembre, Enero
      insights.push('Patrón típico de retail/turismo - aprovecha las fiestas de fin de año');
    } else if ([2, 3].includes(peakPattern.month)) { // Marzo, Abril
      insights.push('Patrón de regreso a clases/otoño - optimiza inventario para esta época');
    }
  }

  return insights;
}

// ========================================
// ANÁLISIS DE TENDENCIAS Y PROYECCIONES
// ========================================

function analyzeTrends(f29Data) {
  if (!Array.isArray(f29Data) || f29Data.length < 3) {
    return {
      trend: 'INSUFFICIENT_DATA',
      growth: 0,
      projections: [],
      insights: []
    };
  }

  // Ordenar por período
  const sortedData = f29Data
    .filter(f29 => f29.period && f29.ventas_netas)
    .sort((a, b) => parseInt(a.period) - parseInt(b.period));

  if (sortedData.length < 3) {
    return {
      trend: 'INSUFFICIENT_DATA',
      growth: 0,
      projections: [],
      insights: []
    };
  }

  // Calcular tendencia usando regresión lineal simple
  const trends = calculateLinearTrend(sortedData);
  const growth = calculateGrowthRate(sortedData);
  const projections = generateProjections(sortedData, trends);

  return {
    trend: classifyTrend(trends.slope),
    growth: Math.round(growth * 100) / 100,
    slope: trends.slope,
    r2: trends.r2,
    projections: projections,
    insights: generateTrendInsights(trends, growth, sortedData)
  };
}

function calculateLinearTrend(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  data.forEach((item, index) => {
    const x = index + 1; // Período secuencial
    const y = parseFloat(item.ventas_netas);
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calcular R² (coeficiente de determinación)
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  data.forEach((item, index) => {
    const x = index + 1;
    const y = parseFloat(item.ventas_netas);
    const yPred = slope * x + intercept;
    
    ssRes += Math.pow(y - yPred, 2);
    ssTot += Math.pow(y - meanY, 2);
  });
  
  const r2 = 1 - (ssRes / ssTot);

  return { slope, intercept, r2: Math.max(0, r2) };
}

function calculateGrowthRate(data) {
  if (data.length < 2) return 0;
  
  const firstValue = parseFloat(data[0].ventas_netas);
  const lastValue = parseFloat(data[data.length - 1].ventas_netas);
  const periods = data.length - 1;
  
  if (firstValue === 0) return 0;
  
  // Crecimiento anualizado
  const monthsSpan = periods;
  const annualizedGrowth = (Math.pow(lastValue / firstValue, 12 / monthsSpan) - 1) * 100;
  
  return isFinite(annualizedGrowth) ? annualizedGrowth : 0;
}

function classifyTrend(slope) {
  if (Math.abs(slope) < 1000) return 'STABLE';
  return slope > 0 ? 'GROWING' : 'DECLINING';
}

function generateProjections(data, trends) {
  const projections = [];
  const lastPeriod = parseInt(data[data.length - 1].period);
  
  for (let i = 1; i <= 6; i++) {
    const futureX = data.length + i;
    const projectedValue = trends.slope * futureX + trends.intercept;
    
    // Calcular período futuro
    let futureYear = Math.floor(lastPeriod / 100);
    let futureMonth = (lastPeriod % 100) + i;
    
    while (futureMonth > 12) {
      futureMonth -= 12;
      futureYear += 1;
    }
    
    const futurePeriod = futureYear * 100 + futureMonth;
    
    projections.push({
      period: futurePeriod,
      periodDisplay: `${futureMonth.toString().padStart(2, '0')}/${futureYear}`,
      projectedSales: Math.max(0, Math.round(projectedValue)),
      confidence: Math.max(50, 90 - (i * 5)) // Confianza decrece con el tiempo
    });
  }
  
  return projections;
}

function generateTrendInsights(trends, growth, data) {
  const insights = [];
  
  if (trends.r2 > 0.7) {
    insights.push(`Tendencia ${trends.r2 > 0.85 ? 'muy' : ''} consistente detectada (R² = ${Math.round(trends.r2 * 100)}%)`);
  }
  
  if (growth > 15) {
    insights.push(`Excelente crecimiento del ${Math.round(growth)}% anualizado - considera expandir operaciones`);
  } else if (growth > 5) {
    insights.push(`Crecimiento positivo del ${Math.round(growth)}% anualizado - mantén la estrategia actual`);
  } else if (growth < -10) {
    insights.push(`Decrecimiento del ${Math.round(Math.abs(growth))}% anualizado - revisa estrategia comercial urgente`);
  } else if (growth < 0) {
    insights.push(`Leve decrecimiento del ${Math.round(Math.abs(growth))}% - monitorea de cerca y ajusta`);
  } else {
    insights.push('Crecimiento estable - considera estrategias para acelerar el crecimiento');
  }
  
  // Análisis de volatilidad
  const values = data.map(d => parseFloat(d.ventas_netas));
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  
  if (cv > 0.3) {
    insights.push('Alta volatilidad en ventas - considera diversificar productos/clientes');
  }
  
  return insights;
}

// ========================================
// DETECCIÓN DE ANOMALÍAS
// ========================================

function detectAnomalies(f29Data) {
  if (!Array.isArray(f29Data) || f29Data.length < 4) {
    return {
      anomalies: [],
      insights: []
    };
  }

  const anomalies = [];
  const insights = [];
  
  // Calcular estadísticas base
  const values = f29Data
    .filter(f29 => f29.ventas_netas)
    .map(f29 => parseFloat(f29.ventas_netas));
  
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  
  // Detectar outliers usando Z-score (>2.5 desviaciones estándar)
  f29Data.forEach(f29 => {
    if (f29.ventas_netas) {
      const value = parseFloat(f29.ventas_netas);
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > 2.5) {
        anomalies.push({
          period: f29.period,
          value: value,
          deviation: Math.round(((value - mean) / mean) * 100),
          type: value > mean ? 'OUTLIER_HIGH' : 'OUTLIER_LOW',
          zScore: Math.round(zScore * 100) / 100,
          severity: zScore > 3 ? 'CRITICAL' : 'WARNING'
        });
      }
    }
  });

  // Detectar caídas abruptas (>40% respecto al período anterior)
  for (let i = 1; i < f29Data.length; i++) {
    const current = parseFloat(f29Data[i].ventas_netas || 0);
    const previous = parseFloat(f29Data[i-1].ventas_netas || 0);
    
    if (previous > 0) {
      const change = ((current - previous) / previous) * 100;
      
      if (change < -40) {
        anomalies.push({
          period: f29Data[i].period,
          value: current,
          previousValue: previous,
          change: Math.round(change),
          type: 'SUDDEN_DROP',
          severity: change < -60 ? 'CRITICAL' : 'WARNING'
        });
      } else if (change > 100) {
        anomalies.push({
          period: f29Data[i].period,
          value: current,
          previousValue: previous,
          change: Math.round(change),
          type: 'SUDDEN_SPIKE',
          severity: change > 200 ? 'CRITICAL' : 'WARNING'
        });
      }
    }
  }

  // Generar insights sobre anomalías
  if (anomalies.length === 0) {
    insights.push('No se detectaron anomalías significativas en tus datos F29');
  } else {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL');
    const warningAnomalies = anomalies.filter(a => a.severity === 'WARNING');
    
    if (criticalAnomalies.length > 0) {
      insights.push(`${criticalAnomalies.length} anomalía(s) crítica(s) detectada(s) - revisar causas inmediatamente`);
    }
    
    if (warningAnomalies.length > 0) {
      insights.push(`${warningAnomalies.length} anomalía(s) menor(es) detectada(s) - monitorear evolución`);
    }
    
    const drops = anomalies.filter(a => a.type === 'SUDDEN_DROP');
    if (drops.length > 0) {
      insights.push('Detectadas caídas abruptas de ventas - identificar factores externos o internos');
    }
  }

  return {
    anomalies: anomalies.slice(0, 10), // Limitar a 10 más relevantes
    insights
  };
}

// ========================================
// ANÁLISIS COMPARATIVO INTELIGENTE
// ========================================

function performComparativeAnalysis(f29Data) {
  if (!Array.isArray(f29Data) || f29Data.length < 2) {
    return {
      insights: [],
      comparisons: [],
      recommendations: []
    };
  }

  const insights = [];
  const comparisons = [];
  const recommendations = [];

  // Análisis de eficiencia fiscal
  const fiscalEfficiency = analyzeFiscalEfficiency(f29Data);
  if (fiscalEfficiency.insights.length > 0) {
    insights.push(...fiscalEfficiency.insights);
    comparisons.push(...fiscalEfficiency.comparisons);
  }

  // Análisis de comportamiento de compras vs ventas
  const purchaseAnalysis = analyzePurchasePatterns(f29Data);
  if (purchaseAnalysis.insights.length > 0) {
    insights.push(...purchaseAnalysis.insights);
  }

  // Análisis de mejores y peores períodos
  const periodAnalysis = analyzeBestWorstPeriods(f29Data);
  if (periodAnalysis.insights.length > 0) {
    insights.push(...periodAnalysis.insights);
    recommendations.push(...periodAnalysis.recommendations);
  }

  return {
    insights,
    comparisons,
    recommendations
  };
}

function analyzeFiscalEfficiency(f29Data) {
  const insights = [];
  const comparisons = [];

  f29Data.forEach(f29 => {
    if (f29.ventas_netas && f29.compras_netas) {
      const ventasNetas = parseFloat(f29.ventas_netas);
      const comprasNetas = parseFloat(f29.compras_netas);
      
      if (ventasNetas > 0) {
        const purchaseRatio = (comprasNetas / ventasNetas) * 100;
        const margin = ((ventasNetas - comprasNetas) / ventasNetas) * 100;
        
        comparisons.push({
          period: f29.period,
          purchaseRatio: Math.round(purchaseRatio),
          margin: Math.round(margin * 100) / 100,
          efficiency: margin > 30 ? 'EXCELLENT' : margin > 20 ? 'GOOD' : margin > 10 ? 'AVERAGE' : 'POOR'
        });
      }
    }
  });

  if (comparisons.length > 1) {
    const avgMargin = comparisons.reduce((s, c) => s + c.margin, 0) / comparisons.length;
    const bestPeriod = comparisons.reduce((best, current) => current.margin > best.margin ? current : best);
    const worstPeriod = comparisons.reduce((worst, current) => current.margin < worst.margin ? current : worst);

    insights.push(`Margen promedio: ${Math.round(avgMargin)}%`);
    insights.push(`Mejor eficiencia en período ${bestPeriod.period} con ${bestPeriod.margin}% de margen`);
    
    if (worstPeriod.margin < 15) {
      insights.push(`Período ${worstPeriod.period} mostró baja eficiencia (${worstPeriod.margin}% margen) - revisar costos`);
    }
  }

  return { insights, comparisons };
}

function analyzePurchasePatterns(f29Data) {
  const insights = [];
  
  const ratios = f29Data
    .filter(f29 => f29.ventas_netas && f29.compras_netas)
    .map(f29 => {
      const ventas = parseFloat(f29.ventas_netas);
      const compras = parseFloat(f29.compras_netas);
      return ventas > 0 ? (compras / ventas) * 100 : 0;
    });

  if (ratios.length > 0) {
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const maxRatio = Math.max(...ratios);
    const minRatio = Math.min(...ratios);
    
    insights.push(`Ratio promedio compras/ventas: ${Math.round(avgRatio)}%`);
    
    if (maxRatio - minRatio > 20) {
      insights.push('Alta variabilidad en ratio compras/ventas - considera estandarizar procesos de compra');
    }
    
    if (avgRatio > 80) {
      insights.push('Ratio compras/ventas alto - revisa márgenes y estructura de costos');
    } else if (avgRatio < 50) {
      insights.push('Excelente control de costos - margen superior al promedio del mercado');
    }
  }

  return { insights };
}

function analyzeBestWorstPeriods(f29Data) {
  const insights = [];
  const recommendations = [];

  const periods = f29Data
    .filter(f29 => f29.ventas_netas)
    .map(f29 => ({
      period: f29.period,
      ventas: parseFloat(f29.ventas_netas),
      month: parseInt(f29.period.toString().slice(-2))
    }))
    .sort((a, b) => b.ventas - a.ventas);

  if (periods.length >= 3) {
    const best = periods[0];
    const worst = periods[periods.length - 1];
    const difference = ((best.ventas - worst.ventas) / worst.ventas) * 100;
    
    insights.push(`Mejor período: ${formatPeriod(best.period)} con ${formatCurrency(best.ventas)}`);
    insights.push(`Período más bajo: ${formatPeriod(worst.period)} con ${formatCurrency(worst.ventas)}`);
    insights.push(`Diferencia entre mejor y peor período: ${Math.round(difference)}%`);

    // Recomendaciones basadas en los mejores períodos
    const bestMonths = periods.slice(0, Math.ceil(periods.length / 3)).map(p => p.month);
    const commonBestMonth = getMostFrequent(bestMonths);
    
    if (commonBestMonth) {
      const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][commonBestMonth - 1];
      recommendations.push(`${monthName} tiende a ser tu mes más fuerte - planifica campañas especiales`);
    }
  }

  return { insights, recommendations };
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function formatPeriod(period) {
  const year = Math.floor(period / 100);
  const month = period % 100;
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${monthNames[month - 1]} ${year}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount);
}

function getMostFrequent(arr) {
  const frequency = {};
  let maxCount = 0;
  let mostFrequent = null;
  
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
    if (frequency[item] > maxCount) {
      maxCount = frequency[item];
      mostFrequent = item;
    }
  });
  
  return mostFrequent;
}

// ========================================
// EVENT LISTENER PRINCIPAL
// ========================================

self.onmessage = function(e) {
  const { type, data, taskId } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'DETECT_SEASONAL_PATTERNS':
        result = detectSeasonalPatterns(data.f29Data);
        break;
        
      case 'ANALYZE_TRENDS':
        result = analyzeTrends(data.f29Data);
        break;
        
      case 'DETECT_ANOMALIES':
        result = detectAnomalies(data.f29Data);
        break;
        
      case 'PERFORM_COMPARATIVE_ANALYSIS':
        result = performComparativeAnalysis(data.f29Data);
        break;
        
      case 'FULL_F29_ANALYSIS':
        // Análisis completo combinando todas las funciones
        const seasonal = detectSeasonalPatterns(data.f29Data);
        const trends = analyzeTrends(data.f29Data);
        const anomalies = detectAnomalies(data.f29Data);
        const comparative = performComparativeAnalysis(data.f29Data);
        
        result = {
          seasonal,
          trends,
          anomalies,
          comparative,
          summary: generateAnalysisSummary(seasonal, trends, anomalies, comparative)
        };
        break;
        
      default:
        throw new Error(`Tipo de análisis no reconocido: ${type}`);
    }
    
    // Enviar resultado exitoso
    self.postMessage({
      taskId,
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Enviar error
    self.postMessage({
      taskId,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

function generateAnalysisSummary(seasonal, trends, anomalies, comparative) {
  const summary = {
    overallHealth: 'GOOD',
    keyInsights: [],
    actionItems: [],
    riskFactors: []
  };

  // Evaluar salud general
  let healthScore = 70; // Base score

  if (trends.growth > 10) healthScore += 15;
  else if (trends.growth < -5) healthScore -= 20;

  if (seasonal.hasSeasonality && seasonal.confidence > 80) healthScore += 10;
  if (anomalies.anomalies.filter(a => a.severity === 'CRITICAL').length > 0) healthScore -= 15;

  summary.overallHealth = healthScore > 80 ? 'EXCELLENT' : healthScore > 60 ? 'GOOD' : healthScore > 40 ? 'AVERAGE' : 'POOR';

  // Recopilar insights clave
  if (seasonal.insights.length > 0) summary.keyInsights.push(...seasonal.insights.slice(0, 2));
  if (trends.insights.length > 0) summary.keyInsights.push(...trends.insights.slice(0, 2));
  if (comparative.insights.length > 0) summary.keyInsights.push(...comparative.insights.slice(0, 2));

  // Action items
  if (comparative.recommendations.length > 0) {
    summary.actionItems.push(...comparative.recommendations.slice(0, 2));
  }

  if (trends.growth < 0) {
    summary.actionItems.push('Revisar estrategia comercial para revertir tendencia negativa');
  }

  // Risk factors
  if (anomalies.anomalies.length > 0) {
    summary.riskFactors.push(`${anomalies.anomalies.length} anomalías detectadas requieren atención`);
  }

  if (trends.r2 < 0.5) {
    summary.riskFactors.push('Tendencias inconsistentes - alta volatilidad en el negocio');
  }

  return summary;
}

// Mensaje de inicialización
self.postMessage({
  type: 'WORKER_READY',
  message: 'F29 Advanced Analytics Engine inicializado',
  capabilities: [
    'DETECT_SEASONAL_PATTERNS',
    'ANALYZE_TRENDS',
    'DETECT_ANOMALIES', 
    'PERFORM_COMPARATIVE_ANALYSIS',
    'FULL_F29_ANALYSIS'
  ]
});