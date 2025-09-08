import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    rounded = 'lg',
    ...props 
  }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
    
    const variants = {
      primary: "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 active:bg-primary-800 shadow-sm hover:shadow-md",
      secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500 active:bg-gray-300",
      success: "bg-success-600 hover:bg-success-700 text-white focus:ring-success-500 active:bg-success-800 shadow-sm hover:shadow-md",
      warning: "bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500 active:bg-warning-700 shadow-sm hover:shadow-md",
      danger: "bg-error-600 hover:bg-error-700 text-white focus:ring-error-500 active:bg-error-800 shadow-sm hover:shadow-md",
      ghost: "hover:bg-gray-100 text-gray-700 focus:ring-gray-500 active:bg-gray-200",
      outline: "border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 focus:ring-gray-500 active:bg-gray-100"
    }
    
    const sizes = {
      xs: "px-2.5 py-1.5 text-xs h-7 gap-1",
      sm: "px-3 py-2 text-sm h-8 gap-1.5",
      md: "px-4 py-2 text-sm h-10 gap-2",
      lg: "px-5 py-2.5 text-base h-11 gap-2",
      xl: "px-6 py-3 text-lg h-12 gap-2.5"
    }
    
    const roundedStyles = {
      none: "rounded-none",
      sm: "rounded",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full"
    }
    
    const isDisabled = disabled || loading
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          roundedStyles[rounded],
          fullWidth && "w-full",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {children && <span>{children}</span>}
        
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }