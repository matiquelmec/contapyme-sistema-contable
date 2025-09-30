import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'flat' | 'glass' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  hover?: boolean
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  border?: boolean
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  border?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', rounded = 'xl', hover = false, shadow, ...props }, ref) => {
    const baseStyles = "transition-all duration-200"
    
    const variants = {
      default: "bg-white border border-gray-200 shadow-sm",
      bordered: "bg-white border-2 border-gray-300",
      elevated: "bg-white shadow-lg border border-gray-100",
      flat: "bg-gray-50 border-0",
      glass: "bg-white/80 backdrop-blur-md border border-white/20 shadow-lg",
      gradient: "bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm"
    }
    
    const paddings = {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
      xl: "p-10"
    }
    
    const roundeds = {
      none: "rounded-none",
      sm: "rounded",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      '2xl': "rounded-2xl"
    }
    
    const shadows = {
      none: "",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
      xl: "shadow-xl"
    }
    
    const hoverStyles = hover ? "hover:shadow-lg hover:-translate-y-0.5" : ""
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          roundeds[rounded],
          shadow && shadows[shadow],
          hoverStyles,
          className
        )}
        {...props}
      />
    )
  }
)

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, border = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col space-y-1.5",
          border && "border-b border-gray-200 pb-4 mb-4",
          className
        )}
        {...props}
      />
    )
  }
)

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-xl font-semibold leading-none tracking-tight text-gray-900", className)}
        {...props}
      />
    )
  }
)

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-gray-500 mt-1", className)}
        {...props}
      />
    )
  }
)

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("text-gray-700", className)} 
        {...props} 
      />
    )
  }
)

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, border = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          border && "border-t border-gray-200 pt-4 mt-4",
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"
CardHeader.displayName = "CardHeader"
CardTitle.displayName = "CardTitle"
CardDescription.displayName = "CardDescription"
CardContent.displayName = "CardContent"
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}