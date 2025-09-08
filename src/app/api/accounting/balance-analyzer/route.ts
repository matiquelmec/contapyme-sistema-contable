import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// POST /api/accounting/balance-analyzer - Procesar balance externo y generar asiento de apertura
export async function POST(request: NextRequest) {
  try {
    const { 
      external_balance, 
      mapping_results, 
      opening_date, 
      company_id,
      source_description 
    } = await request.json();

    if (!company_id || !external_balance || !mapping_results || !opening_date) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: company_id, external_balance, mapping_results, opening_date'
      }, { status: 400 });
    }

    console.log('🏗️ Generando asiento de apertura:', {
      company_id,
      opening_date,
      mappings: mapping_results.length,
      source: source_description
    });

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // Calcular totales para validar que el asiento cuadre
    const totalDebit = mapping_results
      .filter((m: any) => m.side === 'debit')
      .reduce((sum: number, m: any) => sum + m.amount, 0);
    
    const totalCredit = mapping_results
      .filter((m: any) => m.side === 'credit')
      .reduce((sum: number, m: any) => sum + m.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({
        success: false,
        error: `El asiento no cuadra: Debe=${totalDebit}, Haber=${totalCredit}`,
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }, { status: 400 });
    }

    // Crear el asiento de apertura en journal_entries
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id,
        entry_date: opening_date,
        entry_number: await getNextEntryNumber(supabase, company_id),
        entry_type: 'apertura',
        description: `Asiento de apertura generado desde análisis de balance externo: ${source_description || 'Balance importado'}`,
        reference: `APERTURA-${new Date().getTime()}`,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft',
        created_by: 'balance-analyzer'
      })
      .select('id')
      .single();

    if (entryError) {
      console.error('❌ Error creando asiento:', entryError);
      return NextResponse.json({
        success: false,
        error: 'Error creando asiento de apertura: ' + entryError.message
      }, { status: 500 });
    }

    // Crear las líneas del asiento
    const journalLines = mapping_results.map((mapping: any, index: number) => ({
      entry_id: journalEntry.id,
      line_number: index + 1,
      account_code: mapping.mapped_code,
      account_name: mapping.mapped_name,
      description: `Apertura - ${mapping.external_account}`,
      debit_amount: mapping.side === 'debit' ? mapping.amount : 0,
      credit_amount: mapping.side === 'credit' ? mapping.amount : 0
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      // Rollback: eliminar el asiento si falla la creación de líneas
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      
      console.error('❌ Error creando líneas del asiento:', linesError);
      return NextResponse.json({
        success: false,
        error: 'Error creando líneas del asiento: ' + linesError.message
      }, { status: 500 });
    }

    // Guardar información del análisis para auditoría
    await saveAnalysisAudit(supabase, {
      company_id,
      entry_id: journalEntry.id,
      external_balance,
      mapping_results,
      source_description,
      analysis_date: new Date().toISOString(),
      total_accounts_mapped: mapping_results.length,
      average_confidence: mapping_results.reduce((sum: number, m: any) => sum + m.confidence, 0) / mapping_results.length
    });

    console.log(`✅ Asiento de apertura creado exitosamente: ID=${journalEntry.id}, Líneas=${journalLines.length}`);

    return NextResponse.json({
      success: true,
      data: {
        entry_id: journalEntry.id,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines_count: journalLines.length,
        opening_date,
        status: 'draft',
        analysis_summary: {
          accounts_processed: external_balance.length,
          accounts_mapped: mapping_results.length,
          average_confidence: Math.round(mapping_results.reduce((sum: number, m: any) => sum + m.confidence, 0) / mapping_results.length),
          source: source_description
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/accounting/balance-analyzer:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}

// GET /api/accounting/balance-analyzer - Obtener historial de análisis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');
    
    if (!company_id) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // Obtener asientos de apertura generados por el analizador
    const { data: openingEntries, error } = await supabase
      .from('journal_entries')
      .select(`
        id,
        entry_date,
        entry_number,
        description,
        reference_number,
        total_debit,
        total_credit,
        status,
        created_at,
        journal_entry_lines (
          account_code,
          account_name,
          debit_amount,
          credit_amount
        )
      `)
      .eq('company_id', company_id)
      .eq('entry_type', 'apertura')
      .ilike('created_by', '%balance-analyzer%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo historial:', error);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo historial: ' + error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        opening_entries: openingEntries || [],
        total_entries: openingEntries?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/accounting/balance-analyzer:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Función auxiliar para obtener el siguiente número de asiento
async function getNextEntryNumber(supabase: any, company_id: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', company_id)
      .order('entry_number', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('⚠️ Error obteniendo último número de asiento, usando 1');
      return '1';
    }

    if (!data || data.length === 0) {
      return '1';
    }

    const lastNumber = parseInt(data[0].entry_number) || 0;
    return (lastNumber + 1).toString();
  } catch (error) {
    console.warn('⚠️ Error en getNextEntryNumber, usando timestamp');
    return Date.now().toString();
  }
}

// Función auxiliar para guardar auditoría del análisis
async function saveAnalysisAudit(supabase: any, analysisData: any) {
  try {
    // Esta tabla se podría crear después para guardar más detalles del análisis
    // Por ahora solo logeamos la información
    console.log('📋 Análisis guardado para auditoría:', {
      company_id: analysisData.company_id,
      entry_id: analysisData.entry_id,
      accounts_mapped: analysisData.total_accounts_mapped,
      avg_confidence: analysisData.average_confidence,
      source: analysisData.source_description
    });
  } catch (error) {
    console.warn('⚠️ Error guardando auditoría del análisis:', error);
  }
}