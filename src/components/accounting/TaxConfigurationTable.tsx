'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Check, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

interface TaxConfiguration {
  id: string;
  company_id: string;
  tax_type: string;
  tax_name: string;
  tax_rate?: number;
  sales_account_code?: string;
  sales_account_name?: string;
  purchases_account_code?: string;
  purchases_account_name?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TaxConfigurationTableProps {
  companyId: string;
  accounts: any[];
}

export default function TaxConfigurationTable({ companyId, accounts }: TaxConfigurationTableProps) {
  const [configurations, setConfigurations] = useState<TaxConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});

  // Estado para nueva configuración
  const [showNewRow, setShowNewRow] = useState(false);
  const [newConfig, setNewConfig] = useState({
    tax_type: '',
    tax_name: '',
    tax_rate: '',
    sales_account_code: '',
    sales_account_name: '',
    purchases_account_code: '',
    purchases_account_name: '',
    notes: ''
  });

  // Tipos de impuestos disponibles
  const TAX_TYPES = [
    { value: 'iva_19', label: 'IVA 19%', rate: 19 },
    { value: 'iva_exento', label: 'IVA Exento', rate: 0 },
    { value: 'ila_20.5', label: 'ILA 20.5%', rate: 20.5 },
    { value: 'ila_31.5', label: 'ILA 31.5%', rate: 31.5 },
    { value: 'ila_10', label: 'ILA 10%', rate: 10 },
    { value: 'iaba_5', label: 'IABA 5%', rate: 5 },
    { value: 'diesel', label: 'Impuesto al Diesel', rate: null },
    { value: 'gasolina', label: 'Impuesto a la Gasolina', rate: null },
    { value: 'tabaco', label: 'Impuesto al Tabaco', rate: null },
    { value: 'lujo', label: 'Impuesto a Artículos de Lujo', rate: 15 },
    { value: 'digital', label: 'IVA Servicios Digitales', rate: 19 },
    { value: 'vehiculos', label: 'Impuesto Verde Vehículos', rate: null }
  ];

  useEffect(() => {
    loadConfigurations();
  }, [companyId]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/tax-configurations?company_id=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setConfigurations(data.data);
        setStats(data.stats);
      } else {
        console.error('Error loading configurations:', data.error);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDetailAccounts = () => {
    return accounts.filter(acc => acc.is_detail).sort((a, b) => a.code.localeCompare(b.code));
  };

  const handleAccountSelect = (field: string, accountCode: string, isNew = false) => {
    const account = accounts.find(acc => acc.code === accountCode);
    if (account) {
      const nameField = field.replace('_code', '_name');
      
      if (isNew) {
        setNewConfig(prev => ({
          ...prev,
          [field]: accountCode,
          [nameField]: account.name
        }));
      } else {
        // Para edición en línea, actualizar la configuración
        setConfigurations(prev => prev.map(config => 
          config.id === editingId 
            ? { ...config, [field]: accountCode, [nameField]: account.name }
            : config
        ));
      }
    }
  };

  const handleSaveNew = async () => {
    try {
      const response = await fetch('/api/accounting/tax-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          ...newConfig,
          tax_rate: newConfig.tax_rate ? parseFloat(newConfig.tax_rate) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadConfigurations();
        setShowNewRow(false);
        setNewConfig({
          tax_type: '',
          tax_name: '',
          tax_rate: '',
          sales_debit_account_code: '',
          sales_debit_account_name: '',
          sales_credit_account_code: '',
          sales_credit_account_name: '',
          purchases_debit_account_code: '',
          purchases_debit_account_name: '',
          purchases_credit_account_code: '',
          purchases_credit_account_name: '',
          notes: ''
        });
        alert('✅ Configuración creada exitosamente');
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('❌ Error al guardar configuración');
    }
  };

  const handleSaveEdit = async (configId: string) => {
    try {
      const configToUpdate = configurations.find(c => c.id === configId);
      if (!configToUpdate) return;

      const response = await fetch(`/api/accounting/tax-configurations/${configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToUpdate)
      });

      const data = await response.json();

      if (data.success) {
        setEditingId(null);
        await loadConfigurations();
        alert('✅ Configuración actualizada exitosamente');
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      alert('❌ Error al actualizar configuración');
    }
  };

  const handleDelete = async (configId: string, taxName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la configuración de ${taxName}?`)) return;

    try {
      const response = await fetch(`/api/accounting/tax-configurations/${configId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadConfigurations();
        alert('✅ Configuración eliminada exitosamente');
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('❌ Error al eliminar configuración');
    }
  };

  const handleTaxTypeChange = (taxType: string, isNew = false) => {
    const taxInfo = TAX_TYPES.find(t => t.value === taxType);
    if (taxInfo) {
      if (isNew) {
        setNewConfig(prev => ({
          ...prev,
          tax_type: taxType,
          tax_name: taxInfo.label,
          tax_rate: taxInfo.rate?.toString() || ''
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando configuraciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-600">Total Configuraciones</div>
            <div className="text-xl font-bold text-blue-800">{stats.total_configurations || 0}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-600">Activas</div>
            <div className="text-xl font-bold text-green-800">{stats.active_configurations || 0}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-sm text-purple-600">IVA</div>
            <div className="text-xl font-bold text-purple-800">{stats.iva_configurations || 0}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm text-orange-600">ILA</div>
            <div className="text-xl font-bold text-orange-800">{stats.ila_configurations || 0}</div>
          </div>
        </div>
      )}

      {/* Botón para agregar nueva configuración */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Configuraciones de Impuestos</span>
        </h3>
        {!showNewRow && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowNewRow(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Nueva Configuración
          </Button>
        )}
      </div>

      {/* Tabla de configuraciones */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Impuesto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas - Débito
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas - Crédito
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compras - Débito
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compras - Crédito
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Fila para nueva configuración */}
              {showNewRow && (
                <tr className="bg-blue-50">
                  <td className="px-4 py-3">
                    <select
                      value={newConfig.tax_type}
                      onChange={(e) => handleTaxTypeChange(e.target.value, true)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {TAX_TYPES.map(tax => (
                        <option key={tax.value} value={tax.value}>
                          {tax.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.1"
                      value={newConfig.tax_rate}
                      onChange={(e) => setNewConfig(prev => ({ ...prev, tax_rate: e.target.value }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="%"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newConfig.sales_debit_account_code}
                      onChange={(e) => handleAccountSelect('sales_debit_account_code', e.target.value, true)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {getDetailAccounts().map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newConfig.sales_credit_account_code}
                      onChange={(e) => handleAccountSelect('sales_credit_account_code', e.target.value, true)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {getDetailAccounts().map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newConfig.purchases_debit_account_code}
                      onChange={(e) => handleAccountSelect('purchases_debit_account_code', e.target.value, true)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {getDetailAccounts().map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newConfig.purchases_credit_account_code}
                      onChange={(e) => handleAccountSelect('purchases_credit_account_code', e.target.value, true)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {getDetailAccounts().map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Activo
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveNew}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="Guardar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowNewRow(false)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Filas de configuraciones existentes */}
              {configurations.map((config) => (
                <tr key={config.id} className={editingId === config.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{config.tax_name}</div>
                    <div className="text-xs text-gray-500">{config.tax_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === config.id ? (
                      <input
                        type="number"
                        step="0.1"
                        value={config.tax_rate || ''}
                        onChange={(e) => setConfigurations(prev => prev.map(c => 
                          c.id === config.id ? { ...c, tax_rate: parseFloat(e.target.value) || null } : c
                        ))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {config.tax_rate ? `${config.tax_rate}%` : 'N/A'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === config.id ? (
                      <select
                        value={config.sales_debit_account_code || ''}
                        onChange={(e) => handleAccountSelect('sales_debit_account_code', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {getDetailAccounts().map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm">
                        <div className="font-mono text-gray-900">{config.sales_debit_account_code}</div>
                        <div className="text-xs text-gray-500">{config.sales_debit_account_name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === config.id ? (
                      <select
                        value={config.sales_credit_account_code || ''}
                        onChange={(e) => handleAccountSelect('sales_credit_account_code', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {getDetailAccounts().map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm">
                        <div className="font-mono text-gray-900">{config.sales_credit_account_code}</div>
                        <div className="text-xs text-gray-500">{config.sales_credit_account_name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === config.id ? (
                      <select
                        value={config.purchases_debit_account_code || ''}
                        onChange={(e) => handleAccountSelect('purchases_debit_account_code', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {getDetailAccounts().map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm">
                        <div className="font-mono text-gray-900">{config.purchases_debit_account_code}</div>
                        <div className="text-xs text-gray-500">{config.purchases_debit_account_name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === config.id ? (
                      <select
                        value={config.purchases_credit_account_code || ''}
                        onChange={(e) => handleAccountSelect('purchases_credit_account_code', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {getDetailAccounts().map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm">
                        <div className="font-mono text-gray-900">{config.purchases_credit_account_code}</div>
                        <div className="text-xs text-gray-500">{config.purchases_credit_account_name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      config.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {config.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {editingId === config.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(config.id)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              loadConfigurations(); // Recargar para deshacer cambios
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingId(config.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id, config.tax_name)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {configurations.length === 0 && !showNewRow && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <div>No hay configuraciones de impuestos</div>
                    <div className="text-sm text-gray-400">Haz clic en "Nueva Configuración" para comenzar</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Información sobre Configuraciones de Impuestos</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Ventas - Débito:</strong> Cuenta donde se registra el impuesto generado en ventas</p>
          <p>• <strong>Ventas - Crédito:</strong> Cuenta donde se acumula el impuesto por pagar al SII</p>
          <p>• <strong>Compras - Débito:</strong> Cuenta donde se registra el impuesto pagado en compras</p>
          <p>• <strong>Compras - Crédito:</strong> Cuenta donde se acumula el impuesto por recuperar del SII</p>
          <p>• <strong>Edición en línea:</strong> Haz clic en el botón editar para modificar directamente en la tabla</p>
        </div>
      </div>
    </div>
  );
}