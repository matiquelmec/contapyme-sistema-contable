import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

interface RCVTransaction {
  entity_rut: string;
  entity_name: string;
  document_type: string;
  document_number: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  account_code?: string;
  account_name?: string;
}

interface JournalEntry {
  entry_date: string;
  description: string;
  reference: string;
  details: JournalDetail[];
}

interface JournalDetail {
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  entity_rut?: string;
  entity_name?: string;
}

/**
 * POST /api/accounting/journal-book/integration/rcv-purchases
 * Genera asientos contables automáticos para RCV de compras
 * 
 * Lógica contable:
 * DEBE: Cuentas de gastos específicas por entidad (acumuladas por cuenta)
 * DEBE: IVA Crédito Fiscal (cuenta centralizada)
 * HABER: Proveedores (cuenta centralizada o específica por entidad)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, period, rcv_data, options = {} } = body;

    if (!company_id || !period || !rcv_data) {
      return NextResponse.json({
        success: false,
        error: 'Campos requeridos: company_id, period, rcv_data'
      }, { status: 400 });
    }

    console.log('🧮 Generando asientos RCV Compras:', {
      company_id,
      period,
      transactions: rcv_data.length
    });

    // 1. Obtener configuración centralizada de cuentas
    const { data: centralConfig } = await supabase
      .from('centralized_account_config')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (!centralConfig) {
      return NextResponse.json({
        success: false,
        error: 'Configuración centralizada de cuentas no encontrada. Configúrala primero en /accounting/configuration'
      }, { status: 400 });
    }

    // 2. Obtener configuración específica de entidades RCV
    const { data: entities } = await supabase
      .from('rcv_entities')
      .select('entity_rut, entity_name, account_code, account_name')
      .eq('company_id', company_id)
      .eq('is_active', true);

    // Crear mapa de entidades para lookup rápido
    const entityMap = new Map();
    entities?.forEach(entity => {
      entityMap.set(entity.entity_rut, entity);
    });

    // 3. Procesar transacciones y agrupar por cuenta de gasto
    const accountTotals = new Map<string, {
      account_code: string;
      account_name: string;
      net_amount: number;
      transactions: RCVTransaction[];
    }>();

    let totalIVA = 0;
    let totalProviders = 0;
    const providerTotals = new Map<string, {
      entity_rut: string;
      entity_name: string;
      total_amount: number;
    }>();

    for (const transaction of rcv_data as RCVTransaction[]) {
      // Buscar configuración de cuenta específica de la entidad
      const entityConfig = entityMap.get(transaction.entity_rut);
      
      // Usar cuenta específica de la entidad o cuenta por defecto de gastos
      const expenseAccountCode = entityConfig?.account_code || centralConfig.default_expense_account;
      const expenseAccountName = entityConfig?.account_name || 'Gastos Operacionales';

      // Acumular por cuenta de gasto
      const key = expenseAccountCode;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, {
          account_code: expenseAccountCode,
          account_name: expenseAccountName,
          net_amount: 0,
          transactions: []
        });
      }

      const accountTotal = accountTotals.get(key)!;
      accountTotal.net_amount += transaction.net_amount;
      accountTotal.transactions.push(transaction);

      // Acumular IVA
      totalIVA += transaction.tax_amount;

      // Acumular por proveedor
      const providerKey = transaction.entity_rut;
      if (!providerTotals.has(providerKey)) {
        providerTotals.set(providerKey, {
          entity_rut: transaction.entity_rut,
          entity_name: transaction.entity_name,
          total_amount: 0
        });
      }
      providerTotals.get(providerKey)!.total_amount += transaction.total_amount;
      totalProviders += transaction.total_amount;
    }

    // 4. Generar detalles del asiento contable
    const journalDetails: JournalDetail[] = [];

    // DEBE: Cuentas de gastos agrupadas
    for (const [accountCode, accountTotal] of accountTotals) {
      journalDetails.push({
        account_code: accountTotal.account_code,
        account_name: accountTotal.account_name,
        description: `Gastos ${period} - ${accountTotal.transactions.length} transacciones`,
        debit_amount: accountTotal.net_amount,
        credit_amount: 0
      });
    }

    // DEBE: IVA Crédito Fiscal
    if (totalIVA > 0) {
      journalDetails.push({
        account_code: centralConfig.iva_credit_account || '1.1.4.001',
        account_name: centralConfig.iva_credit_account_name || 'IVA Crédito Fiscal',
        description: `IVA Crédito Fiscal ${period}`,
        debit_amount: totalIVA,
        credit_amount: 0
      });
    }

    // HABER: Proveedores
    if (options.group_suppliers) {
      // Opción 1: Una sola cuenta de proveedores consolidada
      journalDetails.push({
        account_code: centralConfig.suppliers_account || '2.1.1.001',
        account_name: centralConfig.suppliers_account_name || 'Proveedores Nacionales',
        description: `Proveedores ${period} - ${providerTotals.size} proveedores`,
        debit_amount: 0,
        credit_amount: totalProviders
      });
    } else {
      // Opción 2: Detalle por proveedor (usando configuración específica si existe)
      for (const [rutProveedor, providerData] of providerTotals) {
        const entityConfig = entityMap.get(rutProveedor);
        const supplierAccountCode = entityConfig?.account_code || centralConfig.suppliers_account || '2.1.1.001';
        const supplierAccountName = entityConfig?.account_name || centralConfig.suppliers_account_name || 'Proveedores Nacionales';

        journalDetails.push({
          account_code: supplierAccountCode,
          account_name: supplierAccountName,
          description: `${providerData.entity_name} - ${period}`,
          debit_amount: 0,
          credit_amount: providerData.total_amount,
          entity_rut: providerData.entity_rut,
          entity_name: providerData.entity_name
        });
      }
    }

    // 5. Crear asiento contable principal
    const journalEntry: JournalEntry = {
      entry_date: new Date().toISOString().split('T')[0],
      description: `RCV Compras ${period} - Integración Automática`,
      reference: `RCV-COMP-${period}`,
      details: journalDetails
    };

    // 6. Validar balance del asiento
    const totalDebits = journalDetails.reduce((sum, detail) => sum + detail.debit_amount, 0);
    const totalCredits = journalDetails.reduce((sum, detail) => sum + detail.credit_amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({
        success: false,
        error: `Asiento desbalanceado: Debe ${totalDebits} vs Haber ${totalCredits}`,
        debug: { totalDebits, totalCredits, difference: totalDebits - totalCredits }
      }, { status: 400 });
    }

    // 7. Guardar en base de datos (opcional)
    if (options.save_to_database) {
      // Aquí se guardaría el asiento en la tabla journal_entries
      // Por ahora solo devolvemos la preview
      console.log('💾 Guardando asiento en base de datos...');
    }

    // 8. Respuesta con asiento generado
    return NextResponse.json({
      success: true,
      data: {
        journal_entry: journalEntry,
        summary: {
          total_transactions: rcv_data.length,
          total_suppliers: providerTotals.size,
          total_expense_accounts: accountTotals.size,
          total_net_amount: Array.from(accountTotals.values()).reduce((sum, acc) => sum + acc.net_amount, 0),
          total_iva_amount: totalIVA,
          total_gross_amount: totalProviders,
          balance_check: { totalDebits, totalCredits, balanced: Math.abs(totalDebits - totalCredits) < 0.01 }
        },
        account_breakdown: {
          expense_accounts: Array.from(accountTotals.entries()).map(([code, data]) => ({
            account_code: data.account_code,
            account_name: data.account_name,
            amount: data.net_amount,
            transaction_count: data.transactions.length
          })),
          supplier_breakdown: Array.from(providerTotals.entries()).map(([rut, data]) => ({
            entity_rut: data.entity_rut,
            entity_name: data.entity_name,
            total_amount: data.total_amount
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generando asientos RCV Compras:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/journal-book/integration/rcv-purchases
 * Obtiene datos de RCV de compras pendientes de contabilizar
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const period = searchParams.get('period');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    console.log('📊 Obteniendo datos RCV Compras pendientes:', { companyId, period });

    // Consulta base para RCV de compras
    let query = supabase
      .from('rcv_records')
      .select(`
        id,
        period,
        total_net_amount,
        total_tax_amount,
        total_amount,
        file_name,
        created_at,
        transactions:rcv_transactions(
          entity_rut,
          entity_name,
          document_type,
          document_number,
          net_amount,
          tax_amount,
          total_amount
        )
      `)
      .eq('company_id', companyId)
      .eq('record_type', 'purchase')
      .eq('status', 'processed')
      .is('journal_entry_id', null); // Solo los que no han sido contabilizados

    if (period) {
      query = query.eq('period', period);
    }

    const { data: rcvRecords, error } = await query.order('period', { ascending: false });

    if (error) {
      console.error('❌ Error consultando RCV records:', error);
      return NextResponse.json({
        success: false,
        error: 'Error consultando registros RCV'
      }, { status: 500 });
    }

    // Procesar datos para respuesta
    const processedData = rcvRecords?.map(record => ({
      id: record.id,
      period: record.period,
      file_name: record.file_name,
      total_net_amount: record.total_net_amount,
      total_tax_amount: record.total_tax_amount,
      total_amount: record.total_amount,
      transaction_count: record.transactions?.length || 0,
      unique_suppliers: new Set(record.transactions?.map((t: any) => t.entity_rut)).size,
      created_at: record.created_at,
      can_integrate: record.transactions && record.transactions.length > 0
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        rcv_purchases: processedData,
        summary: {
          total_periods: processedData.length,
          total_transactions: processedData.reduce((sum, record) => sum + record.transaction_count, 0),
          total_amount: processedData.reduce((sum, record) => sum + record.total_amount, 0),
          unique_suppliers: new Set(
            processedData.flatMap(record => 
              record.transactions?.map((t: any) => t.entity_rut) || []
            )
          ).size
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos RCV Compras:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}