'use client';

import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { FileText, Plus, Filter, Download } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      <Header 
        title="Transacciones Contables"
        subtitle="Registro de asientos contables, libro diario y control de movimientos"
        showBackButton={true}
        backHref="/accounting"
        variant="premium"
        actions={
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full text-xs font-medium text-purple-800">
              <FileText className="w-3 h-3" />
              <span>Libro Diario</span>
            </div>
            <Button variant="outline" size="sm" disabled className="border-green-200 hover:bg-green-50">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
            <Button variant="primary" size="sm" disabled className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Plus className="w-4 h-4 mr-1" />
              Nueva Transacción
            </Button>
          </div>
        }
      />

      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            <span className="mr-2">📋</span>
            Libro Diario • Asientos Contables • Control de Movimientos
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Transacciones contables
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> profesionales</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Registra, consulta y controla todos los movimientos contables con trazabilidad completa y reportes detallados.
          </p>
        </div>

        {/* Filters Modernizados */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-100 hover:border-purple-200 transition-colors">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <span>Filtros de Búsqueda</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                Próximamente
              </span>
            </CardTitle>
            <CardDescription>
              Filtra transacciones por fecha, cuenta, tipo o monto para análisis detallado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-3">
                  📅 Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-3">
                  📅 Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-3">
                  📋 Tipo de Transacción
                </label>
                <select 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
                  disabled
                >
                  <option>🔍 Todos los tipos</option>
                  <option>🟢 Ingresos</option>
                  <option>🔴 Egresos</option>
                  <option>🔄 Transferencias</option>
                  <option>⚙️ Ajustes</option>
                </select>
              </div>
              <div className="flex items-end space-x-3">
                <Button 
                  variant="primary" 
                  disabled
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
                <Button 
                  variant="outline" 
                  disabled
                  className="border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List Modernizado */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-200 transition-colors">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span>Libro Diario</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                En desarrollo
              </span>
            </CardTitle>
            <CardDescription>
              Registro cronológico completo de todas las transacciones contables con trazabilidad total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Módulo en Desarrollo
              </h3>
              <p className="text-gray-600 mb-6">
                El registro de transacciones contables está siendo implementado.
              </p>
              
              <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-blue-900 mb-3">
                  🚀 Funcionalidades Planeadas
                </h4>
                <div className="text-left space-y-2 text-sm text-blue-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Registro de asientos contables</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Libro diario automatizado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Conciliación bancaria</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Importación desde bancos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Validación automática</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-x-3">
                <Button variant="primary" onClick={() => window.location.href = '/accounting/f29-analysis'}>
                  📄 Análisis F29 (Disponible)
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/accounting'}>
                  Volver a Contabilidad
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}