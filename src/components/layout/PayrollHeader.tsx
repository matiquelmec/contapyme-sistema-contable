'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MinimalHeader } from './MinimalHeader'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PayrollHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  backUrl?: string
  actions?: React.ReactNode
  className?: string
}

const PayrollHeader: React.FC<PayrollHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  backUrl = '/payroll',
  actions,
  className
}) => {
  return (
    <>
      {/* MinimalHeader con logo prominente */}
      <MinimalHeader variant="premium" showNavigation={true} />
      
      {/* Context Header con información de la página */}
      <div className={cn("bg-white border-b border-gray-200", className)}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            
            {/* Información de la página */}
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Link href={backUrl}>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            
            {/* Actions - siempre en su propia fila en mobile */}
            {actions && (
              <div className="w-full overflow-x-auto">
                <div className="min-w-full">
                  {actions}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export { PayrollHeader }