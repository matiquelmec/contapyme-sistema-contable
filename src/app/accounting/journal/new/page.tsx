'use client';

import React, { useState } from 'react';
import { AccountSelect } from '@/components/ui/AccountSelect';

interface JournalLine {
  line_number: number;
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

export default function NewJournalEntryPage() {
  const [entry, setEntry] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    entry_type: 'manual'
  });

  const [lines, setLines] = useState<JournalLine[]>([
    {
      line_number: 1,
      account_code: '',
      account_name: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0
    },
    {
      line_number: 2,
      account_code: '',
      account_name: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLine = () => {
    const newLine: JournalLine = {
      line_number: lines.length + 1,
      account_code: '',
      account_name: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert('Debe tener al menos 2 líneas');
      return;
    }
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines.map((line, i) => ({ ...line, line_number: i + 1 })));
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const getTotalDebit = () => {
    return lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  };

  const getTotalCredit = () => {
    return lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebit() - getTotalCredit()) < 0.01;
  };

  const saveEntry = async () => {
    if (!entry.description.trim()) {
      setError('La descripción es requerida');
      return;
    }

    if (lines.length < 2) {
      setError('Se requieren al menos 2 líneas');
      return;
    }

    if (!isBalanced()) {
      setError('El asiento debe estar balanceado (débitos = créditos)');
      return;
    }

    // Validar que todas las líneas tengan cuenta
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account_code.trim()) {
        setError(`La línea ${i + 1} debe tener una cuenta seleccionada`);
        return;
      }
      if (lines[i].debit_amount === 0 && lines[i].credit_amount === 0) {
        setError(`La línea ${i + 1} debe tener un monto en débito o crédito`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/accounting/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          company_demo: true,
          ...entry,
          lines: lines
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Asiento creado exitosamente');
        window.location.href = '/accounting/journal';
      } else {
        setError(data.error || 'Error al crear el asiento');
      }
    } catch (err) {
      setError('Error al crear el asiento');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Asiento Contable</h1>
        <button
          onClick={() => window.location.href = '/accounting/journal'}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Volver
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          {/* Header del asiento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={entry.entry_date}
                onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia
              </label>
              <input
                type="text"
                value={entry.reference}
                onChange={(e) => setEntry({ ...entry, reference: e.target.value })}
                placeholder="Ej: FAC-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={entry.entry_type}
                onChange={(e) => setEntry({ ...entry, entry_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="venta">Venta</option>
                <option value="compra">Compra</option>
                <option value="pago">Pago</option>
                <option value="cobro">Cobro</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => setEntry({ ...entry, description: e.target.value })}
              placeholder="Descripción del asiento contable..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Líneas del asiento */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Líneas del Asiento</h3>
              <button
                onClick={addLine}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Agregar Línea
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cuenta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Débito
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Crédito
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4">
                        <AccountSelect
                          value={line.account_code}
                          name={line.account_name}
                          onCodeChange={(code) => updateLine(index, 'account_code', code)}
                          onNameChange={(name) => updateLine(index, 'account_name', name)}
                          required
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="Descripción de la línea"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {lines.length > 2 && (
                          <button
                            onClick={() => removeLine(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-700">
                      Totales:
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      ${getTotalDebit().toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      ${getTotalCredit().toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isBalanced() ? (
                        <span className="text-green-600 text-sm font-medium">✓ Balanceado</span>
                      ) : (
                        <span className="text-red-600 text-sm font-medium">✗ Desbalanceado</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => window.location.href = '/accounting/journal'}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={saveEntry}
              disabled={loading || !isBalanced()}
              className={`px-6 py-2 rounded-lg text-white font-medium ${
                loading || !isBalanced()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Asiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}