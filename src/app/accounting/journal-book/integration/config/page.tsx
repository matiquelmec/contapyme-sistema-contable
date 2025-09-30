'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface IntegrationConfigAccounts {
  debit_client_account?: string;
  credit_sales_account?: string;
  credit_iva_account?: string;
  debit_expense_account?: string;
  debit_iva_account?: string;
  credit_supplier_account?: string;
  debit_asset_account?: string;
  credit_cash_account?: string;
}

interface IntegrationConfigModule {
  enabled: boolean;
  accounts: IntegrationConfigAccounts;
  description_template: string;
  auto_process?: boolean;
}

interface IntegrationConfigData {
  rcv_sales: IntegrationConfigModule;
  rcv_purchases: IntegrationConfigModule;
  fixed_assets: IntegrationConfigModule;
}

export default function IntegrationConfigPage() {
  const [config, setConfig] = useState<IntegrationConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce'; // Synchronized with simple journal book

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal-book/integration-config?company_id=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
        setIsDefault(data.data.is_default);
      } else {
        setMessage('Error cargando configuración');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setMessage('');

      const response = await fetch('/api/accounting/journal-book/integration-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          config
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Configuración guardada exitosamente');
        setIsDefault(false);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('Error guardando configuración');
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(`/api/accounting/journal-book/integration-config?company_id=${companyId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Configuración restablecida a valores por defecto');
        await loadConfiguration();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('Error restableciendo configuración');
      console.error('Error restoring defaults:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateConfigModule = (module: keyof IntegrationConfigData, field: string, value: any) => {
    if (!config) return;

    setConfig(prev => ({
      ...prev!,
      [module]: {
        ...prev![module],
        [field]: value
      }
    }));
  };

  const updateConfigAccount = (module: keyof IntegrationConfigData, account: string, value: string) => {
    if (!config) return;

    setConfig(prev => ({
      ...prev!,
      [module]: {
        ...prev![module],
        accounts: {
          ...prev![module].accounts,
          [account]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Configuración de Integración"
          subtitle="Cargando configuración..."
          showBackButton={true}
          backHref="/accounting/journal-book/integration"
        />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando configuración...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Configuración de Integración"
        subtitle="Personaliza las cuentas contables para asientos automáticos"
        showBackButton={true}
        backHref="/accounting/journal-book/integration"
        actions={
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showAdvanced ? 'Ocultar Avanzado' : 'Mostrar Avanzado'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRestoreDefaults}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Restaurar Defecto
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveConfiguration}
              disabled={saving}
              loading={saving}
            >
              <Save className="w-4 h-4 mr-1" />
              Guardar Cambios
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        
        {/* Mensaje de estado */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.includes('Error') ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Indicador de configuración */}
        {isDefault && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-blue-700 bg-blue-50 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Usando Configuración por Defecto</p>
                  <p className="text-sm">Realiza cambios y guárdalos para personalizar tu configuración de integración.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {config && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RCV Ventas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>💰 RCV Ventas</span>
                  </span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.rcv_sales.enabled}
                      onChange={(e) => updateConfigModule('rcv_sales', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm">Activo</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente (Debe) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_sales.accounts.debit_client_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_sales', 'debit_client_account', e.target.value)}
                    placeholder="1105001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ventas (Haber) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_sales.accounts.credit_sales_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_sales', 'credit_sales_account', e.target.value)}
                    placeholder="4101001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA Débito Fiscal (Haber) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_sales.accounts.credit_iva_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_sales', 'credit_iva_account', e.target.value)}
                    placeholder="2104001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {showAdvanced && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template de Descripción
                    </label>
                    <textarea
                      value={config.rcv_sales.description_template}
                      onChange={(e) => updateConfigModule('rcv_sales', 'description_template', e.target.value)}
                      placeholder="Venta según RCV {period} - {file_name}"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RCV Compras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>📈 RCV Compras</span>
                  </span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.rcv_purchases.enabled}
                      onChange={(e) => updateConfigModule('rcv_purchases', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm">Activo</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gastos (Debe) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_purchases.accounts.debit_expense_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_purchases', 'debit_expense_account', e.target.value)}
                    placeholder="5101001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA Crédito Fiscal (Debe) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_purchases.accounts.debit_iva_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_purchases', 'debit_iva_account', e.target.value)}
                    placeholder="1104001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedores (Haber) *
                  </label>
                  <input
                    type="text"
                    value={config.rcv_purchases.accounts.credit_supplier_account || ''}
                    onChange={(e) => updateConfigAccount('rcv_purchases', 'credit_supplier_account', e.target.value)}
                    placeholder="2101001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {showAdvanced && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template de Descripción
                    </label>
                    <textarea
                      value={config.rcv_purchases.description_template}
                      onChange={(e) => updateConfigModule('rcv_purchases', 'description_template', e.target.value)}
                      placeholder="Compra según RCV {period} - {file_name}"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activos Fijos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>🏢 Activos Fijos</span>
                  </span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.fixed_assets.enabled}
                      onChange={(e) => updateConfigModule('fixed_assets', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm">Activo</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caja/Bancos (Haber) *
                  </label>
                  <input
                    type="text"
                    value={config.fixed_assets.accounts.credit_cash_account || ''}
                    onChange={(e) => updateConfigAccount('fixed_assets', 'credit_cash_account', e.target.value)}
                    placeholder="1101001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedores Alternativos (Haber)
                  </label>
                  <input
                    type="text"
                    value={config.fixed_assets.accounts.credit_supplier_account || ''}
                    onChange={(e) => updateConfigAccount('fixed_assets', 'credit_supplier_account', e.target.value)}
                    placeholder="2101001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> La cuenta de débito se toma automáticamente del activo fijo específico.
                  </p>
                </div>

                {showAdvanced && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template de Descripción
                    </label>
                    <textarea
                      value={config.fixed_assets.description_template}
                      onChange={(e) => updateConfigModule('fixed_assets', 'description_template', e.target.value)}
                      placeholder="Adquisición Activo Fijo: {asset_name}"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Información sobre Asientos Automáticos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🎯 Asientos de Ventas</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Débito:</strong> Clientes por monto total</li>
                  <li>• <strong>Crédito:</strong> Ventas por monto neto</li>
                  <li>• <strong>Crédito:</strong> IVA Débito Fiscal</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">📊 Asientos de Compras</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Débito:</strong> Gastos por monto neto</li>
                  <li>• <strong>Débito:</strong> IVA Crédito Fiscal</li>
                  <li>• <strong>Crédito:</strong> Proveedores por total</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🏢 Asientos de Activos</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Débito:</strong> Cuenta del activo específico</li>
                  <li>• <strong>Crédito:</strong> Caja/Bancos o Proveedores</li>
                  <li>• Valor completo de adquisición</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Variables disponibles en templates:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 mt-1">
                    <li>• <code>{'{period}'}</code> - Período del RCV (YYYY-MM)</li>
                    <li>• <code>{'{file_name}'}</code> - Nombre del archivo RCV</li>
                    <li>• <code>{'{asset_name}'}</code> - Nombre del activo fijo</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}