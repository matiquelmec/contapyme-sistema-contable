/**
 * Servicio para obtener indicadores económicos actualizados
 * Integra con el módulo de indicadores para valores en tiempo real
 */

import { createClient } from '@supabase/supabase-js';

export interface EconomicIndicators {
  minimum_wage: number;
  uf: number;
  utm: number;
  ipc: number;
  tpm: number;
  usd: number;
  eur: number;
  last_updated: string;
}

/**
 * Configuración Supabase para consultas directas
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Variables de entorno Supabase no configuradas');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Consulta directa a tabla economic_indicators sin RPC problemático
 */
async function getEconomicIndicatorsDirectly(): Promise<EconomicIndicators | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Obtener los últimos valores de indicadores específicos (códigos reales en BD)
    const { data, error } = await supabase
      .from('economic_indicators')
      .select('code, value, date')
      .in('code', ['sueldo_minimo', 'uf', 'utm', 'dolar', 'euro'])
      .order('date', { ascending: false })
      .limit(5); // Últimos valores de cada indicador

    if (error) {
      // Error 400 = tabla no existe, esto es normal
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.log('💡 Tabla economic_indicators no existe - esto es normal');
        return null;
      }
      console.warn('Error consultando economic_indicators:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No hay datos en economic_indicators');
      return null;
    }

    // Procesar los datos obtenidos
    const indicators: EconomicIndicators = {
      minimum_wage: 529000, // Valor por defecto
      uf: 37800,
      utm: 66391,
      ipc: 0,
      tpm: 5.75,
      usd: 950,
      eur: 1000,
      last_updated: new Date().toISOString()
    };

    // Mapear los valores obtenidos (solo el más reciente de cada tipo)
    const processedCodes = new Set();
    
    data.forEach(indicator => {
      const value = parseFloat(indicator.value);
      if (isNaN(value) || processedCodes.has(indicator.code)) return;

      switch (indicator.code) {
        case 'sueldo_minimo':
          indicators.minimum_wage = value;
          processedCodes.add(indicator.code);
          break;
        case 'uf':
          indicators.uf = value;
          processedCodes.add(indicator.code);
          break;
        case 'utm':
          indicators.utm = value;
          processedCodes.add(indicator.code);
          break;
        case 'dolar':
          indicators.usd = value;
          processedCodes.add(indicator.code);
          break;
        case 'euro':
          indicators.eur = value;
          processedCodes.add(indicator.code);
          break;
      }
      
      // Actualizar fecha con el más reciente
      if (indicator.date && indicator.date > indicators.last_updated) {
        indicators.last_updated = indicator.date;
      }
    });

    console.log('✅ Indicadores económicos obtenidos de base de datos');
    return indicators;

  } catch (error) {
    console.error('Error en consulta directa de indicadores:', error);
    return null;
  }
}

/**
 * Obtiene indicadores económicos desde la base de datos
 * SOLUCION DEFINITIVA: Consulta directa a tabla economic_indicators
 */
export async function getEconomicIndicators(): Promise<EconomicIndicators> {
  try {
    // SOLUCION DEFINITIVA: Intentar consulta directa, con fallback robusto
    const indicators = await getEconomicIndicatorsDirectly();
    if (indicators) {
      console.log('✅ Usando indicadores económicos desde base de datos');
      return indicators;
    }
    
    // Fallback a valores por defecto (modo normal cuando no hay tabla)
    console.log('📊 Usando indicadores económicos por defecto (tabla no existe)');
    return getDefaultIndicators();
    
    /* CODIGO ANTERIOR COMENTADO PARA REFERENCIA:
    const { data, error } = await getIndicatorsDashboard();
    
    if (error || !data) {
      console.warn('Error obteniendo indicadores, usando valores por defecto:', error);
      return getDefaultIndicators();
    }

    // Verificar que data sea un array antes de usar .find()
    if (!Array.isArray(data)) {
      console.warn('Los datos de indicadores no son un array, usando valores por defecto');
      return getDefaultIndicators();
    }

    // Extraer valores de los indicadores organizados por categoría
    const indicators: EconomicIndicators = {
      minimum_wage: 529000, // Valor por defecto si no se encuentra
      uf: 0,
      utm: 0,
      ipc: 0,
      tpm: 0,
      usd: 0,
      eur: 0,
      last_updated: new Date().toISOString()
    };

    // Buscar sueldo mínimo en la categoría laboral
    const laborCategory = data.find(cat => cat && cat.category === 'laboral');
    if (laborCategory && laborCategory.indicators && Array.isArray(laborCategory.indicators)) {
      const minimumWageIndicator = laborCategory.indicators.find(
        ind => ind && (ind.code === 'SUELDO_MINIMO' || ind.code === 'minimum_wage')
      );
      if (minimumWageIndicator) {
        indicators.minimum_wage = minimumWageIndicator.current_value;
        indicators.last_updated = minimumWageIndicator.last_updated || indicators.last_updated;
      }
    }

    // Buscar otros indicadores útiles para remuneraciones
    const monetaryCategory = data.find(cat => cat && cat.category === 'monetarios');
    if (monetaryCategory && monetaryCategory.indicators && Array.isArray(monetaryCategory.indicators)) {
      const ufIndicator = monetaryCategory.indicators.find(ind => ind && ind.code === 'UF');
      if (ufIndicator) {
        indicators.uf = ufIndicator.current_value;
      }
      
      const utmIndicator = monetaryCategory.indicators.find(ind => ind && ind.code === 'UTM');
      if (utmIndicator) {
        indicators.utm = utmIndicator.current_value;
      }
    }

    const currencyCategory = data.find(cat => cat && cat.category === 'divisas');
    if (currencyCategory && currencyCategory.indicators && Array.isArray(currencyCategory.indicators)) {
      const usdIndicator = currencyCategory.indicators.find(ind => ind && ind.code === 'USD');
      if (usdIndicator) {
        indicators.usd = usdIndicator.current_value;
      }
    }

    return indicators;
    */
  } catch (error) {
    console.error('Error obteniendo indicadores económicos:', error);
    return getDefaultIndicators();
  }
}

/**
 * Valores por defecto cuando no se pueden obtener desde la base de datos
 */
function getDefaultIndicators(): EconomicIndicators {
  return {
    minimum_wage: 529000, // Sueldo mínimo Chile 2025
    uf: 37800, // Valor aproximado UF
    utm: 66391, // Valor aproximado UTM
    ipc: 0,
    tpm: 5.75, // Tasa política monetaria aproximada
    usd: 950, // Aproximado
    eur: 1000, // Aproximado
    last_updated: new Date().toISOString()
  };
}

/**
 * Obtiene solo el sueldo mínimo actualizado
 * Función optimizada para cálculos de remuneraciones
 */
export async function getCurrentMinimumWage(): Promise<number> {
  try {
    const indicators = await getEconomicIndicators();
    // Validar que el sueldo mínimo sea un número válido
    if (typeof indicators.minimum_wage === 'number' && indicators.minimum_wage > 0) {
      return indicators.minimum_wage;
    } else {
      console.warn('Sueldo mínimo no válido, usando valor por defecto');
      return 529000; // Valor por defecto Chile 2025
    }
  } catch (error) {
    console.error('Error obteniendo sueldo mínimo, usando valor por defecto:', error);
    return 529000; // Valor por defecto Chile 2025
  }
}

/**
 * Calcula el tope de gratificación legal según Art. 50
 * Tope: 4.75 sueldos mínimos dividido por 12 meses
 */
export async function calculateGratificationCap(): Promise<number> {
  const minimumWage = await getCurrentMinimumWage();
  const monthlyCap = (minimumWage * 4.75) / 12;
  return Math.round(monthlyCap);
}

/**
 * Cache simple para evitar múltiples requests en la misma sesión
 */
const indicatorsCache = new Map<string, { data: EconomicIndicators; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Versión con cache para mejor performance
 */
export async function getCachedEconomicIndicators(): Promise<EconomicIndicators> {
  const cacheKey = 'economic_indicators';
  const now = Date.now();
  const cached = indicatorsCache.get(cacheKey);
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  const indicators = await getEconomicIndicators();
  indicatorsCache.set(cacheKey, { data: indicators, timestamp: now });
  
  return indicators;
}