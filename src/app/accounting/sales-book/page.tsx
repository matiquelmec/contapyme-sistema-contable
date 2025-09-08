'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SaleDocument {
  id: string;
  sdid: string;
  date: string;
  folio: string;
  client_name: string;
  client_rut?: string;
  document_type: string;
  net_amount: number;
  iva_amount: number;
  total_amount: number;
  iva_rate: number;
  status: string;
  created_at: string;
}

interface SalesTotals {
  total_net: number;
  total_iva: number;
  total_amount: number;
  document_count: number;
}

interface NewSaleData {
  date: string;
  folio: string;
  client_name: string;
  client_rut: string;
  document_type: string;
  net_amount: number;
  iva_rate: number;
  description: string;
}

export default function SalesBookPage() {
  const [documents, setDocuments] = useState<SaleDocument[]>([]);
  const [totals, setTotals] = useState<SalesTotals>({
    total_net: 0,
    total_iva: 0,
    total_amount: 0,
    document_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocument, setNewDocument] = useState<NewSaleData>({
    date: new Date().toISOString().split('T')[0],
    folio: '',
    client_name: '',
    client_rut: '',
    document_type: 'FACTURA',
    net_amount: 0,
    iva_rate: 19.0,
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar documentos de venta
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPeriod) {
        params.append('period', selectedPeriod);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/accounting/sales-book?${params}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
        setTotals(data.data.totals);
      } else {
        console.error('Error fetching documents:', data.error);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo documento
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/accounting/sales-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDocument),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Documento de venta creado exitosamente');
        setShowAddModal(false);
        setNewDocument({
          date: new Date().toISOString().split('T')[0],
          folio: '',
          client_name: '',
          client_rut: '',
          document_type: 'FACTURA',
          net_amount: 0,
          iva_rate: 19.0,
          description: ''
        });
        await fetchDocuments(); // Recargar la lista
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error al crear documento');
      console.error('Error creating document:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular valores en tiempo real
  const calculateValues = (netAmount: number, ivaRate: number) => {
    const ivaAmount = Math.round(netAmount * (ivaRate / 100));
    const totalAmount = netAmount + ivaAmount;
    return { ivaAmount, totalAmount };
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedPeriod]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Libro de Ventas"
        subtitle="Gestión de documentos de venta y IVA débito fiscal"
        showBackButton={true}
        actions={
          <Button 
            onClick={() => setShowAddModal(true)}
            leftIcon="+"
          >
            Nuevo Documento
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Mensaje de estado */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
                <input
                  type="month"
                  id="period"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPeriod('');
                    fetchDocuments();
                  }}
                >
                  Limpiar Filtros
                </Button>
                <Button onClick={fetchDocuments}>
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{totals.document_count}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Neto</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.total_net)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total IVA</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.total_iva)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Bruto</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.total_amount)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay documentos de venta registrados</p>
                {selectedPeriod && (
                  <p className="text-sm mt-1">para el período {selectedPeriod}</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Fecha</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Folio</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Cliente</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Tipo</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">Neto</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">IVA</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{formatDate(doc.date)}</td>
                        <td className="p-3 text-sm font-medium">{doc.folio}</td>
                        <td className="p-3 text-sm">
                          <div>
                            <p className="font-medium">{doc.client_name}</p>
                            {doc.client_rut && (
                              <p className="text-xs text-gray-500">RUT: {doc.client_rut}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{doc.document_type}</td>
                        <td className="p-3 text-sm text-right">{formatCurrency(doc.net_amount)}</td>
                        <td className="p-3 text-sm text-right">{formatCurrency(doc.iva_amount)}</td>
                        <td className="p-3 text-sm text-right font-medium">{formatCurrency(doc.total_amount)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            doc.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doc.status === 'active' ? 'Activo' : 'Cancelado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para nuevo documento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nuevo Documento de Venta</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={submitting}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={newDocument.date}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folio/Número *
                  </label>
                  <input
                    type="text"
                    value={newDocument.folio}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, folio: e.target.value }))}
                    required
                    placeholder="123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    value={newDocument.client_name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, client_name: e.target.value }))}
                    required
                    placeholder="Nombre del cliente"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT Cliente
                  </label>
                  <input
                    type="text"
                    value={newDocument.client_rut}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, client_rut: e.target.value }))}
                    placeholder="12.345.678-9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={newDocument.document_type}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, document_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FACTURA">Factura</option>
                    <option value="BOLETA">Boleta</option>
                    <option value="NOTA_CREDITO">Nota de Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Neto *
                  </label>
                  <input
                    type="number"
                    value={newDocument.net_amount}
                    onChange={(e) => {
                      const netAmount = parseFloat(e.target.value) || 0;
                      setNewDocument(prev => ({ ...prev, net_amount: netAmount }));
                    }}
                    required
                    min="0"
                    step="1"
                    placeholder="100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa IVA (%)
                  </label>
                  <input
                    type="number"
                    value={newDocument.iva_rate}
                    onChange={(e) => {
                      const ivaRate = parseFloat(e.target.value) || 19;
                      setNewDocument(prev => ({ ...prev, iva_rate: ivaRate }));
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Cálculos en tiempo real */}
                {newDocument.net_amount > 0 && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600 mb-1">Vista previa del cálculo:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Neto:</span>
                        <span>{formatCurrency(newDocument.net_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA ({newDocument.iva_rate}%):</span>
                        <span>{formatCurrency(calculateValues(newDocument.net_amount, newDocument.iva_rate).ivaAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateValues(newDocument.net_amount, newDocument.iva_rate).totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    placeholder="Descripción del documento (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={submitting}
                    loading={submitting}
                    fullWidth
                  >
                    Crear Documento
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}