import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

/**
 * POST /api/accounting/payroll-journal
 * Genera asiento contable basado en liquidaciones de remuneraciones
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_id,
      period_year,
      period_month,
      preview = false 
    } = body;

    if (!company_id || !period_year || !period_month) {
      return NextResponse.json(
        { success: false, error: 'company_id, period_year y period_month son requeridos' },
        { status: 400 }
      );
    }

    const period = `${period_year}-${period_month.toString().padStart(2, '0')}`;
    console.log(`🧾 Generando asiento remuneraciones para ${period}:`, {
      company_id,
      period_year,
      period_month,
      preview
    });

    const supabase = getDatabaseConnection();

    // Obtener todas las liquidaciones del período
    const { data: liquidations, error: liquidationsError } = await supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees!inner(
          first_name,
          last_name,
          rut
        )
      `)
      .eq('company_id', company_id)
      .eq('period_year', period_year)
      .eq('period_month', period_month)
      .eq('status', 'approved');

    if (liquidationsError || !liquidations || liquidations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron liquidaciones aprobadas para el período especificado' },
        { status: 404 }
      );
    }

    console.log(`📋 Procesando ${liquidations.length} liquidaciones del ${period_month}/${period_year}`);

    // Generar líneas del asiento usando el mismo patrón que F29
    const journalLines = createPayrollJournalLines(liquidations, period);
    
    // Validar que el asiento esté balanceado
    const totalDebit = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('❌ Asiento remuneraciones desbalanceado:', { totalDebit, totalCredit, difference: totalDebit - totalCredit });
      return NextResponse.json({
        success: false,
        error: 'Asiento contable desbalanceado',
        debug: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }, { status: 400 });
    }

    const result = {
      entry_type: 'payroll',
      period: period,
      description: `Provisión Remuneraciones ${formatPeriod(period)} - ${liquidations.length} empleados`,
      lines: journalLines,
      totals: {
        debit_total: totalDebit,
        credit_total: totalCredit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      },
      payroll_data: {
        employee_count: liquidations.length,
        period_year,
        period_month,
        total_haberes: liquidations.reduce((sum, liq) => sum + (liq.total_gross_income || 0), 0),
        total_descuentos: liquidations.reduce((sum, liq) => sum + (liq.total_deductions || 0), 0)
      }
    };

    // Si no es preview, guardar el asiento
    if (!preview) {
      try {
        const journalEntry = await savePayrollJournalEntry(company_id, result);
        result.journal_entry_id = journalEntry.id;
        result.entry_number = journalEntry.entry_number;
        console.log('✅ Asiento remuneraciones guardado en libro diario:', journalEntry.id);
      } catch (error) {
        console.error('❌ Error guardando asiento remuneraciones:', error);
        return NextResponse.json({
          success: false,
          error: 'Error al guardar el asiento en el libro diario. El asiento se generó pero no se pudo guardar.',
          debug: error instanceof Error ? error.message : 'Error desconocido',
          data: result
        }, { status: 500 });
      }
    }

    console.log(`✅ Asiento remuneraciones ${preview ? 'preview' : 'creado'}:`, {
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
    console.error('❌ Error generando asiento remuneraciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Función para crear líneas del asiento de remuneraciones
function createPayrollJournalLines(liquidations: any[], period: string) {
  const lines = [];
  let lineNumber = 1;

  // Para cada empleado, generar líneas individuales
  for (const liquidation of liquidations) {
    const employee = liquidation.employees;
    const rut = employee?.rut || `RUT-${liquidation.id.substring(0, 8)}`;
    const apellidos = employee?.last_name || 'APELLIDO_DESCONOCIDO';
    const nombres = employee?.first_name || 'NOMBRE_DESCONOCIDO';
    const cargo = 'EMPLEADO'; // Por defecto

    // DEBE - Gastos por empleado
    
    // Sueldo Base
    if (liquidation.base_salary > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '6.2.1.001',
        account_name: 'Sueldo Base',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Sueldo Base`,
        debit_amount: liquidation.base_salary,
        credit_amount: 0
      });
    }

    // Gratificación
    if (liquidation.gratification > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '6.2.1.003',
        account_name: 'Gratificaciones',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Gratificación`,
        debit_amount: liquidation.gratification,
        credit_amount: 0
      });
    }

    // Horas Extras
    if (liquidation.overtime_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '6.2.1.002',
        account_name: 'Horas Extras',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Horas Extras`,
        debit_amount: liquidation.overtime_amount,
        credit_amount: 0
      });
    }

    // HABER - Descuentos y líquidos
    
    // AFP
    if (liquidation.afp_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '2.1.2.001',
        account_name: 'AFP por Pagar',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | AFP`,
        debit_amount: 0,
        credit_amount: liquidation.afp_amount
      });
    }

    // Salud
    if (liquidation.health_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '2.1.2.002',
        account_name: 'Salud por Pagar',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Salud`,
        debit_amount: 0,
        credit_amount: liquidation.health_amount
      });
    }

    // Cesantía (si aplica)
    if (liquidation.unemployment_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '2.1.2.003',
        account_name: 'Cesantía por Pagar',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Cesantía`,
        debit_amount: 0,
        credit_amount: liquidation.unemployment_amount
      });
    }

    // Impuesto Segunda Categoría
    if (liquidation.income_tax_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '2.1.3.001',
        account_name: 'Impuesto 2da Categoría por Pagar',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Impuesto Único`,
        debit_amount: 0,
        credit_amount: liquidation.income_tax_amount
      });
    }

    // Líquido a Pagar
    if (liquidation.net_salary > 0) {
      lines.push({
        line_number: lineNumber++,
        account_code: '2.1.1.001',
        account_name: 'Líquidos por Pagar',
        description: `${rut} | ${apellidos} ${nombres} | ${cargo} | Líquido a Recibir`,
        debit_amount: 0,
        credit_amount: liquidation.net_salary
      });
    }
  }

  return lines;
}

// Función para formatear período YYYY-MM a texto legible
function formatPeriod(periodo: string): string {
  if (!periodo || periodo.length !== 7) return periodo;
  
  const [year, month] = periodo.split('-');
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const monthName = monthNames[parseInt(month) - 1];
  return `${monthName} ${year}`;
}

// Función para guardar asiento de remuneraciones en el libro diario
async function savePayrollJournalEntry(companyId: string, entryData: any) {
  const supabase = getDatabaseConnection();
  
  // Crear asiento principal usando la misma estructura que journal/route.ts
  const journalEntryData: any = {
    company_id: companyId,
    company_demo: true,
    entry_date: new Date().toISOString().split('T')[0],
    description: entryData.description,
    reference: `REM-${entryData.payroll_data.period_year}${entryData.payroll_data.period_month.toString().padStart(2, '0')}`,
    entry_type: 'manual',
    source_type: 'payroll_book',
    source_id: null,
    source_period: entryData.period.replace('-', ''),
    status: 'approved',
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
    console.error('❌ Error creando asiento principal remuneraciones:', entryError);
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
    console.error('❌ Error creando líneas del asiento remuneraciones:', linesError);
    
    // Rollback: eliminar asiento principal
    await supabase
      .from('journal_entries')
      .delete()
      .eq('id', journalEntry.id);

    throw new Error('Error creando líneas del asiento');
  }

  console.log(`✅ Asiento remuneraciones guardado: ${journalEntry.id}`);
  return journalEntry;
}