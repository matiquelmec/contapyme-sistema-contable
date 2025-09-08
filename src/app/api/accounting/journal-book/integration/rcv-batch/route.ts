import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// Configuración de procesamiento por lotes
const BATCH_CONFIG = {
  MAX_TRANSACTIONS_PER_BATCH: 100,  // Máximo de transacciones por asiento
  MAX_DETAILS_PER_ENTRY: 50,        // Máximo de líneas de detalle por asiento
  MAX_AMOUNT_PER_BATCH: 100000000,  // Monto máximo por asiento (100 millones)
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
}

interface EntityAccountMapping {
  entity_rut: string;
  entity_name: string;
  account_code: string;
  account_name: string;
  cost_center?: string;
  is_active: boolean;
}

interface JournalEntry {
  company_id: string;
  entry_date: string;
  description: string;
  reference: string;
  entry_type: string;
  status: 'draft' | 'posted';
  details: JournalDetail[];
  metadata?: {
    batch_number?: number;
    total_batches?: number;
    transactions_included?: number;
    rcv_period?: string;
    rcv_type?: string;
  };
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
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingEntities: string[];
  missingAccounts: string[];
}

/**
 * Valida que todas las entidades tengan cuentas contables configuradas
 */
async function validateEntityAccounts(
  companyId: string,
  transactions: RCVTransaction[]
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    missingEntities: [],
    missingAccounts: []
  };

  // Obtener RUTs únicos de las transacciones
  const uniqueRuts = [...new Set(transactions.map(t => t.entity_rut))];

  // Buscar configuración de entidades
  const { data: entities, error } = await supabase
    .from('rcv_entities')
    .select('entity_rut, entity_name, account_code, account_name, is_active')
    .eq('company_id', companyId)
    .in('entity_rut', uniqueRuts);

  if (error) {
    result.isValid = false;
    result.errors.push(`Error consultando entidades: ${error.message}`);
    return result;
  }

  // Crear mapa de entidades configuradas
  const entityMap = new Map<string, EntityAccountMapping>();
  entities?.forEach(entity => {
    entityMap.set(entity.entity_rut, entity);
  });

  // Validar cada RUT único
  for (const rut of uniqueRuts) {
    const entity = entityMap.get(rut);
    
    if (!entity) {
      result.missingEntities.push(rut);
      result.warnings.push(`Entidad ${rut} no está configurada en el sistema`);
    } else if (!entity.account_code) {
      result.missingAccounts.push(rut);
      result.warnings.push(`Entidad ${entity.entity_name} (${rut}) no tiene cuenta contable asignada`);
    } else if (!entity.is_active) {
      result.warnings.push(`Entidad ${entity.entity_name} (${rut}) está inactiva`);
    }
  }

  // Obtener plan de cuentas para validar existencia
  const { data: chartOfAccounts } = await supabase
    .from('chart_of_accounts')
    .select('account_code, account_name')
    .eq('company_id', companyId)
    .eq('is_active', true);

  const accountCodes = new Set(chartOfAccounts?.map(a => a.account_code));

  // Validar que las cuentas asignadas existan en el plan de cuentas
  for (const entity of entities || []) {
    if (entity.account_code && !accountCodes.has(entity.account_code)) {
      result.errors.push(`Cuenta ${entity.account_code} asignada a ${entity.entity_name} no existe en el plan de cuentas`);
      result.isValid = false;
    }
  }

  // Si hay entidades sin configurar, marcar como no válido solo si es crítico
  if (result.missingEntities.length > 0 || result.missingAccounts.length > 0) {
    result.isValid = false; // Cambiar a true si se permite usar cuentas por defecto
  }

  return result;
}

/**
 * Divide las transacciones en lotes según los límites configurados
 */
function createBatches(transactions: RCVTransaction[]): RCVTransaction[][] {
  const batches: RCVTransaction[][] = [];
  let currentBatch: RCVTransaction[] = [];
  let currentBatchAmount = 0;
  let currentBatchDetails = 0;

  for (const transaction of transactions) {
    const wouldAddDetails = 2; // Cada transacción genera al menos 2 detalles (gasto + proveedor)
    const wouldAddAmount = transaction.total_amount;

    // Verificar si agregar esta transacción excedería los límites
    if (
      currentBatch.length >= BATCH_CONFIG.MAX_TRANSACTIONS_PER_BATCH ||
      currentBatchDetails + wouldAddDetails > BATCH_CONFIG.MAX_DETAILS_PER_ENTRY ||
      currentBatchAmount + wouldAddAmount > BATCH_CONFIG.MAX_AMOUNT_PER_BATCH
    ) {
      // Guardar lote actual y crear uno nuevo
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [];
      currentBatchAmount = 0;
      currentBatchDetails = 0;
    }

    currentBatch.push(transaction);
    currentBatchAmount += wouldAddAmount;
    currentBatchDetails += wouldAddDetails;
  }

  // Agregar el último lote si tiene transacciones
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Genera un asiento contable para un lote de transacciones (VERSIÓN CORREGIDA)
 * Ahora soporta cuentas individuales para cada entidad
 */
async function generateJournalEntry(
  companyId: string,
  transactions: RCVTransaction[],
  entityMap: Map<string, EntityAccountMapping>,
  centralConfig: any,
  period: string,
  batchNumber: number,
  totalBatches: number,
  rcvType: 'purchase' | 'sales'
): Promise<JournalEntry> {
  const journalDetails: JournalDetail[] = [];

  // Agrupar transacciones por cuenta contable (LADO GASTO/INGRESO)
  const expenseAccountGroups = new Map<string, {
    account_code: string;
    account_name: string;
    net_amount: number;
    tax_amount: number;
    transactions: RCVTransaction[];
  }>();

  // Agrupar transacciones por entidad/proveedor (LADO PROVEEDOR/CLIENTE)
  const entityAccountGroups = new Map<string, {
    entity_rut: string;
    entity_name: string;
    account_code: string;
    account_name: string;
    total_amount: number;
    transactions: RCVTransaction[];
  }>();

  let totalIVA = 0;
  let totalAmount = 0;

  for (const transaction of transactions) {
    const entity = entityMap.get(transaction.entity_rut);
    
    // LADO GASTO/INGRESO: Usar cuenta configurada en la entidad o default
    const expenseAccountCode = entity?.account_code || 
      (rcvType === 'purchase' ? centralConfig.default_expense_account || '5.1.1.001' : centralConfig.default_income_account || '4.1.1.001');
    const expenseAccountName = entity?.account_name || 
      (rcvType === 'purchase' ? 'Gastos Operacionales' : 'Ingresos Operacionales');

    // Agrupar gastos por cuenta
    if (!expenseAccountGroups.has(expenseAccountCode)) {
      expenseAccountGroups.set(expenseAccountCode, {
        account_code: expenseAccountCode,
        account_name: expenseAccountName,
        net_amount: 0,
        tax_amount: 0,
        transactions: []
      });
    }

    const expenseGroup = expenseAccountGroups.get(expenseAccountCode)!;
    expenseGroup.net_amount += transaction.net_amount;
    expenseGroup.tax_amount += transaction.tax_amount;
    expenseGroup.transactions.push(transaction);

    // LADO PROVEEDOR/CLIENTE: Determinar cuenta de proveedor/cliente
    // Usar cuenta consolidada ya que las entidades tienen cuentas de gastos, no de proveedores
    const providerAccountCode = rcvType === 'purchase' 
      ? (centralConfig.suppliers_account || '2.1.1.001')
      : (centralConfig.customers_account || '1.1.3.001');
    const providerAccountName = rcvType === 'purchase' 
      ? 'Proveedores Nacionales' 
      : 'Clientes Nacionales';

    // Agrupar por cuenta de proveedor/cliente (consolidada)
    if (!entityAccountGroups.has(providerAccountCode)) {
      entityAccountGroups.set(providerAccountCode, {
        entity_rut: '',
        entity_name: '',
        account_code: providerAccountCode,
        account_name: providerAccountName,
        total_amount: 0,
        transactions: []
      });
    }

    const entityGroup = entityAccountGroups.get(providerAccountCode)!;
    entityGroup.total_amount += transaction.total_amount;
    entityGroup.transactions.push(transaction);

    totalIVA += transaction.tax_amount;
    totalAmount += transaction.total_amount;
  }

  // Generar detalles del asiento según el tipo
  if (rcvType === 'purchase') {
    // COMPRAS: Debe = Gastos + IVA, Haber = Proveedores
    
    // Detalles de gastos agrupados por cuenta (AHORA INDIVIDUALES)
    for (const [code, group] of expenseAccountGroups) {
      journalDetails.push({
        account_code: group.account_code,
        account_name: group.account_name,
        description: `${group.account_name} ${period} - ${group.transactions.length} transacciones`,
        debit_amount: group.net_amount,
        credit_amount: 0,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }

    // IVA Crédito Fiscal
    if (totalIVA > 0) {
      journalDetails.push({
        account_code: centralConfig.iva_credit_account || '1.1.4.001',
        account_name: 'IVA Crédito Fiscal',
        description: `IVA Crédito Fiscal ${period}`,
        debit_amount: totalIVA,
        credit_amount: 0,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }

    // Proveedores (consolidado por lote)
    for (const [code, group] of entityAccountGroups) {
      journalDetails.push({
        account_code: group.account_code,
        account_name: group.account_name,
        description: `Proveedores ${period} - ${transactions.length} facturas`,
        debit_amount: 0,
        credit_amount: group.total_amount,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }

  } else {
    // VENTAS: Debe = Clientes, Haber = Ingresos + IVA
    
    // Clientes (consolidado por lote)
    for (const [code, group] of entityAccountGroups) {
      journalDetails.push({
        account_code: group.account_code,
        account_name: group.account_name,
        description: `Clientes ${period} - ${transactions.length} facturas`,
        debit_amount: group.total_amount,
        credit_amount: 0,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }

    // Ingresos agrupados por cuenta (AHORA INDIVIDUALES)
    for (const [code, group] of expenseAccountGroups) {
      journalDetails.push({
        account_code: group.account_code,
        account_name: group.account_name,
        description: `${group.account_name} ${period} - ${group.transactions.length} transacciones`,
        debit_amount: 0,
        credit_amount: group.net_amount,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }

    // IVA Débito Fiscal
    if (totalIVA > 0) {
      journalDetails.push({
        account_code: centralConfig.iva_debit_account || '2.1.4.001',
        account_name: 'IVA Débito Fiscal',
        description: `IVA Débito Fiscal ${period}`,
        debit_amount: 0,
        credit_amount: totalIVA,
        document_reference: `Lote ${batchNumber}/${totalBatches}`
      });
    }
  }

  // Crear asiento contable
  const journalEntry: JournalEntry = {
    company_id: companyId,
    entry_date: new Date().toISOString().split('T')[0],
    description: `RCV ${rcvType === 'purchase' ? 'Compras' : 'Ventas'} ${period} - Lote ${batchNumber}/${totalBatches}`,
    reference: `RCV-${rcvType.toUpperCase()}-${period}-L${batchNumber}`,
    entry_type: 'rcv_integration',
    status: 'draft',
    details: journalDetails,
    metadata: {
      batch_number: batchNumber,
      total_batches: totalBatches,
      transactions_included: transactions.length,
      rcv_period: period,
      rcv_type: rcvType,
      individual_expense_accounts: expenseAccountGroups.size,
      individual_entity_accounts: entityAccountGroups.size
    }
  };

  return journalEntry;
}

/**
 * POST /api/accounting/journal-book/integration/rcv-batch
 * Procesa RCV con validación de cuentas y generación de múltiples asientos si es necesario
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

    console.log('🔍 Iniciando validación y procesamiento RCV por lotes:', {
      company_id,
      period,
      rcv_type,
      total_transactions: rcv_data.length
    });

    // 1. Validar cuentas contables de las entidades
    const validation = await validateEntityAccounts(company_id, rcv_data);
    
    if (!validation.isValid && !options.force_process) {
      return NextResponse.json({
        success: false,
        error: 'Validación de cuentas contables falló',
        validation: {
          errors: validation.errors,
          warnings: validation.warnings,
          missing_entities: validation.missingEntities,
          missing_accounts: validation.missingAccounts,
          message: 'Configure las cuentas faltantes o use force_process: true para continuar con cuentas por defecto'
        }
      }, { status: 400 });
    }

    // 2. Obtener configuración centralizada
    const { data: centralConfig } = await supabase
      .from('centralized_account_config')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (!centralConfig) {
      return NextResponse.json({
        success: false,
        error: 'Configuración centralizada no encontrada. Configure en /accounting/configuration'
      }, { status: 400 });
    }

    // 3. Obtener mapa de entidades con sus cuentas
    const { data: entities } = await supabase
      .from('rcv_entities')
      .select('*')
      .eq('company_id', company_id);

    const entityMap = new Map<string, EntityAccountMapping>();
    entities?.forEach(entity => {
      entityMap.set(entity.entity_rut, entity);
    });

    // 4. Dividir transacciones en lotes
    const batches = createBatches(rcv_data);
    const totalBatches = batches.length;

    console.log(`📦 Dividiendo ${rcv_data.length} transacciones en ${totalBatches} lotes`);

    // 5. Generar asientos contables para cada lote
    const journalEntries: JournalEntry[] = [];
    const processingResults = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      try {
        const journalEntry = await generateJournalEntry(
          company_id,
          batch,
          entityMap,
          centralConfig,
          period,
          batchNumber,
          totalBatches,
          rcv_type
        );

        // Validar balance del asiento
        const totalDebits = journalEntry.details.reduce((sum, d) => sum + d.debit_amount, 0);
        const totalCredits = journalEntry.details.reduce((sum, d) => sum + d.credit_amount, 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          processingResults.push({
            batch: batchNumber,
            success: false,
            error: `Asiento desbalanceado: Debe ${totalDebits} vs Haber ${totalCredits}`
          });
          continue;
        }

        journalEntries.push(journalEntry);
        processingResults.push({
          batch: batchNumber,
          success: true,
          transactions: batch.length,
          total_amount: batch.reduce((sum, t) => sum + t.total_amount, 0)
        });

      } catch (error) {
        processingResults.push({
          batch: batchNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // 6. Guardar asientos en base de datos si se solicita
    let savedEntries = [];
    if (options.save_to_database && journalEntries.length > 0) {
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
          // Insertar detalles
          const detailsToInsert = entry.details.map(detail => ({
            entry_id: data.id,
            ...detail
          }));

          await supabase
            .from('journal_entry_details')
            .insert(detailsToInsert);

          savedEntries.push(data.id);
        }
      }
    }

    // 7. Generar respuesta con resumen
    const summary = {
      total_transactions: rcv_data.length,
      total_batches: totalBatches,
      successful_batches: processingResults.filter(r => r.success).length,
      failed_batches: processingResults.filter(r => !r.success).length,
      journal_entries_generated: journalEntries.length,
      journal_entries_saved: savedEntries.length,
      validation_warnings: validation.warnings.length,
      total_amount: rcv_data.reduce((sum, t) => sum + t.total_amount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        validation,
        processing_results: processingResults,
        journal_entries: journalEntries,
        saved_entry_ids: savedEntries
      }
    });

  } catch (error) {
    console.error('❌ Error en procesamiento batch RCV:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/journal-book/integration/rcv-batch
 * Obtiene el estado de validación para un conjunto de datos RCV
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

    // Obtener estadísticas de entidades configuradas
    const { data: entities } = await supabase
      .from('rcv_entities')
      .select('entity_rut, entity_name, account_code, is_active')
      .eq('company_id', companyId);

    const totalEntities = entities?.length || 0;
    const entitiesWithAccounts = entities?.filter(e => e.account_code).length || 0;
    const activeEntities = entities?.filter(e => e.is_active).length || 0;

    // Obtener configuración centralizada
    const { data: centralConfig } = await supabase
      .from('centralized_account_config')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // Obtener límites de procesamiento
    const batchLimits = {
      max_transactions_per_batch: BATCH_CONFIG.MAX_TRANSACTIONS_PER_BATCH,
      max_details_per_entry: BATCH_CONFIG.MAX_DETAILS_PER_ENTRY,
      max_amount_per_batch: BATCH_CONFIG.MAX_AMOUNT_PER_BATCH
    };

    return NextResponse.json({
      success: true,
      data: {
        entity_status: {
          total_entities: totalEntities,
          entities_with_accounts: entitiesWithAccounts,
          entities_without_accounts: totalEntities - entitiesWithAccounts,
          active_entities: activeEntities,
          coverage_percentage: totalEntities > 0 ? (entitiesWithAccounts / totalEntities) * 100 : 0
        },
        central_config_status: {
          configured: !!centralConfig,
          has_default_accounts: !!(centralConfig?.default_expense_account && centralConfig?.default_income_account),
          has_iva_accounts: !!(centralConfig?.iva_credit_account && centralConfig?.iva_debit_account),
          has_partner_accounts: !!(centralConfig?.suppliers_account && centralConfig?.customers_account)
        },
        batch_limits: batchLimits,
        recommendations: {
          configure_missing_entities: totalEntities - entitiesWithAccounts > 0,
          configure_central_accounts: !centralConfig,
          ready_for_processing: centralConfig && entitiesWithAccounts > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de validación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}