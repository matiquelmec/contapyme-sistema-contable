import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const periodYear = searchParams.get('period_year');
    const periodMonth = searchParams.get('period_month');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Construir query con filtros - usar * para obtener todos los campos disponibles
    let query = supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name
        )
      `)
      .eq('company_id', companyId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros opcionales
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (periodYear) {
      query = query.eq('period_year', parseInt(periodYear));
    }

    if (periodMonth) {
      query = query.eq('period_month', parseInt(periodMonth));
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: liquidations, error, count } = await query;

    if (error) {
      console.error('Error fetching liquidations:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener liquidaciones' },
        { status: 500 }
      );
    }

    // Formatear datos para respuesta - incluir campos de descuentos individuales para cálculo dinámico
    const formattedLiquidations = liquidations?.map(liquidation => ({
      id: liquidation.id,
      employee_id: liquidation.employee_id,
      employee_name: `${liquidation.employees?.first_name || ''} ${liquidation.employees?.last_name || ''}`.trim(),
      employee_rut: liquidation.employees?.rut || '',
      period_year: liquidation.period_year,
      period_month: liquidation.period_month,
      days_worked: liquidation.days_worked || 30,
      base_salary: liquidation.base_salary || 0,
      legal_gratification_art50: liquidation.legal_gratification_art50 || 0,
      bonuses: liquidation.bonuses || 0,
      overtime_amount: liquidation.overtime_amount || 0,
      total_gross_income: liquidation.total_gross_income || 0,
      total_deductions: liquidation.total_deductions || 0,
      net_salary: liquidation.net_salary || 0,
      
      // ✅ Incluir campos individuales de descuentos para cálculo dinámico
      afp_amount: liquidation.afp_amount || 0,
      afp_commission_amount: liquidation.afp_commission_amount || 0,
      health_amount: liquidation.health_amount || 0,
      unemployment_amount: liquidation.unemployment_amount || 0,
      income_tax_amount: liquidation.income_tax_amount || 0,
      loan_deductions: liquidation.loan_deductions || 0,
      advance_payments: liquidation.advance_payments || 0,
      apv_amount: liquidation.apv_amount || 0,
      other_deductions: liquidation.other_deductions || 0,
      
      status: liquidation.status || 'draft',
      created_at: liquidation.created_at,
      updated_at: liquidation.updated_at || liquidation.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedLiquidations,
      count: formattedLiquidations.length,
      total: count,
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/liquidations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { employee_ids, period_year, period_month, batch_name } = body;

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'employee_ids debe ser un array no vacío' },
        { status: 400 }
      );
    }

    if (!period_year || !period_month) {
      return NextResponse.json(
        { success: false, error: 'period_year y period_month son requeridos' },
        { status: 400 }
      );
    }

    // 1. Crear lote de liquidaciones
    const { data: batch, error: batchError } = await supabase
      .from('payroll_liquidation_batches')
      .insert({
        company_id: companyId,
        batch_name: batch_name || `Lote ${period_month}/${period_year}`,
        period_year: period_year,
        period_month: period_month,
        total_employees: employee_ids.length,
        total_amount: 0, // Se actualizará después
        status: 'processing',
        created_by: companyId, // TODO: user ID real
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json(
        { success: false, error: 'Error al crear lote de liquidaciones' },
        { status: 500 }
      );
    }

    // 2. Obtener configuración previsional
    const { data: settingsData, error: settingsError } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return NextResponse.json(
        { success: false, error: 'Configuración previsional no encontrada' },
        { status: 404 }
      );
    }

    // 3. Procesar cada empleado
    const results = [];
    let totalBatchAmount = 0;
    let processedCount = 0;
    let errorCount = 0;

    for (const employeeId of employee_ids) {
      try {
        // Obtener datos del empleado
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select(`
            *,
            employment_contracts!inner (
              position,
              base_salary,
              contract_type,
              status
            ),
            payroll_config (
              afp_code,
              health_institution_code,
              family_allowances
            )
          `)
          .eq('id', employeeId)
          .eq('company_id', companyId)
          .eq('employment_contracts.status', 'active')
          .single();

        if (employeeError || !employee) {
          results.push({
            employee_id: employeeId,
            success: false,
            error: 'Empleado no encontrado o sin contrato activo'
          });
          errorCount++;
          continue;
        }

        // Calcular liquidación usando API interna
        const calculateResponse = await fetch(`${request.url}/calculate?company_id=${companyId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: employeeId,
            period_year: period_year,
            period_month: period_month,
            days_worked: 30,
            additional_income: {},
            additional_deductions: {},
            save_liquidation: true
          }),
        });

        const calculateData = await calculateResponse.json();

        if (calculateResponse.ok && calculateData.success) {
          // Actualizar liquidación con batch_id
          await supabase
            .from('payroll_liquidations')
            .update({ batch_id: batch.id })
            .eq('employee_id', employeeId)
            .eq('period_year', period_year)
            .eq('period_month', period_month);

          totalBatchAmount += calculateData.data.liquidation.net_salary;
          processedCount++;

          results.push({
            employee_id: employeeId,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            net_salary: calculateData.data.liquidation.net_salary,
            success: true,
            warnings: calculateData.data.warnings
          });
        } else {
          results.push({
            employee_id: employeeId,
            success: false,
            error: calculateData.error || 'Error en cálculo'
          });
          errorCount++;
        }

      } catch (err) {
        console.error(`Error processing employee ${employeeId}:`, err);
        results.push({
          employee_id: employeeId,
          success: false,
          error: 'Error interno al procesar empleado'
        });
        errorCount++;
      }
    }

    // 4. Actualizar lote con resultados
    const finalStatus = errorCount === 0 ? 'completed' : (processedCount > 0 ? 'completed' : 'error');
    
    await supabase
      .from('payroll_liquidation_batches')
      .update({
        total_amount: totalBatchAmount,
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: errorCount > 0 ? `${errorCount} empleados con errores` : null
      })
      .eq('id', batch.id);

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batch.id,
        batch_name: batch.batch_name,
        total_employees: employee_ids.length,
        processed_count: processedCount,
        error_count: errorCount,
        total_amount: totalBatchAmount,
        results: results
      },
      message: `Lote procesado: ${processedCount} éxitos, ${errorCount} errores`
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/liquidations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    console.log('✅ PUT liquidations - Company ID:', companyId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { liquidation_ids, status, approved_by } = body;

    console.log('✅ PUT liquidations - IDs to update:', liquidation_ids);
    console.log('✅ PUT liquidations - New status:', status);

    if (!liquidation_ids || !Array.isArray(liquidation_ids) || liquidation_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'liquidation_ids debe ser un array no vacío' },
        { status: 400 }
      );
    }

    if (!['approved', 'paid'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status debe ser approved o paid' },
        { status: 400 }
      );
    }

    // Validar que todos los IDs sean UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = liquidation_ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      console.error('Invalid UUIDs detected:', invalidIds);
      return NextResponse.json(
        { success: false, error: `IDs inválidos detectados: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Primero verificar que las liquidaciones existen y pertenecen a la empresa
    const { data: existingLiquidations, error: checkError } = await supabase
      .from('payroll_liquidations')
      .select('id, employee_id, status')
      .in('id', liquidation_ids)
      .eq('company_id', companyId);

    if (checkError) {
      console.error('Error checking existing liquidations:', checkError);
      return NextResponse.json(
        { success: false, error: 'Error verificando liquidaciones existentes' },
        { status: 500 }
      );
    }

    console.log('🔍 Found liquidations to update:', existingLiquidations?.length || 0);

    if (!existingLiquidations || existingLiquidations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron liquidaciones válidas para validar' },
        { status: 404 }
      );
    }

    // Actualizar estado de liquidaciones
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      // Note: approved_by removed due to foreign key constraint - no users table implemented yet
    } else if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('payroll_liquidations')
      .update(updateData)
      .in('id', existingLiquidations.map(liq => liq.id))
      .eq('company_id', companyId)
      .select();

    if (updateError) {
      console.error('Error updating liquidations:', updateError);
      return NextResponse.json(
        { success: false, error: `Error actualizando liquidaciones: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Successfully updated liquidations:', updated?.length || 0);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `${updated?.length || 0} liquidación(es) validada(s) exitosamente`
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/liquidations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    console.log('🗑️ DELETE liquidations - Company ID:', companyId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { liquidation_ids } = body;

    console.log('🗑️ DELETE liquidations - IDs to delete:', liquidation_ids);

    if (!liquidation_ids || !Array.isArray(liquidation_ids) || liquidation_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'liquidation_ids debe ser un array no vacío' },
        { status: 400 }
      );
    }

    // Validar que todos los IDs sean UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = liquidation_ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      console.error('Invalid UUIDs detected:', invalidIds);
      return NextResponse.json(
        { success: false, error: `IDs inválidos detectados: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Primero verificar que las liquidaciones existen y pertenecen a la empresa
    const { data: existingLiquidations, error: checkError } = await supabase
      .from('payroll_liquidations')
      .select('id, employee_id')
      .in('id', liquidation_ids)
      .eq('company_id', companyId);

    if (checkError) {
      console.error('Error checking existing liquidations:', checkError);
      return NextResponse.json(
        { success: false, error: 'Error verificando liquidaciones existentes' },
        { status: 500 }
      );
    }

    console.log('🔍 Found liquidations to delete:', existingLiquidations?.length || 0);

    if (!existingLiquidations || existingLiquidations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron liquidaciones válidas para eliminar' },
        { status: 404 }
      );
    }

    // Eliminar liquidaciones
    const { data: deleted, error: deleteError } = await supabase
      .from('payroll_liquidations')
      .delete()
      .in('id', existingLiquidations.map(liq => liq.id))
      .eq('company_id', companyId)
      .select();

    if (deleteError) {
      console.error('Error deleting liquidations:', deleteError);
      return NextResponse.json(
        { success: false, error: `Error eliminando liquidaciones: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Successfully deleted liquidations:', deleted?.length || 0);

    return NextResponse.json({
      success: true,
      data: deleted,
      message: `${deleted?.length || 0} liquidación(es) eliminada(s) exitosamente`
    });

  } catch (error) {
    console.error('Error in DELETE /api/payroll/liquidations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}