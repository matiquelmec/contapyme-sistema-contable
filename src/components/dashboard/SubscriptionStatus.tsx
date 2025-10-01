'use client'

import { UserSubscription } from '@/lib/auth'

interface SubscriptionStatusProps {
  subscription: UserSubscription | null
  subscriptionPlan: 'monthly' | 'semestral' | 'annual'
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'expired'
  maxCompanies: number
  currentCompanies: number
}

export default function SubscriptionStatus({
  subscription,
  subscriptionPlan,
  subscriptionStatus,
  maxCompanies,
  currentCompanies
}: SubscriptionStatusProps) {
  const planDetails = {
    monthly: {
      name: 'Plan Mensual',
      price: 9990,
      features: ['1 empresa', '10 empleados', 'Soporte básico'],
      color: 'gray'
    },
    semestral: {
      name: 'Plan Semestral',
      price: 49990,
      pricePerMonth: 8332,
      features: ['5 empresas', '50 empleados', 'Soporte prioritario', 'Reportes avanzados'],
      color: 'blue'
    },
    annual: {
      name: 'Plan Anual',
      price: 99990,
      pricePerMonth: 8332,
      features: ['10 empresas', '100 empleados', 'Soporte 24/7', 'Reportes avanzados', 'API access'],
      color: 'purple'
    }
  }

  const currentPlan = planDetails[subscriptionPlan]
  const nextPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
    : null

  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end).toLocaleDateString('es-CL')
    : null

  const isNearLimit = currentCompanies >= maxCompanies * 0.8

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Estado de Suscripción</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona tu plan y límites de uso
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscriptionStatus === 'active'
              ? 'bg-green-100 text-green-800'
              : subscriptionStatus === 'trial'
              ? 'bg-yellow-100 text-yellow-800'
              : subscriptionStatus === 'suspended'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {subscriptionStatus === 'active' ? 'Activa' :
             subscriptionStatus === 'trial' ? 'Prueba Gratuita' :
             subscriptionStatus === 'suspended' ? 'Suspendida' : 'Expirada'}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Actual */}
          <div className={`border-2 rounded-lg p-4 ${
            currentPlan.color === 'purple'
              ? 'border-purple-200 bg-purple-50'
              : currentPlan.color === 'blue'
              ? 'border-blue-200 bg-blue-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${
                currentPlan.color === 'purple' ? 'text-purple-900' :
                currentPlan.color === 'blue' ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {currentPlan.name}
              </h3>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  currentPlan.color === 'purple' ? 'text-purple-700' :
                  currentPlan.color === 'blue' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  ${currentPlan.price.toLocaleString()}
                </div>
                {currentPlan.pricePerMonth && (
                  <div className="text-sm text-gray-600">
                    ${currentPlan.pricePerMonth.toLocaleString()}/mes
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <svg className={`w-4 h-4 mr-2 ${
                    currentPlan.color === 'purple' ? 'text-purple-600' :
                    currentPlan.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                  }`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* Período de facturación */}
            {subscriptionStatus === 'active' && nextPeriodEnd && (
              <div className="text-sm text-gray-600">
                <p><strong>Próxima facturación:</strong> {nextPeriodEnd}</p>
              </div>
            )}

            {subscriptionStatus === 'trial' && trialEnd && (
              <div className="text-sm text-yellow-700 bg-yellow-100 rounded-lg p-3 mt-3">
                <p><strong>Prueba termina:</strong> {trialEnd}</p>
                <p className="mt-1">
                  <a href="/settings/billing" className="font-medium underline">
                    Actualiza tu plan
                  </a> para continuar usando todas las funcionalidades.
                </p>
              </div>
            )}
          </div>

          {/* Uso Actual */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Uso Actual</h3>

            {/* Límite de Empresas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Empresas</span>
                <span className={`text-sm font-bold ${
                  isNearLimit ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  {currentCompanies} / {maxCompanies}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (currentCompanies / maxCompanies) * 100)}%` }}
                />
              </div>
              {isNearLimit && (
                <p className="text-xs text-orange-600 mt-1">
                  Te estás acercando al límite de tu plan
                </p>
              )}
            </div>

            {/* Empleados estimados */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Límite de Empleados</span>
                <span className="text-sm font-bold text-gray-900">
                  {subscription?.employee_limit || currentPlan.features.find(f => f.includes('empleados'))?.split(' ')[0] || '10'}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Total permitido en todas tus empresas
              </p>
            </div>

            {/* Acciones */}
            <div className="space-y-2 pt-2">
              {subscriptionStatus !== 'active' && (
                <a
                  href="/settings/billing"
                  className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Activar Plan
                </a>
              )}

              {subscriptionPlan !== 'annual' && (
                <a
                  href="/settings/billing?upgrade=true"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Actualizar Plan
                </a>
              )}

              <a
                href="/settings/billing"
                className="block w-full text-gray-600 text-center py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Gestionar Suscripción
              </a>
            </div>
          </div>
        </div>

        {/* Advertencias importantes */}
        {currentCompanies >= maxCompanies && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Límite alcanzado</h3>
                <p className="text-sm text-red-700 mt-1">
                  Has alcanzado el límite de empresas para tu plan actual.
                  <a href="/settings/billing" className="font-medium underline ml-1">
                    Actualiza tu plan
                  </a> para crear más empresas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}