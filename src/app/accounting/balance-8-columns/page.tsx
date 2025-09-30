'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { formatCurrency, formatDate } from '@/lib/utils';
import DigitalSignatureModal from '@/components/accounting/DigitalSignatureModal';

interface BalanceAccount {
  account_code: string;
  account_name: string;
  account_type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
  // Balance de Comprobación
  trial_balance_debit: number;
  trial_balance_credit: number;
  // Ajustes
  adjustments_debit: number;
  adjustments_credit: number;
  // Balance Ajustado
  adjusted_balance_debit: number;
  adjusted_balance_credit: number;
  // Estado de Resultados
  income_statement_debit: number;
  income_statement_credit: number;
  // Balance General
  balance_sheet_debit: number;
  balance_sheet_credit: number;
}

interface Balance8ColumnsData {
  accounts: BalanceAccount[];
  totals: {
    trial_balance_debit: number;
    trial_balance_credit: number;
    adjustments_debit: number;
    adjustments_credit: number;
    adjusted_balance_debit: number;
    adjusted_balance_credit: number;
    income_statement_debit: number;
    income_statement_credit: number;
    balance_sheet_debit: number;
    balance_sheet_credit: number;
    net_income: number;
  };
  period: {
    date_from?: string;
    date_to?: string;
  };
}

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

export default function Balance8ColumnsPage() {
  const [balanceData, setBalanceData] = useState<Balance8ColumnsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingPdf, setSigningPdf] = useState(false);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadBalance8Columns();
  }, []);

  const loadBalance8Columns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        company_id: COMPANY_ID,
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to })
      });

      const response = await fetch(`/api/accounting/balance-8-columns?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar balance de 8 columnas');
      }

      if (result.success) {
        setBalanceData(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error cargando balance de 8 columnas:', err);
      setError(err.message || 'Error al cargar balance de 8 columnas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        company_id: COMPANY_ID,
        format: 'excel',
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to })
      });

      const response = await fetch(`/api/accounting/balance-8-columns?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al generar archivo Excel: ${errorText}`);
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        throw new Error(result.error || 'El servidor devolvió JSON en lugar de archivo Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `balance_8_columnas_${filters.date_from || 'inicio'}_${filters.date_to || 'fin'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      setError('Error al exportar a Excel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitalSignature = async (signatureData: any) => {
    setSigningPdf(true);
    try {
      // El modal maneja la firma internamente
      console.log('Firma completada:', signatureData);
    } catch (error) {
      console.error('Error en el proceso de firma:', error);
    } finally {
      setSigningPdf(false);
    }
  };

  const getCurrentPeriod = () => {
    if (filters.date_from && filters.date_to) {
      return `${filters.date_from} al ${filters.date_to}`;
    }
    const currentDate = new Date();
    return currentDate.toISOString().substring(0, 7); // YYYY-MM
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'ACTIVO': return 'bg-green-50 text-green-800';
      case 'PASIVO': return 'bg-red-50 text-red-800';
      case 'PATRIMONIO': return 'bg-blue-50 text-blue-800';
      case 'INGRESO': return 'bg-purple-50 text-purple-800';
      case 'GASTO': return 'bg-orange-50 text-orange-800';
      default: return 'bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header 
        title="Balance de 8 Columnas"
        subtitle="Hoja de trabajo para preparación de estados financieros"
        showBackButton={true}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Período de Análisis</CardTitle>
            <CardDescription>Selecciona el rango de fechas para el balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Desde</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Hasta</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-end gap-2">
                <Button 
                  onClick={loadBalance8Columns}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Generando...' : 'Generar Balance'}
                </Button>
                
                <Button 
                  onClick={handleExportExcel}
                  disabled={loading || !balanceData}
                  variant="outline"
                >
                  📊 Excel
                </Button>
                
                <Button 
                  onClick={() => setShowSignatureModal(true)}
                  disabled={loading || !balanceData || signingPdf}
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {signingPdf ? '🔒 Firmando...' : '🔒 Firmar PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Balance de 8 Columnas */}
        {balanceData && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Balance de 8 Columnas</CardTitle>
              <CardDescription>
                Período: {balanceData.period.date_from || 'Inicio'} - {balanceData.period.date_to || 'Actual'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th rowSpan={2} className="border p-2 text-left min-w-[100px]">Cuenta</th>
                      <th rowSpan={2} className="border p-2 text-left min-w-[200px]">Descripción</th>
                      <th colSpan={2} className="border p-2 text-center text-gray-700">Balance de Comprobación</th>
                      <th colSpan={2} className="border p-2 text-center text-gray-700">Balance Ajustado</th>
                      <th colSpan={2} className="border p-2 text-center text-gray-700">Balance General</th>
                      <th colSpan={2} className="border p-2 text-center text-gray-700">Estado de Resultados</th>
                    </tr>
                    <tr>
                      <th className="border p-2 text-right text-green-600 min-w-[90px]">Debe $</th>
                      <th className="border p-2 text-right text-red-600 min-w-[90px]">Haber $</th>
                      <th className="border p-2 text-right text-blue-600 min-w-[90px]">Saldo Deudor $</th>
                      <th className="border p-2 text-right text-blue-600 min-w-[90px]">Saldo Acreedor $</th>
                      <th className="border p-2 text-right text-green-600 min-w-[90px]">Activo $</th>
                      <th className="border p-2 text-right text-red-600 min-w-[90px]">Pasivo $</th>
                      <th className="border p-2 text-right text-orange-600 min-w-[90px]">Pérdida $</th>
                      <th className="border p-2 text-right text-purple-600 min-w-[90px]">Ganancia $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.accounts.map((account, index) => (
                      <tr key={account.account_code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border p-2 font-mono text-xs">{account.account_code}</td>
                        <td className="border p-2 text-xs">{account.account_name}</td>
                        {/* Debe */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.trial_balance_debit > 0 ? formatCurrency(account.trial_balance_debit) : ''}
                        </td>
                        {/* Haber */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.trial_balance_credit > 0 ? formatCurrency(account.trial_balance_credit) : ''}
                        </td>
                        {/* Saldo Deudor */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.adjusted_balance_debit > 0 ? formatCurrency(account.adjusted_balance_debit) : ''}
                        </td>
                        {/* Saldo Acreedor */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.adjusted_balance_credit > 0 ? formatCurrency(account.adjusted_balance_credit) : ''}
                        </td>
                        {/* Activo */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.balance_sheet_debit > 0 ? formatCurrency(account.balance_sheet_debit) : ''}
                        </td>
                        {/* Pasivo */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.balance_sheet_credit > 0 ? formatCurrency(account.balance_sheet_credit) : ''}
                        </td>
                        {/* Pérdida */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.income_statement_debit > 0 ? formatCurrency(account.income_statement_debit) : ''}
                        </td>
                        {/* Ganancia */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {account.income_statement_credit > 0 ? formatCurrency(account.income_statement_credit) : ''}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fila de totales */}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={2} className="border p-2 text-right">TOTALES:</td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.trial_balance_debit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.trial_balance_credit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.adjusted_balance_debit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.adjusted_balance_credit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.balance_sheet_debit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.balance_sheet_credit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.income_statement_debit)}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        {formatCurrency(balanceData.totals.income_statement_credit)}
                      </td>
                    </tr>
                    

                    {/* Resultado Acumulado - Mostrar utilidad */}
                    {balanceData.totals.net_income !== 0 && (
                      <tr className={`font-bold ${balanceData.totals.net_income > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <td className="border p-2 font-mono text-xs">3.1.1.001</td>
                        <td className="border p-2 text-xs">
                          {balanceData.totals.net_income > 0 ? 'Resultado Acumulado (Utilidad)' : 'Resultado Acumulado (Pérdida)'}
                        </td>
                        {/* Debe */}
                        <td className="border p-2 text-right font-mono text-xs"></td>
                        {/* Haber */}
                        <td className="border p-2 text-right font-mono text-xs"></td>
                        {/* Saldo Deudor - NO VA NADA */}
                        <td className="border p-2 text-right font-mono text-xs"></td>
                        {/* Saldo Acreedor - NO VA NADA */}
                        <td className="border p-2 text-right font-mono text-xs"></td>
                        {/* Activo */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {balanceData.totals.net_income < 0 ? formatCurrency(Math.abs(balanceData.totals.net_income)) : ''}
                        </td>
                        {/* Pasivo - AQUÍ VA EL REMANENTE UTILIDAD */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {balanceData.totals.net_income > 0 ? formatCurrency(balanceData.totals.net_income) : ''}
                        </td>
                        {/* Pérdida - AQUÍ VA LA UTILIDAD */}
                        <td className="border p-2 text-right font-mono text-xs">
                          {balanceData.totals.net_income > 0 ? formatCurrency(balanceData.totals.net_income) : ''}
                        </td>
                        {/* Ganancia */}
                        <td className="border p-2 text-right font-mono text-xs"></td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {balanceData && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Resumen Estado de Resultados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado de Resultados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Ingresos:</span>
                    <span className="font-mono text-green-600">
                      {formatCurrency(balanceData.totals.income_statement_credit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span className="font-mono text-red-600">
                      {formatCurrency(balanceData.totals.income_statement_debit)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>Resultado:</span>
                    <span className={`font-mono ${balanceData.totals.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balanceData.totals.net_income)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen Balance General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Balance General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Activos:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(balanceData.totals.balance_sheet_debit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pasivos + Patrimonio:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(balanceData.totals.balance_sheet_credit)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>Balance:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(balanceData.totals.balance_sheet_debit - balanceData.totals.balance_sheet_credit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info del Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• <strong>Balance de Comprobación:</strong> Saldos desde el Libro Mayor</p>
                  <p>• <strong>Ajustes:</strong> Correcciones del período</p>
                  <p>• <strong>Balance Ajustado:</strong> Saldos finales corregidos</p>
                  <p>• <strong>Estado Resultados:</strong> Ingresos y Gastos</p>
                  <p>• <strong>Balance General:</strong> Activos, Pasivos y Patrimonio</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Firma Digital */}
        <DigitalSignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSign={handleDigitalSignature}
          isLoading={signingPdf}
          balanceData={balanceData}
          period={getCurrentPeriod()}
          companyName="Empresa Demo ContaPyme"
          companyId={COMPANY_ID}
        />
      </div>
    </div>
  );
}