import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET /api/accounting/balance-8-columns - Generar Balance de 8 Columnas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const format = searchParams.get('format');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('📊 Generando Balance de 8 Columnas:', {
      company_id,
      date_from,
      date_to,
      format
    });

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // CORRECCIÓN: Obtener TODAS las cuentas que tienen movimientos
    // No filtrar por level_type para asegurar que todas las cuentas aparezcan
    let accountsQuery = supabase
      .from('chart_of_accounts')
      .select('code, name, account_type, level_type')
      .eq('is_active', true)
      // .eq('level_type', 'Imputable')  // REMOVIDO - incluir todas las cuentas
      .order('code', { ascending: true });

    const { data: chartAccounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error('❌ Error obteniendo plan de cuentas:', accountsError);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener plan de cuentas: ' + accountsError.message
      }, { status: 500 });
    }

    console.log('📊 PARÁMETROS DE CONSULTA:');
    console.log(`  company_id: ${company_id}`);
    console.log(`  date_from: ${date_from}`);
    console.log(`  date_to: ${date_to}`);

    // Obtener asientos del Libro Diario para calcular saldos
    // USAR LA MISMA LÓGICA QUE EL LIBRO DIARIO
    let entriesQuery = supabase
      .from('journal_entries')
      .select(`
        id,
        entry_date,
        status,
        total_debit,
        total_credit,
        journal_entry_lines (
          account_code,
          account_name,
          debit_amount,
          credit_amount
        )
      `)
      .eq('company_id', company_id)
      .in('status', ['approved', 'draft']);

    if (date_from) {
      entriesQuery = entriesQuery.gte('entry_date', date_from);
    }
    if (date_to) {
      entriesQuery = entriesQuery.lte('entry_date', date_to);
    }

    const { data: entries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('❌ Error obteniendo asientos:', entriesError);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener asientos: ' + entriesError.message
      }, { status: 500 });
    }

    console.log('📊 ASIENTOS OBTENIDOS:');
    console.log(`  Total asientos: ${entries?.length || 0}`);
    
    // Calcular totales directos de los asientos para comparar
    const directTotals = {
      debit: 0,
      credit: 0
    };
    
    entries?.forEach(entry => {
      directTotals.debit += entry.total_debit || 0;
      directTotals.credit += entry.total_credit || 0;
    });
    
    console.log(`📊 TOTALES DIRECTOS DE ASIENTOS:`);
    console.log(`  Debe: $${directTotals.debit.toLocaleString()}`);
    console.log(`  Haber: $${directTotals.credit.toLocaleString()}`);

    // Procesar datos para crear el Balance de 8 Columnas
    const accountsMap = new Map();
    
    // Inicializar todas las cuentas del plan
    chartAccounts?.forEach(account => {
      accountsMap.set(account.code, {
        account_code: account.code,
        account_name: account.name,
        account_type: account.account_type,
        // Balance de Comprobación (desde Libro Mayor)
        trial_balance_debit: 0,
        trial_balance_credit: 0,
        // Ajustes (por ahora 0, se pueden agregar manualmente)
        adjustments_debit: 0,
        adjustments_credit: 0,
        // Balance Ajustado (trial + adjustments)
        adjusted_balance_debit: 0,
        adjusted_balance_credit: 0,
        // Estado de Resultados (solo cuentas de resultado)
        income_statement_debit: 0,
        income_statement_credit: 0,
        // Balance General (solo cuentas patrimoniales)
        balance_sheet_debit: 0,
        balance_sheet_credit: 0
      });
    });

    // Calcular saldos desde los asientos del Libro Diario
    console.log('📊 PROCESANDO ASIENTOS PARA CÁLCULOS:');
    entries?.forEach(entry => {
      console.log(`  Asiento ${entry.entry_number || 'S/N'}: ${entry.journal_entry_lines?.length || 0} líneas`);
      entry.journal_entry_lines?.forEach((line, index) => {
        const debitAmount = line.debit_amount || 0;
        const creditAmount = line.credit_amount || 0;
        
        if (accountsMap.has(line.account_code)) {
          // Cuenta existe en el plan
          const account = accountsMap.get(line.account_code);
          account.trial_balance_debit += debitAmount;
          account.trial_balance_credit += creditAmount;
          
          if (index < 3) { // Log primeras 3 líneas de cada asiento
            console.log(`    ✅ ${line.account_code} ${line.account_name}: D=$${debitAmount.toLocaleString()} H=$${creditAmount.toLocaleString()}`);
          }
        } else {
          // CUENTA NO EXISTE EN PLAN - CREARLA DINÁMICAMENTE
          console.log(`    🔄 Agregando cuenta faltante: ${line.account_code} ${line.account_name}`);
          
          // Determinar tipo de cuenta basado en el código
          let account_type = 'Otros';
          const firstDigit = line.account_code.charAt(0);
          if (firstDigit === '1') account_type = 'Activos';
          else if (firstDigit === '2') account_type = 'Pasivos';
          else if (firstDigit === '3') account_type = 'Patrimonio';
          else if (firstDigit === '4') account_type = 'Ingresos';
          else if (firstDigit === '5') account_type = 'Gastos';
          else if (firstDigit === '6') account_type = 'Gastos';
          
          // Crear cuenta dinámica
          accountsMap.set(line.account_code, {
            account_code: line.account_code,
            account_name: line.account_name,
            account_type: account_type,
            trial_balance_debit: debitAmount,
            trial_balance_credit: creditAmount,
            adjustments_debit: 0,
            adjustments_credit: 0,
            adjusted_balance_debit: 0,
            adjusted_balance_credit: 0,
            income_statement_debit: 0,
            income_statement_credit: 0,
            balance_sheet_debit: 0,
            balance_sheet_credit: 0
          });
          
          if (index < 3) {
            console.log(`    ➕ ${line.account_code} ${line.account_name}: D=$${debitAmount.toLocaleString()} H=$${creditAmount.toLocaleString()} (NUEVA)`);
          }
        }
      });
    });

    // NUEVA LÓGICA: Estructura igual a Gastrologica
    // 8 columnas: Debe, Haber, Saldo Deudor, Saldo Acreedor, Activo, Pasivo, Pérdida, Ganancia
    const accounts = Array.from(accountsMap.values()).map(account => {
      // Determinar saldo neto
      const netBalance = account.trial_balance_debit - account.trial_balance_credit;
      
      // Saldo Deudor / Saldo Acreedor
      if (netBalance > 0) {
        account.adjusted_balance_debit = netBalance;
        account.adjusted_balance_credit = 0;
      } else if (netBalance < 0) {
        account.adjusted_balance_debit = 0;
        account.adjusted_balance_credit = Math.abs(netBalance);
      } else {
        account.adjusted_balance_debit = 0;
        account.adjusted_balance_credit = 0;
      }

      // Clasificar según tipo de cuenta (igual que Gastrologica)
      const accountCode = account.account_code.toString();
      const firstDigit = accountCode.charAt(0);
      
      // Resetear todas las columnas
      account.income_statement_debit = 0;   // Pérdida
      account.income_statement_credit = 0;  // Ganancia
      account.balance_sheet_debit = 0;      // Activo
      account.balance_sheet_credit = 0;     // Pasivo

      if (firstDigit === '1') {
        // ACTIVOS - Solo van a columna Activo si tienen saldo deudor
        if (account.adjusted_balance_debit > 0) {
          account.balance_sheet_debit = account.adjusted_balance_debit;
        }
        // EXCEPCIÓN: Remanente crédito fiscal con saldo acreedor va a Pasivos
        if (account.account_code === '1.3.1.001' && account.adjusted_balance_credit > 0) {
          account.balance_sheet_credit = account.adjusted_balance_credit;
          account.balance_sheet_debit = 0;
        }
      } else if (firstDigit === '2') {
        // PASIVOS - Solo van a columna Pasivo si tienen saldo acreedor
        if (account.adjusted_balance_credit > 0) {
          account.balance_sheet_credit = account.adjusted_balance_credit;
        }
      } else if (firstDigit === '3') {
        // PATRIMONIO - Solo van a columna Pasivo si tienen saldo acreedor
        if (account.adjusted_balance_credit > 0) {
          account.balance_sheet_credit = account.adjusted_balance_credit;
        }
      } else if (firstDigit === '4') {
        // INGRESOS - Van a columna Ganancia si tienen saldo acreedor
        if (account.adjusted_balance_credit > 0) {
          account.income_statement_credit = account.adjusted_balance_credit;
        }
        // INGRESOS con saldo deudor van a Pérdida (caso raro pero posible)
        if (account.adjusted_balance_debit > 0) {
          account.income_statement_debit = account.adjusted_balance_debit;
        }
      } else if (firstDigit === '5') {
        // GASTOS - Van a columna Pérdida si tienen saldo deudor
        if (account.adjusted_balance_debit > 0) {
          account.income_statement_debit = account.adjusted_balance_debit;
        }
        // GASTOS con saldo acreedor van a Ganancia (caso raro pero posible)
        if (account.adjusted_balance_credit > 0) {
          account.income_statement_credit = account.adjusted_balance_credit;
        }
      } else if (firstDigit === '6') {
        // GASTOS (cuentas 6xxx) - También van a columna Pérdida si tienen saldo deudor
        if (account.adjusted_balance_debit > 0) {
          account.income_statement_debit = account.adjusted_balance_debit;
        }
        // GASTOS con saldo acreedor van a Ganancia (caso raro pero posible)
        if (account.adjusted_balance_credit > 0) {
          account.income_statement_credit = account.adjusted_balance_credit;
        }
      }

      return account;
    });

    // CORRECCIÓN CRÍTICA: Verificar los datos y calcular totales correctamente
    console.log('🔍 DEBUGGING CÁLCULOS:');
    console.log(`Total cuentas procesadas: ${accounts.length}`);
    
    // Mostrar algunas cuentas con movimientos para debug
    const accountsWithMovement = accounts.filter(a => a.trial_balance_debit > 0 || a.trial_balance_credit > 0);
    console.log(`Cuentas con movimiento: ${accountsWithMovement.length}`);
    
    if (accountsWithMovement.length > 0) {
      console.log('Primeras 5 cuentas con movimiento:');
      accountsWithMovement.slice(0, 5).forEach(acc => {
        console.log(`  ${acc.account_code} ${acc.account_name}: D=${acc.trial_balance_debit} H=${acc.trial_balance_credit}`);
      });
    }

    // El Balance de Comprobación debe mostrar TODOS los movimientos (brutos)
    // Las demás columnas muestran saldos netos
    const totals = accounts.reduce((acc, account) => {
      // Balance de Comprobación: TOTALES BRUTOS (como en Libro Diario)
      acc.trial_balance_debit += account.trial_balance_debit || 0;
      acc.trial_balance_credit += account.trial_balance_credit || 0;
      
      // Ajustes: totales de ajustes
      acc.adjustments_debit += account.adjustments_debit || 0;
      acc.adjustments_credit += account.adjustments_credit || 0;
      
      // Balance Ajustado: SALDOS NETOS (esto está correcto)
      acc.adjusted_balance_debit += account.adjusted_balance_debit || 0;
      acc.adjusted_balance_credit += account.adjusted_balance_credit || 0;
      
      // Estado Resultados y Balance General: SALDOS NETOS (esto está correcto)
      acc.income_statement_debit += account.income_statement_debit || 0;
      acc.income_statement_credit += account.income_statement_credit || 0;
      acc.balance_sheet_debit += account.balance_sheet_debit || 0;
      acc.balance_sheet_credit += account.balance_sheet_credit || 0;
      
      return acc;
    }, {
      trial_balance_debit: 0,
      trial_balance_credit: 0,
      adjustments_debit: 0,
      adjustments_credit: 0,
      adjusted_balance_debit: 0,
      adjusted_balance_credit: 0,
      income_statement_debit: 0,
      income_statement_credit: 0,
      balance_sheet_debit: 0,
      balance_sheet_credit: 0,
      net_income: 0
    });

    // Calcular utilidad/pérdida del ejercicio
    totals.net_income = totals.income_statement_credit - totals.income_statement_debit;
    
    console.log('📊 ANÁLISIS ESTADO DE RESULTADOS:');
    console.log(`  Ingresos (Ganancia): $${totals.income_statement_credit.toLocaleString()}`);
    console.log(`  Gastos (Pérdida): $${totals.income_statement_debit.toLocaleString()}`);
    console.log(`  Utilidad Neta: $${totals.net_income.toLocaleString()}`);
    
    // Mostrar algunas cuentas de resultado
    const incomeAccounts = accounts.filter(a => a.income_statement_credit > 0 || a.income_statement_debit > 0);
    console.log(`📊 CUENTAS DE RESULTADO (${incomeAccounts.length} cuentas):`);
    incomeAccounts.slice(0, 8).forEach(acc => {
      if (acc.income_statement_credit > 0) {
        console.log(`  💰 GANANCIA: ${acc.account_code} ${acc.account_name} = $${acc.income_statement_credit.toLocaleString()}`);
      }
      if (acc.income_statement_debit > 0) {
        console.log(`  💸 PÉRDIDA: ${acc.account_code} ${acc.account_name} = $${acc.income_statement_debit.toLocaleString()}`);
      }
    });

    // NO agregar la utilidad a los totales aquí, se muestra por separado en el frontend

    const balance8Columns = {
      accounts: accounts.sort((a, b) => a.account_code.localeCompare(b.account_code)),
      totals,
      period: {
        date_from: date_from || 'Inicio',
        date_to: date_to || 'Actual'
      }
    };

    // Si se solicita formato Excel
    if (format === 'excel') {
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Balance 8 Columnas');

        // Configurar encabezados principales
        worksheet.mergeCells('A1:C1');
        worksheet.getCell('A1').value = 'CUENTA';
        worksheet.mergeCells('D1:E1');
        worksheet.getCell('D1').value = 'BALANCE DE COMPROBACIÓN';
        worksheet.mergeCells('F1:G1');
        worksheet.getCell('F1').value = 'AJUSTES';
        worksheet.mergeCells('H1:I1');
        worksheet.getCell('H1').value = 'BALANCE AJUSTADO';
        worksheet.mergeCells('J1:K1');
        worksheet.getCell('J1').value = 'ESTADO DE RESULTADOS';
        worksheet.mergeCells('L1:M1');
        worksheet.getCell('L1').value = 'BALANCE GENERAL';

        // Subencabezados
        const headers = ['Código', 'Nombre', 'Tipo', 'Debe', 'Haber', 'Debe', 'Haber', 'Debe', 'Haber', 'Debe', 'Haber', 'Debe', 'Haber'];
        worksheet.addRow(headers);

        // Estilo de encabezados
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(2).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        worksheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };

        // Agregar datos
        accounts.forEach(account => {
          worksheet.addRow([
            account.account_code,
            account.account_name,
            account.account_type,
            account.trial_balance_debit || '',
            account.trial_balance_credit || '',
            account.adjustments_debit || '',
            account.adjustments_credit || '',
            account.adjusted_balance_debit || '',
            account.adjusted_balance_credit || '',
            account.income_statement_debit || '',
            account.income_statement_credit || '',
            account.balance_sheet_debit || '',
            account.balance_sheet_credit || ''
          ]);
        });

        // Fila de totales
        const totalsRow = worksheet.addRow([
          '', 'TOTALES', '',
          totals.trial_balance_debit,
          totals.trial_balance_credit,
          totals.adjustments_debit,
          totals.adjustments_credit,
          totals.adjusted_balance_debit,
          totals.adjusted_balance_credit,
          totals.income_statement_debit,
          totals.income_statement_credit,
          totals.balance_sheet_debit,
          totals.balance_sheet_credit
        ]);
        totalsRow.font = { bold: true };

        // Ajustar anchos de columna
        worksheet.columns = [
          { width: 12 }, { width: 30 }, { width: 12 },
          { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
          { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
          { width: 15 }, { width: 15 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `balance_8_columnas_${company_id}_${date_from || 'inicio'}_${date_to || 'fin'}.xlsx`;

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length.toString()
          }
        });

      } catch (excelError: any) {
        console.error('❌ Error generando Excel:', excelError);
        return NextResponse.json({
          success: false,
          error: 'Error generando archivo Excel: ' + excelError.message
        }, { status: 500 });
      }
    }

    console.log(`✅ Balance de 8 Columnas generado: ${accounts.length} cuentas, Utilidad: ${totals.net_income}`);
    console.log(`📊 CUENTAS CON MOVIMIENTO: ${accounts.filter(a => a.trial_balance_debit > 0 || a.trial_balance_credit > 0).length}`);
    console.log(`📊 TOTAL CUENTAS EN PLAN: ${chartAccounts?.length || 0}`);
    console.log('📊 TOTALES DETALLADOS DEL BALANCE:');
    console.log(`   Debe: $${totals.trial_balance_debit.toLocaleString()}`);
    console.log(`   Haber: $${totals.trial_balance_credit.toLocaleString()}`);
    console.log(`   Diferencia: $${(totals.trial_balance_debit - totals.trial_balance_credit).toLocaleString()}`);

    return NextResponse.json({
      success: true,
      data: balance8Columns
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/accounting/balance-8-columns:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}