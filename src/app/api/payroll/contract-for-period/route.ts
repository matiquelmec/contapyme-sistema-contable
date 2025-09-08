import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';

// GET - Obtener contrato vigente para un empleado en un período específico
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!employeeId || !year || !month) {
      return NextResponse.json(
        { error: 'employee_id, year y month son requeridos' },
        { status: 400 }
      );
    }

    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    if (yearInt < 2020 || yearInt > 2030 || monthInt < 1 || monthInt > 12) {
      return NextResponse.json(
        { error: 'Año debe estar entre 2020-2030 y mes entre 1-12' },
        { status: 400 }
      );
    }

    console.log('🔍 API contract-for-period GET:', { employeeId, year: yearInt, month: monthInt });

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

    // ✅ LLAMAR A LA FUNCIÓN POSTGRESQL ESPECIALIZADA
    const { data: contractResult, error: contractError } = await supabase
      .rpc('get_contract_for_period', {
        p_employee_id: employeeId,
        p_year: yearInt,
        p_month: monthInt
      });

    if (contractError) {
      console.error('❌ Error obteniendo contrato para período:', contractError);
      return NextResponse.json(
        { error: 'Error obteniendo contrato para período' },
        { status: 500 }
      );
    }

    if (!contractResult || contractResult.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró contrato para el empleado y período especificado' },
        { status: 404 }
      );
    }

    const contract = contractResult[0];

    console.log('✅ Contrato para período obtenido:', {
      employeeId,
      period: `${monthInt}/${yearInt}`,
      baseSalary: contract.base_salary,
      weeklyHours: contract.weekly_hours,
      contractType: contract.contract_type,
      modificationsCount: contract.modifications_applied?.length || 0
    });

    // ✅ VERIFICAR REGLA DE CESANTÍA
    const { data: unemploymentResult, error: unemploymentError } = await supabase
      .rpc('should_pay_unemployment_insurance', {
        p_employee_id: employeeId,
        p_year: yearInt,
        p_month: monthInt
      });

    const shouldPayUnemployment = unemploymentResult && !unemploymentError;

    return NextResponse.json({
      success: true,
      data: {
        employee_id: employeeId,
        period: {
          year: yearInt,
          month: monthInt
        },
        contract: {
          base_salary: parseFloat(contract.base_salary || 0),
          weekly_hours: parseInt(contract.weekly_hours || 44),
          contract_type: contract.contract_type || 'indefinido',
          position: contract.position || '',
          department: contract.department || ''
        },
        unemployment_insurance: {
          should_pay: shouldPayUnemployment,
          employee_rate: shouldPayUnemployment ? 0.006 : 0, // 0.6%
          employer_rate: shouldPayUnemployment ? 0.024 : 0  // 2.4%
        },
        modifications_applied: contract.modifications_applied || [],
        calculation_notes: [
          shouldPayUnemployment 
            ? '✅ Cesantía aplicable (contrato indefinido)'
            : '⚠️ Sin cesantía (contrato plazo fijo)',
          contract.modifications_applied?.length > 0 
            ? `📋 ${contract.modifications_applied.length} modificaciones aplicadas`
            : '📋 Sin modificaciones contractuales'
        ]
      }
    });

  } catch (error) {
    console.error('Error en GET /api/payroll/contract-for-period:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Obtener múltiples contratos para diferentes períodos (bulk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_ids, periods } = body;

    if (!employee_ids || !periods || !Array.isArray(employee_ids) || !Array.isArray(periods)) {
      return NextResponse.json(
        { error: 'employee_ids (array) y periods (array) son requeridos' },
        { status: 400 }
      );
    }

    console.log('🔍 POST contract-for-period bulk:', { 
      employeeCount: employee_ids.length, 
      periodCount: periods.length 
    });

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

    const results = [];

    // Procesar cada combinación empleado-período
    for (const employeeId of employee_ids) {
      for (const period of periods) {
        const { year, month } = period;

        try {
          // Obtener contrato para este período
          const { data: contractResult } = await supabase
            .rpc('get_contract_for_period', {
              p_employee_id: employeeId,
              p_year: year,
              p_month: month
            });

          // Verificar cesantía
          const { data: unemploymentResult } = await supabase
            .rpc('should_pay_unemployment_insurance', {
              p_employee_id: employeeId,
              p_year: year,
              p_month: month
            });

          if (contractResult && contractResult.length > 0) {
            const contract = contractResult[0];
            const shouldPayUnemployment = unemploymentResult;

            results.push({
              employee_id: employeeId,
              period: { year, month },
              contract: {
                base_salary: parseFloat(contract.base_salary || 0),
                weekly_hours: parseInt(contract.weekly_hours || 44),
                contract_type: contract.contract_type || 'indefinido',
                position: contract.position || '',
                department: contract.department || ''
              },
              unemployment_insurance: {
                should_pay: shouldPayUnemployment,
                employee_rate: shouldPayUnemployment ? 0.006 : 0,
                employer_rate: shouldPayUnemployment ? 0.024 : 0
              },
              modifications_applied: contract.modifications_applied || []
            });
          }
        } catch (periodError) {
          console.error(`Error procesando ${employeeId} para ${month}/${year}:`, periodError);
          results.push({
            employee_id: employeeId,
            period: { year, month },
            error: 'Error obteniendo datos del período'
          });
        }
      }
    }

    console.log('✅ Contratos bulk obtenidos:', results.length);

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total_processed: employee_ids.length * periods.length,
        successful: results.filter(r => !r.error).length,
        errors: results.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('Error en POST /api/payroll/contract-for-period:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}