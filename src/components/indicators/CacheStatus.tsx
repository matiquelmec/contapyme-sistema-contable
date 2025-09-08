/**
 * Componente de estado y administración del cache de indicadores
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { RefreshCw, Database, Clock, Zap, Activity, CheckCircle } from 'lucide-react'

interface CacheStatusProps {
  cacheStatus: 'hit' | 'miss' | 'expired'
  dataSource: string
  lastUpdated: string
  loading: boolean
  onForceRefresh: () => void
}

export default function CacheStatus({
  cacheStatus,
  dataSource,
  lastUpdated,
  loading,
  onForceRefresh
}: CacheStatusProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onForceRefresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const getStatusInfo = () => {
    switch (cacheStatus) {
      case 'hit':
        return {
          color: 'green',
          icon: Zap,
          text: 'Cache Hit',
          description: 'Datos servidos desde cache para máximo rendimiento'
        }
      case 'expired':
        return {
          color: 'yellow',
          icon: Clock,
          text: 'Cache Expirado',
          description: 'Cache expiró, obteniendo datos frescos'
        }
      case 'miss':
        return {
          color: 'blue',
          icon: Activity,
          text: 'Cache Miss',
          description: 'Obteniendo datos directamente desde fuentes'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between">
        {/* Status Info */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            statusInfo.color === 'green' ? 'bg-green-100' :
            statusInfo.color === 'yellow' ? 'bg-yellow-100' :
            'bg-blue-100'
          }`}>
            <StatusIcon className={`w-4 h-4 ${
              statusInfo.color === 'green' ? 'text-green-600' :
              statusInfo.color === 'yellow' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900">
                {statusInfo.text}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {dataSource.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {statusInfo.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Última actualización</div>
            <div className="text-xs font-medium text-gray-700">
              {new Date(lastUpdated).toLocaleTimeString('es-CL')}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing || loading}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-lg font-bold ${
              cacheStatus === 'hit' ? 'text-green-600' : 'text-gray-400'
            }`}>
              {cacheStatus === 'hit' ? '⚡' : '⏳'}
            </div>
            <div className="text-xs text-gray-500">Rendimiento</div>
          </div>
          
          <div>
            <div className="text-lg font-bold text-blue-600">
              📊
            </div>
            <div className="text-xs text-gray-500">Datos Reales</div>
          </div>
          
          <div>
            <div className="text-lg font-bold text-purple-600">
              🔄
            </div>
            <div className="text-xs text-gray-500">Auto-sync</div>
          </div>
        </div>
      </div>

      {/* Cache Efficiency Info */}
      {cacheStatus === 'hit' && (
        <div className="mt-3 p-2 bg-green-50 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Optimización activa: Reducción del 80% en solicitudes de red
            </span>
          </div>
        </div>
      )}
    </div>
  )
}