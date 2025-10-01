'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'

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
            <div className="hidden md:flex items-center">
              {/* Solo Menu de Usuario */}
              <UserMenu />
            </div>
          )}

          {/* Navegación móvil */}
          <div className="md:hidden flex items-center">
            {/* Solo User Menu móvil */}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

export { MinimalHeader }