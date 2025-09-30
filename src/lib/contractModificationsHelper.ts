// ===============================================
// HELPER FUNCTIONS PARA SISTEMA DE MODIFICACIONES CONTRACTUALES
// Fallback cuando las funciones PostgreSQL no están disponibles
// ===============================================

import { getDatabaseConnection } from '@/lib/database/databaseSimple';

export interface ContractModification {
  id: string;
  company_id: string;
  employee_id: string;
  modification_type: 'salary_change' | 'hours_change' | 'contract_type_change' | 'position_change' | 'department_change' | 'benefits_change' | 'other';
  effective_date: string;
  created_date: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  reason?: string;
  document_reference?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractForPeriod {
  base_salary: number;
  weekly_hours: number;
  contract_type: string;
  position: string;
  department: string;
  modifications_applied: any[];
}

// ✅ FUNCIÓN: Obtener contrato vigente para un período específico
export async function getContractForPeriod(
  employeeId: string,
  year: number,
  month: number
): Promise<ContractForPeriod | null> {
  try {
    const supabase = getDatabaseConnection();
    if (!supabase) throw new Error('No database connection');

    console.log('🔍 getContractForPeriod:', { employeeId, year, month });

    // 1. Obtener contrato base actual
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        employment_contracts (
          id, position, department, base_salary, weekly_hours, contract_type, status, start_date
        )
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('❌ Error obteniendo empleado:', employeeError);
      return null;
    }

    const activeContract = employee.employment_contracts?.find((c: any) => c.status === 'active');
    if (!activeContract) {
      console.error('❌ No se encontró contrato activo');
      return null;
    }

    // 2. Inicializar con valores del contrato base
    let result: ContractForPeriod = {
      base_salary: parseFloat(activeContract.base_salary || 0),
      weekly_hours: parseInt(activeContract.weekly_hours || 44),
      contract_type: activeContract.contract_type || 'indefinido',
      position: activeContract.position || '',
      department: activeContract.department || '',
      modifications_applied: []
    };

    // 3. Obtener modificaciones que aplican para el período
    const periodDate = new Date(year, month - 1, 1); // Primer día del mes

    const { data: modifications, error: modError } = await supabase
      .from('contract_modifications')
      .select('*')
      .eq('employee_id', employeeId)
      .lte('effective_date', periodDate.toISOString().split('T')[0])
      .order('effective_date', { ascending: true });

    if (modError) {
      console.error('⚠️ Error obteniendo modificaciones (usando contrato base):', modError);
      return result;
    }

    // 4. Aplicar modificaciones en orden cronológico
    if (modifications && modifications.length > 0) {
      console.log(`🔧 Aplicando ${modifications.length} modificaciones para período ${month}/${year}`);

      for (const mod of modifications) {
        const oldValues = typeof mod.old_values === 'string' ? JSON.parse(mod.old_values) : mod.old_values;
        const newValues = typeof mod.new_values === 'string' ? JSON.parse(mod.new_values) : mod.new_values;

        switch (mod.modification_type) {
          case 'salary_change':
            if (newValues.base_salary) {
              result.base_salary = parseFloat(newValues.base_salary);
            }
            break;
          case 'hours_change':
            if (newValues.weekly_hours) {
              result.weekly_hours = parseInt(newValues.weekly_hours);
            }
            break;
          case 'contract_type_change':
            if (newValues.contract_type) {
              result.contract_type = newValues.contract_type;
            }
            break;
          case 'position_change':
            if (newValues.position) {
              result.position = newValues.position;
            }
            break;
          case 'department_change':
            if (newValues.department) {
              result.department = newValues.department;
            }
            break;
        }

        result.modifications_applied.push({
          type: mod.modification_type,
          effective_date: mod.effective_date,
          reason: mod.reason,
          from: oldValues,
          to: newValues
        });
      }
    }

    console.log('✅ Contrato para período calculado:', {
      salary: result.base_salary,
      hours: result.weekly_hours,
      type: result.contract_type,
      modifications: result.modifications_applied.length
    });

    return result;

  } catch (error) {
    console.error('❌ Error en getContractForPeriod:', error);
    return null;
  }
}

// ✅ FUNCIÓN: Determinar si debe pagar cesantía
export async function shouldPayUnemploymentInsurance(
  employeeId: string,
  year: number,
  month: number
): Promise<boolean> {
  try {
    const contract = await getContractForPeriod(employeeId, year, month);
    if (!contract) return false;

    // Regla simple: Solo contratos indefinidos pagan cesantía
    const shouldPay = contract.contract_type === 'indefinido';

    console.log('🔍 Cesantía automática:', {
      contractType: contract.contract_type,
      shouldPay,
      period: `${month}/${year}`
    });

    return shouldPay;

  } catch (error) {
    console.error('❌ Error en shouldPayUnemploymentInsurance:', error);
    return false; // Default seguro: no aplicar cesantía si hay error
  }
}

// ✅ FUNCIÓN: Obtener historial de modificaciones
export async function getEmployeeModificationHistory(employeeId: string): Promise<ContractModification[]> {
  try {
    const supabase = getDatabaseConnection();
    if (!supabase) throw new Error('No database connection');

    const { data: modifications, error } = await supabase
      .from('contract_modifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }

    return modifications || [];

  } catch (error) {
    console.error('❌ Error en getEmployeeModificationHistory:', error);
    return [];
  }
}

// ✅ FUNCIÓN: Crear modificación contractual
export async function createContractModification(
  companyId: string,
  employeeId: string,
  modificationType: ContractModification['modification_type'],
  effectiveDate: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  reason?: string,
  documentReference?: string,
  createdBy?: string
): Promise<ContractModification | null> {
  try {
    const supabase = getDatabaseConnection();
    if (!supabase) throw new Error('No database connection');

    const modificationData = {
      company_id: companyId,
      employee_id: employeeId,
      modification_type: modificationType,
      effective_date: effectiveDate,
      created_date: new Date().toISOString().split('T')[0],
      old_values: oldValues,
      new_values: newValues,
      reason,
      document_reference: documentReference,
      created_by: createdBy
    };

    const { data: modification, error } = await supabase
      .from('contract_modifications')
      .insert(modificationData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando modificación:', error);
      return null;
    }

    console.log('✅ Modificación contractual creada:', modification.id);
    return modification;

  } catch (error) {
    console.error('❌ Error en createContractModification:', error);
    return null;
  }
}

// ✅ FUNCIÓN: Validar datos de modificación
export function validateModificationData(
  modificationType: string,
  oldValues: any,
  newValues: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validaciones por tipo
  switch (modificationType) {
    case 'salary_change':
      if (!newValues.base_salary || parseFloat(newValues.base_salary) <= 0) {
        errors.push('Nuevo salario debe ser mayor a 0');
      }
      if (!oldValues.base_salary) {
        errors.push('Salario anterior es requerido');
      }
      break;

    case 'hours_change':
      if (!newValues.weekly_hours || parseInt(newValues.weekly_hours) < 1 || parseInt(newValues.weekly_hours) > 48) {
        errors.push('Horas semanales deben estar entre 1 y 48');
      }
      if (!oldValues.weekly_hours) {
        errors.push('Horas anteriores son requeridas');
      }
      break;

    case 'contract_type_change':
      const validTypes = ['indefinido', 'plazo_fijo', 'obra_faena'];
      if (!newValues.contract_type || !validTypes.includes(newValues.contract_type)) {
        errors.push(`Tipo de contrato debe ser uno de: ${validTypes.join(', ')}`);
      }
      if (!oldValues.contract_type) {
        errors.push('Tipo de contrato anterior es requerido');
      }
      break;

    default:
      if (!newValues || Object.keys(newValues).length === 0) {
        errors.push('Nuevos valores no pueden estar vacíos');
      }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}