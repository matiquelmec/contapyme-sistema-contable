'use client'

import { useEffect, useState } from 'react'

interface ActivityItem {
  id: string
  action: string
  description: string
  metadata: Record<string, any>
  created_at: string
  company_name?: string
}

interface RecentActivityProps {
  userId: string
}

export default function RecentActivity({ userId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [userId])

  const fetchRecentActivity = async () => {
    try {
      // Por ahora usaremos datos mock hasta que la API esté lista
      // TODO: Implementar llamada real a la API cuando esté disponible
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          action: 'f29_analysis',
          description: 'Análisis F29 procesado exitosamente',
          metadata: { period: '202410', confidence: 95 },
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
          company_name: 'Mi Empresa Demo'
        },
        {
          id: '2',
          action: 'employee_created',
          description: 'Nuevo empleado agregado al sistema',
          metadata: { employee_name: 'Juan Pérez', position: 'Desarrollador' },
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 horas atrás
          company_name: 'Mi Empresa Demo'
        },
        {
          id: '3',
          action: 'indicators_updated',
          description: 'Indicadores económicos actualizados automáticamente',
          metadata: { indicators: ['UF', 'UTM', 'USD'] },
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 día atrás
        },
        {
          id: '4',
          action: 'fixed_asset_created',
          description: 'Nuevo activo fijo registrado en inventario',
          metadata: { asset_name: 'Computador Dell OptiPlex', value: 850000 },
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días atrás
          company_name: 'Mi Empresa Demo'
        },
        {
          id: '5',
          action: 'company_created',
          description: 'Nueva empresa creada en tu cuenta',
          metadata: { company_name: 'Mi Empresa Demo', rut: '12.345.678-9' },
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días atrás
        }
      ]

      // Simular delay de API
      setTimeout(() => {
        setActivities(mockActivities)
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error fetching activities:', error)
      setLoading(false)
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'f29_analysis':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'bg-blue-500 text-white',
          bgColor: 'bg-blue-50'
        }
      case 'employee_created':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          ),
          color: 'bg-green-500 text-white',
          bgColor: 'bg-green-50'
        }
      case 'indicators_updated':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'bg-yellow-500 text-white',
          bgColor: 'bg-yellow-50'
        }
      case 'fixed_asset_created':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
          color: 'bg-purple-500 text-white',
          bgColor: 'bg-purple-50'
        }
      case 'company_created':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          color: 'bg-indigo-500 text-white',
          bgColor: 'bg-indigo-50'
        }
      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'bg-gray-500 text-white',
          bgColor: 'bg-gray-50'
        }
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays > 0) {
      return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`
    } else if (diffInHours > 0) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`
    } else {
      return 'Hace menos de 1 hora'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            <p className="text-sm text-gray-600 mt-1">
              Últimas acciones realizadas en tu cuenta
            </p>
          </div>
          <button
            onClick={fetchRecentActivity}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const iconData = getActivityIcon(activity.action)
              return (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-4 p-4 rounded-lg ${iconData.bgColor} border border-gray-200 hover:shadow-sm transition-shadow`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconData.color}`}>
                    {iconData.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <div className="mt-1 space-y-1">
                      {activity.company_name && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Empresa:</span> {activity.company_name}
                        </p>
                      )}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="text-sm text-gray-600">
                          {activity.action === 'f29_analysis' && activity.metadata.period && (
                            <span>Período: {activity.metadata.period}</span>
                          )}
                          {activity.action === 'employee_created' && activity.metadata.employee_name && (
                            <span>Empleado: {activity.metadata.employee_name}</span>
                          )}
                          {activity.action === 'fixed_asset_created' && activity.metadata.asset_name && (
                            <span>Activo: {activity.metadata.asset_name}</span>
                          )}
                          {activity.action === 'company_created' && activity.metadata.company_name && (
                            <span>Empresa: {activity.metadata.company_name}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay actividad reciente
            </h3>
            <p className="text-gray-600">
              Comienza a usar ContaPyme para ver tu actividad aquí
            </p>
          </div>
        )}

        {activities.length > 0 && (
          <div className="mt-6 text-center">
            <a
              href="/settings/activity"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver toda la actividad →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}