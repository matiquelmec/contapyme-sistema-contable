/**
 * Hook personalizado para obtener opciones dinámicas de AFP e ISAPRE
 * Conecta configuración de empresa con formularios de empleados
 * ✅ MEJORADO: Ahora obtiene datos directamente de payroll_settings
 */

import { useState, useEffect } from 'react';

interface AFPOption {
  code: string;
  name: string;
  commission_percentage: number;
  sis_percentage: number;
  display_name: string;
  active: boolean;
}

interface HealthOption {
  code: string;
  name: string;
  plan_percentage: number;
  display_name: string;
  active: boolean;
}

interface PayrollOptions {
  afp_options: AFPOption[];
  health_options: HealthOption[];
  has_custom_config: boolean;
  last_updated: string;
}

interface UsePayrollOptionsReturn {
  options: PayrollOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePayrollOptions(companyId: string): UsePayrollOptionsReturn {
  const [options, setOptions] = useState<PayrollOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = async () => {
    if (!companyId) {
      setError('Company ID es requerido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Obteniendo configuración de AFP y salud desde settings...');
      
      // Obtener la configuración directamente desde payroll_settings
      const response = await fetch(`/api/payroll/settings?company_id=${companyId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      if (data.success && data.data) {
        const settings = data.data;
        
        // Transformar la configuración al formato esperado por el formulario
        const formattedOptions: PayrollOptions = {
          afp_options: settings.afp_configs
            ?.filter((afp: any) => afp.active !== false)
            .map((afp: any) => ({
              code: afp.code,
              name: afp.name,
              commission_percentage: afp.commission_percentage,
              sis_percentage: afp.sis_percentage || 1.88,
              display_name: `${afp.name} (${afp.commission_percentage}% + SIS ${afp.sis_percentage || 1.88}%)`,
              active: afp.active
            })) || [],
          
          health_options: settings.health_configs
            ?.filter((health: any) => health.active !== false)
            .map((health: any) => ({
              code: health.code,
              name: health.name,
              plan_percentage: health.plan_percentage || 7.0,
              display_name: health.name === 'FONASA' 
                ? `${health.name} (7% obligatorio)`
                : `${health.name} (${health.plan_percentage || 7.0}% mínimo)`,
              active: health.active
            })) || [],
          
          has_custom_config: true,
          last_updated: new Date().toISOString()
        };
        
        setOptions(formattedOptions);
        console.log(`✅ Configuración obtenida: ${formattedOptions.afp_options.length} AFP activas, ${formattedOptions.health_options.length} instituciones de salud activas`);
      } else {
        throw new Error(data.error || 'No se encontró configuración');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar configuración';
      setError(errorMessage);
      console.error('❌ Error obteniendo configuración:', err);
      
      // Fallback a valores por defecto si hay error
      setOptions({
        afp_options: [
          { code: 'CAPITAL', name: 'AFP Capital', commission_percentage: 1.44, sis_percentage: 1.15, display_name: 'AFP Capital (1.44% + SIS 1.15%)', active: true },
          { code: 'CUPRUM', name: 'AFP Cuprum', commission_percentage: 1.48, sis_percentage: 1.15, display_name: 'AFP Cuprum (1.48% + SIS 1.15%)', active: true },
          { code: 'HABITAT', name: 'AFP Hábitat', commission_percentage: 1.27, sis_percentage: 1.15, display_name: 'AFP Hábitat (1.27% + SIS 1.15%)', active: true },
          { code: 'MODELO', name: 'AFP Modelo', commission_percentage: 0.58, sis_percentage: 1.15, display_name: 'AFP Modelo (0.58% + SIS 1.15%)', active: true },
          { code: 'PLANVITAL', name: 'AFP PlanVital', commission_percentage: 1.16, sis_percentage: 1.15, display_name: 'AFP PlanVital (1.16% + SIS 1.15%)', active: true },
          { code: 'PROVIDA', name: 'AFP ProVida', commission_percentage: 1.69, sis_percentage: 1.15, display_name: 'AFP ProVida (1.69% + SIS 1.15%)', active: true },
          { code: 'UNO', name: 'AFP Uno', commission_percentage: 0.69, sis_percentage: 1.15, display_name: 'AFP Uno (0.69% + SIS 1.15%)', active: true }
        ],
        health_options: [
          { code: 'FONASA', name: 'FONASA', plan_percentage: 7.0, display_name: 'FONASA (7% obligatorio)', active: true },
          { code: 'BANMEDICA', name: 'Banmédica', plan_percentage: 8.5, display_name: 'Banmédica (8.5% mínimo)', active: true },
          { code: 'CONSALUD', name: 'Consalud', plan_percentage: 8.2, display_name: 'Consalud (8.2% mínimo)', active: true },
          { code: 'CRUZ_BLANCA', name: 'Cruz Blanca', plan_percentage: 8.8, display_name: 'Cruz Blanca (8.8% mínimo)', active: true },
          { code: 'COLMENA', name: 'Colmena Golden Cross', plan_percentage: 8.6, display_name: 'Colmena Golden Cross (8.6% mínimo)', active: true },
          { code: 'VIDA_TRES', name: 'Vida Tres', plan_percentage: 8.3, display_name: 'Vida Tres (8.3% mínimo)', active: true }
        ],
        has_custom_config: false,
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [companyId]);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions
  };
}

// Hook adicional para obtener opciones específicas de AFP
export function useAFPOptions(companyId: string) {
  const { options, loading, error, refetch } = usePayrollOptions(companyId);
  
  return {
    afpOptions: options?.afp_options || [],
    loading,
    error,
    refetch
  };
}

// Hook adicional para obtener opciones específicas de salud
export function useHealthOptions(companyId: string) {
  const { options, loading, error, refetch } = usePayrollOptions(companyId);
  
  return {
    healthOptions: options?.health_options || [],
    loading,
    error,
    refetch
  };
}