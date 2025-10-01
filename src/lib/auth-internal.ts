// Sistema de autenticación interno que evita problemas de proxy
// Toda la comunicación es a través de nuestras API routes

export interface InternalUser {
  id: string
  email: string
  name: string
  plan: string
  status: string
  profile?: any
}

export interface InternalSession {
  user: InternalUser | null
  isLoading: boolean
  error: string | null
}

class InternalAuth {
  private user: InternalUser | null = null
  private isLoading = false
  private error: string | null = null
  private listeners: Set<(session: InternalSession) => void> = new Set()

  constructor() {
    this.checkSession()
  }

  // Verificar sesión actual
  async checkSession(): Promise<InternalSession> {
    this.setLoading(true)

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()

      if (data.user) {
        this.setUser(data.user)
        this.setError(null)
      } else {
        this.setUser(null)
      }

    } catch (error) {
      console.error('Error checking session:', error)
      this.setError('Error verificando sesión')
      this.setUser(null)
    } finally {
      this.setLoading(false)
    }

    return this.getSession()
  }

  // Login con email y password
  async signIn(email: string, password: string): Promise<{ user?: InternalUser; error?: string }> {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        this.setError(data.error || 'Error de autenticación')
        return { error: data.error || 'Error de autenticación' }
      }

      this.setUser(data.user)
      this.setError(null)

      return { user: data.user }

    } catch (error) {
      console.error('Error signing in:', error)
      const errorMsg = 'Error de conexión. Verifica tu internet.'
      this.setError(errorMsg)
      return { error: errorMsg }
    } finally {
      this.setLoading(false)
    }
  }

  // Logout
  async signOut(): Promise<void> {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      this.setUser(null)
      this.setError(null)
    }
  }

  // Obtener sesión actual
  getSession(): InternalSession {
    return {
      user: this.user,
      isLoading: this.isLoading,
      error: this.error
    }
  }

  // Suscribirse a cambios de sesión
  onAuthStateChange(callback: (session: InternalSession) => void) {
    this.listeners.add(callback)

    // Devolver función para desuscribirse
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Métodos privados para actualizar estado
  private setUser(user: InternalUser | null) {
    this.user = user
    this.notifyListeners()
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading
    this.notifyListeners()
  }

  private setError(error: string | null) {
    this.error = error
    this.notifyListeners()
  }

  private notifyListeners() {
    const session = this.getSession()
    this.listeners.forEach(callback => callback(session))
  }
}

// Instancia singleton
export const internalAuth = new InternalAuth()

// Hook para React
export function useInternalAuth(): InternalSession {
  const [session, setSession] = useState<InternalSession>(internalAuth.getSession())

  useEffect(() => {
    // Verificar sesión inicial
    internalAuth.checkSession()

    // Suscribirse a cambios
    const unsubscribe = internalAuth.onAuthStateChange(setSession)

    return unsubscribe
  }, [])

  return session
}

// Para uso en componentes que necesitan importar useState/useEffect
import { useState, useEffect } from 'react'

// Helper functions para uso directo
export const authHelpers = {
  async login(email: string, password: string) {
    return await internalAuth.signIn(email, password)
  },

  async logout() {
    return await internalAuth.signOut()
  },

  async getUser(): Promise<InternalUser | null> {
    const session = await internalAuth.checkSession()
    return session.user
  },

  isAuthenticated(): boolean {
    return internalAuth.getSession().user !== null
  }
}