import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CalculationInput {
  employee_id: string;
  period: string; // YYYY-MM
  base_salary: number;
  worked_days?: number;
  overtime_hours?: number;
  bonuses?: number;
  allowances?: number;
  additional_deductions?: number;
}

interface PayrollResult {
  // Haberes
  base_salary: number;
  gratification: number;
  overtime_payment: number;
  bonuses: number;
  allowances: number;
  family_allowance: number;
  gross_income: number;
  
  // Descuentos previsionales
  afp_employee: number;
  afp_commission: number;
  health_employee: number;
  afc_employee: number;
  
  // Impuesto único
  taxable_income: number;
  unique_tax: number;
  unique_tax_factor: number;
  unique_tax_deduction: number;
  
  // Préstamo solidario (si aplica)
  solidarity_loan: number;
  
  // Otros descuentos
  additional_deductions: number;
  total_deductions: number;
  
  // Líquido
  net_income: number;
  
  // Para empleador (informativo)
  afp_employer?: number;
  afc_employer?: number;
  mutual_insurance?: number;
}

// POST - Calcular liquidación de sueldo
export async function POST(request: NextRequest) {
  try {
    const body: CalculationInput = await request.json();
    const {
      employee_id,
      period,
      base_salary,
      worked_days = 30,
      overtime_hours = 0,
      bonuses = 0,
      allowances = 0,
      additional_deductions = 0
    } = body;

    // Validaciones
    if (!employee_id || !period || !base_salary) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: employee_id, period, base_salary' },
        { status: 400 }
      );
    }

    // Obtener configuración del empleado
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        payroll_config(*),
        employment_contracts!inner(*)
      `)
      .eq('id', employee_id)
      .eq('employment_contracts.status', 'active')
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o sin contrato activo' },
        { status: 404 }
      );
    }

    const config = employee.payroll_config[0];
    const contract = employee.employment_contracts[0];

    if (!config) {
      return NextResponse.json(
        { error: 'Empleado sin configuración previsional' },
        { status: 400 }
      );
    }

    // Obtener parámetros del período
    const { data: parameters, error: paramError } = await supabase
      .from('payroll_parameters')
      .select('*')
      .lte('valid_from', `${period}-01`)
      .order('valid_from', { ascending: false })
      .limit(1)
      .single();

    if (paramError || !parameters) {
      return NextResponse.json(
        { error: 'No se encontraron parámetros para el período' },
        { status: 400 }
      );
    }

    // Calcular sueldo proporcional
    const proportional_salary = Math.round((base_salary * worked_days) / 30);

    // Calcular gratificación (25% con tope de 4.75 IMM)
    const monthly_minimum = parameters.minimum_wage;
    const max_gratification = monthly_minimum * 4.75;
    const calculated_gratification = Math.round(proportional_salary * 0.25);
    const gratification = Math.min(calculated_gratification, max_gratification);

    // Calcular horas extras (50% recargo)
    const hourly_rate = base_salary / (contract.weekly_hours * 4.33);
    const overtime_payment = Math.round(overtime_hours * hourly_rate * 1.5);

    // Calcular asignación familiar
    let family_allowance = 0;
    if (config.family_charges > 0) {
      if (proportional_salary <= parameters.family_allowance_income_limit_a) {
        family_allowance = config.family_charges * parameters.family_allowance_a;
      } else if (proportional_salary <= parameters.family_allowance_income_limit_b) {
        family_allowance = config.family_charges * parameters.family_allowance_b;
      } else if (proportional_salary <= parameters.family_allowance_income_limit_c) {
        family_allowance = config.family_charges * parameters.family_allowance_c;
      }
    }

    // Total haberes
    const gross_income = proportional_salary + gratification + overtime_payment + bonuses + allowances + family_allowance;

    // Base imponible (excluir asignación familiar)
    const imponible_income = proportional_salary + gratification + overtime_payment + bonuses + allowances;
    
    // Tope imponible
    const max_imponible = Math.round(parameters.max_imponible_uf * parameters.uf_value);
    const capped_imponible = Math.min(imponible_income, max_imponible);

    // AFP (10% + comisión)
    const afp_employee = Math.round(capped_imponible * 0.10);
    const afp_commission = Math.round(capped_imponible * (config.afp_commission / 100));

    // Salud
    let health_employee = 0;
    if (config.health_system === 'fonasa') {
      health_employee = Math.round(capped_imponible * 0.07);
    } else {
      // Isapre: mínimo 7% o valor del plan
      const plan_value = config.health_plan_uf ? Math.round(config.health_plan_uf * parameters.uf_value) : 0;
      const minimum_health = Math.round(capped_imponible * 0.07);
      health_employee = Math.max(minimum_health, plan_value);
    }

    // Seguro cesantía empleado
    const max_afc = Math.round(parameters.max_cesantia_uf * parameters.uf_value);
    const afc_base = Math.min(imponible_income, max_afc);
    const afc_employee = Math.round(afc_base * 0.006); // 0.6%

    // Base para impuesto único (después de descuentos previsionales)
    const taxable_income = imponible_income - afp_employee - afp_commission - health_employee - afc_employee;

    // Calcular impuesto único
    const { data: taxResult } = await supabase
      .rpc('calculate_unique_tax', {
        p_taxable_income: taxable_income,
        p_utm_value: 66000, // UTM 2025 aproximada
        p_period: period
      });

    const unique_tax = taxResult?.[0]?.tax_amount || 0;
    const unique_tax_factor = taxResult?.[0]?.tax_factor || 0;
    const unique_tax_deduction = taxResult?.[0]?.deduction || 0;

    // Préstamo solidario (si el empleado tiene derecho y lo necesita)
    let solidarity_loan = 0;
    if (unique_tax === 0 && taxable_income > 0 && taxable_income <= 900000) {
      // Fórmula aproximada del préstamo solidario 2025
      solidarity_loan = Math.round(Math.min(taxable_income * 0.007, 15000));
    }

    // Total descuentos
    const total_deductions = afp_employee + afp_commission + health_employee + afc_employee + unique_tax + solidarity_loan + additional_deductions;

    // Líquido a pagar
    const net_income = gross_income - total_deductions;

    // Cálculos para el empleador (informativos)
    const sis_employer = Math.round(capped_imponible * 0.0188); // SIS - 1.88% costo patronal
    const afc_employer_rate = config.afc_contract_type === 'indefinido' ? 0.024 : 0.030;
    const afc_employer = Math.round(afc_base * afc_employer_rate);
    const mutual_insurance = Math.round(capped_imponible * 0.0095); // Promedio mutual

    const result: PayrollResult = {
      // Haberes
      base_salary: proportional_salary,
      gratification,
      overtime_payment,
      bonuses,
      allowances,
      family_allowance,
      gross_income,
      
      // Descuentos empleado
      afp_employee,
      afp_commission,
      health_employee,
      afc_employee,
      
      // Impuesto único
      taxable_income,
      unique_tax,
      unique_tax_factor,
      unique_tax_deduction,
      
      // Préstamo solidario
      solidarity_loan,
      
      // Otros
      additional_deductions,
      total_deductions,
      net_income,
      
      // Empleador (costos patronales)
      afp_employer: sis_employer, // SIS es el costo patronal AFP
      afc_employer,
      mutual_insurance
    };

    return NextResponse.json({
      success: true,
      data: result,
      employee: {
        name: `${employee.first_name} ${employee.last_name}`,
        rut: employee.rut,
        position: contract.position
      },
      period,
      calculation_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en cálculo de liquidación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener liquidación existente
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get('employee_id');
    const period = searchParams.get('period');

    if (!employee_id || !period) {
      return NextResponse.json(
        { error: 'employee_id y period son requeridos' },
        { status: 400 }
      );
    }

    const { data: payroll, error } = await supabase
      .from('payroll_documents')
      .select(`
        *,
        employees(first_name, last_name, rut),
        payroll_items(*)
      `)
      .eq('employee_id', employee_id)
      .eq('period', period)
      .eq('document_type', 'liquidacion')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Liquidación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payroll
    });

  } catch (error) {
    console.error('Error al obtener liquidación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}