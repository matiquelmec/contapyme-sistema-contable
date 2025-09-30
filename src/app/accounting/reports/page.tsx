'use client';

import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { BarChart3, FileText, Download, Calendar, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Reportes"
        subtitle="Balance general, estado de resultados y más"
        showBackButton={true}
        backHref="/accounting"
        actions={
          <Button variant="primary" size="sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            Exportar Todo
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Report Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Período de Análisis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="primary" 
                  fullWidth 
                  disabled
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generar Reportes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Reports Modernizados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Balance General Modernizado */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span>Balance General</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  Próximamente
                </span>
              </CardTitle>
              <CardDescription>
                Estado de situación financiera completo de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Incluye:
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                      <span>Activos Corrientes y No Corrientes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                      <span>Pasivos y Patrimonio</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                      <span>Ecuación Contable</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  fullWidth 
                  disabled
                  className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Balance
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estado de Resultados Modernizado */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-green-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span>Estado de Resultados</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Próximamente
                </span>
              </CardTitle>
              <CardDescription>
                Análisis completo de ingresos, gastos y rentabilidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Incluye:
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                      <span>Ingresos Operacionales</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                      <span>Gastos de Operación</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                      <span>Resultado Neto</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  fullWidth 
                  disabled
                  className="border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Estado
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Flujo de Caja Modernizado */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-purple-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span>Flujo de Caja</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  Próximamente
                </span>
              </CardTitle>
              <CardDescription>
                Análisis detallado de movimientos de efectivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Incluye:
                  </h4>
                  <div className="text-sm text-purple-800 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-purple-600 rounded-full"></span>
                      <span>Flujo Operacional</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-purple-600 rounded-full"></span>
                      <span>Flujo de Inversión</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1 h-1 bg-purple-600 rounded-full"></span>
                      <span>Flujo de Financiamiento</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  fullWidth 
                  disabled
                  className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Flujo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* F29 Analysis Available Modernizada */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-orange-200 hover:border-orange-300 transition-colors">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span>Análisis F29 - Disponible Ahora</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                ✅ Funcional
              </span>
            </CardTitle>
            <CardDescription>
              Mientras desarrollamos los reportes tradicionales, aprovecha nuestro sistema de análisis F29 único en Chile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Análisis Individual
                </h4>
                <p className="text-sm text-blue-800 mb-4">
                  Sube un formulario F29 y obtén análisis detallado instantáneo con 95% de confiabilidad
                </p>
                <Button 
                  variant="primary" 
                  fullWidth
                  onClick={() => window.location.href = '/accounting/f29-analysis'}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  📄 Análisis Individual
                </Button>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Análisis Comparativo
                </h4>
                <p className="text-sm text-purple-800 mb-4">
                  Sube múltiples F29 y obtén tendencias, proyecciones e insights automáticos únicos en Chile
                </p>
                <Button 
                  variant="outline" 
                  fullWidth
                  onClick={() => window.location.href = '/accounting/f29-comparative'}
                  className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                >
                  📊 Análisis Comparativo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Status Modernizado */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-yellow-200 hover:border-yellow-300 transition-colors">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span>Estado de Desarrollo</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                En progreso
              </span>
            </CardTitle>
            <CardDescription>
              Roadmap de desarrollo de reportes financieros tradicionales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-yellow-900 mb-3">
                🚧 Reportes Tradicionales en Desarrollo
              </h4>
              <p className="text-yellow-800 mb-4">
                Los reportes contables tradicionales están siendo implementados. El sistema de análisis F29 está completamente funcional.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-yellow-900 mb-2">Próximas Implementaciones:</h5>
                  <div className="space-y-1 text-sm text-yellow-800">
                    <div>• Balance General automatizado</div>
                    <div>• Estado de Resultados</div>
                    <div>• Flujo de Caja proyectado</div>
                    <div>• Análisis de ratios financieros</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-yellow-900 mb-2">Disponible Ahora:</h5>
                  <div className="space-y-1 text-sm text-yellow-800">
                    <div>✅ Análisis F29 individual</div>
                    <div>✅ Análisis F29 comparativo</div>
                    <div>✅ Cálculos tributarios automáticos</div>
                    <div>✅ Insights y proyecciones</div>
                  </div>
                </div>
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