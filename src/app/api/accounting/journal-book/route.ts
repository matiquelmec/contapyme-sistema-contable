import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener libro diario con asientos multi-línea
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // YYYY-MM
    const start_date = searchParams.get('start_date'); // YYYY-MM-DD
    const end_date = searchParams.get('end_date'); // YYYY-MM-DD
    const reference_type = searchParams.get('reference_type'); // COMPRA, VENTA, REMUNERACION, ACTIVO_FIJO
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 API Journal Book - GET:', { 
      period, start_date, end_date, reference_type, limit, offset 
    });

    // Query base para obtener asientos con sus líneas de detalle
    let query = supabase
      .from('journal_book')
      .select(`
        jbid,
        entry_number,
        date,
        description,
        document_number,
        reference_type,
        reference_id,
        status,
        total_debit,
        total_credit,
        is_balanced,
        created_at,
        journal_book_details (
          id,
          line_number,
          account_code,
          account_name,
          debit_amount,
          credit_amount,
          description
        )
      `)
      .eq('status', 'active')
      .order('entry_number', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtro por período (YYYY-MM)
    if (period) {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    // Filtro por rango específico de fechas
    if (start_date && end_date) {
      query = query
        .gte('date', start_date)
        .lte('date', end_date);
    }

    // Filtro por tipo de referencia
    if (reference_type) {
      query = query.eq('reference_type', reference_type);
    }

    const { data: entries, error, count } = await query;

    if (error) {
      console.error('Error fetching journal entries:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener asientos del libro diario' },
        { status: 500 }
      );
    }

    // Obtener estadísticas del período
    let statsQuery = supabase
      .from('journal_book')
      .select('total_debit, total_credit, reference_type, date')
      .eq('status', 'active');

    if (period) {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      statsQuery = statsQuery
        .gte('date', startDate)
        .lte('date', endDate);
    }

    if (start_date && end_date) {
      statsQuery = statsQuery
        .gte('date', start_date)
        .lte('date', end_date);
    }

    const { data: statsData, error: statsError } = await statsQuery;

    if (statsError) {
      console.warn('Error fetching stats:', statsError);
    }

    // Calcular estadísticas
    const stats = statsData?.reduce(
      (acc, entry) => {
        acc.total_debit += entry.total_debit || 0;
        acc.total_credit += entry.total_credit || 0;
        acc.total_entries += 1;

        // Conteo por tipo de referencia
        const type = entry.reference_type || 'MANUAL';
        if (!acc.by_type[type]) {
          acc.by_type[type] = { count: 0, debit: 0, credit: 0 };
        }
        acc.by_type[type].count += 1;
        acc.by_type[type].debit += entry.total_debit || 0;
        acc.by_type[type].credit += entry.total_credit || 0;

        return acc;
      },
      { 
        total_debit: 0, 
        total_credit: 0, 
        total_entries: 0,
        by_type: {} as Record<string, { count: number; debit: number; credit: number }>
      }
    ) || { 
      total_debit: 0, 
      total_credit: 0, 
      total_entries: 0,
      by_type: {}
    };

    console.log(`✅ Libro diario: ${entries?.length || 0} asientos`);

    return NextResponse.json({
      success: true,
      data: {
        entries: entries || [],
        stats,
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: (count || 0) > offset + limit
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/journal-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear asiento manual multi-línea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Journal Book - POST:', body);

    const {
      date,
      description,
      document_number = null,
      reference_type = 'MANUAL',
      reference_id = null,
      entry_lines // Array de líneas: [{account_code, account_name, debit_amount, credit_amount, description}]
    } = body;

    // Validaciones
    if (!date || !description || !entry_lines || !Array.isArray(entry_lines)) {
      return NextResponse.json(
        { success: false, error: 'date, description y entry_lines son requeridos' },
        { status: 400 }
      );
    }

    if (entry_lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Un asiento debe tener al menos 2 líneas' },
        { status: 400 }
      );
    }

    // Validar que cada línea tenga los datos necesarios
    for (let i = 0; i < entry_lines.length; i++) {
      const line = entry_lines[i];
      if (!line.account_code || !line.account_name) {
        return NextResponse.json(
          { success: false, error: `Línea ${i + 1}: account_code y account_name son requeridos` },
          { status: 400 }
        );
      }

      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;

      // Cada línea debe tener SOLO débito O SOLO crédito
      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        return NextResponse.json(
          { success: false, error: `Línea ${i + 1}: debe tener SOLO débito O SOLO crédito` },
          { status: 400 }
        );
      }
    }

    // Calcular totales
    const totalDebit = entry_lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredit = entry_lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);

    // Validar que esté balanceado
    if (Math.abs(totalDebit - totalCredit) > 0.01) { // Tolerancia para decimales
      return NextResponse.json(
        { success: false, error: `Asiento desbalanceado: Débito=${totalDebit}, Crédito=${totalCredit}` },
        { status: 400 }
      );
    }

    // Generar IDs únicos
    const timestamp = Date.now();
    const jbid = `JB${timestamp}`;
    const entryNumber = Date.now(); // Usar timestamp como número de asiento

    // Crear el asiento principal
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_book')
      .insert({
        jbid: jbid,
        entry_number: entryNumber,
        date: date,
        description: description,
        document_number: document_number,
        reference_type: reference_type,
        reference_id: reference_id,
        status: 'active',
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      })
      .select('jbid')
      .single();

    if (entryError) {
      console.error('Error creating journal entry:', entryError);
      return NextResponse.json(
        { success: false, error: 'Error al crear el asiento contable' },
        { status: 500 }
      );
    }

    // Crear las líneas de detalle
    const detailLines = entry_lines.map((line, index) => ({
      jbid: jbid,
      line_number: index + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      debit_amount: parseFloat(line.debit_amount) || 0,
      credit_amount: parseFloat(line.credit_amount) || 0,
      description: line.description || null
    }));

    const { error: detailError } = await supabase
      .from('journal_book_details')
      .insert(detailLines);

    if (detailError) {
      console.error('Error creating journal entry details:', detailError);
      
      // Revertir el asiento principal si falla la inserción de detalles
      await supabase
        .from('journal_book')
        .delete()
        .eq('jbid', jbid);

      return NextResponse.json(
        { success: false, error: 'Error al crear las líneas del asiento' },
        { status: 500 }
      );
    }

    console.log(`✅ Asiento creado: ${jbid} con ${entry_lines.length} líneas`);

    return NextResponse.json({
      success: true,
      data: {
        jbid: jbid,
        entry_number: entryNumber,
        entry_lines_count: entry_lines.length,
        total_debit: totalDebit,
        total_credit: totalCredit
      },
      message: `Asiento ${jbid} creado exitosamente con ${entry_lines.length} líneas`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/journal-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar asiento existente (solo manuales)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Journal Book - PUT:', body);

    const { jbid, date, description, document_number, entry_lines } = body;

    if (!jbid) {
      return NextResponse.json(
        { success: false, error: 'jbid es requerido' },
        { status: 400 }
      );
    }

    // Solo permitir editar asientos manuales
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_book')
      .select('reference_type, status')
      .eq('jbid', jbid)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Asiento no encontrado' },
        { status: 404 }
      );
    }

    if (existingEntry.reference_type !== 'MANUAL') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden editar asientos manuales' },
        { status: 400 }
      );
    }

    if (existingEntry.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'No se puede editar un asiento inactivo' },
        { status: 400 }
      );
    }

    // Si se envían nuevas líneas, validar balance
    if (entry_lines && Array.isArray(entry_lines)) {
      const totalDebit = entry_lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
      const totalCredit = entry_lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          { success: false, error: 'Las nuevas líneas no están balanceadas' },
          { status: 400 }
        );
      }

      // Eliminar líneas existentes
      await supabase
        .from('journal_book_details')
        .delete()
        .eq('jbid', jbid);

      // Crear nuevas líneas
      for (let i = 0; i < entry_lines.length; i++) {
        const line = entry_lines[i];
        await supabase
          .from('journal_book_details')
          .insert({
            jbid,
            line_number: i + 1,
            account_code: line.account_code,
            account_name: line.account_name,
            debit_amount: parseFloat(line.debit_amount) || 0,
            credit_amount: parseFloat(line.credit_amount) || 0,
            description: line.description || null
          });
      }

      // Los triggers automáticamente actualizarán los totales
    }

    // Actualizar encabezado si se proporcionan datos
    const updateData: any = {};
    if (date) updateData.date = date;
    if (description) updateData.description = description;
    if (document_number !== undefined) updateData.document_number = document_number;

    if (Object.keys(updateData).length > 0) {
      const { data: updatedEntry, error } = await supabase
        .from('journal_book')
        .update(updateData)
        .eq('jbid', jbid)
        .select()
        .single();

      if (error) {
        console.error('Error updating journal entry:', error);
        return NextResponse.json(
          { success: false, error: 'Error al actualizar asiento' },
          { status: 500 }
        );
      }
    }

    console.log(`✅ Asiento actualizado: ${jbid}`);

    return NextResponse.json({
      success: true,
      message: 'Asiento actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/accounting/journal-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Marcar asiento como revertido (solo manuales)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jbid = searchParams.get('jbid');

    if (!jbid) {
      return NextResponse.json(
        { success: false, error: 'jbid es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 API Journal Book - DELETE:', jbid);

    // Solo permitir eliminar asientos manuales
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_book')
      .select('reference_type, status')
      .eq('jbid', jbid)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Asiento no encontrado' },
        { status: 404 }
      );
    }

    if (existingEntry.reference_type !== 'MANUAL') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden eliminar asientos manuales' },
        { status: 400 }
      );
    }

    // Marcar como revertido en lugar de eliminar (auditoría)
    const { data: revertedEntry, error } = await supabase
      .from('journal_book')
      .update({ status: 'reversed' })
      .eq('jbid', jbid)
      .select()
      .single();

    if (error) {
      console.error('Error reversing journal entry:', error);
      return NextResponse.json(
        { success: false, error: 'Error al revertir asiento' },
        { status: 500 }
      );
    }

    console.log(`✅ Asiento revertido: ${jbid}`);

    return NextResponse.json({
      success: true,
      data: revertedEntry,
      message: 'Asiento revertido exitosamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/accounting/journal-book:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}