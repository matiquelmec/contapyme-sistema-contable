// Sistema de autenticación simplificado para evitar problemas de SSR

export interface SimpleUser {
  id: string
  email: string
  name: string
  plan: string
  status: string
}

export const authSimple = {
  // Login
  async login(email: string, password: string): Promise<{ user?: SimpleUser; error?: string }> {
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
        return { error: data.error || 'Error de autenticación' }
      }

      return { user: data.user }

    } catch (error) {
      console.error('Error en login:', error)
      return { error: 'Error de conexión' }
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Error en logout:', error)
    }
  },

  // Verificar sesión
  async getSession(): Promise<{ user?: SimpleUser; error?: string }> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()

      if (data.user) {
        return { user: data.user }
      } else {
        return { user: undefined }
      }

    } catch (error) {
      console.error('Error verificando sesión:', error)
      return { error: 'Error verificando sesión' }
    }
  }
}