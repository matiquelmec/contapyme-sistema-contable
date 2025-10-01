import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';


export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    console.log('🔍 LIQUIDATION SAVE - Company ID:', companyId);

    // ✅ Verificar configuración Supabase
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase no configurado correctamente en liquidation save');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Base de datos no configurada. Verifica SUPABASE_SERVICE_ROLE_KEY en variables de entorno.',
          code: 'SUPABASE_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos', code: 'DB_CONNECTION_ERROR' },
        { status: 503 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const liquidationData = await request.json();
    console.log('🔍 LIQUIDATION SAVE - Data received:', JSON.stringify(liquidationData, null, 2));
    console.log('🔍 LIQUIDATION SAVE - Data received:', JSON.stringify(liquidationData, null, 2));

    // ✅ BYPASS RLS - Service role key permite bypass automático de RLS
    // No necesitamos configurar el contexto con service role

    // ✅ VERIFICAR TABLA EXISTS PRIMERO
    const { data: tableCheck, error: tableError } = await supabase
      .from('payroll_liquidations')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Tabla payroll_liquidations no existe:', tableError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tabla payroll_liquidations no existe en la base de datos',
          details: tableError.message 
        },
        { status: 500 }
      );
    }

    // Validar que el empleado exista
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, rut')
      .eq('id', liquidationData.employee_id)
      .eq('company_id', companyId)
      .single();

    if (employeeError || !employee) {
      console.error('❌ Empleado no encontrado:', employeeError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Empleado no encontrado',
          details: employeeError?.message || 'Employee not found'
        },
        { status: 404 }
      );
    }

    console.log('✅ Empleado encontrado:', employee.first_name, employee.last_name);

    // Verificar si ya existe una liquidación para este período (RUT, mes, año)
    const { data: existing, error: existingError } = await supabase
      .from('payroll_liquidations')
      .select('id, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('employee_id', liquidationData.employee_id)
      .eq('period_year', liquidationData.period_year)
      .eq('period_month', liquidationData.period_month)
      .maybeSingle(); // Usa maybeSingle para evitar errores si no encuentra nada

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing liquidation:', existingError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error verificando liquidación existente',
          details: existingError.message 
        },
        { status: 500 }
      );
    }

    let savedLiquidation;

    if (existing) {
      console.log('🔄 Liquidación existente encontrada, actualizando...', {
        existingId: existing.id,
        employeeId: liquidationData.employee_id,
        period: `${liquidationData.period_year}-${liquidationData.period_month}`
      });
      
      console.log('🔍 API SAVE - Data to be updated:', JSON.stringify({ ...liquidationData, updated_at: new Date().toISOString() }, null, 2));

      // Actualizar liquidación existente
      const { data: updated, error: updateError } = await supabase
        .from('payroll_liquidations')
        .update({
          ...liquidationData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating liquidation:', updateError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error al actualizar liquidación',
            details: updateError.message,
            code: updateError.code 
          },
          { status: 500 }
        );
      }

      savedLiquidation = updated;
    } else {
      console.log('🆕 Creando nueva liquidación...', {
        employeeId: liquidationData.employee_id,
        period: `${liquidationData.period_year}-${liquidationData.period_month}`
      });
      
      // Crear nueva liquidación
      const { data: created, error: createError } = await supabase
        .from('payroll_liquidations')
        .insert({
          company_id: companyId,
          ...liquidationData,
          status: liquidationData.status || 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generated_by: null // ✅ CORREGIDO: NULL en lugar de company_id que no existe en users
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating liquidation:', createError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error al crear liquidación',
            details: createError.message,
            code: createError.code
          },
          { status: 500 }
        );
      }

      savedLiquidation = created;
    }

    // ✅ ACTUALIZAR AUTOMÁTICAMENTE EL LIBRO DE REMUNERACIONES
    try {
      await updatePayrollBook(companyId, liquidationData.period_year, liquidationData.period_month);
      console.log('✅ Libro de remuneraciones actualizado automáticamente');
    } catch (bookError) {
      console.error('⚠️ Error actualizando libro de remuneraciones:', bookError);
      // No fallar la liquidación por esto - es proceso secundario
    }

    return NextResponse.json({
      success: true,
      data: savedLiquidation,
      message: existing 
        ? 'Liquidación actualizada exitosamente'
        : 'Liquidación guardada exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/liquidations/save:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ FUNCIÓN PARA ACTUALIZAR EL LIBRO DE REMUNERACIONES AUTOMÁTICAMENTE
async function updatePayrollBook(companyId: string, year: number, month: number) {
  try {
    console.log(`🔍 Actualizando libro de remuneraciones para ${companyId} - ${year}/${month}`);
    
    const supabase = getDatabaseConnection();
    if (!supabase) {
      throw new Error('No se pudo obtener conexión a la base de datos');
    }
    
    const period = `${year}-${String(month).padStart(2, '0')}`;
    
    // ✅ OBTENER TODAS LAS LIQUIDACIONES DEL PERÍODO
    const { data: liquidations, error: liquidationsError } = await supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name,
          middle_name,
          employment_contracts!inner (
            position,
            department,
            weekly_hours,
            status
          )
        )
      `)
      .eq('company_id', companyId)
      .eq('period_year', year)
      .eq('period_month', month)
      .eq('employees.employment_contracts.status', 'active');

    if (liquidationsError || !liquidations || liquidations.length === 0) {
      console.log('⚠️ No hay liquidaciones para actualizar el libro');
      return;
    }

    // ✅ OBTENER INFORMACIÓN DE LA EMPRESA
    const { data: company } = await supabase
      .from('companies')
      .select('name, rut')
      .eq('id', companyId)
      .single();

    // ✅ VERIFICAR SI YA EXISTE UN LIBRO PARA ESTE PERÍODO
    const { data: existingBook } = await supabase
      .from('payroll_books')
      .select('id')
      .eq('company_id', companyId)
      .eq('period', period)
      .single();

    // ✅ CALCULAR TOTALES REALES
    const totalEmployees = liquidations.length;
    const totalHaberes = liquidations.reduce((sum, liq) => sum + (liq.total_gross_income || 0), 0);
    const totalDescuentos = liquidations.reduce((sum, liq) => sum + (liq.total_deductions || 0), 0);
    const totalLiquido = liquidations.reduce((sum, liq) => sum + (liq.net_salary || 0), 0);

    let bookId;

    if (existingBook) {
      // ✅ ACTUALIZAR LIBRO EXISTENTE
      const { error: updateError } = await supabase
        .from('payroll_books')
        .update({
          total_employees: totalEmployees,
          total_haberes: totalHaberes,
          total_descuentos: totalDescuentos,
          total_liquido: totalLiquido,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBook.id);

      if (updateError) {
        console.error('❌ Error actualizando libro existente:', updateError);
        throw updateError;
      }

      bookId = existingBook.id;
      
      // ✅ ELIMINAR DETALLES EXISTENTES PARA RE-CREAR
      await supabase
        .from('payroll_book_details')
        .delete()
        .eq('payroll_book_id', bookId);

    } else {
      // ✅ CREAR NUEVO LIBRO
      const { data: lastBook } = await supabase
        .from('payroll_books')
        .select('book_number')
        .eq('company_id', companyId)
        .order('book_number', { ascending: false })
        .limit(1);

      const bookNumber = (lastBook && lastBook[0]?.book_number || 0) + 1;

      const { data: newBook, error: bookError } = await supabase
        .from('payroll_books')
        .insert({
          company_id: companyId,
          period,
          book_number: bookNumber,
          company_name: company?.name || 'Empresa Demo',
          company_rut: company?.rut || '12.345.678-9',
          generated_by: companyId,
          status: 'draft',
          total_employees: totalEmployees,
          total_haberes: totalHaberes,
          total_descuentos: totalDescuentos,
          total_liquido: totalLiquido
        })
        .select('id')
        .single();

      if (bookError) {
        console.error('❌ Error creando nuevo libro:', bookError);
        throw bookError;
      }

      bookId = newBook.id;
    }

    // ✅ CREAR DETALLES ACTUALIZADOS
    const bookDetails = liquidations.map(liquidation => {
      const employee = liquidation.employees;
      const contract = employee?.employment_contracts?.[0];
      
      return {
        payroll_book_id: bookId,
        employee_id: liquidation.employee_id,
        employee_rut: employee?.rut || 'N/A',
        apellido_paterno: employee?.last_name || '',
        apellido_materno: employee?.middle_name || '',
        nombres: employee?.first_name || '',
        cargo: contract?.position || '',
        area: contract?.department || '',
        centro_costo: 'GENERAL',
        dias_trabajados: liquidation.days_worked || 30,
        horas_semanales: contract?.weekly_hours || 45,
        horas_no_trabajadas: 0,
        base_imp_prevision: liquidation.total_gross_income || 0,
        base_imp_cesantia: liquidation.total_gross_income || 0,
        sueldo_base: liquidation.base_salary || 0,
        colacion: liquidation.food_allowance || 0,
        movilizacion: liquidation.transport_allowance || 0,
        asignacion_familiar: liquidation.family_allowance || 0,
        total_haberes: liquidation.total_gross_income || 0,
        prevision_afp: liquidation.afp_amount || 0,
        salud: liquidation.health_amount || 0,
        cesantia: liquidation.unemployment_amount || 0,
        impuesto_unico: liquidation.income_tax_amount || 0,
        total_descuentos: liquidation.total_deductions || 0,
        sueldo_liquido: liquidation.net_salary || 0
      };
    });

    const { error: detailsError } = await supabase
      .from('payroll_book_details')
      .insert(bookDetails);

    if (detailsError) {
      console.error('❌ Error creando detalles del libro:', detailsError);
      throw detailsError;
    }

    console.log(`✅ Libro de remuneraciones actualizado exitosamente: ${totalEmployees} empleados`);
    
  } catch (error) {
    console.error('❌ Error en updatePayrollBook:', error);
    throw error;
  }
}

// Obtener liquidación guardada
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    let query = supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name,
          email
        )
      `)
      .eq('company_id', companyId);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (year) {
      query = query.eq('period_year', parseInt(year));
    }

    if (month) {
      query = query.eq('period_month', parseInt(month));
    }

    const { data: liquidations, error } = await query
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (error) {
      console.error('Error fetching liquidations:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener liquidaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: liquidations || []
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/liquidations/save:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}