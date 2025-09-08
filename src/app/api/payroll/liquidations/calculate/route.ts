import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayrollCalculator } from '@/modules/remuneraciones/services/calculadorService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API de cálculo de liquidaciones funcionando',
    timestamp: new Date().toISOString(),
    env_check: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Debug logging
    console.log('🚀 Liquidations Calculate API called');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set');
      return NextResponse.json(
        { success: false, error: 'Configuración Supabase incompleta - URL' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      return NextResponse.json(
        { success: false, error: 'Configuración Supabase incompleta - Service Key' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    console.log('📋 Company ID:', companyId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      employee_id,
      period_year,
      period_month,
      days_worked = 30,
      worked_hours = 0,
      overtime_hours = 0,
      additional_income = {},
      additional_deductions = {},
      save_liquidation = false
    } = body;

    // Validar datos requeridos
    if (!employee_id || !period_year || !period_month) {
      return NextResponse.json(
        { success: false, error: 'employee_id, period_year y period_month son requeridos' },
        { status: 400 }
      );
    }

    // ✅ OPTIMIZADO: Obtener contrato vigente usando helper functions (más robusto)
    console.log('🔍 Obteniendo contrato vigente para período:', { employee_id, period_year, period_month });
    
    // Importar funciones helper
    const { getContractForPeriod, shouldPayUnemploymentInsurance } = await import('@/lib/contractModificationsHelper');
    
    const contractForPeriod = await getContractForPeriod(employee_id, period_year, period_month);

    if (!contractForPeriod) {
      console.error('Contract for period error - usando fallback');
      // FALLBACK: Intentar obtener contrato actual si falla la función especializada
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          employment_contracts (
            position,
            base_salary,
            contract_type,
            weekly_hours,
            status
          ),
          payroll_config (
            afp_code,
            health_institution_code,
            family_allowances,
            legal_gratification_type
          )
        `)
        .eq('id', employee_id)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee) {
        console.error('Employee fetch error:', employeeError);
        return NextResponse.json(
          { success: false, error: `Empleado no encontrado: ${employeeError?.message || 'Unknown error'}` },
          { status: 404 }
        );
      }

      const activeContract = employee.employment_contracts?.find((contract: any) => contract.status === 'active');
      if (!activeContract) {
        return NextResponse.json(
          { success: false, error: 'Empleado no tiene contrato activo' },
          { status: 400 }
        );
      }

      // Usar contrato actual como fallback
      var periodContract = {
        base_salary: activeContract.base_salary,
        weekly_hours: activeContract.weekly_hours || 44,
        contract_type: activeContract.contract_type,
        position: activeContract.position,
        department: activeContract.department
      };
      var employeeInfo = employee;
      console.log('⚠️ Usando contrato actual como fallback');
    } else {
      // ✅ USAR CONTRATO DEL PERÍODO ESPECÍFICO OPTIMIZADO
      periodContract = contractForPeriod;
      
      // Obtener información básica del empleado
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          payroll_config (
            afp_code,
            health_institution_code,
            family_allowances,
            legal_gratification_type
          )
        `)
        .eq('id', employee_id)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee) {
        return NextResponse.json(
          { success: false, error: 'Error obteniendo datos del empleado' },
          { status: 404 }
        );
      }
      employeeInfo = employee;
      console.log('✅ Usando contrato específico del período:', {
        salary: periodContract.base_salary,
        hours: periodContract.weekly_hours,
        type: periodContract.contract_type,
        modifications: periodContract.modifications_applied?.length || 0
      });
    }

    // ✅ VERIFICAR REGLA DE CESANTÍA AUTOMÁTICA OPTIMIZADA
    const shouldPayUnemployment = contractForPeriod ? 
      await shouldPayUnemploymentInsurance(employee_id, period_year, period_month) : 
      false;

    console.log('🔍 Cesantía automática OPTIMIZADA:', {
      contractType: periodContract.contract_type,
      shouldPay: shouldPayUnemployment,
      period: `${period_month}/${period_year}`,
      modificationsApplied: contractForPeriod ? periodContract.modifications_applied?.length : 0
    });

    // 2. Obtener configuración previsional de la empresa
    const { data: settingsData, error: settingsError } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();

    // Usar configuración por defecto si no existe la de la empresa
    let payrollSettings;
    if (settingsError || !settingsData) {
      console.log('⚠️ No se encontró configuración específica, usando configuración por defecto');
      // Usar configuración por defecto con datos oficiales Previred 2025
      payrollSettings = {
        afp_configs: [
          { code: 'CAPITAL', commission_percentage: 1.44, sis_percentage: 1.88 }, // 11.44% total
          { code: 'CUPRUM', commission_percentage: 1.44, sis_percentage: 1.88 },  // 11.44% total
          { code: 'HABITAT', commission_percentage: 1.27, sis_percentage: 1.88 }, // 11.27% total
          { code: 'MODELO', commission_percentage: 0.58, sis_percentage: 1.88 },  // 10.58% total
          { code: 'PLANVITAL', commission_percentage: 1.16, sis_percentage: 1.88 }, // 11.16% total
          { code: 'PROVIDA', commission_percentage: 1.45, sis_percentage: 1.88 }, // 11.45% total
          { code: 'UNO', commission_percentage: 0.49, sis_percentage: 1.88 }      // 10.49% total
        ],
        family_allowances: {
          tramo_a: 15000,
          tramo_b: 10000, 
          tramo_c: 5000
        },
        income_limits: {
          uf_limit: 87.8, // Límite AFP afiliados según Previred 2025
          uf_value: 39383.07, // Valor UF agosto 31, 2025
          minimum_wage: 529000,
          family_allowance_limit: 470148
        }
      };
    } else {
      payrollSettings = settingsData.settings;
    }

    // 3. Preparar datos para el calculador usando el contrato del período específico
    const payrollConfig = employeeInfo.payroll_config || {};
    
    console.log('🔍 NUEVO SISTEMA - Contrato del período:', {
      salario: periodContract.base_salary,
      horas: periodContract.weekly_hours,
      tipo: periodContract.contract_type,
      cesantia: shouldPayUnemployment
    });
    console.log('🔍 NUEVO SISTEMA - AFP desde payroll_config:', payrollConfig.afp_code);
    console.log('🔍 NUEVO SISTEMA - Salud desde payroll_config:', payrollConfig.health_institution_code);
    
    const employeeData = {
      id: employeeInfo.id,
      rut: employeeInfo.rut,
      first_name: employeeInfo.first_name,
      last_name: employeeInfo.last_name,
      base_salary: parseFloat(periodContract.base_salary || 0), // ✅ USAR SALARIO DEL PERÍODO
      weekly_hours: parseInt(periodContract.weekly_hours || 44), // ✅ USAR HORAS DEL PERÍODO  
      contract_type: periodContract.contract_type || 'indefinido', // ✅ USAR TIPO DEL PERÍODO
      afp_code: payrollConfig.afp_code || 'MODELO',
      health_institution_code: payrollConfig.health_institution_code || 'FONASA',
      family_allowances: payrollConfig.family_allowances || 0,
      legal_gratification_type: payrollConfig.legal_gratification_type || 'none',
      // ✅ NUEVO: Indicador de cesantía automática
      should_pay_unemployment: shouldPayUnemployment || false
    };

    const periodData = {
      year: period_year,
      month: period_month,
      days_worked,
      worked_hours,
      overtime_hours
    };

    // 4. Inicializar calculador con configuración de la empresa
    const calculator = new PayrollCalculator(payrollSettings);

    // 5. Calcular liquidación
    const liquidationResult = await calculator.calculateLiquidation(
      employeeData,
      periodData,
      additional_income,
      additional_deductions
    );

    // 6. Guardar liquidación si se solicita
    let savedLiquidation = null;
    if (save_liquidation) {
      const { data: saved, error: saveError } = await supabase
        .from('payroll_liquidations')
        .upsert({
          company_id: companyId,
          employee_id: employee_id,
          period_year: period_year,
          period_month: period_month,
          days_worked: days_worked,
          worked_hours: worked_hours,
          overtime_hours: overtime_hours,
          
          // Haberes Imponibles
          base_salary: liquidationResult.base_salary,
          overtime_amount: liquidationResult.overtime_amount,
          bonuses: liquidationResult.bonuses,
          commissions: liquidationResult.commissions,
          gratification: liquidationResult.gratification,
          legal_gratification_art50: liquidationResult.legal_gratification_art50,
          total_taxable_income: liquidationResult.total_taxable_income,
          
          // Haberes No Imponibles
          food_allowance: liquidationResult.food_allowance,
          transport_allowance: liquidationResult.transport_allowance,
          family_allowance: liquidationResult.family_allowance,
          other_allowances: liquidationResult.other_allowances,
          total_non_taxable_income: liquidationResult.total_non_taxable_income,
          
          // Descuentos Previsionales
          afp_percentage: liquidationResult.afp_percentage,
          afp_commission_percentage: liquidationResult.afp_commission_percentage,
          afp_amount: liquidationResult.afp_amount,
          afp_commission_amount: liquidationResult.afp_commission_amount,
          // sis_amount: liquidationResult.sis_amount, // ✅ SIS es costo patronal, NO descuento del trabajador
          
          health_percentage: liquidationResult.health_percentage,
          health_amount: liquidationResult.health_amount,
          
          unemployment_percentage: liquidationResult.unemployment_percentage,
          unemployment_amount: liquidationResult.unemployment_amount,
          
          // Impuestos
          income_tax_amount: liquidationResult.income_tax_amount,
          
          // Otros Descuentos
          loan_deductions: additional_deductions.loan_deductions || 0,
          advance_payments: additional_deductions.advance_payments || 0,
          apv_amount: additional_deductions.apv_amount || 0,
          other_deductions: additional_deductions.other_deductions || 0,
          total_other_deductions: liquidationResult.total_other_deductions,
          
          // Totales
          total_gross_income: liquidationResult.total_gross_income,
          total_deductions: liquidationResult.total_deductions,
          net_salary: liquidationResult.net_salary,
          
          // Configuración usada
          calculation_config: liquidationResult.calculation_config,
          
          // Metadatos
          status: 'draft',
          generated_by: companyId, // TODO: usar ID de usuario real
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,employee_id,period_year,period_month'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving liquidation:', saveError);
        return NextResponse.json(
          { success: false, error: 'Error al guardar liquidación' },
          { status: 500 }
        );
      }

      savedLiquidation = saved;
    }

    return NextResponse.json({
      success: true,
      data: {
        liquidation: liquidationResult,
        saved: savedLiquidation,
        warnings: liquidationResult.warnings
      },
      message: save_liquidation ? 'Liquidación calculada y guardada' : 'Liquidación calculada'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/liquidations/calculate:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para recalcular liquidación existente
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

    const body = await request.json();
    const { liquidation_id, additional_income = {}, additional_deductions = {} } = body;

    // Obtener liquidación existente
    const { data: existingLiquidation, error: fetchError } = await supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name,
          employment_contracts!inner (
            base_salary,
            contract_type,
            afp_name,
            health_institution,
            isapre_plan
          ),
          payroll_config (
            afp_code,
            health_institution_code,
            family_allowances,
            legal_gratification_type
          )
        )
      `)
      .eq('id', liquidation_id)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !existingLiquidation) {
      return NextResponse.json(
        { success: false, error: 'Liquidación no encontrada' },
        { status: 404 }
      );
    }

    // Recalcular con nuevos valores
    const employee = existingLiquidation.employees;
    const contract = employee.employment_contracts[0];
    const payrollConfig = employee.payroll_config || {};

    // PRIORIDAD: Usar configuración individual payroll_config primero, luego contrato como fallback
    const contractAfpName = contract.afp_name;
    const contractHealthInstitution = contract.health_institution;
    
    console.log('🔍 RECÁLCULO - AFP desde contrato:', contractAfpName);
    console.log('🔍 RECÁLCULO - AFP desde payroll_config:', payrollConfig.afp_code);
    console.log('🔍 RECÁLCULO - Salud desde contrato:', contractHealthInstitution);
    console.log('🔍 RECÁLCULO - Salud desde payroll_config:', payrollConfig.health_institution_code);

    const employeeData = {
      id: existingLiquidation.employee_id,
      rut: employee.rut,
      first_name: employee.first_name,
      last_name: employee.last_name,
      base_salary: contract.base_salary,
      contract_type: contract.contract_type,
      afp_code: payrollConfig.afp_code || contractAfpName || 'MODELO', // PRIORIDAD: configuración individual primero
      health_institution_code: payrollConfig.health_institution_code || contractHealthInstitution || 'FONASA',
      family_allowances: payrollConfig.family_allowances || 0,
      legal_gratification_type: payrollConfig.legal_gratification_type || 'none'
    };

    const periodData = {
      year: existingLiquidation.period_year,
      month: existingLiquidation.period_month,
      days_worked: existingLiquidation.days_worked,
      worked_hours: existingLiquidation.worked_hours || 0,
      overtime_hours: existingLiquidation.overtime_hours || 0
    };

    // Obtener configuración actual
    const { data: settingsData, error: settingsError } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();

    // Usar configuración por defecto si no existe
    let payrollSettings;
    if (settingsError || !settingsData) {
      payrollSettings = {
        afp_configs: [
          { code: 'CAPITAL', commission_percentage: 1.44, sis_percentage: 1.88 }, // 11.44% total
          { code: 'CUPRUM', commission_percentage: 1.44, sis_percentage: 1.88 },  // 11.44% total
          { code: 'HABITAT', commission_percentage: 1.27, sis_percentage: 1.88 }, // 11.27% total
          { code: 'MODELO', commission_percentage: 0.58, sis_percentage: 1.88 },  // 10.58% total
          { code: 'PLANVITAL', commission_percentage: 1.16, sis_percentage: 1.88 }, // 11.16% total
          { code: 'PROVIDA', commission_percentage: 1.45, sis_percentage: 1.88 }, // 11.45% total
          { code: 'UNO', commission_percentage: 0.49, sis_percentage: 1.88 }      // 10.49% total
        ],
        family_allowances: { tramo_a: 15000, tramo_b: 10000, tramo_c: 5000 },
        income_limits: { 
          uf_limit: 87.8, // Límite AFP afiliados según Previred 2025
          uf_value: 39383.07, // Valor UF agosto 31, 2025
          minimum_wage: 529000, 
          family_allowance_limit: 470148 
        }
      };
    } else {
      payrollSettings = settingsData.settings;
    }

    const calculator = new PayrollCalculator(payrollSettings);
    const liquidationResult = await calculator.calculateLiquidation(
      employeeData,
      periodData,
      additional_income,
      additional_deductions
    );

    console.log('🔍 liquidationResult.afp_commission_percentage:', liquidationResult.afp_commission_percentage);
    console.log('🔍 liquidationResult.afp_percentage:', liquidationResult.afp_percentage);
    console.log('🔍 liquidationResult.afp_commission_amount:', liquidationResult.afp_commission_amount);

    // Actualizar liquidación
    const { data: updated, error: updateError } = await supabase
      .from('payroll_liquidations')
      .update({
        // Actualizar todos los campos calculados
        base_salary: liquidationResult.base_salary,
        overtime_amount: liquidationResult.overtime_amount,
        bonuses: liquidationResult.bonuses,
        commissions: liquidationResult.commissions,
        gratification: liquidationResult.gratification,
        legal_gratification_art50: liquidationResult.legal_gratification_art50,
        total_taxable_income: liquidationResult.total_taxable_income,
        
        food_allowance: liquidationResult.food_allowance,
        transport_allowance: liquidationResult.transport_allowance,
        family_allowance: liquidationResult.family_allowance,
        total_non_taxable_income: liquidationResult.total_non_taxable_income,
        
        afp_percentage: liquidationResult.afp_percentage,
        afp_commission_percentage: liquidationResult.afp_commission_percentage,
        afp_amount: liquidationResult.afp_amount,
        afp_commission_amount: liquidationResult.afp_commission_amount,
        // sis_amount: liquidationResult.sis_amount, // ✅ SIS es costo patronal, NO descuento del trabajador
        health_percentage: liquidationResult.health_percentage,
        health_amount: liquidationResult.health_amount,
        unemployment_percentage: liquidationResult.unemployment_percentage,
        unemployment_amount: liquidationResult.unemployment_amount,
        income_tax_amount: liquidationResult.income_tax_amount,
        
        total_other_deductions: liquidationResult.total_other_deductions,
        total_gross_income: liquidationResult.total_gross_income,
        total_deductions: liquidationResult.total_deductions,
        net_salary: liquidationResult.net_salary,
        
        calculation_config: liquidationResult.calculation_config,
        updated_at: new Date().toISOString()
      })
      .eq('id', liquidation_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating liquidation:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar liquidación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        liquidation: liquidationResult,
        updated: updated,
        warnings: liquidationResult.warnings
      },
      message: 'Liquidación recalculada exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/liquidations/calculate:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}