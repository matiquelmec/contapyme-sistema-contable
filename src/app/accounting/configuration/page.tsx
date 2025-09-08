'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  FileText, 
  Download, 
  Upload, 
  Plus, 
  Edit2, 
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Save,
  X,
  Target,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  UserCheck,
  Building,
  Shield
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Header } from '@/components/layout';
import RCVTaxConfigModal from '@/components/accounting/RCVTaxConfigModal';
import CentralizedConfigTable from '@/components/accounting/CentralizedConfigTable';
import RCVEntitiesManager from '@/components/accounting/RCVEntitiesManager';


// Interfaces para configuración centralizada
interface CentralizedAccountConfig {
  id: string;
  module_name: string;
  transaction_type: string;
  display_name: string;
  tax_account_code: string;
  tax_account_name: string;
  revenue_account_code: string;
  revenue_account_name: string;
  asset_account_code: string;
  asset_account_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interface para configuración de empresa
interface CompanySettings {
  company_name: string;
  company_rut: string;
  email: string;
  payroll_configs: Array<{
    id: string;
    minimum_wage: number;
    uf_value: number;
    utm_value: number;
    family_allowance_limit: number;
    tramo_a: number;
    tramo_b: number;
    tramo_c: number;
    sis_percentage: number;
    unemployment_insurance_fixed: number;
    unemployment_insurance_indefinite: number;
    active: boolean;
  }>;
  afp_configs: Array<{
    id: string;
    name: string;
    commission_percentage: number;
    sis_percentage: number;
    active: boolean;
  }>;
  health_configs: Array<{
    id: string;
    name: string;
    code: string;
    plan_percentage: number;
    active: boolean;
  }>;
  income_limits: {
    uf_limit: number;
    minimum_wage: number;
    family_allowance_limit: number;
  };
  family_allowances: {
    tramo_a: number;
    tramo_b: number;
    tramo_c: number;
  };
  contributions: {
    unemployment_insurance_fixed: number;
    unemployment_insurance_indefinite: number;
    social_security_percentage: number;
  };
}

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

export default function ConfigurationPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<ChartAccount[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '1.1', '1.2', '2', '2.1', '2.2', '2.3', '3', '3.1', '3.2', '4', '4.1', '4.2']));
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountFormData, setAccountFormData] = useState({
    code: '',
    name: '',
    level_type: '1er Nivel',
    account_type: 'ACTIVO',
    parent_code: '',
    is_active: true
  });

  // Función para formatear automáticamente el código de cuenta (formato compatible con BD existente)
  const formatAccountCode = (input: string, preserveOriginal = false) => {
    // Si queremos preservar el formato original (para edición), solo limpiar algunos caracteres
    if (preserveOriginal) {
      // Permitir números, puntos y espacios para edición más flexible
      return input.replace(/[^\d\.\s]/g, '').trim();
    }
    
    // Remover todos los caracteres que no sean números
    const numbersOnly = input.replace(/[^\d]/g, '');
    
    console.log(`🔍 Formateando: "${input}" → numbersOnly: "${numbersOnly}" (${numbersOnly.length} dígitos)`);
    
    // Si está vacío, retornar vacío
    if (numbersOnly.length === 0) return '';
    
    // Formatear según la longitud para mantener compatibilidad con cuentas existentes
    if (numbersOnly.length === 1) {
      console.log('📝 Caso 1 dígito:', numbersOnly);
      return numbersOnly; // "1"
    } else if (numbersOnly.length === 2) {
      const result = `${numbersOnly[0]}.${numbersOnly[1]}`;
      console.log('📝 Caso 2 dígitos:', result);
      return result; // "1.2"
    } else if (numbersOnly.length === 3) {
      const result = `${numbersOnly[0]}.${numbersOnly[1]}.${numbersOnly[2]}`;
      console.log('📝 Caso 3 dígitos:', result);
      return result; // "1.2.3"
    } else if (numbersOnly.length === 4) {
      const result = `${numbersOnly[0]}.${numbersOnly[1]}.${numbersOnly[2]}.${numbersOnly[3]}`;
      console.log('📝 Caso 4 dígitos:', result);
      return result; // "1.2.3.4"
    } else if (numbersOnly.length >= 5) {
      const result = `${numbersOnly[0]}.${numbersOnly[1]}.${numbersOnly[2]}.${numbersOnly.substring(3)}`;
      console.log('📝 Caso 5+ dígitos:', result);
      return result; // "1.2.3.456"
    }
    
    return numbersOnly;
  };

  // Función para validar duplicados en código de cuenta (mejorada)
  const validateAccountCode = (code: string, excludeId?: string) => {
    console.log(`🧾 Validando código: "${code}"`);
    
    // Buscar si ya existe el código (normalizando espacios y puntos)
    const normalizedCode = code.trim();
    console.log(`🔍 Código normalizado: "${normalizedCode}"`);
    
    const existingAccount = accounts.find(account => {
      const existing = account.code.trim();
      const isDifferentAccount = account.id !== excludeId;
      const codeMatches = existing === normalizedCode;
      
      console.log(`📋 Comparando: "${existing}" vs "${normalizedCode}" | Diferente: ${isDifferentAccount} | Coincide: ${codeMatches}`);
      
      return isDifferentAccount && codeMatches;
    });
    
    if (existingAccount) {
      console.log(`❌ Código duplicado encontrado: ${existingAccount.code}`);
      return { isValid: false, error: `El código "${code}" ya existe en: ${existingAccount.name}` };
    }
    
    console.log('✅ Código válido - no hay duplicados');
    return { isValid: true, error: null };
  };

  // Estado para edición inline
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<ChartAccount | null>(null);
  const [isManualEditing, setIsManualEditing] = useState(false);

  // **Estados para configuraciones centralizadas**
  const [centralizedConfigs, setCentralizedConfigs] = useState<CentralizedAccountConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<CentralizedAccountConfig | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>(''); // Estado para el módulo seleccionado
  const [showRCVTaxModal, setShowRCVTaxModal] = useState(false); // Modal específico para RCV

  // Estados para configuración de empresa
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [loadingCompanySettings, setLoadingCompanySettings] = useState(true);
  const [savingCompanySettings, setSavingCompanySettings] = useState(false);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce'; // Synchronized with simple journal book

  // Cargar configuraciones centralizadas y cuentas
  useEffect(() => {
    loadChartOfAccounts();
    loadCentralizedConfigs();
    loadCompanySettings();
  }, []);

  // Cargar cuentas del plan de cuentas
  const loadChartOfAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/chart-of-accounts');
      const result = await response.json();
      
      console.log('📊 Resultado carga chart of accounts:', result);
      
      if (result.accounts) {
        setAccounts(result.accounts);
        console.log(`✅ ${result.accounts.length} cuentas cargadas`);
      } else {
        console.error('❌ Error: No se encontraron cuentas en la respuesta');
      }
    } catch (error) {
      console.error('❌ Error cargando chart of accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Guardar cuenta (crear o actualizar)
  const saveAccount = async () => {
    try {
      console.log('💾 Guardando cuenta:', accountFormData);
      
      // Validar campos requeridos
      if (!accountFormData.code || !accountFormData.name || !accountFormData.level_type || !accountFormData.account_type) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }

      // Validar duplicados
      const validation = validateAccountCode(accountFormData.code, editingAccount?.id);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      const method = editingAccount ? 'PUT' : 'POST';
      const url = '/api/chart-of-accounts';
      
      const requestData = editingAccount 
        ? { ...accountFormData, id: editingAccount.id }
        : accountFormData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success || result.data) {
        console.log('✅ Cuenta guardada exitosamente');
        setShowAddForm(false);
        setEditingAccount(null);
        setAccountFormData({
          code: '',
          name: '',
          level_type: '1er Nivel',
          account_type: 'ACTIVO',
          parent_code: '',
          is_active: true
        });
        
        // Recargar las cuentas después de guardar
        console.log('🔄 Recargando chart of accounts...');
        await loadChartOfAccounts();
      } else {
        console.error('❌ Error guardando cuenta:', result);
        alert(`Error al guardar cuenta: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error guardando cuenta:', error);
      alert('Error interno del servidor');
    }
  };

  // Eliminar cuenta
  const deleteAccount = async (account: ChartAccount) => {
    try {
      console.log(`🗑️ Eliminando cuenta ${account.code} - ${account.name}`);
      
      if (!confirm(`¿Está seguro de que desea eliminar la cuenta "${account.code} - ${account.name}"?`)) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
      }

      let response = await fetch(`/api/chart-of-accounts?id=${account.id}`, {
        method: 'DELETE'
      });

      let result = await response.json();
      
      // Si hay error por cuentas hijas, ofrecer eliminación forzada
      if (!result.success && result.error && result.error.includes('cuentas hijas')) {
        const forceDelete = confirm(
          `${result.error}\n\n¿Desea eliminar la cuenta de todas formas?`
        );
        
        if (forceDelete) {
          response = await fetch(`/api/chart-of-accounts?id=${account.id}&force=true`, {
            method: 'DELETE'
          });
          result = await response.json();
        } else {
          return;
        }
      }

      if (result.success) {
        console.log('✅ Cuenta eliminada exitosamente:', result.message);
        alert(`✅ ${result.message}`);
        // Forzar recarga completa del plan de cuentas
        setLoading(true);
        await loadChartOfAccounts();
        setLoading(false);
      } else {
        console.error('❌ Error eliminando cuenta:', result);
        alert(`❌ Error al eliminar cuenta: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error eliminando cuenta:', error);
      alert('Error interno del servidor');
    }
  };

  // Exportar plan de cuentas
  const exportChartOfAccounts = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv'
      });

      const response = await fetch(`/api/chart-of-accounts/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `plan_de_cuentas_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar el plan de cuentas');
    }
  };

  // Importar plan de cuentas
  const importChartOfAccounts = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/chart-of-accounts/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Importación exitosa: ${result.imported} cuentas importadas`);
        loadChartOfAccounts(); // Recargar las cuentas
      } else {
        alert(`❌ Error en la importación: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importando:', error);
      alert('Error al importar el archivo');
    }
  };

  // Cargar configuraciones centralizadas
  const loadCentralizedConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const response = await fetch('/api/accounting/centralized-config');
      const result = await response.json();
      
      if (result.success && result.data) {
        setCentralizedConfigs(result.data);
        console.log('✅ Configuraciones centralizadas cargadas:', result.data.length);
      } else {
        console.error('❌ Error cargando configuraciones centralizadas:', result);
      }
    } catch (error) {
      console.error('❌ Error cargando configuraciones centralizadas:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Cargar configuración de empresa
  const loadCompanySettings = async () => {
    try {
      setLoadingCompanySettings(true);
      const response = await fetch('/api/payroll/company-settings');
      const result = await response.json();
      
      if (result.success && result.data) {
        setCompanySettings(result.data);
        console.log('✅ Configuración de empresa cargada');
      } else {
        console.log('ℹ️ No hay configuración de empresa guardada');
      }
    } catch (error) {
      console.error('❌ Error cargando configuración de empresa:', error);
    } finally {
      setLoadingCompanySettings(false);
    }
  };

  // Filtrar cuentas según término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const filtered = accounts.filter(account => 
      account.code.toLowerCase().includes(searchTermLower) ||
      account.name.toLowerCase().includes(searchTermLower) ||
      account.level_type.toLowerCase().includes(searchTermLower) ||
      account.account_type.toLowerCase().includes(searchTermLower) ||
      (account.parent_code && account.parent_code.toLowerCase().includes(searchTermLower))
    );
    setFilteredAccounts(filtered);
  }, [accounts, searchTerm]);

  // Función para expandir/contraer nodos
  const toggleNode = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  // Renderizar cuenta en formato de tabla
  const renderAccountRow = (account: ChartAccount) => {
    const accountTypeColors = {
      'ACTIVO': 'text-blue-600 bg-blue-50',
      'PASIVO': 'text-red-600 bg-red-50',
      'PATRIMONIO': 'text-purple-600 bg-purple-50',
      'INGRESO': 'text-green-600 bg-green-50',
      'GASTO': 'text-orange-600 bg-orange-50'
    };

    const levelColors = {
      '1er Nivel': 'text-gray-800 bg-gray-100',
      '2do Nivel': 'text-amber-800 bg-amber-100',
      '3er Nivel': 'text-purple-800 bg-purple-100',
      'Imputable': 'text-blue-800 bg-blue-100'
    };

    return (
      <tr key={account.id} className="border-t border-gray-200 hover:bg-gray-50">
        <td className="py-3 px-4">
          <span className="font-mono text-sm font-medium text-gray-900">
            {account.code}
          </span>
        </td>
        <td className="py-3 px-4">
          <div className="font-medium text-gray-900">{account.name}</div>
        </td>
        <td className="py-3 px-4">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${levelColors[account.level_type] || 'bg-gray-100 text-gray-800'}`}>
            {account.level_type}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${accountTypeColors[account.account_type] || 'bg-gray-100 text-gray-800'}`}>
            {account.account_type}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className="text-sm text-gray-600 font-mono">
            {account.parent_code || '-'}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            account.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {account.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end space-x-2">
            <button 
              onClick={() => {
                setEditingAccount(account);
                setShowAddForm(true);
                setAccountFormData({
                  code: account.code,
                  name: account.name,
                  level_type: account.level_type,
                  account_type: account.account_type,
                  parent_code: account.parent_code || '',
                  is_active: account.is_active
                });
              }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => deleteAccount(account)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      <Header 
        title="Configuración del Sistema"
        subtitle="Gestión del plan de cuentas IFRS y configuraciones avanzadas"
        showBackButton={true}
        backHref="/accounting"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Plan de Cuentas IFRS */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-200 transition-colors">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span>Plan de Cuentas IFRS</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {accounts.length} cuentas
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={exportChartOfAccounts}
                  className="border-green-200 hover:bg-green-50 text-green-700"
                >
                  Exportar CSV
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importChartOfAccounts(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    className="border-orange-200 hover:bg-orange-50 text-orange-700"
                    as="span"
                  >
                    Importar CSV
                  </Button>
                </label>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountFormData({
                      code: '',
                      name: '',
                      level_type: '1er Nivel',
                      account_type: 'ACTIVO',
                      parent_code: '',
                      is_active: true
                    });
                    setShowAddForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Nueva Cuenta
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Estructura contable completa basada en estándares IFRS para PyMEs chilenas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Barra de búsqueda */}
            <div className="mb-6 flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre, tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {searchTerm && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  {filteredAccounts.length} resultado{filteredAccounts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Tabla de cuentas */}
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando plan de cuentas...</span>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Código</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Nombre</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Nivel</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Padre</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map(renderAccountRow)
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          {searchTerm ? (
                            <>
                              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No se encontraron cuentas</p>
                              <p className="text-sm">Intenta con otros términos de búsqueda</p>
                            </>
                          ) : (
                            <>
                              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No hay cuentas registradas</p>
                              <p className="text-sm">Agrega tu primera cuenta contable</p>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección de Entidades RCV */}
        <RCVEntitiesManager companyId={companyId} />

        {/* Configuración de Mapeo Automático */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-100 hover:border-purple-200 transition-colors">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span>Configuración de Mapeo Automático</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  {centralizedConfigs.length} configuraciones
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setSelectedModule('RCV');
                    setShowRCVTaxModal(true);
                  }}
                  variant="outline" 
                  size="sm"
                  className="border-amber-200 hover:bg-amber-50 text-amber-700"
                >
                  ⚙️ Configurar RCV
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Configuración centralizada de cuentas contables para diferentes módulos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingConfigs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-gray-600">Cargando configuraciones...</span>
              </div>
            ) : (
              <>
                {centralizedConfigs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No hay configuraciones de mapeo</p>
                    <p className="text-sm">Configure el mapeo automático para integrar módulos con el plan de cuentas</p>
                  </div>
                ) : (
                  <CentralizedConfigTable 
                    configs={centralizedConfigs} 
                    onReload={loadCentralizedConfigs}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de formulario para cuenta */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAccount ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Complete la información de la cuenta siguiendo los estándares IFRS
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Código y Nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Cuenta *
                  </label>
                  <input
                    type="text"
                    value={accountFormData.code}
                    onChange={(e) => {
                      const formatted = formatAccountCode(e.target.value, isManualEditing);
                      setAccountFormData({...accountFormData, code: formatted});
                    }}
                    onFocus={() => setIsManualEditing(true)}
                    onBlur={() => setIsManualEditing(false)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="1.1.1.001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: 1.2.3.456 (se formatea automáticamente)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Cuenta *
                  </label>
                  <input
                    type="text"
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Caja y Bancos"
                  />
                </div>
              </div>

              {/* Nivel y Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel de Cuenta *
                  </label>
                  <select
                    value={accountFormData.level_type}
                    onChange={(e) => setAccountFormData({...accountFormData, level_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1er Nivel">1er Nivel</option>
                    <option value="2do Nivel">2do Nivel</option>
                    <option value="3er Nivel">3er Nivel</option>
                    <option value="Imputable">Imputable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={accountFormData.account_type}
                    onChange={(e) => setAccountFormData({...accountFormData, account_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="PASIVO">Pasivo</option>
                    <option value="PATRIMONIO">Patrimonio</option>
                    <option value="INGRESO">Ingreso</option>
                    <option value="GASTO">Gasto</option>
                  </select>
                </div>
              </div>

              {/* Cuenta Padre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta Padre (Opcional)
                </label>
                <select
                  value={accountFormData.parent_code}
                  onChange={(e) => setAccountFormData({...accountFormData, parent_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin cuenta padre</option>
                  {accounts
                    .filter(account => account.id !== editingAccount?.id)
                    .map(account => (
                      <option key={account.id} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={accountFormData.is_active}
                  onChange={(e) => setAccountFormData({...accountFormData, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Cuenta activa
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAccount(null);
                  setAccountFormData({
                    code: '',
                    name: '',
                    level_type: '1er Nivel',
                    account_type: 'ACTIVO',
                    parent_code: '',
                    is_active: true
                  });
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={saveAccount}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingAccount ? 'Actualizar' : 'Crear'} Cuenta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para configuración de RCV */}
      {showRCVTaxModal && (
        <RCVTaxConfigModal
          isOpen={showRCVTaxModal}
          onClose={() => {
            setShowRCVTaxModal(false);
            setSelectedModule('');
          }}
          onSave={() => {
            setShowRCVTaxModal(false);
            setSelectedModule('');
            loadCentralizedConfigs(); // Recargar configuraciones
          }}
        />
      )}
    </div>
  );
}