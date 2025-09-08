/**
 * Generador de asientos contables de nómina línea por línea
 * Cada trabajador genera sus propias líneas individuales
 */

export interface PayrollLine {
  account_code: string;
  account_name: string;
  line_number: number;
  debit_amount: number;
  credit_amount: number;
  line_description: string;
}

export interface EmployeeData {
  rut: string;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  overtimeAmount: number;
  bonuses: number;
  gratificationArt50: number;
  hasColacion: boolean;
  hasMovilizacion: boolean;
  totalTaxableIncome: number;
  contractType: 'indefinido' | 'plazo_fijo';
  // Descuentos empleado
  afpAmount: number;
  afpCommission: number;
  healthAmount: number;
  unemploymentEmployee: number;
  incomeTax: number;
  liquidAmount: number;
  // Aportes patronales calculados
  unemploymentEmployer: number;
  socialAfp: number;
  socialEsperanza: number;
  sisEmployer: number;
  mutualEmployer: number;
}

/**
 * Genera todas las líneas del asiento para un trabajador específico
 */
export function generateEmployeeJournalLines(
  employee: EmployeeData,
  startLineNumber: number
): PayrollLine[] {
  const lines: PayrollLine[] = [];
  let lineNumber = startLineNumber;
  
  const employeeDesc = `${employee.rut} | ${employee.name} | ${employee.position} | ${employee.department}`;
  
  // ============= LÍNEAS AL DEBE - HABERES =============
  
  // Sueldo Base
  if (employee.baseSalary > 0) {
    lines.push({
      account_code: '6.2.1.001',
      account_name: 'Sueldo Base',
      line_number: lineNumber++,
      debit_amount: employee.baseSalary,
      credit_amount: 0,
      line_description: `${employeeDesc} | Sueldo Base`
    });
  }
  
  // Horas Extras
  if (employee.overtimeAmount > 0) {
    lines.push({
      account_code: '6.2.1.002',
      account_name: 'Horas Extras',
      line_number: lineNumber++,
      debit_amount: employee.overtimeAmount,
      credit_amount: 0,
      line_description: `${employeeDesc} | Horas Extras`
    });
  }
  
  // Bonificaciones
  if (employee.bonuses > 0) {
    lines.push({
      account_code: '6.2.1.004',
      account_name: 'Bonificaciones',
      line_number: lineNumber++,
      debit_amount: employee.bonuses,
      credit_amount: 0,
      line_description: `${employeeDesc} | Bonificaciones`
    });
  }
  
  // Asignación Colación
  if (employee.hasColacion) {
    lines.push({
      account_code: '6.2.1.006',
      account_name: 'Asignación Colación',
      line_number: lineNumber++,
      debit_amount: 20000,
      credit_amount: 0,
      line_description: `${employeeDesc} | Asignación Colación`
    });
  }
  
  // Asignación Movilización
  if (employee.hasMovilizacion) {
    lines.push({
      account_code: '6.2.1.007',
      account_name: 'Asignación Movilización',
      line_number: lineNumber++,
      debit_amount: 20000,
      credit_amount: 0,
      line_description: `${employeeDesc} | Asignación Movilización`
    });
  }
  
  // Gratificación Art. 50
  if (employee.gratificationArt50 > 0) {
    lines.push({
      account_code: '6.2.1.005',
      account_name: 'Gratificación Legal Art. 50',
      line_number: lineNumber++,
      debit_amount: employee.gratificationArt50,
      credit_amount: 0,
      line_description: `${employeeDesc} | Gratificación Legal Art. 50`
    });
  }
  
  // ============= LÍNEAS AL DEBE - APORTES PATRONALES =============
  
  // 1% Social AFP (0.1%)
  if (employee.socialAfp > 0) {
    lines.push({
      account_code: '6.2.2.001',
      account_name: '1% Social AFP (0.1%)',
      line_number: lineNumber++,
      debit_amount: employee.socialAfp,
      credit_amount: 0,
      line_description: `${employeeDesc} | 1% Social AFP 0.1%`
    });
  }
  
  // 1% Social Esperanza Vida (0.9%)
  if (employee.socialEsperanza > 0) {
    lines.push({
      account_code: '6.2.2.005',
      account_name: '1% Social Esperanza Vida',
      line_number: lineNumber++,
      debit_amount: employee.socialEsperanza,
      credit_amount: 0,
      line_description: `${employeeDesc} | 1% Social Esperanza Vida 0.9%`
    });
  }
  
  // SIS Empleador (1.88%)
  if (employee.sisEmployer > 0) {
    lines.push({
      account_code: '6.2.2.003',
      account_name: 'SIS Empleador',
      line_number: lineNumber++,
      debit_amount: employee.sisEmployer,
      credit_amount: 0,
      line_description: `${employeeDesc} | SIS Empleador 1.88%`
    });
  }
  
  // Mutual Empleador (0.93%)
  if (employee.mutualEmployer > 0) {
    const baseImponible = Math.min(employee.totalTaxableIncome, 3457834); // Tope AFP
    lines.push({
      account_code: '6.2.2.006',
      account_name: 'Mutual Empleador',
      line_number: lineNumber++,
      debit_amount: employee.mutualEmployer,
      credit_amount: 0,
      line_description: `${employeeDesc} | ACHS Empleador 0.93% (Base: $${baseImponible.toLocaleString('es-CL')})`
    });
  }
  
  // Cesantía Empleador
  if (employee.unemploymentEmployer > 0) {
    const cesantiaRate = employee.contractType === 'plazo_fijo' ? '3%' : '2.4%';
    const cesantiaType = employee.contractType === 'plazo_fijo' ? 'Plazo Fijo' : 'Indefinido';
    lines.push({
      account_code: '6.2.2.002',
      account_name: 'Cesantía Empleador',
      line_number: lineNumber++,
      debit_amount: employee.unemploymentEmployer,
      credit_amount: 0,
      line_description: `${employeeDesc} | Cesantía Empleador ${cesantiaRate} (${cesantiaType})`
    });
  }
  
  // ============= LÍNEAS AL HABER - PASIVOS =============
  
  // AFP - Previsión
  if (employee.afpAmount > 0) {
    lines.push({
      account_code: '2.1.2.001',
      account_name: 'AFP por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.afpAmount,
      line_description: `${employeeDesc} | Previsión AFP`
    });
  }
  
  // AFP - Comisión
  if (employee.afpCommission > 0) {
    lines.push({
      account_code: '2.1.2.001',
      account_name: 'AFP por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.afpCommission,
      line_description: `${employeeDesc} | Comisión AFP`
    });
  }
  
  // Salud
  if (employee.healthAmount > 0) {
    lines.push({
      account_code: '2.1.2.002',
      account_name: 'Salud por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.healthAmount,
      line_description: `${employeeDesc} | Cotización Salud`
    });
  }
  
  // Cesantía Trabajador
  if (employee.unemploymentEmployee > 0) {
    const cesantiaType = employee.contractType === 'plazo_fijo' ? 'Plazo Fijo' : 'Indefinido';
    const cesantiaRate = employee.contractType === 'plazo_fijo' ? '0%' : '0.6%';
    lines.push({
      account_code: '2.1.2.003',
      account_name: 'Cesantía por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.unemploymentEmployee,
      line_description: `${employeeDesc} | Cesantía Trabajador ${cesantiaRate} (${cesantiaType})`
    });
  }
  
  // Impuesto Único
  if (employee.incomeTax > 0) {
    lines.push({
      account_code: '2.1.3.001',
      account_name: 'Impuesto 2da Categoría por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.incomeTax,
      line_description: `${employeeDesc} | Impuesto Único`
    });
  }
  
  // Líquido a Pagar
  if (employee.liquidAmount > 0) {
    lines.push({
      account_code: '2.1.1.001',
      account_name: 'Líquidos por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.liquidAmount,
      line_description: `${employeeDesc} | Líquido a Recibir`
    });
  }
  
  // ============= LÍNEAS AL HABER - APORTES PATRONALES POR PAGAR =============
  
  // 1% Social AFP por Pagar
  if (employee.socialAfp > 0) {
    lines.push({
      account_code: '2.1.2.001',
      account_name: 'AFP por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.socialAfp,
      line_description: `${employeeDesc} | 1% Social AFP por Pagar`
    });
  }
  
  // Esperanza Vida por Pagar
  if (employee.socialEsperanza > 0) {
    lines.push({
      account_code: '2.1.2.005',
      account_name: 'Esperanza Vida por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.socialEsperanza,
      line_description: `${employeeDesc} | Esperanza Vida por Pagar`
    });
  }
  
  // SIS por Pagar
  if (employee.sisEmployer > 0) {
    lines.push({
      account_code: '2.1.2.004',
      account_name: 'SIS por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.sisEmployer,
      line_description: `${employeeDesc} | SIS por Pagar 1.88%`
    });
  }
  
  // Mutual por Pagar
  if (employee.mutualEmployer > 0) {
    lines.push({
      account_code: '2.1.2.006',
      account_name: 'Mutual por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.mutualEmployer,
      line_description: `${employeeDesc} | ACHS por Pagar 0.93%`
    });
  }
  
  // Cesantía Empleador por Pagar
  if (employee.unemploymentEmployer > 0) {
    const cesantiaRate = employee.contractType === 'plazo_fijo' ? '3%' : '2.4%';
    const cesantiaType = employee.contractType === 'plazo_fijo' ? 'Plazo Fijo' : 'Indefinido';
    lines.push({
      account_code: '2.1.2.003',
      account_name: 'Cesantía por Pagar',
      line_number: lineNumber++,
      debit_amount: 0,
      credit_amount: employee.unemploymentEmployer,
      line_description: `${employeeDesc} | Cesantía Empleador ${cesantiaRate} por Pagar (${cesantiaType})`
    });
  }
  
  return lines;
}

/**
 * Genera el asiento contable completo para la nómina
 */
export function generatePayrollJournalEntry(
  employees: EmployeeData[],
  period: string,
  companyId: string
): any {
  const lines: PayrollLine[] = [];
  let lineNumber = 1;
  
  // Generar líneas para cada empleado
  for (const employee of employees) {
    const employeeLines = generateEmployeeJournalLines(employee, lineNumber);
    lines.push(...employeeLines);
    lineNumber = lines.length + 1;
  }
  
  // Calcular totales para validación
  const totalDebit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit_amount, 0);
  const difference = Math.abs(totalDebit - totalCredit);
  
  console.log(`📊 Asiento generado: ${lines.length} líneas`);
  console.log(`💰 DEBE: $${totalDebit.toLocaleString('es-CL')}, HABER: $${totalCredit.toLocaleString('es-CL')}`);
  console.log(`✅ Diferencia: $${difference}`);
  
  if (difference > 1) {
    throw new Error(`Asiento desbalanceado: DEBE ${totalDebit} ≠ HABER ${totalCredit} (diferencia: ${difference})`);
  }
  
  return {
    company_id: companyId,
    entry_date: new Date().toISOString().split('T')[0],
    description: `Provisión Remuneraciones ${period} - ${employees.length} empleados`,
    reference: `REM-${period}`,
    entry_type: 'manual',
    source_type: 'payroll_liquidation',
    source_period: period,
    lines
  };
}