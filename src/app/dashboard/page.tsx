'use client';

import Link from 'next/link';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { CompanyHeader } from '@/components/company';
import { MinimalHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

export default function DashboardPage() {
  return (
    <CompanyProvider demoMode={true}>
      <div className="min-h-screen bg-gray-50">
        <MinimalHeader variant="premium" />

        <main className="max-w-7xl mx-auto py-8 px-4">
          {/* Page Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
              <div className="px-6 py-8 text-white">
                <h1 className="text-3xl font-bold mb-2">Dashboard Empresarial</h1>
                <p className="text-indigo-100">Centro de comando de tu empresa</p>
              </div>
            </div>
          </div>
          {/* Company Information */}
          <div className="mb-8">
            <CompanyHeader showFullInfo={false} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">F29 Analizados</p>
                    <p className="text-2xl font-bold text-blue-600">12</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Empleados</p>
                    <p className="text-2xl font-bold text-green-600">8</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Activos Fijos</p>
                    <p className="text-2xl font-bold text-purple-600">24</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estado Sistema</p>
                    <p className="text-2xl font-bold text-green-600">100%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Contabilidad Module */}
            <Card className="border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Módulo de Contabilidad</CardTitle>
                    <CardDescription className="text-base">
                      Gestión fiscal completa con análisis F29 automático
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/accounting/f29-analysis">
                      <Button variant="primary" className="w-full justify-start">
                        <span className="mr-2">📄</span>
                        Análisis F29
                      </Button>
                    </Link>
                    <Link href="/accounting/f29-comparative">
                      <Button variant="success" className="w-full justify-start">
                        <span className="mr-2">📊</span>
                        Comparativo
                      </Button>
                    </Link>
                    <Link href="/accounting/indicators">
                      <Button variant="outline" className="w-full justify-start">
                        <span className="mr-2">💰</span>
                        Indicadores
                      </Button>
                    </Link>
                    <Link href="/accounting/fixed-assets">
                      <Button variant="outline" className="w-full justify-start">
                        <span className="mr-2">🏢</span>
                        Activos Fijos
                      </Button>
                    </Link>
                  </div>
                  <Link href="/accounting">
                    <Button variant="outline" className="w-full">
                      Ver Módulo Completo →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Remuneraciones Module */}
            <Card className="border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Módulo de Remuneraciones</CardTitle>
                    <CardDescription className="text-base">
                      Gestión completa de nómina y recursos humanos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/payroll/employees">
                      <Button variant="primary" className="w-full justify-start">
                        <span className="mr-2">👥</span>
                        Empleados
                      </Button>
                    </Link>
                    <Link href="/payroll/calculations">
                      <Button variant="outline" className="w-full justify-start">
                        <span className="mr-2">🧮</span>
                        Cálculos
                      </Button>
                    </Link>
                    <Link href="/payroll/reports">
                      <Button variant="outline" className="w-full justify-start">
                        <span className="mr-2">📋</span>
                        Reportes
                      </Button>
                    </Link>
                    <Link href="/payroll/settings">
                      <Button variant="outline" className="w-full justify-start">
                        <span className="mr-2">⚙️</span>
                        Settings
                      </Button>
                    </Link>
                  </div>
                  <Link href="/payroll">
                    <Button variant="outline" className="w-full">
                      Ver Módulo Completo →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas acciones realizadas en tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">F29</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Análisis F29 procesado</p>
                    <p className="text-sm text-gray-600">Formulario período 202407 analizado exitosamente</p>
                  </div>
                  <span className="text-sm text-gray-500">Hace 2 horas</span>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Indicadores actualizados</p>
                    <p className="text-sm text-gray-600">UF, UTM y divisas sincronizadas automáticamente</p>
                  </div>
                  <span className="text-sm text-gray-500">Hace 1 día</span>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">🏢</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Activo fijo agregado</p>
                    <p className="text-sm text-gray-600">Computador Dell OptiPlex registrado en inventario</p>
                  </div>
                  <span className="text-sm text-gray-500">Hace 3 días</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </CompanyProvider>
  );
}