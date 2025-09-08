'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FixedAsset } from '@/types';

// Cliente Supabase para real-time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RealtimeAssetsHookReturn {
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: string | null;
}

export function useRealtimeAssets(
  onAssetInserted?: (asset: FixedAsset) => void,
  onAssetUpdated?: (asset: FixedAsset) => void,
  onAssetDeleted?: (assetId: string) => void,
  userId: string = 'demo-user'
): RealtimeAssetsHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Usar refs para callbacks para evitar reconexiones
  const onAssetInsertedRef = useRef(onAssetInserted);
  const onAssetUpdatedRef = useRef(onAssetUpdated);
  const onAssetDeletedRef = useRef(onAssetDeleted);

  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onAssetInsertedRef.current = onAssetInserted;
    onAssetUpdatedRef.current = onAssetUpdated;
    onAssetDeletedRef.current = onAssetDeleted;
  }, [onAssetInserted, onAssetUpdated, onAssetDeleted]);

  useEffect(() => {
    let channel: any = null;
    let isUnmounted = false;

    const setupRealtimeSubscription = async () => {
      try {
        console.log('🔄 Configurando subscripción real-time para activos fijos...');

        // Crear un solo canal con todos los eventos
        channel = supabase
          .channel(`fixed_assets_all_${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Todos los eventos en una sola subscripción
              schema: 'public',
              table: 'fixed_assets',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              if (!isUnmounted) {
                const event = payload.eventType;
                setLastUpdate(new Date().toISOString());
                
                switch (event) {
                  case 'INSERT':
                    console.log('🆕 Nuevo activo detectado (real-time):', payload.new);
                    onAssetInsertedRef.current?.(payload.new as FixedAsset);
                    break;
                  case 'UPDATE':
                    console.log('✏️ Activo actualizado (real-time):', payload.new);
                    onAssetUpdatedRef.current?.(payload.new as FixedAsset);
                    break;
                  case 'DELETE':
                    console.log('🗑️ Activo eliminado (real-time):', payload.old);
                    onAssetDeletedRef.current?.(payload.old.id);
                    break;
                }
              }
            }
          )
          .subscribe((status) => {
            if (!isUnmounted) {
              console.log('📡 Estado de subscripción real-time:', status);
              
              if (status === 'SUBSCRIBED') {
                setIsConnected(true);
                setConnectionError(null);
                console.log('✅ Subscripción real-time activa');
              } else if (status === 'CHANNEL_ERROR') {
                setIsConnected(false);
                setConnectionError('Error en el canal de comunicación');
                console.error('❌ Error en subscripción real-time');
              } else if (status === 'TIMED_OUT') {
                setIsConnected(false);
                setConnectionError('Timeout de conexión');
                console.error('⏰ Timeout en subscripción real-time');
              }
            }
          });

      } catch (error: any) {
        if (!isUnmounted) {
          console.error('❌ Error configurando real-time:', error);
          setConnectionError(error.message || 'Error desconocido');
          setIsConnected(false);
        }
      }
    };

    setupRealtimeSubscription();

    // Cleanup al desmontar
    return () => {
      isUnmounted = true;
      if (channel) {
        console.log('🔌 Desconectando subscripción real-time...');
        channel.unsubscribe();
        setIsConnected(false);
      }
    };
  }, [userId]); // Eliminar dependencias de callbacks para evitar reconexiones constantes

  return {
    isConnected,
    connectionError,
    lastUpdate
  };
}

// Hook específico para indicadores real-time
export function useRealtimeIndicators(
  onIndicatorUpdated?: (indicator: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    let channel: any = null;

    const setupIndicatorsSubscription = async () => {
      try {
        console.log('🔄 Configurando subscripción real-time para indicadores...');

        channel = supabase
          .channel('economic_indicators_updates')
          .on(
            'postgres_changes',
            {
              event: '*', // Todos los eventos
              schema: 'public',
              table: 'economic_indicators'
            },
            (payload) => {
              console.log('📊 Indicador actualizado (real-time):', payload);
              setLastUpdate(new Date().toISOString());
              onIndicatorUpdated?.(payload.new || payload.old);
            }
          )
          .subscribe((status) => {
            console.log('📡 Estado subscripción indicadores:', status);
            setIsConnected(status === 'SUBSCRIBED');
          });

      } catch (error) {
        console.error('❌ Error en subscripción indicadores:', error);
        setIsConnected(false);
      }
    };

    setupIndicatorsSubscription();

    return () => {
      if (channel) {
        console.log('🔌 Desconectando subscripción indicadores...');
        channel.unsubscribe();
      }
    };
  }, [onIndicatorUpdated]);

  return {
    isConnected,
    lastUpdate
  };
}