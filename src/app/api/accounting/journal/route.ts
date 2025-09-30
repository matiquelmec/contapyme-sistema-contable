import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/database/databaseSimple';

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id') || COMPANY_ID;
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const entry_type = searchParams.get('entry_type');
    const status = searchParams.get('status');
    const include_lines = searchParams.get('include_lines') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('🔍 GET /api/accounting/journal - Params:', {
      company_id,
      date_from,
      date_to,
      entry_type,
      status,
      include_lines,
      page,
      limit
    });

    const supabase = createSupabaseServerClient();

    // Construir query base para journal_entries
    let query = supabase
      .from('journal_entries')
      .select(`
        id,
        entry_number,
        entry_date,
        description,
        entry_type,
        total_debit,
        total_credit,
        status,
        created_at
      `)
      .eq('company_id', company_id)

    // Aplicar filtros de fechas si se proporcionan
    if (date_from) {
      query = query.gte('entry_date', date_from);
    }
    if (date_to) {
      query = query.lte('entry_date', date_to);
    }
    
    // Aplicar filtros adicionales
    if (entry_type) {
      query = query.eq('entry_type', entry_type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Ejecutar query con paginación
    const { data: entries, error: entriesError } = await query
      .order('entry_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (entriesError) {
      console.error('❌ Error fetching entries:', entriesError);
      return NextResponse.json(
        { success: false, error: 'Error fetching journal entries' },
        { status: 500 }
      );
    }

    // Si include_lines es true, cargar líneas con nombres actualizados de cuentas
    let entriesWithLines = entries;
    if (include_lines && entries && entries.length > 0) {
      console.log('🔄 Cargando líneas con nombres actualizados de cuentas...');
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        // Cargar líneas del asiento con JOIN al plan de cuentas
        let { data: lines, error: linesError } = await supabase
          .from('journal_entry_lines')
          .select(`
            *,
            chart_of_accounts (
              code,
              name
            )
          `)
          .eq('journal_entry_id', entry.id)
          .order('line_number', { ascending: true });

        // Si el JOIN falla, intentar consulta básica sin JOIN
        if (linesError) {
          console.warn(`⚠️ JOIN failed for entry ${entry.entry_number}, trying basic query:`, linesError.message);
          
          const { data: basicLines, error: basicError } = await supabase
            .from('journal_entry_lines')
            .select('*')
            .eq('journal_entry_id', entry.id)
            .order('line_number', { ascending: true });

          if (!basicError && basicLines) {
            lines = basicLines;
            console.log(`✅ Basic query successful for entry ${entry.entry_number}: ${basicLines.length} líneas`);
          } else {
            console.error(`❌ Both queries failed for entry ${entry.id}:`, basicError);
            entriesWithLines[i] = { ...entry, lines: [] };
            continue;
          }
        } else {
          console.log(`✅ JOIN query successful for entry ${entry.entry_number}: ${lines.length} líneas`);
        }

        if (lines) {
          // Procesar líneas para usar nombres actualizados del plan de cuentas
          const processedLines = lines.map((line: any) => ({
            ...line,
            // Usar nombre actualizado del plan de cuentas si está disponible
            account_name: line.chart_of_accounts?.name || line.account_name || 'Cuenta no encontrada'
          }));
          
          // Agregar líneas procesadas al asiento
          entriesWithLines[i] = { ...entry, lines: processedLines };
        } else {
          // Mantener asiento sin líneas en caso de error
          entriesWithLines[i] = { ...entry, lines: [] };
        }
      }
    }

    // Calcular estadísticas totales
    console.log('📊 Calculando estadísticas desde journal_entries...');
    const { data: statsData, error: statsError } = await supabase
      .from('journal_entries')
      .select('id, entry_type, status, total_debit, total_credit, entry_date')
      .eq('company_id', company_id);

    let statistics = {
      total_entries: 0,
      total_debit: 0,
      total_credit: 0,
      entries_by_type: {} as Record<string, number>,
      entries_by_status: {} as Record<string, number>,
      monthly_trend: []
    };

    if (!statsError && statsData) {
      console.log('📊 Procesando', statsData.length, 'asientos para estadísticas');
      
      statistics.total_entries = statsData.length;
      statistics.total_debit = statsData.reduce((sum, entry) => sum + (entry.total_debit || 0), 0);
      statistics.total_credit = statsData.reduce((sum, entry) => sum + (entry.total_credit || 0), 0);
      
      // Contar por tipo
      statsData.forEach(entry => {
        statistics.entries_by_type[entry.entry_type] = (statistics.entries_by_type[entry.entry_type] || 0) + 1;
        statistics.entries_by_status[entry.status] = (statistics.entries_by_status[entry.status] || 0) + 1;
      });
      
      console.log('✅ Estadísticas calculadas:', statistics);
    }

    console.log(`✅ Journal entries obtenidos: ${entries?.length || 0}`);
    console.log('📊 Estadísticas:', statistics);

    return NextResponse.json({
      success: true,
      data: {
        entries: entriesWithLines || [],
        statistics,
        pagination: {
          page,
          limit,
          total: statistics.total_entries,
          hasMore: (entriesWithLines?.length || 0) === limit
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/accounting/journal:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id = COMPANY_ID,
      company_demo = true,
      entry_date,
      description,
      reference,
      entry_type = 'manual',
      lines = []
    } = body;

    console.log('📝 Creating journal entry:', { company_id, entry_type, lines: lines.length });

    const supabase = createSupabaseServerClient();

    // Validar líneas
    if (!lines || lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Se requieren al menos 2 líneas' },
        { status: 400 }
      );
    }

    // Calcular totales
    const total_debit = lines.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);
    const total_credit = lines.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0);

    if (Math.abs(total_debit - total_credit) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'El asiento debe estar balanceado' },
        { status: 400 }
      );
    }

    // Obtener próximo número de asiento
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', company_id)
      .order('entry_number', { ascending: false })
      .limit(1);

    const entry_number = (lastEntry?.[0]?.entry_number || 0) + 1;

    // Crear asiento principal
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id,
        company_demo,
        entry_number,
        entry_date,
        description,
        reference,
        entry_type,
        total_debit,
        total_credit,
        status: 'approved',
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (entryError || !entry) {
      console.error('❌ Error creating entry:', entryError);
      return NextResponse.json(
        { success: false, error: 'Error creating journal entry' },
        { status: 500 }
      );
    }

    // Crear líneas del asiento
    const journal_lines = lines.map((line: any, index: number) => ({
      journal_entry_id: entry.id,
      line_number: line.line_number || (index + 1),
      account_code: line.account_code,
      account_name: line.account_name,
      line_description: line.line_description || line.description || description,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      created_at: new Date().toISOString()
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journal_lines);

    if (linesError) {
      console.error('❌ Error creating lines:', linesError);
      // Revertir creación del asiento
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      return NextResponse.json(
        { success: false, error: 'Error creating journal lines' },
        { status: 500 }
      );
    }

    console.log('✅ Journal entry created:', entry.id);

    return NextResponse.json({
      success: true,
      data: { entry_id: entry.id, entry_number }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/accounting/journal:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const company_id = searchParams.get('company_id') || COMPANY_ID;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting journal entry:', id);

    const supabase = createSupabaseServerClient();

    // Eliminar líneas primero
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('journal_entry_id', id);

    if (linesError) {
      console.error('❌ Error deleting lines:', linesError);
      return NextResponse.json(
        { success: false, error: 'Error deleting journal lines' },
        { status: 500 }
      );
    }

    // Eliminar asiento
    const { error: entryError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id);

    if (entryError) {
      console.error('❌ Error deleting entry:', entryError);
      return NextResponse.json(
        { success: false, error: 'Error deleting journal entry' },
        { status: 500 }
      );
    }

    console.log('✅ Journal entry deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/accounting/journal:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}