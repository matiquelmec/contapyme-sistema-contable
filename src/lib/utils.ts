import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'CLP') {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' = 'short') {
  // Validar que tenemos un dato válido
  if (!date) {
    return 'Fecha no disponible'
  }
  
  let dateObj: Date
  
  if (typeof date === 'string') {
    // Validar que el string no esté vacío
    if (date.trim() === '') {
      return 'Fecha no disponible'
    }
    
    // Manejar diferentes formatos de fecha
    if (date.includes('T')) {
      // Formato ISO (2024-08-29T10:30:00Z)
      dateObj = new Date(date)
    } else if (date.includes('-')) {
      // Formato YYYY-MM-DD
      const parts = date.split('-')
      if (parts.length !== 3) {
        return 'Fecha inválida'
      }
      const [year, month, day] = parts.map(Number)
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return 'Fecha inválida'
      }
      dateObj = new Date(year, month - 1, day)
    } else {
      // Intentar crear fecha directamente
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }
  
  // Validar que la fecha resultante es válida
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida'
  }
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return dateObj.toLocaleDateString('es-CL')
}

export function formatPeriod(period: string) {
  if (period.length !== 6) return period
  
  const year = period.substring(0, 4)
  const month = period.substring(4, 6)
  const monthNames = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  
  return `${monthNames[parseInt(month)]} ${year}`
}