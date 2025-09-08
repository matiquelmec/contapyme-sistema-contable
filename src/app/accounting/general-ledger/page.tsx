'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GeneralLedgerAccount {
  account_code: string;
  account_name: string;
  movements: Array<{
    date: string;
    entry_number: number;
    description: string;
    entry_type: string;
    reference?: string;
    debit: number;
    credit: number;
    running_balance?: number;
  }>;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface GeneralLedgerData {
  accounts: GeneralLedgerAccount[];
  summary: {
    total_accounts: number;
    total_debit: number;
    total_credit: number;
    period: {
      date_from?: string;
      date_to?: string;
    };
  };
}

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

interface ChartAccount {
  code: string;
  name: string;
  level_type: string;
  account_type: string;
}

export default function GeneralLedgerPage() {
  const [generalLedger, setGeneralLedger] = useState<GeneralLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    account_code: ''
  });
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Cargar libro mayor inicial y plan de cuentas
  useEffect(() => {
    loadGeneralLedger();
    loadChartOfAccounts();
  }, []);

  const loadChartOfAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/chart-of-accounts');
      const result = await response.json();
      
      if (response.ok && result.accounts) {
        setChartAccounts(result.accounts);
      }
    } catch (err) {
      console.error('Error cargando plan de cuentas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadGeneralLedger = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        company_id: COMPANY_ID,
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.account_code && { account_code: filters.account_code })
      });

      const response = await fetch(`/api/accounting/general-ledger?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar libro mayor');
      }

      if (result.success) {
        setGeneralLedger(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error cargando libro mayor:', err);
      setError(err.message || 'Error al cargar libro mayor');
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
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.account_code && { account_code: filters.account_code })
      });

      const response = await fetch(`/api/accounting/general-ledger?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al generar archivo Excel: ${errorText}`);
      }

      // Verificar que la respuesta es un blob
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        throw new Error(result.error || 'El servidor devolvió JSON en lugar de archivo Excel');
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `libro_mayor_${filters.date_from || 'inicio'}_${filters.date_to || 'fin'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Archivo Excel descargado exitosamente');
    } catch (err: any) {
      console.error('Error exportando a Excel:', err);
      setError('Error al exportar a Excel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountExpansion = (accountCode: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedAccounts(newExpanded);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'text-green-600 font-semibold';
    if (balance < 0) return 'text-red-600 font-semibold';
    return 'text-gray-600';
  };

  const formatBalance = (balance: number) => {
    const absBalance = Math.abs(balance);
    if (balance > 0) {
      return `${formatCurrency(absBalance)} (Deudor)`;
    } else if (balance < 0) {
      return `${formatCurrency(absBalance)} (Acreedor)`;
    } else {
      return formatCurrency(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header 
        title="Libro Mayor"
        subtitle="Resumen de movimientos por cuenta contable"
        showBackButton={true}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Personaliza el período y cuenta a mostrar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium mb-2">Cuenta Específica (Opcional)</label>
                <select
                  value={filters.account_code}
                  onChange={(e) => setFilters({...filters, account_code: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loadingAccounts}
                >
                  <option value="">Todas las cuentas</option>
                  {chartAccounts
                    .filter(account => account.level_type === 'Imputable')
                    .map((account) => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                {loadingAccounts && (
                  <p className="text-xs text-gray-500 mt-1">Cargando cuentas...</p>
                )}
              </div>
              
              <div className="flex items-end gap-2">
                <Button 
                  onClick={loadGeneralLedger}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Generando...' : 'Generar'}
                </Button>
                
                <Button 
                  onClick={handleExportExcel}
                  disabled={loading || !generalLedger}
                  variant="outline"
                >
                  📊 Excel
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

        {/* Resumen */}
        {generalLedger && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumen General</CardTitle>
              <CardDescription>
                Período: {generalLedger.summary.period.date_from || 'Inicio'} - {generalLedger.summary.period.date_to || 'Fin'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{generalLedger.summary.total_accounts}</p>
                  <p className="text-sm text-gray-600">Cuentas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(generalLedger.summary.total_debit)}</p>
                  <p className="text-sm text-gray-600">Total Débitos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(generalLedger.summary.total_credit)}</p>
                  <p className="text-sm text-gray-600">Total Créditos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Cuentas */}
        {generalLedger && generalLedger.accounts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalle por Cuenta ({generalLedger.accounts.length} cuentas)</h3>
            
            {generalLedger.accounts.map((account) => {
              const isExpanded = expandedAccounts.has(account.account_code);
              
              return (
                <Card key={account.account_code} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleAccountExpansion(account.account_code)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">
                          {account.account_code} - {account.account_name}
                        </CardTitle>
                        <CardDescription>
                          {account.movements ? account.movements.length : 0} movimientos
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium text-green-600">{formatCurrency(account.total_debit || 0)}</p>
                          <p className="text-xs text-gray-500">Débitos</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-red-600">{formatCurrency(account.total_credit || 0)}</p>
                          <p className="text-xs text-gray-500">Créditos</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-medium ${getBalanceClass(account.balance || 0)}`}>
                            {formatBalance(account.balance || 0)}
                          </p>
                          <p className="text-xs text-gray-500">Saldo</p>
                        </div>
                        <span className="text-gray-400 text-xl">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="border-t bg-gray-50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3">Fecha</th>
                              <th className="text-left py-2 px-3">N° Asiento</th>
                              <th className="text-left py-2 px-3">Descripción</th>
                              <th className="text-left py-2 px-3">Tipo</th>
                              <th className="text-right py-2 px-3">Débito</th>
                              <th className="text-right py-2 px-3">Crédito</th>
                              <th className="text-right py-2 px-3">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(account.movements || []).map((movement, index) => (
                              <tr key={index} className="border-b hover:bg-white">
                                <td className="py-2 px-3">{formatDate(movement.date)}</td>
                                <td className="py-2 px-3">{movement.entry_number}</td>
                                <td className="py-2 px-3">{movement.description}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    movement.entry_type === 'manual' ? 'bg-blue-100 text-blue-800' :
                                    movement.entry_type === 'rcv' ? 'bg-green-100 text-green-800' :
                                    movement.entry_type === 'f29' ? 'bg-purple-100 text-purple-800' :
                                    movement.entry_type === 'automatic' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {movement.entry_type}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-green-600 font-mono">
                                  {movement.debit > 0 ? formatCurrency(movement.debit) : ''}
                                </td>
                                <td className="py-2 px-3 text-right text-red-600 font-mono">
                                  {movement.credit > 0 ? formatCurrency(movement.credit) : ''}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-semibold">
                                  {movement.running_balance ? formatBalance(movement.running_balance) : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {generalLedger && generalLedger.accounts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No se encontraron movimientos para los filtros especificados
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Intenta ajustar las fechas o eliminar el filtro de cuenta
              </p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Generando libro mayor...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}