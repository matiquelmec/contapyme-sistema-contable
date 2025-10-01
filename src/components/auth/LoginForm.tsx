'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authSimple } from '@/lib/auth-simple'
import { AuthRedirect } from '@/lib/auth-redirect'

interface LoginFormProps {
  message?: string
}

export default function LoginForm({ message }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Iniciando login...')

      const { user, error } = await authSimple.login(email, password)

      console.log('📋 Resultado del login:', { user, error })

      if (error || !user) {
        console.log('❌ Error en login:', error)
        setError(error || 'Error de autenticación')
      } else {
        console.log('✅ Login exitoso:', user.email)

        // Verificar si hay una URL de redirección
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirect') || '/'

        console.log('🔄 Redirigiendo a:', redirectTo)

        // Usar sistema robusto de redirección
        try {
          await AuthRedirect.redirectWithConfirmation(
            redirectTo,
            '¡Login exitoso! Redirigiendo...'
          )
        } catch (redirectError) {
          console.error('Error en redirección:', redirectError)
          // Fallback: redirección forzada
          AuthRedirect.forceRedirect(redirectTo)
        }
      }
    } catch (err) {
      console.error('💥 Error general en login:', err)
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Inicia sesión en ContaPyme
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accede a tu sistema contable integral
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {message && (
            <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md mb-4">
              {message}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Regístrate aquí
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}