// =============================================
// WEB WORKER: CROSS-MODULE ANALYTICS ENGINE
// Análisis integral F29 + Activos + Indicadores Económicos
// =============================================

// ========================================
// ANÁLISIS DE ROI DE ACTIVOS FIJOS
// ========================================

function analyzeAssetsROI(f29Data, fixedAssetsData) {
  if (!Array.isArray(f29Data) || !Array.isArray(fixedAssetsData)) {
    return {
      insights: ['Datos insuficientes para análisis de ROI'],
      correlations: [],
      recommendations: []
    };
  }

  const insights = [];
  const correlations = [];
  const recommendations = [];

  // Calcular valor total de activos y ventas por período
  const assetInvestmentByPeriod = {};
  const salesByPeriod = {};

  // Organizar datos F29 por período
  f29Data.forEach(f29 => {
    if (f29.period && f29.ventas_netas) {
      const period = f29.period.toString();
      const year = period.substring(0, 4);
      if (!salesByPeriod[year]) salesByPeriod[year] = 0;
      salesByPeriod[year] += parseFloat(f29.ventas_netas);
    }
  });

  // Organizar activos por año de compra
  fixedAssetsData.forEach(asset => {
    if (asset.purchase_date && asset.purchase_value) {
      const year = new Date(asset.purchase_date).getFullYear().toString();
      if (!assetInvestmentByPeriod[year]) assetInvestmentByPeriod[year] = 0;
      assetInvestmentByPeriod[year] += parseFloat(asset.purchase_value);
    }
  });

  // Calcular correlaciones ROI
  const commonYears = Object.keys(salesByPeriod).filter(year => assetInvestmentByPeriod[year]);
  
  if (commonYears.length >= 2) {
    let totalROI = 0;
    let validROICalculations = 0;

    commonYears.forEach(year => {
      const investment = assetInvestmentByPeriod[year];
      const sales = salesByPeriod[year];
      
      if (investment > 0) {
        const roi = ((sales - investment) / investment) * 100;
        correlations.push({
          year: year,
          investment: investment,
          sales: sales,
          roi: Math.round(roi * 100) / 100,
          efficiency: sales / investment
        });
        
        totalROI += roi;
        validROICalculations++;
      }
    });

    if (validROICalculations > 0) {
      const avgROI = totalROI / validROICalculations;
      
      insights.push(`ROI promedio de activos fijos: ${Math.round(avgROI)}%`);
      
      if (avgROI > 200) {
        insights.push('Excelente retorno de inversión en activos - estrategia muy efectiva');
        recommendations.push('Considera incrementar inversión en activos similares');
      } else if (avgROI > 100) {
        insights.push('Buen retorno de inversión en activos fijos');
        recommendations.push('Mantén la estrategia actual de inversión en activos');
      } else if (avgROI > 0) {
        insights.push('Retorno positivo pero moderado en activos fijos');
        recommendations.push('Evalúa optimización de uso de activos existentes');
      } else {
        insights.push('⚠️ Retorno negativo en inversión de activos fijos');
        recommendations.push('Urgente: revisar estrategia de inversión en activos');
      }

      // Encontrar el año con mejor ROI
      const bestROI = correlations.reduce((best, current) => 
        current.roi > best.roi ? current : best
      );
      
      insights.push(`Mejor año de inversión: ${bestROI.year} con ROI del ${bestROI.roi}%`);
    }
  }

  // Análisis de eficiencia por peso del activo en ventas
  const totalAssetValue = fixedAssetsData.reduce((sum, asset) => sum + parseFloat(asset.purchase_value || 0), 0);
  const totalSales = Object.values(salesByPeriod).reduce((sum, sales) => sum + sales, 0);
  
  if (totalAssetValue > 0 && totalSales > 0) {
    const assetToSalesRatio = (totalAssetValue / totalSales) * 100;
    
    insights.push(`Ratio activos/ventas: ${Math.round(assetToSalesRatio)}%`);
    
    if (assetToSalesRatio < 10) {
      insights.push('Operación muy eficiente con pocos activos fijos');
      recommendations.push('Modelo de negocio eficiente - considera expansión');
    } else if (assetToSalesRatio < 25) {
      insights.push('Balance saludable entre activos y ventas');
    } else if (assetToSalesRatio < 50) {
      insights.push('Ratio alto de activos vs ventas - revisar utilización');
      recommendations.push('Optimiza el uso de activos existentes antes de invertir en nuevos');
    } else {
      insights.push('⚠️ Ratio muy alto de activos vs ventas - posible sobre-inversión');
      recommendations.push('Crítico: revisar estrategia de activos fijos - posible sobre-capitalización');
    }
  }

  return {
    insights,
    correlations,
    recommendations,
    metrics: {
      totalAssetValue,
      totalSales,
      assetToSalesRatio: totalAssetValue > 0 && totalSales > 0 ? (totalAssetValue / totalSales) * 100 : 0,
      avgROI: correlations.length > 0 ? correlations.reduce((s, c) => s + c.roi, 0) / correlations.length : 0
    }
  };
}

// ========================================
// CORRELACIONES CON INDICADORES ECONÓMICOS
// ========================================

function analyzeEconomicCorrelations(f29Data, economicIndicators) {
  if (!Array.isArray(f29Data) || !Array.isArray(economicIndicators)) {
    return {
      correlations: [],
      insights: ['Datos insuficientes para análisis de correlaciones económicas'],
      predictions: []
    };
  }

  const correlations = [];
  const insights = [];
  const predictions = [];

  // Organizar datos por período para análisis temporal
  const dataByPeriod = {};
  
  // Organizar F29 por período
  f29Data.forEach(f29 => {
    if (f29.period && f29.ventas_netas) {
      const period = f29.period.toString();
      if (!dataByPeriod[period]) {
        dataByPeriod[period] = { sales: 0, indicators: {} };
      }
      dataByPeriod[period].sales += parseFloat(f29.ventas_netas);
    }
  });

  // Organizar indicadores por período (convertir fecha a YYYYMM)
  economicIndicators.forEach(indicator => {
    if (indicator.date && indicator.value && indicator.code) {
      const date = new Date(indicator.date);
      const period = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (dataByPeriod[period]) {
        dataByPeriod[period].indicators[indicator.code] = parseFloat(indicator.value);
      }
    }
  });

  // Análisis de correlación UF vs Ventas
  const ufCorrelation = analyzeIndicatorCorrelation(dataByPeriod, 'UF', 'Unidad de Fomento');
  if (ufCorrelation) correlations.push(ufCorrelation);

  // Análisis de correlación USD vs Ventas
  const usdCorrelation = analyzeIndicatorCorrelation(dataByPeriod, 'USD', 'Dólar');
  if (usdCorrelation) correlations.push(usdCorrelation);

  // Análisis de correlación TPM vs Ventas
  const tpmCorrelation = analyzeIndicatorCorrelation(dataByPeriod, 'TPM', 'Tasa Política Monetaria');
  if (tpmCorrelation) correlations.push(tpmCorrelation);

  // Generar insights basados en correlaciones
  correlations.forEach(corr => {
    if (Math.abs(corr.correlation) > 0.6) {
      const direction = corr.correlation > 0 ? 'positiva' : 'negativa';
      const strength = Math.abs(corr.correlation) > 0.8 ? 'muy fuerte' : 'fuerte';
      
      insights.push(`Correlación ${strength} ${direction} entre ${corr.indicatorName} y ventas (${Math.round(corr.correlation * 100)}%)`);
      
      if (corr.code === 'UF' && corr.correlation > 0.6) {
        insights.push('Tus ventas se benefician cuando sube la UF - considera indexar precios');
        predictions.push('Si la UF sigue subiendo, espera crecimiento en ventas');
      } else if (corr.code === 'USD' && corr.correlation > 0.6) {
        insights.push('Ventas correlacionadas positivamente con el dólar - negocio ligado a importaciones/exportaciones');
        predictions.push('Fluctuaciones del dólar impactarán directamente tus ventas');
      } else if (corr.code === 'TPM' && corr.correlation < -0.6) {
        insights.push('Ventas bajan cuando sube la tasa de interés - negocio sensible al crédito');
        predictions.push('Si el Banco Central sube tasas, prepárate para menor demanda');
      }
    } else if (Math.abs(corr.correlation) < 0.2) {
      insights.push(`Tu negocio es independiente de ${corr.indicatorName} - buena diversificación`);
    }
  });

  // Análisis de volatilidad vs indicadores
  const salesVolatility = calculateVolatility(Object.values(dataByPeriod).map(d => d.sales));
  if (salesVolatility > 0.3) {
    insights.push('⚠️ Alta volatilidad en ventas - vulnerable a shocks económicos');
    predictions.push('Considera estrategias de diversificación para reducir volatilidad');
  } else if (salesVolatility < 0.1) {
    insights.push('✅ Ventas muy estables - resistente a fluctuaciones económicas');
  }

  return {
    correlations,
    insights,
    predictions,
    metrics: {
      salesVolatility: Math.round(salesVolatility * 1000) / 1000,
      strongCorrelations: correlations.filter(c => Math.abs(c.correlation) > 0.6).length,
      totalPeriods: Object.keys(dataByPeriod).length
    }
  };
}

function analyzeIndicatorCorrelation(dataByPeriod, indicatorCode, indicatorName) {
  const periods = Object.keys(dataByPeriod);
  const validPeriods = periods.filter(p => 
    dataByPeriod[p].sales > 0 && dataByPeriod[p].indicators[indicatorCode]
  );

  if (validPeriods.length < 3) return null;

  const salesValues = validPeriods.map(p => dataByPeriod[p].sales);
  const indicatorValues = validPeriods.map(p => dataByPeriod[p].indicators[indicatorCode]);

  const correlation = calculateCorrelation(salesValues, indicatorValues);
  
  return {
    code: indicatorCode,
    indicatorName,
    correlation: Math.round(correlation * 1000) / 1000,
    periods: validPeriods.length,
    avgSales: salesValues.reduce((s, v) => s + v, 0) / salesValues.length,
    avgIndicator: indicatorValues.reduce((s, v) => s + v, 0) / indicatorValues.length
  };
}

// ========================================
// ANÁLISIS INTEGRAL DE SALUD EMPRESARIAL
// ========================================

function performIntegratedBusinessHealth(f29Data, fixedAssetsData, economicIndicators) {
  const f29Analysis = analyzeF29Health(f29Data);
  const assetsAnalysis = analyzeAssetsHealth(fixedAssetsData);
  const economicAnalysis = analyzeEconomicExposure(f29Data, economicIndicators);
  
  // Calcular score integrado de salud (0-100)
  let healthScore = 50; // Base score
  
  // Componente F29 (40% del score total)
  if (f29Analysis.growth > 15) healthScore += 16;
  else if (f29Analysis.growth > 5) healthScore += 8;
  else if (f29Analysis.growth < -10) healthScore -= 16;
  else if (f29Analysis.growth < 0) healthScore -= 8;
  
  if (f29Analysis.margin > 30) healthScore += 8;
  else if (f29Analysis.margin > 20) healthScore += 4;
  else if (f29Analysis.margin < 10) healthScore -= 8;
  
  // Componente Activos (30% del score total)
  if (assetsAnalysis.roi > 200) healthScore += 12;
  else if (assetsAnalysis.roi > 100) healthScore += 6;
  else if (assetsAnalysis.roi < 0) healthScore -= 12;
  
  if (assetsAnalysis.utilization > 80) healthScore += 6;
  else if (assetsAnalysis.utilization < 50) healthScore -= 6;
  
  // Componente Económico (30% del score total)
  if (economicAnalysis.volatility < 0.1) healthScore += 12;
  else if (economicAnalysis.volatility > 0.4) healthScore -= 12;
  
  if (economicAnalysis.diversification > 0.7) healthScore += 6;
  else if (economicAnalysis.diversification < 0.3) healthScore -= 6;

  // Normalizar score entre 0-100
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  const overallHealth = 
    healthScore >= 80 ? 'EXCELLENT' :
    healthScore >= 65 ? 'GOOD' :
    healthScore >= 45 ? 'AVERAGE' :
    'POOR';

  return {
    overallScore: Math.round(healthScore),
    overallHealth,
    components: {
      f29: f29Analysis,
      assets: assetsAnalysis,
      economic: economicAnalysis
    },
    integralInsights: generateIntegralInsights(f29Analysis, assetsAnalysis, economicAnalysis, healthScore),
    strategicRecommendations: generateStrategicRecommendations(f29Analysis, assetsAnalysis, economicAnalysis, healthScore)
  };
}

function analyzeF29Health(f29Data) {
  if (!Array.isArray(f29Data) || f29Data.length === 0) {
    return { growth: 0, margin: 0, stability: 0, insights: [] };
  }

  const sales = f29Data.map(f => parseFloat(f.ventas_netas || 0)).filter(s => s > 0);
  const purchases = f29Data.map(f => parseFloat(f.compras_netas || 0)).filter(p => p > 0);
  
  // Crecimiento
  const growth = sales.length >= 2 ? 
    ((sales[sales.length - 1] - sales[0]) / sales[0]) * 100 : 0;
  
  // Margen promedio
  const margins = f29Data.map(f => {
    const s = parseFloat(f.ventas_netas || 0);
    const p = parseFloat(f.compras_netas || 0);
    return s > 0 ? ((s - p) / s) * 100 : 0;
  }).filter(m => m !== 0);
  
  const margin = margins.length > 0 ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
  
  // Estabilidad (coeficiente de variación inverso)
  const salesMean = sales.reduce((s, v) => s + v, 0) / sales.length;
  const salesStdDev = Math.sqrt(sales.reduce((s, v) => s + Math.pow(v - salesMean, 2), 0) / sales.length);
  const stability = salesMean > 0 ? Math.max(0, 100 - (salesStdDev / salesMean) * 100) : 0;

  return {
    growth: Math.round(growth * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    stability: Math.round(stability * 100) / 100,
    insights: [
      `Crecimiento: ${growth > 0 ? '+' : ''}${Math.round(growth)}%`,
      `Margen promedio: ${Math.round(margin)}%`,
      `Estabilidad: ${Math.round(stability)}%`
    ]
  };
}

function analyzeAssetsHealth(fixedAssetsData) {
  if (!Array.isArray(fixedAssetsData) || fixedAssetsData.length === 0) {
    return { roi: 0, utilization: 0, age: 0, insights: [] };
  }

  const totalValue = fixedAssetsData.reduce((s, a) => s + parseFloat(a.purchase_value || 0), 0);
  const avgAge = fixedAssetsData.reduce((s, a) => {
    const purchaseDate = new Date(a.purchase_date);
    const ageYears = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return s + ageYears;
  }, 0) / fixedAssetsData.length;

  // ROI estimado (simplificado)
  const roi = totalValue > 0 ? (totalValue * 0.15) : 0; // Asumiendo 15% retorno anual
  
  // Utilización estimada basada en edad vs vida útil
  const utilization = fixedAssetsData.reduce((s, a) => {
    const ageYears = (Date.now() - new Date(a.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const usefulLife = parseFloat(a.useful_life_years || 5);
    return s + Math.min(100, (ageYears / usefulLife) * 100);
  }, 0) / fixedAssetsData.length;

  return {
    roi: Math.round(roi * 100) / 100,
    utilization: Math.round(utilization * 100) / 100,
    age: Math.round(avgAge * 100) / 100,
    insights: [
      `ROI estimado: ${Math.round(roi)}%`,
      `Utilización promedio: ${Math.round(utilization)}%`,
      `Edad promedio: ${Math.round(avgAge * 10) / 10} años`
    ]
  };
}

function analyzeEconomicExposure(f29Data, economicIndicators) {
  // Análisis simplificado de exposición económica
  const salesVolatility = calculateVolatility(f29Data.map(f => parseFloat(f.ventas_netas || 0)));
  
  // Diversificación estimada (inversa de volatilidad)
  const diversification = Math.max(0, 1 - salesVolatility);
  
  return {
    volatility: Math.round(salesVolatility * 1000) / 1000,
    diversification: Math.round(diversification * 1000) / 1000,
    insights: [
      `Volatilidad: ${Math.round(salesVolatility * 100)}%`,
      `Diversificación: ${Math.round(diversification * 100)}%`
    ]
  };
}

// ========================================
// FUNCIONES AUXILIARES MATEMÁTICAS
// ========================================

function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const sumY2 = y.reduce((s, v) => s + v * v, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return mean === 0 ? 0 : stdDev / mean;
}

function generateIntegralInsights(f29Analysis, assetsAnalysis, economicAnalysis, healthScore) {
  const insights = [];
  
  // Insights basados en score general
  if (healthScore >= 80) {
    insights.push('🌟 Excelente salud empresarial integral - líder en tu sector');
  } else if (healthScore >= 65) {
    insights.push('✅ Buena salud empresarial - sólida base para crecimiento');
  } else if (healthScore >= 45) {
    insights.push('⚠️ Salud empresarial promedio - oportunidades de mejora identificadas');
  } else {
    insights.push('🚨 Salud empresarial requiere atención urgente');
  }
  
  // Insights combinados
  if (f29Analysis.growth > 10 && assetsAnalysis.roi > 100) {
    insights.push('💎 Combinación perfecta: alto crecimiento con ROI eficiente de activos');
  }
  
  if (f29Analysis.margin > 25 && economicAnalysis.volatility < 0.2) {
    insights.push('🛡️ Negocio resiliente: buenos márgenes con baja volatilidad económica');
  }
  
  if (assetsAnalysis.utilization > 80 && f29Analysis.growth > 5) {
    insights.push('⚡ Activos bien utilizados generando crecimiento sostenido');
  }

  return insights;
}

function generateStrategicRecommendations(f29Analysis, assetsAnalysis, economicAnalysis, healthScore) {
  const recommendations = [];
  
  // Recomendaciones basadas en componentes débiles
  if (f29Analysis.growth < 0) {
    recommendations.push('🎯 Prioritario: implementar estrategia de crecimiento en ventas');
  }
  
  if (f29Analysis.margin < 15) {
    recommendations.push('💰 Crítico: optimizar estructura de costos para mejorar márgenes');
  }
  
  if (assetsAnalysis.roi < 50) {
    recommendations.push('🏭 Evaluar eficiencia de activos fijos - considerar optimización o venta');
  }
  
  if (economicAnalysis.volatility > 0.3) {
    recommendations.push('🌍 Implementar estrategias de diversificación para reducir riesgo económico');
  }
  
  // Recomendaciones de crecimiento
  if (healthScore >= 70) {
    recommendations.push('🚀 Considera expansión o nuevas líneas de negocio');
  }
  
  if (assetsAnalysis.utilization < 60) {
    recommendations.push('📊 Optimizar uso de activos existentes antes de nuevas inversiones');
  }

  return recommendations;
}

// ========================================
// EVENT LISTENER PRINCIPAL
// ========================================

self.onmessage = function(e) {
  const { type, data, taskId } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'ANALYZE_ASSETS_ROI':
        result = analyzeAssetsROI(data.f29Data, data.fixedAssetsData);
        break;
        
      case 'ANALYZE_ECONOMIC_CORRELATIONS':
        result = analyzeEconomicCorrelations(data.f29Data, data.economicIndicators);
        break;
        
      case 'PERFORM_INTEGRATED_ANALYSIS':
        result = performIntegratedBusinessHealth(
          data.f29Data, 
          data.fixedAssetsData, 
          data.economicIndicators
        );
        break;
        
      case 'FULL_CROSS_MODULE_ANALYSIS':
        // Análisis completo combinando todas las funciones
        const assetsROI = analyzeAssetsROI(data.f29Data, data.fixedAssetsData);
        const economicCorr = analyzeEconomicCorrelations(data.f29Data, data.economicIndicators);
        const integratedHealth = performIntegratedBusinessHealth(
          data.f29Data, 
          data.fixedAssetsData, 
          data.economicIndicators
        );
        
        result = {
          assetsROI,
          economicCorrelations: economicCorr,
          integratedHealth,
          executiveSummary: generateExecutiveSummary(assetsROI, economicCorr, integratedHealth)
        };
        break;
        
      default:
        throw new Error(`Tipo de análisis cross-module no reconocido: ${type}`);
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

function generateExecutiveSummary(assetsROI, economicCorr, integratedHealth) {
  const summary = {
    overallAssessment: integratedHealth.overallHealth,
    score: integratedHealth.overallScore,
    keyStrengths: [],
    majorRisks: [],
    strategicPriorities: [],
    businessIntelligence: []
  };

  // Identificar fortalezas clave
  if (assetsROI.metrics.avgROI > 100) {
    summary.keyStrengths.push('ROI excepcional en activos fijos');
  }
  
  if (integratedHealth.components.f29.growth > 15) {
    summary.keyStrengths.push('Crecimiento sostenido superior al mercado');
  }
  
  if (economicCorr.metrics.salesVolatility < 0.2) {
    summary.keyStrengths.push('Alta resistencia a volatilidad económica');
  }

  // Identificar riesgos mayores
  if (assetsROI.metrics.avgROI < 0) {
    summary.majorRisks.push('ROI negativo en activos fijos - destrucción de valor');
  }
  
  if (integratedHealth.components.f29.growth < -5) {
    summary.majorRisks.push('Tendencia decreciente en ventas');
  }
  
  if (economicCorr.correlations.some(c => Math.abs(c.correlation) > 0.8)) {
    summary.majorRisks.push('Alta dependencia de indicadores económicos específicos');
  }

  // Prioridades estratégicas
  if (integratedHealth.overallScore < 60) {
    summary.strategicPriorities.push('Transformación integral del modelo de negocio');
  } else if (integratedHealth.overallScore < 80) {
    summary.strategicPriorities.push('Optimización de eficiencias operacionales');
  } else {
    summary.strategicPriorities.push('Expansión y diversificación estratégica');
  }

  // Business Intelligence
  summary.businessIntelligence = [
    `Salud empresarial: ${integratedHealth.overallScore}/100`,
    `ROI activos: ${Math.round(assetsROI.metrics.avgROI)}%`,
    `Correlaciones económicas: ${economicCorr.correlations.length} detectadas`,
    `Volatilidad: ${Math.round(economicCorr.metrics.salesVolatility * 100)}%`
  ];

  return summary;
}

// Mensaje de inicialización
self.postMessage({
  type: 'WORKER_READY',
  message: 'Cross-Module Analytics Engine inicializado',
  capabilities: [
    'ANALYZE_ASSETS_ROI',
    'ANALYZE_ECONOMIC_CORRELATIONS',
    'PERFORM_INTEGRATED_ANALYSIS',
    'FULL_CROSS_MODULE_ANALYSIS'
  ]
});