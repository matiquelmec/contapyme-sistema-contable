'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, Home, Calculator, Users, TrendingUp } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backHref?: string
  actions?: React.ReactNode
  className?: string
  showNavigation?: boolean
  variant?: 'default' | 'gradient' | 'premium'
}

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={cn("flex text-sm text-gray-500", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 mx-2 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  backHref = '/',
  actions,
  className,
  showNavigation = true,
  variant = 'default'
}) => {
  const pathname = usePathname()
  const [isNavOpen, setIsNavOpen] = useState(false)

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Inicio', href: '/' }]
    
    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      let label = path
      switch (path) {
        case 'accounting':
          label = 'Contabilidad'
          break
        case 'payroll':
          label = 'Remuneraciones'
          break
        case 'explore':
          label = 'Explorar'
          break
        case 'f29-analysis':
          label = 'Análisis F29'
          break
        case 'f29-comparative':
          label = 'Análisis Comparativo'
          break
        case 'fixed-assets':
          label = 'Activos Fijos'
          break
        case 'indicators':
          label = 'Indicadores'
          break
        case 'configuration':
          label = 'Configuración'
          break
      }
      
      breadcrumbs.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href: index === paths.length - 1 ? undefined : currentPath
      })
    })
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

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
    const baseClasses = "relative z-20"
    switch (variant) {
      case 'gradient':
        return cn(baseClasses, "bg-gradient-to-r from-blue-50 via-white to-purple-50 border-b border-blue-200/30", className)
      case 'premium':
        return cn(baseClasses, "bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm", className)
      default:
        return cn(baseClasses, "bg-white border-b border-gray-200", className)
    }
  }

  return (
    <header className={getHeaderClasses()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Back button */}
            {showBackButton && (
              <Link
                href={backHref}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Volver
              </Link>
            )}

            {/* Brand - Solo Logo */}
            <Link href="/" className="flex items-center group">
              <img 
                src="/images/logo.png" 
                alt="ContaPymePuq" 
                className="h-24 w-auto drop-shadow-xl group-hover:scale-105 transition-transform duration-200" 
              />
            </Link>
            
            {/* Navigation Menu */}
            {showNavigation && (
              <div className="relative ml-6">
                <button
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium">Navegación</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isNavOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Accesos Rápidos</h3>
                      <div className="space-y-2">
                        {quickNavItems.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsNavOpen(false)}
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                      
                      <div className="border-t border-gray-200 mt-4 pt-4">
                        <Link
                          href="/explore"
                          onClick={() => setIsNavOpen(false)}
                          className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Ver Todas las Funcionalidades
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Title and subtitle */}
            {title && (
              <div className="hidden md:block border-l border-gray-200 pl-4">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {actions}
            
            {/* User menu placeholder */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">D</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">Usuario Demo</p>
                <p className="text-xs text-gray-500">Modo Demo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {showNavigation && breadcrumbs.length > 1 && (
          <div className="pb-2">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* Mobile title */}
        {title && (
          <div className="md:hidden pb-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export { Header, Breadcrumbs }