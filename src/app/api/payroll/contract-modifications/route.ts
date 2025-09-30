import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';

// GET - Obtener modificaciones contractuales
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const modificationType = searchParams.get('modification_type');

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 API contract-modifications GET:', { companyId, employeeId, modificationType });

    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase no configurado correctamente');
      return NextResponse.json(
        { error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    // Construir consulta
    let query = supabase
      .from('contract_modifications')
      .select(`
        id, modification_type, effective_date, created_date,
        old_values, new_values, reason, document_reference,
        created_at, updated_at,
        employee:employees(id, rut, first_name, last_name, position)
      `)
      .eq('company_id', companyId)
      .order('effective_date', { ascending: false });

    // Filtros opcionales
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (modificationType) {
      query = query.eq('modification_type', modificationType);
    }

    const { data: modifications, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo modificaciones contractuales:', error);
      return NextResponse.json(
        { error: 'Error obteniendo modificaciones contractuales' },
        { status: 500 }
      );
    }

    console.log('✅ Modificaciones contractuales obtenidas:', modifications?.length || 0);

    return NextResponse.json({
      success: true,
      data: modifications || [],
      count: modifications?.length || 0
    });

  } catch (error) {
    console.error('Error en GET /api/payroll/contract-modifications:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva modificación contractual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 POST contract-modifications - datos recibidos:', JSON.stringify(body, null, 2));

    // Validaciones básicas
    const {
      company_id,
      employee_id,
      modification_type,
      effective_date,
      old_values,
      new_values,
      reason,
      document_reference,
      created_by
    } = body;

    if (!company_id || !employee_id || !modification_type || !effective_date || !old_values || !new_values) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: company_id, employee_id, modification_type, effective_date, old_values, new_values' },
        { status: 400 }
      );
    }

    // Validar tipo de modificación
    const validTypes = ['salary_change', 'hours_change', 'contract_type_change', 'position_change', 'department_change', 'benefits_change', 'other'];
    if (!validTypes.includes(modification_type)) {
      return NextResponse.json(
        { error: `Tipo de modificación inválido. Debe ser uno de: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    // Crear modificación contractual
    const { data: modification, error: modificationError } = await supabase
      .from('contract_modifications')
      .insert({
        company_id,
        employee_id,
        modification_type,
        effective_date,
        old_values,
        new_values,
        reason,
        document_reference,
        created_by,
        created_date: new Date().toISOString().split('T')[0] // Solo fecha
      })
      .select(`
        id, modification_type, effective_date, created_date,
        old_values, new_values, reason, document_reference,
        created_at, updated_at
      `)
      .single();

    if (modificationError) {
      console.error('❌ Error creando modificación contractual:', modificationError);
      return NextResponse.json(
        { error: 'Error creando modificación contractual en base de datos' },
        { status: 500 }
      );
    }

    console.log('✅ Modificación contractual creada:', modification.id);

    // 🚀 FUTURO: Aquí se podría agregar lógica para:
    // - Actualizar automáticamente employment_contracts si la fecha efectiva es hoy o anterior
    // - Enviar notificaciones automáticas
    // - Generar anexos de contrato automáticamente
    // - Recalcular liquidaciones afectadas

    return NextResponse.json({
      success: true,
      data: modification,
      message: 'Modificación contractual creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/payroll/contract-modifications:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar modificación contractual
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la modificación es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 PUT contract-modifications - actualizando:', id);

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    const { data: updatedModification, error: updateError } = await supabase
      .from('contract_modifications')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error actualizando modificación contractual:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando modificación contractual' },
        { status: 500 }
      );
    }

    if (!updatedModification) {
      return NextResponse.json(
        { error: 'Modificación contractual no encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Modificación contractual actualizada:', updatedModification.id);

    return NextResponse.json({
      success: true,
      data: updatedModification,
      message: 'Modificación contractual actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /api/payroll/contract-modifications:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}