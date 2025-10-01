import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/accounting/f29-journal
 * Genera asiento contable basado en datos F29
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_id,
      f29_data,
      preview = false 
    } = body;

    if (!company_id || !f29_data) {
      return NextResponse.json(
        { success: false, error: 'company_id y f29_data son requeridos' },
        { status: 400 }
      );
    }

    console.log(`🧾 Generando asiento F29 para ${f29_data.periodo}:`, {
      company_id,
      ventas_netas: f29_data.codigo563,
      iva_debito: f29_data.codigo538,
      preview
    });

    // Obtener configuración de cuentas
    const accountsConfig = await getF29AccountsConfig(company_id);

    // Verificar que las cuentas estén disponibles después del intento de creación automática
    const missingAccounts = [];
    if (!accountsConfig.caja) missingAccounts.push('Caja');
    if (!accountsConfig.iva_debito) missingAccounts.push('IVA Débito Fiscal');
    if (!accountsConfig.ventas) missingAccounts.push('Ventas del Giro');

    if (missingAccounts.length > 0) {
      return NextResponse.json({
        success: false,
        error: `No se pudieron configurar las siguientes cuentas para F29: ${missingAccounts.join(', ')}. Verifique permisos de base de datos o cree manualmente las cuentas.`,
        missing_accounts: {
          caja: !accountsConfig.caja,
          iva_debito: !accountsConfig.iva_debito,
          ventas: !accountsConfig.ventas
        },
        suggested_accounts: [
          { code: '1.1.1.001', name: 'Caja', type: 'Activo' },
          { code: '2.1.3.002', name: 'IVA Débito Fiscal', type: 'Pasivo' },
          { code: '5.1.1.001', name: 'Ventas del Giro', type: 'Ingreso' }
        ]
      }, { status: 400 });
    }

    // Generar líneas del asiento
    const journalLines = createF29JournalLines(f29_data, accountsConfig);
    
    // Validar que el asiento esté balanceado
    const totalDebit = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('❌ Asiento F29 desbalanceado:', { totalDebit, totalCredit, difference: totalDebit - totalCredit });
      return NextResponse.json({
        success: false,
        error: 'Asiento contable desbalanceado',
        debug: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }, { status: 400 });
    }

    const result = {
      entry_type: 'f29',
      period: f29_data.periodo,
      description: `Ventas y IVA ${formatPeriod(f29_data.periodo)}`,
      lines: journalLines,
      totals: {
        debit_total: totalDebit,
        credit_total: totalCredit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      },
      f29_data: {
        codigo563: f29_data.codigo563, // Ventas Netas
        codigo538: f29_data.codigo538, // IVA Débito Fiscal
        periodo: f29_data.periodo,
        rut: f29_data.rut
      }
    };

    // Si no es preview, guardar el asiento
    if (!preview) {
      try {
        const journalEntry = await saveF29JournalEntry(company_id, result);
        result.journal_entry_id = journalEntry.id;
        result.entry_number = journalEntry.entry_number;
        console.log('✅ Asiento F29 guardado en libro diario:', journalEntry.id);
      } catch (error) {
        console.error('❌ Error guardando asiento F29:', error);
        // Retornar error para que el usuario sepa que hubo un problema
        return NextResponse.json({
          success: false,
          error: 'Error al guardar el asiento en el libro diario. El asiento se generó pero no se pudo guardar.',
          debug: error instanceof Error ? error.message : 'Error desconocido',
          data: result // Incluir el resultado aunque no se haya guardado
        }, { status: 500 });
      }
    }

    console.log(`✅ Asiento F29 ${preview ? 'preview' : 'creado'}:`, {
      lines: journalLines.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: result.totals.is_balanced
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error generando asiento F29:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Función para obtener configuración de cuentas F29
async function getF29AccountsConfig(companyId: string) {
  console.log('🔍 Obteniendo configuración de cuentas F29...');

  // TEMPORAL: Usar configuración fija mientras resolvemos conectividad
  // Estas son las cuentas que sabemos que funcionan en el proyecto productivo
  const config = {
    caja: { code: '1.1.01.001', name: 'Caja' },
    iva_debito: { code: '2.1.02.001', name: 'IVA Débito Fiscal' },
    ventas: { code: '4.1.01', name: 'Ventas de Mercaderías' }
  };

  console.log('📋 Usando configuración fija de cuentas F29:', config);

  // TODO: Una vez resuelto el problema de conectividad, volver a implementar búsqueda dinámica
  /*
  try {
    // Buscar cuentas típicas para F29
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('code, name, account_type')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error obteniendo plan de cuentas:', error);
      // Fallback a configuración fija
      return config;
    }

    // Mapear cuentas encontradas
    const dynamicConfig = {
      caja: null,
      iva_debito: null,
      ventas: null
    };

    for (const account of accounts || []) {
      const code = account.code;
      const name = account.name.toLowerCase();

      // Buscar cuenta Caja con múltiples variaciones
      if (code === '1.1.1.001' || code === '1.1.01.001' || code === '1.01.01.001' ||
          name.includes('caja') || name.includes('efectivo')) {
        dynamicConfig.caja = { code: account.code, name: account.name };
      }

      // Buscar cuenta IVA Débito Fiscal con múltiples variaciones
      if (code === '2.1.3.002' || code === '2.1.02.001' || code === '2.01.03.002' ||
          name.includes('iva debito') || name.includes('iva débito') ||
          name.includes('iva por pagar')) {
        dynamicConfig.iva_debito = { code: account.code, name: account.name };
      }

      // Buscar cuenta Ventas del Giro con múltiples variaciones
      if (code === '5.1.1.001' || code === '4.1.01' || code === '4.1.02' ||
          name.includes('ventas') || name.includes('ingresos')) {
        dynamicConfig.ventas = { code: account.code, name: account.name };
      }
    }

    // Usar cuentas encontradas o fallback a configuración fija
    return {
      caja: dynamicConfig.caja || config.caja,
      iva_debito: dynamicConfig.iva_debito || config.iva_debito,
      ventas: dynamicConfig.ventas || config.ventas
    };
  } catch (error) {
    console.error('❌ Error en búsqueda dinámica, usando configuración fija:', error);
    return config;
  }
  */

  return config;
}

// Función para crear cuenta por defecto
async function createDefaultAccount(code: string, name: string, accountType: string, levelType: string) {
  try {
    console.log(`➕ Creando cuenta por defecto: ${code} - ${name}`);

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        code,
        name,
        account_type: accountType,
        level_type: levelType,
        is_active: true,
        parent_code: null
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creando cuenta ${code}:`, error);
      return null;
    }

    console.log(`✅ Cuenta ${code} - ${name} creada exitosamente`);
    return { code: data.code, name: data.name };
  } catch (error) {
    console.error(`❌ Error inesperado creando cuenta ${code}:`, error);
    return null;
  }
}

// Función para crear líneas del asiento F29
function createF29JournalLines(f29Data: any, accountsConfig: any) {
  const lines = [];
  
  // DEBE: Caja por el total de ventas con IVA
  const totalVentasConIVA = f29Data.codigo563 + f29Data.codigo538;
  
  lines.push({
    account_code: accountsConfig.caja.code,
    account_name: accountsConfig.caja.name,
    description: `Ventas ${formatPeriod(f29Data.periodo)}`,
    debit_amount: totalVentasConIVA,
    credit_amount: 0
  });

  // HABER: Ventas del Giro (sin IVA)
  lines.push({
    account_code: accountsConfig.ventas.code,
    account_name: accountsConfig.ventas.name,
    description: `Ventas netas ${formatPeriod(f29Data.periodo)}`,
    debit_amount: 0,
    credit_amount: f29Data.codigo563
  });

  // HABER: IVA Débito Fiscal
  lines.push({
    account_code: accountsConfig.iva_debito.code,
    account_name: accountsConfig.iva_debito.name,
    description: `IVA débito fiscal ${formatPeriod(f29Data.periodo)}`,
    debit_amount: 0,
    credit_amount: f29Data.codigo538
  });

  return lines;
}

// Función para formatear período YYYYMM a texto legible
function formatPeriod(periodo: string): string {
  if (!periodo || periodo.length !== 6) return periodo;
  
  const year = periodo.substring(0, 4);
  const month = periodo.substring(4, 6);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const monthName = monthNames[parseInt(month) - 1];
  return `${monthName} ${year}`;
}

// Función para guardar asiento en el libro diario
async function saveF29JournalEntry(companyId: string, entryData: any) {
  // Crear asiento principal usando la misma estructura que journal/route.ts
  const journalEntryData: any = {
    company_id: companyId,
    entry_date: new Date().toISOString().split('T')[0],
    description: entryData.description,
    reference: `F29-${entryData.f29_data.periodo}`,
    entry_type: 'f29',
    source_type: 'f29_analysis',
    source_id: null,
    source_period: entryData.f29_data.periodo,
    status: 'draft',
    total_debit: entryData.totals.debit_total,
    total_credit: entryData.totals.credit_total,
    created_by: 'system'
  };

  const { data: journalEntry, error: entryError } = await supabase
    .from('journal_entries')
    .insert(journalEntryData)
    .select()
    .single();

  if (entryError) {
    console.error('❌ Error creando asiento principal:', entryError);
    throw new Error('Error creando asiento principal');
  }

  // Crear líneas del asiento usando la misma estructura que journal/route.ts
  const linesData = entryData.lines.map((line: any, index: number) => ({
    journal_entry_id: journalEntry.id,
    account_code: line.account_code,
    account_name: line.account_name,
    line_number: index + 1,
    debit_amount: line.debit_amount || 0,
    credit_amount: line.credit_amount || 0,
    line_description: line.description || null,
    reference: null,
    cost_center: null,
    analytical_account: null,
  }));

  const { data: linesInserted, error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(linesData)
    .select();

  if (linesError) {
    console.error('❌ Error creando líneas del asiento:', linesError);
    
    // Rollback: eliminar asiento principal
    await supabase
      .from('journal_entries')
      .delete()
      .eq('id', journalEntry.id);

    throw new Error('Error creando líneas del asiento');
  }

  console.log(`✅ Asiento F29 guardado: ${journalEntry.id}`);
  return journalEntry;
}