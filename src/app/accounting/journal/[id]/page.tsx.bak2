'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
  created_by: string;
  created_at: string;
  updated_at: string;
  lines: JournalLine[];
}

interface JournalLine {
  id: string;
  entry_id: string;
  line_number: number;
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

export default function JournalEntryDetailPage() {
  const params = useParams();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadEntry(params.id as string);
    }
  }, [params.id]);

  const loadEntry = async (entryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal/${entryId}?include_lines=true`);
      const data = await response.json();
      
      if (data.success) {
        setEntry(data.data);
      } else {
        setError(data.error || 'Error loading journal entry');
      }
    } catch (err) {
      setError('Error loading journal entry');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async () => {
    if (!entry || !confirm('¿Estás seguro de que quieres eliminar este asiento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/accounting/journal/${entry.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Asiento eliminado exitosamente');
        window.location.href = '/accounting/journal';
      } else {
        alert('Error al eliminar el asiento: ' + data.error);
      }
    } catch (err) {
      alert('Error al eliminar el asiento');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando asiento contable...</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error: {error || 'Asiento no encontrado'}
        </div>
        <div className="text-center mt-4">
          <button 
            onClick={() => window.location.href = '/accounting/journal'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Volver al Libro Diario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Asiento #{entry.entry_number}
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date(entry.entry_date).toLocaleDateString('es-CL')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/accounting/journal'}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Volver
          </button>
          <button
            onClick={() => window.location.href = `/accounting/journal/${entry.id}/edit`}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Editar
          </button>
          <button
            onClick={deleteEntry}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header del asiento */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Número</label>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                #{entry.entry_number}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Fecha</label>
              <div className="mt-1 text-lg text-gray-900">
                {new Date(entry.entry_date).toLocaleDateString('es-CL')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Tipo</label>
              <div className="mt-1 text-lg text-gray-900 capitalize">
                {entry.entry_type}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Estado</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                  entry.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {entry.status === 'approved' ? 'Aprobado' : 'Borrador'}
                </span>
              </div>
            </div>
          </div>

          {entry.reference && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-500">Referencia</label>
              <div className="mt-1 text-lg text-gray-900">{entry.reference}</div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-500">Descripción</label>
            <div className="mt-1 text-lg text-gray-900">{entry.description}</div>
          </div>
        </div>

        {/* Líneas del asiento */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detalle del Asiento</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Débito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crédito
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entry.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {line.line_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {line.account_code}
                      </div>
                      <div className="text-sm text-gray-500">
                        {line.account_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {line.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {line.debit_amount > 0 ? `$${line.debit_amount.toLocaleString('es-CL')}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {line.credit_amount > 0 ? `$${line.credit_amount.toLocaleString('es-CL')}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right font-medium text-gray-700">
                    Totales:
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">
                    ${entry.total_debit.toLocaleString('es-CL')}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">
                    ${entry.total_credit.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer con información de auditoría */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Creado por:</strong> {entry.created_by}
            </div>
            <div>
              <strong>Fecha de creación:</strong> {new Date(entry.created_at).toLocaleString('es-CL')}
            </div>
            {entry.updated_at !== entry.created_at && (
              <div className="md:col-span-2">
                <strong>Última modificación:</strong> {new Date(entry.updated_at).toLocaleString('es-CL')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}