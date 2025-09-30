import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener libro de compras
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // YYYY-MM
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 API Purchase Book - GET:', { period, limit, offset });

    // Query base para documentos de compra
    let query = supabase
      .from('purchase_document')
      .select(`
        *,
        purchase_ledger (
          plid,
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
      const endDate = `${year}-${month}-31`; // Simplificado, podrías calcular último día del mes
      
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching purchase documents:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener documentos de compra' },
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

    console.log(`✅ Libro de compras: ${documents?.length || 0} documentos`);

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
    console.error('Error in GET /api/accounting/purchase-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo documento de compra + asiento automático
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Purchase Book - POST:', body);

    const {
      date,
      folio,
      supplier_name,
      supplier_rut,
      document_type = 'FACTURA',
      net_amount,
      iva_rate = 19.0,
      description = null
    } = body;

    // Validaciones
    if (!date || !folio || !supplier_name || !net_amount) {
      return NextResponse.json(
        { success: false, error: 'date, folio, supplier_name y net_amount son requeridos' },
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
    const pdid = `PD${timestamp}`;
    const plid = `PL${timestamp}`;

    // 1. Crear documento de compra
    const { data: document, error: docError } = await supabase
      .from('purchase_document')
      .insert({
        pdid,
        date,
        folio,
        supplier_name,
        supplier_rut,
        document_type,
        net_amount,
        iva_amount,
        total_amount,
        iva_rate
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating purchase document:', docError);
      return NextResponse.json(
        { success: false, error: 'Error al crear documento de compra' },
        { status: 500 }
      );
    }

    // 2. Crear asiento en journal_book automáticamente
    const jbid = `JB${timestamp}`;
    const journal_description = description || `Compra ${document_type} ${folio} - ${supplier_name}`;

    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_book')
      .insert({
        jbid,
        date,
        debit: total_amount,
        credit: total_amount,
        description: journal_description,
        document_number: folio,
        reference_type: 'COMPRA',
        reference_id: document.id
      })
      .select()
      .single();

    if (journalError) {
      console.error('Error creating journal entry:', journalError);
      // Si falla el journal, revertir documento (transacción manual)
      await supabase
        .from('purchase_document')
        .delete()
        .eq('pdid', pdid);
      
      return NextResponse.json(
        { success: false, error: 'Error al crear asiento contable' },
        { status: 500 }
      );
    }

    // 3. Crear entrada en purchase_ledger
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('purchase_ledger')
      .insert({
        plid,
        pdid,
        period,
        supplier_name,
        supplier_rut,
        total_net: net_amount,
        total_iva: iva_amount,
        total_amount,
        accounting_entry: jbid
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('Error creating purchase ledger entry:', ledgerError);
      return NextResponse.json(
        { success: false, error: 'Error al crear entrada en libro de compras' },
        { status: 500 }
      );
    }

    console.log(`✅ Documento de compra creado: ${folio} por $${total_amount.toLocaleString('es-CL')}`);

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
      message: `Documento de compra ${folio} registrado exitosamente`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/purchase-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar documento de compra
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Purchase Book - PUT:', body);

    const { pdid, ...updateData } = body;

    if (!pdid) {
      return NextResponse.json(
        { success: false, error: 'pdid es requerido' },
        { status: 400 }
      );
    }

    // Recalcular si cambia el monto neto o la tasa de IVA
    if (updateData.net_amount || updateData.iva_rate) {
      const net = updateData.net_amount || 0;
      const rate = updateData.iva_rate || 19.0;
      
      updateData.iva_amount = Math.round(net * (rate / 100));
      updateData.total_amount = net + updateData.iva_amount;
    }

    const { data: updatedDocument, error } = await supabase
      .from('purchase_document')
      .update(updateData)
      .eq('pdid', pdid)
      .select()
      .single();

    if (error) {
      console.error('Error updating purchase document:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar documento' },
        { status: 500 }
      );
    }

    console.log(`✅ Documento de compra actualizado: ${pdid}`);

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message: 'Documento actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/accounting/purchase-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}