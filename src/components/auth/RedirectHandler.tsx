'use client'

import { useEffect } from 'react'
import { AuthRedirect } from '@/lib/auth-redirect'

// Componente para manejar redirecciones pendientes
export function RedirectHandler() {
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return

    // Verificar redirecciones pendientes al cargar
    const pendingRedirect = AuthRedirect.checkPendingRedirect()

    if (pendingRedirect) {
      console.log('🔄 RedirectHandler: Ejecutando redirección pendiente:', pendingRedirect)

      // Esperar un tick para que la página termine de cargar
      setTimeout(() => {
        AuthRedirect.forceRedirect(pendingRedirect)
      }, 100)
    }
  }, [])

  return null // No renderiza nada
}