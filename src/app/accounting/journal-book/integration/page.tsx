'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  FileText, 
  Building2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Settings, 
  Download,
  Upload,
  Zap,
  Eye,
  Plus,
  Filter
} from 'lucide-react';

interface IntegrationData {
  rcv_data: RCVIntegrationItem[];
  fixed_assets_data: FixedAssetIntegrationItem[];
  summary: {
    rcv_pending: number;
    rcv_processed: number;
    fixed_assets_pending: number;
    fixed_assets_processed: number;
    total_pending: number;
  };
}

interface RCVIntegrationItem {
  id: string;
  type: 'purchase' | 'sales';
  period: string;
  file_name: string;
  total_transactions: number;
  total_amount: number;
  unique_suppliers?: number;
  unique_customers?: number;
  created_at: string;
  is_processed: boolean;
  journal_entry_id: string | null;
}

interface FixedAssetIntegrationItem {
  id: string;
  type: 'fixed_asset';
  name: string;
  brand: string;
  model: string;
  purchase_date: string;
  purchase_value: number;
  account_code: string;
  created_at: string;
  is_processed: boolean;
  journal_entry_id: string | null;
}

interface IntegrationConfig {
  rcv_sales: {
    enabled: boolean;
    accounts: {
      debit_client_account: string;
      credit_sales_account: string;
      credit_iva_account: string;
    };
    description_template: string;
    auto_process: boolean;
  };
  rcv_purchases: {
    enabled: boolean;
    accounts: {
      debit_expense_account: string;
      debit_iva_account: string;
      credit_supplier_account: string;
    };
    description_template: string;
    auto_process: boolean;
  };
  fixed_assets: {
    enabled: boolean;
    accounts: {
      debit_asset_account: string;
      credit_cash_account: string;
      credit_supplier_account: string;
    };
    description_template: string;
    auto_process: boolean;
  };
}

export default function JournalBookIntegrationPage() {
  const [integrationData, setIntegrationData] = useState<IntegrationData | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'rcv' | 'fixed_assets' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processed' | 'all'>('pending');
  const [showConfig, setShowConfig] = useState(false);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce'; // TODO: Get from auth

  useEffect(() => {
    loadIntegrationData();
    loadIntegrationConfig();
  }, [statusFilter]);

  const loadIntegrationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: companyId,
        status: statusFilter
      });

      const response = await fetch(`/api/accounting/journal-book/integration?${params}`);
      const data = await response.json();

      if (data.success) {
        setIntegrationData(data.data);
      } else {
        setError(data.error || 'Error cargando datos de integración');
      }
    } catch (err) {
      console.error('Error loading integration data:', err);
      setError('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationConfig = async () => {
    try {
      const response = await fetch(`/api/accounting/journal-book/integration-config?company_id=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setIntegrationConfig(data.data.config);
      }
    } catch (err) {
      console.error('Error loading integration config:', err);
    }
  };

  const handleProcessSelected = async () => {
    if (selectedItems.length === 0) return;

    try {
      setProcessing(true);
      
      const transactions = selectedItems.map(id => {
        // Encontrar el item en los datos
        const rcvItem = integrationData?.rcv_data.find(item => item.id === id);
        const assetItem = integrationData?.fixed_assets_data.find(item => item.id === id);
        
        if (rcvItem) {
          return {
            id: rcvItem.id,
            type: 'rcv',
            subtype: rcvItem.type,
            data: rcvItem
          };
        } else if (assetItem) {
          return {
            id: assetItem.id,
            type: 'fixed_asset',
            data: assetItem
          };
        }
        return null;
      }).filter(Boolean);

      const response = await fetch('/api/accounting/journal-book/integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          transactions,
          create_journal_entries: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Procesamiento completado: ${result.data.successful}/${result.data.processed} transacciones exitosas`);
        setSelectedItems([]);
        loadIntegrationData(); // Recargar datos
      } else {
        setError(result.error || 'Error procesando transacciones');
      }
    } catch (err) {
      console.error('Error processing transactions:', err);
      setError('Error de conexión al procesar transacciones');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (items: any[]) => {
    const pendingIds = items.filter(item => !item.is_processed).map(item => item.id);
    if (selectedItems.length === pendingIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(pendingIds);
    }
  };

  const getFilteredData = () => {
    if (!integrationData) return { rcv: [], fixedAssets: [] };
    
    const rcv = integrationData.rcv_data.filter(item => 
      statusFilter === 'all' || 
      (statusFilter === 'pending' && !item.is_processed) ||
      (statusFilter === 'processed' && item.is_processed)
    );
    
    const fixedAssets = integrationData.fixed_assets_data.filter(item => 
      statusFilter === 'all' || 
      (statusFilter === 'pending' && !item.is_processed) ||
      (statusFilter === 'processed' && item.is_processed)
    );
    
    return { rcv, fixedAssets };
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const filteredData = getFilteredData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Integración Libro Diario"
        subtitle="Importa transacciones de RCV y Activos Fijos automáticamente"
        showBackButton={true}
        backHref="/accounting/journal-book"
        actions={
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConfig(!showConfig)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Configuración
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/accounting/journal-book', '_blank')}
            >
              📚 Libro Diario
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        
        {/* Stats Overview */}
        {integrationData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">RCV Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {integrationData.summary.rcv_pending}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">RCV Procesados</p>
                    <p className="text-2xl font-bold text-green-600">
                      {integrationData.summary.rcv_processed}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Activos Pendientes</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {integrationData.summary.fixed_assets_pending}
                    </p>
                  </div>
                  <Building2 className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Activos Procesados</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {integrationData.summary.fixed_assets_processed}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pendientes</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {integrationData.summary.total_pending}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Transacciones para Contabilizar</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Selecciona transacciones de RCV y Activos Fijos para importar al Libro Diario
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendientes</option>
                    <option value="processed">Procesados</option>
                    <option value="all">Todos</option>
                  </select>
                </div>

                {selectedItems.length > 0 && (
                  <Button
                    onClick={handleProcessSelected}
                    disabled={processing}
                    loading={processing}
                    variant="primary"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Contabilizar ({selectedItems.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando datos de integración...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* RCV Section */}
                {filteredData.rcv.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Registros RCV ({filteredData.rcv.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(filteredData.rcv)}
                      >
                        {selectedItems.filter(id => filteredData.rcv.some(item => item.id === id)).length === filteredData.rcv.filter(item => !item.is_processed).length
                          ? 'Deseleccionar Todos'
                          : 'Seleccionar Todos'
                        }
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredData.rcv.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 ${
                            item.is_processed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          } ${
                            selectedItems.includes(item.id) ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                item.is_processed ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></div>
                              <span className="text-sm font-medium">
                                {item.type === 'purchase' ? '📈 Compras' : '💰 Ventas'}
                              </span>
                            </div>
                            {!item.is_processed && (
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => handleSelectItem(item.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatPeriod(item.period)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {item.file_name}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-600">Transacciones:</p>
                                <p className="font-medium">{item.total_transactions}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Monto:</p>
                                <p className="font-medium">{formatCurrency(item.total_amount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  {item.type === 'purchase' ? 'Proveedores:' : 'Clientes:'}
                                </p>
                                <p className="font-medium">
                                  {item.unique_suppliers || item.unique_customers || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Fecha:</p>
                                <p className="font-medium">{formatDate(item.created_at)}</p>
                              </div>
                            </div>

                            {item.is_processed && item.journal_entry_id && (
                              <div className="pt-2 border-t border-green-200">
                                <p className="text-xs text-green-700 flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Contabilizado
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/accounting/journal-book?entry=${item.journal_entry_id}`, '_blank')}
                                  className="mt-1 text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver Asiento
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixed Assets Section */}
                {filteredData.fixedAssets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-orange-600" />
                        Activos Fijos ({filteredData.fixedAssets.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(filteredData.fixedAssets)}
                      >
                        {selectedItems.filter(id => filteredData.fixedAssets.some(item => item.id === id)).length === filteredData.fixedAssets.filter(item => !item.is_processed).length
                          ? 'Deseleccionar Todos'
                          : 'Seleccionar Todos'
                        }
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredData.fixedAssets.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 ${
                            item.is_processed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200 hover:border-orange-300'
                          } ${
                            selectedItems.includes(item.id) ? 'ring-2 ring-orange-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                item.is_processed ? 'bg-green-500' : 'bg-orange-500'
                              }`}></div>
                              <span className="text-sm font-medium">🏢 Activo Fijo</span>
                            </div>
                            {!item.is_processed && (
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => handleSelectItem(item.id)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="font-medium text-gray-900 truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.brand} {item.model}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-600">Valor:</p>
                                <p className="font-medium">{formatCurrency(item.purchase_value)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Fecha:</p>
                                <p className="font-medium">{formatDate(item.purchase_date)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Cuenta:</p>
                                <p className="font-medium font-mono text-xs">{item.account_code}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Registro:</p>
                                <p className="font-medium">{formatDate(item.created_at)}</p>
                              </div>
                            </div>

                            {item.is_processed && item.journal_entry_id && (
                              <div className="pt-2 border-t border-green-200">
                                <p className="text-xs text-green-700 flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Contabilizado
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/accounting/journal-book?entry=${item.journal_entry_id}`, '_blank')}
                                  className="mt-1 text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver Asiento
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredData.rcv.length === 0 && filteredData.fixedAssets.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay transacciones {statusFilter === 'pending' ? 'pendientes' : statusFilter === 'processed' ? 'procesadas' : 'disponibles'}
                    </h3>
                    <p className="text-gray-600">
                      {statusFilter === 'pending' 
                        ? 'Las transacciones aparecerán aquí cuando tengas RCV o activos fijos sin contabilizar'
                        : statusFilter === 'processed'
                          ? 'Las transacciones contabilizadas aparecerán aquí'
                          : 'Primero debes tener datos en los módulos RCV y Activos Fijos'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        {showConfig && integrationConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <span>Configuración de Integración</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* RCV Ventas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    💰 RCV Ventas
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      integrationConfig.rcv_sales.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integrationConfig.rcv_sales.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Cliente (Debe):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_sales.accounts.debit_client_account}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ventas (Haber):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_sales.accounts.credit_sales_account}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">IVA Débito (Haber):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_sales.accounts.credit_iva_account}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RCV Compras */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    📈 RCV Compras
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      integrationConfig.rcv_purchases.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integrationConfig.rcv_purchases.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Gastos (Debe):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_purchases.accounts.debit_expense_account}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">IVA Crédito (Debe):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_purchases.accounts.debit_iva_account}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Proveedores (Haber):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.rcv_purchases.accounts.credit_supplier_account}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activos Fijos */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    🏢 Activos Fijos
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      integrationConfig.fixed_assets.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integrationConfig.fixed_assets.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Activo (Debe):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        Según cuenta del activo
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Caja/Bancos (Haber):</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.fixed_assets.accounts.credit_cash_account}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Alt. Proveedores:</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {integrationConfig.fixed_assets.accounts.credit_supplier_account}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  💡 <strong>Asientos Automáticos:</strong> Las configuraciones anteriores definen las cuentas contables que se usarán automáticamente al contabilizar transacciones de cada módulo.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/accounting/journal-book/integration/config', '_blank')}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Editar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}