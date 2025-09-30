import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  rut?: string;
  suggestedEntry?: {
    debitAccount: string;
    debitAccountName: string;
    creditAccount: string;
    creditAccountName: string;
    amount: number;
    description: string;
    type: 'cliente' | 'proveedor' | 'remuneracion' | 'otro';
  };
}

// POST - Create journal entries from bank transactions
export async function POST(request: NextRequest) {
  try {
    console.log('📊 Creating journal entries from bank transactions...');

    const { transactions, companyId } = await request.json();

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({
        success: false,
        error: 'No transactions provided'
      }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID is required'
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const createdEntries = [];
    const errors = [];

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Skip if no suggested entry
        if (!transaction.suggestedEntry) {
          console.warn(`⚠️ No suggested entry for transaction: ${transaction.description}`);
          continue;
        }

        const entry = transaction.suggestedEntry;
        
        // Create journal entry
        const journalEntry = {
          company_id: companyId,
          entry_date: transaction.date,
          entry_type: 'bank_reconciliation',
          description: entry.description,
          reference: transaction.rut || '',
          status: 'draft',
          created_by: 'bank_import',
          total_debit: entry.amount,
          total_credit: entry.amount,
          notes: `Importado desde cartola bancaria - ${transaction.description}`
        };

        console.log('📝 Creating journal entry:', journalEntry);

        // Insert journal entry
        const { data: journalData, error: journalError } = await supabase
          .from('journal_entries')
          .insert(journalEntry)
          .select()
          .single();

        if (journalError) {
          console.error('❌ Error creating journal entry:', journalError);
          errors.push({
            transaction: transaction.description,
            error: journalError.message
          });
          continue;
        }

        // Create journal entry lines
        const lines = [
          {
            journal_entry_id: journalData.id,
            company_id: companyId,
            line_number: 1,
            account_code: entry.debitAccount,
            account_name: entry.debitAccountName,
            description: entry.description,
            debit: entry.amount,
            credit: 0,
            entity_rut: transaction.type === 'credit' ? null : transaction.rut,
            entity_name: transaction.type === 'credit' ? null : extractEntityName(transaction.description)
          },
          {
            journal_entry_id: journalData.id,
            company_id: companyId,
            line_number: 2,
            account_code: entry.creditAccount,
            account_name: entry.creditAccountName,
            description: entry.description,
            debit: 0,
            credit: entry.amount,
            entity_rut: transaction.type === 'credit' ? transaction.rut : null,
            entity_name: transaction.type === 'credit' ? extractEntityName(transaction.description) : null
          }
        ];

        console.log('📝 Creating journal entry lines:', lines);

        // Insert lines
        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(lines);

        if (linesError) {
          console.error('❌ Error creating journal lines:', linesError);
          
          // Rollback - delete the journal entry
          await supabase
            .from('journal_entries')
            .delete()
            .eq('id', journalData.id);
          
          errors.push({
            transaction: transaction.description,
            error: linesError.message
          });
          continue;
        }

        createdEntries.push({
          id: journalData.id,
          description: entry.description,
          amount: entry.amount,
          date: transaction.date,
          type: entry.type
        });

        console.log(`✅ Journal entry created: ${journalData.id}`);

      } catch (error) {
        console.error('❌ Error processing transaction:', error);
        errors.push({
          transaction: transaction.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      data: {
        created: createdEntries.length,
        failed: errors.length,
        entries: createdEntries,
        errors: errors
      },
      message: `Se crearon ${createdEntries.length} asientos contables${errors.length > 0 ? ` (${errors.length} errores)` : ''}`
    });

  } catch (error) {
    console.error('❌ Error in bank-to-journal API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error creating journal entries'
    }, { status: 500 });
  }
}

// Helper function to extract entity name from description
function extractEntityName(description: string): string {
  // Try to extract entity name from common patterns
  const patterns = [
    /(?:Cliente|Proveedor|de|a)\s+([A-Za-z0-9\s]+?)(?:\s+RUT|\s+Ltda|\s+SpA|\s+SA|\s+-|$)/i,
    /Transferencia\s+(?:de|a)\s+([A-Za-z0-9\s]+?)(?:\s+RUT|\s+-|$)/i,
    /Pago\s+(?:de|a)\s+([A-Za-z0-9\s]+?)(?:\s+RUT|\s+-|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: use first part of description
  const parts = description.split('-');
  if (parts.length > 1) {
    return parts[1].trim();
  }

  return description.substring(0, 50);
}