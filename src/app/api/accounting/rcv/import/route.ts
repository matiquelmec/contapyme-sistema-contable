import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaz para registro RCV
interface RCVRecord {
  record_type: 'purchase' | 'sale';
  document_type: string;
  document_number?: string;
  document_date: string;
  entity_rut: string;
  entity_name: string;
  entity_business_name?: string;
  entity_address?: string;
  entity_commune?: string;
  net_amount: number;
  tax_amount: number;
  exempt_amount?: number;
  total_amount: number;
  description?: string;
  [key: string]: any;
}

// Función para limpiar y formatear RUT
function formatRUT(rut: string): string {
  // Remover espacios y caracteres no válidos
  let cleaned = rut.replace(/[^\dkK.-]/g, '').toUpperCase();
  
  // Si no tiene formato, intentar formatearlo
  if (!cleaned.includes('.') && !cleaned.includes('-')) {
    // Asumiendo formato XXXXXXXXX sin puntos ni guión
    const digits = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    
    if (digits.length >= 7) {
      // Formatear como XX.XXX.XXX-X
      const millions = digits.slice(-9, -6) || '';
      const thousands = digits.slice(-6, -3);
      const units = digits.slice(-3);
      
      if (millions) {
        cleaned = `${millions}.${thousands}.${units}-${verifier}`;
      } else {
        cleaned = `${thousands}.${units}-${verifier}`;
      }
    }
  }
  
  return cleaned;
}

// Función para parsear CSV de RCV
function parseRCVData(csvContent: string, recordType: 'purchase' | 'sale'): RCVRecord[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const records: RCVRecord[] = [];
  
  // Mapeo de campos comunes en RCV
  const fieldMapping: { [key: string]: string } = {
    'rut': 'entity_rut',
    'rut proveedor': 'entity_rut',
    'rut cliente': 'entity_rut',
    'razon social': 'entity_name',
    'nombre': 'entity_name',
    'proveedor': 'entity_name',
    'cliente': 'entity_name',
    'tipo doc': 'document_type',
    'tipo documento': 'document_type',
    'tipo dte': 'document_type',
    'folio': 'document_number',
    'numero': 'document_number',
    'nro documento': 'document_number',
    'fecha': 'document_date',
    'fecha emision': 'document_date',
    'fecha documento': 'document_date',
    'neto': 'net_amount',
    'monto neto': 'net_amount',
    'iva': 'tax_amount',
    'monto iva': 'tax_amount',
    'impuesto': 'tax_amount',
    'exento': 'exempt_amount',
    'monto exento': 'exempt_amount',
    'total': 'total_amount',
    'monto total': 'total_amount',
    'direccion': 'entity_address',
    'comuna': 'entity_commune',
    'giro': 'entity_business_name',
    'glosa': 'description',
    'descripcion': 'description'
  };
  
  // Procesar cada línea de datos
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < headers.length) continue;
    
    const record: any = {
      record_type: recordType
    };
    
    // Mapear valores según headers
    headers.forEach((header, index) => {
      const mappedField = fieldMapping[header];
      const value = values[index];
      
      if (mappedField && value) {
        // Procesar según el tipo de campo
        if (mappedField === 'entity_rut') {
          record[mappedField] = formatRUT(value);
        } else if (mappedField.includes('amount')) {
          // Convertir montos a números
          record[mappedField] = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
        } else if (mappedField === 'document_date') {
          // Formatear fecha (asumiendo DD/MM/YYYY o YYYY-MM-DD)
          const dateParts = value.split(/[\/\-]/);
          if (dateParts.length === 3) {
            if (dateParts[0].length === 4) {
              // YYYY-MM-DD
              record[mappedField] = value;
            } else {
              // DD/MM/YYYY -> YYYY-MM-DD
              record[mappedField] = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
          }
        } else {
          record[mappedField] = value;
        }
      }
      
      // Guardar también el valor original para auditoría
      record[header] = value;
    });
    
    // Validar campos requeridos
    if (record.entity_rut && record.entity_name && record.total_amount && record.document_date) {
      // Asegurar que el RUT tenga formato válido
      const rutPattern = /^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9K]$/;
      if (rutPattern.test(record.entity_rut)) {
        records.push(record as RCVRecord);
      } else {
        console.warn(`RUT inválido ignorado: ${record.entity_rut}`);
      }
    }
  }
  
  return records;
}

// POST - Importar archivo RCV y procesar entidades
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('company_id') as string;
    const recordType = formData.get('record_type') as 'purchase' | 'sale';
    const periodYear = formData.get('period_year') as string;
    const periodMonth = formData.get('period_month') as string;
    
    if (!file || !companyId || !recordType) {
      return NextResponse.json({
        success: false,
        error: 'Archivo, company_id y record_type son requeridos'
      }, { status: 400 });
    }
    
    // Leer contenido del archivo
    const content = await file.text();
    const batchId = `RCV_${Date.now()}_${uuidv4().slice(0, 8)}`;
    
    // Crear registro de lote de importación
    const { data: batch, error: batchError } = await supabase
      .from('rcv_import_batches')
      .insert({
        company_id: companyId,
        batch_id: batchId,
        file_name: file.name,
        file_type: 'csv',
        file_size: file.size,
        period_year: periodYear ? parseInt(periodYear) : null,
        period_month: periodMonth ? parseInt(periodMonth) : null,
        record_type: recordType,
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (batchError) {
      console.error('Error creating import batch:', batchError);
      return NextResponse.json({
        success: false,
        error: 'Error al crear lote de importación'
      }, { status: 500 });
    }
    
    // Parsear datos del RCV
    const records = parseRCVData(content, recordType);
    
    if (records.length === 0) {
      await supabase
        .from('rcv_import_batches')
        .update({
          status: 'failed',
          error_message: 'No se encontraron registros válidos en el archivo',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      
      return NextResponse.json({
        success: false,
        error: 'No se encontraron registros válidos en el archivo'
      }, { status: 400 });
    }
    
    // Preparar registros para inserción
    const rcvRecords = records.map(record => ({
      company_id: companyId,
      record_type: record.record_type,
      document_type: record.document_type || 'Factura',
      document_number: record.document_number,
      document_date: record.document_date,
      entity_rut: record.entity_rut,
      entity_name: record.entity_name,
      entity_business_name: record.entity_business_name,
      entity_address: record.entity_address,
      entity_commune: record.entity_commune,
      net_amount: record.net_amount || 0,
      tax_amount: record.tax_amount || 0,
      exempt_amount: record.exempt_amount || 0,
      total_amount: record.total_amount,
      description: record.description,
      status: 'pending',
      import_batch_id: batchId,
      import_source: 'csv',
      original_data: record
    }));
    
    // Insertar registros en la base de datos
    const { data: insertedRecords, error: insertError } = await supabase
      .from('rcv_records')
      .insert(rcvRecords)
      .select();
    
    if (insertError) {
      console.error('Error inserting RCV records:', insertError);
      
      await supabase
        .from('rcv_import_batches')
        .update({
          status: 'failed',
          error_message: 'Error al insertar registros: ' + insertError.message,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      
      return NextResponse.json({
        success: false,
        error: 'Error al insertar registros en la base de datos'
      }, { status: 500 });
    }
    
    // Procesar cada registro para crear/actualizar entidades
    let processedCount = 0;
    let errorCount = 0;
    const entitiesCreated = new Set<string>();
    
    for (const record of insertedRecords || []) {
      try {
        // Llamar a la función PostgreSQL para procesar el registro
        const { error: processError } = await supabase
          .rpc('process_rcv_record', { p_record_id: record.id });
        
        if (processError) {
          console.error(`Error processing record ${record.id}:`, processError);
          errorCount++;
        } else {
          processedCount++;
          entitiesCreated.add(record.entity_rut);
        }
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        errorCount++;
      }
    }
    
    // Calcular totales
    const totals = records.reduce((acc, record) => ({
      net: acc.net + (record.net_amount || 0),
      tax: acc.tax + (record.tax_amount || 0),
      total: acc.total + record.total_amount
    }), { net: 0, tax: 0, total: 0 });
    
    // Actualizar estadísticas del lote
    await supabase
      .from('rcv_import_batches')
      .update({
        total_records: records.length,
        processed_records: processedCount,
        success_records: processedCount,
        error_records: errorCount,
        total_net_amount: totals.net,
        total_tax_amount: totals.tax,
        total_amount: totals.total,
        status: errorCount === 0 ? 'completed' : 'partial',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', batch.id);
    
    // Obtener resumen de entidades creadas/actualizadas
    const { data: entitySummary } = await supabase
      .from('rcv_entity_summary')
      .select('*')
      .eq('company_id', companyId)
      .in('entity_rut', Array.from(entitiesCreated));
    
    return NextResponse.json({
      success: true,
      data: {
        batch_id: batchId,
        records_imported: records.length,
        records_processed: processedCount,
        records_with_errors: errorCount,
        entities_processed: entitiesCreated.size,
        new_entities: entitySummary?.filter(e => !e.entity_exists).length || 0,
        totals: {
          net_amount: totals.net,
          tax_amount: totals.tax,
          total_amount: totals.total
        }
      },
      message: `Importación completada: ${records.length} registros procesados, ${entitiesCreated.size} entidades gestionadas`
    });
    
  } catch (error) {
    console.error('Error in POST /api/accounting/rcv/import:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// GET - Obtener historial de importaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    
    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }
    
    const { data: batches, error } = await supabase
      .from('rcv_import_batches')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching import batches:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener historial de importaciones'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: batches || []
    });
    
  } catch (error) {
    console.error('Error in GET /api/accounting/rcv/import:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}