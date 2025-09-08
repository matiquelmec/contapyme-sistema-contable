/**
 * Servicio de liquidaciones que funciona directamente en frontend
 * Solución alternativa para problemas de API en Netlify
 */

import { createClient } from '@supabase/supabase-js';
import { PayrollCalculator } from './payrollCalculator';
import { CHILEAN_PAYROLL_CONFIG, mergeWithDynamicConfig } from './chileanPayrollConfig';

// Configuración Supabase 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Intentar usar service key, fallback a anon key
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Crear cliente con service key si está disponible
const supabase = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : {}
);

export interface LiquidationRequest {
  employee_id: string;
  period_year: number;
  period_month: number;
  days_worked?: number;
  worked_hours?: number;
  overtime_hours?: number;
  additional_income?: {
    bonuses?: number;
    commissions?: number;
    gratification?: number;
    overtime_amount?: number;
    food_allowance?: number;
    transport_allowance?: number;
  };
  additional_deductions?: {
    loan_deductions?: number;
    advance_payments?: number;
    apv_amount?: number;
    other_deductions?: number;
  };
  save_liquidation?: boolean;
}

export interface LiquidationResponse {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

export class LiquidationService {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * Calcular liquidación completa
   */
  async calculateLiquidation(request: LiquidationRequest): Promise<LiquidationResponse> {
    try {
      console.log('🚀 Frontend Liquidation Service - Starting calculation');
      console.log('🔑 Using Supabase key type:', supabaseServiceKey ? 'SERVICE_KEY' : 'ANON_KEY');

      // 1. Obtener datos del empleado con múltiples estrategias
      console.log('📋 Fetching employee:', request.employee_id);
      
      let employee: any = null;
      let employeeError: any = null;
      
      // Estrategia 1: Consulta con company_id (para service key)
      if (supabaseServiceKey) {
        console.log('🔑 Usando SERVICE_KEY - consulta con company_id');
        const employeeResult = await supabase
          .from('employees')
          .select(`
            *,
            employment_contracts (
              position,
              base_salary,
              contract_type,
              status
            )
          `)
          .eq('id', request.employee_id)
          .eq('company_id', this.companyId)
          .single();
          
        employee = employeeResult.data;
        employeeError = employeeResult.error;
      } else {
        console.log('🔑 Usando ANON_KEY - consulta sin company_id');
        // Estrategia 2: Solo por ID (para anon key)
        const empResult = await supabase
          .from('employees')
          .select(`
            *,
            employment_contracts (
              position,
              base_salary,
              contract_type,
              status
            )
          `)
          .eq('id', request.employee_id)
          .single();
          
        employee = empResult.data;
        employeeError = empResult.error;
      }

      console.log('Employee query result:', { 
        found: !!employee, 
        error: employeeError?.message,
        keyType: supabaseServiceKey ? 'SERVICE' : 'ANON'
      });

      // Si todavía falla, intentar consulta más simple
      if (employeeError || !employee) {
        console.log('🔄 Intentando consulta simplificada...');
        
        const simpleResult = await supabase
          .from('employees')
          .select('*')
          .eq('id', request.employee_id)
          .single();
          
        if (simpleResult.error || !simpleResult.data) {
          console.error('Simple employee fetch error:', simpleResult.error);
          return {
            success: false,
            error: `Empleado no encontrado: ${simpleResult.error?.message || employeeError?.message || 'RLS blocking access'}`
          };
        }
        
        // Usar resultado simple y obtener contratos por separado
        employee = simpleResult.data;
        
        // Intentar obtener contratos por separado
        const contractsResult = await supabase
          .from('employment_contracts')
          .select('*')
          .eq('employee_id', request.employee_id);
          
        if (!contractsResult.error && contractsResult.data) {
          employee.employment_contracts = contractsResult.data;
        } else {
          console.warn('No se pudieron obtener contratos, usando defaults');
          employee.employment_contracts = [];
        }
        
        employeeError = null;
      }

      // 1.5. Obtener payroll_config por separado (con fallback)
      let payrollConfig = null;
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_config')
        .select('*')
        .eq('employee_id', request.employee_id)
        .single();
        
      if (!payrollError && payrollData) {
        payrollConfig = payrollData;
        console.log('✅ Payroll config encontrado');
      } else {
        console.warn('⚠️ No payroll config found, using defaults:', payrollError?.message);
        // Crear config por defecto
        payrollConfig = {
          afp_code: 'HABITAT',
          health_institution_code: 'FONASA',
          family_allowances: 0
        };
      }

      if (employeeError || !employee) {
        console.error('Employee fetch error:', employeeError);
        return {
          success: false,
          error: `Empleado no encontrado: ${employeeError?.message || 'Unknown error'}`
        };
      }

      // Verificar contrato activo
      const activeContract = employee.employment_contracts?.find((contract: any) => contract.status === 'active');
      if (!activeContract) {
        return {
          success: false,
          error: 'Empleado no tiene contrato activo'
        };
      }

      // 2. Obtener configuración previsional de la empresa (con fallback)
      let settingsData = null;
      const settingsResult = await supabase
        .from('payroll_settings')
        .select('settings')
        .eq('company_id', this.companyId)
        .single();

      if (!settingsResult.error && settingsResult.data) {
        settingsData = settingsResult.data;
        console.log('✅ Settings encontrados');
      } else {
        console.warn('⚠️ Settings no encontrados, usando configuración centralizada chilena:', settingsResult.error?.message);
        settingsData = null; // Will be handled below
      }

      // ✅ NUEVA LÓGICA: Combinar configuración dinámica con centralizada
      const dynamicConfig = settingsData?.settings;
      const mergedConfig = mergeWithDynamicConfig(dynamicConfig);
      
      console.log(`🔗 Configuración combinada: ${dynamicConfig ? 'Dinámica + Centralizada' : 'Solo Centralizada'}`);
      
      // Usar configuración combinada
      settingsData = {
        settings: mergedConfig
      };

      // 3. Preparar datos para el calculador
      const employeeData = {
        id: employee.id,
        rut: employee.rut,
        first_name: employee.first_name,
        last_name: employee.last_name,
        base_salary: activeContract.base_salary,
        contract_type: activeContract.contract_type,
        afp_code: payrollConfig?.afp_code || 'HABITAT',
        health_institution_code: payrollConfig?.health_institution_code || 'FONASA',
        family_allowances: payrollConfig?.family_allowances || 0
      };

      const periodData = {
        year: request.period_year,
        month: request.period_month,
        days_worked: request.days_worked || 30,
        worked_hours: request.worked_hours || 0,
        overtime_hours: request.overtime_hours || 0
      };

      // 4. Inicializar calculador con configuración de la empresa
      const calculator = new PayrollCalculator(settingsData.settings);

      // 5. Calcular liquidación
      const liquidationResult = calculator.calculateLiquidation(
        employeeData,
        periodData,
        request.additional_income || {},
        request.additional_deductions || {}
      );

      // 6. Guardar liquidación si se solicita (opcional por ahora)
      let savedLiquidation = null;
      if (request.save_liquidation) {
        try {
          const { data: saved, error: saveError } = await supabase
            .from('payroll_liquidations')
            .upsert({
              company_id: this.companyId,
              employee_id: request.employee_id,
              period_year: request.period_year,
              period_month: request.period_month,
              days_worked: request.days_worked || 30,
              worked_hours: request.worked_hours || 0,
              overtime_hours: request.overtime_hours || 0,
              
              // Haberes
              base_salary: liquidationResult.base_salary,
              overtime_amount: liquidationResult.overtime_amount,
              bonuses: liquidationResult.bonuses,
              commissions: liquidationResult.commissions,
              gratification: liquidationResult.gratification,
              total_taxable_income: liquidationResult.total_taxable_income,
              
              food_allowance: liquidationResult.food_allowance,
              transport_allowance: liquidationResult.transport_allowance,
              family_allowance: liquidationResult.family_allowance,
              total_non_taxable_income: liquidationResult.total_non_taxable_income,
              
              // Descuentos
              afp_amount: liquidationResult.afp_amount,
              afp_commission_amount: liquidationResult.afp_commission_amount,
              // sis_amount removido - ahora es costo patronal, no descuento del empleado
              health_amount: liquidationResult.health_amount,
              unemployment_amount: liquidationResult.unemployment_amount,
              income_tax_amount: liquidationResult.income_tax_amount,
              
              // Otros
              loan_deductions: request.additional_deductions?.loan_deductions || 0,
              advance_payments: request.additional_deductions?.advance_payments || 0,
              apv_amount: request.additional_deductions?.apv_amount || 0,
              other_deductions: request.additional_deductions?.other_deductions || 0,
              total_other_deductions: liquidationResult.total_other_deductions,
              
              // Totales
              total_gross_income: liquidationResult.total_gross_income,
              total_deductions: liquidationResult.total_deductions,
              net_salary: liquidationResult.net_salary,
              
              calculation_config: liquidationResult.calculation_config,
              status: 'draft',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'company_id,employee_id,period_year,period_month'
            })
            .select()
            .single();

          if (!saveError) {
            savedLiquidation = saved;
          }
        } catch (saveErr) {
          console.warn('Warning: Could not save liquidation:', saveErr);
        }
      }

      return {
        success: true,
        data: {
          liquidation: liquidationResult,
          saved: savedLiquidation,
          warnings: liquidationResult.warnings
        }
      };

    } catch (error) {
      console.error('Error in frontend liquidation service:', error);
      return {
        success: false,
        error: `Error interno: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Obtener liquidaciones existentes
   */
  async getLiquidations(): Promise<LiquidationResponse> {
    try {
      const { data: liquidations, error } = await supabase
        .from('payroll_liquidations')
        .select(`
          id,
          employee_id,
          period_year,
          period_month,
          total_gross_income,
          total_deductions,
          net_salary,
          status,
          created_at,
          employees (
            rut,
            first_name,
            last_name
          )
        `)
        .eq('company_id', this.companyId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Error al obtener liquidaciones: ${error.message}`
        };
      }

      return {
        success: true,
        data: liquidations || []
      };

    } catch (error) {
      return {
        success: false,
        error: `Error interno: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}