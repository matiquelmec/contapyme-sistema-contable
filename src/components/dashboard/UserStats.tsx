'use client'

import { UserProfile, UserCompany } from '@/lib/auth'

interface UserStatsProps {
  profile: UserProfile
  companies: UserCompany[]
}

export default function UserStats({ profile, companies }: UserStatsProps) {
  const ownedCompanies = companies.filter(c => c.is_owner).length
  const managedCompanies = companies.filter(c => !c.is_owner).length

  const trialDaysLeft = profile.subscription_status === 'trial' && profile.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const planLimits = {
    monthly: { companies: 1, employees: 10 },
    semestral: { companies: 5, employees: 50 },
    annual: { companies: 10, employees: 100 }
  }

  const currentLimits = planLimits[profile.subscription_plan] || planLimits.monthly

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Empresas Propias */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Empresas Propias</p>
            <p className="text-2xl font-bold text-blue-600">
              {ownedCompanies}
              <span className="text-sm text-gray-500 font-normal">
                /{currentLimits.companies}
              </span>
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (ownedCompanies / currentLimits.companies) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Empresas Gestionadas */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Como Colaborador</p>
            <p className="text-2xl font-bold text-green-600">{managedCompanies}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Empresas donde tienes acceso como admin, contador o visualizador
        </p>
      </div>

      {/* Estado de Suscripción */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Estado de Plan</p>
            <p className={`text-2xl font-bold ${
              profile.subscription_status === 'active' ? 'text-green-600' :
              profile.subscription_status === 'trial' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {profile.subscription_status === 'active' ? 'Activo' :
               profile.subscription_status === 'trial' ? 'Prueba' :
               profile.subscription_status === 'suspended' ? 'Suspendido' : 'Expirado'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            profile.subscription_status === 'active' ? 'bg-green-100' :
            profile.subscription_status === 'trial' ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            {profile.subscription_status === 'active' ? (
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : profile.subscription_status === 'trial' ? (
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
        {profile.subscription_status === 'trial' && trialDaysLeft > 0 && (
          <p className="text-xs text-yellow-600 mt-2">
            {trialDaysLeft} días restantes de prueba
          </p>
        )}
      </div>

      {/* Plan Actual */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Plan Actual</p>
            <p className={`text-2xl font-bold ${
              profile.subscription_plan === 'annual' ? 'text-purple-600' :
              profile.subscription_plan === 'semestral' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {profile.subscription_plan === 'monthly' ? 'Mensual' :
               profile.subscription_plan === 'semestral' ? 'Semestral' : 'Anual'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            profile.subscription_plan === 'annual' ? 'bg-purple-100' :
            profile.subscription_plan === 'semestral' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            <svg className={`w-6 h-6 ${
              profile.subscription_plan === 'annual' ? 'text-purple-600' :
              profile.subscription_plan === 'semestral' ? 'text-blue-600' :
              'text-gray-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <a
            href="/settings/billing"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Gestionar plan →
          </a>
        </div>
      </div>
    </div>
  )
}