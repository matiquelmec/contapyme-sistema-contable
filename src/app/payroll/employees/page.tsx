'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Plus, Users, Search, Filter, Eye, Edit, Trash2, DollarSign, Activity, ArrowRight, Mail, Briefcase, FileText } from 'lucide-react';
import EmployeeEditModal from '@/components/payroll/EmployeeEditModal';

interface Employee {
  id: string;
  rut: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  status: string;
  employment_contracts?: Array<{
    id: string;
    position: string;
    base_salary: number;
    status: string;
    contract_type?: string;
  }>;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; employee: Employee | null; permanent: boolean }>({
    show: false,
    employee: null,
    permanent: false
  });
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState<{ show: boolean; employee: Employee | null }>({
    show: false,
    employee: null
  });

  const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Optimización: Headers para cache y performance
      const response = await fetch(`/api/payroll/employees?company_id=${COMPANY_ID}`, {
        headers: {
          'Cache-Control': 'public, max-age=30', // Cache de 30 segundos
        }
      });
      
      const data = await response.json();

      if (response.ok) {
        setEmployees(data.data || []);
      } else {
        setError(data.error || 'Error al cargar empleados');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setDeleteModal({ show: true, employee, permanent: false });
  };

  // Función optimizada para ver contrato del empleado (sin consultas adicionales)
  const handleViewContract = (employee: Employee) => {
    try {
      if (!employee.employment_contracts || employee.employment_contracts.length === 0) {
        alert('No se encontró contrato para este empleado');
        return;
      }
      
      // Usar el primer contrato activo
      const contract = employee.employment_contracts[0];
      const contractUrl = `/api/payroll/contracts/generate-pdf?contract_id=${contract.id}`;
      
      // Abrir en nueva pestaña
      window.open(contractUrl, '_blank');
      
    } catch (error) {
      console.error('Error al obtener contrato:', error);
      alert('Error al cargar el contrato');
    }
  };

  const confirmDelete = async (permanent: boolean = false) => {
    if (!deleteModal.employee) return;

    try {
      setDeleting(true);
      const url = permanent 
        ? `/api/payroll/employees?id=${deleteModal.employee.id}&company_id=${COMPANY_ID}&permanent=true`
        : `/api/payroll/employees?id=${deleteModal.employee.id}&company_id=${COMPANY_ID}`;
        
      const response = await fetch(url, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Recargar la lista de empleados
        await fetchEmployees();
        setDeleteModal({ show: false, employee: null, permanent: false });
        const message = permanent 
          ? '✅ Empleado eliminado permanentemente del sistema'
          : '✅ Empleado desactivado exitosamente';
        alert(message);
      } else {
        alert(`❌ Error: ${data.error || 'No se pudo eliminar el empleado'}`);
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('❌ Error de conexión al eliminar empleado');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, employee: null, permanent: false });
  };

  // Función para limpiar caracteres especiales malformados
  const cleanText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã/g, 'Á')
      .replace(/Ã/g, 'É')
      .replace(/Ã/g, 'Í')
      .replace(/Ã/g, 'Ó')
      .replace(/Ã/g, 'Ú')
      .replace(/Ã/g, 'Ñ')
      .replace(/�/g, 'é')
      .trim();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <PayrollHeader 
          title="Empleados"
          subtitle="Gestión de empleados y contratos"
          showBackButton
        />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando empleados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PayrollHeader 
        title="Empleados"
        subtitle="Gestión de empleados y contratos"
        showBackButton
      />

      {/* Hero Section con métricas destacadas */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Gestión de Empleados
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mb-6">
                Administra tu equipo de trabajo con herramientas profesionales
              </p>
              
              {/* Quick stats en hero */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold">{employees.length}</div>
                  <div className="text-xs text-blue-100">Total Empleados</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</div>
                  <div className="text-xs text-blue-100">Activos</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold">{employees.filter(e => e.employment_contracts && e.employment_contracts.length > 0).length}</div>
                  <div className="text-xs text-blue-100">Con Contratos</div>
                </div>
              </div>
            </div>
            
            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/payroll/employees/new">
                <button className="w-full group relative px-6 py-3 rounded-xl bg-green-500/80 hover:bg-green-500 border border-green-400/50 hover:border-green-400 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-white font-medium">
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Nuevo Empleado</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Filtros modernizados */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar empleados..."
                className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <button className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-200 hover:border-blue-300 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-blue-700 font-medium">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* Error State modernizado */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200">
            <div className="flex items-center text-red-700">
              <Users className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Lista de empleados */}
        {employees.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-white/20 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Users className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              No hay empleados registrados
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Comienza agregando tu primer empleado al sistema para gestionar contratos y nóminas
            </p>
            <Link href="/payroll/employees/new">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105">
                <Plus className="h-4 w-4" />
                <span>Agregar Primer Empleado</span>
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/80 transition-all duration-200 group">
                {/* Vista mobile-first */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info principal del empleado */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {cleanText(`${employee.first_name} ${employee.last_name}`)}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600">
                        <span className="truncate">RUT: {employee.rut}</span>
                        {employee.employment_contracts && employee.employment_contracts.length > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-3 h-3" />
                              <span className="truncate">{cleanText(employee.employment_contracts[0].position)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {employee.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Métricas y acciones - responsive */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    {/* Información adicional */}
                    <div className="grid grid-cols-2 sm:flex sm:gap-4 gap-2">
                      {employee.employment_contracts && employee.employment_contracts.length > 0 && (
                        <div className="text-center sm:text-right">
                          <div className="text-xs text-gray-500 mb-1">Sueldo Base</div>
                          <div className="font-bold text-green-600 text-sm truncate">
                            {formatCurrency(employee.employment_contracts[0].base_salary).slice(0, 10)}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center sm:text-right">
                        <div className="text-xs text-gray-500 mb-1">Estado</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'active' 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border border-gray-200'
                        }`}>
                          {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Botones de acción - responsivos */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link href={`/payroll/employees/${employee.id}`} className="w-full sm:w-auto">
                        <button className="w-full group/btn relative px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
                          <Eye className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                          <span>Ver</span>
                        </button>
                      </Link>
                      <button
                        onClick={() => setEditModal({ show: true, employee })}
                        className="w-full sm:w-auto group/btn relative px-3 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        <Edit className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                        <span>Editar</span>
                      </button>
                      <button 
                        onClick={() => handleViewContract(employee)}
                        className="w-full sm:w-auto group/btn relative px-3 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        <FileText className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                        <span>Ver Contrato</span>
                      </button>
                      <Link href={`/payroll/employees/${employee.id}/edit`} className="w-full sm:w-auto">
                      </Link>
                      <button 
                        onClick={() => handleDeleteClick(employee)}
                        className="w-full sm:w-auto group/btn relative px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        <Trash2 className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Eliminar Empleado
                </h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-800 mb-4">
                ¿Qué acción deseas realizar con{' '}
                <strong>
                  {cleanText(`${deleteModal.employee?.first_name} ${deleteModal.employee?.last_name}`)}
                </strong>
                ?
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-medium text-yellow-800 text-sm mb-1">Desactivar (Recomendado)</div>
                  <div className="text-xs text-yellow-700">
                    El empleado se marcará como inactivo pero se conservarán todos sus registros históricos para reportes y auditorías.
                  </div>
                </div>
                
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="font-medium text-red-800 text-sm mb-1">Eliminar Permanentemente ⚠️</div>
                  <div className="text-xs text-red-700">
                    Se eliminará completamente del sistema junto con todos sus contratos, liquidaciones y registros. Esta acción NO se puede deshacer.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-xl transition-colors duration-200 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete(false)}
                disabled={deleting}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-colors duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Desactivar Empleado</span>
                  </>
                )}
              </button>
              <button
                onClick={() => confirmDelete(true)}
                disabled={deleting}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Permanentemente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de empleado */}
      {editModal.show && editModal.employee && (
        <EmployeeEditModal
          isOpen={editModal.show}
          onClose={() => setEditModal({ show: false, employee: null })}
          employeeId={editModal.employee.id}
          onSave={() => {
            setEditModal({ show: false, employee: null });
            // Solo recargar si no estamos en estado de carga
            if (!loading) {
              fetchEmployees();
            }
          }}
        />
      )}
    </div>
  );
}