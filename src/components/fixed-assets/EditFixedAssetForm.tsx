'use client';

import { useState, useEffect } from 'react';
import { X, Save, Package, Calendar, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui';
import { FixedAsset, Account } from '@/types';

interface EditFixedAssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: FixedAsset;
}

export default function EditFixedAssetForm({ isOpen, onClose, onSuccess, asset }: EditFixedAssetFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [formData, setFormData] = useState({
    name: asset.name,
    description: asset.description || '',
    category: asset.category,
    purchase_value: asset.purchase_value,
    residual_value: asset.residual_value || 0,
    purchase_date: asset.purchase_date,
    start_depreciation_date: asset.start_depreciation_date,
    useful_life_years: asset.useful_life_years,
    asset_account_code: asset.asset_account_code || '',
    depreciation_account_code: asset.depreciation_account_code || '',
    expense_account_code: asset.expense_account_code || '',
    serial_number: asset.serial_number || '',
    brand: asset.brand || '',
    model: asset.model || '',
    location: asset.location || '',
    responsible_person: asset.responsible_person || '',
    status: asset.status
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar cuentas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      // Reset form data when asset changes
      setFormData({
        name: asset.name,
        description: asset.description || '',
        category: asset.category,
        purchase_value: asset.purchase_value,
        residual_value: asset.residual_value || 0,
        purchase_date: asset.purchase_date,
        start_depreciation_date: asset.start_depreciation_date,
        useful_life_years: asset.useful_life_years,
        asset_account_code: asset.asset_account_code || '',
        depreciation_account_code: asset.depreciation_account_code || '',
        expense_account_code: asset.expense_account_code || '',
        serial_number: asset.serial_number || '',
        brand: asset.brand || '',
        model: asset.model || '',
        location: asset.location || '',
        responsible_person: asset.responsible_person || '',
        status: asset.status
      });
      setErrors({});
    }
  }, [isOpen, asset]);

  const loadAccounts = async () => {
    try {
      console.log('Loading accounts from API...');
      
      const response = await fetch('/api/chart-of-accounts?level=Imputable');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Accounts loaded:', data);
        
        const accountsData = data.accounts.map((acc: any) => ({
          id: acc.code,
          code: acc.code,
          name: acc.name,
          level: acc.level_type === 'Imputable' ? 4 : 3,
          account_type: acc.account_type.toLowerCase(),
          is_detail: acc.level_type === 'Imputable',
          is_active: acc.is_active
        }));
        
        console.log('Accounts loaded and formatted:', accountsData);
        setAccounts(accountsData);
      } else {
        console.error('Failed to load accounts');
        const basicAccounts: Account[] = [
          { id: '1.2.1.001', code: '1.2.1.001', name: 'Equipos de Computación', level: 4, account_type: 'activo', is_detail: true, is_active: true },
          { id: '1.2.1.002', code: '1.2.1.002', name: 'Muebles y Enseres', level: 4, account_type: 'activo', is_detail: true, is_active: true },
          { id: '1.2.1.003', code: '1.2.1.003', name: 'Equipos de Oficina', level: 4, account_type: 'activo', is_detail: true, is_active: true }
        ];
        setAccounts(basicAccounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
    }
  };

  // Auto-completar cuentas relacionadas basado en la cuenta de activo seleccionada
  const autoCompleteRelatedAccounts = (assetAccountCode: string) => {
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-completar cuentas relacionadas cuando se selecciona cuenta de activo
    if (field === 'asset_account_code' && typeof value === 'string') {
      autoCompleteRelatedAccounts(value);
      const selectedAccount = accounts.find(acc => acc.code === value);
      if (selectedAccount) {
        setFormData(prev => ({ ...prev, category: selectedAccount.name }));
      }
    }
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'La categoría es requerida';
    }

    if (!formData.purchase_value || formData.purchase_value <= 0) {
      newErrors.purchase_value = 'El valor de compra debe ser mayor a 0';
    }

    if (!formData.useful_life_years || formData.useful_life_years <= 0) {
      newErrors.useful_life_years = 'Los años de vida útil deben ser mayor a 0';
    }

    if (formData.residual_value < 0 || formData.residual_value >= formData.purchase_value) {
      newErrors.residual_value = 'El valor residual debe ser mayor o igual a 0 y menor al valor de compra';
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = 'La fecha de compra es requerida';
    }

    if (!formData.start_depreciation_date) {
      newErrors.start_depreciation_date = 'La fecha de puesta en marcha es requerida';
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
    
    try {
      const response = await fetch(`/api/fixed-assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log('Fixed asset updated successfully');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al actualizar activo fijo');
      }
    } catch (error) {
      console.error('Error updating fixed asset:', error);
      alert('Error al actualizar activo fijo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Editar Activo Fijo
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
          <div className="space-y-8">
            
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Computador Dell OptiPlex"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="Ej: Equipos de Computación"
                  />
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción detallada del activo fijo..."
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="active">Activo</option>
                    <option value="disposed">Dado de baja</option>
                    <option value="fully_depreciated">Totalmente depreciado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información Económica */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Información Económica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Valor de Compra */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor de Compra *
                  </label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.purchase_value ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.purchase_value}
                    onChange={(e) => handleInputChange('purchase_value', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  {errors.purchase_value && <p className="mt-1 text-sm text-red-600">{errors.purchase_value}</p>}
                </div>

                {/* Valor Residual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Residual
                  </label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.residual_value ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.residual_value}
                    onChange={(e) => handleInputChange('residual_value', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  {errors.residual_value && <p className="mt-1 text-sm text-red-600">{errors.residual_value}</p>}
                </div>

                {/* Vida Útil */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vida Útil (años) *
                  </label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.useful_life_years ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.useful_life_years}
                    onChange={(e) => handleInputChange('useful_life_years', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    min="1"
                  />
                  {errors.useful_life_years && <p className="mt-1 text-sm text-red-600">{errors.useful_life_years}</p>}
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Fechas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Fecha Inicio Depreciación *
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
                </div>
              </div>
            </div>

            {/* Información Contable */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Información Contable
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cuenta de Activo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de Activo
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

            {/* Información Adicional */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Información Adicional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Número de Serie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Serie
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.serial_number}
                    onChange={(e) => handleInputChange('serial_number', e.target.value)}
                    placeholder="Ej: DELL-001-2024"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Ej: Dell"
                  />
                </div>

                {/* Modelo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="Ej: OptiPlex 3090"
                  />
                </div>

                {/* Ubicación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Ej: Oficina Principal - Escritorio 1"
                  />
                </div>

                {/* Responsable */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona Responsable
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={formData.responsible_person}
                    onChange={(e) => handleInputChange('responsible_person', e.target.value)}
                    placeholder="Ej: Juan Pérez - Contador"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
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
              loading={loading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {loading ? 'Actualizando...' : 'Actualizar Activo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}