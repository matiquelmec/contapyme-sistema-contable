'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authSimple } from '@/lib/auth-simple'
import { AuthRedirect } from '@/lib/auth-redirect'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semestral' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Usar API route para evitar problemas de CORS/proxy
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          selectedPlan
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error en el registro')
      } else {
        // Registro exitoso, ahora hacer login automático
        setSuccess(true)

        try {
          // Hacer login automático usando sistema interno
          const { user, error: loginError } = await authSimple.login(email, password)

          if (loginError || !user) {
            console.error('Error en login automático:', loginError)
            // Falló el login automático, redirigir a login manual
            setTimeout(() => {
              router.push('/login?message=Cuenta creada exitosamente. Por favor inicia sesión.')
            }, 2000)
          } else {
            // Login automático exitoso
            console.log('✅ Login automático exitoso:', user.email)

            // Usar sistema robusto de redirección
            AuthRedirect.redirectWithConfirmation(
              '/',
              '¡Cuenta creada! Accediendo al sistema...'
            )
          }
        } catch (loginErr) {
          console.error('Error en login automático:', loginErr)
          setTimeout(() => {
            router.push('/login?message=Cuenta creada exitosamente. Por favor inicia sesión.')
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Error en registro:', err)
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ¡Registro exitoso!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {selectedPlan === 'monthly'
                ? '🎉 ¡Tu prueba gratuita de 7 días ha comenzado! Sin tarjeta requerida.'
                : 'Tu período de prueba ha comenzado.'
              }
            </p>
            <p className="mt-1 text-center text-xs text-gray-500">
              Iniciando sesión automáticamente y redirigiendo al dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear cuenta en ContaPyme
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Únete a la plataforma contable para PyMEs
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {/* Selección de Plan */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Elige tu plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan Mensual */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="absolute -top-2 -left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    7 días gratis
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="plan"
                      value="monthly"
                      checked={selectedPlan === 'monthly'}
                      onChange={() => setSelectedPlan('monthly')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <label className="block text-sm font-medium text-gray-900">Plan Básico</label>
                      <div className="text-lg font-bold text-gray-900">$9.990 <span className="text-sm font-normal">/mes</span></div>
                      <div className="text-xs text-green-600 font-medium">¡Prueba 7 días gratis!</div>
                    </div>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-600 space-y-1">
                  <li>• 1 empresa</li>
                  <li>• 10 empleados</li>
                  <li>• Soporte básico</li>
                  <li>• Sin compromiso</li>
                </ul>
              </div>

              {/* Plan Semestral */}
              <div
                onClick={() => setSelectedPlan('semestral')}
                className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                  selectedPlan === 'semestral'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="plan"
                      value="semestral"
                      checked={selectedPlan === 'semestral'}
                      onChange={() => setSelectedPlan('semestral')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <label className="block text-sm font-medium text-gray-900">Plan Semestral</label>
                      <div className="text-lg font-bold text-gray-900">$49.990 <span className="text-sm font-normal">/6 meses</span></div>
                      <div className="text-xs text-green-600">$8.332/mes - Ahorra 17%</div>
                    </div>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-600 space-y-1">
                  <li>• 5 empresas</li>
                  <li>• 50 empleados</li>
                  <li>• Soporte prioritario</li>
                  <li>• Reportes avanzados</li>
                </ul>
              </div>

              {/* Plan Anual */}
              <div
                onClick={() => setSelectedPlan('annual')}
                className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                  selectedPlan === 'annual'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Recomendado
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="plan"
                      value="annual"
                      checked={selectedPlan === 'annual'}
                      onChange={() => setSelectedPlan('annual')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <label className="block text-sm font-medium text-gray-900">Plan Anual</label>
                      <div className="text-lg font-bold text-gray-900">$99.990 <span className="text-sm font-normal">/año</span></div>
                      <div className="text-xs text-green-600">$8.332/mes - Ahorra 17%</div>
                    </div>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-600 space-y-1">
                  <li>• 10 empresas</li>
                  <li>• 100 empleados</li>
                  <li>• Soporte 24/7</li>
                  <li>• Reportes avanzados</li>
                  <li>• Acceso API</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              <span className="text-green-600 font-medium">Plan Básico: 7 días gratis sin tarjeta.</span> Otros planes incluyen período de prueba. Sin compromiso.
            </p>
          </div>

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}