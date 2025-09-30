'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import JournalEntryEditor from '@/components/accounting/JournalEntryEditor';

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
  rut?: string;
  destinationMessage?: string;
  suggestedEntry?: JournalEntrySuggestion;
  entityInfo?: { type?: string; name?: string; accountCode?: string } | null;
}

interface JournalEntrySuggestion {
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  description: string;
  type: 'cliente' | 'proveedor' | 'remuneracion' | 'otro';
}

interface BankAnalysis {
  period: string;
  bank: string;
  account: string;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  transactionCount: number;
  transactions: BankTransaction[];
  insights: string[];
  confidence?: number;
}

export default function BankAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BankAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingEntries, setIsCreatingEntries] = useState(false);
  const [creationResult, setCreationResult] = useState<any>(null);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', '8033ee69-b420-4d91-ba0e-482f46cd6fce'); // TODO: Get from context/auth

      console.log('📄 Uploading bank statement:', file.name);

      const response = await fetch('/api/accounting/bank-analysis', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
        console.log('✅ Bank analysis completed:', result.data);
      } else {
        setError(result.error || 'Error analyzing bank statement');
        console.error('❌ Bank analysis error:', result.error);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setError('Error uploading file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCreateJournalEntries = () => {
    if (!analysis || !analysis.transactions) {
      alert('No hay transacciones para procesar');
      return;
    }

    // Filter transactions that have suggested entries
    const transactionsWithSuggestions = analysis.transactions.filter(t => t.suggestedEntry);
    
    if (transactionsWithSuggestions.length === 0) {
      alert('No hay transacciones con sugerencias contables para procesar');
      return;
    }

    // Convert transactions to journal entries format for the editor
    const entries = transactionsWithSuggestions.map((transaction, index) => ({
      tempId: `transaction_${index}`,
      date: transaction.date,
      description: transaction.suggestedEntry.description,
      reference: transaction.reference || '',
      debitAccount: transaction.suggestedEntry.debitAccount,
      debitAccountName: transaction.suggestedEntry.debitAccountName,
      creditAccount: transaction.suggestedEntry.creditAccount,
      creditAccountName: transaction.suggestedEntry.creditAccountName,
      amount: transaction.suggestedEntry.amount,
      type: transaction.suggestedEntry.type,
      originalTransaction: transaction
    }));

    setJournalEntries(entries);
    setShowJournalEditor(true);
  };

  const handleJournalEntrySave = async (entries: any[]) => {
    setIsCreatingEntries(true);
    setShowJournalEditor(false);

    try {
      console.log('📊 Creating journal entries from edited data...');

      const response = await fetch('/api/accounting/bank-to-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: entries.map(entry => ({
            ...entry.originalTransaction,
            suggestedEntry: {
              debitAccount: entry.debitAccount,
              debitAccountName: entry.debitAccountName,
              creditAccount: entry.creditAccount,
              creditAccountName: entry.creditAccountName,
              amount: entry.amount,
              description: entry.description,
              type: entry.type
            }
          })),
          companyId: '8033ee69-b420-4d91-ba0e-482f46cd6fce' // TODO: Get from context/auth
        })
      });

      const result = await response.json();

      if (result.success) {
        setCreationResult(result.data);
        alert(
          `✅ ${result.message}\n\n` +
          `Asientos creados: ${result.data.created}\n` +
          (result.data.failed > 0 ? `Errores: ${result.data.failed}` : '')
        );
        console.log('✅ Journal entries created:', result.data);
      } else {
        throw new Error(result.error || 'Error creating journal entries');
      }

    } catch (error) {
      console.error('❌ Error creating journal entries:', error);
      alert('Error al crear los asientos contables. Por favor intenta nuevamente.');
    } finally {
      setIsCreatingEntries(false);
    }
  };

  const handleJournalEntryCancel = () => {
    setShowJournalEditor(false);
    setJournalEntries([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
      <Header 
        title="Análisis de Cartolas Bancarias"
        subtitle="Herramienta para analizar y categorizar movimientos bancarios"
        showBackButton={true}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏦 Subir Cartola Bancaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-cyan-300 rounded-xl p-8 text-center bg-cyan-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="text-4xl">📄</div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      Selecciona tu cartola bancaria
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Soportamos PDF, CSV, Excel y archivos de texto de los principales bancos chilenos
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                      variant="primary"
                      className="px-6 py-3"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analizando...
                        </>
                      ) : (
                        'Seleccionar Archivo'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  ✅ <span>Banco de Chile, BCI, Santander</span>
                </div>
                <div className="flex items-center gap-2">
                  ✅ <span>Estado, Falabella, Scotiabank</span>
                </div>
                <div className="flex items-center gap-2">
                  ✅ <span>Formatos PDF, CSV, Excel</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50/70 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <span className="text-xl">❌</span>
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journal Creation Result */}
        {creationResult && (
          <Card className="mb-8 border-green-200 bg-green-50/70 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">Asientos Contables Creados Exitosamente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-green-100 p-3 rounded">
                    <div className="font-medium text-green-800">Asientos Creados</div>
                    <div className="text-2xl font-bold text-green-900">{creationResult.created}</div>
                  </div>
                  <div className="bg-orange-100 p-3 rounded">
                    <div className="font-medium text-orange-800">Errores</div>
                    <div className="text-2xl font-bold text-orange-900">{creationResult.failed}</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded">
                    <div className="font-medium text-blue-800">Total Procesado</div>
                    <div className="text-2xl font-bold text-blue-900">{creationResult.created + creationResult.failed}</div>
                  </div>
                </div>
                {creationResult.entries && creationResult.entries.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium text-green-800 mb-2">Asientos Creados:</div>
                    <div className="space-y-2 text-sm">
                      {creationResult.entries.map((entry: any, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <div className="font-medium">{entry.description}</div>
                          <div className="text-gray-600">
                            {entry.date} - {new Intl.NumberFormat('es-CL', {
                              style: 'currency',
                              currency: 'CLP',
                              minimumFractionDigits: 0
                            }).format(entry.amount)} - {entry.type}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-green-700">
                      💡 Los asientos fueron creados en estado "Borrador". 
                      Puedes revisarlos y aprobarlos en el <a href="/accounting/journal-book" className="underline font-medium">Libro Diario</a>.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-cyan-50/70 border-cyan-200 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-cyan-800">Total Ingresos</p>
                      <p className="text-2xl font-bold text-cyan-900">{formatCurrency(analysis.totalCredits)}</p>
                    </div>
                    <div className="text-2xl">💰</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50/70 border-blue-200 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total Egresos</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(analysis.totalDebits)}</p>
                    </div>
                    <div className="text-2xl">💸</div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${analysis.netFlow >= 0 ? 'bg-cyan-50/70 border-cyan-200' : 'bg-blue-50/70 border-blue-200'} backdrop-blur-sm`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${analysis.netFlow >= 0 ? 'text-cyan-800' : 'text-blue-800'}`}>Flujo Neto</p>
                      <p className={`text-2xl font-bold ${analysis.netFlow >= 0 ? 'text-cyan-900' : 'text-blue-900'}`}>{formatCurrency(analysis.netFlow)}</p>
                    </div>
                    <div className="text-2xl">{analysis.netFlow >= 0 ? '📈' : '📉'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50/70 border-blue-200 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Transacciones</p>
                      <p className="text-2xl font-bold text-blue-900">{analysis.transactionCount}</p>
                    </div>
                    <div className="text-2xl">📊</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bank Info */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>📋 Información de la Cartola</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Banco:</span>
                    <span className="ml-2 text-gray-900">{analysis.bank}</span>
                    {analysis.bank === 'Banco no identificado' && (
                      <div className="text-xs text-gray-400 mt-1">
                        No se pudo detectar automáticamente el banco desde el archivo
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cuenta:</span>
                    <span className="ml-2 text-gray-900">{analysis.account}</span>
                    {analysis.account === 'Cuenta no identificada' && (
                      <div className="text-xs text-gray-400 mt-1">
                        Número de cuenta no encontrado en el archivo
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Período:</span>
                    <span className="ml-2 text-gray-900">{analysis.period}</span>
                    {analysis.period === 'Período no determinado' && (
                      <div className="text-xs text-gray-400 mt-1">
                        No se pudieron detectar fechas válidas
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Show parsing confidence and additional info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      Confianza del parser: <span className="font-medium">{analysis.confidence || 'N/A'}%</span>
                    </div>
                    <div>
                      {analysis.transactionCount} transacciones procesadas
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            {analysis.insights.length > 0 && (
              <Card className="bg-cyan-50/70 border-cyan-200 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💡 Insights Automáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-cyan-800">
                        <span className="text-cyan-600 mt-1">•</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transactions Table with Accounting Suggestions */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  📈 Detalle de Transacciones con Sugerencias Contables
                  <Button 
                    variant="primary" 
                    className="px-4 py-2"
                    onClick={handleCreateJournalEntries}
                    disabled={isCreatingEntries}
                  >
                    {isCreatingEntries ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creando...
                      </>
                    ) : (
                      '📊 Generar Asientos Contables'
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-medium text-gray-700">Fecha</th>
                        <th className="text-left py-3 font-medium text-gray-700">Descripción</th>
                        <th className="text-right py-3 font-medium text-gray-700">Monto</th>
                        <th className="text-center py-3 font-medium text-gray-700">Tipo</th>
                        <th className="text-left py-3 font-medium text-gray-700">RUT</th>
                        <th className="text-left py-3 font-medium text-gray-700">Asiento Sugerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.transactions.map((transaction, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 text-gray-600">{formatDate(transaction.date)}</td>
                          <td className="py-3 text-gray-800 max-w-xs">
                            <div className="truncate" title={transaction.description}>
                              {transaction.description.length > 50 
                                ? `${transaction.description.substring(0, 50)}...` 
                                : transaction.description}
                            </div>
                            {/* Show destination message in small gray text */}
                            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                              {transaction.destinationMessage && transaction.destinationMessage.trim() !== '' && (
                                <div className="italic">
                                  📝 {transaction.destinationMessage}
                                </div>
                              )}
                              {transaction.reference && (
                                <div>Ref: {transaction.reference}</div>
                              )}
                              {transaction.balance && (
                                <div>Saldo: {formatCurrency(transaction.balance)}</div>
                              )}
                            </div>
                          </td>
                          <td className={`py-3 text-right font-medium ${transaction.type === 'credit' ? 'text-cyan-600' : 'text-blue-600'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {transaction.type === 'credit' ? '💰 Ingreso' : '💸 Egreso'}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-gray-600">
                            {transaction.rut ? (
                              <div className="space-y-1">
                                <span className={`px-2 py-1 rounded ${transaction.entityInfo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {transaction.rut}
                                </span>
                                {transaction.entityInfo && (
                                  <div className="text-xs space-y-0.5">
                                    <div className="font-medium text-green-700">
                                      ✅ {transaction.entityInfo.name}
                                    </div>
                                    <div className="text-green-600">
                                      {transaction.entityInfo.type === 'supplier' ? '🏢 Proveedor' : 
                                       transaction.entityInfo.type === 'customer' ? '👤 Cliente' : 
                                       transaction.entityInfo.type === 'both' ? '🔄 Cliente/Proveedor' : 
                                       transaction.entityInfo.type}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">No detectado</span>
                            )}
                          </td>
                          <td className="py-3 text-xs">
                            {transaction.suggestedEntry ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    transaction.suggestedEntry.type === 'cliente' ? 'bg-green-100 text-green-800' :
                                    transaction.suggestedEntry.type === 'proveedor' ? 'bg-orange-100 text-orange-800' :
                                    transaction.suggestedEntry.type === 'remuneracion' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transaction.suggestedEntry.type === 'cliente' ? '👤 Cliente' :
                                     transaction.suggestedEntry.type === 'proveedor' ? '🏢 Proveedor' :
                                     transaction.suggestedEntry.type === 'remuneracion' ? '💰 Remuneración' :
                                     '📝 Otro'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <strong>Debe:</strong> {transaction.suggestedEntry.debitAccount} - {transaction.suggestedEntry.debitAccountName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  <strong>Haber:</strong> {transaction.suggestedEntry.creditAccount} - {transaction.suggestedEntry.creditAccountName}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Sin sugerencia</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {analysis.transactions.length === 0 && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                      No hay transacciones para mostrar
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="success" className="px-6 py-3">
                📊 Generar Asientos Contables
              </Button>
              <Button variant="outline" className="px-6 py-3">
                📄 Exportar Análisis
              </Button>
              <Button variant="outline" className="px-6 py-3">
                🔄 Procesar Nueva Cartola
              </Button>
            </div>
          </div>
        )}

        {/* Information Card */}
        {!analysis && !isAnalyzing && (
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ℹ️ Información de la Herramienta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 Qué hace esta herramienta:</h4>
                  <ul className="space-y-1">
                    <li>• Analiza automáticamente cartolas bancarias</li>
                    <li>• Categoriza ingresos y egresos</li>
                    <li>• Genera insights de flujo de caja</li>
                    <li>• Prepara datos para asientos contables</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🏦 Bancos compatibles:</h4>
                  <ul className="space-y-1">
                    <li>• Banco de Chile</li>
                    <li>• Banco BCI</li>
                    <li>• Banco Santander</li>
                    <li>• Banco Estado</li>
                    <li>• Y más bancos chilenos...</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journal Entry Editor Modal */}
        {showJournalEditor && (
          <JournalEntryEditor
            entries={journalEntries}
            onSave={handleJournalEntrySave}
            onCancel={handleJournalEntryCancel}
            isLoading={isCreatingEntries}
          />
        )}
      </div>
    </div>
  );
}