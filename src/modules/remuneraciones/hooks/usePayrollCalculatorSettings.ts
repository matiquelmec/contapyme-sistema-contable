/**
 * Hook para obtener configuración dinámica para la calculadora de liquidaciones
 * Convierte la configuración de payroll_settings al formato que espera PayrollCalculator
 */

import { useState, useEffect, useCallback } from 'react';
import type { PayrollSettings } from '@/lib/services/payrollCalculator';

interface UsePayrollCalculatorSettingsReturn {
  settings: PayrollSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePayrollCalculatorSettings(companyId: string): UsePayrollCalculatorSettingsReturn {
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!companyId) {
      setError('Company ID es requerido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Obteniendo configuración para calculadora...');
      
      const response = await fetch(`/api/payroll/settings?company_id=${companyId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      if (data.success && data.data) {
        const rawSettings = data.data;
        
        // ✅ CONVERTIR al formato que espera PayrollCalculator
        const calculatorSettings: PayrollSettings = {
          afp_configs: rawSettings.afp_configs?.map((afp: any) => ({
            code: afp.code,
            commission_percentage: afp.commission_percentage,
            sis_percentage: afp.sis_percentage || 1.15
          })) || [],
          
          family_allowances: {
            tramo_a: rawSettings.family_allowances?.tramo_a || 13596,
            tramo_b: rawSettings.family_allowances?.tramo_b || 8397,
            tramo_c: rawSettings.family_allowances?.tramo_c || 2798
          },
          
          income_limits: {
            uf_limit: rawSettings.income_limits?.uf_limit || 83.4,
            minimum_wage: rawSettings.income_limits?.minimum_wage || 529000,
            family_allowance_limit: rawSettings.income_limits?.family_allowance_limit || 1000000
          }
        };
        
        setSettings(calculatorSettings);
        console.log(`✅ Configuración para calculadora obtenida: ${calculatorSettings.afp_configs.length} AFP configuradas`);
      } else {
        throw new Error(data.error || 'No se encontró configuración');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar configuración';
      setError(errorMessage);
      console.error('❌ Error obteniendo configuración para calculadora:', err);
      
      // ✅ FALLBACK: Configuración por defecto si hay error
      const defaultSettings: PayrollSettings = {
        afp_configs: [
          { code: 'CAPITAL', commission_percentage: 1.44, sis_percentage: 1.15 },
          { code: 'CUPRUM', commission_percentage: 1.48, sis_percentage: 1.15 },
          { code: 'HABITAT', commission_percentage: 1.27, sis_percentage: 1.15 },
          { code: 'PLANVITAL', commission_percentage: 1.16, sis_percentage: 1.15 },
          { code: 'PROVIDA', commission_percentage: 1.69, sis_percentage: 1.15 },
          { code: 'MODELO', commission_percentage: 0.58, sis_percentage: 1.15 },
          { code: 'UNO', commission_percentage: 0.69, sis_percentage: 1.15 }
        ],
        family_allowances: {
          tramo_a: 13596,
          tramo_b: 8397,
          tramo_c: 2798
        },
        income_limits: {
          uf_limit: 83.4,
          minimum_wage: 529000,
          family_allowance_limit: 1000000
        }
      };
      
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings
  };
}