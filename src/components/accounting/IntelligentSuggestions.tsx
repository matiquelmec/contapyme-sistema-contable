'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Lightbulb, Plus, Calculator, TrendingUp } from 'lucide-react';
import { JournalEntryValidator } from '@/lib/services/journalEntryValidator';

interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface RCVEntity {
  id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  account_code: string;
  account_name: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
}

interface Props {
  entryLines: JournalEntryLine[];
  description: string;
  document: string;
  detectedEntities: RCVEntity[];
  onApplySuggestion: (accountCode: string, accountName: string, amount: number, type: 'debit' | 'credit', description?: string) => void;
  className?: string;
}

export function IntelligentSuggestions({
  entryLines,
  description,
  document,
  detectedEntities,
  onApplySuggestion,
  className = ''
}: Props) {
  
  // Usar el validador para obtener sugerencias
  const suggestions = JournalEntryValidator.validateWithRCVEntities(
    entryLines,
    description,
    document,
    detectedEntities
  );

  if (suggestions.length === 0) {
    return null;
  }

  const getSuggestionIcon = (type: string, level: string) => {
    if (level === 'error') return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (level === 'warning') return <AlertCircle className="w-4 h-4 text-amber-600" />;
    if (type === 'tax_calculation') return <Calculator className="w-4 h-4 text-blue-600" />;
    if (type === 'entity_suggestion') return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    return <Lightbulb className="w-4 h-4 text-purple-600" />;
  };

  const getSuggestionColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'suggestion': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getSuggestionTextColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-800';
      case 'warning': return 'text-amber-800';
      case 'suggestion': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.suggested_account) {
      const { code, name, amount = 0, type } = suggestion.suggested_account;
      const suggestedDescription = suggestion.type === 'entity_suggestion' 
        ? `Transacción con ${detectedEntities.find(e => e.account_code === code)?.entity_name || 'entidad'}`
        : suggestion.details || '';
      
      onApplySuggestion(code, name, amount, type, suggestedDescription);
    }
  };

  // Agrupar sugerencias por nivel
  const errorSuggestions = suggestions.filter(s => s.level === 'error');
  const warningSuggestions = suggestions.filter(s => s.level === 'warning');
  const infoSuggestions = suggestions.filter(s => s.level === 'suggestion');

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Errores críticos */}
      {errorSuggestions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              🚨 Errores que deben corregirse ({errorSuggestions.length})
            </span>
          </div>
          <div className="space-y-2">
            {errorSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-red-100 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{suggestion.message}</p>
                    {suggestion.details && (
                      <p className="text-xs text-red-700 mt-1">{suggestion.details}</p>
                    )}
                  </div>
                  {suggestion.suggested_account && (
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                    >
                      Corregir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertencias */}
      {warningSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              ⚠️ Sugerencias importantes ({warningSuggestions.length})
            </span>
          </div>
          <div className="space-y-2">
            {warningSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-amber-100 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getSuggestionIcon(suggestion.type, suggestion.level)}
                    <div>
                      <p className="text-sm text-amber-800 font-medium">{suggestion.message}</p>
                      {suggestion.details && (
                        <p className="text-xs text-amber-700 mt-1">{suggestion.details}</p>
                      )}
                    </div>
                  </div>
                  {suggestion.suggested_account && (
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="ml-3 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Aplicar</span>
                    </button>
                  )}
                </div>
                {suggestion.suggested_account?.amount && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    💰 Monto sugerido: ${suggestion.suggested_account.amount.toLocaleString('es-CL')} ({suggestion.suggested_account.type === 'debit' ? 'Débito' : 'Crédito'})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugerencias informativas */}
      {infoSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              💡 Optimizaciones sugeridas ({infoSuggestions.length})
            </span>
          </div>
          <div className="space-y-2">
            {infoSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-blue-100 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getSuggestionIcon(suggestion.type, suggestion.level)}
                    <div>
                      <p className="text-sm text-blue-800">{suggestion.message}</p>
                      {suggestion.details && (
                        <p className="text-xs text-blue-700 mt-1">{suggestion.details}</p>
                      )}
                    </div>
                  </div>
                  {suggestion.suggested_account && (
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Usar</span>
                    </button>
                  )}
                </div>
                {suggestion.suggested_account && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-800">
                      <span className="font-medium">Cuenta sugerida:</span>
                      <div className="font-mono text-blue-700 mt-1">
                        {suggestion.suggested_account.code} - {suggestion.suggested_account.name}
                      </div>
                      {suggestion.suggested_account.amount && (
                        <div className="text-blue-600 mt-1">
                          ${suggestion.suggested_account.amount.toLocaleString('es-CL')} ({suggestion.suggested_account.type === 'debit' ? 'Débito' : 'Crédito'})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de validación */}
      {errorSuggestions.length === 0 && warningSuggestions.length === 0 && infoSuggestions.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4" />
            <span>✅ Asiento balanceado correctamente con {infoSuggestions.length} optimizaciones disponibles</span>
          </div>
        </div>
      )}
    </div>
  );
}