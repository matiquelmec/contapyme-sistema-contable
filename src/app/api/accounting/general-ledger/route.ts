import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET /api/accounting/general-ledger - Generar Libro Mayor desde Libro Diario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const account_code = searchParams.get('account_code');
    const format = searchParams.get('format');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('🏛️ Generando Libro Mayor desde Libro Diario:', {
      company_id,
      date_from,
      date_to,
      account_code,
      format
    });

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // Obtener asientos del Libro Diario con sus líneas
    let query = supabase
      .from('journal_entries')
      .select(`
        id,
        entry_number,
        entry_date,
        description,
        reference,
        entry_type,
        status,
        journal_entry_lines (
          account_code,
          account_name,
          debit_amount,
          credit_amount,
          line_description,
          reference
        )
      `)
      .eq('company_id', company_id)
      .in('status', ['approved', 'draft'])
      .order('entry_date', { ascending: true })
      .order('entry_number', { ascending: true });

    // Aplicar filtros de fecha
    if (date_from) {
      query = query.gte('entry_date', date_from);
    }
    if (date_to) {
      query = query.lte('entry_date', date_to);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo asientos del Libro Diario:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener datos del Libro Diario: ' + error.message
      }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          accounts: [],
          summary: {
            total_accounts: 0,
            total_debit: 0,
            total_credit: 0,
            period: { date_from, date_to }
          },
          message: 'No hay asientos en el Libro Diario para el período seleccionado'
        }
      });
    }

    // Procesar las líneas del Libro Diario para generar el Libro Mayor
    const accountsMap = new Map();
    let totalDebit = 0;
    let totalCredit = 0;

    // Agrupar movimientos por cuenta
    entries.forEach(entry => {
      if (!entry.journal_entry_lines) return;
      
      entry.journal_entry_lines.forEach(line => {
        // Filtrar por cuenta específica si se solicita
        if (account_code && line.account_code !== account_code) return;

        if (!accountsMap.has(line.account_code)) {
          accountsMap.set(line.account_code, {
            account_code: line.account_code,
            account_name: line.account_name,
            movements: [],
            total_debit: 0,
            total_credit: 0,
            balance: 0
          });
        }

        const account = accountsMap.get(line.account_code);
        
        // Agregar movimiento
        account.movements.push({
          date: entry.entry_date,
          entry_number: entry.entry_number,
          description: line.line_description || entry.description,
          reference: line.reference || entry.reference,
          debit: line.debit_amount || 0,
          credit: line.credit_amount || 0,
          entry_type: entry.entry_type
        });

        // Actualizar totales
        account.total_debit += line.debit_amount || 0;
        account.total_credit += line.credit_amount || 0;
        account.balance = account.total_debit - account.total_credit;

        totalDebit += line.debit_amount || 0;
        totalCredit += line.credit_amount || 0;
      });
    });

    // Convertir el Map a array y ordenar por código de cuenta
    const accounts = Array.from(accountsMap.values()).sort((a, b) => 
      a.account_code.localeCompare(b.account_code)
    );

    // Calcular saldo acumulado para cada cuenta
    accounts.forEach(account => {
      let runningBalance = 0;
      account.movements = account.movements.map(movement => {
        runningBalance += (movement.debit - movement.credit);
        return {
          ...movement,
          running_balance: runningBalance
        };
      });
    });

    const generalLedger = {
      accounts,
      summary: {
        total_accounts: accounts.length,
        total_debit: totalDebit,
        total_credit: totalCredit,
        balance_check: Math.abs(totalDebit - totalCredit) < 0.01, // Verificar balance
        period: { 
          date_from: date_from || 'Inicio',
          date_to: date_to || 'Actual'
        },
        generated_at: new Date().toISOString()
      }
    };

    console.log(`✅ Libro Mayor generado: ${accounts.length} cuentas, ${entries.length} asientos procesados`);

    // Si se solicita formato Excel, procesar aquí
    if (format === 'excel') {
      try {
        // ExcelJS ya importado arriba
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Libro Mayor');
        
        // Configurar encabezados
        worksheet.columns = [
          { header: 'Código Cuenta', key: 'account_code', width: 15 },
          { header: 'Nombre Cuenta', key: 'account_name', width: 35 },
          { header: 'Fecha', key: 'date', width: 12 },
          { header: 'N° Asiento', key: 'entry_number', width: 12 },
          { header: 'Descripción', key: 'description', width: 40 },
          { header: 'Tipo', key: 'entry_type', width: 12 },
          { header: 'Débito', key: 'debit', width: 15 },
          { header: 'Crédito', key: 'credit', width: 15 },
          { header: 'Saldo', key: 'balance', width: 15 }
        ];
        
        // Estilo de encabezados
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        let rowIndex = 2;
        
        // Agregar datos de cada cuenta
        accounts.forEach(account => {
          // Encabezado de cuenta
          const headerRow = worksheet.addRow({
            account_code: account.account_code,
            account_name: account.account_name,
            date: '',
            entry_number: '',
            description: `TOTAL CUENTA - Débitos: ${account.total_debit} - Créditos: ${account.total_credit}`,
            entry_type: '',
            debit: account.total_debit,
            credit: account.total_credit,
            balance: account.balance
          });
          
          headerRow.font = { bold: true };
          headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
          };
          
          // Movimientos de la cuenta
          account.movements.forEach(movement => {
            const balanceText = movement.running_balance > 0 
              ? `${Math.abs(movement.running_balance)} (Deudor)`
              : movement.running_balance < 0 
                ? `${Math.abs(movement.running_balance)} (Acreedor)`
                : '0';
                
            worksheet.addRow({
              account_code: '',
              account_name: '',
              date: movement.date,
              entry_number: movement.entry_number,
              description: movement.description,
              entry_type: movement.entry_type,
              debit: movement.debit || '',
              credit: movement.credit || '',
              balance: balanceText
            });
          });
          
          // Línea vacía entre cuentas
          worksheet.addRow({});
        });
        
        // Configurar respuesta
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `libro_mayor_${company_id}_${date_from || 'inicio'}_${date_to || 'fin'}.xlsx`;
        
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

    return NextResponse.json({
      success: true,
      data: generalLedger
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/accounting/general-ledger:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST /api/accounting/general-ledger/export - Exportar Libro Mayor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, date_from, date_to, format = 'pdf' } = body;

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('📊 Exportando Libro Mayor:', {
      company_id,
      date_from,
      date_to,
      format
    });

    // Obtener datos del Libro Mayor usando el mismo proceso que GET
    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // Obtener asientos del Libro Diario
    let query = supabase
      .from('journal_entries')
      .select(`
        id,
        entry_number,
        entry_date,
        description,
        reference,
        entry_type,
        journal_entry_lines (
          account_code,
          account_name,
          debit_amount,
          credit_amount,
          line_description
        )
      `)
      .eq('company_id', company_id)
      .in('status', ['approved', 'draft'])
      .order('entry_date', { ascending: true });

    if (date_from) {
      query = query.gte('entry_date', date_from);
    }
    if (date_to) {
      query = query.lte('entry_date', date_to);
    }

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener datos: ' + error.message
      }, { status: 500 });
    }

    // Redirigir a GET con formato Excel
    const queryParams = new URLSearchParams({
      company_id,
      format: 'excel',
      ...(date_from && { date_from }),
      ...(date_to && { date_to })
    });
    
    // Hacer request interno
    const getRequest = new NextRequest(`${request.url}?${queryParams}`, {
      method: 'GET'
    });
    
    return await GET(getRequest);

  } catch (error: any) {
    console.error('❌ Error en POST /api/accounting/general-ledger/export:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}