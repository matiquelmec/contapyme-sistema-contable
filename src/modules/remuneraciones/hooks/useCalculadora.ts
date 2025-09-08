'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PayrollCalculator, type EmployeeData, type PayrollPeriod, type AdditionalIncome, type AdditionalDeductions, type LiquidationResult } from '../services/calculadorService';
import { CHILEAN_PAYROLL_CONFIG } from '../constants/parametrosLegales';
import { usePayrollCalculatorSettings } from './usePayrollCalculatorSettings';
import { useCompanyId } from '@/contexts/CompanyContext';

interface LiveCalculationData {
  employee?: EmployeeData;
  period: PayrollPeriod;
  additionalIncome: AdditionalIncome;
  additionalDeductions: AdditionalDeductions;
}

interface LiveCalculationResult {
  result: LiquidationResult | null;
  isCalculating: boolean;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  configurationStatus: 'loading' | 'default' | 'custom';
}

/**
 * Hook para cálculo de liquidaciones en tiempo real
 * Recalcula automáticamente cuando cambian los datos
 */
export function useLivePayrollCalculation(data: LiveCalculationData): LiveCalculationResult {
  const [result, setResult] = useState<LiquidationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // ✅ OPTIMIZACIÓN: Cache de configuración
  const companyId = useCompanyId();
  const { settings: dynamicSettings, loading: settingsLoading, error: settingsError } = usePayrollCalculatorSettings(companyId);

  // ✅ MEJORADO: Crear calculadora con configuración dinámica o fallback
  const calculator = useMemo(() => {
    const configToUse = dynamicSettings || CHILEAN_PAYROLL_CONFIG;
    console.log(`🧮 Creando calculadora con configuración ${dynamicSettings ? 'DINÁMICA' : 'POR DEFECTO'}`);
    return new PayrollCalculator(configToUse);
  }, [dynamicSettings]);

  // Status de configuración para UI
  const configurationStatus = useMemo(() => {
    if (settingsLoading) return 'loading';
    if (dynamicSettings && !settingsError) return 'custom';
    return 'default';
  }, [settingsLoading, dynamicSettings, settingsError]);

  // Validar datos de entrada
  const validationResult = useMemo(() => {
    const newErrors: string[] = [];
    const newWarnings: string[] = [];

    if (!data.employee) {
      newErrors.push('Debe seleccionar un empleado');
    }

    if (data.period.days_worked <= 0) {
      newErrors.push('Días trabajados debe ser mayor a 0');
    }

    if (data.period.days_worked > 31) {
      newErrors.push('Días trabajados no puede ser mayor a 31');
    }

    if (data.period.month < 1 || data.period.month > 12) {
      newErrors.push('Mes debe estar entre 1 y 12');
    }

    if (data.period.year < 2020 || data.period.year > 2030) {
      newErrors.push('Año debe estar entre 2020 y 2030');
    }

    // Validaciones de montos negativos
    Object.entries(data.additionalIncome).forEach(([key, value]) => {
      if (value && value < 0) {
        newErrors.push(`${key} no puede ser negativo`);
      }
    });

    Object.entries(data.additionalDeductions).forEach(([key, value]) => {
      if (value && value < 0) {
        newErrors.push(`${key} no puede ser negativo`);
      }
    });

    // Advertencias
    if (data.employee?.contract_type === 'plazo_fijo') {
      newWarnings.push('ℹ️ Contrato plazo fijo: Sin seguro de cesantía');
    }

    if (data.period.days_worked < 30) {
      newWarnings.push(`⚠️ Período parcial: Solo ${data.period.days_worked} días trabajados`);
    }

    if (data.employee && data.employee.base_salary > 3000000) {
      newWarnings.push('⚠️ Sueldo alto: Verificar tope imponible');
    }

    return {
      errors: newErrors,
      warnings: newWarnings,
      isValid: newErrors.length === 0 && !!data.employee
    };
  }, [data]);

  // Función de cálculo con debounce
  const calculateLiquidation = useCallback(async () => {
    if (!validationResult.isValid || !data.employee) {
      setResult(null);
      return;
    }

    setIsCalculating(true);
    
    try {
      const liquidationResult = await calculator.calculateLiquidation(
        data.employee,
        data.period,
        data.additionalIncome,
        data.additionalDeductions
      );

      setResult(liquidationResult);
    } catch (error) {
      console.error('Error calculating liquidation:', error);
      setResult(null);
    } finally {
      setIsCalculating(false);
    }
  }, [data, calculator, validationResult.isValid]);

  // Actualizar errores y warnings
  useEffect(() => {
    setErrors(validationResult.errors);
    setWarnings(validationResult.warnings);
  }, [validationResult.errors, validationResult.warnings]);

  // Recalcular con debounce cuando cambian los datos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const runCalculation = async () => {
        if (validationResult.isValid) {
          await calculateLiquidation();
        } else {
          setResult(null);
          setIsCalculating(false);
        }
      };
      
      runCalculation().catch(console.error);
    }, 500); // ✅ OPTIMIZACIÓN: Debounce aumentado a 500ms

    return () => clearTimeout(timeoutId);
  }, [calculateLiquidation, validationResult.isValid]);

  return {
    result,
    isCalculating,
    errors,
    warnings,
    isValid: validationResult.isValid,
    configurationStatus // ✅ NUEVO: Estado de configuración
  };
}

/**
 * Hook auxiliar para formatear moneda chilena
 */
export function useChileanCurrency() {
  return useCallback((amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);
}

/**
 * Hook para obtener información de contratos
 */
export function useContractTypeInfo() {
  return useCallback((contractType: string) => {
    const info = {
      indefinido: {
        name: 'Indefinido',
        unemployment: true,
        color: 'text-green-600',
        description: 'Con seguro de cesantía (0.6%)'
      },
      plazo_fijo: {
        name: 'Plazo Fijo',
        unemployment: false,
        color: 'text-blue-600',
        description: 'Sin seguro de cesantía'
      },
      obra_faena: {
        name: 'Obra o Faena',
        unemployment: false,
        color: 'text-purple-600',
        description: 'Sin seguro de cesantía'
      }
    };

    return info[contractType as keyof typeof info] || info.indefinido;
  }, []);
}