'use client';

import React from 'react';
import { Edit2, Trash2, Settings, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui';

interface CentralizedAccountConfig {
  id: string;
  module_name: string;
  transaction_type: string;
  display_name: string;
  tax_account_code: string;
  tax_account_name: string;
  revenue_account_code: string;
  revenue_account_name: string;
  asset_account_code: string;
  asset_account_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CentralizedConfigTableProps {
  configs: CentralizedAccountConfig[];
  onReload: () => void;
}

export default function CentralizedConfigTable({ configs, onReload }: CentralizedConfigTableProps) {
  if (!configs || configs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No hay configuraciones de mapeo</p>
        <p className="text-sm">Configure el mapeo automático para integrar módulos con el plan de cuentas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Módulo</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Cuenta Impuestos</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Cuenta Ingresos</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
            <th className="text-right py-3 px-4 font-medium text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                    <Settings className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900">{config.module_name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                  {config.transaction_type}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-gray-900">{config.display_name}</div>
              </td>
              <td className="py-3 px-4">
                <div className="text-sm">
                  <div className="font-mono text-gray-900">{config.tax_account_code}</div>
                  <div className="text-gray-600 text-xs">{config.tax_account_name}</div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="text-sm">
                  <div className="font-mono text-gray-900">{config.revenue_account_code}</div>
                  <div className="text-gray-600 text-xs">{config.revenue_account_name}</div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  config.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end space-x-2">
                  <button 
                    onClick={() => {
                      // Implementar edición si es necesario
                      console.log('Editar configuración:', config.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar configuración"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      // Implementar eliminación si es necesario
                      if (confirm(`¿Está seguro de eliminar la configuración "${config.display_name}"?`)) {
                        console.log('Eliminar configuración:', config.id);
                        // Aquí iría la lógica de eliminación
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar configuración"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}