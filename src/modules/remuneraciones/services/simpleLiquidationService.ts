/**
 * Servicio de liquidaciones SIMPLE - Solo cálculos locales
 * Sin APIs externas, sin consultas complejas Supabase
 */

import { PayrollCalculator } from './payrollCalculator';
import { CHILEAN_PAYROLL_CONFIG } from './chileanPayrollConfig';

export interface SimpleLiquidationRequest {
  employee: {
    id: string;
    rut: string;
    first_name: string;
    last_name: string;
    base_salary: number;
    contract_type?: string;
    // Configuración previsional
    afp_code?: string;
    health_institution_code?: string;
    family_allowances?: number;
    legal_gratification_type?: string;
    has_unemployment_insurance?: boolean;
  };
  period: {
    year: number;
    month: number;
    days_worked?: number;
  };
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
}

export interface SimpleLiquidationResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ✅ ACTUALIZADO: Usar configuración centralizada chilena oficial
// Ya no necesitamos constante duplicada, usamos CHILEAN_PAYROLL_CONFIG

export class SimpleLiquidationService {
  
  /**
   * Calcular liquidación con datos locales únicamente
   */
  static calculateLiquidation(request: SimpleLiquidationRequest): SimpleLiquidationResponse {
    try {
      console.log('🚀 Simple Liquidation Service - Cálculo local');
      
      // Validaciones básicas
      if (!request.employee || !request.employee.base_salary) {
        return {
          success: false,
          error: 'Datos del empleado incompletos'
        };
      }

      if (!request.period || !request.period.year || !request.period.month) {
        return {
          success: false,
          error: 'Período no especificado'
        };
      }

      // Preparar datos del empleado con su configuración específica
      const employeeData = {
        id: request.employee.id,
        rut: request.employee.rut,
        first_name: request.employee.first_name,
        last_name: request.employee.last_name,
        base_salary: request.employee.base_salary,
        contract_type: request.employee.contract_type || 'indefinido',
        // Configuración previsional del empleado
        afp_code: request.employee.afp_code || 'HABITAT',
        health_institution_code: request.employee.health_institution_code || 'FONASA',
        family_allowances: request.employee.family_allowances || 0,
        legal_gratification_type: request.employee.legal_gratification_type || 'none',
        has_unemployment_insurance: request.employee.has_unemployment_insurance !== false
      };

      const periodData = {
        year: request.period.year,
        month: request.period.month,
        days_worked: request.period.days_worked || 30,
        worked_hours: 0,
        overtime_hours: 0
      };

      // ✅ Usar configuración centralizada chilena oficial 2025
      const calculator = new PayrollCalculator(CHILEAN_PAYROLL_CONFIG);

      // Calcular liquidación
      const liquidationResult = calculator.calculateLiquidation(
        employeeData,
        periodData,
        request.additional_income || {},
        request.additional_deductions || {}
      );

      console.log('✅ Liquidación calculada exitosamente (modo simple)');

      return {
        success: true,
        data: {
          liquidation: liquidationResult,
          calculation_mode: 'simple_local',
          employee_name: `${request.employee.first_name} ${request.employee.last_name}`,
          period_display: `${getMonthName(request.period.month)} ${request.period.year}`,
          warnings: liquidationResult.warnings || []
        }
      };

    } catch (error) {
      console.error('❌ Error en cálculo simple:', error);
      return {
        success: false,
        error: `Error de cálculo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
}

// Función auxiliar para nombres de meses
function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || 'Mes inválido';
}