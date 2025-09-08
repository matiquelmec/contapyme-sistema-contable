import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// Configuración de procesamiento por lotes
const BATCH_CONFIG = {
  MAX_LINES_PER_ENTRY: 500,         // Máximo de líneas por asiento contable
  MAX_AMOUNT_PER_ENTRY: 500000000,  // Monto máximo por asiento (500 millones)
};

interface RCVTransaction {
  entity_rut: string;
  entity_name: string;
  document_type: string;
  document_number: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  emission_date?: string;
  reception_date?: string;
  folio?: string;
}

interface EntityAccountMapping {
  entity_rut: string;
  entity_name: string;
  account_code: string;
  account_name: string;
  cost_center?: string;
  document_type_config?: {
    [key: string]: {
      account_code: string;
      account_name: string;
    };
  };
}

interface JournalEntry {
  company_id: string;
  entry_date: string;
  description: string;
  reference: string;
  entry_type: string;
  status: 'draft' | 'posted';
  details: JournalDetail[];
  metadata?: any;
}

interface JournalDetail {
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  entity_rut?: string;
  entity_name?: string;
  cost_center?: string;
  document_reference?: string;
  document_type?: string;
}

/**
 * Obtiene el mapeo de cuentas contables para las entidades
 * IMPORTANTE: Cada entidad YA tiene su cuenta contable asignada al guardarla
 */
async function getEntityAccountMappings(
  companyId: string,
  entityRuts: string[]
): Promise<Map<string, EntityAccountMapping>> {
  const { data: entities } = await supabase
    .from('rcv_entities')
    .select('*')
    .eq('company_id', companyId)
    .in('entity_rut', entityRuts);

  const entityMap = new Map<string, EntityAccountMapping>();
  
  entities?.forEach(entity => {
    entityMap.set(entity.entity_rut, {
      entity_rut: entity.entity_rut,
      entity_name: entity.entity_name,
      account_code: entity.account_code, // Cuenta contable ya asignada a la entidad
      account_name: entity.account_name,
      cost_center: entity.cost_center,
      document_type_config: entity.document_type_config
    });
  });

  return entityMap;
}

/**
 * Determina la cuenta contable según el tipo de documento
 * Prioridad: 1) Config por tipo doc, 2) Cuenta de la entidad, 3) Cuenta por defecto
 */
function getAccountForDocumentType(
  entity: EntityAccountMapping | undefined,
  documentType: string,
  defaultAccount: string,
  defaultAccountName: string
): { code: string; name: string } {
  // Si la entidad tiene configuración específica por tipo de documento
  if (entity?.document_type_config && entity.document_type_config[documentType]) {
    return {
      code: entity.document_type_config[documentType].account_code,
      name: entity.document_type_config[documentType].account_name
    };
  }

  // USAR LA CUENTA CONTABLE DE LA ENTIDAD (ya viene asignada)
  if (entity?.account_code) {
    return {
      code: entity.account_code,
      name: entity.account_name
    };
  }

  // Solo usar cuenta por defecto si no hay cuenta en la entidad
  return {
    code: defaultAccount,
    name: defaultAccountName
  };
}

/**
 * Genera asientos contables detallados para RCV de compras
 * CADA LÍNEA DEL RCV GENERA SU PROPIA LÍNEA EN EL ASIENTO CONTABLE
 */
async function generatePurchaseEntries(
  companyId: string,
  transactions: RCVTransaction[],
  entityMap: Map<string, EntityAccountMapping>,
  centralConfig: any,
  period: string,
  batchNumber: number = 1,
  totalBatches: number = 1
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  let currentDetails: JournalDetail[] = [];
  let currentEntryNumber = 1;
  let currentLineCount = 0;
  let currentTotalAmount = 0;

  // Procesar cada transacción individualmente
  for (const transaction of transactions) {
    const entity = entityMap.get(transaction.entity_rut);
    
    // USAR LA CUENTA CONTABLE DE LA ENTIDAD
    const expenseAccount = getAccountForDocumentType(
      entity,
      transaction.document_type,
      centralConfig.default_expense_account || '5.1.1.001',
      'Gastos Operacionales'
    );

    // Crear líneas de detalle para esta transacción
    const transactionDetails: JournalDetail[] = [];

    // DEBE: Cuenta de gasto/costo específica de la entidad
    if (transaction.net_amount > 0) {
      transactionDetails.push({
        account_code: expenseAccount.code,
        account_name: expenseAccount.name,
        description: `${entity?.entity_name || transaction.entity_name} - Doc ${transaction.document_number}`,
        debit_amount: transaction.net_amount,
        credit_amount: 0,
        entity_rut: transaction.entity_rut,
        entity_name: transaction.entity_name,
        cost_center: entity?.cost_center,
        document_reference: transaction.document_number,
        document_type: transaction.document_type
      });
    }

    // DEBE: IVA Crédito Fiscal
    if (transaction.tax_amount > 0) {
      transactionDetails.push({
        account_code: centralConfig.iva_credit_account || '1.1.4.001',
        account_name: 'IVA Crédito Fiscal',
        description: `IVA CF - ${transaction.entity_name} - Doc ${transaction.document_number}`,
        debit_amount: transaction.tax_amount,
        credit_amount: 0,
        entity_rut: transaction.entity_rut,
        entity_name: transaction.entity_name,
        document_reference: transaction.document_number,
        document_type: transaction.document_type
      });
    }

    // HABER: Cuenta de Proveedores
    transactionDetails.push({
      account_code: centralConfig.suppliers_account || '2.1.1.001',
      account_name: 'Proveedores Nacionales',
      description: `${transaction.entity_name} - Doc ${transaction.document_number}`,
      debit_amount: 0,
      credit_amount: transaction.total_amount,
      entity_rut: transaction.entity_rut,
      entity_name: transaction.entity_name,
      document_reference: transaction.document_number,
      document_type: transaction.document_type
    });

    // Verificar si necesitamos crear un nuevo asiento
    const wouldExceedLimits = 
      currentLineCount + transactionDetails.length > BATCH_CONFIG.MAX_LINES_PER_ENTRY ||
      currentTotalAmount + transaction.total_amount > BATCH_CONFIG.MAX_AMOUNT_PER_ENTRY;

    if (wouldExceedLimits && currentDetails.length > 0) {
      // Crear asiento con los detalles actuales
      entries.push({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `RCV Compras ${period} - Asiento ${currentEntryNumber}/${totalBatches}`,
        reference: `RCV-COMP-${period}-${currentEntryNumber}`,
        entry_type: 'rcv_purchase',
        status: 'draft',
        details: currentDetails,
        metadata: {
          batch_number: batchNumber,
          entry_number: currentEntryNumber,
          total_batches: totalBatches,
          transactions_count: currentDetails.length / 3, // Aproximado (3 líneas por transacción)
          period: period,
          total_amount: currentTotalAmount
        }
      });

      // Resetear para el siguiente asiento
      currentDetails = [];
      currentLineCount = 0;
      currentTotalAmount = 0;
      currentEntryNumber++;
    }

    // Agregar detalles de esta transacción al asiento actual
    currentDetails.push(...transactionDetails);
    currentLineCount += transactionDetails.length;
    currentTotalAmount += transaction.total_amount;
  }

  // Crear el último asiento si hay detalles pendientes
  if (currentDetails.length > 0) {
    entries.push({
      company_id: companyId,
      entry_date: new Date().toISOString().split('T')[0],
      description: `RCV Compras ${period} - Asiento ${currentEntryNumber}/${totalBatches}`,
      reference: `RCV-COMP-${period}-${currentEntryNumber}`,
      entry_type: 'rcv_purchase',
      status: 'draft',
      details: currentDetails,
      metadata: {
        batch_number: batchNumber,
        entry_number: currentEntryNumber,
        total_batches: totalBatches,
        transactions_count: currentDetails.length / 3,
        period: period,
        total_amount: currentTotalAmount
      }
    });
  }

  return entries;
}

/**
 * Genera asientos contables detallados para RCV de ventas
 * CADA LÍNEA DEL RCV GENERA SU PROPIA LÍNEA EN EL ASIENTO CONTABLE
 */
async function generateSalesEntries(
  companyId: string,
  transactions: RCVTransaction[],
  entityMap: Map<string, EntityAccountMapping>,
  centralConfig: any,
  period: string,
  batchNumber: number = 1,
  totalBatches: number = 1
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  let currentDetails: JournalDetail[] = [];
  let currentEntryNumber = 1;
  let currentLineCount = 0;
  let currentTotalAmount = 0;

  for (const transaction of transactions) {
    const entity = entityMap.get(transaction.entity_rut);
    
    // USAR LA CUENTA CONTABLE DE LA ENTIDAD
    const incomeAccount = getAccountForDocumentType(
      entity,
      transaction.document_type,
      centralConfig.default_income_account || '4.1.1.001',
      'Ingresos Operacionales'
    );

    const transactionDetails: JournalDetail[] = [];

    // DEBE: Clientes
    transactionDetails.push({
      account_code: centralConfig.customers_account || '1.1.3.001',
      account_name: 'Clientes Nacionales',
      description: `${transaction.entity_name} - Doc ${transaction.document_number}`,
      debit_amount: transaction.total_amount,
      credit_amount: 0,
      entity_rut: transaction.entity_rut,
      entity_name: transaction.entity_name,
      document_reference: transaction.document_number,
      document_type: transaction.document_type
    });

    // HABER: Ingresos (USANDO CUENTA DE LA ENTIDAD)
    if (transaction.net_amount > 0) {
      transactionDetails.push({
        account_code: incomeAccount.code,
        account_name: incomeAccount.name,
        description: `${entity?.entity_name || transaction.entity_name} - Doc ${transaction.document_number}`,
        debit_amount: 0,
        credit_amount: transaction.net_amount,
        entity_rut: transaction.entity_rut,
        entity_name: transaction.entity_name,
        cost_center: entity?.cost_center,
        document_reference: transaction.document_number,
        document_type: transaction.document_type
      });
    }

    // HABER: IVA Débito Fiscal
    if (transaction.tax_amount > 0) {
      transactionDetails.push({
        account_code: centralConfig.iva_debit_account || '2.1.4.001',
        account_name: 'IVA Débito Fiscal',
        description: `IVA DF - ${transaction.entity_name} - Doc ${transaction.document_number}`,
        debit_amount: 0,
        credit_amount: transaction.tax_amount,
        entity_rut: transaction.entity_rut,
        entity_name: transaction.entity_name,
        document_reference: transaction.document_number,
        document_type: transaction.document_type
      });
    }

    // Verificar límites
    const wouldExceedLimits = 
      currentLineCount + transactionDetails.length > BATCH_CONFIG.MAX_LINES_PER_ENTRY ||
      currentTotalAmount + transaction.total_amount > BATCH_CONFIG.MAX_AMOUNT_PER_ENTRY;

    if (wouldExceedLimits && currentDetails.length > 0) {
      entries.push({
        company_id: companyId,
        entry_date: new Date().toISOString().split('T')[0],
        description: `RCV Ventas ${period} - Asiento ${currentEntryNumber}/${totalBatches}`,
        reference: `RCV-VTAS-${period}-${currentEntryNumber}`,
        entry_type: 'rcv_sales',
        status: 'draft',
        details: currentDetails,
        metadata: {
          batch_number: batchNumber,
          entry_number: currentEntryNumber,
          total_batches: totalBatches,
          transactions_count: currentDetails.length / 3,
          period: period,
          total_amount: currentTotalAmount
        }
      });

      currentDetails = [];
      currentLineCount = 0;
      currentTotalAmount = 0;
      currentEntryNumber++;
    }

    currentDetails.push(...transactionDetails);
    currentLineCount += transactionDetails.length;
    currentTotalAmount += transaction.total_amount;
  }

  if (currentDetails.length > 0) {
    entries.push({
      company_id: companyId,
      entry_date: new Date().toISOString().split('T')[0],
      description: `RCV Ventas ${period} - Asiento ${currentEntryNumber}/${totalBatches}`,
      reference: `RCV-VTAS-${period}-${currentEntryNumber}`,
      entry_type: 'rcv_sales',
      status: 'draft',
      details: currentDetails,
      metadata: {
        batch_number: batchNumber,
        entry_number: currentEntryNumber,
        total_batches: totalBatches,
        transactions_count: currentDetails.length / 3,
        period: period,
        total_amount: currentTotalAmount
      }
    });
  }

  return entries;
}

/**
 * POST /api/accounting/journal-book/integration/rcv-detailed
 * Genera asientos contables detallados con cada línea individual por entidad
 * UTILIZANDO LA CUENTA CONTABLE YA ASIGNADA A CADA ENTIDAD
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_id, 
      period, 
      rcv_data, 
      rcv_type = 'purchase',
      options = {} 
    } = body;

    if (!company_id || !period || !rcv_data || !Array.isArray(rcv_data)) {
      return NextResponse.json({
        success: false,
        error: 'Campos requeridos: company_id, period, rcv_data (array)'
      }, { status: 400 });
    }

    console.log('📝 Generando asientos contables detallados:', {
      company_id,
      period,
      rcv_type,
      total_transactions: rcv_data.length
    });

    // 1. Obtener configuración centralizada
    const { data: centralConfig } = await supabase
      .from('centralized_account_config')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (!centralConfig && !options.use_defaults) {
      return NextResponse.json({
        success: false,
        error: 'Configuración centralizada no encontrada. Configure en /accounting/configuration o use options.use_defaults = true'
      }, { status: 400 });
    }

    // 2. Obtener RUTs únicos y mapeo de cuentas
    const uniqueRuts = [...new Set(rcv_data.map(t => t.entity_rut))];
    const entityMap = await getEntityAccountMappings(company_id, uniqueRuts);

    // 3. Verificar que todas las entidades tengan cuenta asignada
    const entitiesWithoutAccount: string[] = [];
    const accountSummary: any[] = [];
    
    for (const rut of uniqueRuts) {
      const entity = entityMap.get(rut);
      if (!entity?.account_code) {
        entitiesWithoutAccount.push(rut);
      } else {
        accountSummary.push({
          rut: entity.entity_rut,
          name: entity.entity_name,
          account_code: entity.account_code,
          account_name: entity.account_name
        });
      }
    }

    // Si hay entidades sin cuenta y no se permite usar defaults
    if (entitiesWithoutAccount.length > 0 && !options.allow_default_accounts) {
      return NextResponse.json({
        success: false,
        error: 'Hay entidades sin cuenta contable asignada',
        entities_without_account: entitiesWithoutAccount,
        message: 'Asigne cuentas a estas entidades en /accounting/rcv-entities o use options.allow_default_accounts = true'
      }, { status: 400 });
    }

    // 4. Calcular número estimado de asientos necesarios
    const estimatedLines = rcv_data.length * 3; // Aproximadamente 3 líneas por transacción
    const estimatedEntries = Math.ceil(estimatedLines / BATCH_CONFIG.MAX_LINES_PER_ENTRY);

    console.log(`📊 Procesando ${rcv_data.length} transacciones con ${uniqueRuts.length} entidades únicas`);
    console.log(`📋 ${accountSummary.length} entidades con cuentas asignadas`);

    // 5. Generar asientos contables según el tipo
    let journalEntries: JournalEntry[] = [];
    
    if (rcv_type === 'purchase') {
      journalEntries = await generatePurchaseEntries(
        company_id,
        rcv_data,
        entityMap,
        centralConfig || {
          default_expense_account: '5.1.1.001',
          iva_credit_account: '1.1.4.001',
          suppliers_account: '2.1.1.001'
        },
        period,
        1,
        estimatedEntries
      );
    } else {
      journalEntries = await generateSalesEntries(
        company_id,
        rcv_data,
        entityMap,
        centralConfig || {
          default_income_account: '4.1.1.001',
          iva_debit_account: '2.1.4.001',
          customers_account: '1.1.3.001'
        },
        period,
        1,
        estimatedEntries
      );
    }

    // 6. Validar balance de cada asiento
    const validationResults = journalEntries.map((entry, index) => {
      const totalDebits = entry.details.reduce((sum, d) => sum + d.debit_amount, 0);
      const totalCredits = entry.details.reduce((sum, d) => sum + d.credit_amount, 0);
      const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
      
      return {
        entry_number: index + 1,
        reference: entry.reference,
        total_lines: entry.details.length,
        total_debits: totalDebits,
        total_credits: totalCredits,
        balanced: balanced,
        difference: totalDebits - totalCredits
      };
    });

    const allBalanced = validationResults.every(v => v.balanced);

    if (!allBalanced && !options.ignore_balance_check) {
      return NextResponse.json({
        success: false,
        error: 'Uno o más asientos están desbalanceados',
        validation_results: validationResults.filter(v => !v.balanced)
      }, { status: 400 });
    }

    // 7. Guardar en base de datos si se solicita
    let savedEntries: string[] = [];
    if (options.save_to_database) {
      console.log('💾 Guardando asientos en base de datos...');
      
      for (const entry of journalEntries) {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            company_id: entry.company_id,
            entry_date: entry.entry_date,
            description: entry.description,
            reference: entry.reference,
            entry_type: entry.entry_type,
            status: entry.status,
            metadata: entry.metadata,
            created_by: 'system'
          })
          .select()
          .single();

        if (data && !error) {
          // Insertar todos los detalles
          const detailsToInsert = entry.details.map(detail => ({
            entry_id: data.id,
            ...detail
          }));

          const { error: detailError } = await supabase
            .from('journal_entry_details')
            .insert(detailsToInsert);

          if (!detailError) {
            savedEntries.push(data.id);
          }
        }
      }
    }

    // 8. Generar resumen de respuesta
    const summary = {
      total_transactions: rcv_data.length,
      total_entries_generated: journalEntries.length,
      total_lines_generated: journalEntries.reduce((sum, e) => sum + e.details.length, 0),
      entries_saved: savedEntries.length,
      unique_entities: uniqueRuts.length,
      entities_with_accounts: accountSummary.length,
      entities_without_accounts: entitiesWithoutAccount.length,
      total_amount: rcv_data.reduce((sum, t) => sum + t.total_amount, 0),
      validation_results: validationResults,
      account_mapping_summary: accountSummary
    };

    // 9. Preparar exportación para Excel/CSV si se solicita
    let exportData = null;
    if (options.include_export_format) {
      exportData = journalEntries.flatMap(entry => 
        entry.details.map(detail => ({
          fecha: entry.entry_date,
          referencia: entry.reference,
          cuenta: detail.account_code,
          nombre_cuenta: detail.account_name,
          descripcion: detail.description,
          rut_entidad: detail.entity_rut || '',
          nombre_entidad: detail.entity_name || '',
          centro_costo: detail.cost_center || '',
          documento: detail.document_reference || '',
          tipo_doc: detail.document_type || '',
          debe: detail.debit_amount,
          haber: detail.credit_amount
        }))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        journal_entries: journalEntries,
        saved_entry_ids: savedEntries,
        export_data: exportData
      }
    });

  } catch (error) {
    console.error('❌ Error generando asientos detallados:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/journal-book/integration/rcv-detailed
 * Obtiene preview de cómo se verían los asientos para un RCV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const rcvRecordId = searchParams.get('rcv_record_id');

    if (!companyId || !rcvRecordId) {
      return NextResponse.json({
        success: false,
        error: 'company_id y rcv_record_id son requeridos'
      }, { status: 400 });
    }

    // Obtener el registro RCV con sus transacciones
    const { data: rcvRecord, error } = await supabase
      .from('rcv_records')
      .select(`
        *,
        transactions:rcv_transactions(*)
      `)
      .eq('id', rcvRecordId)
      .single();

    if (error || !rcvRecord) {
      return NextResponse.json({
        success: false,
        error: 'Registro RCV no encontrado'
      }, { status: 404 });
    }

    // Simular la generación de asientos sin guardar
    const mockRequest = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        company_id: companyId,
        period: rcvRecord.period,
        rcv_data: rcvRecord.transactions,
        rcv_type: rcvRecord.record_type,
        options: {
          save_to_database: false,
          include_export_format: true,
          allow_default_accounts: true
        }
      })
    });

    // Reutilizar la lógica del POST para generar preview
    return POST(mockRequest);

  } catch (error) {
    console.error('❌ Error generando preview:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}