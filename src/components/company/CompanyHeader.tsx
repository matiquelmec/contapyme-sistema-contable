'use client';

import { useCompanyData } from '@/contexts/CompanyContext';

interface CompanyHeaderProps {
  showFullInfo?: boolean;
  className?: string;
}

export default function CompanyHeader({ 
  showFullInfo = true, 
  className = "" 
}: CompanyHeaderProps) {
  const {
    razonSocial,
    nombreFantasia,
    rut,
    giro,
    direccion,
    telefono,
    email,
    planTipo,
    isDemoMode,
    getDisplayName,
    isActive
  } = useCompanyData();

  if (!isActive) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-red-800 font-medium">Empresa Inactiva</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header con logo y nombre */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          {/* Logo placeholder - en futuro se puede agregar logo real */}
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">
              {getDisplayName().charAt(0)}
            </span>
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {getDisplayName()}
            </h1>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>RUT: {rut}</span>
              {isDemoMode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Modo Demo
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {planTipo}
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-600 text-sm font-medium">Activo</span>
        </div>
      </div>

      {/* Información detallada (opcional) */}
      {showFullInfo && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Razón Social:</span>
              <p className="font-medium text-gray-900">{razonSocial}</p>
            </div>
            <div>
              <span className="text-gray-600">Giro:</span>
              <p className="font-medium text-gray-900">{giro}</p>
            </div>
            <div>
              <span className="text-gray-600">Dirección:</span>
              <p className="font-medium text-gray-900">{direccion}</p>
            </div>
            <div>
              <span className="text-gray-600">Contacto:</span>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{telefono}</p>
                <p className="font-medium text-blue-600 hover:underline">
                  <a href={`mailto:${email}`}>{email}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-blue-500 mt-0.5">
              💡
            </div>
            <div className="text-blue-800 text-sm">
              <p className="font-medium mb-1">Modo Demostración Activo</p>
              <p>
                Estás explorando ContaPyme con datos de ejemplo. 
                Todas las funcionalidades están disponibles para que pruebes el sistema.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente compacto para navegación
export function CompanyHeaderCompact({ className = "" }: { className?: string }) {
  const { getDisplayName, rut, isDemoMode, planTipo } = useCompanyData();

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <span className="text-blue-600 font-bold text-sm">
          {getDisplayName().charAt(0)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {getDisplayName()}
        </p>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{rut}</span>
          {isDemoMode && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
              Demo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}