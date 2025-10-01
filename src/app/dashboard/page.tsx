import { redirect } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/auth'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import CompanySelector from '@/components/dashboard/CompanySelector'
import UserStats from '@/components/dashboard/UserStats'
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentActivity from '@/components/dashboard/RecentActivity'

export default async function DashboardPage() {
  // Verificar autenticación
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener perfil completo del usuario
  const profile = await getUserProfile(user.id)
  if (!profile) {
    redirect('/login')
  }

  // Si no tiene empresas, redirigir a crear empresa
  if (!profile.companies || profile.companies.length === 0) {
    redirect('/companies/create')
  }

  return (
    <DashboardLayout user={profile}>
      <div className="space-y-6">
        {/* Header del Dashboard */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ¡Bienvenido, {profile.full_name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona tus empresas y accede a todas las funcionalidades de ContaPyme
              </p>
            </div>
            <CompanySelector
              companies={profile.companies}
              currentUserId={user.id}
            />
          </div>
        </div>

        {/* Estadísticas del Usuario */}
        <UserStats
          profile={profile}
          companies={profile.companies}
        />

        {/* Estado de Suscripción */}
        <SubscriptionStatus
          subscription={profile.subscription}
          subscriptionPlan={profile.subscription_plan}
          subscriptionStatus={profile.subscription_status}
          maxCompanies={profile.max_companies}
          currentCompanies={profile.companies.length}
        />

        {/* Grid de Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acciones Rápidas */}
          <QuickActions
            companies={profile.companies}
            canCreateCompany={profile.companies.length < profile.max_companies}
            subscriptionPlan={profile.subscription_plan}
          />

          {/* Actividad Reciente */}
          <RecentActivity userId={user.id} />
        </div>

        {/* Empresas Gestionadas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Empresas Gestionadas
              </h2>
              <span className="text-sm text-gray-500">
                {profile.companies.length} de {profile.max_companies} permitidas
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.companies.map((company) => (
                <div
                  key={company.company_id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {company.company_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        RUT: {company.company_rut}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.user_role === 'owner'
                            ? 'bg-blue-100 text-blue-800'
                            : company.user_role === 'admin'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.user_role === 'owner' ? 'Propietario' :
                           company.user_role === 'admin' ? 'Administrador' :
                           company.user_role === 'accountant' ? 'Contador' : 'Visualizador'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => window.location.href = `/companies/${company.company_id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Administrar →
                    </button>
                    <button
                      onClick={() => window.location.href = `/explore?company=${company.company_id}`}
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Acceder
                    </button>
                  </div>
                </div>
              ))}

              {/* Botón para crear nueva empresa */}
              {profile.companies.length < profile.max_companies && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Crear Nueva Empresa
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Agrega otra empresa a tu cuenta
                  </p>
                  <button
                    onClick={() => window.location.href = '/companies/create'}
                    className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Crear Empresa
                  </button>
                </div>
              )}
            </div>

            {/* Límite alcanzado */}
            {profile.companies.length >= profile.max_companies && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-yellow-400 mr-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Límite de empresas alcanzado
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Has alcanzado el límite de {profile.max_companies} empresas para tu plan {profile.subscription_plan}.
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
      </div>
    </DashboardLayout>
  )
}