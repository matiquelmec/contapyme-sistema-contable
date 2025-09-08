/**
 * API para obtener opciones dinámicas de AFP e ISAPRE
 * Conecta configuración de empresa con datos de empleados
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableAFPs, getAvailableHealthInstitutions } from '@/modules/remuneraciones/constants/parametrosLegales';
import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : {}
);

// Cache simple en memoria (para desarrollo)
let optionsCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    // ✅ Verificar cache primero
    const cacheKey = `options_${companyId}`;
    const cachedData = optionsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('📦 Usando opciones desde cache para empresa:', companyId);
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    console.log('🔍 Obteniendo opciones dinámicas de configuración para empresa:', companyId);

    // Obtener configuración de la empresa desde la base de datos
    let dbConfig = null;
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('payroll_settings')
        .select('settings')
        .eq('company_id', companyId)
        .single();

      if (!settingsError && settingsData?.settings) {
        dbConfig = settingsData.settings;
        console.log('✅ Configuración de empresa encontrada');
      } else {
        console.log('⚠️ No hay configuración específica, usando valores por defecto');
      }
    } catch (err) {
      console.warn('Error obteniendo configuración de empresa:', err);
    }

    // Obtener opciones dinámicas usando las funciones centralizadas
    const availableAFPs = getAvailableAFPs(dbConfig);
    const availableHealthInstitutions = getAvailableHealthInstitutions(dbConfig);

    console.log(`✅ Opciones dinámicas: ${availableAFPs.length} AFP, ${availableHealthInstitutions.length} instituciones de salud`);

    // Preparar datos de respuesta
    const responseData = {
      afp_options: availableAFPs.map(afp => ({
        code: afp.code,
        name: afp.name,
        commission_percentage: afp.commission,
        display_name: `${afp.name} (${afp.commission}%)`
      })),
      health_options: availableHealthInstitutions.map(health => ({
        code: health.code,
        name: health.name,
        base_percentage: health.percentage,
        display_name: `${health.name} (${health.percentage}%)`
      })),
      // Información adicional para el frontend
      has_custom_config: !!dbConfig,
      last_updated: new Date().toISOString()
    };

    // ✅ Guardar en cache
    optionsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error en API de opciones dinámicas:', error);
    return NextResponse.json({
      success: false,
      error: `Error interno del servidor: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// ✅ NUEVO: Método POST para invalidar cache
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const invalidate = searchParams.get('invalidate');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    if (invalidate === 'true') {
      const cacheKey = `options_${companyId}`;
      const wasInCache = optionsCache.has(cacheKey);
      
      optionsCache.delete(cacheKey);
      
      console.log(`🗑️ Cache invalidado para empresa ${companyId}${wasInCache ? '' : ' (no estaba en cache)'}`);
      
      return NextResponse.json({
        success: true,
        message: 'Cache invalidado exitosamente',
        was_cached: wasInCache
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Parámetro invalidate=true requerido'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error invalidando cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}