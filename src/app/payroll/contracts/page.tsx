'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  Plus, FileText, Edit, Eye, Download, Calendar, 
  User, DollarSign, MapPin, Clock, Filter, Search 
} from 'lucide-react';
import { useCompanyId } from '@/contexts/CompanyContext';
import { formatDate as utilFormatDate, formatCurrency as utilFormatCurrency } from '@/lib/utils';

interface Contract {
  id: string;
  employee_full_name: string;
  employee_rut: string;
  position: string;
  department?: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  base_salary: number;
  status: string;
  total_gross_salary?: number;
  workplace_address?: string;
  weekly_hours?: number;
  company_name: string;
  employee_id?: string;
}

export default function ContractsPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Cargar empleados con contratos
  const fetchEmployeesWithContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Primero obtener todos los empleados con sus contratos
      const employeesResponse = await fetch(`/api/payroll/employees?company_id=${companyId}`);
      const employeesData = await employeesResponse.json();

      if (employeesResponse.ok && (employeesData.success || employeesData.data)) {
        // La API devuelve los datos en 'data'
        const allEmployees = employeesData.data || employeesData.employees || [];
        
        // Filtrar solo empleados que tienen contratos
        const employeesWithContracts = allEmployees
          .filter((emp: any) => emp.employment_contracts && emp.employment_contracts.length > 0);
        
        setEmployees(employeesWithContracts);
        
        // Convertir empleados a formato de contratos para mantener compatibilidad
        const contractsList: Contract[] = [];
        employeesWithContracts.forEach((emp: any) => {
          emp.employment_contracts.forEach((contract: any) => {
            contractsList.push({
              id: contract.id,
              employee_id: emp.id,
              employee_full_name: `${emp.first_name} ${emp.last_name}`,
              employee_rut: emp.rut,
              position: contract.position || contract.job_position || '',
              department: contract.department || '',
              contract_type: contract.contract_type || 'indefinido',
              start_date: contract.start_date,
              end_date: contract.end_date,
              base_salary: contract.base_salary || 0,
              status: contract.status || 'active',
              total_gross_salary: contract.base_salary,
              workplace_address: contract.workplace_address,
              weekly_hours: contract.weekly_hours,
              company_name: 'ContaPyme Puq'
            });
          });
        });
        
        setContracts(contractsList);
      }
    } catch (err) {
      console.error('Error fetching employees with contracts:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchEmployeesWithContracts();
    }
  }, [companyId]);

  // Filtrar contratos
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === '' || 
      contract.employee_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employee_rut.includes(searchTerm) ||
      contract.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.contract_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Formatear fecha usando utilidad centralizada
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return utilFormatDate(dateString);
  };

  // Formatear moneda usando utilidad centralizada
  const formatCurrency = (amount: number) => {
    return utilFormatCurrency(amount);
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
  const generateContractPDF = async (contractId: string) => {
    try {
      // Usar GET con query params para generar el PDF
      const url = `/api/payroll/contracts/generate-pdf?contract_id=${contractId}`;
      
      // Abrir directamente en nueva ventana
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error generating contract PDF:', err);
      alert('Error al generar el contrato PDF');
    }
  };

  // Estadísticas
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    draft: contracts.filter(c => c.status === 'draft').length,
    terminated: contracts.filter(c => c.status === 'terminated').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollHeader 
        title="Gestión de Contratos"
        subtitle="Administra los contratos laborales de la empresa"
        showBackButton
      />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Contratos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Activos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Edit className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Borradores</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Terminados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.terminated}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controles */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                
                {/* Búsqueda */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, RUT o cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                </div>

                {/* Filtros */}
                <div className="flex gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="draft">Borradores</option>
                    <option value="terminated">Terminados</option>
                    <option value="expired">Expirados</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="por_obra">Por Obra</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <Link href="/payroll/contracts/new">
                    <Button variant="primary" className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Contrato
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de contratos */}
          <Card>
            <CardHeader>
              <CardTitle>Contratos Laborales</CardTitle>
              <CardDescription>
                {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} encontrado{filteredContracts.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Cargando contratos...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={fetchEmployeesWithContracts} variant="outline">
                    Intentar de nuevo
                  </Button>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {contracts.length === 0 ? 'No hay empleados con contratos registrados' : 'No se encontraron contratos'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {contracts.length === 0 
                      ? 'Los contratos aparecerán aquí una vez que los empleados tengan contratos asignados'
                      : 'Intenta ajustar los filtros de búsqueda'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContracts.map((contract) => (
                    <div 
                      key={contract.id} 
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {contract.employee_full_name}
                            </h3>
                            <p className="text-sm text-gray-500">{contract.employee_rut}</p>
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}>
                          {getStatusText(contract.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span>Cargo: {contract.position}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Inicio: {formatDate(contract.start_date)}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span>Salario: {formatCurrency(contract.total_gross_salary || contract.base_salary)}</span>
                        </div>
                        
                        {contract.weekly_hours && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{contract.weekly_hours}h/semana</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Tipo: {contract.contract_type.replace('_', ' ')}
                          {contract.end_date && ` • Fin: ${formatDate(contract.end_date)}`}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/payroll/contracts/${contract.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/payroll/contracts/${contract.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateContractPDF(contract.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}