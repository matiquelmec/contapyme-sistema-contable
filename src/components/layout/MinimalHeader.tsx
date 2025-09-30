'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { 
  ChevronDown, 
  Calculator, 
  TrendingUp, 
  Home, 
  Building2,
  Menu,
  X
} from 'lucide-react'

interface MinimalHeaderProps {
  className?: string
  variant?: 'default' | 'glass' | 'premium'
  showNavigation?: boolean
}

const MinimalHeader: React.FC<MinimalHeaderProps> = ({
  className,
  variant = 'premium',
  showNavigation = true
}) => {
  const pathname = usePathname()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Quick navigation menu items
  const quickNavItems = [
    {
      label: 'Análisis F29',
      href: '/accounting/f29-analysis',
      icon: Calculator,
      description: 'Análisis automático de formularios'
    },
    {
      label: 'Análisis Comparativo', 
      href: '/accounting/f29-comparative',
      icon: TrendingUp,
      description: 'Compara múltiples períodos'
    },
    {
      label: 'Activos Fijos',
      href: '/accounting/fixed-assets',
      icon: Home,
      description: 'Gestión y depreciación'
    },
    {
      label: 'Indicadores',
      href: '/accounting/indicators',
      icon: TrendingUp,
      description: 'UF, UTM, divisas en tiempo real'
    }
  ]

  const getHeaderClasses = () => {
    const baseClasses = "sticky top-0 z-50 w-full border-b"
    switch (variant) {
      case 'glass':
        return cn(
          baseClasses, 
          "bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-sm",
          className
        )
      case 'premium':
        return cn(
          baseClasses, 
          "bg-white/95 backdrop-blur-md border-gray-200 shadow-sm",
          className
        )
      default:
        return cn(
          baseClasses,
          "bg-white border-gray-200",
          className
        )
    }
  }

  return (
    <header className={getHeaderClasses()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Principal y prominente */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className="relative">
                {/* Logo con efecto hover mejorado */}
                <img 
                  src="/images/logo.png" 
                  alt="ContaPymePuq" 
                  className="h-32 w-auto drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300 group-hover:scale-105" 
                />
                {/* Glow effect subtle */}
                <div className="absolute inset-0 bg-primary-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            </Link>
          </div>

          {/* Navegación de escritorio */}
          {showNavigation && (
            <div className="hidden md:flex items-center space-x-1">
              {/* Menu dropdown compacto */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <span className="font-medium">Herramientas</span>
                  <ChevronDown className={cn(
                    "ml-1 h-4 w-4 transition-transform duration-200",
                    isNavOpen && "rotate-180"
                  )} />
                </Button>
                
                {/* Dropdown menu mejorado */}
                {isNavOpen && (
                  <>
                    {/* Overlay para cerrar al hacer click afuera */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNavOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 animate-scale-in">
                      <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Accesos Rápidos
                        </h3>
                        <div className="space-y-1">
                          {quickNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsNavOpen(false)}
                                className={cn(
                                  "flex items-start space-x-3 p-3 rounded-xl transition-all duration-200 group",
                                  isActive 
                                    ? "bg-primary-50 border border-primary-200" 
                                    : "hover:bg-gray-50"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                  isActive 
                                    ? "bg-primary-500 text-white" 
                                    : "bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600"
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                  <p className={cn(
                                    "font-medium text-sm",
                                    isActive ? "text-primary-900" : "text-gray-900"
                                  )}>
                                    {item.label}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {item.description}
                                  </p>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                        
                        <div className="border-t border-gray-100 mt-4 pt-4">
                          <Link
                            href="/explore"
                            onClick={() => setIsNavOpen(false)}
                            className="flex items-center justify-center w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                          >
                            Ver Todas las Funcionalidades
                          </Link>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navegación móvil */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Menu móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100">
            <div className="py-4 space-y-1">
              {quickNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary-50 text-primary-900" 
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-primary-600" : "text-gray-400"
                    )} />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </Link>
                )
              })}
              
              <div className="pt-4 border-t border-gray-100">
                <Link
                  href="/explore"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Ver Todas las Funcionalidades
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export { MinimalHeader }