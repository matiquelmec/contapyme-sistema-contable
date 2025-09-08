import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, companyId } = body;

    if (!transactionId || !companyId) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID and Company ID are required'
      }, { status: 400 });
    }

    console.log('🔍 PREVIEW - Generating journal entry preview for transaction:', transactionId);
    
    // Import the same logic used in integration
    const { 
      createRCVJournalEntry, 
      createPayrollJournalEntry 
    } = await import('../integration/route');
    
    // Get transaction data
    const supabase = getDatabaseConnection();
    
    // First, try to get RCV data
    const { data: rcvData } = await supabase
      .from('rcv_files_uploaded')
      .select('*')
      .eq('id', transactionId)
      .eq('company_id', companyId)
      .single();

    let previewData;

    if (rcvData) {
      // RCV transaction preview
      console.log('📊 Generating RCV preview for:', rcvData.file_name);
      previewData = await createRCVJournalEntry(companyId, rcvData, true); // true = preview mode
    } else {
      // Try payroll data
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      console.log('💼 Generating Payroll preview for:', `${year}-${String(month).padStart(2, '0')}`);
      previewData = await createPayrollJournalEntry(companyId, year, month, true); // true = preview mode
    }

    if (!previewData) {
      return NextResponse.json({
        success: false,
        error: 'Could not generate preview - transaction data not found'
      }, { status: 404 });
    }

    // Calculate totals for validation
    const total_debit = previewData.lines.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);
    const total_credit = previewData.lines.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0);
    const balance_difference = Math.abs(total_debit - total_credit);

    console.log(`🧮 PREVIEW Balance: DEBE ${total_debit.toLocaleString('es-CL')}, HABER ${total_credit.toLocaleString('es-CL')}, Diferencia $${balance_difference}`);

    return NextResponse.json({
      success: true,
      data: {
        journal_entry: previewData,
        totals: {
          total_debit,
          total_credit,
          balance_difference,
          is_balanced: balance_difference <= 2
        },
        transaction_info: rcvData ? {
          type: 'rcv',
          file_name: rcvData.file_name,
          total_amount: rcvData.total_amount,
          total_transactions: rcvData.total_transactions
        } : {
          type: 'payroll',
          period: `${year}-${String(month).padStart(2, '0')}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating preview:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error generating preview'
    }, { status: 500 });
  }
}