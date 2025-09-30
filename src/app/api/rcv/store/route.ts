import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RCVStoreRequest {
  company_id: string;
  rcv_data: {
    totalTransacciones: number;
    transaccionesSuma: number;
    transaccionesResta: number;
    montoExentoGlobal: number;
    montoNetoGlobal: number;
    montoCalculadoGlobal: number;
    proveedoresPrincipales: any[];
    transacciones: any[];
    periodoInicio: string;
    periodoFin: string;
    confidence: number;
    method: string;
  };
  file_metadata: {
    file_name: string;
    file_size: number;
  };
  rcv_type: 'purchase' | 'sales';
}

/**
 * POST /api/rcv/store
 * Almacena datos del RCV procesado en la base de datos
 */
export async function POST(request: NextRequest) {
  try {
    const body: RCVStoreRequest = await request.json();
    
    console.log('🔍 RCV STORE - Datos recibidos:', {
      company_id: body.company_id,
      rcv_type: body.rcv_type,
      transacciones: body.rcv_data.totalTransacciones,
      file_name: body.file_metadata.file_name,
      periodoInicio: body.rcv_data.periodoInicio,
      periodoFin: body.rcv_data.periodoFin
    });

    const { company_id, rcv_data, file_metadata, rcv_type } = body;
    
    console.log('🔍 Destructured data:', {
      has_company_id: !!company_id,
      has_rcv_data: !!rcv_data,
      has_file_metadata: !!file_metadata,
      has_rcv_type: !!rcv_type,
      rcv_type_value: rcv_type
    });

    if (!company_id || !rcv_data || !file_metadata || !rcv_type) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Determinar período basado en el nombre del archivo (no en las fechas del contenido)
    console.log('🔍 About to extract period from filename:', file_metadata.file_name);
    const periodIdentifier = extractPeriodFromFileName(file_metadata.file_name);
    console.log('🔍 Period identifier extracted:', periodIdentifier);
    const [periodStart, periodEnd] = getPeriodDatesFromIdentifier(periodIdentifier);
    console.log('🔍 Period dates generated:', { periodStart, periodEnd });

    let ledgerId: string;
    
    if (rcv_type === 'purchase') {
      ledgerId = await storePurchaseData(
        company_id,
        rcv_data,
        file_metadata,
        periodIdentifier,
        periodStart,
        periodEnd
      );
    } else {
      ledgerId = await storeSalesData(
        company_id,
        rcv_data,
        file_metadata,
        periodIdentifier,
        periodStart,
        periodEnd
      );
    }

    console.log(`✅ RCV ${rcv_type} almacenado exitosamente - Ledger ID:`, ledgerId);

    return NextResponse.json({
      success: true,
      data: {
        ledger_id: ledgerId,
        period_identifier: periodIdentifier,
        rcv_type: rcv_type,
        total_transactions: rcv_data.totalTransacciones
      },
      message: `RCV de ${rcv_type === 'purchase' ? 'compras' : 'ventas'} almacenado exitosamente`
    });

  } catch (error) {
    console.error('❌ Error almacenando RCV:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Almacena datos de compras en purchase_ledger y purchase_document
 */
async function storePurchaseData(
  companyId: string,
  rcvData: any,
  fileMetadata: any,
  periodIdentifier: string,
  periodStart: string,
  periodEnd: string
): Promise<string> {
  
  // ✅ CREAR O ACTUALIZAR PURCHASE_LEDGER
  const { data: existingLedger } = await supabase
    .from('purchase_ledger')
    .select('id')
    .eq('company_id', companyId)
    .eq('period_identifier', periodIdentifier)
    .single();

  let ledgerId: string;

  if (existingLedger) {
    // Actualizar ledger existente
    const { data: updatedLedger, error: updateError } = await supabase
      .from('purchase_ledger')
      .update({
        total_transactions: rcvData.totalTransacciones,
        sum_transactions: rcvData.transaccionesSuma,
        subtract_transactions: rcvData.transaccionesResta,
        total_exempt_amount: rcvData.montoExentoGlobal,
        total_net_amount: rcvData.montoNetoGlobal,
        total_calculated_amount: rcvData.montoCalculadoGlobal,
        unique_suppliers: rcvData.proveedoresPrincipales.length,
        confidence_score: rcvData.confidence,
        processing_method: rcvData.method,
        file_name: fileMetadata.file_name,
        file_size: fileMetadata.file_size,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingLedger.id)
      .select('id')
      .single();

    if (updateError) throw updateError;
    ledgerId = updatedLedger.id;

    // Eliminar documentos existentes para reemplazar
    await supabase
      .from('purchase_document')
      .delete()
      .eq('purchase_ledger_id', ledgerId);

  } else {
    // Crear nuevo ledger
    console.log('🔍 CREATING PURCHASE LEDGER:', {
      company_id: companyId,
      period_start: periodStart,
      period_end: periodEnd,
      period_identifier: periodIdentifier,
      periodStart_type: typeof periodStart,
      periodEnd_type: typeof periodEnd
    });
    
    const { data: newLedger, error: createError } = await supabase
      .from('purchase_ledger')
      .insert({
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        period_identifier: periodIdentifier,
        total_transactions: rcvData.totalTransacciones,
        sum_transactions: rcvData.transaccionesSuma,
        subtract_transactions: rcvData.transaccionesResta,
        total_exempt_amount: rcvData.montoExentoGlobal,
        total_net_amount: rcvData.montoNetoGlobal,
        total_calculated_amount: rcvData.montoCalculadoGlobal,
        unique_suppliers: rcvData.proveedoresPrincipales.length,
        confidence_score: rcvData.confidence,
        processing_method: rcvData.method,
        file_name: fileMetadata.file_name,
        file_size: fileMetadata.file_size
      })
      .select('id')
      .single();

    if (createError) throw createError;
    ledgerId = newLedger.id;
  }

  // ✅ INSERTAR PURCHASE_DOCUMENTS
  const purchaseDocuments = rcvData.transacciones.map((transaction: any) => ({
    purchase_ledger_id: ledgerId,
    company_id: companyId,
    document_number: transaction.nro || '',
    document_type: transaction.tipoDoc || '',
    purchase_type: transaction.tipoCompra || '',
    folio: transaction.folio || '',
    document_date: parseDate(transaction.fechaDocto),
    reception_date: parseDate(transaction.fechaRecepcion),
    acknowledgment_date: parseDate(transaction.fechaAcuse),
    supplier_rut: transaction.rutProveedor || '',
    supplier_name: transaction.razonSocial || '',
    exempt_amount: transaction.montoExento || 0,
    net_amount: transaction.montoNeto || 0,
    iva_amount: transaction.montoIVA || 0,
    iva_non_recoverable: transaction.montoIVANoRecuperable || 0,
    iva_non_recoverable_code: transaction.codigoIVANoRec || '',
    total_amount: transaction.montoTotal || 0,
    net_amount_fixed_assets: transaction.montoNetoActivoFijo || 0,
    iva_fixed_assets: transaction.ivaActivoFijo || 0,
    iva_common_use: transaction.ivaUsoComun || 0,
    tax_no_credit_right: transaction.imptoSinDerechoCredito || 0,
    iva_not_withheld: transaction.ivaNoRetenido || 0,
    tobacco_cigars: transaction.tabacosPuros || 0,
    tobacco_cigarettes: transaction.tabacosCigarrillos || 0,
    tobacco_processed: transaction.tabacosElaborados || 0,
    nce_nde_invoice: transaction.nceNdeFactura || 0,
    other_tax_code: transaction.codigoOtroImpuesto || '',
    other_tax_value: transaction.valorOtroImpuesto || 0,
    other_tax_rate: transaction.tasaOtroImpuesto || 0
  }));

  const { error: documentsError } = await supabase
    .from('purchase_document')
    .insert(purchaseDocuments);

  if (documentsError) throw documentsError;

  console.log(`✅ Almacenados ${purchaseDocuments.length} documentos de compra`);
  
  return ledgerId;
}

/**
 * Almacena datos de ventas en sales_ledger y sale_document
 */
async function storeSalesData(
  companyId: string,
  rcvData: any,
  fileMetadata: any,
  periodIdentifier: string,
  periodStart: string,
  periodEnd: string
): Promise<string> {
  
  // ✅ CREAR O ACTUALIZAR SALES_LEDGER
  const { data: existingLedger } = await supabase
    .from('sales_ledger')
    .select('id')
    .eq('company_id', companyId)
    .eq('period_identifier', periodIdentifier)
    .single();

  let ledgerId: string;

  if (existingLedger) {
    // Actualizar ledger existente
    const { data: updatedLedger, error: updateError } = await supabase
      .from('sales_ledger')
      .update({
        total_transactions: rcvData.totalTransacciones,
        sum_transactions: rcvData.transaccionesSuma,
        subtract_transactions: rcvData.transaccionesResta,
        total_exempt_amount: rcvData.montoExentoGlobal,
        total_net_amount: rcvData.montoNetoGlobal,
        total_calculated_amount: rcvData.montoCalculadoGlobal,
        unique_customers: rcvData.proveedoresPrincipales.length, // En ventas serían clientes
        confidence_score: rcvData.confidence,
        processing_method: rcvData.method,
        file_name: fileMetadata.file_name,
        file_size: fileMetadata.file_size,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingLedger.id)
      .select('id')
      .single();

    if (updateError) throw updateError;
    ledgerId = updatedLedger.id;

    // Eliminar documentos existentes para reemplazar
    await supabase
      .from('sale_document')
      .delete()
      .eq('sales_ledger_id', ledgerId);

  } else {
    // Crear nuevo ledger
    const { data: newLedger, error: createError } = await supabase
      .from('sales_ledger')
      .insert({
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        period_identifier: periodIdentifier,
        total_transactions: rcvData.totalTransacciones,
        sum_transactions: rcvData.transaccionesSuma,
        subtract_transactions: rcvData.transaccionesResta,
        total_exempt_amount: rcvData.montoExentoGlobal,
        total_net_amount: rcvData.montoNetoGlobal,
        total_calculated_amount: rcvData.montoCalculadoGlobal,
        unique_customers: rcvData.proveedoresPrincipales.length,
        confidence_score: rcvData.confidence,
        processing_method: rcvData.method,
        file_name: fileMetadata.file_name,
        file_size: fileMetadata.file_size
      })
      .select('id')
      .single();

    if (createError) throw createError;
    ledgerId = newLedger.id;
  }

  // ✅ INSERTAR SALE_DOCUMENTS
  const saleDocuments = rcvData.transacciones.map((transaction: any) => ({
    sales_ledger_id: ledgerId,
    company_id: companyId,
    document_number: transaction.nro || '',
    document_type: transaction.tipoDoc || '',
    sale_type: transaction.tipoCompra || '', // En ventas podría ser tipo venta
    folio: transaction.folio || '',
    document_date: parseDate(transaction.fechaDocto),
    reception_date: parseDate(transaction.fechaRecepcion),
    acknowledgment_date: parseDate(transaction.fechaAcuse),
    customer_rut: transaction.rutProveedor || '', // En ventas sería RUT del cliente
    customer_name: transaction.razonSocial || '', // En ventas sería nombre del cliente
    exempt_amount: transaction.montoExento || 0,
    net_amount: transaction.montoNeto || 0,
    iva_amount: transaction.montoIVA || 0,
    iva_non_recoverable: transaction.montoIVANoRecuperable || 0,
    iva_non_recoverable_code: transaction.codigoIVANoRec || '',
    total_amount: transaction.montoTotal || 0,
    net_amount_fixed_assets: transaction.montoNetoActivoFijo || 0,
    iva_fixed_assets: transaction.ivaActivoFijo || 0,
    iva_common_use: transaction.ivaUsoComun || 0,
    tax_no_credit_right: transaction.imptoSinDerechoCredito || 0,
    iva_not_withheld: transaction.ivaNoRetenido || 0,
    tobacco_cigars: transaction.tabacosPuros || 0,
    tobacco_cigarettes: transaction.tabacosCigarrillos || 0,
    tobacco_processed: transaction.tabacosElaborados || 0,
    nce_nde_invoice: transaction.nceNdeFactura || 0,
    other_tax_code: transaction.codigoOtroImpuesto || '',
    other_tax_value: transaction.valorOtroImpuesto || 0,
    other_tax_rate: transaction.tasaOtroImpuesto || 0
  }));

  const { error: documentsError } = await supabase
    .from('sale_document')
    .insert(saleDocuments);

  if (documentsError) throw documentsError;

  console.log(`✅ Almacenados ${saleDocuments.length} documentos de venta`);
  
  return ledgerId;
}

/**
 * Extrae el identificador del período (YYYY-MM) del nombre del archivo
 */
function extractPeriodFromFileName(fileName: string): string {
  try {
    // Buscar patrón YYYYMM al final del nombre del archivo antes de la extensión
    // Ej: RCV_COMPRA_REGISTRO_77199932-8_202508.csv → 202508
    // Diferentes patrones posibles: _YYYYMM.csv, -YYYYMM.csv, YYYYMM.csv
    let periodMatch = fileName.match(/[_-](\d{6})\.csv$/i);
    console.log(`🔍 Testing regex 1 on "${fileName}":`, periodMatch);
    
    if (!periodMatch) {
      // Intentar sin separador (solo números al final antes de .csv)
      periodMatch = fileName.match(/(\d{6})\.csv$/i);
      console.log(`🔍 Testing regex 2 on "${fileName}":`, periodMatch);
    }
    
    if (periodMatch) {
      const period = periodMatch[1];
      const year = period.substring(0, 4);
      const month = period.substring(4, 6);
      
      console.log(`🔍 Period extracted from filename "${fileName}": ${period} → ${year}-${month}`);
      return `${year}-${month}`;
    }
    
    // Fallback: buscar cualquier patrón YYYYMM válido (año 20XX y mes 01-12)
    const validPeriodMatch = fileName.match(/(20\d{2})(0[1-9]|1[0-2])/);
    if (validPeriodMatch) {
      const year = validPeriodMatch[1];
      const month = validPeriodMatch[2];
      
      console.log(`🔍 Valid period found in filename "${fileName}": ${year}${month} → ${year}-${month}`);
      return `${year}-${month}`;
    }
    
    // Fallback: buscar año de 4 dígitos y usar mes actual
    const yearMatch = fileName.match(/(\d{4})/);
    if (yearMatch) {
      const year = yearMatch[1];
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      console.log(`⚠️ Only year found in filename, using current month: ${year}-${month}`);
      return `${year}-${month}`;
    }
    
    throw new Error('No period found in filename');
  } catch (error) {
    console.warn(`⚠️ Could not extract period from filename "${fileName}":`, error);
    // Fallback a agosto 2025
    return '2025-08';
  }
}

/**
 * Convierte un identificador de período (YYYY-MM) a fechas de inicio y fin
 */
function getPeriodDatesFromIdentifier(periodIdentifier: string): [string, string] {
  try {
    const [year, month] = periodIdentifier.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Validar año y mes
    if (isNaN(yearNum) || isNaN(monthNum) || yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid year (${year}) or month (${month})`);
    }
    
    // Primer día del mes
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    
    // Último día del mes
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    
    console.log(`🔍 Period dates from identifier "${periodIdentifier}": ${startDate} to ${endDate}`);
    return [startDate, endDate];
  } catch (error) {
    console.warn(`⚠️ Error generating period dates for "${periodIdentifier}":`, error);
    // Fallback a agosto 2025
    return ['2025-08-01', '2025-08-31'];
  }
}

/**
 * Convierte fechas del RCV a fechas de período
 */
function getPeriodDates(fechaInicio: string, fechaFin: string): [string, string] {
  try {
    const parseRCVDate = (dateStr: string): string => {
      // Si no es válido, usar agosto 2025
      if (!dateStr || typeof dateStr !== 'string') {
        return '2025-08-01';
      }
      
      // Limpiar la fecha de caracteres extraños
      const cleanDate = dateStr.trim();
      
      // Formato DD/MM/YYYY
      if (cleanDate.includes('/')) {
        const parts = cleanDate.split('/');
        if (parts.length !== 3) {
          return '2025-08-01';
        }
        const [day, month, year] = parts;
        if (!day || !month || !year) {
          return '2025-08-01';
        }
        // Asegurar que year es de 4 dígitos
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Si ya está en formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return cleanDate;
      }
      
      // Fallback
      return '2025-08-01';
    };

    const startDate = parseRCVDate(fechaInicio);
    const endDate = parseRCVDate(fechaFin);
    
    console.log(`🔍 Period dates parsed: ${fechaInicio} → ${startDate}, ${fechaFin} → ${endDate}`);
    
    return [startDate, endDate];
  } catch (error) {
    console.warn(`⚠️ Error parsing period dates:`, error);
    // Fallback a agosto 2025
    return ['2025-08-01', '2025-08-31'];
  }
}

/**
 * Convierte fecha del RCV (DD/MM/YYYY) a formato ISO (YYYY-MM-DD)
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Limpiar la fecha de caracteres extraños
    const cleanDate = dateStr.trim();
    
    // Caso 1: Formato DD/MM/YYYY o DD/MM/YY
    if (cleanDate.includes('/')) {
      const [day, month, year] = cleanDate.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Caso 2: Formato YYYY-MM-DD (ya correcto)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    // Caso 3: Formato YYYYMMDD
    if (/^\d{8}$/.test(cleanDate)) {
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    
    // Caso 4: Intentar parsing con Date si otros fallan
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    
    // Si no se puede parsear, devolver null para evitar errores
    console.warn(`⚠️ Could not parse date: ${dateStr}`);
    return null;
  } catch (error) {
    console.warn(`⚠️ Date parsing error for "${dateStr}":`, error);
    return null;
  }
}