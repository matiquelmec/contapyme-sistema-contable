'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  ArrowLeft, Save, FileText, User, Calendar, DollarSign, 
  Clock, MapPin, AlertCircle, Search, Sparkles, CheckCircle 
} from 'lucide-react';
import { useCompanyId } from '@/contexts/CompanyContext';
import { JobDescriptionAssistant } from '@/components/payroll/JobDescriptionAssistant';

interface Employee {
  id: string;
  rut: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  position?: string;
  status: string;
}

interface ContractTemplate {
  id: string;
  template_name: string;
  template_type: string;
  position_category: string;
  job_functions: string[];
  obligations: string[];
  prohibitions: string[];
  standard_bonuses: any[];
  standard_allowances: any;
}

export default function NewContractPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Datos del formulario
  const [formData, setFormData] = useState({
    position: '',
    department: '',
    contract_type: 'indefinido',
    start_date: '',
    end_date: '',
    base_salary: '',
    gratification_amount: '',
    weekly_hours: '45',
    workplace_address: '',
    schedule_entry: '09:00',
    schedule_exit: '18:00',
    lunch_start: '13:00',
    lunch_end: '14:00',
    bonuses: [] as any[],
    allowances: {
      meal: '',
      transport: '',
      cash: ''
    },
    // NUEVOS CAMPOS PREVISIONALES
    afp_name: 'MODELO',
    health_institution: 'FONASA',
    isapre_plan: '',
    afp_auto_detected: false // Flag para indicar si se detectó automáticamente
  });

  // Estado para datos del asistente de descriptores
  const [jobDescriptionData, setJobDescriptionData] = useState<any>(null);
  
  // Estado para datos de la empresa (representante legal)
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Verificar si hay datos pre-llenados del asistente de descriptores
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isPrefilled = urlParams.get('prefilled') === 'true';
      const source = urlParams.get('source');
      
      if (isPrefilled && source === 'job-assistant') {
        const savedData = sessionStorage.getItem('job_description_data');
        if (savedData) {
          try {
            const data = JSON.parse(savedData);
            setJobDescriptionData(data);
            
            // Pre-llenar campos del formulario
            setFormData(prev => ({
              ...prev,
              position: data.position || '',
              department: data.department || ''
            }));
            
            // Limpiar sessionStorage después de usar
            sessionStorage.removeItem('job_description_data');
            sessionStorage.removeItem('job_description_source');
          } catch (error) {
            console.error('Error parsing job description data:', error);
          }
        }
      }
    }
  }, []);

  // Cargar empleados activos sin contrato y configuración de empresa
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`/api/payroll/employees?company_id=${companyId}&status=active`);
        const data = await response.json();
        if (data.success) {
          setEmployees(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    const fetchCompanySettings = async () => {
      try {
        const response = await fetch(`/api/payroll/settings?company_id=${companyId}`);
        const data = await response.json();
        if (data.success && data.data?.company_info) {
          setCompanySettings(data.data.company_info);
          console.log('✅ Datos del representante legal cargados:', data.data.company_info.legal_representative);
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }
    };

    if (companyId) {
      fetchEmployees();
      fetchCompanySettings();
    }
  }, [companyId]);

  // Función para consultar AFP automáticamente
  const consultarAfpEmpleado = async (employeeRut: string) => {
    try {
      console.log('🔍 Consultando AFP para empleado:', employeeRut);
      
      const response = await fetch('/api/external/sii/consulta-afp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: employeeRut })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ AFP encontrada:', data.data);
        
        // Actualizar formulario con datos previsionales
        setFormData(prev => ({
          ...prev,
          afp_name: data.data.afp_name,
          health_institution: data.data.health_institution,
          isapre_plan: data.data.isapre_plan || '',
          afp_auto_detected: true
        }));
        
        return data.data;
      } else {
        console.log('⚠️ No se pudo obtener AFP:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error consultando AFP:', error);
      return null;
    }
  };

  // Manejar cambio de empleado - CARGAR TODOS LOS DATOS DEL EMPLEADO
  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployee(employeeId);
    const employee = employees.find(e => e.id === employeeId);
    
    if (employee) {
      // Consultar AFP automáticamente
      await consultarAfpEmpleado(employee.rut);
    }
    
    if (employee) {
      console.log('📋 Cargando datos del empleado:', employee);
      
      // Cargar todos los datos del empleado en el formulario
      setFormData(prev => ({
        ...prev,
        // Datos personales del empleado
        rut: employee.rut || '',
        firstName: employee.first_name || '',
        lastName: employee.last_name || '',
        middleName: employee.middle_name || '',
        birthDate: employee.birth_date || '',
        gender: employee.gender || '',
        maritalStatus: employee.marital_status || '',
        nationality: employee.nationality || '',
        
        // Datos de contacto
        email: employee.email || '',
        phone: employee.phone || '',
        mobilePhone: employee.mobile_phone || '',
        address: employee.address || '',
        city: employee.city || '',
        region: employee.region || '',
        postalCode: employee.postal_code || '',
        
        // Contacto de emergencia
        emergencyContactName: employee.emergency_contact_name || '',
        emergencyContactPhone: employee.emergency_contact_phone || '',
        emergencyContactRelationship: employee.emergency_contact_relationship || '',
        
        // Datos de contrato si existen contratos previos
        position: employee.employment_contracts?.[0]?.position || '',
        department: employee.employment_contracts?.[0]?.department || '',
      }));
      
      console.log('✅ Datos del empleado cargados en el formulario');
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validaciones básicas
      const newErrors: Record<string, string> = {};
      if (!selectedEmployee) newErrors.employee = 'Selecciona un empleado';
      if (!formData.position) newErrors.position = 'El cargo es requerido';
      if (!formData.start_date) newErrors.start_date = 'La fecha de inicio es requerida';
      if (!formData.base_salary) newErrors.base_salary = 'El sueldo base es requerido';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Calcular gratificación legal si no se especificó
      const calculatedGratification = formData.gratification_amount || 
        Math.min(Number(formData.base_salary) * 0.25, 2512750);

      // Preparar datos del contrato (incluyendo datos del asistente de descriptores)
      const contractData = {
        employee_id: selectedEmployee,
        company_id: companyId,
        template_id: selectedTemplate || undefined,
        contract_type: formData.contract_type,
        position: formData.position,
        department: formData.department,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        base_salary: Number(formData.base_salary),
        gratification_amount: calculatedGratification,
        weekly_hours: Number(formData.weekly_hours),
        workplace_address: formData.workplace_address,
        schedule_details: {
          entry: formData.schedule_entry,
          exit: formData.schedule_exit,
          lunch_start: formData.lunch_start,
          lunch_end: formData.lunch_end,
          days: 'Lunes a Sábado'
        },
        bonuses: formData.bonuses,
        allowances: {
          meal: Number(formData.allowances.meal) || 0,
          transport: Number(formData.allowances.transport) || 0,
          cash: Number(formData.allowances.cash) || 0
        },
        // Incorporar datos del asistente IA si están disponibles
        job_functions: jobDescriptionData?.job_functions || jobDescriptionData?.refined_functions || [],
        obligations: jobDescriptionData?.obligations || jobDescriptionData?.refined_obligations || [],
        prohibitions: jobDescriptionData?.prohibitions || jobDescriptionData?.refined_prohibitions || [],
        // Datos automáticos de la empresa y representante legal
        company_info: companySettings ? {
          company_name: companySettings.company_name,
          company_rut: companySettings.company_rut,
          company_address: companySettings.company_address,
          company_city: companySettings.company_city,
          legal_representative: companySettings.legal_representative
        } : undefined
      };

      // Crear el contrato
      const response = await fetch('/api/payroll/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el contrato');
      }

      // Mostrar mensaje de éxito si se incorporaron datos del asistente
      if (jobDescriptionData) {
        const functionsCount = (jobDescriptionData.job_functions || jobDescriptionData.refined_functions || []).length;
        const obligationsCount = (jobDescriptionData.obligations || jobDescriptionData.refined_obligations || []).length;
        const prohibitionsCount = (jobDescriptionData.prohibitions || jobDescriptionData.refined_prohibitions || []).length;
        
        if (functionsCount > 0 || obligationsCount > 0 || prohibitionsCount > 0) {
          console.log(`✅ Contrato creado con datos del asistente IA: ${functionsCount} funciones, ${obligationsCount} obligaciones, ${prohibitionsCount} prohibiciones`);
        }
      }

      // Redirigir al contrato creado
      router.push(`/payroll/contracts/${result.data.id}`);

    } catch (error) {
      console.error('Error creating contract:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollHeader 
        title="Nuevo Contrato"
        subtitle="Crear un contrato laboral"
        showBackButton
      />

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Banner de información del representante legal */}
          {companySettings?.legal_representative && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-900 mb-1">
                    Representante Legal - {companySettings.company_name}
                  </h3>
                  <p className="text-sm text-green-700 mb-2">
                    Los datos del empleador se incluirán automáticamente en el contrato:
                  </p>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>✓ <strong>{companySettings.legal_representative.full_name}</strong> - RUT: {companySettings.legal_representative.rut}</div>
                    <div>✓ {companySettings.legal_representative.profession} - {companySettings.legal_representative.position}</div>
                    <div>✓ Dirección: {companySettings.legal_representative.address}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banner de información cuando viene del asistente */}
          {jobDescriptionData && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-indigo-900 mb-1">
                    Datos del Asistente de Descriptor de Cargo
                  </h3>
                  <p className="text-sm text-indigo-700 mb-2">
                    Se han pre-llenado los campos de cargo y departamento con los datos generados por el asistente IA.
                  </p>
                  {jobDescriptionData.job_functions && jobDescriptionData.job_functions.length > 0 && (
                    <div className="text-xs text-indigo-600">
                      ✓ {jobDescriptionData.job_functions.length} funciones principales
                      {jobDescriptionData.obligations && ` • ${jobDescriptionData.obligations.length} obligaciones`}
                      {jobDescriptionData.prohibitions && ` • ${jobDescriptionData.prohibitions.length} prohibiciones`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selección de empleado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Seleccionar Empleado
                </CardTitle>
                <CardDescription>
                  Elige el empleado para quien se creará el contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay empleados disponibles
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Necesitas tener empleados registrados para crear contratos.
                    </p>
                    <p className="text-sm text-gray-400">
                      Ve a la sección "Empleados" del módulo de remuneraciones para crear empleados primero.
                    </p>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona un empleado...</option>
                      {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name} {employee.middle_name} - {employee.rut}
                        </option>
                      ))}
                    </select>
                    {errors.employee && (
                      <p className="text-red-600 text-sm mt-1">{errors.employee}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedEmployee && (
              <>
                {/* 📋 DATOS DEL EMPLEADO SELECCIONADO */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2 text-green-600" />
                      Datos del Empleado Seleccionado
                    </CardTitle>
                    <CardDescription>
                      Información personal del empleado (solo lectura)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-green-900">RUT:</span>
                          <span className="ml-2 text-green-800">{formData.rut || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-900">Nombre:</span>
                          <span className="ml-2 text-green-800">
                            {formData.firstName} {formData.middleName} {formData.lastName}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-green-900">Email:</span>
                          <span className="ml-2 text-green-800">{formData.email || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-900">Teléfono:</span>
                          <span className="ml-2 text-green-800">{formData.phone || formData.mobilePhone || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-900">Dirección:</span>
                          <span className="ml-2 text-green-800">{formData.address ? `${formData.address}, ${formData.city}` : 'No especificada'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-900">Nacionalidad:</span>
                          <span className="ml-2 text-green-800">{formData.nationality || 'No especificada'}</span>
                        </div>
                      </div>
                      
                      {formData.emergencyContactName && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <h4 className="font-medium text-green-900 mb-2">Contacto de Emergencia:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-green-700">Nombre:</span>
                              <span className="ml-2 text-green-800">{formData.emergencyContactName}</span>
                            </div>
                            <div>
                              <span className="font-medium text-green-700">Teléfono:</span>
                              <span className="ml-2 text-green-800">{formData.emergencyContactPhone || 'No especificado'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Información del cargo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                      Información del Cargo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo *
                        </label>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: Vendedor, Contador, Gerente"
                        />
                        {errors.position && (
                          <p className="text-red-600 text-sm mt-1">{errors.position}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Departamento
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: Ventas, Administración"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Contrato *
                        </label>
                        <select
                          value={formData.contract_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="indefinido">Indefinido</option>
                          <option value="plazo_fijo">Plazo Fijo</option>
                          <option value="por_obra">Por Obra</option>
                          <option value="part_time">Part Time</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Horas Semanales
                        </label>
                        <input
                          type="number"
                          value={formData.weekly_hours}
                          onChange={(e) => setFormData(prev => ({ ...prev, weekly_hours: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="48"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Asistente de Descriptor de Cargo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                      Asistente de Descriptor de Cargo
                    </CardTitle>
                    <CardDescription>
                      Genera funciones profesionales para el contrato usando IA, PDF o entrada manual
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JobDescriptionAssistant
                      onDataExtracted={(data) => {
                        // Actualizar formData con las funciones extraídas
                        console.log('Job description data extracted:', data);
                        setJobDescriptionData(data);
                        
                        // Actualizar campos del formulario si están vacíos
                        setFormData(prev => ({
                          ...prev,
                          position: data.position || prev.position,
                          department: data.department || prev.department
                        }));
                      }}
                      currentPosition={formData.position}
                      currentDepartment={formData.department}
                    />

                    {/* Indicador de datos listos para incorporar al contrato */}
                    {jobDescriptionData && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-green-900">
                              ✅ Datos Listos para Incorporar al Contrato
                            </h4>
                            <p className="text-xs text-green-700">
                              Estos datos se incorporarán automáticamente al PDF del contrato
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                            <div className="font-semibold text-blue-700 mb-1">Funciones</div>
                            <div className="text-blue-600">
                              {(jobDescriptionData.job_functions || jobDescriptionData.refined_functions || []).length} definidas
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                            <div className="font-semibold text-green-700 mb-1">Obligaciones</div>
                            <div className="text-green-600">
                              {(jobDescriptionData.obligations || jobDescriptionData.refined_obligations || []).length} incluidas
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                            <div className="font-semibold text-red-700 mb-1">Prohibiciones</div>
                            <div className="text-red-600">
                              {(jobDescriptionData.prohibitions || jobDescriptionData.refined_prohibitions || []).length} establecidas
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fechas y salario */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                      Fechas y Remuneración
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Inicio *
                        </label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.start_date && (
                          <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Término
                        </label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          disabled={formData.contract_type === 'indefinido'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sueldo Base *
                        </label>
                        <input
                          type="number"
                          value={formData.base_salary}
                          onChange={(e) => setFormData(prev => ({ ...prev, base_salary: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                        {errors.base_salary && (
                          <p className="text-red-600 text-sm mt-1">{errors.base_salary}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gratificación Legal (opcional)
                        </label>
                        <input
                          type="number"
                          value={formData.gratification_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, gratification_amount: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="Se calculará automáticamente (25%)"
                          min="0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Asignaciones */}
                <Card>
                  <CardHeader>
                    <CardTitle>Asignaciones No Imponibles</CardTitle>
                    <CardDescription>
                      Beneficios adicionales que no afectan las cotizaciones previsionales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Colación
                        </label>
                        <input
                          type="number"
                          value={formData.allowances.meal}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            allowances: { ...prev.allowances, meal: e.target.value }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Movilización
                        </label>
                        <input
                          type="number"
                          value={formData.allowances.transport}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            allowances: { ...prev.allowances, transport: e.target.value }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asignación de Caja
                        </label>
                        <input
                          type="number"
                          value={formData.allowances.cash}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            allowances: { ...prev.allowances, cash: e.target.value }
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información Previsional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Información Previsional
                      {formData.afp_auto_detected && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✨ Detectada automáticamente
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Configuración de AFP e institución de salud del trabajador
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AFP *
                        </label>
                        <select
                          value={formData.afp_name}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            afp_name: e.target.value,
                            afp_auto_detected: false // Se cambió manualmente
                          }))}
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                            formData.afp_auto_detected 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="CAPITAL">AFP Capital</option>
                          <option value="CUPRUM">AFP Cuprum</option>
                          <option value="HABITAT">AFP Habitat</option>
                          <option value="MODELO">AFP Modelo</option>
                          <option value="PLANVITAL">AFP PlanVital</option>
                          <option value="PROVIDA">AFP ProVida</option>
                          <option value="UNO">AFP Uno</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Institución de Salud *
                        </label>
                        <select
                          value={formData.health_institution}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            health_institution: e.target.value,
                            isapre_plan: e.target.value === 'FONASA' ? '' : prev.isapre_plan,
                            afp_auto_detected: false // Se cambió manualmente
                          }))}
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                            formData.afp_auto_detected 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="FONASA">FONASA</option>
                          <option value="BANMEDICA">Banmédica</option>
                          <option value="CONSALUD">Consalud</option>
                          <option value="CRUZ_BLANCA">Cruz Blanca</option>
                          <option value="COLMENA">Colmena Golden Cross</option>
                          <option value="VIDA_TRES">Vida Tres</option>
                        </select>
                      </div>
                    </div>

                    {/* Campo Isapre Plan - Solo si no es FONASA */}
                    {formData.health_institution !== 'FONASA' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plan Isapre
                        </label>
                        <input
                          type="text"
                          value={formData.isapre_plan}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            isapre_plan: e.target.value,
                            afp_auto_detected: false
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: Plan Base, Plan Premium"
                        />
                      </div>
                    )}

                    {/* Información adicional */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">Información Automática</p>
                          <p>
                            Esta información se detecta automáticamente al seleccionar un empleado.
                            Los datos se utilizarán para generar liquidaciones y archivos Previred sin errores.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error general */}
                {errors.general && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{errors.general}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Botones */}
                <div className="flex justify-end space-x-4">
                  <Link href="/payroll/contracts">
                    <Button variant="outline" disabled={loading}>
                      Cancelar
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading}
                    className="flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Crear Contrato
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}