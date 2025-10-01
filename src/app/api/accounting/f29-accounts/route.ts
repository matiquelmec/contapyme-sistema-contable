import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/accounting/f29-accounts
 * Diagnóstico de cuentas F29 - muestra qué cuentas existen y cuáles faltan
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Diagnosticando cuentas F29...');

    // Obtener todas las cuentas activas
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('code, name, account_type, level_type')
      .eq('is_active', true)
      .order('code');

    if (error) {
      console.error('❌ Error obteniendo cuentas:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener plan de cuentas: ' + error.message
      }, { status: 500 });
    }

    // Analizar cuentas F29
    const f29Analysis = analyzeF29Accounts(accounts || []);

    return NextResponse.json({
      success: true,
      data: {
        total_accounts: accounts?.length || 0,
        f29_analysis: f29Analysis,
        all_accounts: accounts || []
      }
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico F29:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * POST /api/accounting/f29-accounts
 * Crear cuentas F29 faltantes automáticamente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { create_missing = true } = body;

    if (!create_missing) {
      return NextResponse.json({
        success: false,
        error: 'Parámetro create_missing requerido'
      }, { status: 400 });
    }

    console.log('🏗️ Creando cuentas F29 faltantes...');

    // Obtener cuentas existentes
    const { data: existingAccounts, error: fetchError } = await supabase
      .from('chart_of_accounts')
      .select('code, name')
      .eq('is_active', true);

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener cuentas existentes: ' + fetchError.message
      }, { status: 500 });
    }

    const existingCodes = new Set((existingAccounts || []).map(acc => acc.code));

    // Cuentas F29 requeridas
    const requiredF29Accounts = [
      { code: '1.1.1.001', name: 'Caja', account_type: 'Activo', level_type: 'Imputable' },
      { code: '2.1.3.002', name: 'IVA Débito Fiscal', account_type: 'Pasivo', level_type: 'Imputable' },
      { code: '5.1.1.001', name: 'Ventas del Giro', account_type: 'Ingreso', level_type: 'Imputable' }
    ];

    const createdAccounts = [];
    const errors = [];

    for (const account of requiredF29Accounts) {
      if (!existingCodes.has(account.code)) {
        try {
          console.log(`➕ Creando cuenta: ${account.code} - ${account.name}`);

          const { data, error } = await supabase
            .from('chart_of_accounts')
            .insert({
              code: account.code,
              name: account.name,
              account_type: account.account_type,
              level_type: account.level_type,
              is_active: true,
              parent_code: null
            })
            .select()
            .single();

          if (error) {
            console.error(`❌ Error creando ${account.code}:`, error);
            errors.push({
              code: account.code,
              name: account.name,
              error: error.message
            });
          } else {
            console.log(`✅ Cuenta ${account.code} creada exitosamente`);
            createdAccounts.push({
              code: data.code,
              name: data.name,
              account_type: data.account_type
            });
          }
        } catch (error) {
          console.error(`❌ Error inesperado creando ${account.code}:`, error);
          errors.push({
            code: account.code,
            name: account.name,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      } else {
        console.log(`✓ Cuenta ${account.code} ya existe`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created_accounts: createdAccounts,
        errors: errors,
        message: `Se crearon ${createdAccounts.length} cuentas. ${errors.length} errores.`
      }
    });

  } catch (error) {
    console.error('❌ Error creando cuentas F29:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Función para analizar cuentas F29
function analyzeF29Accounts(accounts: any[]) {
  const analysis = {
    caja: {
      found: false,
      matches: [] as any[],
      required_code: '1.1.1.001',
      required_name: 'Caja'
    },
    iva_debito: {
      found: false,
      matches: [] as any[],
      required_code: '2.1.3.002',
      required_name: 'IVA Débito Fiscal'
    },
    ventas: {
      found: false,
      matches: [] as any[],
      required_code: '5.1.1.001',
      required_name: 'Ventas del Giro'
    }
  };

  for (const account of accounts) {
    const code = account.code;
    const name = account.name.toLowerCase();

    // Analizar Caja
    if (code === '1.1.1.001' || code === '1.1.01.001' || code === '1.01.01.001' ||
        name.includes('caja') || name.includes('efectivo')) {
      analysis.caja.matches.push(account);
      if (code === '1.1.1.001' || name === 'caja') {
        analysis.caja.found = true;
      }
    }

    // Analizar IVA Débito
    if (code === '2.1.3.002' || code === '2.1.03.002' || code === '2.01.03.002' ||
        name.includes('iva debito') || name.includes('iva débito') ||
        name.includes('iva por pagar')) {
      analysis.iva_debito.matches.push(account);
      if (code === '2.1.3.002' || name.includes('iva debito fiscal')) {
        analysis.iva_debito.found = true;
      }
    }

    // Analizar Ventas
    if (code === '5.1.1.001' || code === '5.1.01.001' || code === '5.01.01.001' ||
        name.includes('ventas') || name.includes('ingresos')) {
      analysis.ventas.matches.push(account);
      if (code === '5.1.1.001' || name.includes('ventas del giro')) {
        analysis.ventas.found = true;
      }
    }
  }

  return {
    summary: {
      total_required: 3,
      found: [analysis.caja.found, analysis.iva_debito.found, analysis.ventas.found].filter(Boolean).length,
      missing: [analysis.caja.found, analysis.iva_debito.found, analysis.ventas.found].filter(found => !found).length
    },
    accounts: analysis,
    ready_for_f29: analysis.caja.found && analysis.iva_debito.found && analysis.ventas.found
  };
}