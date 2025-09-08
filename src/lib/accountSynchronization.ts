/**
 * Account Synchronization Utilities
 * 
 * This module provides utilities to synchronize account names between
 * journal entries and the chart of accounts configuration.
 * 
 * The user requested: "AHORA ME GUSTARIA QUE LAS CUENTAS QUE APAREZCAN SE EDITEN EN 
 * CONJUNTO CON EL PLAN DE CUENTAS DE LA CONFIGURACION"
 * 
 * This means when account names are updated in the chart of accounts, 
 * they should automatically be reflected in journal entries.
 */

import { createSupabaseServerClient } from '@/lib/database/databaseSimple';

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  line_number: number;
  account_code: string;
  account_name: string;
  line_description: string;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
}

export interface SynchronizedJournalLine extends JournalLine {
  chart_of_accounts?: {
    code: string;
    name: string;
  };
}

/**
 * Synchronizes journal lines with the current chart of accounts
 * This function fetches journal lines and updates account names from the chart of accounts
 */
export async function synchronizeJournalLines(
  entryId: string,
  companyId?: string
): Promise<SynchronizedJournalLine[]> {
  const supabase = createSupabaseServerClient();
  
  try {
    // Fetch journal lines with JOIN to chart of accounts
    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select(`
        *,
        chart_of_accounts!inner (
          code,
          name
        )
      `)
      .eq('journal_entry_id', entryId)
      .order('line_number', { ascending: true });

    if (linesError) {
      console.error('❌ Error loading lines with account synchronization:', linesError);
      // Fallback to basic query without JOIN
      const { data: basicLines, error: basicError } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', entryId)
        .order('line_number', { ascending: true });
      
      if (basicError) {
        throw new Error(`Failed to load journal lines: ${basicError.message}`);
      }
      
      return basicLines || [];
    }

    // Process lines to use updated account names from chart of accounts
    const processedLines = (lines || []).map((line: any) => ({
      ...line,
      // Use updated name from chart of accounts if available
      account_name: line.chart_of_accounts?.name || line.account_name || 'Cuenta no encontrada'
    }));

    console.log(`✅ Account synchronization completed for entry ${entryId}: ${processedLines.length} lines`);
    return processedLines;
    
  } catch (error) {
    console.error('❌ Error in synchronizeJournalLines:', error);
    throw error;
  }
}

/**
 * Synchronizes multiple journal entries with their lines
 * This is optimized for bulk operations like loading journal lists
 */
export async function synchronizeMultipleJournalEntries(
  entries: any[],
  companyId?: string
): Promise<any[]> {
  const supabase = createSupabaseServerClient();
  
  try {
    const synchronizedEntries = [];
    
    for (const entry of entries) {
      try {
        // Use the synchronizeJournalLines function for each entry
        const synchronizedLines = await synchronizeJournalLines(entry.id, companyId);
        
        // Add synchronized lines to the entry
        synchronizedEntries.push({
          ...entry,
          lines: synchronizedLines
        });
        
        console.log(`✅ Entry ${entry.entry_number} synchronized with ${synchronizedLines.length} lines`);
        
      } catch (error) {
        console.error(`❌ Error synchronizing entry ${entry.id}:`, error);
        // Add entry without lines in case of error
        synchronizedEntries.push({
          ...entry,
          lines: []
        });
      }
    }
    
    return synchronizedEntries;
    
  } catch (error) {
    console.error('❌ Error in synchronizeMultipleJournalEntries:', error);
    throw error;
  }
}

/**
 * Checks if an account name needs synchronization by comparing with chart of accounts
 */
export async function checkAccountSynchronizationStatus(
  accountCode: string, 
  currentAccountName: string,
  companyId?: string
): Promise<{ needsSync: boolean; updatedName?: string }> {
  const supabase = createSupabaseServerClient();
  
  try {
    const { data: account, error } = await supabase
      .from('chart_of_accounts')
      .select('name')
      .eq('code', accountCode)
      .eq('is_active', true)
      .single();
    
    if (error || !account) {
      return { needsSync: false };
    }
    
    const needsSync = account.name !== currentAccountName;
    
    return {
      needsSync,
      updatedName: needsSync ? account.name : undefined
    };
    
  } catch (error) {
    console.error('❌ Error checking account synchronization status:', error);
    return { needsSync: false };
  }
}

/**
 * Gets the current account name from chart of accounts by code
 * This is a utility function to get the latest account name
 */
export async function getCurrentAccountName(
  accountCode: string,
  companyId?: string
): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  
  try {
    const { data: account, error } = await supabase
      .from('chart_of_accounts')
      .select('name')
      .eq('code', accountCode)
      .eq('is_active', true)
      .single();
    
    if (error || !account) {
      console.warn(`⚠️ Account not found in chart of accounts: ${accountCode}`);
      return null;
    }
    
    return account.name;
    
  } catch (error) {
    console.error('❌ Error getting current account name:', error);
    return null;
  }
}

/**
 * Bulk synchronization function for performance optimization
 * This function can synchronize account names for multiple account codes at once
 */
export async function bulkSynchronizeAccountNames(
  accountCodes: string[],
  companyId?: string
): Promise<Record<string, string>> {
  const supabase = createSupabaseServerClient();
  const accountNamesMap: Record<string, string> = {};
  
  try {
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('code, name')
      .in('code', accountCodes)
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Error in bulk account synchronization:', error);
      return accountNamesMap;
    }
    
    // Build the mapping
    (accounts || []).forEach(account => {
      accountNamesMap[account.code] = account.name;
    });
    
    console.log(`✅ Bulk account synchronization completed for ${Object.keys(accountNamesMap).length} accounts`);
    return accountNamesMap;
    
  } catch (error) {
    console.error('❌ Error in bulkSynchronizeAccountNames:', error);
    return accountNamesMap;
  }
}