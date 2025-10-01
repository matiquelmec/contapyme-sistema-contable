import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/chart-accounts
 * Debug endpoint para verificar cuentas disponibles en Supabase
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Verificando cuentas en Supabase...');

    // Verificar conexión a Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('chart_of_accounts')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Error de conexión Supabase:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a Supabase',
        details: connectionError
      }, { status: 500 });
    }

    // Obtener todas las cuentas disponibles
    const { data: allAccounts, error: allError } = await supabase
      .from('chart_of_accounts')
      .select('code, name, account_type, is_active')
      .order('code');

    if (allError) {
      console.error('❌ Error obteniendo todas las cuentas:', allError);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo cuentas',
        details: allError
      }, { status: 500 });
    }

    // Buscar cuentas específicas de F29
    const f29Accounts = (allAccounts || []).filter(account =>
      account.code === '1.1.1.001' ||
      account.code === '1.1.01.001' ||
      account.code === '2.1.3.002' ||
      account.code === '2.1.02.001' ||
      account.code === '5.1.1.001' ||
      account.code === '4.1.01' ||
      account.name?.toLowerCase().includes('caja') ||
      account.name?.toLowerCase().includes('iva debito') ||
      account.name?.toLowerCase().includes('iva débito') ||
      account.name?.toLowerCase().includes('ventas')
    );

    // Análisis de cuentas disponibles
    const cajaAccounts = (allAccounts || []).filter(account =>
      account.name?.toLowerCase().includes('caja') ||
      account.name?.toLowerCase().includes('efectivo') ||
      account.code?.includes('1.1')
    );

    const ivaAccounts = (allAccounts || []).filter(account =>
      account.name?.toLowerCase().includes('iva') ||
      account.name?.toLowerCase().includes('impuesto')
    );

    const ventasAccounts = (allAccounts || []).filter(account =>
      account.name?.toLowerCase().includes('ventas') ||
      account.name?.toLowerCase().includes('ingreso')
    );

    return NextResponse.json({
      success: true,
      debug: {
        supabase_url: supabaseUrl,
        connection_status: 'OK',
        total_accounts: allAccounts?.length || 0,
        f29_specific_accounts: f29Accounts,
        analysis: {
          caja_related: cajaAccounts,
          iva_related: ivaAccounts,
          ventas_related: ventasAccounts
        },
        all_accounts: allAccounts
      }
    });

  } catch (error) {
    console.error('❌ Error en debug endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}