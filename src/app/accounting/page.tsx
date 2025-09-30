import Link from 'next/link'
import { MinimalHeader } from '@/components/layout/MinimalHeader'

export default function AccountingPage() {
  // Demo mode - no authentication required
  const userProfile = {
    name: 'Usuario Demo',
    email: 'demo@contapyme.com',
    companies: [
      {
        id: 'demo-1',
        name: 'Empresa Demo S.A.',
        rut: '12.345.678-9'
      },
      {
        id: 'demo-2',
        name: 'Mi Pyme Ltda.',
        rut: '98.765.432-1'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MinimalHeader variant="premium" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg shadow-lg mb-8">
            <div className="px-6 py-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Gestión Contable</h2>
              <p className="text-blue-100">
                Administra toda la información financiera de tus empresas desde un solo lugar
              </p>
            </div>
          </div>

          {/* Companies Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Mis Empresas</h3>
              <Link 
                href="/companies/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                + Nueva Empresa
              </Link>
            </div>
            
            {userProfile?.companies && userProfile.companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProfile.companies.map((company: any) => (
                  <div key={company.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 text-lg mb-2">{company.name}</h4>
                    <p className="text-gray-600 mb-4">RUT: {company.rut}</p>
                    <Link 
                      href={`/companies/${company.id}`}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center text-sm font-medium inline-block"
                    >
                      Ver Dashboard Contable
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-4 0H3m2 0h6M7 3h10M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes empresas registradas</h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primera empresa para comenzar a usar el sistema contable
                </p>
                <Link 
                  href="/companies/new"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-block"
                >
                  Crear Primera Empresa
                </Link>
              </div>
            )}
          </div>

          {/* Analysis Tools Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Herramientas de Análisis</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              {/* F29 Analysis */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Análisis F29</h3>
                      <p className="text-blue-100 text-sm">Situación fiscal con IA</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/f29-analysis" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Análisis Individual</span>
                    </Link>
                    <Link href="/accounting/f29-comparative" className="w-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Análisis Comparativo</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* RCV Analysis */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-4 0H3m2 0h6M7 3h10M9 7h6m-6 4h6m-6 4h6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Análisis RCV</h3>
                      <p className="text-cyan-100 text-sm">Proveedores principales</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/rcv-analysis" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Analizar RCV</span>
                    </Link>
                    <Link href="/accounting/rcv-history" className="w-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <span>Ver Historial</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bank Analysis - NUEVO */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-lg overflow-hidden border-2 border-cyan-300">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Cartolas Bancarias</h3>
                      <p className="text-blue-100 text-sm">Análisis de flujo de caja</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/bank-analysis" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Analizar Cartola</span>
                    </Link>
                    <div className="w-full bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-200 text-cyan-800">
                          Nuevo
                        </span>
                        <span className="text-xs opacity-80">PDF + CSV + Excel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Analyzer - REVOLUCIONARIO */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-lg overflow-hidden border-2 border-purple-300">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Analizador de Balances</h3>
                      <p className="text-purple-100 text-sm">Migración y asientos de apertura</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/balance-analyzer" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Analizar Balance</span>
                    </Link>
                    <div className="w-full bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-300 text-purple-900">
                          REVOLUCIONARIO
                        </span>
                        <span className="text-xs opacity-80">PDF → Asiento Apertura</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Assets */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Activos Fijos</h3>
                      <p className="text-blue-100 text-sm">Gestión y depreciación</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/fixed-assets" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>Gestionar Activos</span>
                    </Link>
                    <div className="w-full bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm text-center opacity-60">
                      Dashboard ejecutivo
                    </div>
                  </div>
                </div>
              </div>

              {/* Libro Diario - NUEVO */}
              <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl shadow-lg overflow-hidden border-2 border-cyan-300">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Libro Diario</h3>
                      <p className="text-cyan-100 text-sm">Asientos integrados</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/journal-book" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Ver Libro Diario</span>
                    </Link>
                    <Link href="/accounting/general-ledger" className="w-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Ver Libro Mayor</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-200 text-cyan-800 ml-2">
                        Nuevo
                      </span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Executive Dashboard */}
              <div className="bg-gradient-to-r from-blue-800 to-cyan-600 rounded-2xl shadow-lg overflow-hidden border-2 border-blue-300">
                <div className="px-6 py-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Dashboard Ejecutivo</h3>
                      <p className="text-blue-100 text-sm">Análisis integral IA</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link href="/accounting/executive-dashboard" className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-all text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Insights Ejecutivos</span>
                    </Link>
                    <div className="w-full bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                          Premium
                        </span>
                        <span className="text-xs opacity-80">ROI + Correlaciones</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Sistema Contable Completo - NUEVOS MÓDULOS */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mr-3">
                ✨ Nuevo Sistema Contable
              </span>
              Libros Contables Integrados
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Link href="/accounting/journal-book" className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-white">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Libro Diario</h3>
                <p className="text-blue-100 text-sm mb-3">Registro centralizado de todos los asientos contables</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Automático</span>
                  <span className="text-xs">Debe = Haber</span>
                </div>
              </Link>

              <Link href="/accounting/general-ledger" className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-white border-2 border-indigo-300">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Libro Mayor</h3>
                <p className="text-indigo-100 text-sm mb-3">Movimientos y saldos por cuenta contable</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Por Cuenta</span>
                  <span className="text-xs">Saldos</span>
                </div>
              </Link>

              <Link href="/accounting/purchase-book" className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-white">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Libro de Compras</h3>
                <p className="text-green-100 text-sm mb-3">Gestión de documentos de compra e IVA crédito fiscal</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">IVA 19%</span>
                  <span className="text-xs">Auto-cálculo</span>
                </div>
              </Link>

              <Link href="/accounting/sales-book" className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-white">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Libro de Ventas</h3>
                <p className="text-purple-100 text-sm mb-3">Gestión de documentos de venta e IVA débito fiscal</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">Facturas/Boletas</span>
                  <span className="text-xs">Totales automáticos</span>
                </div>
              </Link>
            </div>

            {/* Característica destacada del sistema */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900">
                    <strong>Sistema Integrado:</strong> Los libros de compra y venta crean automáticamente asientos en el libro diario. 
                    Las remuneraciones también se integran automáticamente. Todo centralizado según normativa chilena.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <Link href="/accounting/configuration" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Configuración</h3>
              <p className="text-sm text-gray-600">Plan de cuentas IFRS y configuraciones</p>
            </Link>

            <Link href="/accounting/indicators" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-blue-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Indicadores Contables</h3>
              <p className="text-sm text-gray-600">UF, UTM, divisas, criptomonedas en tiempo real</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Nuevo
                </span>
              </div>
            </Link>

            <Link href="/accounting/rcv-history" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-emerald-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Historial RCV</h3>
              <p className="text-sm text-gray-600">Base de datos completa con generación automática de entidades</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Automático
                </span>
              </div>
            </Link>

            <Link href="/accounting/transactions" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Transacciones</h3>
              <p className="text-sm text-gray-600">Registro de asientos contables y libro diario</p>
            </Link>

            <Link href="/accounting/balance-8-columns" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-emerald-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Balance 8 Columnas</h3>
              <p className="text-sm text-gray-600">Hoja de trabajo para estados financieros</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Nuevo
                </span>
              </div>
            </Link>

            <Link href="/accounting/reports" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Reportes</h3>
              <p className="text-sm text-gray-600">Balance general, estado de resultados y más</p>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}