'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { ArrowLeft, Edit, Trash2, User, Mail, Phone, MapPin, Briefcase, Calendar, DollarSign } from 'lucide-react';
import { formatDate as utilFormatDate, formatCurrency as utilFormatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  rut: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  hire_date?: string;
  status: string;
  employment_contracts?: Array<{
    id: string;
    position: string;
    base_salary: number;
    status: string;
    start_date: string;
    end_date?: string;
    contract_type: string;
    afp_name?: string;
    health_institution?: string;
    isapre_plan?: string;
  }>;
  payroll_config?: {
    id: string;
    afp_code: string;
    health_institution_code: string;
    family_allowances: number;
  };
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  useEffect(() => {
    if (params.id) {
      fetchEmployee(params.id as string);
    }
  }, [params.id]);

  const fetchEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payroll/employees/${employeeId}?company_id=${COMPANY_ID}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployee(data.data);
      } else {
        setError(data.error || 'Error al cargar empleado');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Obtener contrato activo y su información previsional
  const getActiveContract = (employee: Employee) => {
    return employee.employment_contracts?.find(contract => contract.status === 'active');
  };

  const getAfpInfo = (employee: Employee) => {
    const activeContract = getActiveContract(employee);
    // TEMPORAL: Solo usar configuración individual hasta que se ejecute la migración
    return employee.payroll_config?.afp_code || 'No definida';
  };

  const getHealthInfo = (employee: Employee) => {
    const activeContract = getActiveContract(employee);
    // TEMPORAL: Solo usar configuración individual hasta que se ejecute la migración
    return employee.payroll_config?.health_institution_code || 'No definida';
  };

  // Formatear fecha usando utilidad centralizada
  const formatDate = (dateString: string) => {
    return utilFormatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Cargando..."
          subtitle="Obteniendo información del empleado"
          showBackButton
        />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando empleado...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Error"
          subtitle="No se pudo cargar el empleado"
          showBackButton
        />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  {error || 'Empleado no encontrado'}
                </h3>
                <Link href="/payroll/employees">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Lista de Empleados
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeContract = employee.employment_contracts?.find(contract => contract.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={`${employee.first_name} ${employee.last_name}`}
        subtitle={`RUT: ${employee.rut}`}
        showBackButton
        actions={
          <div className="flex space-x-2">
            <Link href={`/payroll/employees/${employee.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button variant="danger" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Información Personal */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <p className="text-gray-900 font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT
                    </label>
                    <p className="text-gray-900">{employee.rut}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </label>
                    <p className="text-gray-900">{employee.email || 'No registrado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Teléfono
                    </label>
                    <p className="text-gray-900">{employee.phone || 'No registrado'}</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Dirección
                    </label>
                    <p className="text-gray-900">{employee.address || 'No registrada'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Nacimiento
                    </label>
                    <p className="text-gray-900">
                      {employee.birth_date ? formatDate(employee.birth_date) : 'No registrada'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Contratación
                    </label>
                    <p className="text-gray-900">
                      {employee.hire_date ? formatDate(employee.hire_date) : 'No registrada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrato Activo */}
            {activeContract && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-green-600" />
                    Contrato Activo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cargo
                      </label>
                      <p className="text-gray-900 font-medium">{activeContract.position}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Sueldo Base
                      </label>
                      <p className="text-gray-900 font-medium text-lg text-green-600">
                        {formatCurrency(activeContract.base_salary)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Contrato
                      </label>
                      <p className="text-gray-900">{activeContract.contract_type}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Fecha de Inicio
                      </label>
                      <p className="text-gray-900">{formatDate(activeContract.start_date)}</p>
                    </div>

                    {activeContract.end_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Término
                        </label>
                        <p className="text-gray-900">{formatDate(activeContract.end_date)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel Lateral */}
          <div>
            {/* Estado */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Estado del Empleado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    employee.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href={`/payroll/employees/${employee.id}/edit`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Información
                    </Button>
                  </Link>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Ver Liquidaciones
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Calendar className="h-4 w-4 mr-2" />
                    Historial de Asistencia
                  </Button>
                  
                  <Button variant="danger" className="w-full justify-start">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Dar de Baja
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Configuración Previsional */}
            {employee.payroll_config && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Previsional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        AFP
                      </label>
                      <div>
                        <p className="text-sm text-gray-900">{getAfpInfo(employee)}</p>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md">
                          Configuración individual
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Institución de Salud
                      </label>
                      <div>
                        <p className="text-sm text-gray-900">{getHealthInfo(employee)}</p>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md mt-1 inline-block">
                          Configuración individual
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cargas Familiares
                      </label>
                      <p className="text-sm text-gray-900">{employee.payroll_config.family_allowances}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}