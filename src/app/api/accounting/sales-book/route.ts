import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener libro de ventas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // YYYY-MM
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 API Sales Book - GET:', { period, limit, offset });

    // Query base para documentos de venta
    let query = supabase
      .from('sale_document')
      .select(`
        *,
        sales_ledger (
          slid,
          period,
          accounting_entry
        )
      `)
      .eq('status', 'active')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por período si se especifica
    if (period) {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching sales documents:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener documentos de venta' },
        { status: 500 }
      );
    }

    // Calcular totales del período
    const totals = documents?.reduce(
      (acc, doc) => ({
        total_net: acc.total_net + (doc.net_amount || 0),
        total_iva: acc.total_iva + (doc.iva_amount || 0),
        total_amount: acc.total_amount + (doc.total_amount || 0),
        document_count: acc.document_count + 1
      }),
      { total_net: 0, total_iva: 0, total_amount: 0, document_count: 0 }
    ) || { total_net: 0, total_iva: 0, total_amount: 0, document_count: 0 };

    console.log(`✅ Libro de ventas: ${documents?.length || 0} documentos`);

    return NextResponse.json({
      success: true,
      data: {
        documents: documents || [],
        totals,
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: (count || 0) > offset + limit
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/sales-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo documento de venta + asiento automático
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Sales Book - POST:', body);

    const {
      date,
      folio,
      client_name,
      client_rut = null,
      document_type = 'FACTURA',
      net_amount,
      iva_rate = 19.0,
      description = null
    } = body;

    // Validaciones
    if (!date || !folio || !client_name || !net_amount) {
      return NextResponse.json(
        { success: false, error: 'date, folio, client_name y net_amount son requeridos' },
        { status: 400 }
      );
    }

    if (net_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'net_amount debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Calcular IVA y total
    const iva_amount = Math.round(net_amount * (iva_rate / 100));
    const total_amount = net_amount + iva_amount;
    const period = date.substring(0, 7); // YYYY-MM

    // Generar IDs únicos
    const timestamp = Date.now();
    const sdid = `SD${timestamp}`;
    const slid = `SL${timestamp}`;

    // 1. Crear documento de venta
    const { data: document, error: docError } = await supabase
      .from('sale_document')
      .insert({
        sdid,
        date,
        folio,
        client_name,
        client_rut,
        document_type,
        net_amount,
        iva_amount,
        total_amount,
        iva_rate
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating sale document:', docError);
      return NextResponse.json(
        { success: false, error: 'Error al crear documento de venta' },
        { status: 500 }
      );
    }

    // 2. Crear asiento en journal_book automáticamente
    const jbid = `JB${timestamp}`;
    const journal_description = description || `Venta ${document_type} ${folio} - ${client_name}`;

    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_book')
      .insert({
        jbid,
        date,
        debit: total_amount,
        credit: total_amount,
        description: journal_description,
        document_number: folio,
        reference_type: 'VENTA',
        reference_id: document.id
      })
      .select()
      .single();

    if (journalError) {
      console.error('Error creating journal entry:', journalError);
      // Si falla el journal, revertir documento (transacción manual)
      await supabase
        .from('sale_document')
        .delete()
        .eq('sdid', sdid);
      
      return NextResponse.json(
        { success: false, error: 'Error al crear asiento contable' },
        { status: 500 }
      );
    }

    // 3. Crear entrada en sales_ledger
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('sales_ledger')
      .insert({
        slid,
        sdid,
        period,
        client_name,
        client_rut,
        total_net: net_amount,
        total_iva: iva_amount,
        total_amount,
        accounting_entry: jbid
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('Error creating sales ledger entry:', ledgerError);
      return NextResponse.json(
        { success: false, error: 'Error al crear entrada en libro de ventas' },
        { status: 500 }
      );
    }

    console.log(`✅ Documento de venta creado: ${folio} por $${total_amount.toLocaleString('es-CL')}`);

    return NextResponse.json({
      success: true,
      data: {
        document,
        journal_entry: journalEntry,
        ledger_entry: ledgerEntry,
        calculations: {
          net_amount,
          iva_amount,
          total_amount,
          iva_rate
        }
      },
      message: `Documento de venta ${folio} registrado exitosamente`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/sales-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Anular documento de venta
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sdid = searchParams.get('sdid');

    if (!sdid) {
      return NextResponse.json(
        { success: false, error: 'sdid es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 API Sales Book - DELETE:', sdid);

    // Marcar como inactivo en lugar de eliminar (auditoría)
    const { data: document, error } = await supabase
      .from('sale_document')
      .update({ status: 'cancelled' })
      .eq('sdid', sdid)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling sale document:', error);
      return NextResponse.json(
        { success: false, error: 'Error al anular documento de venta' },
        { status: 500 }
      );
    }

    // También marcar el asiento en journal_book como revertido
    await supabase
      .from('journal_book')
      .update({ status: 'reversed' })
      .eq('reference_id', document.id)
      .eq('reference_type', 'VENTA');

    console.log(`✅ Documento de venta anulado: ${sdid}`);

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Documento de venta anulado exitosamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/accounting/sales-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}