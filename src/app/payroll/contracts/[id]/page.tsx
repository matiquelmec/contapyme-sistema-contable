'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  ArrowLeft, Edit, Download, Calendar, User, DollarSign, 
  MapPin, Clock, FileText, Building, Phone, Mail, CreditCard,
  AlertCircle, CheckCircle, XCircle, Clock3
} from 'lucide-react';
import { formatDate as utilFormatDate, formatCurrency as utilFormatCurrency } from '@/lib/utils';

interface ContractDetails {
  id: string;
  position: string;
  department?: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  base_salary: number;
  gratification_amount?: number;
  bonuses?: any[];
  allowances?: any;
  status: string;
  weekly_hours?: number;
  workplace_address?: string;
  schedule_details?: any;
  job_functions?: string[];
  obligations?: string[];
  prohibitions?: string[];
  resignation_notice_days?: number;
  total_gross_salary?: number;
  total_liquid_salary?: number;
  employees?: {
    rut: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    birth_date: string;
    nationality?: string;
    marital_status?: string;
    address?: string;
    city?: string;
    email?: string;
    phone?: string;
    bank_name?: string;
    bank_account_type?: string;
    bank_account_number?: string;
  };
  companies?: {
    name: string;
    rut: string;
    legal_representative_name?: string;
    legal_representative_rut?: string;
    legal_representative_position?: string;
    legal_representative_profession?: string;
    legal_representative_nationality?: string;
    legal_representative_civil_status?: string;
    legal_representative_address?: string;
    fiscal_address?: string;
    fiscal_city?: string;
  };
}

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar detalles del contrato
  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/payroll/contracts/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar el contrato');
        }

        setContract(data.data);
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchContract();
    }
  }, [params.id]);

  // Formatear fecha usando utilidad centralizada
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return utilFormatDate(dateString, 'long');
  };

  // Formatear moneda usando utilidad centralizada
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return utilFormatCurrency(amount);
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-50 border-green-200';
      case 'draft': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'terminated': return 'text-red-700 bg-red-50 border-red-200';
      case 'expired': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Obtener icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5" />;
      case 'draft': return <Clock3 className="h-5 w-5" />;
      case 'terminated': return <XCircle className="h-5 w-5" />;
      case 'expired': return <AlertCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Obtener texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'draft': return 'Borrador';
      case 'terminated': return 'Terminado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  // Generar PDF del contrato
  const generateContractPDF = async () => {
    try {
      const response = await fetch('/api/payroll/contracts/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: params.id, format: 'html' })
      });

      if (!response.ok) {
        throw new Error('Error al generar el contrato');
      }

      const html = await response.text();
      
      // Abrir HTML en nueva ventana para imprimir/guardar como PDF
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (err) {
      console.error('Error generating contract PDF:', err);
      alert('Error al generar el contrato PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Cargando contrato..."
          subtitle="Obteniendo detalles del contrato"
          showBackButton
        />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando detalles del contrato...</span>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Error"
          subtitle="No se pudo cargar el contrato"
          showBackButton
        />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error || 'Contrato no encontrado'}
              </h3>
              <p className="text-gray-500 mb-6">
                No se pudo cargar la información del contrato solicitado.
              </p>
              <Link href="/payroll/contracts">
                <Button variant="primary">
                  Volver a Contratos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const employee = contract.employees;
  const company = contract.companies;
  const employeeFullName = employee ? `${employee.first_name} ${employee.last_name} ${employee.middle_name || ''}`.trim() : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollHeader 
        title={`Contrato - ${employeeFullName}`}
        subtitle={`${contract.position} - ${getStatusText(contract.status)}`}
        showBackButton
      />

      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
          {/* Header con acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${getStatusColor(contract.status)}`}>
              {getStatusIcon(contract.status)}
              <span className="ml-2 font-medium">{getStatusText(contract.status)}</span>
            </div>
            
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <Button
                variant="outline"
                onClick={() => router.push(`/payroll/contracts/${params.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="primary"
                onClick={generateContractPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Generar PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Información del empleado */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Información del Empleado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                      <p className="text-gray-900">{employeeFullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">RUT</label>
                      <p className="text-gray-900">{employee?.rut}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fecha de Nacimiento</label>
                      <p className="text-gray-900">{formatDate(employee?.birth_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nacionalidad</label>
                      <p className="text-gray-900">{employee?.nationality || 'No especificada'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Estado Civil</label>
                      <p className="text-gray-900">{employee?.marital_status || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Teléfono</label>
                      <p className="text-gray-900">{employee?.phone || 'No especificado'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Dirección</label>
                      <p className="text-gray-900">{employee?.address || 'No especificada'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información del contrato */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Detalles del Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cargo</label>
                      <p className="text-gray-900">{contract.position}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Departamento</label>
                      <p className="text-gray-900">{contract.department || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tipo de Contrato</label>
                      <p className="text-gray-900 capitalize">{contract.contract_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Horas Semanales</label>
                      <p className="text-gray-900">{contract.weekly_hours || 45} horas</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fecha de Inicio</label>
                      <p className="text-gray-900">{formatDate(contract.start_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fecha de Término</label>
                      <p className="text-gray-900">{contract.end_date ? formatDate(contract.end_date) : 'Indefinido'}</p>
                    </div>
                    {contract.workplace_address && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Lugar de Trabajo</label>
                        <p className="text-gray-900">{contract.workplace_address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Funciones del cargo */}
              {contract.job_functions && contract.job_functions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Funciones del Cargo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                      {contract.job_functions.map((func, index) => (
                        <li key={index} className="text-gray-700">{func}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              
              {/* Remuneración */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    Remuneración
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Sueldo Base</label>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(contract.base_salary)}</p>
                  </div>
                  {contract.gratification_amount && contract.gratification_amount > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gratificación Legal</label>
                      <p className="text-gray-900">{formatCurrency(contract.gratification_amount)}</p>
                    </div>
                  )}
                  {contract.total_gross_salary && (
                    <div className="pt-2 border-t">
                      <label className="text-sm font-medium text-gray-600">Total Bruto</label>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(contract.total_gross_salary)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Asignaciones */}
              {contract.allowances && Object.keys(contract.allowances).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Asignaciones</CardTitle>
                    <CardDescription>Beneficios no imponibles</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contract.allowances.meal && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Colación</span>
                        <span className="font-medium">{formatCurrency(contract.allowances.meal)}</span>
                      </div>
                    )}
                    {contract.allowances.transport && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Movilización</span>
                        <span className="font-medium">{formatCurrency(contract.allowances.transport)}</span>
                      </div>
                    )}
                    {contract.allowances.cash && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Asig. de Caja</span>
                        <span className="font-medium">{formatCurrency(contract.allowances.cash)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Información bancaria */}
              {employee?.bank_name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                      Información Bancaria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Banco</label>
                      <p className="text-gray-900">{employee.bank_name}</p>
                    </div>
                    {employee.bank_account_type && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tipo de Cuenta</label>
                        <p className="text-gray-900 capitalize">{employee.bank_account_type}</p>
                      </div>
                    )}
                    {employee.bank_account_number && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Número de Cuenta</label>
                        <p className="text-gray-900">{employee.bank_account_number}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Información de la empresa */}
              {company && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2 text-gray-600" />
                      Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Razón Social</label>
                      <p className="text-gray-900">{company.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">RUT</label>
                      <p className="text-gray-900">{company.rut}</p>
                    </div>
                    {company.legal_representative_name && (
                      <>
                        <div className="pt-2 border-t">
                          <label className="text-sm font-medium text-gray-600">Representante Legal</label>
                          <p className="text-gray-900 font-medium">{company.legal_representative_name}</p>
                        </div>
                        {company.legal_representative_rut && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">RUT Rep. Legal</label>
                            <p className="text-gray-900">{company.legal_representative_rut}</p>
                          </div>
                        )}
                        {company.legal_representative_position && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Cargo</label>
                            <p className="text-gray-900">{company.legal_representative_position}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}