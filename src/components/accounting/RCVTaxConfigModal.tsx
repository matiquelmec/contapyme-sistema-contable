'use client';

import { useState, useEffect } from 'react';
import { X, Save, TrendingUp, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

interface TaxConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingConfig?: any;
  accounts: any[];
  onSave: (config: any) => void;
}

// Tipos de impuestos disponibles para RCV
const TAX_TYPES = [
  { value: 'iva_19', label: 'IVA 19% (General)', rate: 19, description: 'Impuesto general aplicable a la mayoría de bienes y servicios' },
  { value: 'iva_exento', label: 'IVA Exento', rate: 0, description: 'Operaciones exentas de IVA' },
  { value: 'ila_20.5', label: 'ILA 20.5%', rate: 20.5, description: 'Bebidas alcohólicas (vinos, cervezas)' },
  { value: 'ila_31.5', label: 'ILA 31.5%', rate: 31.5, description: 'Bebidas alcohólicas destiladas y bebidas analcohólicas con alto contenido de azúcar' },
  { value: 'ila_10', label: 'ILA 10%', rate: 10, description: 'Bebidas analcohólicas con bajo contenido de azúcar' },
  { value: 'iaba_5', label: 'IABA 5%', rate: 5, description: 'Impuesto adicional a bebidas analcohólicas azucaradas' },
  { value: 'diesel', label: 'Impuesto al Diesel', rate: null, description: 'Impuesto específico al combustible diesel' },
  { value: 'gasolina', label: 'Impuesto a la Gasolina', rate: null, description: 'Impuesto específico a las gasolinas' },
  { value: 'tabaco', label: 'Impuesto al Tabaco', rate: null, description: 'Impuesto específico a productos del tabaco' },
  { value: 'lujo', label: 'Impuesto a artículos de lujo', rate: 15, description: 'Artículos suntuarios y de lujo' },
  { value: 'digital', label: 'IVA Servicios Digitales', rate: 19, description: 'Servicios digitales prestados desde el extranjero' },
  { value: 'vehiculos', label: 'Impuesto a Vehículos', rate: null, description: 'Impuesto verde y adicional a vehículos' }
];

// Cuentas sugeridas según el tipo de impuesto
const SUGGESTED_ACCOUNTS = {
  'iva_19': ['2.1.4.001', '2.1.4.002', '1.1.4.001', '1.1.4.002'], // IVA Débito/Crédito
  'iva_exento': ['2.1.4.003'],
  'ila_20.5': ['2.1.4.101', '2.1.4.102'],
  'ila_31.5': ['2.1.4.103', '2.1.4.104'],
  'ila_10': ['2.1.4.105', '2.1.4.106'],
  'iaba_5': ['2.1.4.107', '2.1.4.108'],
  'diesel': ['2.1.4.201'],
  'gasolina': ['2.1.4.202'],
  'tabaco': ['2.1.4.203'],
  'lujo': ['2.1.4.204'],
  'digital': ['2.1.4.301'],
  'vehiculos': ['2.1.4.401']
};

export default function RCVTaxConfigModal({
  isOpen,
  onClose,
  editingConfig,
  accounts,
  onSave
}: TaxConfigModalProps) {
  const [selectedTaxType, setSelectedTaxType] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isForSales, setIsForSales] = useState(true);
  const [suggestedAccounts, setSuggestedAccounts] = useState<string[]>([]);

  useEffect(() => {
    if (editingConfig) {
      setSelectedTaxType(editingConfig.transaction_type || '');
      setSelectedAccount(editingConfig.tax_account_code || '');
      setAccountName(editingConfig.tax_account_name || '');
      setDisplayName(editingConfig.display_name || '');
      setIsForSales(editingConfig.display_name?.includes('Ventas') || true);
    }
  }, [editingConfig]);

  useEffect(() => {
    // Actualizar cuentas sugeridas cuando cambia el tipo de impuesto
    if (selectedTaxType && SUGGESTED_ACCOUNTS[selectedTaxType]) {
      setSuggestedAccounts(SUGGESTED_ACCOUNTS[selectedTaxType]);
    } else {
      setSuggestedAccounts([]);
    }

    // Auto-generar nombre descriptivo
    if (selectedTaxType) {
      const taxInfo = TAX_TYPES.find(t => t.value === selectedTaxType);
      if (taxInfo) {
        const transactionType = isForSales ? 'Ventas' : 'Compras';
        setDisplayName(`RCV ${transactionType} - ${taxInfo.label}`);
      }
    }
  }, [selectedTaxType, isForSales]);

  const handleAccountSelect = (code: string) => {
    const account = accounts.find(acc => acc.code === code);
    if (account) {
      setSelectedAccount(code);
      setAccountName(account.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const config = {
      id: editingConfig?.id,
      module_name: 'rcv',
      transaction_type: selectedTaxType,
      display_name: displayName,
      tax_account_code: selectedAccount,
      tax_account_name: accountName,
      revenue_account_code: '', // No aplica para RCV
      revenue_account_name: '',
      asset_account_code: '',
      asset_account_name: '',
      is_active: true
    };

    onSave(config);
  };

  const getFilteredAccounts = () => {
    // Filtrar cuentas de impuestos (generalmente en pasivos o activos)
    return accounts.filter(acc => 
      (acc.account_type === 'liability' || acc.account_type === 'asset') &&
      acc.is_detail &&
      (acc.name.toLowerCase().includes('iva') ||
       acc.name.toLowerCase().includes('impuesto') ||
       acc.name.toLowerCase().includes('tribut') ||
       acc.code.startsWith('2.1.4') || // Impuestos por pagar
       acc.code.startsWith('1.1.4'))   // IVA Crédito Fiscal
    );
  };

  if (!isOpen) return null;

  const selectedTaxInfo = TAX_TYPES.find(t => t.value === selectedTaxType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <span>{editingConfig ? 'Editar' : 'Nueva'} Configuración de Impuestos RCV</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure las cuentas contables para cada tipo de impuesto en el procesamiento RCV
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Información sobre RCV */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">¿Cómo funciona la configuración de impuestos RCV?</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Cada tipo de impuesto (IVA, ILA, etc.) necesita una cuenta contable específica</li>
                <li>El sistema detectará automáticamente el tipo de impuesto en los registros RCV</li>
                <li>Los asientos contables se generarán usando estas cuentas configuradas</li>
                <li>Puedes configurar diferentes cuentas para compras y ventas</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de transacción (Compras/Ventas) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Operación *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="operation_type"
                    checked={isForSales}
                    onChange={() => setIsForSales(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">Ventas (Débito Fiscal)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="operation_type"
                    checked={!isForSales}
                    onChange={() => setIsForSales(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Compras (Crédito Fiscal)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Selector de tipo de impuesto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Impuesto *
            </label>
            <select
              value={selectedTaxType}
              onChange={(e) => setSelectedTaxType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar tipo de impuesto...</option>
              {TAX_TYPES.map((tax) => (
                <option key={tax.value} value={tax.value}>
                  {tax.label} {tax.rate !== null && `(${tax.rate}%)`}
                </option>
              ))}
            </select>
            {selectedTaxInfo && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedTaxInfo.description}
              </p>
            )}
          </div>

          {/* Nombre descriptivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Descriptivo *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="ej: RCV Ventas - IVA 19%"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selector de cuenta contable */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-green-800 mb-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Cuenta Contable del Impuesto *</span>
            </label>
            
            {/* Cuentas sugeridas */}
            {suggestedAccounts.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-green-700 mb-2">Cuentas sugeridas:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedAccounts.map(code => {
                    const account = accounts.find(acc => acc.code === code);
                    if (account) {
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleAccountSelect(code)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedAccount === code
                              ? 'bg-green-600 text-white'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {code} - {account.name}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedAccount}
                onChange={(e) => handleAccountSelect(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar cuenta...</option>
                <optgroup label="Cuentas de Impuestos">
                  {getFilteredAccounts().map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Todas las cuentas">
                  {accounts
                    .filter(acc => acc.is_detail)
                    .map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={accountName}
                readOnly
                placeholder="Nombre de la cuenta"
                className="w-full px-3 py-2 border border-green-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          {/* Tabla de referencia de impuestos */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Referencia Rápida de Impuestos Chilenos</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Impuesto</th>
                    <th className="text-left py-2">Tasa</th>
                    <th className="text-left py-2">Aplicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 font-medium">IVA</td>
                    <td className="py-2">19%</td>
                    <td className="py-2 text-gray-600">General para bienes y servicios</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">ILA</td>
                    <td className="py-2">10-31.5%</td>
                    <td className="py-2 text-gray-600">Bebidas alcohólicas y analcohólicas según contenido</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">IABA</td>
                    <td className="py-2">5%</td>
                    <td className="py-2 text-gray-600">Adicional bebidas azucaradas</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Lujo</td>
                    <td className="py-2">15%</td>
                    <td className="py-2 text-gray-600">Artículos suntuarios</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
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
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingConfig ? 'Actualizar' : 'Crear'} Configuración
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}