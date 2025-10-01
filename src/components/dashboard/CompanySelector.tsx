'use client'

import { useState } from 'react'
import { UserCompany } from '@/lib/auth'

interface CompanySelectorProps {
  companies: UserCompany[]
  currentUserId: string
}

export default function CompanySelector({ companies, currentUserId }: CompanySelectorProps) {
  const [selectedCompany, setSelectedCompany] = useState<UserCompany | null>(
    companies.find(c => c.is_owner) || companies[0] || null
  )
  const [isOpen, setIsOpen] = useState(false)

  const handleCompanySelect = (company: UserCompany) => {
    setSelectedCompany(company)
    setIsOpen(false)

    // Guardar selección en localStorage para persistencia
    localStorage.setItem('contapyme_selected_company', company.company_id)

    // Redirigir al sistema contable con la empresa seleccionada
    window.location.href = `/explore?company=${company.company_id}`
  }

  if (!companies.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-yellow-400 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">No tienes empresas</h3>
            <p className="text-sm text-yellow-700 mt-1">
              <a href="/companies/create" className="font-medium underline">
                Crea tu primera empresa
              </a> para comenzar a usar ContaPyme.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white border border-gray-300 rounded-lg px-4 py-2.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 truncate max-w-48">
            {selectedCompany?.company_name || 'Seleccionar empresa'}
          </div>
          <div className="text-xs text-gray-500">
            {selectedCompany ? `RUT: ${selectedCompany.company_rut}` : 'Ninguna empresa seleccionada'}
          </div>
        </div>
        <div className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Seleccionar Empresa</h3>
            <p className="text-xs text-gray-500 mt-1">
              Elige la empresa con la que deseas trabajar
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company.company_id}
                onClick={() => handleCompanySelect(company)}
                className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  selectedCompany?.company_id === company.company_id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {company.company_name}
                      </h4>
                      {selectedCompany?.company_id === company.company_id && (
                        <div className="text-blue-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      RUT: {company.company_rut}
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        company.user_role === 'owner'
                          ? 'bg-blue-100 text-blue-800'
                          : company.user_role === 'admin'
                          ? 'bg-green-100 text-green-800'
                          : company.user_role === 'accountant'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.user_role === 'owner' ? 'Propietario' :
                         company.user_role === 'admin' ? 'Administrador' :
                         company.user_role === 'accountant' ? 'Contador' : 'Visualizador'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {companies.length} {companies.length === 1 ? 'empresa' : 'empresas'} disponibles
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para cerrar el dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}