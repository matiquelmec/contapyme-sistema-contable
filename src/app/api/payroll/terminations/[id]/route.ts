import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('🗑️ DELETE termination - ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de finiquito requerido' },
        { status: 400 }
      );
    }

    // Verificar que el finiquito existe antes de eliminarlo (sin JOIN para evitar errores de relación)
    const { data: existingTermination, error: fetchError } = await supabase
      .from('employee_terminations')
      .select('id, status, employee_id')
      .eq('id', id)
      .single();

    console.log('🔍 Termination lookup result:', { 
      existingTermination, 
      fetchError: fetchError?.message,
      fetchErrorCode: fetchError?.code 
    });

    if (fetchError || !existingTermination) {
      console.log('❌ Termination not found - ID:', id, 'Error:', fetchError?.message);
      return NextResponse.json(
        { 
          success: false, 
          error: `Finiquito no encontrado (ID: ${id})`,
          debug: {
            id,
            fetchError: fetchError?.message,
            fetchErrorCode: fetchError?.code
          }
        },
        { status: 404 }
      );
    }

    // Solo permitir eliminar finiquitos que no están pagados
    if (existingTermination.status === 'paid') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se puede eliminar un finiquito que ya ha sido pagado' 
        },
        { status: 400 }
      );
    }

    // Obtener el nombre del empleado antes de eliminar
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', existingTermination.employee_id)
      .single();

    const employeeName = employeeData 
      ? `${employeeData.first_name} ${employeeData.last_name}`
      : 'Empleado desconocido';

    // Eliminar el finiquito
    const { error: deleteError } = await supabase
      .from('employee_terminations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar finiquito:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar el finiquito' },
        { status: 500 }
      );
    }

    console.log('✅ Termination deleted successfully:', id, 'Employee:', employeeName);

    return NextResponse.json({
      success: true,
      message: `Finiquito eliminado exitosamente`,
      data: {
        id,
        employee_name: employeeName
      }
    });

  } catch (error) {
    console.error('Error en DELETE termination:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de finiquito requerido' },
        { status: 400 }
      );
    }

    // Obtener el finiquito específico (sin JOINs para evitar problemas de relación)
    const { data: termination, error: fetchError } = await supabase
      .from('employee_terminations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !termination) {
      return NextResponse.json(
        { success: false, error: 'Finiquito no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: termination
    });

  } catch (error) {
    console.error('Error en GET termination:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}