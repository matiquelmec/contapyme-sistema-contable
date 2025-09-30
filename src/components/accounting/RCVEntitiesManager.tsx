'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2,
  Search,
  Save,
  X,
  Users,
  Building2,
  UserCheck,
  Building,
  Shield
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

// Interface para entidad RCV
interface RCVEntity {
  id: string;
  company_id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  legal_name?: string;
  business_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  account_code?: string;
  account_name?: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interface para plan de cuentas
interface ChartAccount {
  id: string;
  code: string;
  name: string;
  level_type: string;
  account_type: string;
  parent_code?: string;
  is_active: boolean;
}

interface RCVEntitiesManagerProps {
  companyId: string;
}

export default function RCVEntitiesManager({ companyId }: RCVEntitiesManagerProps) {
  // Estados para RCV entities
  const [rcvEntities, setRcvEntities] = useState<RCVEntity[]>([]);
  const [editingEntity, setEditingEntity] = useState<RCVEntity | null>(null);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [systemDiagnostics, setSystemDiagnostics] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [editingInlineEntity, setEditingInlineEntity] = useState<string | null>(null);
  const [savingInlineEntity, setSavingInlineEntity] = useState<string | null>(null);
  
  // Estados para plan de cuentas (para selector)
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);

  // Estados para formulario de entidad
  const [entityFormData, setEntityFormData] = useState({
    entity_name: '',
    entity_rut: '',
    entity_type: 'supplier' as 'supplier' | 'customer' | 'both',
    legal_name: '',
    business_name: '',
    address: '',
    phone: '',
    email: '',
    account_code: '',
    account_name: '',
    default_tax_rate: 19.0,
    is_tax_exempt: false,
    notes: '',
    is_active: true
  });

  // Cargar cuentas del plan de cuentas
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/chart-of-accounts');
      const result = await response.json();
      if (result.accounts) {
        setAccounts(result.accounts);
      }
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
    }
  };

  // Cargar entidades RCV
  const loadRcvEntities = async () => {
    if (!companyId) return;
    
    try {
      setLoadingEntities(true);
      const response = await fetch(`/api/accounting/rcv-entities?company_id=${companyId}&entity_type=${entityTypeFilter}&search=${entitySearchTerm}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setRcvEntities(result.data);
        console.log('Entidades RCV cargadas:', result.data.length);
        
        // Verificar si hay una entidad en modo de edición que ya no existe
        const entityExists = rcvEntities.some(entity => entity.id === editingInlineEntity);
        if (editingInlineEntity && !entityExists) {
          console.log('Entidad en edición ya no existe, limpiando estado...');
          setEditingInlineEntity(null);
          setSavingInlineEntity(null);
        }
      } else {
        console.error('Error loading RCV entities:', result);
      }
    } catch (error) {
      console.error('Error loading RCV entities:', error);
    } finally {
      setLoadingEntities(false);
    }
  };

  // Cargar diagnósticos del sistema
  const loadSystemDiagnostics = async () => {
    try {
      const response = await fetch('/api/accounting/rcv-entities/diagnostics');
      const result = await response.json();
      if (result.success) {
        setSystemDiagnostics(result.data);
      }
    } catch (error) {
      console.error('Error loading diagnostics:', error);
    }
  };

  // Efectos
  useEffect(() => {
    if (companyId) {
      loadAccounts();
      loadRcvEntities();
      loadSystemDiagnostics();
    }
  }, [companyId, entityTypeFilter, entitySearchTerm]);

  // Guardar entidad RCV
  const saveRcvEntity = async () => {
    if (!companyId) return;

    try {
      const method = editingEntity ? 'PUT' : 'POST';
      const url = '/api/accounting/rcv-entities';
      
      const requestData = {
        ...entityFormData,
        company_id: companyId,
        ...(editingEntity && { id: editingEntity.id })
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Entidad RCV ${editingEntity ? 'actualizada' : 'creada'} exitosamente`);
        loadRcvEntities();
        loadSystemDiagnostics();
        setShowEntityForm(false);
        setEditingEntity(null);
        resetEntityForm();
      } else {
        alert(`Error al ${editingEntity ? 'actualizar' : 'crear'} entidad: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error saving RCV entity:', error);
      alert('Error interno del servidor');
    }
  };

  // Eliminar entidad RCV
  const deleteRcvEntity = async (entityId: string) => {
    if (!confirm('¿Está seguro que desea eliminar esta entidad RCV?')) {
      return;
    }

    try {
      const response = await fetch(`/api/accounting/rcv-entities/${entityId}?company_id=${companyId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Entidad RCV eliminada exitosamente');
        loadRcvEntities();
        loadSystemDiagnostics();
      } else {
        alert(`Error al eliminar entidad: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting RCV entity:', error);
      alert('Error interno del servidor');
    }
  };

  // Editar entidad inline
  const saveInlineEntity = async (entityId: string, updatedData: Partial<RCVEntity>) => {
    try {
      setSavingInlineEntity(entityId);
      
      const response = await fetch('/api/accounting/rcv-entities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: entityId,
          company_id: companyId,
          ...updatedData
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Entidad actualizada exitosamente');
        loadRcvEntities();
        loadSystemDiagnostics();
        setEditingInlineEntity(null);
      } else {
        alert(`Error al actualizar entidad: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating RCV entity:', error);
      alert('Error interno del servidor');
    } finally {
      setSavingInlineEntity(null);
    }
  };

  // Reset del formulario
  const resetEntityForm = () => {
    setEntityFormData({
      entity_name: '',
      entity_rut: '',
      entity_type: 'supplier',
      legal_name: '',
      business_name: '',
      address: '',
      phone: '',
      email: '',
      account_code: '',
      account_name: '',
      default_tax_rate: 19.0,
      is_tax_exempt: false,
      notes: '',
      is_active: true
    });
  };

  // Filtrar entidades RCV
  const filteredEntities = rcvEntities.filter(entity => {
    const matchesSearch = entity.entity_name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
                         entity.entity_rut.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
                         (entity.legal_name || '').toLowerCase().includes(entitySearchTerm.toLowerCase());
    const matchesType = entityTypeFilter === 'all' || entity.entity_type === entityTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-2 border-emerald-100 hover:border-emerald-200 transition-colors">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span>Entidades Registradas RCV</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium">
              {rcvEntities.length} entidades
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              variant="outline"
              size="sm"
              className="border-yellow-200 hover:bg-yellow-50 text-yellow-700"
            >
              🔍 {showDiagnostics ? 'Ocultar' : 'Diagnóstico'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingEntity(null);
                resetEntityForm();
                setShowEntityForm(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Nueva Entidad
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Base de datos de proveedores y clientes con cuentas contables asociadas para integración automática del RCV
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Panel de Diagnóstico */}
        {showDiagnostics && systemDiagnostics && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-yellow-800 flex items-center space-x-2">
                <span>🔍 Diagnóstico del Sistema</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  systemDiagnostics.summary.ready 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {systemDiagnostics.summary.ready ? '✅ Listo' : '⚠️ Necesita configuración'}
                </span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{systemDiagnostics.statistics.total_entities}</div>
                <div className="text-sm text-blue-800">Total Entidades</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{systemDiagnostics.statistics.entities_with_accounts}</div>
                <div className="text-sm text-green-800">Con Cuentas</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{systemDiagnostics.summary.automation_percentage}%</div>
                <div className="text-sm text-purple-800">Automatización</div>
              </div>
            </div>

            <div className="text-sm text-yellow-700">
              <div className="font-medium mb-2">📊 Estadísticas Detalladas:</div>
              <ul className="space-y-1 ml-4">
                <li>• Proveedores: {systemDiagnostics.statistics.suppliers}</li>
                <li>• Clientes: {systemDiagnostics.statistics.customers}</li>
                <li>• Mixtos: {systemDiagnostics.statistics.both}</li>
              </ul>
            </div>

            {systemDiagnostics.recommendations.length > 0 && (
              <div className="mt-4">
                <div className="font-medium text-yellow-800 mb-2">💡 Recomendaciones:</div>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {systemDiagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="ml-4">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, RUT o razón social..."
                value={entitySearchTerm}
                onChange={(e) => setEntitySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="supplier">Solo Proveedores</option>
              <option value="customer">Solo Clientes</option>
              <option value="both">Ambos</option>
            </select>
          </div>
        </div>

        {/* Lista de entidades */}
        {loadingEntities ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="ml-2 text-gray-600">Cargando entidades RCV...</span>
          </div>
        ) : (
          <>
            {filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No hay entidades RCV registradas</p>
                <p className="text-sm">Agregue entidades para automatizar la integración del RCV con el libro diario</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEntities.map((entity) => (
                  <div key={entity.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          entity.entity_type === 'supplier' ? 'bg-blue-100' :
                          entity.entity_type === 'customer' ? 'bg-green-100' :
                          'bg-purple-100'
                        }`}>
                          {entity.entity_type === 'supplier' ? (
                            <Building2 className={`w-4 h-4 ${entity.entity_type === 'supplier' ? 'text-blue-600' : ''}`} />
                          ) : entity.entity_type === 'customer' ? (
                            <UserCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Building className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entity.entity_type === 'supplier' ? 'bg-blue-100 text-blue-800' :
                          entity.entity_type === 'customer' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {entity.entity_type === 'supplier' ? 'Proveedor' :
                           entity.entity_type === 'customer' ? 'Cliente' : 'Ambos'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => {
                            setEditingEntity(entity);
                            setEntityFormData({
                              entity_name: entity.entity_name,
                              entity_rut: entity.entity_rut,
                              entity_type: entity.entity_type,
                              legal_name: entity.legal_name || '',
                              business_name: entity.business_name || '',
                              address: entity.address || '',
                              phone: entity.phone || '',
                              email: entity.email || '',
                              account_code: entity.account_code || '',
                              account_name: entity.account_name || '',
                              default_tax_rate: entity.default_tax_rate,
                              is_tax_exempt: entity.is_tax_exempt,
                              notes: entity.notes || '',
                              is_active: entity.is_active
                            });
                            setShowEntityForm(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => deleteRcvEntity(entity.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{entity.entity_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{entity.entity_rut}</div>
                      </div>
                      
                      {entity.account_code && (
                        <div className="bg-white p-2 rounded border">
                          <div className="text-xs text-gray-500">Cuenta Contable</div>
                          <div className="font-mono text-xs">{entity.account_code}</div>
                          <div className="text-xs text-gray-600">{entity.account_name}</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          entity.is_tax_exempt 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entity.is_tax_exempt ? 'Exento IVA' : `IVA ${entity.default_tax_rate}%`}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          entity.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {entity.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">?</span>
            </div>
            <div>
              <div className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                <span>🎯 ¿Para qué sirven las Entidades RCV?</span>
              </div>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Automatización completa:</strong> Cuando proceses un archivo RCV, el sistema buscará automáticamente cada RUT en esta base de datos.</p>
                <p><strong>Cuentas específicas:</strong> Si encuentra la entidad, usará la cuenta contable que configuraste. Si no la encuentra, usará las cuentas genéricas.</p>
                <p><strong>Ejemplo:</strong> Proveedor "Ferretería ABC" (RUT 76.123.456-7) → Cuenta "2.1.1.015 - Ferretería ABC" en lugar de "2.1.1.001 - Proveedores"</p>
                <p><strong>Resultado:</strong> Asientos contables más específicos y organizados automáticamente.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Modal para crear/editar entidad RCV */}
      {showEntityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEntity ? 'Editar Entidad RCV' : 'Nueva Entidad RCV'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure la información de la entidad y su cuenta contable asociada
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Entidad *
                  </label>
                  <input
                    type="text"
                    value={entityFormData.entity_name}
                    onChange={(e) => setEntityFormData({...entityFormData, entity_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ej: Ferretería Central Ltda."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT *
                  </label>
                  <input
                    type="text"
                    value={entityFormData.entity_rut}
                    onChange={(e) => setEntityFormData({...entityFormData, entity_rut: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="12.345.678-9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Entidad *
                  </label>
                  <select
                    value={entityFormData.entity_type}
                    onChange={(e) => setEntityFormData({...entityFormData, entity_type: e.target.value as 'supplier' | 'customer' | 'both'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="supplier">Proveedor</option>
                    <option value="customer">Cliente</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={entityFormData.legal_name}
                    onChange={(e) => setEntityFormData({...entityFormData, legal_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Nombre legal completo"
                  />
                </div>
              </div>

              {/* Información de contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={entityFormData.email}
                    onChange={(e) => setEntityFormData({...entityFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="contacto@empresa.cl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={entityFormData.phone}
                    onChange={(e) => setEntityFormData({...entityFormData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={entityFormData.address}
                  onChange={(e) => setEntityFormData({...entityFormData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Dirección completa"
                />
              </div>

              {/* Configuración contable */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Configuración Contable</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código de Cuenta Contable
                    </label>
                    <select
                      value={entityFormData.account_code}
                      onChange={(e) => {
                        const selectedAccount = accounts.find(acc => acc.code === e.target.value);
                        setEntityFormData({
                          ...entityFormData, 
                          account_code: e.target.value,
                          account_name: selectedAccount ? selectedAccount.name : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tasa de IVA por Defecto (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={entityFormData.default_tax_rate}
                      onChange={(e) => setEntityFormData({...entityFormData, default_tax_rate: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="is_tax_exempt"
                    checked={entityFormData.is_tax_exempt}
                    onChange={(e) => setEntityFormData({...entityFormData, is_tax_exempt: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="is_tax_exempt" className="ml-2 text-sm text-gray-700">
                    Exento de IVA
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  rows={3}
                  value={entityFormData.notes}
                  onChange={(e) => setEntityFormData({...entityFormData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="Información adicional sobre la entidad..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={entityFormData.is_active}
                  onChange={(e) => setEntityFormData({...entityFormData, is_active: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Entidad activa
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEntityForm(false);
                  setEditingEntity(null);
                  resetEntityForm();
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={saveRcvEntity}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingEntity ? 'Actualizar' : 'Crear'} Entidad
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}