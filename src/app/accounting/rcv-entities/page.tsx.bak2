'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge
} from '@/components/ui';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Filter,
  RefreshCw,
  Users,
  FileText,
  Clock
} from 'lucide-react';

interface RCVEntity {
  id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  legal_name?: string;
  account_code?: string;
  account_name?: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChartAccount {
  code: string;
  name: string;
  account_type: string;
  is_active: boolean;
}

export default function RCVEntitiesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rcvEntities, setRCVEntities] = useState<RCVEntity[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<RCVEntity | null>(null);
  const [formData, setFormData] = useState({
    entity_name: '',
    entity_rut: '',
    entity_type: 'supplier' as 'supplier' | 'customer' | 'both',
    legal_name: '',
    account_code: '',
    account_name: '',
    default_tax_rate: 19.0,
    is_tax_exempt: false
  });

  // Get company ID from localStorage
  useEffect(() => {
    const storedCompanyId = localStorage.getItem('selectedCompanyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    }
  }, []);

  // Load data when company changes
  useEffect(() => {
    if (companyId) {
      loadRCVEntities();
      loadChartAccounts();
    }
  }, [companyId]);

  const loadRCVEntities = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/rcv-entities?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setRCVEntities(data.data || []);
      }
    } catch (error) {
      console.error('Error loading RCV entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartAccounts = async () => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/accounting/chart-of-accounts?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setChartAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading chart accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const url = editingEntity 
        ? `/api/accounting/rcv-entities/${editingEntity.id}`
        : '/api/accounting/rcv-entities';
      
      const method = editingEntity ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: companyId
        }),
      });

      if (response.ok) {
        await loadRCVEntities();
        setShowModal(false);
        setEditingEntity(null);
        setFormData({
          entity_name: '',
          entity_rut: '',
          entity_type: 'supplier',
          legal_name: '',
          account_code: '',
          account_name: '',
          default_tax_rate: 19.0,
          is_tax_exempt: false
        });
      }
    } catch (error) {
      console.error('Error saving entity:', error);
    }
  };

  const handleEdit = (entity: RCVEntity) => {
    setEditingEntity(entity);
    setFormData({
      entity_name: entity.entity_name,
      entity_rut: entity.entity_rut,
      entity_type: entity.entity_type,
      legal_name: entity.legal_name || '',
      account_code: entity.account_code || '',
      account_name: entity.account_name || '',
      default_tax_rate: entity.default_tax_rate,
      is_tax_exempt: entity.is_tax_exempt
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta entidad?')) return;
    
    try {
      const response = await fetch(`/api/accounting/rcv-entities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadRCVEntities();
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
    }
  };

  const filteredEntities = rcvEntities.filter(entity => {
    const matchesSearch = entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.entity_rut.includes(searchTerm);
    const matchesType = filterType === 'all' || entity.entity_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAccountSelect = (accountCode: string) => {
    const account = chartAccounts.find(acc => acc.code === accountCode);
    if (account) {
      setFormData(prev => ({
        ...prev,
        account_code: account.code,
        account_name: account.name
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header 
        title="Entidades RCV" 
        subtitle="Gestión de proveedores y clientes para automatización contable"
        showBackButton
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los tipos</option>
            <option value="supplier">Proveedores</option>
            <option value="customer">Clientes</option>
            <option value="both">Ambos</option>
          </select>
          
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Entidad
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Entidades</p>
                <p className="text-2xl font-bold text-gray-900">{rcvEntities.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Proveedores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rcvEntities.filter(e => e.entity_type === 'supplier' || e.entity_type === 'both').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rcvEntities.filter(e => e.entity_type === 'customer' || e.entity_type === 'both').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-indigo-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Con Cuenta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rcvEntities.filter(e => e.account_code).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Entities List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Cargando entidades...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEntities.map((entity) => (
              <Card key={entity.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{entity.entity_name}</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleEdit(entity)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDelete(entity.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={entity.entity_type === 'supplier' ? 'default' : 
                              entity.entity_type === 'customer' ? 'secondary' : 'outline'}
                    >
                      {entity.entity_type === 'supplier' ? 'Proveedor' :
                       entity.entity_type === 'customer' ? 'Cliente' : 'Ambos'}
                    </Badge>
                    {entity.is_tax_exempt && (
                      <Badge variant="outline">Sin IVA</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>RUT:</strong> {entity.entity_rut}
                    </p>
                    {entity.account_code ? (
                      <p className="text-sm text-gray-600">
                        <strong>Cuenta:</strong> {entity.account_code} - {entity.account_name}
                      </p>
                    ) : (
                      <p className="text-sm text-orange-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Sin cuenta asignada
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      <strong>IVA:</strong> {entity.default_tax_rate}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredEntities.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No hay entidades</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'No se encontraron entidades con los filtros aplicados'
                : 'Comienza agregando tu primera entidad RCV'
              }
            </p>
            {(!searchTerm && filterType === 'all') && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primera Entidad
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEntity ? 'Editar Entidad' : 'Nueva Entidad RCV'}
                </h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Entidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.entity_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, entity_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Empresa ABC S.A."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.entity_rut}
                    onChange={(e) => setFormData(prev => ({ ...prev, entity_rut: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12.345.678-9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Entidad *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      entity_type: e.target.value as 'supplier' | 'customer' | 'both' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={formData.legal_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Razón social completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta Contable
                  </label>
                  <select
                    value={formData.account_code}
                    onChange={(e) => handleAccountSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {chartAccounts.map((account) => (
                      <option key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tasa IVA (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.default_tax_rate}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        default_tax_rate: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_tax_exempt}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          is_tax_exempt: e.target.checked 
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Exento de IVA
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingEntity ? 'Actualizar' : 'Crear'} Entidad
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}