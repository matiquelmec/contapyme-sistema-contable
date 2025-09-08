/**
 * Motor de Cálculo de Liquidaciones de Sueldo Chile
 * Implementa toda la lógica previsional chilena oficial
 * 
 * ✅ ACTUALIZADO: Usa configuración chilena centralizada
 * ✅ VERIFICADO: Cesantía 0.6% contratos indefinidos
 */

import { 
  CHILEAN_OFFICIAL_VALUES,
  calculateUnemploymentInsurance,
  calculateFamilyAllowance,
  calculateIncomeTax
} from '../constants/parametrosLegales';
import { getCurrentMinimumWage, calculateGratificationCap } from '../utils/economicIndicators';

// Re-exportar valores para compatibilidad
export const CHILE_TAX_VALUES = CHILEAN_OFFICIAL_VALUES;

// Interfaces para tipado
export interface EmployeeData {
  id: string;
  rut: string;
  first_name: string;
  last_name: string;
  base_salary: number;
  weekly_hours?: number; // ✅ NUEVO: Horas semanales para cálculo de horas extras
  contract_type: 'indefinido' | 'plazo_fijo' | 'obra_faena';
  afp_code: string;
  health_institution_code: string;
  family_allowances: number;
  legal_gratification_type?: 'article_50' | 'none';
}

export interface PayrollPeriod {
  year: number;
  month: number;
  days_worked: number;
  worked_hours?: number;
  overtime_hours?: number;
}

export interface AdditionalIncome {
  bonuses?: number;
  commissions?: number;
  gratification?: number;
  overtime_amount?: number;
  food_allowance?: number;
  transport_allowance?: number;
  cash_allowance?: number;
}

export interface AdditionalDeductions {
  loan_deductions?: number;
  advance_payments?: number;
  apv_amount?: number;
  other_deductions?: number;
}

export interface PayrollSettings {
  afp_configs: Array<{
    code: string;
    commission_percentage: number;
    sis_percentage: number;
  }>;
  family_allowances: {
    tramo_a: number;
    tramo_b: number;
    tramo_c: number;
  };
  income_limits: {
    uf_limit: number;
    minimum_wage: number;
    family_allowance_limit: number;
  };
}

export interface LiquidationResult {
  // Datos básicos
  employee: EmployeeData;
  period: PayrollPeriod;
  
  // Haberes Imponibles
  base_salary: number;
  overtime_hours: number; // ✅ NUEVO: Cantidad de horas extras realizadas
  overtime_amount: number;
  bonuses: number;
  commissions: number;
  gratification: number;
  legal_gratification_art50: number;
  total_taxable_income: number;
  
  // Haberes No Imponibles
  food_allowance: number;
  transport_allowance: number;
  cash_allowance: number;
  family_allowance: number;
  other_allowances: number;
  total_non_taxable_income: number;
  
  // Descuentos Previsionales (SIS REMOVIDO)
  afp_percentage: number;
  afp_commission_percentage: number;
  afp_amount: number;
  afp_commission_amount: number;
  
  health_percentage: number;
  health_amount: number;
  
  unemployment_percentage: number;
  unemployment_amount: number;
  
  // Impuestos
  income_tax_amount: number;
  
  // Otros Descuentos
  total_other_deductions: number;
  
  // Costos Patronales (NUEVO)
  employer_costs: {
    sis_amount: number;
    unemployment_employer: number;
    mutual_insurance: number;
    total: number;
  };
  
  // Totales
  total_gross_income: number;
  total_deductions: number;
  net_salary: number;
  
  // Configuración usada
  calculation_config: PayrollSettings;
  
  // Metadatos
  calculation_date: string;
  tope_imponible_exceeded: boolean;
  warnings: string[];
}

export class PayrollCalculator {
  private settings: PayrollSettings;
  private warnings: string[] = [];

  constructor(settings: PayrollSettings) {
    this.settings = settings;
    this.warnings = [];
  }

  /**
   * Calcula liquidación completa de un empleado
   * ✅ ACTUALIZADO: Usa indicadores económicos dinámicos
   */
  async calculateLiquidation(
    employee: EmployeeData,
    period: PayrollPeriod,
    additionalIncome: AdditionalIncome = {},
    additionalDeductions: AdditionalDeductions = {}
  ): Promise<LiquidationResult> {
    this.warnings = [];
    console.log('🔍 calculateLiquidation - employee.legal_gratification_type:', employee.legal_gratification_type);

    // 1. Calcular sueldo base proporcional
    const proportionalBaseSalary = this.calculateProportionalSalary(
      employee.base_salary,
      period.days_worked
    );

    // 2. Calcular haberes imponibles
    const { totalTaxableIncome, calculatedArticle50Gratification } = await this.calculateTaxableIncome(
      proportionalBaseSalary,
      additionalIncome,
      employee
    );
    const taxableIncome = totalTaxableIncome; // Use this for further calculations

    // 3. Aplicar tope imponible
    const { adjustedTaxableIncome, topeExceeded } = this.applyIncomeLimit(taxableIncome);

    // 4. Calcular asignación familiar
    const familyAllowance = this.calculateFamilyAllowance(
      employee.family_allowances,
      employee.base_salary
    );

    // 5. Calcular haberes no imponibles
    const nonTaxableIncome = this.calculateNonTaxableIncome(
      additionalIncome,
      familyAllowance
    );

    // 6. Calcular descuentos previsionales
    const previsionalDeductions = this.calculatePrevisionalDeductions(
      adjustedTaxableIncome,
      employee.afp_code,
      employee.health_institution_code,
      employee.contract_type
    );

    // 7. Calcular impuesto único segunda categoría
    const incomeTax = this.calculateIncomeTax(adjustedTaxableIncome);

    // 8. Calcular costos patronales
    const employerCosts = this.calculateEmployerCosts(
      adjustedTaxableIncome,
      employee.afp_code,
      employee.contract_type
    );

    // 9. Calcular otros descuentos
    const otherDeductions = this.calculateOtherDeductions(additionalDeductions);

    // Calculate the actual Article 50 gratification amount, regardless of whether it's included in taxable income
    let actualArticle50Gratification = 0;
    if (employee.legal_gratification_type === 'article_50') {
      actualArticle50Gratification = await this.calculateArticle50GratificationFromBase(proportionalBaseSalary + 
        (additionalIncome.overtime_amount || 0) + 
        (additionalIncome.bonuses || 0) + 
        (additionalIncome.commissions || 0) + 
        (additionalIncome.gratification || 0));
    }
    console.log('🔍 Gratificación Art. 50 calculada (independiente):', actualArticle50Gratification);

    // 11. Calcular totales (taxableIncome ya incluye la gratificación, no sumar dos veces)
    console.log('🔍 DEBUG TOTALES:');
    console.log('  - taxableIncome:', taxableIncome);
    console.log('  - nonTaxableIncome:', nonTaxableIncome);
    console.log('  - food_allowance:', additionalIncome.food_allowance || 0);
    console.log('  - transport_allowance:', additionalIncome.transport_allowance || 0);
    console.log('  - cash_allowance:', additionalIncome.cash_allowance || 0);
    console.log('  - familyAllowance:', familyAllowance);
    
    const totalGrossIncome = taxableIncome + nonTaxableIncome;
    console.log('  - totalGrossIncome calculated:', totalGrossIncome);
    
    const totalDeductions = previsionalDeductions.total + incomeTax + otherDeductions;
    const netSalary = totalGrossIncome - totalDeductions;

    // 12. Validar límite de descuentos (45% máximo)
    this.validateDeductionLimit(totalGrossIncome, totalDeductions);

    console.log('🔍 calculateLiquidation - Final taxableIncome:', taxableIncome);

    return {
      employee,
      period,
      
      // Haberes Imponibles
      base_salary: proportionalBaseSalary,
      overtime_hours: period.overtime_hours || 0, // ✅ CORREGIDO: Usar las horas ingresadas manualmente
      overtime_amount: additionalIncome.overtime_amount || 0,
      bonuses: additionalIncome.bonuses || 0,
      commissions: additionalIncome.commissions || 0,
      gratification: additionalIncome.gratification || 0,
      legal_gratification_art50: calculatedArticle50Gratification,
      total_taxable_income: taxableIncome,
      
      // Haberes No Imponibles
      food_allowance: additionalIncome.food_allowance || 0,
      transport_allowance: additionalIncome.transport_allowance || 0,
      cash_allowance: additionalIncome.cash_allowance || 0,
      family_allowance: familyAllowance,
      other_allowances: 0,
      total_non_taxable_income: nonTaxableIncome,
      
      // Descuentos Previsionales (SIS REMOVIDO)
      afp_percentage: CHILE_TAX_VALUES.AFP_PERCENTAGE,
      afp_commission_percentage: previsionalDeductions.afp_commission_percentage,
      afp_amount: previsionalDeductions.afp_amount,
      afp_commission_amount: previsionalDeductions.afp_commission_amount,
      
      health_percentage: CHILE_TAX_VALUES.HEALTH_PERCENTAGE,
      health_amount: previsionalDeductions.health_amount,
      
      unemployment_percentage: previsionalDeductions.unemployment_percentage,
      unemployment_amount: previsionalDeductions.unemployment_amount,
      
      // Impuestos
      income_tax_amount: incomeTax,
      
      // Otros Descuentos
      total_other_deductions: otherDeductions,
      
      // Costos Patronales (NUEVO)
      employer_costs: employerCosts,
      
      // Totales
      total_gross_income: totalGrossIncome,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      
      // Configuración
      calculation_config: this.settings,
      
      // Metadatos
      calculation_date: new Date().toISOString(),
      tope_imponible_exceeded: topeExceeded,
      warnings: [...this.warnings]
    };
  }

  /**
   * Calcula sueldo base proporcional según días trabajados
   */
  private calculateProportionalSalary(baseSalary: number, daysWorked: number): number {
    if (daysWorked >= 30) return baseSalary;
    return Math.round((baseSalary / 30) * daysWorked);
  }

  /**
   * Calcula total de haberes imponibles
   * ✅ NUEVA LÓGICA: Base imponible + Gratificación calculada sobre la base
   */
  private async calculateTaxableIncome(
    baseSalary: number,
    additional: AdditionalIncome,
    employee: EmployeeData
  ): Promise<{ totalTaxableIncome: number; calculatedArticle50Gratification: number }> {
    
    // Base para el cálculo de la gratificación.
    const baseForGratification = baseSalary + 
           (additional.overtime_amount || 0) + 
           (additional.bonuses || 0) + 
           (additional.commissions || 0);

    let legalGratificationArt50Amount = 0;
    if (employee.legal_gratification_type === 'article_50') {
      legalGratificationArt50Amount = await this.calculateArticle50GratificationFromBase(baseForGratification);
    }

    // El total imponible incluye la base, la gratificación legal, y cualquier otra gratificación si no es del Art. 50.
    const totalTaxableIncome = baseForGratification + 
                               legalGratificationArt50Amount + 
                               (employee.legal_gratification_type !== 'article_50' ? (additional.gratification || 0) : 0);

    return { totalTaxableIncome, calculatedArticle50Gratification: legalGratificationArt50Amount };
  }

  /**
   * Aplica tope imponible (87.8 UF)
   */
  private applyIncomeLimit(taxableIncome: number): { adjustedTaxableIncome: number; topeExceeded: boolean } {
    const topeImponible = this.settings.income_limits.uf_limit * CHILE_TAX_VALUES.UF;
    
    if (taxableIncome > topeImponible) {
      this.warnings.push(`Renta imponible excede tope de ${this.settings.income_limits.uf_limit} UF`);
      return { adjustedTaxableIncome: topeImponible, topeExceeded: true };
    }
    
    return { adjustedTaxableIncome: taxableIncome, topeExceeded: false };
  }

  /**
   * Calcula gratificación legal Art. 50 basada en la base imponible completa
   * 25% de la base imponible con tope de (4.75 ingresos mínimos anuales) ÷ 12
   * ✅ CORREGIDO: Usa el sueldo mínimo de la configuración del sistema.
   */
  private async calculateArticle50GratificationFromBase(baseImponible: number): Promise<number> {
    console.log('🔍 Calculando gratificación Art. 50 para base imponible:', baseImponible);
    
    const gratificationBase = baseImponible * 0.25; // 25% de la base imponible
    const minimumWage = this.settings.income_limits.minimum_wage || CHILE_TAX_VALUES.SUELDO_MINIMO_2025;
    const gratificationCapAnnual = minimumWage * 4.75; // Tope anual: 4.75 × sueldo mínimo
    const gratificationCapMonthly = Math.round(gratificationCapAnnual / 12); // Tope mensual redondeado
    
    const finalGratification = Math.min(gratificationBase, gratificationCapMonthly);
    
    console.log('🔍 Gratificación base (25% base imponible):', gratificationBase);
    console.log('🔍 Tope anual:', gratificationCapAnnual);
    console.log('🔍 Tope mensual:', gratificationCapMonthly);
    console.log('🔍 Gratificación final:', finalGratification);
    
    // Agregar información a warnings para transparencia
    if (gratificationBase > gratificationCapMonthly) {
      this.warnings.push(`ℹ️ Gratificación Art. 50 limitada: ${PayrollCalculator.formatCurrency(gratificationCapMonthly)} mensual (tope legal)`);
    } else {
      this.warnings.push(`ℹ️ Gratificación Art. 50: 25% de la base imponible = ${PayrollCalculator.formatCurrency(finalGratification)}`);
    }
    
    return Math.round(finalGratification);
  }

  /**
   * Calcula gratificación legal Art. 50 (método original para compatibilidad)
   * 25% del sueldo base mensual con tope de (4.75 ingresos mínimos anuales) ÷ 12 = $209.396
   * ✅ CORREGIDO: Tope mensual = tope anual ÷ 12
   */
  private async calculateArticle50Gratification(baseSalary: number): Promise<number> {
    console.log('🔍 Calculando gratificación Art. 50 para sueldo base:', baseSalary);
    
    const gratificationBase = baseSalary * 0.25; // 25% del sueldo base mensual
    const gratificationCapAnnual = 529000 * 4.75; // Tope anual: 4.75 × sueldo mínimo 2025
    const gratificationCapMonthly = Math.round(gratificationCapAnnual / 12); // Tope mensual redondeado
    
    const finalGratification = Math.min(gratificationBase, gratificationCapMonthly);
    
    console.log('🔍 Gratificación base (25% mensual):', gratificationBase);
    console.log('🔍 Tope anual:', gratificationCapAnnual);
    console.log('🔍 Tope mensual:', gratificationCapMonthly);
    console.log('🔍 Gratificación final:', finalGratification);
    
    // Agregar información a warnings para transparencia
    if (gratificationBase > gratificationCapMonthly) {
      this.warnings.push(`ℹ️ Gratificación Art. 50 limitada: ${PayrollCalculator.formatCurrency(gratificationCapMonthly)} mensual (tope legal)`);
    } else {
      this.warnings.push(`ℹ️ Gratificación Art. 50: 25% del sueldo base = ${PayrollCalculator.formatCurrency(finalGratification)}`);
    }
    
    return Math.round(finalGratification);
  }

  /**
   * Calcula asignación familiar según tramos
   * ✅ MEJORADO: Usa función centralizada con mejor lógica
   */
  private calculateFamilyAllowance(familyCharges: number, baseSalary: number): number {
    const familyAllowanceData = calculateFamilyAllowance(familyCharges, baseSalary);
    
    // Agregar información del tramo a warnings para transparencia
    if (familyCharges > 0 && familyAllowanceData.amount > 0) {
      this.warnings.push(`ℹ️ Asignación familiar: ${familyAllowanceData.bracket}`);
    }
    
    return familyAllowanceData.amount;
  }

  /**
   * Calcula total haberes no imponibles
   * ✅ NUEVA LÓGICA: Incluye asignación de caja
   */
  private calculateNonTaxableIncome(
    additional: AdditionalIncome,
    familyAllowance: number
  ): number {
    return (additional.food_allowance || 0) + 
           (additional.transport_allowance || 0) + 
           (additional.cash_allowance || 0) + 
           familyAllowance;
  }

  /**
   * Calcula todos los descuentos previsionales
   * ✅ MEJORADO: Usa función centralizada de cesantía
   */
  private calculatePrevisionalDeductions(
    taxableIncome: number,
    afpCode: string,
    healthCode: string,
    contractType: string
  ) {
    // ✅ DEBUG: Verificar qué AFP llega y qué configuración encuentra
    console.log(`🔍 DEBUG AFP - Código recibido: "${afpCode}"`);
    console.log(`🔍 DEBUG AFP - Configuraciones disponibles:`, this.settings.afp_configs?.map(afp => ({
      code: afp.code,
      commission: afp.commission_percentage
    })));
    
    // AFP - 10% obligatorio
    const afpAmount = Math.round(taxableIncome * (CHILE_TAX_VALUES.AFP_PERCENTAGE / 100));
    
    // Comisión AFP variable según administradora
    const afpConfig = this.settings.afp_configs.find(afp => afp.code === afpCode);
    console.log(`🔍 DEBUG AFP - Configuración encontrada:`, afpConfig);
    
    const afpCommissionPercentage = afpConfig?.commission_percentage || 0.58; // ✅ CAMBIÉ DEFAULT a 0.58
    console.log(`🔍 DEBUG AFP - Comisión final: ${afpCommissionPercentage}%`);
    
    const afpCommissionAmount = Math.round(taxableIncome * (afpCommissionPercentage / 100));
    
    // Salud - 7% mínimo (puede ser más en ISAPRE)
    const healthAmount = Math.round(taxableIncome * (CHILE_TAX_VALUES.HEALTH_PERCENTAGE / 100));
    
    // ✅ CESANTÍA - Usa función centralizada corregida
    const unemploymentData = calculateUnemploymentInsurance(
      taxableIncome, 
      contractType as 'indefinido' | 'plazo_fijo' | 'obra_faena'
    );
    
    return {
      afp_amount: afpAmount,
      afp_commission_percentage: afpCommissionPercentage,
      afp_commission_amount: afpCommissionAmount,
      health_amount: healthAmount,
      unemployment_percentage: unemploymentData.percentage,
      unemployment_amount: unemploymentData.amount,
      total: afpAmount + afpCommissionAmount + healthAmount + unemploymentData.amount // SIS REMOVIDO
    };
  }

  /**
   * Calcula impuesto único segunda categoría
   * ✅ MEJORADO: Usa función centralizada con tabla oficial completa
   */
  private calculateIncomeTax(taxableIncome: number): number {
    const incomeTaxData = calculateIncomeTax(taxableIncome);
    
    // Agregar información del tramo a warnings para transparencia
    if (incomeTaxData.amount > 0) {
      this.warnings.push(`ℹ️ Impuesto segunda categoría: Tramo ${incomeTaxData.bracket}`);
    }
    
    return incomeTaxData.amount;
  }

  /**
   * Calcula costos patronales (SIS, cesantía empleador, mutual)
   * ✅ NUEVO: SIS es costo del empleador, no descuento del trabajador
   */
  private calculateEmployerCosts(
    taxableIncome: number,
    afpCode: string,
    contractType: string
  ) {
    // SIS - 1.88% sobre renta imponible (costo empleador)
    const sisAmount = Math.round(taxableIncome * (CHILE_TAX_VALUES.SIS_PERCENTAGE / 100));
    
    // Cesantía empleador según tipo contrato
    const unemploymentEmployerRate = contractType === 'indefinido' ? 2.4 : 3.0; // 2.4% indefinido, 3.0% plazo fijo
    const unemploymentEmployer = Math.round(taxableIncome * (unemploymentEmployerRate / 100));
    
    // Mutual de seguridad (aproximado 0.95% - varía por empresa)
    const mutualInsurance = Math.round(taxableIncome * 0.0095);
    
    return {
      sis_amount: sisAmount,
      unemployment_employer: unemploymentEmployer,
      mutual_insurance: mutualInsurance,
      total: sisAmount + unemploymentEmployer + mutualInsurance
    };
  }

  /**
   * Calcula otros descuentos
   */
  private calculateOtherDeductions(additional: AdditionalDeductions): number {
    return (additional.loan_deductions || 0) + 
           (additional.advance_payments || 0) + 
           (additional.apv_amount || 0) + 
           (additional.other_deductions || 0);
  }

  /**
   * Valida que descuentos no excedan 45% del total
   */
  private validateDeductionLimit(grossIncome: number, totalDeductions: number): void {
    const deductionPercentage = (totalDeductions / grossIncome) * 100;
    
    if (deductionPercentage > CHILE_TAX_VALUES.MAX_DEDUCTION_PERCENTAGE) {
      this.warnings.push(
        `Descuentos (${deductionPercentage.toFixed(1)}%) exceden límite legal del 45%`
      );
    }
  }

  /**
   * Formatea montos a formato chileno
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Formatea período YYYY-MM
   */
  static formatPeriod(year: number, month: number): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[month - 1]} ${year}`;
  }
}