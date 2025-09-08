'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Settings, Building2, Heart, Users, Calculator, Globe, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useCompanyId } from '@/contexts/CompanyContext';

interface AFPConfig {
  id: string;
  name: string;
  code: string;
  commission_percentage: number;
  sis_percentage: number;
  active: boolean;
}

interface HealthConfig {
  id: string;
  name: string;
  code: string;
  plan_percentage: number;
  active: boolean;
}

interface PayrollSettings {
  afp_configs: AFPConfig[];
  health_configs: HealthConfig[];
  income_limits: {
    uf_limit: number;
    minimum_wage: number;
    family_allowance_limit: number;
  };
  family_allowances: {
    tramo_a: number;
    tramo_b: number;
    tramo_c: number;
  };
  contributions: {
    unemployment_insurance_fixed: number;
    unemployment_insurance_indefinite: number;
    social_security_percentage: number;
    sis_percentage?: number;
  };
  company_info: {
    mutual_code: string;
    mutual_percentage?: number;
    caja_compensacion_code: string;
  };
}

export default function PayrollSettingsPage() {
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('afp');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [savingProgress, setSavingProgress] = useState(0);

  // ✅ Usar company ID dinámico desde contexto
  const companyId = useCompanyId();

  // 🛡️ MANEJO DE ERRORES ROBUSTO
  const handleError = (error: any, context: string) => {
    console.error(`❌ Error en ${context}:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      setError('❌ Error de conectividad - Verifique su conexión a internet');
    } else if (error.name === 'SyntaxError') {
      setError('❌ Error de respuesta del servidor - Intente nuevamente');
    } else if (error.message?.includes('timeout')) {
      setError('❌ Tiempo de espera agotado - El servidor tardó demasiado en responder');
    } else if (error.status === 400) {
      setError('❌ Datos inválidos - Revise la información ingresada');
    } else if (error.status === 401) {
      setError('❌ Sesión expirada - Por favor inicie sesión nuevamente');
    } else if (error.status === 403) {
      setError('❌ Sin permisos - No tiene autorización para realizar esta acción');
    } else if (error.status === 404) {
      setError('❌ Configuración no encontrada - Intente actualizar desde Previred');
    } else if (error.status === 500) {
      setError('❌ Error interno del servidor - Contacte al administrador');
    } else if (error.message) {
      setError(`❌ ${error.message}`);
    } else {
      setError(`❌ Error inesperado en ${context} - Intente nuevamente`);
    }
  };

  const withErrorHandling = async (operation: () => Promise<void>, context: string) => {
    try {
      await operation();
    } catch (error) {
      handleError(error, context);
    }
  };

  // 🎯 FUNCIONES PARA MEJORAR UX CON LOADING STATES
  const simulateProgress = (setProgress: (progress: number) => void, duration: number = 2000) => {
    setProgress(0);
    const steps = 20;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 90);
      setProgress(progress);
      
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
    
    return () => {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    };
  };

  // 🔍 FUNCIONES DE VALIDACIÓN COMPLETAS
  const validateAFPConfig = (afp: AFPConfig, index: number): string[] => {
    const errors: string[] = [];
    
    if (!afp.code || afp.code.trim() === '') {
      errors.push(`AFP ${index + 1}: Código es obligatorio`);
    }
    
    if (afp.commission_percentage < 0 || afp.commission_percentage > 5) {
      errors.push(`AFP ${index + 1}: Comisión debe estar entre 0% y 5%`);
    }
    
    if (afp.sis_percentage < 0 || afp.sis_percentage > 3) {
      errors.push(`AFP ${index + 1}: SIS debe estar entre 0% y 3%`);
    }
    
    return errors;
  };

  const validateHealthConfig = (health: HealthConfig, index: number): string[] => {
    const errors: string[] = [];
    
    if (!health.name || health.name.trim() === '') {
      errors.push(`Salud ${index + 1}: Nombre de institución es obligatorio`);
    }
    
    if (health.plan_percentage < 7 || health.plan_percentage > 15) {
      errors.push(`Salud ${index + 1}: Porcentaje debe estar entre 7% y 15%`);
    }
    
    return errors;
  };

  const validateIncomeLimit = (field: string, value: number): string | null => {
    switch (field) {
      case 'uf_limit':
        if (value <= 0 || value > 200) {
          return 'Tope UF debe estar entre 0 y 200';
        }
        break;
      case 'minimum_wage':
        if (value < 300000 || value > 1000000) {
          return 'Sueldo mínimo debe estar entre $300.000 y $1.000.000';
        }
        break;
      case 'family_allowance_limit':
        if (value < 500000 || value > 2000000) {
          return 'Límite asignación familiar debe estar entre $500.000 y $2.000.000';
        }
        break;
    }
    return null;
  };

  const validateFamilyAllowance = (field: string, value: number): string | null => {
    if (value < 0 || value > 50000) {
      return `${field}: Monto debe estar entre $0 y $50.000`;
    }
    return null;
  };

  const validateAllSettings = (): boolean => {
    if (!settings) return false;
    
    const errors: {[key: string]: string} = {};
    
    // Validar AFP configs
    settings.afp_configs.forEach((afp, index) => {
      const afpErrors = validateAFPConfig(afp, index);
      afpErrors.forEach(error => {
        errors[`afp_${index}`] = error;
      });
    });
    
    // Validar Health configs
    settings.health_configs.forEach((health, index) => {
      const healthErrors = validateHealthConfig(health, index);
      healthErrors.forEach(error => {
        errors[`health_${index}`] = error;
      });
    });
    
    // Validar Income limits
    const ufError = validateIncomeLimit('uf_limit', settings.income_limits?.uf_limit || 0);
    if (ufError) errors.uf_limit = ufError;
    
    const wageError = validateIncomeLimit('minimum_wage', settings.income_limits?.minimum_wage || 0);
    if (wageError) errors.minimum_wage = wageError;
    
    const familyLimitError = validateIncomeLimit('family_allowance_limit', settings.income_limits?.family_allowance_limit || 0);
    if (familyLimitError) errors.family_allowance_limit = familyLimitError;
    
    // Validar Family allowances
    const tramoAError = validateFamilyAllowance('Tramo A', settings.family_allowances?.tramo_a || 0);
    if (tramoAError) errors.tramo_a = tramoAError;
    
    const tramoBError = validateFamilyAllowance('Tramo B', settings.family_allowances?.tramo_b || 0);
    if (tramoBError) errors.tramo_b = tramoBError;
    
    const tramoCError = validateFamilyAllowance('Tramo C', settings.family_allowances?.tramo_c || 0);
    if (tramoCError) errors.tramo_c = tramoCError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🔧 OPTIMIZACIÓN: Referencias para timeouts seguros
  const timeouts = useRef({
    afp: null as NodeJS.Timeout | null,
    health: null as NodeJS.Timeout | null,
    family: null as NodeJS.Timeout | null,
    company: null as NodeJS.Timeout | null,
    limits: null as NodeJS.Timeout | null,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  // 🔧 OPTIMIZACIÓN: Cleanup de timeouts al desmontar
  useEffect(() => {
    return () => {
      // Limpiar todos los timeouts pendientes
      Object.values(timeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // 🔧 OPTIMIZACIÓN: Eliminado auto-guardado - Solo guardado manual
  // Ya no se usa debounce automático, solo actualización de estado local

  const fetchSettings = async () => {
    await withErrorHandling(async () => {
      setLoading(true);
      setError(null);
      
      // Iniciar simulación de progreso
      const finishProgress = simulateProgress(setLoadingProgress, 3000);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      try {
        const response = await fetch(`/api/payroll/settings?company_id=${companyId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw { status: response.status, message: errorData.error || `Error HTTP ${response.status}` };
        }

        const data = await response.json();
        
        if (data.success) {
          setSettings(data.data);
          finishProgress(); // Completar progreso
        } else {
          throw new Error(data.error || 'Error al cargar configuración');
        }
      } catch (fetchError: any) {
        finishProgress(); // Completar progreso incluso en error
        if (fetchError.name === 'AbortError') {
          throw new Error('timeout');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }, 'carga de configuración');
  };

  const updateSettings = async (updatedSettings: Partial<PayrollSettings>) => {
    await withErrorHandling(async () => {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      setValidationErrors({});

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos para operaciones de escritura

      try {
        const response = await fetch(`/api/payroll/settings?company_id=${companyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedSettings),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw { status: response.status, message: errorData.error || `Error HTTP ${response.status}` };
        }

        const data = await response.json();

        if (data.success) {
          setSettings(data.data);
          setSuccessMessage(data.message || '✅ Configuración actualizada exitosamente');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          throw new Error(data.error || 'Error al actualizar configuración');
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('timeout');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
        setSaving(false);
      }
    }, 'actualización de configuración');
  };

  // 🔧 OPTIMIZACIÓN: Manejo AFP - Solo actualización local con validación en tiempo real
  const handleAFPUpdate = useCallback((index: number, field: keyof AFPConfig, value: any) => {
    if (!settings) return;
    
    const updatedAFPs = [...settings.afp_configs];
    updatedAFPs[index] = { ...updatedAFPs[index], [field]: value };
    
    // Solo actualizar estado local - guardado manual
    const updatedSettings = { ...settings, afp_configs: updatedAFPs };
    setSettings(updatedSettings);
    
    // Validación en tiempo real
    const errors = validateAFPConfig(updatedAFPs[index], index);
    const newValidationErrors = { ...validationErrors };
    
    if (errors.length > 0) {
      newValidationErrors[`afp_${index}_${field}`] = errors[0];
    } else {
      delete newValidationErrors[`afp_${index}_${field}`];
    }
    
    setValidationErrors(newValidationErrors);
  }, [settings, validationErrors]);

  // 🔧 OPTIMIZACIÓN: Manejo Health - Solo actualización local
  const handleHealthUpdate = useCallback((index: number, field: keyof HealthConfig, value: any) => {
    if (!settings) return;
    
    const updatedHealth = [...settings.health_configs];
    updatedHealth[index] = { ...updatedHealth[index], [field]: value };
    
    // Solo actualizar estado local - guardado manual
    const updatedSettings = { ...settings, health_configs: updatedHealth };
    setSettings(updatedSettings);
  }, [settings]);

  // 🔧 OPTIMIZACIÓN: Manejo Family Allowance - Solo actualización local con validación
  const handleFamilyAllowanceUpdate = useCallback((field: string, value: number) => {
    if (!settings) return;
    
    const updatedAllowances = { ...settings.family_allowances, [field]: value };
    
    // Solo actualizar estado local - guardado manual
    const updatedSettings = { ...settings, family_allowances: updatedAllowances };
    setSettings(updatedSettings);
    
    // Validación en tiempo real
    const error = validateFamilyAllowance(field, value);
    const newValidationErrors = { ...validationErrors };
    
    if (error) {
      newValidationErrors[field] = error;
    } else {
      delete newValidationErrors[field];
    }
    
    setValidationErrors(newValidationErrors);
  }, [settings, validationErrors]);

  // 🔧 OPTIMIZACIÓN: Manejo Company Info - Actualización local y guardado automático
  const handleCompanyInfoUpdate = useCallback(async (field: string, value: string | number) => {
    if (!settings) return;
    
    const updatedCompanyInfo = { ...settings.company_info, [field]: value };
    
    // Actualizar estado local inmediatamente para UX responsiva
    const updatedSettings = { ...settings, company_info: updatedCompanyInfo };
    setSettings(updatedSettings);
    
    // Guardar en base de datos automáticamente
    try {
      const response = await fetch(`/api/payroll/settings?company_id=${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_info: updatedCompanyInfo }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Opcional: mostrar mensaje de éxito breve
        setSuccessMessage(`✅ ${field === 'mutual_percentage' ? 'Porcentaje mutual' : 'Configuración'} guardada correctamente`);
        setTimeout(() => setSuccessMessage(null), 2000);
      } else {
        throw new Error(data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      setError('Error al guardar la configuración');
      // Revertir cambio en caso de error
      setSettings(settings);
    }
  }, [settings, companyId]);

  // 🔧 OPTIMIZACIÓN: Manejo Income Limits - Solo actualización local con validación
  const handleIncomeLimit = useCallback((field: string, value: number) => {
    if (!settings) return;
    
    const updatedLimits = { ...settings.income_limits, [field]: value };
    
    // Solo actualizar estado local - guardado manual
    const updatedSettings = { ...settings, income_limits: updatedLimits };
    setSettings(updatedSettings);
    
    // Validación en tiempo real
    const error = validateIncomeLimit(field, value);
    const newValidationErrors = { ...validationErrors };
    
    if (error) {
      newValidationErrors[field] = error;
    } else {
      delete newValidationErrors[field];
    }
    
    setValidationErrors(newValidationErrors);
  }, [settings, validationErrors]);

  // 🔧 NUEVO: Manejo SIS Percentage - Solo actualización local con validación
  const handleSisPercentageUpdate = useCallback((value: number) => {
    if (!settings) return;
    
    const updatedContributions = { ...settings.contributions, sis_percentage: value };
    
    // Solo actualizar estado local - guardado manual
    const updatedSettings = { ...settings, contributions: updatedContributions };
    setSettings(updatedSettings);
    
    // Validación en tiempo real
    const error = value < 0 || value > 3 ? 'SIS debe estar entre 0% y 3%' : null;
    const newValidationErrors = { ...validationErrors };
    
    if (error) {
      newValidationErrors.sis_percentage = error;
    } else {
      delete newValidationErrors.sis_percentage;
    }
    
    setValidationErrors(newValidationErrors);
  }, [settings, validationErrors]);

  // ✅ NUEVO: Función para actualizar desde Previred
  const handlePreviredUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/payroll/settings?company_id=${companyId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);
        setSuccessMessage('✅ Configuración actualizada desde Previred exitosamente');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error || 'Error al actualizar desde Previred');
      }
    } catch (err) {
      setError('Error de conexión con Previred');
      console.error('Error updating from Previred:', err);
    } finally {
      setSaving(false);
    }
  };

  // ✅ NUEVO: Función para guardar toda la configuración con validación completa
  const handleSaveAll = async () => {
    if (!settings) return;
    
    // 🔍 VALIDACIÓN COMPLETA ANTES DE GUARDAR
    const isValid = validateAllSettings();
    if (!isValid) {
      setError('❌ Por favor corrija los errores de validación antes de guardar');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      setValidationErrors({});

      // Enviar toda la configuración actual
      const response = await fetch(`/api/payroll/settings?company_id=${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSettings(data.data);
        setSuccessMessage('✅ Toda la configuración guardada exitosamente - Validación completa aprobada');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(data.error || 'Error al guardar configuración completa');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error saving all settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <PayrollHeader 
          title="Configuración Previsional"
          subtitle="Cargando configuración..."
          showBackButton
        />
        <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center w-full max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 mb-4">Cargando configuración previsional...</p>
              
              {/* Barra de progreso */}
              <div className="w-full bg-white/30 backdrop-blur-sm rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {loadingProgress < 30 && "Conectando con servidor..."}
                {loadingProgress >= 30 && loadingProgress < 70 && "Obteniendo configuración AFP..."}
                {loadingProgress >= 70 && loadingProgress < 90 && "Cargando datos de salud..."}
                {loadingProgress >= 90 && "Finalizando..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PayrollHeader 
        title="Configuración Previsional"
        subtitle="Gestiona AFP, Salud, Topes y Descuentos"
        showBackButton
        actions={
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              size="md"
              onClick={handlePreviredUpdate}
              disabled={saving}
              className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Actualizando desde Previred...' : 'Actualizar desde Previred'}
            </Button>
            <Button 
              variant="primary" 
              size="md"
              onClick={handleSaveAll}
              disabled={saving || !settings || Object.keys(validationErrors).length > 0}
              className={`transition-colors duration-200 ${
                Object.keys(validationErrors).length > 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Guardando configuración...' : 'Guardar Todo'}
              {Object.keys(validationErrors).length > 0 && (
                <span className="ml-2 text-xs">({Object.keys(validationErrors).length} errores)</span>
              )}
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50/80 backdrop-blur-sm border border-green-200">
            <div className="flex items-center text-green-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {Object.keys(validationErrors).length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200">
            <div className="flex items-center text-red-700 mb-3">
              <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
              <span className="font-medium">Errores de Validación</span>
            </div>
            <p className="text-red-600 text-sm mb-3">
              Por favor corrija los siguientes errores antes de guardar:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {Object.entries(validationErrors).map(([key, error]) => (
                <li key={key} className="text-red-600 text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Tabs - Modern Style */}
        <div className="mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-2">
            <nav className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('afp')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'afp'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50/80 backdrop-blur-sm'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2" />
                AFP
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'health'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:text-green-700 hover:bg-green-50/80 backdrop-blur-sm'
                }`}
              >
                <Heart className="h-4 w-4 mr-2" />
                Salud
              </button>
              <button
                onClick={() => setActiveTab('limits')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'limits'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:text-orange-700 hover:bg-orange-50/80 backdrop-blur-sm'
                }`}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Topes e Imponibles
              </button>
              <button
                onClick={() => setActiveTab('family')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'family'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:text-purple-700 hover:bg-purple-50/80 backdrop-blur-sm'
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                Asignaciones Familiares
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'company'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50/80 backdrop-blur-sm'
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Empresa
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'afp' && settings && (
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <div className="border-b border-white/20 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Configuración AFP
                </h3>
                <p className="text-gray-600">
                  Administra las comisiones y porcentajes de las AFP disponibles
                </p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200/50">
                    <thead className="bg-gray-50/50 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AFP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/30 backdrop-blur-sm divide-y divide-gray-200/50">
                      {settings.afp_configs?.map((afp, index) => (
                        <tr key={afp.id} className="hover:bg-white/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{afp.name}</div>
                            <div className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-1">{afp.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                value={afp.commission_percentage}
                                onChange={(e) => handleAFPUpdate(index, 'commission_percentage', parseFloat(e.target.value))}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                              />
                              <span className="ml-2 text-sm font-medium text-gray-600">%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={afp.active}
                                onChange={(e) => handleAFPUpdate(index, 'active', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                                afp.active ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                  afp.active ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </div>
                              <span className={`ml-3 text-sm font-medium ${afp.active ? 'text-green-700' : 'text-gray-500'}`}>
                                {afp.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <Building2 className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm font-medium">No hay AFP configuradas</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50/80 backdrop-blur-sm rounded-2xl border border-blue-200/50 p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      Información Importante
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Los porcentajes se actualizan mensualmente según los indicadores oficiales de <strong>Previred</strong>. 
                      El descuento de AFP es del <strong>10%</strong> sobre el sueldo imponible más la <strong>comisión variable</strong> por AFP.
                    </p>
                    <div className="text-xs text-blue-700 bg-white rounded-md p-2 border border-blue-200">
                      <strong>SIS Empleador:</strong> El porcentaje SIS se configura centralmente en la pestaña "Topes e Imponibles" y aplica a todos los empleados.
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && settings && (
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <div className="border-b border-white/20 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Instituciones de Salud
                </h3>
                <p className="text-gray-600">
                  Administra las instituciones de salud y sus porcentajes de descuento
                </p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200/50">
                    <thead className="bg-gray-50/50 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institución</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/30 backdrop-blur-sm divide-y divide-gray-200/50">
                      {settings.health_configs?.map((health, index) => (
                        <tr key={health.id} className="hover:bg-white/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{health.name}</div>
                            <div className="text-sm text-gray-600 bg-green-50 px-2 py-1 rounded-md inline-block mt-1">{health.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                value={health.plan_percentage}
                                onChange={(e) => handleHealthUpdate(index, 'plan_percentage', parseFloat(e.target.value))}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                              />
                              <span className="ml-2 text-sm font-medium text-gray-600">%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={health.active}
                                onChange={(e) => handleHealthUpdate(index, 'active', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                                health.active ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                  health.active ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </div>
                              <span className={`ml-3 text-sm font-medium ${health.active ? 'text-green-700' : 'text-gray-500'}`}>
                                {health.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <Heart className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm font-medium">No hay instituciones de salud configuradas</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-green-50/80 backdrop-blur-sm rounded-2xl border border-green-200/50 p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 mb-2">
                      Sistema de Salud Chileno
                    </h4>
                    <p className="text-sm text-green-800 mb-3">
                      El descuento base es <strong>7%</strong> del sueldo imponible. Las ISAPRE pueden cobrar un plan adicional.
                      FONASA no cobra adicional (solo el 7% legal).
                    </p>
                    <div className="text-xs text-green-700 bg-white rounded-md p-2 border border-green-200">
                      <strong>Importante:</strong> Los porcentajes mostrados incluyen el 7% base más el adicional de cada institución.
                    </div>
                  </div>
                </div>
            </div>

            {/* Instituciones Comunes */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Instituciones Más Comunes en Chile
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Referencia de las principales instituciones de salud
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">FONASA (Público)</h4>
                    <p className="text-sm text-blue-800">
                      • Solo 7% legal (sin adicional)<br/>
                      • Más del 80% de la población<br/>
                      • Código: FONASA
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">ISAPRE (Privadas)</h4>
                    <p className="text-sm text-purple-800">
                      • 7% + plan adicional<br/>
                      • Principales: Colmena, Banmédica, Cruz Blanca<br/>
                      • Planes desde 7.5% a 12%+
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'limits' && settings && (
          <div className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Topes Imponibles
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Límites de renta para cálculos previsionales (valores en UF y CLP)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tope Imponible AFP/Salud (UF)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={settings.income_limits?.uf_limit || 83.4}
                        onChange={(e) => handleIncomeLimit('uf_limit', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-sm text-gray-500">UF</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Máximo imponible mensual para AFP y Salud
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sueldo Mínimo (CLP)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settings.income_limits?.minimum_wage || 500000}
                        onChange={(e) => handleIncomeLimit('minimum_wage', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-sm text-gray-500">CLP</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Sueldo mínimo mensual vigente
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Límite Asignación Familiar (CLP)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settings.income_limits?.family_allowance_limit || 1000000}
                        onChange={(e) => handleIncomeLimit('family_allowance_limit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-sm text-gray-500">CLP</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Límite superior para recibir asignación familiar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contributions Card */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Cotizaciones y Descuentos
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Porcentajes de cotizaciones obligatorias
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seguro Cesantía Indefinido (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.contributions?.unemployment_insurance_indefinite || 0.6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Para contratos indefinidos (trabajador)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seguro Cesantía Plazo Fijo (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.contributions?.unemployment_insurance_fixed || 3.0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Para contratos plazo fijo (trabajador)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cotización Básica AFP (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={10.0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Cotización obligatoria AFP (fija)
                    </p>
                  </div>
                </div>

                {/* SIS Empleador - Nueva sección */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">SIS Empleador</h4>
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SIS Empleador (%)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="3"
                        value={settings.contributions?.sis_percentage || 1.88}
                        onChange={(e) => handleSisPercentageUpdate(parseFloat(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          validationErrors.sis_percentage 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                      <span className="ml-2 text-sm font-medium text-gray-600">%</span>
                    </div>
                    {validationErrors.sis_percentage && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.sis_percentage}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Seguro de Invalidez y Sobrevivencia - Pagado por el empleador
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'family' && settings && (
          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Asignaciones Familiares
              </CardTitle>
              <CardDescription className="text-gray-600">
                Montos por tramo según nivel de ingresos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tramo A (CLP)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settings.family_allowances?.tramo_a || 13596}
                    onChange={(e) => handleFamilyAllowanceUpdate('tramo_a', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ingresos hasta $500.000
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tramo B (CLP)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settings.family_allowances?.tramo_b || 8397}
                    onChange={(e) => handleFamilyAllowanceUpdate('tramo_b', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ingresos entre $500.001 y $750.000
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tramo C (CLP)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settings.family_allowances?.tramo_c || 2798}
                    onChange={(e) => handleFamilyAllowanceUpdate('tramo_c', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ingresos entre $750.001 y $1.000.000
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      Cálculo Automático por Empleado
                    </h4>
                    <p className="text-sm text-yellow-700">
                      El sistema calculará automáticamente el tramo correspondiente según el sueldo de cada empleado 
                      y multiplicará por el número de cargas familiares registradas.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'company' && settings && (
          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Configuración de Empresa
              </CardTitle>
              <CardDescription className="text-gray-600">
                Mutual de Seguridad y Caja de Compensación
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mutual de Seguridad
                  </label>
                  <select
                    value={settings.company_info?.mutual_code || 'ACHS'}
                    onChange={(e) => handleCompanyInfoUpdate('mutual_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACHS">ACHS (Asociación Chilena de Seguridad)</option>
                    <option value="MUTUAL">Mutual de Seguridad</option>
                    <option value="IST">IST (Instituto de Seguridad del Trabajo)</option>
                    <option value="ISL">ISL (Instituto de Seguridad Laboral)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Organismo administrador del seguro contra accidentes del trabajo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porcentaje Mutual (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={settings.company_info?.mutual_percentage || 0.95}
                      onChange={(e) => handleCompanyInfoUpdate('mutual_percentage', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-600">%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Porcentaje de cotización para accidentes del trabajo (típicamente 0.95%)
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caja de Compensación
                  </label>
                  <select
                    value={settings.company_info?.caja_compensacion_code || ''}
                    onChange={(e) => handleCompanyInfoUpdate('caja_compensacion_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin Caja de Compensación</option>
                    <option value="CCAF_ANDES">CCAF Los Andes</option>
                    <option value="CCAF_GABRIELA_MISTRAL">CCAF Gabriela Mistral</option>
                    <option value="CCAF_18_SEPTIEMBRE">CCAF 18 de Septiembre</option>
                    <option value="CCAF_LA_ARAUCANA">CCAF La Araucana</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Opcional - Para beneficios adicionales como créditos sociales
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Configuración Empresarial
                    </h4>
                    <p className="text-sm text-blue-700">
                      Estas configuraciones aplican a todos los empleados de la empresa y son requeridas 
                      para generar liquidaciones de sueldo completas y cumplir con las obligaciones laborales.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}