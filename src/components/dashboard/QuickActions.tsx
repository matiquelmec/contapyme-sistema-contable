'use client'

import { UserCompany } from '@/lib/auth'

interface QuickActionsProps {
  companies: UserCompany[]
  canCreateCompany: boolean
  subscriptionPlan: 'monthly' | 'semestral' | 'annual'
}

export default function QuickActions({ companies, canCreateCompany, subscriptionPlan }: QuickActionsProps) {
  const primaryCompany = companies.find(c => c.is_owner) || companies[0]

  const quickActionItems = [
    {
      title: 'Análisis F29',
      description: 'Analizar nuevo formulario tributario',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: `/accounting/f29-analysis${primaryCompany ? `?company=${primaryCompany.company_id}` : ''}`,
      color: 'blue',
      disabled: !primaryCompany
    },
    {
      title: 'Nuevo Empleado',
      description: 'Agregar empleado a planilla',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      href: `/payroll/employees/create${primaryCompany ? `?company=${primaryCompany.company_id}` : ''}`,
      color: 'green',
      disabled: !primaryCompany
    },
    {
      title: 'Activo Fijo',
      description: 'Registrar nuevo activo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      href: `/accounting/fixed-assets/create${primaryCompany ? `?company=${primaryCompany.company_id}` : ''}`,
      color: 'purple',
      disabled: !primaryCompany
    },
    {
      title: 'Nueva Empresa',
      description: canCreateCompany ? 'Crear empresa adicional' : 'Límite alcanzado',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      href: '/companies/create',
      color: 'gray',
      disabled: !canCreateCompany
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
        <p className="text-sm text-gray-600 mt-1">
          Acceso directo a funciones principales
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActionItems.map((action, index) => (
            <div key={index} className="relative">
              {action.disabled ? (
                <div className={`block p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200 text-gray-400`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-500">{action.title}</h3>
                      <p className="text-sm text-gray-400">{action.description}</p>
                    </div>
                  </div>
                  {action.title === 'Nueva Empresa' && !canCreateCompany && (
                    <div className="mt-3 text-xs text-gray-500">
                      <a href="/settings/billing" className="text-blue-600 hover:text-blue-700 underline">
                        Actualizar plan
                      </a> para crear más empresas
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={action.href}
                  className={`block p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                    action.color === 'blue'
                      ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100'
                      : action.color === 'green'
                      ? 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100'
                      : action.color === 'purple'
                      ? 'border-purple-200 bg-purple-50 hover:border-purple-300 hover:bg-purple-100'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      action.color === 'blue'
                        ? 'bg-blue-500 text-white'
                        : action.color === 'green'
                        ? 'bg-green-500 text-white'
                        : action.color === 'purple'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        action.color === 'blue'
                          ? 'text-blue-900'
                          : action.color === 'green'
                          ? 'text-green-900'
                          : action.color === 'purple'
                          ? 'text-purple-900'
                          : 'text-gray-900'
                      }`}>
                        {action.title}
                      </h3>
                      <p className={`text-sm ${
                        action.color === 'blue'
                          ? 'text-blue-700'
                          : action.color === 'green'
                          ? 'text-green-700'
                          : action.color === 'purple'
                          ? 'text-purple-700'
                          : 'text-gray-700'
                      }`}>
                        {action.description}
                      </p>
                    </div>
                    <div className={`${
                      action.color === 'blue'
                        ? 'text-blue-600'
                        : action.color === 'green'
                        ? 'text-green-600'
                        : action.color === 'purple'
                        ? 'text-purple-600'
                        : 'text-gray-600'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Enlaces adicionales */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Acceso Completo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`/explore${primaryCompany ? `?company=${primaryCompany.company_id}` : ''}`}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Sistema Contable Completo</span>
            </a>
            <a
              href="/companies"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Gestionar Empresas</span>
            </a>
          </div>
        </div>

        {/* Mensaje si no hay empresas */}
        {companies.length === 0 && (
          <div className="mt-6 text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¡Bienvenido a ContaPyme!
            </h3>
            <p className="text-gray-600 mb-4">
              Para comenzar a usar todas las funcionalidades, primero necesitas crear una empresa.
            </p>
            <a
              href="/companies/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear Mi Primera Empresa
            </a>
          </div>
        )}
      </div>
    </div>
  )
}