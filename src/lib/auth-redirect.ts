// Sistema robusto de redirección para manejar todos los casos edge

export class AuthRedirect {
  private static readonly STORAGE_KEY = 'auth_redirect_pending'

  // Método principal de redirección con múltiples fallbacks
  static async redirect(url: string, options: {
    force?: boolean
    delay?: number
    useHistory?: boolean
    fallbackToReload?: boolean
  } = {}) {
    const {
      force = false,
      delay = 100,
      useHistory = true,
      fallbackToReload = true
    } = options

    console.log('🔄 AuthRedirect: Iniciando redirección a:', url)

    // Marcar redirección pendiente
    this.setPendingRedirect(url)

    try {
      // Método 1: Delay + window.location (más confiable)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Método 2: window.location.href (fuerza refresh completo)
      if (force || !useHistory) {
        console.log('🔄 AuthRedirect: Usando window.location.href')
        window.location.href = url
        return
      }

      // Método 3: History API + Refresh manual
      if (useHistory && window.history) {
        console.log('🔄 AuthRedirect: Usando history.pushState + reload')
        window.history.pushState({}, '', url)

        // Force reload para que Next.js detecte el cambio
        setTimeout(() => {
          window.location.reload()
        }, 50)
        return
      }

      // Método 4: Fallback a reload completo
      if (fallbackToReload) {
        console.log('🔄 AuthRedirect: Fallback a reload completo')
        window.location.href = url
      }

    } catch (error) {
      console.error('❌ AuthRedirect: Error en redirección:', error)

      // Último recurso: reload completo
      try {
        window.location.href = url
      } catch (finalError) {
        console.error('❌ AuthRedirect: Error crítico:', finalError)
      }
    }
  }

  // Verificar si hay redirección pendiente al cargar página
  static checkPendingRedirect(): string | null {
    try {
      const pending = localStorage.getItem(this.STORAGE_KEY)
      if (pending) {
        localStorage.removeItem(this.STORAGE_KEY)
        return pending
      }
    } catch (error) {
      console.error('Error checking pending redirect:', error)
    }
    return null
  }

  // Marcar redirección como pendiente
  private static setPendingRedirect(url: string) {
    try {
      localStorage.setItem(this.STORAGE_KEY, url)
    } catch (error) {
      console.error('Error setting pending redirect:', error)
    }
  }

  // Redirección inmediata sin delays
  static forceRedirect(url: string) {
    console.log('⚡ AuthRedirect: Redirección forzada a:', url)
    window.location.href = url
  }

  // Redirección con confirmación visual
  static async redirectWithConfirmation(url: string, message = 'Redirigiendo...') {
    console.log('📋 AuthRedirect: Redirección con confirmación')

    // Mostrar mensaje temporal
    const overlay = this.createRedirectOverlay(message)
    document.body.appendChild(overlay)

    // Esperar un momento para que el usuario vea el mensaje
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Remover overlay y redirigir
    document.body.removeChild(overlay)
    this.forceRedirect(url)
  }

  // Crear overlay visual para feedback
  private static createRedirectOverlay(message: string): HTMLElement {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 9999;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      text-align: center;
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      backdrop-filter: blur(10px);
    `

    content.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid transparent;
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
      </div>
      ${message}
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `

    overlay.appendChild(content)
    return overlay
  }
}