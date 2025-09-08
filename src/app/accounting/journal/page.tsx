'use client';

import React, { useState, useEffect } from 'react';

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
  lines?: JournalLine[];
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

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal?company_id=${COMPANY_ID}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.data.entries || []);
      } else {
        setError(data.error || 'Error loading journal entries');
      }
    } catch (err) {
      setError('Error loading journal entries');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este asiento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/accounting/journal?id=${entryId}&company_id=${COMPANY_ID}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEntries(entries.filter(entry => entry.id !== entryId));
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
        <div className="text-center">Cargando asientos contables...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Error: {error}</div>
        <button 
          onClick={loadEntries}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Libro Diario</h1>
        <button
          onClick={() => window.location.href = '/accounting/journal/new'}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Nuevo Asiento
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No hay asientos contables registrados</div>
          <button
            onClick={() => window.location.href = '/accounting/journal/new'}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Crear Primer Asiento
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Débito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crédito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.entry_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.entry_date).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {entry.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.reference || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      ${entry.total_debit.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      ${entry.total_credit.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.status === 'approved' ? 'Aprobado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => window.location.href = `/accounting/journal/${entry.id}`}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 text-xs bg-blue-50 rounded"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => window.location.href = `/accounting/journal/${entry.id}/edit`}
                          className="text-green-600 hover:text-green-900 px-2 py-1 text-xs bg-green-50 rounded"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 text-xs bg-red-50 rounded"
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
        </div>
      )}
    </div>
  );
}