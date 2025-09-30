import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/rcv/[type]
 * Obtiene datos RCV almacenados por tipo (purchase o sales)
 * Query params:
 * - company_id (required)
 * - period (optional): YYYY-MM
 * - limit (optional): número de registros
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const period = searchParams.get('period');
    const limit = searchParams.get('limit');

    const rcvType = params.type;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (rcvType !== 'purchase' && rcvType !== 'sales') {
      return NextResponse.json(
        { success: false, error: 'Tipo debe ser "purchase" o "sales"' },
        { status: 400 }
      );
    }

    console.log(`🔍 RCV GET - Tipo: ${rcvType}, Company: ${companyId}, Period: ${period}`);

    if (rcvType === 'purchase') {
      const result = await getPurchaseData(companyId, period, limit);
      return NextResponse.json({
        success: true,
        data: result,
        type: 'purchase'
      });
    } else {
      const result = await getSalesData(companyId, period, limit);
      return NextResponse.json({
        success: true,
        data: result,
        type: 'sales'
      });
    }

  } catch (error) {
    console.error('❌ Error obteniendo datos RCV:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Obtiene datos de compras desde purchase_ledger y purchase_document
 */
async function getPurchaseData(companyId: string, period?: string | null, limit?: string | null) {
  // Construir query base
  let ledgerQuery = supabase
    .from('purchase_ledger')
    .select('*')
    .eq('company_id', companyId);

  if (period) {
    ledgerQuery = ledgerQuery.eq('period_identifier', period);
  }

  if (limit) {
    ledgerQuery = ledgerQuery.limit(parseInt(limit));
  }

  ledgerQuery = ledgerQuery.order('period_start', { ascending: false });

  const { data: ledgers, error: ledgersError } = await ledgerQuery;

  if (ledgersError) throw ledgersError;

  if (!ledgers || ledgers.length === 0) {
    return {
      ledgers: [],
      documents: [],
      summary: {
        total_ledgers: 0,
        total_transactions: 0,
        total_amount: 0
      }
    };
  }

  // Obtener documentos para cada ledger
  const ledgerIds = ledgers.map(l => l.id);
  
  const { data: documents, error: documentsError } = await supabase
    .from('purchase_document')
    .select('*')
    .in('purchase_ledger_id', ledgerIds)
    .order('document_date', { ascending: false });

  if (documentsError) throw documentsError;

  // Calcular estadísticas
  const totalTransactions = ledgers.reduce((sum, l) => sum + l.total_transactions, 0);
  const totalAmount = ledgers.reduce((sum, l) => sum + parseFloat(l.total_calculated_amount || 0), 0);

  // Agrupar documentos por ledger
  const ledgersWithDocuments = ledgers.map(ledger => ({
    ...ledger,
    documents: documents?.filter(doc => doc.purchase_ledger_id === ledger.id) || []
  }));

  return {
    ledgers: ledgersWithDocuments,
    documents: documents || [],
    summary: {
      total_ledgers: ledgers.length,
      total_transactions: totalTransactions,
      total_amount: totalAmount
    }
  };
}

/**
 * Obtiene datos de ventas desde sales_ledger y sale_document
 */
async function getSalesData(companyId: string, period?: string | null, limit?: string | null) {
  // Construir query base
  let ledgerQuery = supabase
    .from('sales_ledger')
    .select('*')
    .eq('company_id', companyId);

  if (period) {
    ledgerQuery = ledgerQuery.eq('period_identifier', period);
  }

  if (limit) {
    ledgerQuery = ledgerQuery.limit(parseInt(limit));
  }

  ledgerQuery = ledgerQuery.order('period_start', { ascending: false });

  const { data: ledgers, error: ledgersError } = await ledgerQuery;

  if (ledgersError) throw ledgersError;

  if (!ledgers || ledgers.length === 0) {
    return {
      ledgers: [],
      documents: [],
      summary: {
        total_ledgers: 0,
        total_transactions: 0,
        total_amount: 0
      }
    };
  }

  // Obtener documentos para cada ledger
  const ledgerIds = ledgers.map(l => l.id);
  
  const { data: documents, error: documentsError } = await supabase
    .from('sale_document')
    .select('*')
    .in('sales_ledger_id', ledgerIds)
    .order('document_date', { ascending: false });

  if (documentsError) throw documentsError;

  // Calcular estadísticas
  const totalTransactions = ledgers.reduce((sum, l) => sum + l.total_transactions, 0);
  const totalAmount = ledgers.reduce((sum, l) => sum + parseFloat(l.total_calculated_amount || 0), 0);

  // Agrupar documentos por ledger
  const ledgersWithDocuments = ledgers.map(ledger => ({
    ...ledger,
    documents: documents?.filter(doc => doc.sales_ledger_id === ledger.id) || []
  }));

  return {
    ledgers: ledgersWithDocuments,
    documents: documents || [],
    summary: {
      total_ledgers: ledgers.length,
      total_transactions: totalTransactions,
      total_amount: totalAmount
    }
  };
}

// DELETE function removed - RCV deletion disabled to maintain data integrity
// RCV ledgers should not be deleted due to foreign key constraints