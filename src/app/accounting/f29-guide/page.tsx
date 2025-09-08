import Link from 'next/link'

export default function F29GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/accounting" className="text-gray-600 hover:text-gray-900 mr-4">
                ← Volver a Contabilidad
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Guía para 100% de Confianza F29</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="px-8 py-12 text-white">
            <h2 className="text-3xl font-bold mb-4">¿Cómo alcanzar 100% de confianza?</h2>
            <p className="text-green-100 text-lg">
              Aprende los 15 puntos clave que nuestro sistema valida para garantizar la máxima precisión en tu F29
            </p>
          </div>
        </div>

        {/* Validation Categories */}
        <div className="space-y-8">
          {/* Mathematical Validations */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg mr-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              Validaciones Matemáticas Básicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-lg font-semibold text-gray-900">Cálculo IVA</h4>
                  <p className="text-gray-600">IVA a Pagar = IVA Débito - IVA Crédito</p>
                  <p className="text-sm text-blue-600">Tolerancia: ±$100</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-lg font-semibold text-gray-900">PPM Exacto</h4>
                  <p className="text-gray-600">PPM = (Renta Anual × 8.75%) ÷ 12</p>
                  <p className="text-sm text-blue-600">Tolerancia: ±$1.000</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 mb-2">Tips para pasar:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Verificar que los cálculos coincidan exactamente</li>
                  <li>• Usar calculadora para montos grandes</li>
                  <li>• Revisar que no haya errores de digitación</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Business Logic Validations */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg mr-3 flex items-center justify-center">
                <span className="text-green-600 font-bold">2</span>
              </div>
              Validaciones de Lógica Empresarial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="text-lg font-semibold text-gray-900">Coherencia IVA vs Ventas</h4>
                  <p className="text-gray-600">IVA Débito ≈ Ventas Netas × 19%</p>
                  <p className="text-sm text-green-600">Tolerancia: ±15%</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="text-lg font-semibold text-gray-900">Ratio Crédito/Débito</h4>
                  <p className="text-gray-600">Entre 30% y 80% es normal</p>
                  <p className="text-sm text-green-600">Fuera del rango: advertencia</p>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 mb-2">Tips para pasar:</h5>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Verificar coherencia entre ventas e IVA</li>
                  <li>• Revisar clasificación de ventas exentas</li>
                  <li>• Confirmar créditos fiscales válidos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Compliance */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg mr-3 flex items-center justify-center">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              Cumplimiento Legal y Normativo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900">Límites Legales</h4>
                <p className="text-gray-600 text-sm">IVA no debe exceder 50% de renta anual</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900">Campos Obligatorios</h4>
                <p className="text-gray-600 text-sm">Todos los campos requeridos completos</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900">Dígitos Verificadores</h4>
                <p className="text-gray-600 text-sm">RUT y códigos válidos</p>
              </div>
            </div>
          </div>

          {/* Complete Checklist */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Lista Completa de Validaciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">1. Cálculo matemático básico IVA</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">2. Coherencia IVA vs Ventas</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">3. Validación PPM exacta</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">4. Rangos normales IVA</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">5. Secuencia temporal</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">6. Dígitos verificadores</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">7. Campos obligatorios</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">8. Coherencia períodos anteriores</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">9. Límites legales</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">10. Formato de montos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">11. Cruce con libros contables</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">12. Plazos de presentación</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">13. RUT y datos identificatorios</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">14. Formularios complementarios</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-gray-700">15. Integridad del archivo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Steps */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">Pasos para Alcanzar 100% de Confianza</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Sube tu F29</h4>
                <p className="text-indigo-100 text-sm">Carga tu formulario en cualquier formato compatible</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Revisa Errores</h4>
                <p className="text-indigo-100 text-sm">Analiza las advertencias y errores detectados</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Aplica Correcciones</h4>
                <p className="text-indigo-100 text-sm">Usa las correcciones automáticas para alcanzar 100%</p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link 
                href="/accounting/f29-analysis"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Comenzar Análisis F29
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}