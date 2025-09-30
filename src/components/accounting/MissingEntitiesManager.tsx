'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle, 
  Building2, 
  Users, 
  TrendingUp, 
  Loader2,
  X,
  Edit,
  Save
} from 'lucide-react';

interface MissingEntity {
  rut: string;
  razon_social: string;
  transaction_count: number;
  total_amount: number;
  suggested_type: 'supplier' | 'customer' | 'both';
  suggested_account_code: string;
  suggested_account_name: string;
}

interface MissingEntitiesData {
  missing_entities: MissingEntity[];
  total_missing: number;
  total_analyzed: number;
  coverage_percentage: string;
}

interface Props {
  rcvAnalysis: any;
  rcvType: 'purchase' | 'sales';
  companyId: string;
  onEntitiesAdded: () => void;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  level_type: string;
  account_type: string;
  parent_code?: string;
  is_active: boolean;
}

export default function MissingEntitiesManager({ 
  rcvAnalysis, 
  rcvType, 
  companyId, 
  onEntitiesAdded 
}: Props) {
  const [missingData, setMissingData] = useState<MissingEntitiesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingEntities, setAddingEntities] = useState<string[]>([]);
  const [addedEntities, setAddedEntities] = useState<string[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingEntity, setEditingEntity] = useState<string | null>(null);
  const [entitySettings, setEntitySettings] = useState<{[key: string]: {
    account_code: string;
    account_name: string;
    entity_type: 'supplier' | 'customer' | 'both';
  }}>({});

  // Cargar plan de cuentas
  const loadChartOfAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/chart-of-accounts');
      const data = await response.json();

      if (data.accounts) {
        // Filtrar solo cuentas relevantes para proveedores/clientes
        const relevantAccounts = data.accounts.filter((account: ChartAccount) => 
          account.level_type === 'Imputable' && 
          (account.account_type === 'ACTIVO' || account.account_type === 'PASIVO') &&
          account.is_active
        );
        setChartAccounts(relevantAccounts);
      }
    } catch (error) {
      console.error('Error cargando plan de cuentas:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Identificar entidades faltantes automáticamente
  const identifyMissingEntities = async () => {
    setLoading(true);
    try {
      console.log('🔍 Identificando entidades faltantes...');
      
      const response = await fetch('/api/accounting/rcv-analysis/missing-entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          rcv_analysis: rcvAnalysis,
          rcv_type: rcvType
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMissingData(data.data);
        console.log('📋 Entidades faltantes identificadas:', data.data.total_missing);
        
        // Inicializar settings de entidades con sugerencias automáticas
        const initialSettings: {[key: string]: {
          account_code: string;
          account_name: string;
          entity_type: 'supplier' | 'customer' | 'both';
        }} = {};
        
        data.data.missing_entities.forEach((entity: MissingEntity) => {
          initialSettings[entity.rut] = {
            account_code: entity.suggested_account_code,
            account_name: entity.suggested_account_name,
            entity_type: entity.suggested_type
          };
        });
        
        setEntitySettings(initialSettings);
        
        // Auto-mostrar si hay entidades faltantes
        if (data.data.total_missing > 0) {
          setShowManager(true);
        }
      } else {
        console.error('Error identificando entidades:', data.error);
      }
    } catch (error) {
      console.error('Error en identificación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar identificación automáticamente cuando se recibe análisis RCV
  useEffect(() => {
    if (rcvAnalysis && rcvAnalysis.proveedoresPrincipales) {
      identifyMissingEntities();
      loadChartOfAccounts();
    }
  }, [rcvAnalysis, rcvType, companyId]);

  // Agregar o actualizar una entidad en el sistema
  const addOrUpdateEntity = async (entity: MissingEntity) => {
    setAddingEntities(prev => [...prev, entity.rut]);
    
    try {
      // Formatear RUT automáticamente antes de enviar
      const formattedRUT = formatRUT(entity.rut);
      
      // Obtener configuración específica para esta entidad (o usar sugerencias por defecto)
      const settings = entitySettings[entity.rut] || {
        account_code: entity.suggested_account_code,
        account_name: entity.suggested_account_name,
        entity_type: entity.suggested_type
      };
      
      console.log('🔄 Agregando/Actualizando entidad:', entity.rut, '→', formattedRUT, 'Cuenta:', settings.account_code);
      
      // Primero intentar crear (POST)
      let response = await fetch('/api/accounting/rcv-entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          entity_name: entity.razon_social,
          entity_rut: formattedRUT,
          entity_type: settings.entity_type,
          account_code: settings.account_code,
          account_name: settings.account_name,
          default_tax_rate: 19.0,
          is_tax_exempt: false,
          is_active: true
        }),
      });

      let data = await response.json();

      // Si la entidad ya existe (409), intentar actualizar (PUT)
      if (response.status === 409) {
        console.log('🔄 Entidad ya existe, obteniendo ID para actualizar...');
        
        // Primero obtener el ID de la entidad existente
        const searchResponse = await fetch(`/api/accounting/rcv-entities/search?company_id=${companyId}&rut=${encodeURIComponent(formattedRUT)}`);
        const searchData = await searchResponse.json();
        
        if (searchData.success && searchData.entity) {
          console.log('✅ Entidad encontrada, actualizando con ID:', searchData.entity.id);
          
          response = await fetch('/api/accounting/rcv-entities', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: searchData.entity.id,
              entity_type: settings.entity_type,
              account_code: settings.account_code,
              account_name: settings.account_name,
              default_tax_rate: 19.0,
              is_tax_exempt: false
            }),
          });

          data = await response.json();
        } else {
          console.error('❌ No se pudo obtener ID de entidad existente');
          data = { success: false, error: 'No se pudo actualizar la entidad existente' };
        }
      }

      if (data.success || response.ok) {
        setAddedEntities(prev => [...prev, entity.rut]);
        console.log('✅ Entidad procesada exitosamente:', entity.rut);
        
        // Notificar al componente padre
        onEntitiesAdded();
      } else {
        console.error('Error procesando entidad:', data.error);
        alert(`Error procesando ${entity.razon_social}: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error en solicitud:', error);
      alert(`Error de conexión al procesar ${entity.razon_social}`);
    } finally {
      setAddingEntities(prev => prev.filter(rut => rut !== entity.rut));
    }
  };

  // Agregar/actualizar todas las entidades de una vez
  const addAllEntities = async () => {
    if (!missingData || missingData.missing_entities.length === 0) return;
    
    const entitiesToProcess = missingData.missing_entities.filter(
      entity => !addedEntities.includes(entity.rut)
    );
    
    for (const entity of entitiesToProcess) {
      await addOrUpdateEntity(entity);
      // Pequeña pausa entre requests para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  // Iniciar edición de una entidad
  const startEditEntity = (rut: string) => {
    setEditingEntity(rut);
  };

  // Guardar cambios de edición
  const saveEntitySettings = (rut: string) => {
    setEditingEntity(null);
  };

  // Actualizar setting de una entidad
  const updateEntitySetting = (rut: string, field: string, value: string) => {
    setEntitySettings(prev => ({
      ...prev,
      [rut]: {
        ...prev[rut],
        [field]: value
      }
    }));
  };

  // Formatear RUT chileno al formato estándar XX.XXX.XXX-X
  const formatRUT = (rut: string) => {
    if (!rut || typeof rut !== 'string') {
      return rut;
    }
    
    // Limpiar RUT (quitar puntos, guiones, espacios)
    const cleanRUT = rut.replace(/[.\-\s]/g, '').toUpperCase();
    
    // Validar que tenga al menos 8 caracteres (7 números + 1 dígito verificador)
    if (cleanRUT.length < 8 || cleanRUT.length > 9) {
      return rut; // Retornar original si la longitud no es válida
    }
    
    // Separar número y dígito verificador
    const rutNumber = cleanRUT.slice(0, -1);
    const verifier = cleanRUT.slice(-1);
    
    // Validar que el número sea numérico (excepto el dígito verificador)
    if (!/^\d+$/.test(rutNumber)) {
      return rut; // Retornar original si no es numérico
    }
    
    // Formatear con puntos de derecha a izquierda
    let formattedNumber = '';
    for (let i = rutNumber.length - 1, counter = 0; i >= 0; i--, counter++) {
      if (counter > 0 && counter % 3 === 0) {
        formattedNumber = '.' + formattedNumber;
      }
      formattedNumber = rutNumber[i] + formattedNumber;
    }
    
    return `${formattedNumber}-${verifier}`;
  };

  // Formatear montos
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Identificando entidades faltantes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!missingData) {
    return null;
  }

  if (missingData.total_missing === 0) {
    return (
      <Card className="mt-4 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              ✅ Todas las entidades del RCV están configuradas
            </span>
            <span className="text-sm">
              ({missingData.coverage_percentage}% cobertura)
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Resumen de entidades faltantes */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <span className="font-medium text-orange-800">
                  {missingData.total_missing} entidades faltantes encontradas
                </span>
                <div className="text-sm text-orange-600">
                  Cobertura actual: {missingData.coverage_percentage}% ({missingData.total_analyzed - missingData.total_missing}/{missingData.total_analyzed})
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManager(!showManager)}
              >
                {showManager ? 'Ocultar' : 'Ver Entidades'}
              </Button>
              {showManager && (
                <Button
                  size="sm"
                  onClick={addAllEntities}
                  disabled={addingEntities.length > 0}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Todas
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager de entidades faltantes */}
      {showManager && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Entidades Faltantes - Configuración Automática</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManager(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {missingData.missing_entities.map((entity, index) => {
                const isAdding = addingEntities.includes(entity.rut);
                const isAdded = addedEntities.includes(entity.rut);
                const isEditing = editingEntity === entity.rut;
                const settings = entitySettings[entity.rut] || {
                  account_code: entity.suggested_account_code,
                  account_name: entity.suggested_account_name,
                  entity_type: entity.suggested_type
                };

                return (
                  <div
                    key={entity.rut}
                    className={`p-4 border-b border-gray-100 ${isAdded ? 'bg-green-50' : ''}`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {entity.razon_social}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({formatRUT(entity.rut)})
                          </span>
                          {isAdded && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isAdded && !isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditEntity(entity.rut)}
                              title="Configurar cuenta"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isAdded && isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEntitySettings(entity.rut)}
                              title="Guardar configuración"
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Información básica */}
                      <div className="text-sm text-gray-600">
                        <span className="mr-4">
                          <Users className="w-4 h-4 inline mr-1" />
                          {entity.transaction_count} transacciones
                        </span>
                        <span>
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          {formatCurrency(entity.total_amount)}
                        </span>
                      </div>

                      {/* Configuración de cuenta */}
                      {isEditing ? (
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            🔧 Configurar cuenta contable
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Selector de tipo */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipo de entidad
                              </label>
                              <select
                                value={settings.entity_type}
                                onChange={(e) => updateEntitySetting(entity.rut, 'entity_type', e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="supplier">🏢 Proveedor</option>
                                <option value="customer">👤 Cliente</option>
                                <option value="both">🔄 Ambos</option>
                              </select>
                            </div>

                            {/* Selector de cuenta */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cuenta contable
                              </label>
                              {loadingAccounts ? (
                                <div className="text-sm text-gray-500 py-1">
                                  <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                                  Cargando cuentas...
                                </div>
                              ) : (
                                <select
                                  value={settings.account_code}
                                  onChange={(e) => {
                                    const selectedAccount = chartAccounts.find(acc => acc.code === e.target.value);
                                    updateEntitySetting(entity.rut, 'account_code', e.target.value);
                                    if (selectedAccount) {
                                      updateEntitySetting(entity.rut, 'account_name', selectedAccount.name);
                                    }
                                  }}
                                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Seleccionar cuenta...</option>
                                  {chartAccounts.map((account) => (
                                    <option key={account.code} value={account.code}>
                                      {account.code} - {account.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-blue-800">Cuenta:</span> 
                              <span className="text-blue-700 ml-1">{settings.account_code} - {settings.account_name}</span>
                            </div>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {settings.entity_type === 'supplier' ? '🏢 Proveedor' : 
                               settings.entity_type === 'customer' ? '👤 Cliente' : '🔄 Ambos'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Botón de acción */}
                      <div className="flex justify-end pt-2">
                        {isAdded ? (
                          <div className="flex items-center text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Entidad agregada exitosamente
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addOrUpdateEntity(entity)}
                            disabled={isAdding || isEditing || !settings.account_code}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {isAdding ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Plus className="w-4 h-4 mr-1" />
                            )}
                            {isAdding ? 'Procesando...' : isEditing ? 'Completar configuración' : 'Agregar/Actualizar Entidad'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}