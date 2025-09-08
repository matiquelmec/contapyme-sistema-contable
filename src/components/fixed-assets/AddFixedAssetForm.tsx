'use client';

import { useState, useEffect } from 'react';
import { X, Save, Package, Calendar, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui';
import { CreateFixedAssetData, Account } from '@/types';
import { useChartOfAccountsCache } from '@/hooks/useChartOfAccountsCache';

interface AddFixedAssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createAssetOptimistic?: (data: CreateFixedAssetData, onSuccess?: () => void, onError?: (error: string) => void) => void;
}

export default function AddFixedAssetForm({ isOpen, onClose, onSuccess, createAssetOptimistic }: AddFixedAssetFormProps) {
  const [loading, setLoading] = useState(false);
  const { accounts, loading: accountsLoading, loadAccounts } = useChartOfAccountsCache();
  
  const [formData, setFormData] = useState<CreateFixedAssetData>({
    name: '',
    description: '',
    category: 'Activo Fijo',
    purchase_value: 0,
    residual_value: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    start_depreciation_date: new Date().toISOString().split('T')[0],
    useful_life_years: 1,
    asset_account_code: '',
    depreciation_account_code: '',
    expense_account_code: '',
    serial_number: '',
    brand: '',
    model: '',
    location: '',
    responsible_person: ''
  });

  const [errors, setErrors] = useState<Partial<CreateFixedAssetData>>({});

  // Cargar cuentas imputables al abrir el modal
  useEffect(() => {
    if (isOpen && !accountsLoading) {
      // Si no hay cuentas cargadas, cargar con filtro para activos fijos
      if (accounts.length === 0) {
        loadAccounts({ level: 'Imputable' });
      }
    }
  }, [isOpen, accountsLoading, accounts.length]);

  // Auto-completar cuentas relacionadas basado en la cuenta de activo seleccionada
  const autoCompleteRelatedAccounts = (assetAccountCode: string) => {
    // Mapeo inteligente basado en la estructura del plan de cuentas
    const accountMappings: Record<string, { depreciation: string; expense: string }> = {
      '1.2.1.001': { depreciation: '1.2.2.001', expense: '6.1.1.001' }, // Equipos Computación
      '1.2.1.002': { depreciation: '1.2.2.002', expense: '6.1.1.002' }, // Muebles y Enseres  
      '1.2.1.003': { depreciation: '1.2.2.003', expense: '6.1.1.003' }, // Equipos Oficina
      '1.2.1.004': { depreciation: '1.2.2.004', expense: '6.1.1.004' }, // Vehículos
    };

    const mapping = accountMappings[assetAccountCode];
    if (mapping) {
      setFormData(prev => ({
        ...prev,
        depreciation_account_code: mapping.depreciation,
        expense_account_code: mapping.expense
      }));
    } else {
      // Lógica fallback: intentar generar códigos automáticamente
      // Si es 1.2.1.XXX, generar 1.2.2.XXX y 6.1.1.XXX
      if (assetAccountCode.startsWith('1.2.1.')) {
        const suffix = assetAccountCode.replace('1.2.1.', '');
        setFormData(prev => ({
          ...prev,
          depreciation_account_code: `1.2.2.${suffix}`,
          expense_account_code: `6.1.1.${suffix}`
        }));
      }
    }
  };

  const handleInputChange = (field: keyof CreateFixedAssetData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-completar cuentas relacionadas cuando se selecciona cuenta de activo
    if (field === 'asset_account_code' && typeof value === 'string') {
      autoCompleteRelatedAccounts(value);
    }
    
    // Auto-completar categoría basada en cuenta de activo
    if (field === 'asset_account_code' && typeof value === 'string') {
      const selectedAccount = accounts.find(acc => acc.code === value);
      if (selectedAccount) {
        setFormData(prev => ({ ...prev, category: selectedAccount.name }));
      }
    }
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateFixedAssetData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.purchase_value <= 0) {
      newErrors.purchase_value = 'El valor de compra debe ser mayor a 0';
    }

    if (formData.residual_value < 0) {
      newErrors.residual_value = 'El valor residual no puede ser negativo';
    }

    if (formData.residual_value >= formData.purchase_value) {
      newErrors.residual_value = 'El valor residual debe ser menor al valor de compra';
    }

    if (formData.useful_life_years <= 0) {
      newErrors.useful_life_years = 'Los años de vida útil deben ser mayor a 0';
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = 'La fecha de compra es requerida';
    }

    if (!formData.start_depreciation_date) {
      newErrors.start_depreciation_date = 'La fecha de puesta en marcha es requerida';
    }

    if (!formData.asset_account_code) {
      newErrors.asset_account_code = 'La cuenta de activo es requerida';
    } else {
      // Validar que la cuenta de activo existe en la lista cargada
      const assetAccountExists = accounts.find(acc => acc.code === formData.asset_account_code);
      if (!assetAccountExists) {
        newErrors.asset_account_code = 'La cuenta de activo seleccionada no es válida';
      }
    }

    // Validar cuentas opcionales si se especifican
    if (formData.depreciation_account_code) {
      const depAccountExists = accounts.find(acc => acc.code === formData.depreciation_account_code);
      if (!depAccountExists) {
        newErrors.depreciation_account_code = 'La cuenta de depreciación seleccionada no es válida';
      }
    }

    if (formData.expense_account_code) {
      const expAccountExists = accounts.find(acc => acc.code === formData.expense_account_code);
      if (!expAccountExists) {
        newErrors.expense_account_code = 'La cuenta de gasto seleccionada no es válida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Usar optimistic updates si está disponible
    if (createAssetOptimistic) {
      createAssetOptimistic(
        formData,
        () => {
          // Éxito - resetear formulario
          resetForm();
          onSuccess();
          onClose();
          setLoading(false);
        },
        (error) => {
          // Error - mostrar mensaje
          alert(error || 'Error al crear activo fijo');
          setLoading(false);
        }
      );
    } else {
      // Fallback a método tradicional
      try {
        const response = await fetch('/api/fixed-assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Activo creado:', result);
          
          resetForm();
          onSuccess();
          onClose();
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Error al crear activo fijo');
        }
      } catch (error) {
        console.error('Error creating fixed asset:', error);
        alert('Error al crear activo fijo');
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Activo Fijo',
      purchase_value: 0,
      residual_value: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      start_depreciation_date: new Date().toISOString().split('T')[0],
      useful_life_years: 1,
      asset_account_code: '',
      depreciation_account_code: '',
      expense_account_code: '',
      serial_number: '',
      brand: '',
      model: '',
      location: '',
      responsible_person: ''
    });
    setErrors({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-orange-600" />
            Agregar Nuevo Activo Fijo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Información Básica */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Información Básica
                </h3>
                
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Activo *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Escritorio ejecutivo, Computador Dell, etc."
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>


                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="Descripción detallada del activo..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>

                  {/* Información Adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Serie
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="S/N o código interno"
                        value={formData.serial_number}
                        onChange={(e) => handleInputChange('serial_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Marca o fabricante"
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Modelo específico"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ubicación
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Oficina, bodega, etc."
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsable
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Persona a cargo del activo"
                      value={formData.responsible_person}
                      onChange={(e) => handleInputChange('responsible_person', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información Financiera y Contable */}
            <div className="space-y-6">
              {/* Valores Económicos */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Valores Económicos
                </h3>
                
                <div className="space-y-4">
                  {/* Valor de Compra */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor de Compra *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.purchase_value ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      value={formData.purchase_value || ''}
                      onChange={(e) => handleInputChange('purchase_value', parseFloat(e.target.value) || 0)}
                    />
                    {errors.purchase_value && <p className="mt-1 text-sm text-red-600">{errors.purchase_value}</p>}
                    {formData.purchase_value > 0 && (
                      <p className="mt-1 text-sm text-blue-600">
                        {formatCurrency(formData.purchase_value)}
                      </p>
                    )}
                  </div>

                  {/* Valor Residual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Residual *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.residual_value ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      value={formData.residual_value || ''}
                      onChange={(e) => handleInputChange('residual_value', parseFloat(e.target.value) || 0)}
                    />
                    {errors.residual_value && <p className="mt-1 text-sm text-red-600">{errors.residual_value}</p>}
                    {formData.residual_value > 0 && (
                      <p className="mt-1 text-sm text-blue-600">
                        {formatCurrency(formData.residual_value)}
                      </p>
                    )}
                  </div>

                  {/* Valor Depreciable */}
                  {formData.purchase_value > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Valor Depreciable:</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(formData.purchase_value - formData.residual_value)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fechas y Depreciación */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fechas y Depreciación
                </h3>
                
                <div className="space-y-4">
                  {/* Fecha de Compra */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Compra *
                    </label>
                    <input
                      type="date"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.purchase_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.purchase_date}
                      onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                    />
                    {errors.purchase_date && <p className="mt-1 text-sm text-red-600">{errors.purchase_date}</p>}
                  </div>

                  {/* Fecha de Puesta en Marcha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Puesta en Marcha *
                    </label>
                    <input
                      type="date"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.start_depreciation_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.start_depreciation_date}
                      onChange={(e) => handleInputChange('start_depreciation_date', e.target.value)}
                    />
                    {errors.start_depreciation_date && <p className="mt-1 text-sm text-red-600">{errors.start_depreciation_date}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      Fecha desde la cual comienza la depreciación
                    </p>
                  </div>

                  {/* Años de Vida Útil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Años de Vida Útil *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.useful_life_years ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.useful_life_years || ''}
                      onChange={(e) => handleInputChange('useful_life_years', parseInt(e.target.value) || 1)}
                    />
                    {errors.useful_life_years && <p className="mt-1 text-sm text-red-600">{errors.useful_life_years}</p>}
                  </div>

                  {/* Depreciación Mensual Estimada */}
                  {formData.purchase_value > 0 && formData.useful_life_years > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Depreciación Mensual:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {formatCurrency((formData.purchase_value - formData.residual_value) / (formData.useful_life_years * 12))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cuentas Contables */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Cuentas Contables
                </h3>
                
                <div className="space-y-4">
                  {/* Cuenta de Activo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuenta de Activo *
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.asset_account_code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.asset_account_code}
                      onChange={(e) => handleInputChange('asset_account_code', e.target.value)}
                    >
                      <option value="">Seleccionar cuenta de activo</option>
                      {accounts
                        .filter(acc => acc.account_type.toLowerCase() === 'activo' && !acc.code.includes('Dep. Acum') && !acc.name.includes('Dep. Acum'))
                        .map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                    {errors.asset_account_code && <p className="mt-1 text-sm text-red-600">{errors.asset_account_code}</p>}
                  </div>

                  {/* Cuenta Depreciación Acumulada */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuenta Depreciación Acumulada
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      value={formData.depreciation_account_code}
                      onChange={(e) => handleInputChange('depreciation_account_code', e.target.value)}
                    >
                      <option value="">Seleccionar cuenta (opcional)</option>
                      {accounts
                        .filter(acc => acc.account_type.toLowerCase() === 'activo' && (acc.code.includes('Dep. Acum') || acc.name.includes('Dep. Acum')))
                        .map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Cuenta Gasto Depreciación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuenta Gasto Depreciación
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      value={formData.expense_account_code}
                      onChange={(e) => handleInputChange('expense_account_code', e.target.value)}
                    >
                      <option value="">Seleccionar cuenta (opcional)</option>
                      {accounts
                        .filter(acc => acc.account_type.toLowerCase() === 'gasto' && acc.name.includes('Depreciación'))
                        .map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Activo Fijo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}