import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  outline?: boolean
  dot?: boolean
  icon?: React.ReactNode
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'sm',
    rounded = 'full',
    outline = false,
    dot = false,
    icon,
    children,
    ...props 
  }, ref) => {
    
    const baseStyles = "inline-flex items-center font-medium transition-colors duration-200"
    
    const variants = {
      default: outline 
        ? "border border-gray-300 text-gray-700 bg-white" 
        : "bg-gray-100 text-gray-800",
      primary: outline 
        ? "border border-primary-300 text-primary-700 bg-white" 
        : "bg-primary-100 text-primary-800",
      secondary: outline 
        ? "border border-gray-300 text-gray-700 bg-white" 
        : "bg-gray-100 text-gray-800",
      success: outline 
        ? "border border-success-300 text-success-700 bg-white" 
        : "bg-success-100 text-success-800",
      warning: outline 
        ? "border border-warning-300 text-warning-700 bg-white" 
        : "bg-warning-100 text-warning-800",
      error: outline 
        ? "border border-error-300 text-error-700 bg-white" 
        : "bg-error-100 text-error-800",
      info: outline 
        ? "border border-primary-300 text-primary-700 bg-white" 
        : "bg-primary-100 text-primary-800",
      purple: outline 
        ? "border border-purple-300 text-purple-700 bg-white" 
        : "bg-purple-100 text-purple-800"
    }
    
    const sizes = {
      xs: "px-2 py-0.5 text-xs gap-1",
      sm: "px-2.5 py-0.5 text-xs gap-1",
      md: "px-3 py-1 text-sm gap-1.5",
      lg: "px-4 py-1.5 text-base gap-2"
    }
    
    const roundedStyles = {
      sm: "rounded",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full"
    }
    
    const dotColors = {
      default: "bg-gray-500",
      primary: "bg-primary-500",
      secondary: "bg-gray-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      error: "bg-error-500",
      info: "bg-primary-500",
      purple: "bg-purple-500"
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          roundedStyles[rounded],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotColors[variant]
          )} />
        )}
        
        {icon && !dot && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        
        {children && <span>{children}</span>}
      </div>
    )
  }
)

Badge.displayName = "Badge"

export { Badge }