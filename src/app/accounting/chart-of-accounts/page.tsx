'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Download, Upload, 
  FolderTree, FileText, Eye, Filter, RefreshCw
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  level_type: string;
  account_type: string;
  parent_code?: string;
  is_active: boolean;
  created_at: string;
}

interface Statistics {
  total: number;
  by_level: {
    nivel_1: number;
    nivel_2: number;
    nivel_3: number;
    imputable: number;
  };
  by_type: {
    activo: number;
    pasivo: number;
    patrimonio: number;
    ingreso: number;
    gasto: number;
  };
  active: number;
  inactive: number;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<ChartAccount[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Cargar cuentas del plan de cuentas
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chart-of-accounts');
      const data = await response.json();

      if (data.accounts) {
        setAccounts(data.accounts);
        
        // Calcular estadísticas básicas si no vienen en la respuesta
        const stats = calculateStatistics(data.accounts);
        setStatistics(stats);
      } else {
        console.error('Error loading accounts:', data.message);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calculateStatistics = (accounts: ChartAccount[]): Statistics => {
    return {
      total: accounts.length,
      by_level: {
        nivel_1: accounts.filter(a => a.level_type === '1er Nivel').length,
        nivel_2: accounts.filter(a => a.level_type === '2do Nivel').length,
        nivel_3: accounts.filter(a => a.level_type === '3er Nivel').length,
        imputable: accounts.filter(a => a.level_type === 'Imputable').length
      },
      by_type: {
        activo: accounts.filter(a => a.account_type === 'ACTIVO').length,
        pasivo: accounts.filter(a => a.account_type === 'PASIVO').length,
        patrimonio: accounts.filter(a => a.account_type === 'PATRIMONIO').length,
        ingreso: accounts.filter(a => a.account_type === 'INGRESO').length,
        gasto: accounts.filter(a => a.account_type === 'GASTO').length
      },
      active: accounts.filter(a => a.is_active).length,
      inactive: accounts.filter(a => !a.is_active).length
    };
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...accounts];

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de nivel
    if (levelFilter) {
      filtered = filtered.filter(account => account.level_type === levelFilter);
    }

    // Filtro de tipo
    if (typeFilter) {
      filtered = filtered.filter(account => account.account_type === typeFilter);
    }

    // Filtro de activo/inactivo
    if (activeFilter !== '') {
      filtered = filtered.filter(account => 
        activeFilter === 'true' ? account.is_active : !account.is_active
      );
    }

    setFilteredAccounts(filtered);
  }, [accounts, searchTerm, levelFilter, typeFilter, activeFilter]);

  // Cargar datos al montar
  useEffect(() => {
    loadAccounts();
  }, []);

  // Manejar creación/edición de cuenta
  const handleSaveAccount = async (accountData: Partial<ChartAccount>) => {
    try {
      const isEditing = editingAccount !== null;
      const url = isEditing 
        ? `/api/chart-of-accounts/${editingAccount.id}`
        : '/api/chart-of-accounts';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });

      const result = await response.json();

      if (result.success) {
        await loadAccounts();
        setShowForm(false);
        setEditingAccount(null);
        alert(result.message);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Error al guardar cuenta');
    }
  };

  // Manejar eliminación de cuenta
  const handleDeleteAccount = async (account: ChartAccount) => {
    const confirmMessage = account.level_type === 'Imputable' 
      ? `¿Está seguro de ELIMINAR PERMANENTEMENTE la cuenta ${account.code} - ${account.name}?`
      : `¿Está seguro de desactivar la cuenta ${account.code} - ${account.name}?`;
      
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/chart-of-accounts?id=${account.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Forzar recarga completa de datos
        setLoading(true);
        await loadAccounts();
        setLoading(false);
        
        // Mostrar mensaje de éxito
        alert(result.message || 'Cuenta eliminada exitosamente');
      } else {
        alert('Error: ' + (result.error || 'Error al eliminar cuenta'));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error al eliminar cuenta. Por favor intente nuevamente.');
    }
  };

  // Exportar cuentas
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('include_inactive', 'false');

      const response = await fetch(`/api/chart-of-accounts/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plan_cuentas_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert('Error al exportar: ' + error.error);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar cuentas');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Plan de Cuentas"
          subtitle="Gestión completa del plan de cuentas contable"
          showBackButton={true}
          backHref="/accounting"
        />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Cargando plan de cuentas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Plan de Cuentas"
        subtitle="Gestión completa del plan de cuentas contable"
        showBackButton={true}
        backHref="/accounting"
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadAccounts}
            >
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleExport('csv')}
            >
              Exportar
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingAccount(null);
                setShowForm(true);
              }}
            >
              Nueva Cuenta
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        {/* Estadísticas */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-blue-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total Cuentas</div>
            </div>
            <div className="bg-white border border-green-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
              <div className="text-sm text-gray-600">Activas</div>
            </div>
            <div className="bg-white border border-purple-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">{statistics.by_level?.imputable || 0}</div>
              <div className="text-sm text-gray-600">Imputables</div>
            </div>
            <div className="bg-white border border-amber-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-600">{statistics.by_type?.activo || 0}</div>
              <div className="text-sm text-gray-600">Activos</div>
            </div>
            <div className="bg-white border border-red-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-600">{statistics.by_type?.pasivo || 0}</div>
              <div className="text-sm text-gray-600">Pasivos</div>
            </div>
            <div className="bg-white border border-indigo-100 rounded-xl p-4">
              <div className="text-2xl font-bold text-indigo-600">{statistics.by_type?.patrimonio || 0}</div>
              <div className="text-sm text-gray-600">Patrimonio</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                />
              </div>
            </div>
            
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
            >
              <option value="">Todos los niveles</option>
              <option value="1er Nivel">1er Nivel</option>
              <option value="2do Nivel">2do Nivel</option>
              <option value="3er Nivel">3er Nivel</option>
              <option value="Imputable">Imputable</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
            >
              <option value="">Todos los tipos</option>
              <option value="ACTIVO">Activo</option>
              <option value="PASIVO">Pasivo</option>
              <option value="PATRIMONIO">Patrimonio</option>
              <option value="INGRESO">Ingreso</option>
              <option value="GASTO">Gasto</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
            >
              <option value="true">Solo activas</option>
              <option value="false">Solo inactivas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>

        {/* Tabla de cuentas */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Código</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Nivel</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Padre</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Estado</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {account.code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{account.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        account.level_type === 'Imputable' ? 'bg-blue-100 text-blue-800' :
                        account.level_type === '3er Nivel' ? 'bg-purple-100 text-purple-800' :
                        account.level_type === '2do Nivel' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {account.level_type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        account.account_type === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                        account.account_type === 'PASIVO' ? 'bg-red-100 text-red-800' :
                        account.account_type === 'PATRIMONIO' ? 'bg-indigo-100 text-indigo-800' :
                        account.account_type === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {account.account_type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600 font-mono">
                        {account.parent_code || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        account.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="w-4 h-4" />}
                          onClick={() => {
                            setEditingAccount(account);
                            setShowForm(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleDeleteAccount(account)}
                          className="text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No se encontraron cuentas con los filtros aplicados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <AccountFormModal
          account={editingAccount}
          onSave={handleSaveAccount}
          onClose={() => {
            setShowForm(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
}

// Componente Modal para formulario de cuenta
interface AccountFormModalProps {
  account: ChartAccount | null;
  onSave: (data: Partial<ChartAccount>) => void;
  onClose: () => void;
}

function AccountFormModal({ account, onSave, onClose }: AccountFormModalProps) {
  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    level_type: account?.level_type || '1er Nivel',
    account_type: account?.account_type || 'ACTIVO',
    parent_code: account?.parent_code || '',
    is_active: account?.is_active !== undefined ? account.is_active : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      alert('Código y nombre son requeridos');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código*
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              placeholder="1.1.1.001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre*
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              placeholder="Nombre de la cuenta"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Nivel*
            </label>
            <select
              value={formData.level_type}
              onChange={(e) => setFormData(prev => ({ ...prev, level_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              required
            >
              <option value="1er Nivel">1er Nivel</option>
              <option value="2do Nivel">2do Nivel</option>
              <option value="3er Nivel">3er Nivel</option>
              <option value="Imputable">Imputable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cuenta*
            </label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              required
            >
              <option value="ACTIVO">Activo</option>
              <option value="PASIVO">Pasivo</option>
              <option value="PATRIMONIO">Patrimonio</option>
              <option value="INGRESO">Ingreso</option>
              <option value="GASTO">Gasto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Padre
            </label>
            <input
              type="text"
              value={formData.parent_code}
              onChange={(e) => setFormData(prev => ({ ...prev, parent_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              placeholder="1.1.1 (opcional)"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Cuenta activa
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {account ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}