import { redirect } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/auth'
import CreateCompanyForm from '@/components/companies/CreateCompanyForm'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default async function CreateCompanyPage() {
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

  // Verificar si puede crear más empresas
  const canCreateCompany = profile.companies.length < profile.max_companies

  if (!canCreateCompany) {
    redirect('/dashboard?error=company_limit_reached')
  }

  return (
    <DashboardLayout user={profile}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Crear Nueva Empresa</h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Límite de empresas disponible
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Puedes crear {profile.max_companies - profile.companies.length} empresa{profile.max_companies - profile.companies.length !== 1 ? 's' : ''} más en tu plan {profile.subscription_plan}.
                  Tienes {profile.companies.length} de {profile.max_companies} empresas creadas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Información de la Empresa</h2>
            <p className="text-sm text-gray-600 mt-1">
              Completa los datos básicos de tu nueva empresa. Podrás editarlos más tarde.
            </p>
          </div>

          <div className="p-6">
            <CreateCompanyForm
              userId={user.id}
              currentCompanies={profile.companies.length}
              maxCompanies={profile.max_companies}
            />
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">¿Qué sucede después?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Se creará automáticamente un plan de cuentas básico</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Tendrás acceso a todos los módulos: F29, Remuneraciones, Activos Fijos</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Podrás invitar colaboradores y asignar roles específicos</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Los datos estarán completamente separados de tus otras empresas</span>
            </li>
          </ul>
        </div>

        {/* Plan upgrade prompt si está cerca del límite */}
        {profile.companies.length >= profile.max_companies * 0.8 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Te estás acercando al límite de tu plan
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Después de crear esta empresa tendrás {profile.companies.length + 1} de {profile.max_companies} empresas.
                  Considera
                  <a href="/settings/billing" className="font-medium underline ml-1">
                    actualizar tu plan
                  </a> para gestionar más empresas.
                </p>
                <div className="mt-3">
                  <a
                    href="/settings/billing"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Ver Planes
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}