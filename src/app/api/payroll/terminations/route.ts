import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';
import { SettlementCalculator, type EmployeeTerminationData } from '@/lib/services/settlementCalculator';

// GET - Obtener finiquitos de una empresa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    // First, try simple query without joins to avoid FK issues
    let query = supabase
      .from('employee_terminations')
      .select('*')
      .eq('company_id', companyId);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: terminations, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching terminations:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al obtener finiquitos',
          details: error.message,
          hint: error.hint 
        },
        { status: 500 }
      );
    }

    // Enrich terminations with employee data separately
    const enrichedTerminations = [];
    
    for (const termination of terminations || []) {
      // Get employee data
      const { data: employee } = await supabase
        .from('employees')
        .select('id, rut, first_name, last_name')
        .eq('id', termination.employee_id)
        .single();

      // Get contract data  
      const { data: contracts } = await supabase
        .from('employment_contracts')
        .select('position, base_salary, contract_type')
        .eq('employee_id', termination.employee_id)
        .eq('status', 'active')
        .limit(1);

      // Add employee data to termination
      enrichedTerminations.push({
        ...termination,
        employees: {
          ...employee,
          employment_contracts: contracts || []
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: enrichedTerminations
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/terminations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear y calcular finiquito
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { employee_id, termination_date, termination_cause_code, last_work_date, ...additionalData } = body;

    // 1. Obtener datos del empleado (sin JOIN para evitar errores)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .eq('company_id', companyId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // 2. Obtener contrato del empleado por separado
    const { data: contracts } = await supabase
      .from('employment_contracts')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const contract = contracts?.[0];
    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contrato activo no encontrado para el empleado' },
        { status: 404 }
      );
    }

    // 3. Preparar datos para el calculador de finiquitos
    const terminationData: EmployeeTerminationData = {
      employee_id: employee.id,
      employee_rut: employee.rut,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      position: contract.position,
      
      contract_start_date: new Date(contract.start_date + 'T12:00:00'),
      contract_type: contract.contract_type as 'indefinido' | 'plazo_fijo' | 'obra_faena',
      monthly_salary: contract.base_salary,
      weekly_hours: contract.weekly_hours || 45,
      
      termination_date: new Date(termination_date + 'T12:00:00'),
      termination_cause_code: termination_cause_code,
      last_work_date: new Date((last_work_date || termination_date) + 'T12:00:00'),
      
      // Datos adicionales del formulario
      vacation_days_taken: additionalData.vacation_days_taken || 0,
      pending_overtime_amount: additionalData.pending_overtime_amount || 0,
      christmas_bonus_pending: additionalData.christmas_bonus_pending || false,
      other_bonuses: additionalData.other_bonuses || 0
    };

    console.log('📋 Datos para calculador de finiquito:', {
      employee_name: terminationData.employee_name,
      contract_start_date: terminationData.contract_start_date,
      termination_date: terminationData.termination_date,
      monthly_salary: terminationData.monthly_salary,
      termination_cause_code: terminationData.termination_cause_code
    });

    // 4. Usar el calculador real de finiquitos
    const calculator = new SettlementCalculator();
    const calculation = calculator.calculateSettlement(terminationData);

    // 5. Guardar en base de datos con cálculos reales
    const { data: savedTermination, error: saveError } = await supabase
      .from('employee_terminations')
      .insert({
        company_id: companyId,
        employee_id: employee_id,
        termination_date: termination_date,
        termination_cause_code: termination_cause_code,
        termination_cause_description: calculation.termination_cause.article_name,
        notice_given: calculation.termination_cause.requires_notice,
        notice_days: calculation.termination_cause.notice_days || 0,
        
        // Resultados del calculador real
        worked_days_last_month: calculation.days_worked_last_month,
        pending_salary_days: calculation.pending_salary_days,
        pending_salary_amount: calculation.pending_salary_amount,
        
        total_vacation_days_earned: calculation.total_vacation_days_earned,
        vacation_days_taken: calculation.vacation_days_taken,
        pending_vacation_days: calculation.pending_vacation_days,
        vacation_daily_rate: calculation.vacation_daily_rate,
        pending_vacation_amount: calculation.pending_vacation_amount,
        
        proportional_vacation_days: calculation.proportional_vacation_days,
        proportional_vacation_amount: calculation.proportional_vacation_amount,
        
        severance_years_service: calculation.years_of_service,
        severance_monthly_salary: calculation.employee.monthly_salary,
        severance_amount: calculation.severance_amount,
        notice_indemnification_amount: calculation.notice_indemnification_amount,
        
        christmas_bonus_amount: calculation.christmas_bonus_amount,
        pending_overtime_amount: calculation.pending_overtime_amount,
        other_bonuses_amount: calculation.other_bonuses_amount,
        
        total_to_pay: calculation.total_compensations,
        total_deductions: calculation.total_deductions,
        final_net_amount: calculation.final_net_amount,
        
        status: 'calculated',
        termination_reason_details: additionalData.termination_reason_details || null
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving termination:', saveError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al guardar finiquito',
          details: saveError.message,
          hint: saveError.hint,
          code: saveError.code
        },
        { status: 500 }
      );
    }

    console.log('✅ Finiquito calculado exitosamente:', {
      employee_name: terminationData.employee_name,
      total_compensations: calculation.total_compensations,
      final_net_amount: calculation.final_net_amount
    });

    return NextResponse.json({
      success: true,
      data: {
        termination: savedTermination,
        calculation: calculation
      }
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/terminations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado del finiquito
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

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

    const body = await request.json();
    const { termination_id, status, employee_signature_date, company_signature_date, witness_name, witness_rut } = body;

    const { data: updatedTermination, error: updateError } = await supabase
      .from('employee_terminations')
      .update({
        status,
        employee_signature_date,
        company_signature_date,
        witness_name,
        witness_rut,
        updated_at: new Date().toISOString()
      })
      .eq('id', termination_id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating termination:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar finiquito' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTermination
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/terminations:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}