import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

/**
 * POST /api/accounting/rcv-analysis/post-to-journal
 * Convierte un asiento preliminar RCV en un asiento definitivo en el libro diario
 * ACTUALIZADO: Fixed character varying(6) error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, rcv_analysis, preliminary_entry, ledger_id, period } = body;

    console.log('📝 Contabilizando asiento RCV en libro diario:', {
      company_id,
      ledger_id,
      period,
      period_length: period?.length,
      lines_count: preliminary_entry?.lines?.length || 0,
      total_debit: preliminary_entry?.total_debit || 0,
      total_credit: preliminary_entry?.total_credit || 0,
      is_balanced: preliminary_entry?.is_balanced || false
    });

    if (!company_id || !rcv_analysis || !preliminary_entry) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos: company_id, rcv_analysis, preliminary_entry'
      }, { status: 400 });
    }

    if (!preliminary_entry.is_balanced) {
      return NextResponse.json({
        success: false,
        error: 'El asiento debe estar balanceado antes de poder contabilizarlo'
      }, { status: 400 });
    }

    const supabase = getDatabaseConnection();

    // 1. Verificar si ya existe un asiento para este RCV
    if (ledger_id) {
      const { data: existingJournalEntry } = await supabase
        .from('rcv_ledger')
        .select('journal_entry_id')
        .eq('id', ledger_id)
        .single();

      if (existingJournalEntry?.journal_entry_id) {
        return NextResponse.json({
          success: false,
          error: 'Este RCV ya tiene un asiento contable creado'
        }, { status: 400 });
      }
    }

    // 2. Obtener el siguiente número de asiento
    const { data: latestEntry } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', company_id)
      .order('entry_number', { ascending: false })
      .limit(1);

    const nextEntryNumber = latestEntry && latestEntry.length > 0 
      ? latestEntry[0].entry_number + 1 
      : 1;

    // 3. Crear el asiento en journal_entries
    const journalEntry = {
      company_id,
      entry_date: new Date().toISOString().split('T')[0],
      description: preliminary_entry.description,
      reference: `RCV-${period}`,
      total_debit: preliminary_entry.total_debit,
      total_credit: preliminary_entry.total_credit,
      entry_type: 'rcv',
      source_type: 'rcv_analysis',
      source_id: ledger_id,
      source_period: period?.toString()?.substring(0, 6) || null, // Asegurar máximo 6 caracteres
      status: 'draft',
      created_by: 'system'
    };

    console.log('🔍 Datos del asiento a insertar:', {
      ...journalEntry,
      source_period_length: journalEntry.source_period?.length
    });

    const { data: createdEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert([journalEntry])
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creando asiento principal:', entryError);
      return NextResponse.json({
        success: false,
        error: 'Error creando el asiento en el libro diario: ' + entryError.message
      }, { status: 500 });
    }

    console.log('✅ Asiento principal creado:', createdEntry.id);

    // 4. Crear las líneas del asiento en journal_entry_lines (usando la misma estructura que F29)
    const journalLines = preliminary_entry.lines.map((line: any, index: number) => ({
      journal_entry_id: createdEntry.id,
      line_number: index + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      line_description: line.description,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      reference: null,
      cost_center: null,
      analytical_account: null
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('❌ Error creando líneas del asiento:', linesError);
      
      // Si falla la creación de líneas, eliminar el asiento principal
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', createdEntry.id);

      return NextResponse.json({
        success: false,
        error: 'Error creando las líneas del asiento: ' + linesError.message
      }, { status: 500 });
    }

    console.log(`✅ Creadas ${journalLines.length} líneas del asiento`);

    // 5. Actualizar el RCV ledger para marcar como contabilizado (si existe ledger_id)
    if (ledger_id) {
      const { error: updateError } = await supabase
        .from('rcv_ledger')
        .update({
          journal_entry_id: createdEntry.id,
          is_processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', ledger_id);

      if (updateError) {
        console.warn('⚠️ Warning: Error actualizando RCV ledger:', updateError);
        // No fallar la operación por esto, solo log de warning
      } else {
        console.log('✅ RCV ledger actualizado con journal_entry_id:', createdEntry.id);
      }
    }

    // 6. Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: {
        journal_entry_id: createdEntry.id,
        entry_number: createdEntry.entry_number,
        total_lines: journalLines.length,
        total_debit: createdEntry.total_debit,
        total_credit: createdEntry.total_credit,
        is_balanced: Math.abs(createdEntry.total_debit - createdEntry.total_credit) < 0.01,
        created_at: createdEntry.created_at
      },
      message: `Asiento #${createdEntry.entry_number} creado exitosamente en el libro diario con ${journalLines.length} líneas`
    });

  } catch (error) {
    console.error('❌ Error en post-to-journal:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}