import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/database/databaseSimple';

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const include_lines = searchParams.get('include_lines') === 'true';
    const { id } = params;

    console.log('📊 Loading journal entry:', id, 'include_lines:', include_lines);

    const supabase = createSupabaseServerClient();

    // Cargar asiento principal
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (entryError || !entry) {
      console.error('❌ Entry not found:', entryError);
      return NextResponse.json(
        { success: false, error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    let response_data: any = entry;

    // Cargar líneas si se solicita
    if (include_lines) {
      // Intentar cargar líneas con JOIN al plan de cuentas para sincronización
      let { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          chart_of_accounts (
            code,
            name
          )
        `)
        .eq('journal_entry_id', id)
        .order('line_number', { ascending: true });

      // Si el JOIN falla, intentar consulta básica sin JOIN
      if (linesError) {
        console.warn('⚠️ JOIN with chart_of_accounts failed, trying basic query:', linesError.message);
        
        const { data: basicLines, error: basicError } = await supabase
          .from('journal_entry_lines')
          .select('*')
          .eq('journal_entry_id', id)
          .order('line_number', { ascending: true });

        if (basicError) {
          console.error('❌ Error loading lines (basic query):', basicError);
          return NextResponse.json(
            { success: false, error: 'Error loading journal lines' },
            { status: 500 }
          );
        }

        lines = basicLines;
        console.log('✅ Basic query successful:', lines?.length || 0, 'lines');
      } else {
        console.log('✅ JOIN query successful:', lines?.length || 0, 'lines');
      }
      
      // Sincronizar nombres de cuenta con el plan de cuentas si el JOIN funcionó
      const processedLines = lines?.map((line: any) => ({
        ...line,
        // Usar nombre actualizado del plan de cuentas si está disponible
        account_name: line.chart_of_accounts?.name || line.account_name || 'Cuenta no encontrada'
      })) || [];
      
      response_data = { ...entry, lines: processedLines };
    }

    return NextResponse.json({
      success: true,
      data: response_data
    });

  } catch (error) {
    console.error('❌ Error in GET /api/accounting/journal/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      company_id = COMPANY_ID,
      description,
      entry_date,
      lines = []
    } = body;

    console.log('💾 Updating journal entry:', id, 'with', lines.length, 'lines');

    const supabase = createSupabaseServerClient();

    // Validar líneas
    if (!lines || lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Se requieren al menos 2 líneas' },
        { status: 400 }
      );
    }

    // Calcular nuevos totales
    const total_debit = lines.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);
    const total_credit = lines.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0);

    if (Math.abs(total_debit - total_credit) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'El asiento debe estar balanceado' },
        { status: 400 }
      );
    }

    // Actualizar asiento principal
    const updateData: any = {
      description,
      total_debit,
      total_credit,
      updated_at: new Date().toISOString()
    };
    
    // Solo actualizar entry_date si se proporciona
    if (entry_date) {
      updateData.entry_date = entry_date;
    }

    const { error: entryError } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id);

    if (entryError) {
      console.error('❌ Error updating entry:', entryError);
      return NextResponse.json(
        { success: false, error: 'Error updating journal entry' },
        { status: 500 }
      );
    }

    // Eliminar líneas existentes
    const { error: deleteError } = await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('journal_entry_id', id);

    if (deleteError) {
      console.error('❌ Error deleting old lines:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Error updating journal lines' },
        { status: 500 }
      );
    }

    // Crear nuevas líneas
    const journal_lines = lines.map((line: any, index: number) => ({
      journal_entry_id: id,
      line_number: index + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      line_description: line.description || description,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('journal_entry_lines')
      .insert(journal_lines);

    if (insertError) {
      console.error('❌ Error inserting new lines:', insertError);
      return NextResponse.json(
        { success: false, error: 'Error updating journal lines' },
        { status: 500 }
      );
    }

    console.log('✅ Journal entry updated:', id);

    return NextResponse.json({
      success: true,
      message: 'Journal entry updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/accounting/journal/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id') || COMPANY_ID;

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
    console.error('❌ Error in DELETE /api/accounting/journal/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}