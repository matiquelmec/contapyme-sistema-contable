'use client';

import React, { useState, useEffect } from 'react';
import { useRCVEntityLookup } from '@/hooks/useRCVEntityLookup';
import { Building2, Users, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface RCVEntitySuggestion {
  id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  account_code: string;
  account_name: string;
  account_type: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
}

interface Props {
  description: string;
  documentNumber: string;
  onEntityFound: (entity: RCVEntitySuggestion) => void;
  onSuggestionApplied: (accountCode: string, accountName: string, entity: RCVEntitySuggestion) => void;
  className?: string;
}

export function RUTEntityDetector({ 
  description, 
  documentNumber, 
  onEntityFound, 
  onSuggestionApplied,
  className = '' 
}: Props) {
  const [foundEntities, setFoundEntities] = useState<RCVEntitySuggestion[]>([]);
  const [notFoundRUTs, setNotFoundRUTs] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { 
    loading, 
    debouncedAutoLookup, 
    extractRUTsFromText,
    generateAccountSuggestions 
  } = useRCVEntityLookup();

  // Auto-detectar RUTs cuando cambie la descripción o número de documento
  useEffect(() => {
    const combinedText = `${description} ${documentNumber}`.trim();
    
    if (!combinedText) {
      setFoundEntities([]);
      setNotFoundRUTs([]);
      return;
    }

    const ruts = extractRUTsFromText(combinedText);
    if (ruts.length === 0) {
      setFoundEntities([]);
      setNotFoundRUTs([]);
      return;
    }

    console.log(`🔍 RUT Detector - Texto: "${combinedText}" → RUTs: ${ruts.join(', ')}`);

    debouncedAutoLookup(
      combinedText,
      // Callback cuando encuentra entidad
      (entity) => {
        setFoundEntities(prev => {
          // Evitar duplicados
          if (prev.find(e => e.id === entity.id)) {
            return prev;
          }
          const updated = [...prev, entity];
          console.log(`✅ Entidad encontrada: ${entity.entity_name} (${entity.entity_rut}) → ${entity.account_code}`);
          onEntityFound(entity);
          return updated;
        });
      },
      // Callback cuando NO encuentra entidad
      (rut) => {
        setNotFoundRUTs(prev => {
          if (prev.includes(rut)) {
            return prev;
          }
          console.log(`❌ RUT no encontrado: ${rut}`);
          return [...prev, rut];
        });
      },
      800 // Delay de 800ms
    );
  }, [description, documentNumber, debouncedAutoLookup, extractRUTsFromText, onEntityFound]);

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'supplier': return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'customer': return <Users className="w-4 h-4 text-green-600" />;
      case 'both': return <Users className="w-4 h-4 text-purple-600" />;
      default: return <Building2 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'supplier': return '🏢 Proveedor';
      case 'customer': return '👤 Cliente'; 
      case 'both': return '🔄 Ambos';
      default: return 'Entidad';
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'supplier': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'customer': return 'bg-green-50 border-green-200 text-green-800';
      case 'both': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const applySuggestion = (entity: RCVEntitySuggestion) => {
    onSuggestionApplied(entity.account_code, entity.account_name, entity);
  };

  if (loading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2 text-sm text-blue-700">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>🔍 Buscando entidades RCV...</span>
        </div>
      </div>
    );
  }

  const hasEntities = foundEntities.length > 0;
  const hasNotFound = notFoundRUTs.length > 0;

  if (!hasEntities && !hasNotFound) {
    return null;
  }

  if (!showSuggestions) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-2 ${className}`}>
        <button 
          onClick={() => setShowSuggestions(true)}
          className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Mostrar sugerencias RCV ({foundEntities.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Entidades Encontradas */}
      {hasEntities && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-emerald-800">
              <CheckCircle className="w-4 h-4" />
              <span>🎯 Entidades RCV Detectadas ({foundEntities.length})</span>
            </div>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-emerald-600 hover:text-emerald-800 text-xs"
            >
              Ocultar
            </button>
          </div>
          
          <div className="space-y-2">
            {foundEntities.map((entity, index) => {
              const suggestions = generateAccountSuggestions(entity);
              
              return (
                <div 
                  key={`${entity.id}-${index}`}
                  className={`border rounded-lg p-3 ${getEntityTypeColor(entity.entity_type)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getEntityTypeIcon(entity.entity_type)}
                      <div>
                        <span className="font-medium text-sm">{entity.entity_name}</span>
                        <span className="text-xs text-gray-600 ml-2">({entity.entity_rut})</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entity.entity_type === 'supplier' 
                        ? 'bg-blue-100 text-blue-800'
                        : entity.entity_type === 'customer'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {getEntityTypeLabel(entity.entity_type)}
                    </span>
                  </div>
                  
                  {/* Sugerencia de cuenta principal */}
                  <div className="bg-white bg-opacity-60 rounded-lg p-2 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-mono text-xs text-gray-700">{entity.account_code}</span>
                        <span className="text-gray-600 text-xs ml-2">{entity.account_name}</span>
                      </div>
                      <button
                        onClick={() => applySuggestion(entity)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                      >
                        ✨ Usar Cuenta
                      </button>
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      {!entity.is_tax_exempt && (
                        <span className="text-gray-600">
                          IVA: {entity.default_tax_rate}%
                        </span>
                      )}
                      {entity.is_tax_exempt && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Exento IVA
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {entity.account_type === 'asset' ? '📈 Activo' :
                       entity.account_type === 'liability' ? '📉 Pasivo' :
                       entity.account_type === 'income' ? '💰 Ingreso' :
                       entity.account_type === 'expense' ? '💸 Gasto' : 'Cuenta'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RUTs No Encontrados */}
      {hasNotFound && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm text-amber-800 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>⚠️ RUTs No Registrados ({notFoundRUTs.length})</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {notFoundRUTs.map((rut, index) => (
              <span 
                key={`${rut}-${index}`}
                className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-mono"
              >
                {rut}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-700">
            💡 <strong>Tip:</strong> Ve a <a href="/accounting/configuration" className="underline hover:text-amber-800" target="_blank">Configuración → Entidades RCV</a> para registrar estos RUTs y automatizar futuras integraciones.
          </p>
        </div>
      )}
    </div>
  );
}