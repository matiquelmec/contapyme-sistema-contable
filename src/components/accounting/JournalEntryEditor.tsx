'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import AccountSelector from './AccountSelector';

interface JournalEntry {
  id?: string;
  tempId: string;
  date: string;
  description: string;
  reference: string;
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  type: 'cliente' | 'proveedor' | 'remuneracion' | 'otro';
  originalTransaction?: any;
}

interface JournalEntryEditorProps {
  entries: JournalEntry[];
  onSave: (entries: JournalEntry[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface Account {
  code: string;
  name: string;
  level_type: string;
  account_type: string;
  parent_code?: string;
  is_active: boolean;
}

export default function JournalEntryEditor({ entries, onSave, onCancel, isLoading = false }: JournalEntryEditorProps) {
  const [editableEntries, setEditableEntries] = useState<JournalEntry[]>(entries);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const updateEntry = (tempId: string, field: keyof JournalEntry, value: string | number) => {
    setEditableEntries(prev => prev.map(entry => 
      entry.tempId === tempId 
        ? { ...entry, [field]: value }
        : entry
    ));
  };

  const removeEntry = (tempId: string) => {
    setEditableEntries(prev => prev.filter(entry => entry.tempId !== tempId));
  };

  const toggleExpanded = (tempId: string) => {
    setExpandedEntry(expandedEntry === tempId ? null : tempId);
  };

  // Load accounts from API
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/chart-of-accounts');
      const result = await response.json();
      
      if (result.accounts) {
        setAccounts(result.accounts);
      }
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
    }
  };

  // Update account names when chart of accounts is loaded
  const updateAccountNames = () => {
    if (accounts.length === 0) return;
    
    console.log('🔄 Actualizando nombres de cuentas...');
    console.log('📋 Cuentas disponibles:', accounts.map(acc => `${acc.code} - ${acc.name}`));
    
    setEditableEntries(prev => prev.map(entry => {
      const debitAccountData = accounts.find(acc => acc.code === entry.debitAccount);
      const creditAccountData = accounts.find(acc => acc.code === entry.creditAccount);
      
      console.log(`📝 Asiento ${entry.tempId}:`);
      console.log(`  Debe: ${entry.debitAccount} - Actual: "${entry.debitAccountName}" → Nuevo: "${debitAccountData?.name || entry.debitAccountName}"`);
      console.log(`  Haber: ${entry.creditAccount} - Actual: "${entry.creditAccountName}" → Nuevo: "${creditAccountData?.name || entry.creditAccountName}"`);
      
      return {
        ...entry,
        debitAccountName: debitAccountData?.name || entry.debitAccountName,
        creditAccountName: creditAccountData?.name || entry.creditAccountName
      };
    }));
  };

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Update account names when accounts are loaded
  useEffect(() => {
    updateAccountNames();
  }, [accounts]);

  const validateEntries = () => {
    const errors: string[] = [];
    
    editableEntries.forEach((entry, index) => {
      if (!entry.description.trim()) {
        errors.push(`Asiento ${index + 1}: La descripción es requerida`);
      }
      if (!entry.debitAccount.trim()) {
        errors.push(`Asiento ${index + 1}: La cuenta del debe es requerida`);
      }
      if (!entry.creditAccount.trim()) {
        errors.push(`Asiento ${index + 1}: La cuenta del haber es requerida`);
      }
      if (entry.amount <= 0) {
        errors.push(`Asiento ${index + 1}: El monto debe ser mayor a cero`);
      }
    });

    return errors;
  };

  const handleSave = () => {
    const errors = validateEntries();
    if (errors.length > 0) {
      alert('Errores encontrados:\n\n' + errors.join('\n'));
      return;
    }
    onSave(editableEntries);
  };

  const totalAmount = editableEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold">📊 Editor de Asientos Contables</h2>
              <p className="text-blue-100 mt-1">
                Revisa y edita {editableEntries.length} asientos antes del envío
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Total Movimientos</div>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>💡 <strong>Tip:</strong> Haz clic en un asiento para editarlo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  Debe = Haber ✅
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {editableEntries.map((entry, index) => (
              <Card key={entry.tempId} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {entry.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(entry.date)} • {formatCurrency(entry.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => toggleExpanded(entry.tempId)}
                        className="text-sm px-3 py-1"
                      >
                        {expandedEntry === entry.tempId ? '📕 Contraer' : '📖 Editar'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => removeEntry(entry.tempId)}
                        className="text-sm px-3 py-1"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>

                  {/* Resumen del asiento */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                    <div>
                      <div className="font-medium text-red-600">DEBE</div>
                      <div className="text-gray-800">{entry.debitAccount} - {entry.debitAccountName}</div>
                      <div className="font-bold text-red-700">{formatCurrency(entry.amount)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600">HABER</div>
                      <div className="text-gray-800">{entry.creditAccount} - {entry.creditAccountName}</div>
                      <div className="font-bold text-green-700">{formatCurrency(entry.amount)}</div>
                    </div>
                  </div>

                  {/* Editor expandible */}
                  {expandedEntry === entry.tempId && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Información básica */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha
                            </label>
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(e) => updateEntry(entry.tempId, 'date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descripción
                            </label>
                            <textarea
                              value={entry.description}
                              onChange={(e) => updateEntry(entry.tempId, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Referencia
                            </label>
                            <input
                              type="text"
                              value={entry.reference}
                              onChange={(e) => updateEntry(entry.tempId, 'reference', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Número de documento o referencia"
                            />
                          </div>
                        </div>

                        {/* Cuentas y montos */}
                        <div className="space-y-3">
                          <div className="bg-red-50 p-3 rounded border border-red-200">
                            <label className="block text-sm font-medium text-red-700 mb-2">
                              DEBE - Cuenta Contable
                            </label>
                            <AccountSelector
                              value={entry.debitAccount}
                              onSelect={(code, name) => {
                                updateEntry(entry.tempId, 'debitAccount', code);
                                updateEntry(entry.tempId, 'debitAccountName', name);
                              }}
                              placeholder="Seleccionar cuenta del debe..."
                              className="w-full"
                            />
                          </div>

                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <label className="block text-sm font-medium text-green-700 mb-2">
                              HABER - Cuenta Contable
                            </label>
                            <AccountSelector
                              value={entry.creditAccount}
                              onSelect={(code, name) => {
                                updateEntry(entry.tempId, 'creditAccount', code);
                                updateEntry(entry.tempId, 'creditAccountName', name);
                              }}
                              placeholder="Seleccionar cuenta del haber..."
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monto
                            </label>
                            <input
                              type="number"
                              value={entry.amount}
                              onChange={(e) => updateEntry(entry.tempId, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              step="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>{editableEntries.length}</strong> asientos preparados • 
              Total: <strong>{formatCurrency(totalAmount)}</strong>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="px-6 py-2"
              >
                ❌ Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isLoading || editableEntries.length === 0}
                className="px-6 py-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    💾 Guardar {editableEntries.length} Asientos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}