'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { authSimple } from '@/lib/auth-simple'
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
  CreditCard
} from 'lucide-react'

interface UserMenuProps {
  className?: string
}

interface UserData {
  id: string
  email: string
  name: string
  plan: string
  status: string
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Cargar información del usuario al montar
  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { user: userData } = await authSimple.getSession()
      setUser(userData || null)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authSimple.logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'monthly': return 'Plan Mensual'
      case 'semestral': return 'Plan Semestral'
      case 'annual': return 'Plan Anual'
      default: return 'Plan Básico'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'trial': return 'text-blue-600 bg-blue-50'
      case 'expired': return 'text-red-600 bg-red-50'
      case 'suspended': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo'
      case 'trial': return 'Prueba'
      case 'expired': return 'Expirado'
      case 'suspended': return 'Suspendido'
      default: return 'Sin Estado'
    }
  }

  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="hidden md:block space-y-1">
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
          <div className="w-12 h-2 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar botón de login
  if (!user) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Iniciar Sesión
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* User Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 hover:bg-gray-50 px-3 py-2 h-auto"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {getInitials(user.name)}
        </div>

        {/* User Info - Desktop */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900 truncate max-w-32">
            {user.name}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-32">
            {user.email}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 animate-scale-in">

            {/* User Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {user.email}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getStatusColor(user.status)
                    )}>
                      {getStatusLabel(user.status)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getPlanLabel(user.plan)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group w-full"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <User className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Mi Perfil</div>
                  <div className="text-xs text-gray-500">Información personal</div>
                </div>
              </Link>

              <Link
                href="/companies"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group w-full"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <Building2 className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Mis Empresas</div>
                  <div className="text-xs text-gray-500">Gestionar empresas</div>
                </div>
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group w-full"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Settings className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Configuración</div>
                  <div className="text-xs text-gray-500">Preferencias y cuenta</div>
                </div>
              </Link>

              <Link
                href="/billing"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group w-full"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <CreditCard className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Facturación</div>
                  <div className="text-xs text-gray-500">Plan y pagos</div>
                </div>
              </Link>
            </div>

            {/* Logout */}
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-colors group w-full text-left"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 group-hover:text-red-900">Cerrar Sesión</div>
                  <div className="text-xs text-gray-500">Salir de la cuenta</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { UserMenu }