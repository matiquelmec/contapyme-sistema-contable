'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { ArrowLeft, ArrowRight, Save, User, Phone, Mail, Home, Calendar, AlertCircle, Calculator, Settings, DollarSign, UserPlus, Briefcase } from 'lucide-react';
import RutInputFixed from '@/modules/remuneraciones/components/empleados/RutInputFixed';
import { usePayrollOptions } from '@/modules/remuneraciones/hooks/useConfiguracion';
import { useCompanyId } from '@/contexts/CompanyContext';
import { JobDescriptionAssistant } from '@/components/payroll/JobDescriptionAssistant';
import { WeeklyScheduleConfigurator } from '@/components/payroll/WeeklyScheduleConfigurator';

interface EmployeeFormData {
  // Información Personal
  rut: string;
  fullNames: string;
  firstSurname: string;
  secondSurname: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  
  // Información de Contacto
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  
  // Información de Emergencia
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  
  // Información del Contrato
  position: string;
  department: string;
  contractType: string;
  startDate: string;
  endDate: string;
  baseSalary: string;
  salaryType: string;
  weeklyHours: string;
  
  // Horario de Trabajo (nuevos campos)
  entryTime: string;
  exitTime: string;
  lunchBreakDuration: string;
  
  // Horario Semanal Detallado
  weeklySchedule?: any; // Se definirá más específicamente
  scheduleText: string; // Para el contrato PDF
  
  healthInsurance: string;
  pensionFund: string;
  
  // Funciones del Cargo (nuevos campos)
  jobFunctions: string[];
  obligations: string[];
  prohibitions: string[];
  
  // Gratificación Legal (Art. 50)
  hasLegalGratification: boolean;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRutValid, setIsRutValid] = useState(false);
  const [showPayrollConfig, setShowPayrollConfig] = useState(false);
  const [workedDaysInfo, setWorkedDaysInfo] = useState<any>(null);
  const [disableAutoComplete, setDisableAutoComplete] = useState(false);
  
  // Estados simplificados para entrada manual
  
  // 🔗 NUEVA FUNCIONALIDAD: Opciones dinámicas de AFP e ISAPRE
  // ✅ Usar company ID dinámico desde contexto
  const companyId = useCompanyId();
  const { options: payrollOptions, loading: optionsLoading, error: optionsError } = usePayrollOptions(companyId);
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    // Información Personal
    rut: '',
    fullNames: '',
    firstSurname: '',
    secondSurname: '',
    birthDate: '',
    gender: '',
    maritalStatus: '',
    nationality: 'Chilena',
    
    // Información de Contacto
    email: '',
    phone: '',
    mobilePhone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    
    // Información de Emergencia
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Información del Contrato
    position: '',
    department: '',
    contractType: 'indefinido',
    startDate: '',
    endDate: '',
    baseSalary: '',
    salaryType: 'monthly',
    weeklyHours: '44',
    
    // Horario de Trabajo
    entryTime: '09:00',
    exitTime: '18:00',
    lunchBreakDuration: '60',
    
    // Horario Semanal
    weeklySchedule: null,
    scheduleText: 'lunes a viernes',
    
    healthInsurance: '',
    pensionFund: '',
    
    // Funciones del Cargo
    jobFunctions: [],
    obligations: [],
    prohibitions: [],
    
    // Gratificación Legal (Art. 50)
    hasLegalGratification: false,
  });

  // 🔍 FUNCIÓN PARA BUSCAR EMPLEADO EXISTENTE POR RUT
  const searchExistingEmployeeByRut = async (rut: string) => {
    try {
      const response = await fetch(`/api/payroll/employees?company_id=${companyId}&search_rut=${encodeURIComponent(rut)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const employee = result.data[0];
          console.log('🔎 Empleado existente encontrado:', employee);
          return {
            pensionFund: employee.payroll_config?.[0]?.afp_code,
            healthInsurance: employee.payroll_config?.[0]?.health_institution_code,
            employeeData: employee
          };
        }
      }
    } catch (error) {
      console.log('🔍 No se encontró empleado existente:', error);
    }
    return null;
  };

  // 🎯 FUNCIÓN PARA CONSULTAR AFP REAL DE CHILE
  const consultarAFPRealChile = async (rut: string) => {
    try {
      console.log('🇨🇱 Consultando AFP real de Chile para RUT:', rut);
      const response = await fetch(`/api/payroll/rut-previsional?rut=${encodeURIComponent(rut)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ Información previsional oficial encontrada:', result.data);
          return {
            afp: result.data.afp,
            health: result.data.health,
            source: result.data.source
          };
        }
      }
    } catch (error) {
      console.log('⚠️ Error consultando AFP real:', error);
    }
    return null;
  };

  // 🎯 FUNCIÓN PARA AUTOCOMPLETAR AFP Y SALUD BASADO EN RUT
  const autoCompletePrevisionalData = async (rut: string) => {
    console.log('🔍 Intentando autocompletar con RUT:', rut);
    console.log('📊 Estado actual:', {
      rutLength: rut.length,
      currentPensionFund: formData.pensionFund,
      currentHealthInsurance: formData.healthInsurance,
      hasPayrollOptions: !!payrollOptions,
      afpOptions: payrollOptions?.afp_options?.length || 0,
      healthOptions: payrollOptions?.health_options?.length || 0
    });
    
    // Solo autocompletar si el RUT es válido y los campos están vacíos
    if (rut.length >= 11 && !formData.pensionFund && !formData.healthInsurance && payrollOptions) {
      // 🔎 PASO 1: Buscar si el empleado ya existe en nuestra base de datos
      const existingEmployee = await searchExistingEmployeeByRut(rut);
      
      if (existingEmployee && existingEmployee.pensionFund && existingEmployee.healthInsurance) {
        // 🎯 Usar datos del empleado existente en nuestra empresa
        console.log('✅ Usando datos previsionales del empleado existente en empresa');
        
        // Buscar los nombres completos en las opciones
        const existingAFP = payrollOptions.afp_options?.find(afp => 
          afp.code === existingEmployee.pensionFund
        );
        const existingHealth = payrollOptions.health_options?.find(health => 
          health.code === existingEmployee.healthInsurance
        );
        
        if (existingAFP || existingHealth) {
          setFormData(prev => ({
            ...prev,
            ...(existingAFP && { pensionFund: existingAFP.name }),
            ...(existingHealth && { healthInsurance: existingHealth.name })
          }));
          
          console.log('✅ Autocompletado con datos existentes empresa:', {
            AFP: existingAFP?.name,
            Salud: existingHealth?.name
          });
          return; // Salir aquí, ya autocompletamos
        }
      }
      
      // 🇨🇱 PASO 2: Si no existe en empresa, consultar AFP REAL de Chile
      const afpRealChile = await consultarAFPRealChile(rut);
      
      if (afpRealChile) {
        console.log('✅ Usando AFP real de Chile oficial');
        
        // Buscar AFP y Salud reales en nuestras opciones
        const realAFP = payrollOptions.afp_options?.find(afp => 
          afp.name.toUpperCase().includes(afpRealChile.afp.toUpperCase())
        );
        const realHealth = payrollOptions.health_options?.find(health => 
          health.name.toUpperCase().includes(afpRealChile.health.toUpperCase())
        );
        
        if (realAFP || realHealth) {
          setFormData(prev => ({
            ...prev,
            ...(realAFP && { pensionFund: realAFP.name }),
            ...(realHealth && { healthInsurance: realHealth.name })
          }));
          
          console.log('✅ Autocompletado con AFP real de Chile:', {
            AFP: realAFP?.name,
            Salud: realHealth?.name,
            Source: afpRealChile.source
          });
          return; // Salir aquí, ya autocompletamos con datos oficiales
        }
      }
      
      // 🔄 FALLBACK: Si no hay empleado existente, usar valores predeterminados
      console.log('🔄 No se encontró empleado existente, usando valores predeterminados');
      
      // 🎯 PRIORIZAR AFPs MÁS COMUNES EN CHILE (en orden de preferencia)
      const afpPreferences = ['PROVIDA', 'HABITAT', 'CUPRUM', 'PLANVITAL', 'MODELO', 'CAPITAL'];
      let defaultAFP = null;
      
      // Buscar AFP en orden de preferencia
      for (const preferredAfp of afpPreferences) {
        defaultAFP = payrollOptions.afp_options?.find(afp => 
          afp.name.toUpperCase().includes(preferredAfp)
        );
        if (defaultAFP) break;
      }
      
      // Si no encuentra ninguna de las preferidas, usar la primera disponible
      if (!defaultAFP) {
        defaultAFP = payrollOptions.afp_options?.[0];
      }
      
      // Para Salud, FONASA es la opción más común
      const defaultHealth = payrollOptions.health_options?.find(health => 
        health.name.toUpperCase().includes('FONASA')
      ) || payrollOptions.health_options?.[0];
      
      console.log('🎯 Opciones disponibles:', {
        afpOptions: payrollOptions.afp_options?.map(afp => afp.name) || [],
        healthOptions: payrollOptions.health_options?.map(health => health.name) || []
      });
      
      console.log('🎯 Opciones seleccionadas para autocompletado:', {
        defaultAFP: defaultAFP?.name,
        defaultHealth: defaultHealth?.name
      });
      
      if (defaultAFP || defaultHealth) {
        setFormData(prev => ({
          ...prev,
          ...(defaultAFP && !prev.pensionFund && { pensionFund: defaultAFP.name }),
          ...(defaultHealth && !prev.healthInsurance && { healthInsurance: defaultHealth.name })
        }));
        
        console.log('✅ Autocompletado previsional exitoso:', { 
          AFP: defaultAFP?.name, 
          Salud: defaultHealth?.name 
        });
      }
    } else {
      console.log('⚠️ No se puede autocompletar:', {
        rutTooShort: rut.length < 11,
        pensionFundExists: !!formData.pensionFund,
        healthInsuranceExists: !!formData.healthInsurance,
        noPayrollOptions: !payrollOptions
      });
    }
  };

  // 🔄 EFECTO PARA AUTOCOMPLETAR CUANDO PAYROLL OPTIONS ESTÉN LISTOS
  useEffect(() => {
    console.log('🔄 useEffect disparado:', {
      hasPayrollOptions: !!payrollOptions,
      rutLength: formData.rut.length,
      currentPensionFund: formData.pensionFund,
      currentHealthInsurance: formData.healthInsurance
    });
    
    if (payrollOptions && formData.rut.length >= 11 && !formData.pensionFund && !formData.healthInsurance && !disableAutoComplete) {
      console.log('🔄 Ejecutando autocompletado por useEffect con RUT:', formData.rut);
      autoCompletePrevisionalData(formData.rut).catch(console.error);
    }
  }, [payrollOptions, formData.rut, formData.pensionFund, formData.healthInsurance]); // Se ejecuta cuando cambian estos valores

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 🎯 AUTOCOMPLETAR AFP Y SALUD AL INGRESAR RUT
    if (name === 'rut' && value.length >= 11) {
      autoCompletePrevisionalData(value);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Manejar cambios en el configurador de horarios semanales
  const handleScheduleChange = (schedule: any, summary: any) => {
    setFormData(prev => ({
      ...prev,
      weeklySchedule: schedule,
      weeklyHours: summary.totalWeeklyHours.toString(),
      scheduleText: summary.scheduleText,
      // Actualizar campos individuales basados en el primer día laborable
      entryTime: getFirstWorkingDayTime(schedule, 'start') || prev.entryTime,
      exitTime: getFirstWorkingDayTime(schedule, 'end') || prev.exitTime,
      lunchBreakDuration: getFirstWorkingDayLunch(schedule)?.toString() || prev.lunchBreakDuration
    }));
  };

  // Obtener horario del primer día laborable
  const getFirstWorkingDayTime = (schedule: any, type: 'start' | 'end') => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (schedule[day]?.isWorkingDay) {
        return type === 'start' ? schedule[day].startTime : schedule[day].endTime;
      }
    }
    return null;
  };

  // Obtener duración de colación del primer día laborable
  const getFirstWorkingDayLunch = (schedule: any) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (schedule[day]?.isWorkingDay && schedule[day].hasLunch) {
        return schedule[day].lunchDuration;
      }
    }
    return 60; // default
  };

  // Manejar datos extraídos del asistente de descriptor de cargo
  const handleJobDescriptionData = (data: any) => {
    console.log('🔍 Datos recibidos del asistente:', data);
    
    // 🛑 NO cambiar de pestaña automáticamente ni guardar
    // Solo actualizar los datos del formulario sin efectos secundarios
    
    setFormData(prev => ({
      ...prev,
      // Actualizar cargo y departamento si fueron extraídos
      ...(data.position && { position: data.position }),
      ...(data.department && { department: data.department }),
      // Actualizar arrays de funciones
      jobFunctions: data.job_functions || [],
      obligations: data.obligations || [],
      prohibitions: data.prohibitions || []
    }));
    
    // Limpiar errores relacionados inmediatamente
    setErrors(prev => ({
      ...prev,
      position: '',
      department: ''
    }));
    
    // Log para debug
    console.log('✅ Datos del descriptor actualizados en el formulario');
    console.log('ℹ️ Permaneciendo en la pestaña actual sin guardar automáticamente');
  };



  // 📅 CALCULAR DÍAS TRABAJADOS DEL MES
  const calculateWorkedDays = (startDate: string) => {
    if (!startDate) return null;
    
    // 🔧 CORREGIR PARSEO DE FECHA: Usar formato YYYY-MM-DD directamente
    const dateParts = startDate.split('-');
    if (dateParts.length !== 3) return null;
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2]);
    
    const start = new Date(year, month, day);
    const current = new Date();
    
    if (start.getMonth() === current.getMonth() && start.getFullYear() === current.getFullYear()) {
      const totalDaysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const startDay = start.getDate();
      const workedDays = totalDaysInMonth - startDay + 1;
      
      console.log(`📅 DEBUG: Fecha ${startDate} → Día ${startDay}, Trabajados: ${workedDays}`);
      
      return {
        workedDays,
        totalDays: totalDaysInMonth,
        startDay,
        note: `Inicia el día ${startDay}, trabajará ${workedDays} días de ${totalDaysInMonth} días del mes`
      };
    }
    return null;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Debug temporal
    console.log('🔍 Validando formData.position:', formData.position);
    console.log('🔍 FormData completo:', formData);
    
    // Validaciones básicas
    if (!formData.rut) newErrors.rut = 'RUT es requerido';
    if (!isRutValid) newErrors.rut = 'RUT inválido';
    if (!formData.fullNames) newErrors.fullNames = 'Nombres son requeridos';
    if (!formData.firstSurname) newErrors.firstSurname = 'Primer apellido es requerido';
    if (!formData.birthDate || formData.birthDate.trim() === '') {
      newErrors.birthDate = 'Fecha de nacimiento es requerida';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.birthDate)) {
      newErrors.birthDate = 'Formato de fecha inválido (YYYY-MM-DD)';
    }
    if (!formData.email) newErrors.email = 'Email es requerido';
    
    // Validación de cargo con debug mejorado
    const positionValue = formData.position?.trim();
    console.log('🎯 Validando cargo - Valor actual:', `"${positionValue}"`);
    if (!positionValue || positionValue === '') {
      newErrors.position = 'Cargo es requerido';
      console.log('❌ Error: Cargo es requerido');
    } else {
      console.log('✅ Cargo válido:', positionValue);
    }
    if (!formData.startDate) newErrors.startDate = 'Fecha de inicio es requerida';
    if (!formData.baseSalary) newErrors.baseSalary = 'Salario base es requerido';
    
    // Validaciones de horario
    if (!formData.entryTime) newErrors.entryTime = 'Hora de entrada es requerida';
    if (!formData.exitTime) newErrors.exitTime = 'Hora de salida es requerida';
    if (!formData.lunchBreakDuration) newErrors.lunchBreakDuration = 'Duración de colación es requerida';
    
    // Validación lógica: hora de salida debe ser posterior a hora de entrada
    if (formData.entryTime && formData.exitTime && formData.entryTime >= formData.exitTime) {
      newErrors.exitTime = 'Hora de salida debe ser posterior a hora de entrada';
    }
    
    // Validación de duración de colación
    if (formData.lunchBreakDuration && (parseInt(formData.lunchBreakDuration) < 30 || parseInt(formData.lunchBreakDuration) > 120)) {
      newErrors.lunchBreakDuration = 'La colación debe ser entre 30 y 120 minutos';
    }
    
    // Validaciones adicionales para configuración previsional
    if (!formData.healthInsurance) newErrors.healthInsurance = 'Previsión de salud es requerida';
    if (!formData.pensionFund) newErrors.pensionFund = 'AFP es requerida';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚨 handleSubmit ejecutado - Tab actual:', activeTab, 'Evento:', e.type);
    e.preventDefault();
    
    if (!validateForm()) {
      // Find first tab with error
      if (errors.rut || errors.fullNames || errors.firstSurname || errors.birthDate) {
        setActiveTab('personal');
      } else if (errors.email) {
        setActiveTab('contact');
      } else if (errors.position || errors.startDate || errors.baseSalary || errors.entryTime || errors.exitTime || errors.lunchBreakDuration) {
        setActiveTab('contract');
      } else if (errors.healthInsurance || errors.pensionFund) {
        setActiveTab('payroll');
      }
      return;
    }
    
    setLoading(true);
    
    try {
      // ✅ MAPEO DINÁMICO SIMPLIFICADO: Usar solo configuración de empresa
      const selectedAfp = payrollOptions?.afp_options?.find(afp => afp.name === formData.pensionFund);
      const selectedHealth = payrollOptions?.health_options?.find(health => health.name === formData.healthInsurance);
      
      // Validar que se encontraron las opciones seleccionadas
      if (!selectedAfp) {
        throw new Error(`AFP "${formData.pensionFund}" no encontrada en la configuración de la empresa`);
      }
      
      if (!selectedHealth) {
        throw new Error(`Institución de salud "${formData.healthInsurance}" no encontrada en la configuración de la empresa`);
      }

      // Usar códigos directamente de la configuración
      const afpCode = selectedAfp.code;
      const healthCode = selectedHealth.code;
      
      // Preparar datos para la API
      const apiData = {
        // Company info (valores correctos de la base de datos)
        company_id: companyId,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        
        
        // Employee data
        rut: formData.rut,
        first_name: formData.fullNames,
        last_name: formData.firstSurname,
        middle_name: formData.secondSurname || null,
        birth_date: formData.birthDate,
        gender: formData.gender || null,
        marital_status: formData.maritalStatus || null,
        nationality: formData.nationality || 'Chilena',
        
        // Contact info
        email: formData.email,
        phone: formData.phone || null,
        mobile_phone: formData.mobilePhone || null,
        address: formData.address || null,
        city: formData.city || null,
        region: formData.region || null,
        postal_code: formData.postalCode || null,
        
        // Emergency contact
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_phone: formData.emergencyContactPhone || null,
        emergency_contact_relationship: formData.emergencyContactRelationship || null,
        
        // Contract info
        position: formData.position,
        department: formData.department || null,
        contract_type: formData.contractType,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        base_salary: parseFloat(formData.baseSalary),
        salary_type: formData.salaryType,
        weekly_hours: parseFloat(formData.weeklyHours) || 44,
        
        // Schedule info
        entry_time: formData.entryTime,
        exit_time: formData.exitTime,
        lunch_break_duration: parseInt(formData.lunchBreakDuration) || 60,
        
        // 🔧 FUNCIONES DEL CARGO (desde asistente IA)
        job_functions: formData.jobFunctions,
        obligations: formData.obligations,
        prohibitions: formData.prohibitions,
        
        // ✅ PAYROLL CONFIG DINÁMICO: Usa códigos de configuración conectada
        payroll_config: {
          afp_code: afpCode,
          health_institution_code: healthCode,
          family_allowances: 0,
          legal_gratification_type: formData.hasLegalGratification ? 'article_50' : 'none',
          has_unemployment_insurance: true
        }
      };
      
      const response = await fetch('/api/payroll/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar empleado');
      }

      console.log('✅ Empleado creado exitosamente:', result.data);
      
      // 🎯 MENSAJE DE CREACIÓN AUTOMÁTICA DE CONTRATO
      let successMessage = '✅ Empleado creado exitosamente!';
      
      // Verificar si se creó contrato automáticamente en DB
      if (result.data.employment_contracts && result.data.employment_contracts.length > 0) {
        successMessage += '\n📝 Contrato laboral generado automáticamente';
        
        // 📄 GENERAR PDF DEL CONTRATO Y GUARDARLO EN SECCIÓN CONTRATOS
        try {
          const contractId = result.data.employment_contracts[0].id;
          const employeeId = result.data.id;
          
          // Llamar a la API de generación de contratos PDF
          const contractResponse = await fetch('/api/payroll/contracts/generate-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employee_id: employeeId,
              contract_id: contractId,
              company_id: companyId,
              format: 'json', // Especificar que queremos respuesta JSON
              save_to_contracts: true // Flag para guardar en sección contratos
            }),
          });

          if (contractResponse.ok) {
            const contractResult = await contractResponse.json();
            successMessage += '\n📄 Documento de contrato PDF generado y guardado';
          } else {
            console.warn('⚠️ Error generando PDF del contrato, pero empleado creado exitosamente');
          }
        } catch (contractError) {
          console.error('Error generando contrato PDF:', contractError);
          // No bloquear el flujo principal si falla la generación del PDF
        }
      }
      
      // Verificar si se creó configuración previsional
      if (result.data.payroll_config && result.data.payroll_config.length > 0) {
        successMessage += '\n🏛️ Configuración previsional establecida';
      }
      
      // 📅 Mostrar información de días trabajados si está disponible
      if (result.worked_days_info) {
        setWorkedDaysInfo(result.worked_days_info);
        successMessage += `\n\n📊 ${result.worked_days_info.calculation_note}`;
      }
      
      alert(successMessage);
      
      // Redirigir a la lista de empleados
      router.push('/payroll?tab=employees');
    } catch (error) {
      console.error('Error al guardar empleado:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PayrollHeader 
        title="Nuevo Empleado"
        subtitle="Registra la información del empleado y su contrato"
        showBackButton
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Agregar Nuevo Empleado
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Complete la información en las pestañas para registrar al empleado en el sistema
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <form onSubmit={handleSubmit}>
            {/* Navigation Tabs - Modern Style */}
            <div className="mb-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-2">
                <nav className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'personal'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50/80 backdrop-blur-sm'
                    }`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Información Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'contact'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:text-green-700 hover:bg-green-50/80 backdrop-blur-sm'
                    }`}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Contacto
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contract')}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'contract'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:text-purple-700 hover:bg-purple-50/80 backdrop-blur-sm'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Contrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payroll')}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'payroll'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:text-orange-700 hover:bg-orange-50/80 backdrop-blur-sm'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configuración Previsional
                  </button>
                </nav>
              </div>
            </div>

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="border-b border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Información Personal</h3>
                  </div>
                  <p className="text-gray-600">Datos personales del empleado</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        RUT *
                      </label>
                      <div className="relative">
                        <RutInputFixed
                          value={formData.rut}
                          onChange={(value) => {
                            setFormData(prev => ({ ...prev, rut: value }));
                            setErrors({...errors, rut: ''});
                            // 🎯 AUTOCOMPLETAR AFP Y SALUD AL INGRESAR RUT
                            if (value.length >= 11) {
                              autoCompletePrevisionalData(value).catch(console.error);
                            }
                          }}
                          onValidChange={setIsRutValid}
                          required
                          className={errors.rut ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.rut && (
                        <p className="mt-1 text-sm text-red-600">{errors.rut}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nacionalidad
                      </label>
                      <input
                        type="text"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombres *
                      </label>
                      <input
                        type="text"
                        name="fullNames"
                        value={formData.fullNames}
                        onChange={handleInputChange}
                        placeholder="Ej: Juan Carlos"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.fullNames ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.fullNames && (
                        <p className="mt-1 text-sm text-red-600">{errors.fullNames}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primer Apellido *
                      </label>
                      <input
                        type="text"
                        name="firstSurname"
                        value={formData.firstSurname}
                        onChange={handleInputChange}
                        placeholder="Ej: González"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.firstSurname ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.firstSurname && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstSurname}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Segundo Apellido
                      </label>
                      <input
                        type="text"
                        name="secondSurname"
                        value={formData.secondSurname}
                        onChange={handleInputChange}
                        placeholder="Ej: Pérez (opcional)"
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Nacimiento *
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.birthDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.birthDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Género
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Seleccionar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado Civil
                      </label>
                      <select
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Seleccionar</option>
                        <option value="soltero">Soltero/a</option>
                        <option value="casado">Casado/a</option>
                        <option value="divorciado">Divorciado/a</option>
                        <option value="viudo">Viudo/a</option>
                        <option value="conviviente">Conviviente</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="border-b border-white/20 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Información de Contacto</h3>
                    </div>
                    <p className="text-gray-600">Datos de contacto y dirección</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono Fijo
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono Móvil
                        </label>
                        <input
                          type="tel"
                          name="mobilePhone"
                          value={formData.mobilePhone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código Postal
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ciudad
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Región
                        </label>
                        <select
                          name="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="">Seleccionar</option>
                          <option value="I">I - Tarapacá</option>
                          <option value="II">II - Antofagasta</option>
                          <option value="III">III - Atacama</option>
                          <option value="IV">IV - Coquimbo</option>
                          <option value="V">V - Valparaíso</option>
                          <option value="RM">RM - Metropolitana</option>
                          <option value="VI">VI - O'Higgins</option>
                          <option value="VII">VII - Maule</option>
                          <option value="VIII">VIII - Biobío</option>
                          <option value="IX">IX - Araucanía</option>
                          <option value="X">X - Los Lagos</option>
                          <option value="XI">XI - Aysén</option>
                          <option value="XII">XII - Magallanes</option>
                          <option value="XIV">XIV - Los Ríos</option>
                          <option value="XV">XV - Arica y Parinacota</option>
                          <option value="XVI">XVI - Ñuble</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="border-b border-white/20 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Contacto de Emergencia</h3>
                    </div>
                    <p className="text-gray-600">Persona a contactar en caso de emergencia</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={formData.emergencyContactPhone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Parentesco
                        </label>
                        <input
                          type="text"
                          name="emergencyContactRelationship"
                          value={formData.emergencyContactRelationship}
                          onChange={handleInputChange}
                          placeholder="Ej: Cónyuge, Padre, Madre, etc."
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Information Tab */}
            {activeTab === 'contract' && (
              <div className="space-y-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="border-b border-white/20 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Información del Contrato</h3>
                      <div className="ml-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Se generará automáticamente
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600">Detalles del contrato laboral que se creará automáticamente al guardar el empleado</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cargo *
                        </label>
                        <input
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleInputChange}
                          placeholder="Ej: Vendedor, Administrativo, etc."
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.position ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.position && (
                          <p className="mt-1 text-sm text-red-600">{errors.position}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Departamento
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          placeholder="Ej: Ventas, Administración, etc."
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Contrato *
                        </label>
                        <select
                          name="contractType"
                          value={formData.contractType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="indefinido">Indefinido</option>
                          <option value="plazo_fijo">Plazo Fijo</option>
                          <option value="por_obra">Por Obra o Faena</option>
                          <option value="part_time">Part Time</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        {/* Configurador de Horarios Semanales */}
                        <WeeklyScheduleConfigurator
                          onScheduleChange={handleScheduleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha de Inicio *
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.startDate ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.startDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha de Término
                          {formData.contractType === 'indefinido' && (
                            <span className="text-gray-500 text-xs ml-2">(No aplica)</span>
                          )}
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          disabled={formData.contractType === 'indefinido'}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Salario Base *
                        </label>
                        <input
                          type="number"
                          name="baseSalary"
                          value={formData.baseSalary}
                          onChange={handleInputChange}
                          placeholder="500000"
                          min="0"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.baseSalary ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.baseSalary && (
                          <p className="mt-1 text-sm text-red-600">{errors.baseSalary}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Salario
                        </label>
                        <select
                          name="salaryType"
                          value={formData.salaryType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="monthly">Mensual</option>
                          <option value="hourly">Por Hora</option>
                          <option value="daily">Diario</option>
                        </select>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Asistente de Descriptor de Cargo */}
                <JobDescriptionAssistant
                  onDataExtracted={handleJobDescriptionData}
                  currentPosition={formData.position}
                  currentDepartment={formData.department}
                />

                {/* Mostrar funciones extraídas si existen */}
                {(formData.jobFunctions.length > 0 || formData.obligations.length > 0 || formData.prohibitions.length > 0) && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
                    <div className="border-b border-white/20 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Funciones del Cargo</h3>
                      </div>
                      <p className="text-gray-600">Información extraída automáticamente</p>
                    </div>
                    <div className="p-6">
                      {formData.jobFunctions.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Funciones Principales</h4>
                          <ul className="space-y-2">
                            {formData.jobFunctions.map((func, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                <span className="text-gray-700">{func}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {formData.obligations.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Obligaciones</h4>
                          <ul className="space-y-2">
                            {formData.obligations.map((obl, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                <span className="text-gray-700">{obl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {formData.prohibitions.length > 0 && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Prohibiciones</h4>
                          <ul className="space-y-2">
                            {formData.prohibitions.map((proh, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                <span className="text-gray-700">{proh}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Alert about contract creation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Información del contrato
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Al guardar este empleado, se creará automáticamente un contrato con la información proporcionada.
                        Podrás modificar o agregar más contratos desde la sección de gestión de contratos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payroll Configuration Tab */}
            {activeTab === 'payroll' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Configuración AFP
                      {payrollOptions?.has_custom_config && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Conectado con configuración empresa
                        </span>
                      )}
                      {optionsError && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠️ Usando valores por defecto
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>Administradora de Fondos de Pensiones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AFP *
                        </label>
                        <select
                          name="pensionFund"
                          value={formData.pensionFund}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.pensionFund ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={optionsLoading}
                        >
                          <option value="">
                            {optionsLoading ? 'Cargando AFP...' : 'Seleccionar AFP'}
                          </option>
                          {/* ✅ OPCIONES DINÁMICAS: Conectadas con configuración de empresa */}
                          {payrollOptions?.afp_options?.map((afp) => (
                            <option key={afp.code} value={afp.name}>
                              {afp.display_name}
                            </option>
                          )) || (
                            // Fallback a opciones estáticas si no hay conexión
                            <>
                              <option value="Capital">Capital (1.44%)</option>
                              <option value="Cuprum">Cuprum (1.44%)</option>
                              <option value="Habitat">Habitat (1.27%)</option>
                              <option value="Modelo">Modelo (0.77%)</option>
                              <option value="PlanVital">PlanVital (1.16%)</option>
                              <option value="ProVida">ProVida (1.45%)</option>
                              <option value="Uno">Uno (0.69%)</option>
                            </>
                          )}
                        </select>
                        {errors.pensionFund && (
                          <p className="mt-1 text-sm text-red-600">{errors.pensionFund}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Contrato (para AFC)
                        </label>
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                          <p><strong>Contrato {formData.contractType === 'indefinido' ? 'Indefinido' : 'Plazo Fijo'}</strong></p>
                          <p className="mt-1">
                            Trabajador: {formData.contractType === 'plazo_fijo' ? (
                              <span className="text-orange-600 font-medium">Sin cesantía</span>
                            ) : (
                              '0.6%'
                            )}
                          </p>
                          <p>Empleador: {formData.contractType === 'indefinido' ? '2.4%' : '3.0%'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configuración de Salud</CardTitle>
                    <CardDescription>Sistema de salud y planes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sistema de Salud *
                        </label>
                        <select
                          name="healthInsurance"
                          value={formData.healthInsurance}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.healthInsurance ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={optionsLoading}
                        >
                          <option value="">
                            {optionsLoading ? 'Cargando instituciones...' : 'Seleccionar'}
                          </option>
                          {/* ✅ OPCIONES DINÁMICAS: Conectadas con configuración de empresa */}
                          {payrollOptions?.health_options?.map((health) => (
                            <option key={health.code} value={health.name}>
                              {health.display_name}
                            </option>
                          )) || (
                            // Fallback a opciones estáticas si no hay conexión
                            <>
                              <option value="FONASA">FONASA (7%)</option>
                              <optgroup label="Isapres">
                                <option value="Banmédica">Banmédica</option>
                                <option value="Consalud">Consalud</option>
                                <option value="Colmena">Colmena</option>
                                <option value="Cruz Blanca">Cruz Blanca</option>
                                <option value="Vida Tres">Vida Tres</option>
                                <option value="Más Vida">Más Vida</option>
                              </optgroup>
                            </>
                          )}
                        </select>
                        {errors.healthInsurance && (
                          <p className="mt-1 text-sm text-red-600">{errors.healthInsurance}</p>
                        )}
                      </div>

                      {formData.healthInsurance && formData.healthInsurance !== 'FONASA' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Plan de Salud (UF)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ej: 2.5"
                            className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Valor del plan en UF. Si es mayor al 7%, el trabajador paga la diferencia.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Gratificación Legal Art. 50 */}
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-800">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Gratificación Legal (Artículo 50)
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      El empleador puede optar por pagar el 25% de las remuneraciones mensuales como gratificación
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="hasLegalGratification"
                          name="hasLegalGratification"
                          checked={formData.hasLegalGratification}
                          onChange={handleInputChange}
                          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <label htmlFor="hasLegalGratification" className="block text-sm font-medium text-green-900 cursor-pointer">
                            Aplicar Gratificación del Art. 50
                          </label>
                          <p className="mt-1 text-sm text-green-700">
                            Se pagará el 25% del sueldo base mensual con tope de 4.75 ingresos mínimos mensuales ({new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(4.75 * 380000)})
                          </p>
                          {formData.hasLegalGratification && (
                            <div className="mt-3 p-3 bg-white border border-green-300 rounded-md">
                              <p className="text-sm text-green-800 font-medium">
                                ✅ Gratificación activada
                              </p>
                              {formData.baseSalary && (
                                <p className="text-sm text-green-700 mt-1">
                                  Gratificación mensual estimada: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(Math.min(parseFloat(formData.baseSalary) * 0.25, 4.75 * 380000))}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Otros Descuentos y Beneficios</CardTitle>
                    <CardDescription>Configuración adicional opcional</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">APV - Ahorro Previsional Voluntario</h4>
                          <p className="text-sm text-gray-500">Descuento adicional para ahorro</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Seguro Complementario</h4>
                          <p className="text-sm text-gray-500">Seguro adicional de salud</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Préstamo Empresa</h4>
                          <p className="text-sm text-gray-500">Descuento por préstamo de la empresa</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calculadora de liquidación */}
                {formData.baseSalary && formData.healthInsurance && formData.pensionFund && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-900">Vista Previa de Liquidación</CardTitle>
                      <CardDescription>
                        Cálculo estimado basado en los datos ingresados (sueldo base: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(formData.baseSalary))})
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const baseSalary = parseFloat(formData.baseSalary);
                        const minimumWage = 380000; // Ingreso mínimo 2025
                        const maxGratification = 4.75 * minimumWage; // Tope Art. 50
                        
                        const gratificationAmount = formData.hasLegalGratification 
                          ? Math.min(baseSalary * 0.25, maxGratification)
                          : 0;
                        
                        const totalGross = baseSalary + gratificationAmount;
                        const totalDeductions = totalGross * 0.20; // Estimación aproximada
                        const netSalary = totalGross - totalDeductions;
                        
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <p className="text-sm text-gray-600">Sueldo Bruto</p>
                              <p className="text-lg font-semibold text-green-700">
                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalGross)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formData.hasLegalGratification 
                                  ? `Incluye gratificación Art. 50: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(gratificationAmount)}`
                                  : 'Solo sueldo base'
                                }
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <p className="text-sm text-gray-600">Descuentos</p>
                              <p className="text-lg font-semibold text-red-600">
                                -{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalDeductions)}
                              </p>
                              <p className="text-xs text-gray-500">AFP + Salud + Imp. único</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <p className="text-sm text-gray-600">Líquido a Pagar</p>
                              <p className="text-lg font-semibold text-blue-700">
                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(netSalary)}
                              </p>
                              <p className="text-xs text-gray-500">Estimación</p>
                            </div>
                          </div>
                        );
                      })()} 
                      
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3">Desglose de Descuentos Estimados:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">AFP ({formData.pensionFund}):</span>
                            <br />
                            <span className="font-medium">
                              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(formData.baseSalary) * 0.11)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Salud ({formData.healthInsurance}):</span>
                            <br />
                            <span className="font-medium">
                              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(formData.baseSalary) * 0.07)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Seguro Cesantía:</span>
                            <br />
                            <span className="font-medium">
                              {formData.contractType === 'plazo_fijo' ? (
                                <span className="text-orange-600">Sin cesantía (Plazo Fijo)</span>
                              ) : (
                                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(formData.baseSalary) * 0.006)
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Impuesto Único:</span>
                            <br />
                            <span className="font-medium">
                              {parseFloat(formData.baseSalary) > 700000 ? 
                                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(formData.baseSalary) * 0.04) : 
                                'Exento'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Información sobre cálculo de liquidación */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex">
                    <Calculator className="h-6 w-6 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-900">
                        Cálculo Automático de Liquidaciones
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Al guardar el empleado, podrás:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Generar liquidaciones de sueldo mensuales automáticamente</li>
                          <li>Calcular impuesto único de segunda categoría</li>
                          <li>Integración automática con F29 (códigos 10 y 161)</li>
                          <li>Exportar libro de remuneraciones en Excel</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mt-8">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Link href="/payroll">
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full sm:w-auto bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </Link>
                
                {activeTab !== 'payroll' ? (
                  // Botón "Siguiente" para pestañas intermedias
                  <Button 
                    type="button"
                    variant="primary"
                    onClick={(e) => {
                      console.log('🔍 Botón Siguiente clickeado desde tab:', activeTab);
                      e.preventDefault(); // Prevenir cualquier comportamiento de submit
                      e.stopPropagation(); // Prevenir propagación del evento
                      
                      const tabs = ['personal', 'contact', 'contract', 'payroll'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        const nextTab = tabs[currentIndex + 1];
                        console.log('🔄 Cambiando de tab:', activeTab, '→', nextTab);
                        setActiveTab(nextTab as typeof activeTab);
                      }
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  // Botón "Crear Empleado" solo en la última pestaña
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={loading || !isRutValid}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Guardando...' : 'Crear Empleado'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}