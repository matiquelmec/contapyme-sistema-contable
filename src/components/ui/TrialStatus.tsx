'use client'

import { useState, useEffect } from 'react'

interface TrialStatusProps {
  trialEndsAt: string | null
  subscriptionStatus: string
  planType: string
}

export default function TrialStatus({ trialEndsAt, subscriptionStatus, planType }: TrialStatusProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0)

  useEffect(() => {
    if (trialEndsAt && subscriptionStatus === 'trial') {
      const now = new Date()
      const trialEnd = new Date(trialEndsAt)
      const diffTime = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setDaysLeft(Math.max(0, diffDays))
    }
  }, [trialEndsAt, subscriptionStatus])

  if (subscriptionStatus !== 'trial' || !trialEndsAt) {
    return null
  }

  const isExpiringSoon = daysLeft <= 2
  const isExpired = daysLeft <= 0

  return (
    <div className={`rounded-lg border p-4 ${
      isExpired
        ? 'border-red-200 bg-red-50'
        : isExpiringSoon
          ? 'border-orange-200 bg-orange-50'
          : 'border-blue-200 bg-blue-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-3 ${
            isExpired
              ? 'bg-red-400'
              : isExpiringSoon
                ? 'bg-orange-400'
                : 'bg-blue-400'
          }`} />
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {isExpired ? 'Prueba Expirada' : 'Período de Prueba Activo'}
            </h3>
            <p className={`text-sm ${
              isExpired
                ? 'text-red-600'
                : isExpiringSoon
                  ? 'text-orange-600'
                  : 'text-blue-600'
            }`}>
              {isExpired
                ? 'Tu prueba gratuita ha expirado'
                : `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''} de prueba gratis`
              }
            </p>
          </div>
        </div>

        {(isExpired || isExpiringSoon) && (
          <button className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isExpired
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}>
            {isExpired ? 'Activar Plan' : 'Continuar'}
          </button>
        )}
      </div>

      {!isExpired && (
        <div className="mt-3">
          <div className="bg-white rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isExpiringSoon ? 'bg-orange-400' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.max(10, (daysLeft / 7) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Plan {planType === 'monthly' ? 'Básico' : planType} -
            <span className="font-medium"> Sin tarjeta requerida durante la prueba</span>
          </p>
        </div>
      )}
    </div>
  )
}