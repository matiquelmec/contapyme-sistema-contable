'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export type UserIntention = 
  | 'analyze_f29'
  | 'manage_company' 
  | 'explore_features'
  | 'view_indicators'
  | 'manage_assets'
  | 'configure_system'

interface IntentionAction {
  intention: UserIntention
  context?: Record<string, any>
}

export function useUserIntention() {
  const router = useRouter()

  const captureIntention = useCallback((action: IntentionAction) => {
    // Guardar intención en sessionStorage para persistir durante la sesión
    sessionStorage.setItem('userIntention', JSON.stringify(action))
    
    // Analytics tracking (para futuras optimizaciones)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'user_intention_captured', {
        intention: action.intention,
        context: action.context
      })
    }
  }, [])

  const executeIntention = useCallback(() => {
    const stored = sessionStorage.getItem('userIntention')
    if (!stored) return

    try {
      const action: IntentionAction = JSON.parse(stored)
      
      // Routing inteligente basado en intención
      switch (action.intention) {
        case 'analyze_f29':
          router.push('/accounting/f29-analysis')
          break
          
        case 'manage_company':
          router.push('/accounting')
          break
          
        case 'explore_features':
          router.push('/explore')
          break
          
        case 'view_indicators':
          router.push('/accounting/indicators')
          break
          
        case 'manage_assets':
          router.push('/accounting/fixed-assets')
          break
          
        case 'configure_system':
          router.push('/accounting/configuration')
          break
          
        default:
          router.push('/explore')
      }

      // Limpiar intención después de ejecutar
      sessionStorage.removeItem('userIntention')
      
    } catch (error) {
      console.warn('Error parsing user intention:', error)
      router.push('/explore')
    }
  }, [router])

  const getNavigationContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    const stored = sessionStorage.getItem('userIntention')
    if (!stored) return null
    
    try {
      const action: IntentionAction = JSON.parse(stored)
      return {
        intention: action.intention,
        context: action.context,
        timestamp: Date.now()
      }
    } catch {
      return null
    }
  }, [])

  const getWelcomeMessage = useCallback((currentPath: string) => {
    const context = getNavigationContext()
    if (!context) return null

    const messages = {
      analyze_f29: {
        title: "¡Perfecto! Vamos a analizar tu F29",
        description: "Sube tu formulario y obtén insights automáticos en segundos",
        action: "Comenzar Análisis",
        priority: "high"
      },
      manage_company: {
        title: "Bienvenido a tu centro de control financiero",
        description: "Gestiona todos los aspectos contables de tu empresa desde aquí",
        action: "Explorar Módulos",
        priority: "medium"  
      },
      explore_features: {
        title: "Explora todas las funcionalidades",
        description: "Cada módulo está diseñado para simplificar tu gestión contable",
        action: "Ver Demo",
        priority: "low"
      }
    }

    return messages[context.intention] || null
  }, [getNavigationContext])

  const getIntentionConfig = useCallback((intention: UserIntention) => {
    const configs = {
      analyze_f29: {
        title: 'Analizar F29',
        description: 'Sube tu formulario y obtén análisis automático',
        icon: '📄',
        color: 'blue',
        urgency: 'high'
      },
      manage_company: {
        title: 'Gestionar Empresa',
        description: 'Acceso completo al módulo contable',
        icon: '🏢',
        color: 'green', 
        urgency: 'medium'
      },
      explore_features: {
        title: 'Explorar Funcionalidades',
        description: 'Descubre todo lo que puedes hacer',
        icon: '🚀',
        color: 'purple',
        urgency: 'low'
      },
      view_indicators: {
        title: 'Ver Indicadores',
        description: 'UF, UTM, divisas en tiempo real',
        icon: '📊',
        color: 'orange',
        urgency: 'medium'
      },
      manage_assets: {
        title: 'Activos Fijos',
        description: 'Gestiona y deprecia tus activos',
        icon: '🏭',
        color: 'indigo',
        urgency: 'medium'
      },
      configure_system: {
        title: 'Configuración',
        description: 'Plan de cuentas y ajustes',
        icon: '⚙️',
        color: 'gray',
        urgency: 'low'
      }
    }

    return configs[intention]
  }, [])

  return {
    captureIntention,
    executeIntention,
    getIntentionConfig,
    getNavigationContext,
    getWelcomeMessage
  }
}