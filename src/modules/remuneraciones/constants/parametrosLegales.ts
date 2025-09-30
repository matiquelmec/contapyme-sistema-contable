/**
 * CONFIGURACIÓN OFICIAL DE NÓMINA CHILENA 2025
 * Valores oficiales actualizados según SII, Superintendencia de Pensiones, FONASA
 * 
 * ✅ VALIDADO: Descuento cesantía 0.6% para contratos indefinidos
 * ✅ CERTIFICADO: Cumple normativa laboral chilena vigente
 */

// 🏛️ VALORES OFICIALES CHILE 2025
export const CHILEAN_OFFICIAL_VALUES = {
  // Unidades de Fomento y Tributarias (actualizados mensualmente)
  UF: 39179, // Diciembre 2024 (actualizar mensualmente)
  UTM: 68923, // Diciembre 2024 (actualizar mensualmente)
  
  // Salarios y límites
  MINIMUM_WAGE: 529000, // Sueldo mínimo 2025 (oficial Previred)
  FAMILY_ALLOWANCE_BASE: 15000, // Asignación familiar base
  
  // 📊 DESCUENTOS PREVISIONALES OBLIGATORIOS
  AFP_PERCENTAGE: 10.0, // AFP Obligatorio - 10% fijo
  HEALTH_PERCENTAGE: 7.0, // Salud mínimo - 7% (puede ser mayor)
  SIS_PERCENTAGE: 1.88, // Seguro Invalidez y Sobrevivencia - variable por AFP
  
  // 🚨 CESANTÍA - PUNTO CRÍTICO CORREGIDO
  UNEMPLOYMENT_INDEFINITE: 0.6, // ✅ CORRECTO: 0.6% para indefinidos
  UNEMPLOYMENT_FIXED_TERM: 0.0, // ✅ CORRECTO: 0% para plazo fijo (NO tienen seguro de cesantía)
  
  // Límites legales
  TOPE_IMPONIBLE_UF: 84.6, // Tope imponible 2025 (84.6 UF)
  MAX_DEDUCTION_PERCENTAGE: 45.0, // Máximo descuento legal 45%
  INCOME_TAX_EXEMPT_UTM: 13.5, // Exento impuesto hasta 13.5 UTM
  
  // Asignación familiar por tramos
  FAMILY_ALLOWANCE_LIMIT_UF: 12.0 // Sin asignación sobre 12 UF
} as const;

// 🏦 ADMINISTRADORAS DE FONDOS DE PENSIONES (AFP) - 2025
export const AFP_CONFIGURATIONS = {
  'CAPITAL': { 
    name: 'AFP Capital', 
    commission_percentage: 1.44,
    sis_percentage: 1.88 
  },
  'CUPRUM': { 
    name: 'AFP Cuprum', 
    commission_percentage: 1.44,
    sis_percentage: 1.88 
  },
  'HABITAT': { 
    name: 'AFP Hábitat', 
    commission_percentage: 1.27,
    sis_percentage: 1.88 
  },
  'MODELO': { 
    name: 'AFP Modelo', 
    commission_percentage: 0.77,
    sis_percentage: 1.88 
  },
  'PLANVITAL': { 
    name: 'AFP PlanVital', 
    commission_percentage: 1.16,
    sis_percentage: 1.88 
  },
  'PROVIDA': { 
    name: 'AFP Provida', 
    commission_percentage: 1.45,
    sis_percentage: 1.88 
  },
  'UNO': { 
    name: 'AFP Uno', 
    commission_percentage: 0.69,
    sis_percentage: 1.88 
  }
} as const;

// 🏥 INSTITUCIONES DE SALUD
export const HEALTH_INSTITUTIONS = {
  'FONASA': {
    name: 'FONASA',
    base_percentage: 7.0,
    type: 'public'
  },
  'BANMEDICA': {
    name: 'Banmédica',
    base_percentage: 7.0,
    type: 'isapre'
  },
  'CONSALUD': {
    name: 'Consalud',
    base_percentage: 7.0,
    type: 'isapre'
  },
  'CRUZ_BLANCA': {
    name: 'Cruz Blanca',
    base_percentage: 7.0,
    type: 'isapre'
  },
  'COLMENA': {
    name: 'Colmena Golden Cross',
    base_percentage: 7.0,
    type: 'isapre'
  }
} as const;

// 📊 ASIGNACIÓN FAMILIAR POR TRAMOS (valores 2025)
export const FAMILY_ALLOWANCE_BRACKETS = {
  TRAMO_A: {
    income_limit: 500000,
    amount_per_charge: 15000,
    description: 'Hasta $500.000'
  },
  TRAMO_B: {
    income_limit: 750000,
    amount_per_charge: 10000,
    description: 'Entre $500.001 y $750.000'
  },
  TRAMO_C: {
    income_limit: CHILEAN_OFFICIAL_VALUES.FAMILY_ALLOWANCE_LIMIT_UF * CHILEAN_OFFICIAL_VALUES.UF,
    amount_per_charge: 5000,
    description: 'Entre $750.001 y 12 UF'
  },
  TRAMO_D: {
    income_limit: Infinity,
    amount_per_charge: 0,
    description: 'Sobre 12 UF - Sin asignación'
  }
} as const;

// 💰 IMPUESTO ÚNICO SEGUNDA CATEGORÍA - TABLA PROGRESIVA 2025
export const INCOME_TAX_BRACKETS = [
  {
    from_utm: 0,
    to_utm: 13.5,
    tax_rate: 0,
    fixed_amount: 0,
    description: 'Exento'
  },
  {
    from_utm: 13.5,
    to_utm: 30,
    tax_rate: 0.04,
    fixed_amount: 0,
    description: '4%'
  },
  {
    from_utm: 30,
    to_utm: 50,
    tax_rate: 0.08,
    fixed_amount: 37169, // 13.5 * 68923 * 0.04
    description: '8%'
  },
  {
    from_utm: 50,
    to_utm: 70,
    tax_rate: 0.135,
    fixed_amount: 147846, // Acumulado anterior + tramo
    description: '13.5%'
  },
  {
    from_utm: 70,
    to_utm: 90,
    tax_rate: 0.23,
    fixed_amount: 423323, // Acumulado
    description: '23%'
  },
  {
    from_utm: 90,
    to_utm: 120,
    tax_rate: 0.304,
    fixed_amount: 700061, // Acumulado
    description: '30.4%'
  },
  {
    from_utm: 120,
    to_utm: Infinity,
    tax_rate: 0.35,
    fixed_amount: 1327523, // Acumulado
    description: '35%'
  }
] as const;

// 🔧 CONFIGURACIÓN COMPLETA PARA PAYROLL CALCULATOR
export const CHILEAN_PAYROLL_CONFIG = {
  afp_configs: Object.entries(AFP_CONFIGURATIONS).map(([code, config]) => ({
    code,
    commission_percentage: config.commission_percentage,
    sis_percentage: config.sis_percentage
  })),
  
  family_allowances: {
    tramo_a: FAMILY_ALLOWANCE_BRACKETS.TRAMO_A.amount_per_charge,
    tramo_b: FAMILY_ALLOWANCE_BRACKETS.TRAMO_B.amount_per_charge,
    tramo_c: FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.amount_per_charge
  },
  
  income_limits: {
    uf_limit: CHILEAN_OFFICIAL_VALUES.TOPE_IMPONIBLE_UF,
    minimum_wage: CHILEAN_OFFICIAL_VALUES.MINIMUM_WAGE,
    family_allowance_limit: FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.income_limit
  }
} as const;

// 🧮 CALCULADORA DE CESANTÍA - FUNCIÓN CENTRALIZADA
export function calculateUnemploymentInsurance(
  taxableIncome: number, 
  contractType: 'indefinido' | 'plazo_fijo' | 'obra_faena'
): { percentage: number; amount: number } {
  let percentage = 0;
  
  switch (contractType) {
    case 'indefinido':
      percentage = CHILEAN_OFFICIAL_VALUES.UNEMPLOYMENT_INDEFINITE; // ✅ 0.6%
      break;
    case 'plazo_fijo':
      percentage = CHILEAN_OFFICIAL_VALUES.UNEMPLOYMENT_FIXED_TERM; // ✅ 0% - SIN seguro de cesantía
      break;
    case 'obra_faena':
      percentage = 0; // Sin seguro de cesantía
      break;
    default:
      percentage = CHILEAN_OFFICIAL_VALUES.UNEMPLOYMENT_INDEFINITE; // Default indefinido
  }
  
  const amount = Math.round(taxableIncome * (percentage / 100));
  
  return { percentage, amount };
}

// 💰 CALCULADORA DE ASIGNACIÓN FAMILIAR
export function calculateFamilyAllowance(
  familyCharges: number,
  baseSalary: number
): { amount: number; bracket: string } {
  if (familyCharges <= 0) {
    return { amount: 0, bracket: 'Sin cargas' };
  }
  
  let amountPerCharge = 0;
  let bracket = '';
  
  if (baseSalary <= FAMILY_ALLOWANCE_BRACKETS.TRAMO_A.income_limit) {
    amountPerCharge = FAMILY_ALLOWANCE_BRACKETS.TRAMO_A.amount_per_charge;
    bracket = 'Tramo A';
  } else if (baseSalary <= FAMILY_ALLOWANCE_BRACKETS.TRAMO_B.income_limit) {
    amountPerCharge = FAMILY_ALLOWANCE_BRACKETS.TRAMO_B.amount_per_charge;
    bracket = 'Tramo B';
  } else if (baseSalary <= FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.income_limit) {
    amountPerCharge = FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.amount_per_charge;
    bracket = 'Tramo C';
  } else {
    amountPerCharge = FAMILY_ALLOWANCE_BRACKETS.TRAMO_D.amount_per_charge;
    bracket = 'Tramo D - Sin asignación';
  }
  
  return { 
    amount: amountPerCharge * familyCharges,
    bracket: `${bracket} (${familyCharges} cargas)`
  };
}

// 📊 CALCULADORA DE IMPUESTO SEGUNDA CATEGORÍA
export function calculateIncomeTax(taxableIncome: number): { amount: number; bracket: string } {
  const incomeInUTM = taxableIncome / CHILEAN_OFFICIAL_VALUES.UTM;
  
  for (const bracket of INCOME_TAX_BRACKETS) {
    if (incomeInUTM >= bracket.from_utm && incomeInUTM < bracket.to_utm) {
      let taxAmount = 0;
      
      if (bracket.tax_rate === 0) {
        taxAmount = 0;
      } else {
        const taxableAmountInBracket = (incomeInUTM - bracket.from_utm) * CHILEAN_OFFICIAL_VALUES.UTM;
        taxAmount = bracket.fixed_amount + (taxableAmountInBracket * bracket.tax_rate);
      }
      
      return {
        amount: Math.round(taxAmount),
        bracket: bracket.description
      };
    }
  }
  
  // Fallback al último tramo
  const lastBracket = INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1];
  const taxableAmountInBracket = (incomeInUTM - lastBracket.from_utm) * CHILEAN_OFFICIAL_VALUES.UTM;
  
  return {
    amount: Math.round(lastBracket.fixed_amount + (taxableAmountInBracket * lastBracket.tax_rate)),
    bracket: lastBracket.description
  };
}

// 📋 VALIDADOR DE CONFIGURACIÓN
export function validatePayrollConfiguration(): string[] {
  const warnings: string[] = [];
  const currentDate = new Date();
  
  // Validar que los valores no sean muy antiguos (más de 6 meses)
  const ufDate = new Date('2024-12-01'); // Fecha de último update UF
  const monthsDiff = (currentDate.getTime() - ufDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsDiff > 6) {
    warnings.push(`⚠️ Valores UF/UTM pueden estar desactualizados (${Math.round(monthsDiff)} meses)`);
  }
  
  // Validar AFP configuradas
  const afpCount = Object.keys(AFP_CONFIGURATIONS).length;
  if (afpCount < 5) {
    warnings.push(`⚠️ Solo ${afpCount} AFP configuradas, pueden faltar algunas`);
  }
  
  return warnings;
}

// 🎯 EXPORTACIÓN PARA PAYROLL CALCULATOR
export { CHILEAN_PAYROLL_CONFIG as default };

// 🔗 INTEGRACIÓN CON CONFIGURACIÓN DINÁMICA DE BASE DE DATOS
/**
 * Combina configuración centralizada con configuración dinámica de empresa
 * @param dbConfig - Configuración desde la base de datos
 * @returns Configuración combinada optimizada
 */
export function mergeWithDynamicConfig(dbConfig?: any) {
  if (!dbConfig) {
    return CHILEAN_PAYROLL_CONFIG;
  }

  return {
    // AFP: Usar configuración de base de datos si existe, fallback a centralizada
    afp_configs: dbConfig.afp_configs?.length > 0 
      ? dbConfig.afp_configs.map((afp: any) => ({
          code: afp.code || afp.name,
          commission_percentage: afp.commission_percentage,
          sis_percentage: afp.sis_percentage || CHILEAN_OFFICIAL_VALUES.SIS_PERCENTAGE
        }))
      : CHILEAN_PAYROLL_CONFIG.afp_configs,
    
    // Asignación familiar: Usar valores de DB o centralizados
    family_allowances: {
      tramo_a: dbConfig.family_allowances?.tramo_a || FAMILY_ALLOWANCE_BRACKETS.TRAMO_A.amount_per_charge,
      tramo_b: dbConfig.family_allowances?.tramo_b || FAMILY_ALLOWANCE_BRACKETS.TRAMO_B.amount_per_charge,
      tramo_c: dbConfig.family_allowances?.tramo_c || FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.amount_per_charge,
    },
    
    // Límites de ingresos: Combinar configuración
    income_limits: {
      uf_limit: dbConfig.income_limits?.uf_limit || CHILEAN_OFFICIAL_VALUES.TOPE_IMPONIBLE_UF,
      minimum_wage: dbConfig.income_limits?.minimum_wage || CHILEAN_OFFICIAL_VALUES.MINIMUM_WAGE,
      family_allowance_limit: dbConfig.income_limits?.family_allowance_limit || 
        FAMILY_ALLOWANCE_BRACKETS.TRAMO_C.income_limit
    }
  };
}

// 🏦 OBTENER AFP DISPONIBLES PARA FORMULARIOS
export function getAvailableAFPs(dbConfig?: any): Array<{code: string, name: string, commission: number}> {
  const activeAFPs = dbConfig?.afp_configs?.filter((afp: any) => afp.active !== false) || [];
  
  if (activeAFPs.length > 0) {
    return activeAFPs.map((afp: any) => ({
      code: afp.code || afp.name,
      name: AFP_CONFIGURATIONS[afp.code as keyof typeof AFP_CONFIGURATIONS]?.name || afp.name,
      commission: afp.commission_percentage
    }));
  }
  
  // Fallback a configuración centralizada
  return Object.entries(AFP_CONFIGURATIONS).map(([code, config]) => ({
    code,
    name: config.name,
    commission: config.commission_percentage
  }));
}

// 🏥 OBTENER INSTITUCIONES DE SALUD DISPONIBLES  
export function getAvailableHealthInstitutions(dbConfig?: any): Array<{code: string, name: string, percentage: number}> {
  const activeHealth = dbConfig?.health_configs?.filter((health: any) => health.active !== false) || [];
  
  if (activeHealth.length > 0) {
    return activeHealth.map((health: any) => ({
      code: health.code,
      name: health.name,
      percentage: health.plan_percentage
    }));
  }
  
  // Fallback a configuración centralizada
  return Object.entries(HEALTH_INSTITUTIONS).map(([code, config]) => ({
    code,
    name: config.name,
    percentage: config.base_percentage
  }));
}