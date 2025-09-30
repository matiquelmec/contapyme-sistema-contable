import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Verificar liquidaciones disponibles por período
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const period = searchParams.get('period'); // YYYY-MM formato

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!period) {
      return NextResponse.json(
        { success: false, error: 'period es requerido (formato YYYY-MM)' },
        { status: 400 }
      );
    }

    const [year, month] = period.split('-');

    // Contar liquidaciones disponibles para el período
    const { count, error } = await supabase
      .from('payroll_liquidations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('period_year', parseInt(year))
      .eq('period_month', parseInt(month));

    if (error) {
      console.error('Error checking liquidations:', error);
      return NextResponse.json(
        { success: false, error: 'Error al verificar liquidaciones' },
        { status: 500 }
      );
    }

    // También obtener empleados activos para comparar
    const { count: activeEmployeesCount, error: employeesError } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (employeesError) {
      console.error('Error checking employees:', employeesError);
    }

    const liquidationsCount = count || 0;
    const totalEmployees = activeEmployeesCount || 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        liquidations_available: liquidationsCount,
        total_employees: totalEmployees,
        coverage_percentage: totalEmployees > 0 ? Math.round((liquidationsCount / totalEmployees) * 100) : 0,
        can_generate_book: liquidationsCount > 0,
        missing_liquidations: Math.max(0, totalEmployees - liquidationsCount)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/liquidations/available:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}