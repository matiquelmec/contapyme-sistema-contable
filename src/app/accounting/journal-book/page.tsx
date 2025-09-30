'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { AccountSelect } from '@/components/ui/AccountSelect';
import { formatCurrency, formatDate } from '@/lib/utils';

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';
const COMPANY_DEMO = true;

// Interfaces simplificadas
interface JournalEntry {
  id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  reference?: string;
  entry_type: string;
  total_debit: number;
  total_credit: number;
  status: string;
}

interface NewEntryLine {
  account_code: string;
  account_name: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

export default function SimpleJournalBook() {
  // Estados básicos
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editingLines, setEditingLines] = useState<NewEntryLine[]>([]);
  
  // Estados de formulario simple
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [
      { account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' },
      { account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' }
    ] as NewEntryLine[]
  });

  // Cargar asientos - función simple
  const loadEntries = async () => {
    console.log(`🔄 Cargando asientos para company_id: ${COMPANY_ID}...`);
    setLoading(true);
    
    try {
      // Agregar timestamp para evitar caché
      const timestamp = Date.now();
      const response = await fetch(`/api/accounting/journal?company_id=${COMPANY_ID}&limit=50&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.entries) {
        setEntries(data.data.entries);
        console.log('✅ Asientos cargados:', data.data.entries.length);
      } else {
        console.error('❌ Error:', data.error);
        setMessage('Error cargando asientos: ' + (data.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Cargar al inicio
  useEffect(() => {
    loadEntries();
  }, []);

  // Crear asiento - función simple
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Creando asiento...');
    
    // Validación básica
    if (!formData.description.trim()) {
      setMessage('❌ La descripción es requerida');
      return;
    }

    // Filtrar líneas válidas
    const validLines = formData.lines.filter(line => 
      line.account_code && 
      (parseFloat(line.debit_amount || '0') > 0 || parseFloat(line.credit_amount || '0') > 0)
    );

    if (validLines.length < 2) {
      setMessage('❌ Se necesitan al menos 2 líneas válidas');
      return;
    }

    // Validar balance
    const totalDebit = validLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0);
    const totalCredit = validLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setMessage(`❌ Asiento desbalanceado: Debe ${totalDebit} ≠ Haber ${totalCredit}`);
      return;
    }

    try {
      const response = await fetch('/api/accounting/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          company_demo: COMPANY_DEMO,
          entry_date: formData.date,
          description: formData.description,
          reference: formData.reference,
          entry_type: 'manual',
          lines: validLines.map((line, index) => ({
            account_code: line.account_code,
            account_name: line.account_name || line.account_code,
            line_number: index + 1,
            debit_amount: parseFloat(line.debit_amount || '0'),
            credit_amount: parseFloat(line.credit_amount || '0'),
            line_description: line.description || formData.description
          }))
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Asiento creado exitosamente');
        setShowAddModal(false);
        resetForm();
        // Recargar inmediatamente para mostrar el nuevo asiento
        await loadEntries();
      } else {
        setMessage('❌ Error: ' + (data.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Error creando asiento');
    }
  };

  // Abrir modal de edición
  const handleEditEntry = async (entry: JournalEntry) => {
    console.log('📝 Editando asiento:', entry.id);
    setEditingEntry(entry);
    
    // Cargar las líneas del asiento
    try {
      const response = await fetch(`/api/accounting/journal/${entry.id}?include_lines=true`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.lines) {
        // Convertir las líneas para el formulario
        const formattedLines = data.data.lines.map((line: any) => ({
          account_code: line.account_code || '',
          account_name: line.account_name || '',
          debit_amount: line.debit_amount ? line.debit_amount.toString() : '',
          credit_amount: line.credit_amount ? line.credit_amount.toString() : '',
          description: line.description || ''
        }));
        setEditingLines(formattedLines);
        setShowEditModal(true);
      } else {
        setMessage('❌ Error cargando líneas del asiento');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Error cargando asiento');
    }
  };

  // Actualizar asiento
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    
    console.log('💾 Actualizando asiento:', editingEntry.id);
    
    // Validar que las líneas estén balanceadas
    const totalDebit = editingLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0);
    const totalCredit = editingLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setMessage(`❌ El asiento no está balanceado. Débito: ${formatCurrency(totalDebit)}, Crédito: ${formatCurrency(totalCredit)}`);
      return;
    }
    
    try {
      const response = await fetch(`/api/accounting/journal/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          entry_date: editingEntry.entry_date,
          description: editingEntry.description,
          lines: editingLines.filter(line => 
            line.account_code && (line.debit_amount || line.credit_amount)
          ).map(line => ({
            ...line,
            debit_amount: parseFloat(line.debit_amount || '0'),
            credit_amount: parseFloat(line.credit_amount || '0')
          }))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Asiento actualizado exitosamente');
        setShowEditModal(false);
        setEditingEntry(null);
        setEditingLines([]);
        loadEntries(); // Recargar lista
      } else {
        setMessage(`❌ Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Error actualizando asiento');
    }
  };

  // Eliminar asiento - función simple
  const handleDeleteEntry = async (entry: JournalEntry) => {
    if (!confirm(`¿Eliminar asiento #${entry.entry_number}?\n${entry.description}`)) {
      return;
    }

    console.log('🗑️ Eliminando asiento:', entry.id);
    
    try {
      const response = await fetch(`/api/accounting/journal?id=${entry.id}&company_id=${COMPANY_ID}&company_demo=${COMPANY_DEMO}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage('✅ Asiento eliminado exitosamente');
        // Actualizar el estado local inmediatamente
        setEntries(prevEntries => prevEntries.filter(e => e.id !== entry.id));
        // Recargar para asegurar sincronización
        setTimeout(() => loadEntries(), 500);
      } else {
        setMessage('❌ Error eliminando: ' + (data.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Error eliminando asiento');
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      lines: [
        { account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' },
        { account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' }
      ]
    });
  };

  // Agregar línea
  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' }]
    }));
  };

  // Eliminar línea
  const removeLine = (index: number) => {
    if (formData.lines.length > 2) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
  };

  // Actualizar línea
  const updateLine = (index: number, field: keyof NewEntryLine, value: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Libro Diario Simple"
        subtitle="Sistema sincronizado con Integración RCV"
        showBackButton
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
            <button 
              onClick={() => setMessage('')}
              className="float-right text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Nuevo Asiento Simple
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/accounting/journal-book/integration'}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🔄 Integración Módulos
          </Button>
        </div>

        {/* Estadísticas simples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
              <div className="text-sm text-gray-600">Total Asientos</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(entries.reduce((sum, e) => sum + e.total_debit, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Débito</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(entries.reduce((sum, e) => sum + e.total_credit, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Crédito</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de asientos - simple */}
        <Card>
          <CardHeader>
            <CardTitle>Asientos Contables</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Cargando...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay asientos registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Débito</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crédito</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.entry_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.entry_number}
                          {entry.entry_type !== 'manual' && (
                            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              {entry.entry_type === 'rcv' ? '🔄 RCV' :
                               entry.entry_type === 'fixed_asset' ? '🏢 Activo' :
                               entry.entry_type === 'payroll' ? '💼 Payroll' : '⚡ Auto'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {formatCurrency(entry.total_debit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatCurrency(entry.total_credit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          </div>
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

      {/* Modal Nuevo Asiento - Simple */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Nuevo Asiento Simple</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEntry} className="p-6">
              {/* Campos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Líneas del asiento - simple */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Líneas del Asiento</h3>
                  <Button
                    type="button"
                    onClick={addLine}
                    variant="outline"
                    size="sm"
                  >
                    + Agregar Línea
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium">Línea {index + 1}</span>
                        {formData.lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Cuenta Contable *</label>
                          <AccountSelect
                            value={line.account_code}
                            name={line.account_name}
                            onCodeChange={(code) => updateLine(index, 'account_code', code)}
                            onNameChange={(name) => updateLine(index, 'account_name', name)}
                            placeholder="Buscar por código o nombre..."
                            required={true}
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {line.account_name && `✓ ${line.account_name}`}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Débito</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit_amount}
                            onChange={(e) => updateLine(index, 'debit_amount', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Crédito</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit_amount}
                            onChange={(e) => updateLine(index, 'credit_amount', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Detalle</label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            placeholder="Opcional"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Crear Asiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Asiento */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Editar Asiento #{editingEntry.entry_number}</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                    setEditingLines([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateEntry} className="p-6">
              {/* Información del asiento */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha *</label>
                    <input
                      type="date"
                      value={editingEntry.entry_date}
                      onChange={(e) => setEditingEntry({ ...editingEntry, entry_date: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {editingEntry.entry_type === 'manual' ? 'Manual' : editingEntry.entry_type.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{editingEntry.status}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                  <input
                    type="text"
                    value={editingEntry.description}
                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Líneas del asiento */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Líneas del Asiento</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLines([...editingLines, { 
                        account_code: '', 
                        account_name: '', 
                        debit_amount: '', 
                        credit_amount: '', 
                        description: '' 
                      }]);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Agregar Línea
                  </button>
                </div>

                <div className="space-y-4">
                  {editingLines.map((line, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Línea {index + 1}</span>
                        {editingLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLines(editingLines.filter((_, i) => i !== index));
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Cuenta Contable *</label>
                          <AccountSelect
                            value={line.account_code}
                            name={line.account_name}
                            onCodeChange={(code) => {
                              const newLines = [...editingLines];
                              newLines[index].account_code = code;
                              setEditingLines(newLines);
                            }}
                            onNameChange={(name) => {
                              const newLines = [...editingLines];
                              newLines[index].account_name = name;
                              setEditingLines(newLines);
                            }}
                            placeholder="Buscar por código o nombre..."
                            required={true}
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Débito</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit_amount}
                            onChange={(e) => {
                              const newLines = [...editingLines];
                              newLines[index].debit_amount = e.target.value;
                              if (e.target.value && newLines[index].credit_amount) {
                                newLines[index].credit_amount = '';
                              }
                              setEditingLines(newLines);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Crédito</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit_amount}
                            onChange={(e) => {
                              const newLines = [...editingLines];
                              newLines[index].credit_amount = e.target.value;
                              if (e.target.value && newLines[index].debit_amount) {
                                newLines[index].debit_amount = '';
                              }
                              setEditingLines(newLines);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-xs text-gray-600 mb-1">Detalle</label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => {
                              const newLines = [...editingLines];
                              newLines[index].description = e.target.value;
                              setEditingLines(newLines);
                            }}
                            placeholder="Opcional"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales y validación */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Débito:</span>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(editingLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0))}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Crédito:</span>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(editingLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0))}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Diferencia:</span>
                    <p className={`text-lg font-semibold ${
                      Math.abs(
                        editingLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0) -
                        editingLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0)
                      ) > 0.01 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(
                        editingLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0) -
                        editingLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                    setEditingLines([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={Math.abs(
                    editingLines.reduce((sum, line) => sum + parseFloat(line.debit_amount || '0'), 0) -
                    editingLines.reduce((sum, line) => sum + parseFloat(line.credit_amount || '0'), 0)
                  ) > 0.01}
                >
                  Actualizar Asiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}