// ==========================================
// CONFIGURACIÓN SUPABASE PARA PRODUCCIÓN
// Funciona tanto en local como en Netlify
// ==========================================

import { createClient } from '@supabase/supabase-js';

// Configuración para producción - usar Supabase Cloud
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Cliente público (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con privilegios (backend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Función para detectar entorno
export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.NETLIFY;
}

// Cliente adaptativo según entorno
export function createSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Lado del cliente
    return supabase;
  } else {
    // Lado del servidor
    return supabaseAdmin;
  }
}

// Funciones para F29 compatibles con ambos entornos
export async function insertF29FormSupabase(data: any) {
  const client = createSupabaseClient();
  
  try {
    const { data: result, error } = await client
      .from('f29_forms')
      .insert([{
        company_id: data.company_id,
        user_id: data.user_id,
        period: data.period,
        file_name: data.file_name,
        file_size: data.file_size,
        rut: data.rut,
        folio: data.folio,
        raw_data: data.raw_data,
        calculated_data: data.calculated_data,
        ventas_netas: data.ventas_netas,
        compras_netas: data.compras_netas,
        iva_debito: data.iva_debito,
        iva_credito: data.iva_credito,
        iva_determinado: data.iva_determinado,
        ppm: data.ppm,
        remanente: data.remanente,
        margen_bruto: data.margen_bruto,
        codigo_538: data.codigo_538,
        codigo_511: data.codigo_511,
        codigo_563: data.codigo_563,
        codigo_062: data.codigo_062,
        codigo_077: data.codigo_077,
        confidence_score: data.confidence_score,
        validation_status: data.validation_status,
        year: data.year,
        month: data.month
      }])
      .select();

    return { data: result, error };
  } catch (error) {
    console.error('❌ Error insertando F29 en Supabase:', error);
    return { data: null, error };
  }
}

export async function getF29FormsSupabase(companyId: string, limit = 24) {
  const client = createSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('f29_forms')
      .select('*')
      .eq('company_id', companyId)
      .order('period', { ascending: true })
      .limit(limit);

    return { data, error };
  } catch (error) {
    console.error('❌ Error obteniendo F29s de Supabase:', error);
    return { data: null, error };
  }
}

export async function upsertAnalysisSupabase(data: any) {
  const client = createSupabaseClient();
  
  try {
    const { error } = await client
      .from('f29_comparative_analysis')
      .upsert({
        company_id: data.company_id,
        period_start: data.period_start,
        period_end: data.period_end,
        analysis_data: data.analysis_data,
        total_periods: data.total_periods,
        avg_monthly_sales: data.avg_monthly_sales,
        growth_rate: data.growth_rate,
        best_month: data.best_month,
        worst_month: data.worst_month,
        insights: data.insights,
        trends: data.trends,
        seasonality: data.seasonality,
        anomalies: data.anomalies,
        generated_at: data.generated_at,
        expires_at: data.expires_at
      });

    return { error };
  } catch (error) {
    console.error('❌ Error guardando análisis en Supabase:', error);
    return { error };
  }
}