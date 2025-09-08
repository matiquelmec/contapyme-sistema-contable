'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyId } from '@/contexts/CompanyContext';

// Tipos básicos para anexos
interface Employee {
  id: string;
  rut: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  employment_contracts?: Array<{
    id: string;
    position: string;
    department?: string;
    base_salary: number;
    contract_type: string;
    start_date?: string;
    end_date?: string;
  }>;
}

interface AnnexFormData {
  employee_id?: string;
  employeeName: string;
  employeeRut: string;
  employeePosition: string;
  companyName: string;
  companyRut: string;
  companyAddress: string;
  legalRepresentativeName: string;
  legalRepresentativeRut: string;
  originalContractDate: string;
  currentSalary: number;
  annexDate: string;
  annexType: 'renovation' | 'night_shift' | 'vacation' | 'salary_change' | 'position_change' | 'schedule_change' | 'overtime_agreement';
  
  // Campos específicos
  renovationType?: 'fixed_term' | 'indefinite';
  newEndDate?: string;
  nightShiftPercentage?: number;
  nightShiftStartTime?: string;
  nightShiftEndTime?: string;
  vacationStartDate?: string;
  vacationEndDate?: string;
  vacationDays?: number;
  newSalary?: number;
  newPosition?: string;
  newDepartment?: string;
  newSchedule?: string;
  effectiveDate?: string;
  observations?: string;
  
  // Campos para pacto de horas extras
  overtimePercentage?: number;
  overtimeDuration?: number; // en meses
  overtimeMaxHours?: number; // máximo horas extra por semana/mes
  overtimeJustification?: string;
}

export default function ContractAnnexesPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AnnexFormData['annexType']>('renovation');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState<Partial<AnnexFormData>>({
    annexDate: new Date().toISOString().split('T')[0],
    annexType: 'renovation'
  });
  
  // Estados específicos para renovación
  const [renovationType, setRenovationType] = useState<'fixed_term' | 'indefinite'>('fixed_term');
  const [newEndDate, setNewEndDate] = useState('');
  
  // Estados para trabajo nocturno
  const [nightShiftPercentage, setNightShiftPercentage] = useState(20);
  const [nightShiftStartTime, setNightShiftStartTime] = useState('21:00');
  const [nightShiftEndTime, setNightShiftEndTime] = useState('07:00');
  
  // Estados para vacaciones
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [vacationDays, setVacationDays] = useState(15);
  
  // Estados para cambios
  const [newSalary, setNewSalary] = useState<number | undefined>();
  const [newPosition, setNewPosition] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  
  // Estados generales
  const [effectiveDate, setEffectiveDate] = useState('');
  const [observations, setObservations] = useState('');
  
  // Estados para pacto de horas extras
  const [overtimePercentage, setOvertimePercentage] = useState(50); // 50% por defecto
  const [overtimeDuration, setOvertimeDuration] = useState(3); // 3 meses por defecto
  const [overtimeMaxHours, setOvertimeMaxHours] = useState(10); // 10 horas por semana por defecto
  const [overtimeJustification, setOvertimeJustification] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  const fetchEmployees = async () => {
    if (!companyId) {
      console.warn('Company ID not available yet');
      return;
    }
    
    try {

      const response = await fetch(`/api/payroll/employees?company_id=${companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Función para obtener el contrato activo del empleado
  const getActiveContract = (employee: Employee) => {
    return employee.employment_contracts?.find(contract => contract.contract_type);
  };

  // Función para verificar si un empleado puede renovar contrato
  const canRenovateContract = (employeeId: string): boolean => {
    if (!employeeId) return false;
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return false;
    
    const activeContract = getActiveContract(employee);
    if (!activeContract) return false;
    
    // Solo puede renovar si NO es indefinido
    return activeContract.contract_type !== 'indefinido';
  };

  // Función para calcular la fecha de vigencia automática para renovaciones
  const calculateRenewalEffectiveDate = (employeeId: string): string => {
    if (!employeeId) return '';
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return '';
    
    const activeContract = getActiveContract(employee);
    if (!activeContract) return '';
    
    if (!activeContract.end_date) {
      // Si no hay fecha de fin, usar la fecha actual como sugerencia
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    
    // Calcular el día siguiente al vencimiento del contrato
    const contractEndDate = new Date(activeContract.end_date);
    contractEndDate.setDate(contractEndDate.getDate() + 1);
    
    // Formatear como YYYY-MM-DD para el input date
    return contractEndDate.toISOString().split('T')[0];
  };

  const loadEmployeeData = async (employeeId: string) => {
    if (!employeeId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payroll/contracts/generate-annex?employee_id=${employeeId}&type=${selectedType}`);
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          ...data.baseData
        }));
        
        // Si hay salario actual, sugerirlo como nuevo salario para cambios
        if (data.baseData.currentSalary) {
          setNewSalary(data.baseData.currentSalary);
        }
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnnex = async () => {
    if (!selectedEmployee) {
      alert('Por favor selecciona un empleado');
      return;
    }

    setIsLoading(true);
    try {
      // Preparar datos completos del anexo
      const fullAnnexData: AnnexFormData = {
        ...formData as AnnexFormData,
        annexType: selectedType,
        employee_id: selectedEmployee,
        
        // Datos específicos según el tipo
        ...(selectedType === 'renovation' && {
          renovationType,
          newEndDate: renovationType === 'fixed_term' ? newEndDate : undefined,
          newSalary: newSalary, // ✅ AGREGAR newSalary para renovación
          effectiveDate: effectiveDate || formData.annexDate
        }),
        
        ...(selectedType === 'night_shift' && {
          nightShiftPercentage,
          nightShiftStartTime,
          nightShiftEndTime
        }),
        
        ...(selectedType === 'vacation' && {
          vacationStartDate,
          vacationEndDate,
          vacationDays
        }),
        
        ...(selectedType === 'overtime_agreement' && {
          overtimePercentage,
          overtimeDuration,
          overtimeMaxHours,
          overtimeJustification,
          effectiveDate: effectiveDate || formData.annexDate
        }),
        
        ...(selectedType === 'salary_change' && {
          newSalary,
          effectiveDate: effectiveDate || formData.annexDate
        }),
        
        ...(selectedType === 'position_change' && {
          newPosition,
          newDepartment,
          effectiveDate: effectiveDate || formData.annexDate
        }),
        
        ...(selectedType === 'schedule_change' && {
          newSchedule,
          effectiveDate: effectiveDate || formData.annexDate
        }),
        
        observations
      };

      const response = await fetch('/api/payroll/contracts/generate-annex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullAnnexData)
      });

      if (response.ok) {
        // Abrir el HTML en una nueva pestaña
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // ⚠️ ALERTA IMPORTANTE: Seguro de cesantía para contratos indefinidos
        if (selectedType === 'renovation' && renovationType === 'indefinite') {
          setTimeout(() => {
            alert('🚨 RECORDATORIO IMPORTANTE:\n\n' +
                  'El contrato ahora es INDEFINIDO. A partir del próximo mes:\n\n' +
                  '✅ EMPLEADO: Debe cotizar seguro de cesantía\n' +
                  '✅ EMPLEADOR: Debe cotizar 2.4% adicional por seguro de cesantía\n\n' +
                  'Recuerda actualizar esto en las próximas liquidaciones de sueldo.');
          }, 1000);
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating annex:', error);
      alert('Error al generar el anexo');
    } finally {
      setIsLoading(false);
    }
  };

  // Tipos de anexos dinámicos basados en el empleado seleccionado
  const getAnnexTypes = () => {
    const baseTypes = [
      { value: 'night_shift', label: 'Pacto Trabajo Nocturno' },
      { value: 'overtime_agreement', label: 'Pacto de Horas Extras' },
      { value: 'vacation', label: 'Comprobante de Feriado' },
      { value: 'salary_change', label: 'Cambio de Remuneración' },
      { value: 'position_change', label: 'Cambio de Cargo' },
      { value: 'schedule_change', label: 'Cambio de Horario' }
    ];

    // Solo agregar renovación si el empleado puede renovar
    if (canRenovateContract(selectedEmployee)) {
      baseTypes.unshift({ value: 'renovation', label: 'Renovación de Contrato' });
    }

    return baseTypes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl shadow-lg">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📄 Generador de Anexos Contractuales
          </h1>
          <p className="mt-2 text-blue-100">Crea anexos personalizados para cualquier empleado</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-b-xl shadow-lg p-6">
          {/* Selección de empleado y tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empleado
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => {
                  const employeeId = e.target.value;
                  setSelectedEmployee(employeeId);
                  
                  // Si el empleado no puede renovar y el tipo actual es renovación, cambiar a otro tipo
                  if (employeeId && !canRenovateContract(employeeId) && selectedType === 'renovation') {
                    setSelectedType('night_shift'); // Cambiar a trabajo nocturno por defecto
                  }
                  
                  // Si es renovación, calcular fecha de vigencia automáticamente
                  if (selectedType === 'renovation' && employeeId) {
                    const autoEffectiveDate = calculateRenewalEffectiveDate(employeeId);
                    if (autoEffectiveDate) {
                      setEffectiveDate(autoEffectiveDate);
                    }
                  }
                  
                  loadEmployeeData(employeeId);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.rut}
                  </option>
                ))}
              </select>
              
              {/* Mensaje informativo para contratos indefinidos */}
              {selectedEmployee && !canRenovateContract(selectedEmployee) && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">⚠️</span>
                    <p className="text-sm text-amber-800">
                      Este empleado tiene <strong>contrato indefinido</strong>. No puede generar anexos de renovación.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Anexo
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const newType = e.target.value as AnnexFormData['annexType'];
                  setSelectedType(newType);
                  
                  // Si cambió a renovación y hay un empleado seleccionado, calcular fecha de vigencia
                  if (newType === 'renovation' && selectedEmployee) {
                    const autoEffectiveDate = calculateRenewalEffectiveDate(selectedEmployee);
                    if (autoEffectiveDate) {
                      setEffectiveDate(autoEffectiveDate);
                    }
                  }
                  
                  if (selectedEmployee) {
                    loadEmployeeData(selectedEmployee);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {getAnnexTypes().map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campos específicos según el tipo de anexo */}
          {selectedType === 'renovation' && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">🔄 Datos de Renovación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Renovación
                  </label>
                  <select
                    value={renovationType}
                    onChange={(e) => setRenovationType(e.target.value as 'fixed_term' | 'indefinite')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="fixed_term">Plazo Fijo</option>
                    <option value="indefinite">Indefinido</option>
                  </select>
                </div>

                {renovationType === 'fixed_term' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Fecha de Término
                    </label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Vigencia
                    {effectiveDate && selectedEmployee && (
                      <span className="text-xs text-green-600 ml-1">
                        ✓ Calculada automáticamente
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    title={effectiveDate && selectedEmployee ? "Fecha calculada como el día siguiente al vencimiento del contrato actual" : ""}
                  />
                  {effectiveDate && selectedEmployee && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        const employee = employees.find(emp => emp.id === selectedEmployee);
                        const activeContract = employee?.employment_contracts?.find(contract => contract.contract_type);
                        
                        if (activeContract?.end_date) {
                          return '💡 Inicia el día siguiente al vencimiento del contrato actual';
                        } else {
                          return '⚠️ Sugerencia: el contrato actual no tiene fecha de fin definida';
                        }
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Remuneración (opcional)
                  </label>
                  <input
                    type="number"
                    value={newSalary || ''}
                    onChange={(e) => setNewSalary(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Dejar vacío para mantener actual"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedType === 'night_shift' && (
            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-purple-900 mb-3">🌙 Datos del Trabajo Nocturno</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recargo Nocturno (%)
                  </label>
                  <input
                    type="number"
                    value={nightShiftPercentage}
                    onChange={(e) => setNightShiftPercentage(Number(e.target.value))}
                    min="20"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={nightShiftStartTime}
                    onChange={(e) => setNightShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Término
                  </label>
                  <input
                    type="time"
                    value={nightShiftEndTime}
                    onChange={(e) => setNightShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedType === 'overtime_agreement' && (
            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-orange-900 mb-3">⏰ Datos del Pacto de Horas Extras</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recargo de Horas Extras (%)
                  </label>
                  <input
                    type="number"
                    value={overtimePercentage}
                    onChange={(e) => setOvertimePercentage(Number(e.target.value))}
                    min="50"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo legal: 50%</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración del Pacto (meses)
                  </label>
                  <select
                    value={overtimeDuration}
                    onChange={(e) => setOvertimeDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value={1}>1 mes</option>
                    <option value={2}>2 meses</option>
                    <option value={3}>3 meses (estándar)</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Normalmente 3 meses según Art. 32 Código del Trabajo</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo Horas Extras Semanales
                  </label>
                  <input
                    type="number"
                    value={overtimeMaxHours}
                    onChange={(e) => setOvertimeMaxHours(Number(e.target.value))}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo legal: 2 horas diarias</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio del Pacto
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Justificación del Pacto
                  </label>
                  <textarea
                    value={overtimeJustification}
                    onChange={(e) => setOvertimeJustification(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Aumento temporal de la demanda, proyecto especial, temporada alta..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Explicar la razón que justifica las horas extraordinarias</p>
                </div>
              </div>
            </div>
          )}

          {selectedType === 'vacation' && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-900 mb-3">🏖️ Datos del Feriado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={vacationStartDate}
                    onChange={(e) => setVacationStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Término
                  </label>
                  <input
                    type="date"
                    value={vacationEndDate}
                    onChange={(e) => setVacationEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días Hábiles
                  </label>
                  <input
                    type="number"
                    value={vacationDays}
                    onChange={(e) => setVacationDays(Number(e.target.value))}
                    min="1"
                    max="30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {(selectedType === 'salary_change' || selectedType === 'position_change' || selectedType === 'schedule_change') && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-900 mb-3">🔧 Datos del Cambio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedType === 'salary_change' || selectedType === 'position_change') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Remuneración
                    </label>
                    <input
                      type="number"
                      value={newSalary || ''}
                      onChange={(e) => setNewSalary(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                {selectedType === 'position_change' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuevo Cargo
                      </label>
                      <input
                        type="text"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuevo Departamento
                      </label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {selectedType === 'schedule_change' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nuevo Horario
                    </label>
                    <input
                      type="text"
                      value={newSchedule}
                      onChange={(e) => setNewSchedule(e.target.value)}
                      placeholder="Ej: Lunes a Viernes de 08:00 a 17:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Vigencia
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Observaciones (opcional)
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Agregar observaciones adicionales al anexo..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => router.push('/payroll/contracts')}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Volver a Contratos
            </button>
            
            <button
              onClick={generateAnnex}
              disabled={!selectedEmployee || isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${!selectedEmployee || isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'}`}
            >
              {isLoading ? (
                <>
                  ⏳ Generando...
                </>
              ) : (
                <>
                  📄 Generar Anexo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}