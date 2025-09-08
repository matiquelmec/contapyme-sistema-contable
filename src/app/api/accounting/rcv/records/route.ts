import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener registros RCV con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const recordType = searchParams.get('record_type'); // purchase, sale
    const status = searchParams.get('status'); // pending, processed, error
    const entityRut = searchParams.get('entity_rut');
    const search = searchParams.get('search');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    // Construir query
    let query = supabase
      .from('rcv_records')
      .select(`
        *,
        rcv_entities!entity_rut (
          id,
          entity_name,
          account_code,
          account_name
        )
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Aplicar filtros
    if (recordType) {
      query = query.eq('record_type', recordType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (entityRut) {
      query = query.eq('entity_rut', entityRut);
    }

    if (startDate) {
      query = query.gte('document_date', startDate);
    }

    if (endDate) {
      query = query.lte('document_date', endDate);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`entity_name.ilike.%${searchTerm}%,entity_rut.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%`);
    }

    // Ordenar y paginar
    query = query
      .order('document_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: records, error, count } = await query;

    if (error) {
      console.error('Error fetching RCV records:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener registros RCV'
      }, { status: 500 });
    }

    // Obtener estadísticas
    const { data: stats } = await supabase
      .rpc('get_rcv_statistics', {
        p_company_id: companyId,
        p_year: startDate ? new Date(startDate).getFullYear() : null,
        p_month: startDate ? new Date(startDate).getMonth() + 1 : null
      });

    return NextResponse.json({
      success: true,
      data: {
        records: records || [],
        total: count || 0,
        statistics: stats?.[0] || {
          total_records: 0,
          total_purchases: 0,
          total_sales: 0,
          unique_entities: 0,
          total_net_amount: 0,
          total_tax_amount: 0,
          total_amount: 0,
          pending_records: 0,
          processed_records: 0
        }
      },
      message: `${count || 0} registros encontrados`
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/rcv/records:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST - Crear registro RCV manual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id,
      record_type,
      document_type,
      document_number,
      document_date,
      entity_rut,
      entity_name,
      entity_business_name,
      net_amount,
      tax_amount,
      exempt_amount,
      total_amount,
      description
    } = body;

    // Validaciones
    if (!company_id || !record_type || !entity_rut || !entity_name || !document_date || !total_amount) {
      return NextResponse.json({
        success: false,
        error: 'Campos requeridos: company_id, record_type, entity_rut, entity_name, document_date, total_amount'
      }, { status: 400 });
    }

    // Formatear RUT
    const formattedRut = entity_rut; // Asumiendo que ya viene formateado

    // Crear registro
    const { data: newRecord, error: insertError } = await supabase
      .from('rcv_records')
      .insert({
        company_id,
        record_type,
        document_type: document_type || 'Factura',
        document_number,
        document_date,
        entity_rut: formattedRut,
        entity_name,
        entity_business_name,
        net_amount: net_amount || 0,
        tax_amount: tax_amount || 0,
        exempt_amount: exempt_amount || 0,
        total_amount,
        description,
        status: 'pending',
        import_source: 'manual'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating RCV record:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Error al crear registro RCV'
      }, { status: 500 });
    }

    // Procesar el registro para crear/actualizar entidad
    const { error: processError } = await supabase
      .rpc('process_rcv_record', { p_record_id: newRecord.id });

    if (processError) {
      console.error('Error processing RCV record:', processError);
    }

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: 'Registro RCV creado y entidad procesada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/accounting/rcv/records:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// DELETE - Eliminar registro RCV
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    const companyId = searchParams.get('company_id');

    if (!recordId || !companyId) {
      return NextResponse.json({
        success: false,
        error: 'id y company_id son requeridos'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('rcv_records')
      .delete()
      .eq('id', recordId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting RCV record:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al eliminar registro'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registro eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/accounting/rcv/records:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}