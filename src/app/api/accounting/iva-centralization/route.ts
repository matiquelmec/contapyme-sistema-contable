import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/accounting/iva-centralization
 * Genera asiento de centralización de IVA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_id,
      f29_data,
      periodo,
      preview = false 
    } = body;

    if (!company_id || !f29_data || !periodo) {
      return NextResponse.json(
        { success: false, error: 'company_id, f29_data y periodo son requeridos' },
        { status: 400 }
      );
    }

    console.log(`🏛️ Generando centralización IVA para ${periodo}:`, {
      company_id,
      iva_debito: f29_data.codigo538,
      iva_credito: f29_data.codigo537, // Crédito fiscal del F29
      impuesto_unico: f29_data.codigo048 || 0,
      preview
    });

    // Obtener configuración de cuentas para centralización IVA
    const accountsConfig = await getIVACentralizationAccountsConfig(company_id);
    
    if (!accountsConfig.iva_debito || !accountsConfig.impuesto_por_pagar || !accountsConfig.remanente_credito) {
      return NextResponse.json({
        success: false,
        error: 'Faltan cuentas configuradas para Centralización IVA. Configure: IVA Débito Fiscal, Impuesto por Pagar y Remanente Crédito Fiscal',
        missing_accounts: {
          iva_debito: !accountsConfig.iva_debito,
          impuesto_por_pagar: !accountsConfig.impuesto_por_pagar,
          remanente_credito: !accountsConfig.remanente_credito
        }
      }, { status: 400 });
    }

    // Generar líneas del asiento de centralización IVA
    const journalLines = createIVACentralizationJournalLines(f29_data, accountsConfig);
    
    // Validar que el asiento esté balanceado
    const totalDebit = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('❌ Asiento IVA desbalanceado:', { totalDebit, totalCredit, difference: totalDebit - totalCredit });
      return NextResponse.json({
        success: false,
        error: 'Asiento contable desbalanceado',
        debug: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }, { status: 400 });
    }

    const result = {
      entry_type: 'manual',
      period: periodo,
      description: `Centralización IVA ${formatPeriod(periodo)}`,
      lines: journalLines,
      totals: {
        debit_total: totalDebit,
        credit_total: totalCredit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      },
      iva_calculation: {
        iva_debito: f29_data.codigo538,
        iva_credito: f29_data.codigo537 || 0,
        iva_determinado: f29_data.codigo538 - (f29_data.codigo537 || 0),
        impuesto_unico: f29_data.codigo048 || 0,
        ppm: f29_data.codigo062 || 0,
        total_a_pagar: f29_data.total_a_pagar || ((f29_data.codigo538 - (f29_data.codigo537 || 0)) + (f29_data.codigo048 || 0) + (f29_data.codigo062 || 0)),
        tipo_resultado: f29_data.codigo538 > (f29_data.codigo537 || 0) ? 'por_pagar' : 'remanente'
      }
    };

    // Si no es preview, guardar el asiento en el libro diario
    if (!preview) {
      try {
        const journalEntry = await saveIVACentralizationJournalEntry(company_id, result, periodo);
        result.journal_entry_id = journalEntry.id;
        result.entry_number = journalEntry.entry_number;
        console.log('✅ Asiento Centralización IVA guardado en libro diario:', journalEntry.id);
      } catch (error) {
        console.error('❌ Error guardando asiento Centralización IVA:', error);
        // Retornar error para que el usuario sepa que hubo un problema
        return NextResponse.json({
          success: false,
          error: 'Error al guardar el asiento en el libro diario. El asiento se generó pero no se pudo guardar.',
          debug: error instanceof Error ? error.message : 'Error desconocido',
          data: result // Incluir el resultado aunque no se haya guardado
        }, { status: 500 });
      }
    }

    console.log(`✅ Centralización IVA ${preview ? 'preview' : 'creada'}:`, {
      lines: journalLines.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: result.totals.is_balanced,
      tipo_resultado: result.iva_calculation.tipo_resultado
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error generando centralización IVA:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Función para obtener configuración de cuentas IVA
async function getIVACentralizationAccountsConfig(companyId: string) {
  console.log('🔍 Obteniendo configuración de cuentas Centralización IVA...');
  
  // Buscar cuentas típicas para centralización IVA
  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('code, name, account_type')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error obteniendo plan de cuentas:', error);
    return {};
  }

  // Mapear cuentas típicas para centralización IVA
  const config = {
    iva_debito: null,
    iva_credito: null, // Para futuras implementaciones
    impuesto_por_pagar: null,
    remanente_credito: null
  };

  for (const account of accounts) {
    const code = account.code;
    const name = account.name.toLowerCase();
    
    // Buscar cuenta IVA Débito Fiscal (2.1.3.002)
    if (code === '2.1.3.002' || name === 'iva debito fiscal') {
      config.iva_debito = { code: account.code, name: account.name };
    }
    
    // Buscar cuenta Impuesto por Pagar (2.1.3.003)
    if (code === '2.1.3.003' || name === 'impuesto por pagar') {
      config.impuesto_por_pagar = { code: account.code, name: account.name };
    }
    
    // Buscar cuenta Remanente Crédito Fiscal (1.3.1.001)
    if (code === '1.3.1.001' || name === 'remanente credito fiscal') {
      config.remanente_credito = { code: account.code, name: account.name };
    }
  }

  console.log('📋 Configuración de cuentas Centralización IVA:', config);
  return config;
}

// Función para crear líneas del asiento de centralización IVA según normativa chilena
function createIVACentralizationJournalLines(f29Data: any, accountsConfig: any) {
  const lines = [];
  
  const ivaDebito = f29Data.codigo538 || 0;  // IVA Débito Fiscal
  const ivaCredito = f29Data.codigo537 || 0; // IVA Crédito Fiscal 
  const impuestoUnico = f29Data.codigo048 || 0;
  const ppm = f29Data.codigo062 || 0; // PPM - Código 062, no 048
  
  const ivaDeterminado = ivaDebito - ivaCredito; // Diferencia IVA
  
  console.log('🏛️ Centralización IVA según normativa chilena:', {
    iva_debito: ivaDebito,
    iva_credito: ivaCredito,
    iva_determinado: ivaDeterminado,
    impuesto_unico: impuestoUnico,
    ppm: ppm,
    total_a_pagar_calculado: ivaDeterminado + impuestoUnico + ppm,
    total_a_pagar_formulario: f29Data.total_a_pagar
  });

  // CENTRALIZACIÓN COPIANDO LA ESTRUCTURA CORRECTA DEL USUARIO
  // Usando los valores reales del F29 pero con la estructura balanceada
  
  // DEBE: IVA Débito Fiscal (código 538)
  if (ivaDebito > 0) {
    lines.push({
      account_code: accountsConfig.iva_debito.code,
      account_name: accountsConfig.iva_debito.name,
      description: `Centralizar IVA Débito ${formatPeriod(f29Data.periodo)}`,
      debit_amount: ivaDebito,
      credit_amount: 0
    });
  }
  
  // DEBE: PPM (código 062)
  if (ppm > 0) {
    lines.push({
      account_code: accountsConfig.remanente_credito.code,
      account_name: accountsConfig.remanente_credito.name,
      description: `PPM ${formatPeriod(f29Data.periodo)}`,
      debit_amount: ppm,
      credit_amount: 0
    });
  }
  
  // DEBE: Impuesto Único (código 048)
  if (impuestoUnico > 0) {
    lines.push({
      account_code: accountsConfig.impuesto_por_pagar.code,
      account_name: accountsConfig.impuesto_por_pagar.name,
      description: `Impuesto Único ${formatPeriod(f29Data.periodo)}`,
      debit_amount: impuestoUnico,
      credit_amount: 0
    });
  }
  
  // HABER: IVA Crédito Fiscal (código 537)
  if (ivaCredito > 0) {
    lines.push({
      account_code: accountsConfig.remanente_credito.code,
      account_name: accountsConfig.remanente_credito.name,
      description: `Centralizar IVA Crédito ${formatPeriod(f29Data.periodo)}`,
      debit_amount: 0,
      credit_amount: ivaCredito
    });
  }
  
  // HABER: Impuesto por pagar (total_a_pagar del F29)
  const totalAPagar = f29Data.total_a_pagar || (ivaDeterminado + ppm + impuestoUnico);
  if (totalAPagar > 0) {
    lines.push({
      account_code: accountsConfig.impuesto_por_pagar.code,
      account_name: accountsConfig.impuesto_por_pagar.name,
      description: `Impuesto por pagar ${formatPeriod(f29Data.periodo)}`,
      debit_amount: 0,
      credit_amount: totalAPagar
    });
  }

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

// Función para guardar asiento de centralización IVA en el libro diario
async function saveIVACentralizationJournalEntry(companyId: string, entryData: any, periodo: string) {
  // Crear asiento principal usando la misma estructura que journal/route.ts
  const journalEntryData: any = {
    company_id: companyId,
    company_demo: true,
    entry_date: new Date().toISOString().split('T')[0],
    description: entryData.description,
    reference: `IVA-CENTRAL-${periodo}`,
    entry_type: 'manual',
    source_type: 'iva_centralization',
    source_id: null,
    source_period: periodo,
    status: 'approved',
    total_debit: entryData.totals.debit_total,
    total_credit: entryData.totals.credit_total,
    created_by: 'user'
  };

  const { data: journalEntry, error: entryError } = await supabase
    .from('journal_entries')
    .insert(journalEntryData)
    .select()
    .single();

  if (entryError) {
    console.error('❌ Error creando asiento principal Centralización IVA:', entryError);
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
    console.error('❌ Error creando líneas del asiento Centralización IVA:', linesError);
    
    // Rollback: eliminar asiento principal
    await supabase
      .from('journal_entries')
      .delete()
      .eq('id', journalEntry.id);

    throw new Error('Error creando líneas del asiento');
  }

  console.log(`✅ Asiento Centralización IVA guardado: ${journalEntry.id}`);
  return journalEntry;
}