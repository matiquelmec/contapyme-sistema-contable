import { NextRequest, NextResponse } from 'next/server';

// API para actualización automática programada
// Se puede llamar desde cron jobs externos o sistemas de scheduling

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando actualización automática de indicadores...');
    
    // Verificar autorización (opcional - para seguridad)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.AUTO_UPDATE_TOKEN || 'contapyme-auto-update-2025';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Token de autorización inválido' },
        { status: 401 }
      );
    }

    // Llamar a la API híbrida para forzar actualización
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/indicators/hybrid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en actualización híbrida');
    }

    // Log del resultado
    const timestamp = new Date().toISOString();
    console.log(`✅ Actualización automática completada - ${timestamp}`);
    console.log(`📊 Fuente de datos: ${data.source}`);
    console.log(`🔢 Indicadores actualizados: ${
      Object.values(data.indicators).flat().length
    }`);

    // Opcional: Guardar en base de datos para tracking
    await logUpdateActivity({
      timestamp,
      source: data.source,
      indicatorsCount: Object.values(data.indicators).flat().length,
      success: true
    });

    return NextResponse.json({
      success: true,
      timestamp,
      source: data.source,
      indicatorsUpdated: Object.values(data.indicators).flat().length,
      message: 'Indicadores actualizados automáticamente',
      nextUpdate: getNextUpdateTime()
    });

  } catch (error) {
    console.error('❌ Error en actualización automática:', error);
    
    // Log del error
    await logUpdateActivity({
      timestamp: new Date().toISOString(),
      source: 'error',
      indicatorsCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    return NextResponse.json(
      { 
        error: 'Error en actualización automática',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET para verificar estado del sistema de auto-actualización
export async function GET(request: NextRequest) {
  try {
    const lastUpdate = await getLastUpdateInfo();
    const nextUpdate = getNextUpdateTime();
    const systemStatus = await getSystemStatus();

    return NextResponse.json({
      status: 'active',
      lastUpdate,
      nextScheduledUpdate: nextUpdate,
      systemStatus,
      intervals: {
        general: '5 minutos',
        crypto: '2 minutos', 
        currency: '5 minutos',
        monetary: '15 minutos',
        labor: '1 hora'
      },
      message: 'Sistema de auto-actualización funcionando correctamente'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error verificando estado de auto-actualización' },
      { status: 500 }
    );
  }
}

// Funciones auxiliares
async function logUpdateActivity(activity: {
  timestamp: string;
  source: string;
  indicatorsCount: number;
  success: boolean;
  error?: string;
}) {
  try {
    // Aquí se podría guardar en Supabase o base de datos local
    console.log('📝 Log de actividad:', activity);
    
    // TODO: Implementar guardado en base de datos
    // await supabase.from('update_logs').insert(activity);
  } catch (error) {
    console.error('Error guardando log de actividad:', error);
  }
}

async function getLastUpdateInfo() {
  try {
    // TODO: Obtener de base de datos
    return {
      timestamp: new Date().toISOString(),
      source: 'hybrid_system',
      success: true
    };
  } catch (error) {
    return null;
  }
}

function getNextUpdateTime(): string {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 5); // Próxima actualización en 5 minutos
  return next.toISOString();
}

async function getSystemStatus() {
  try {
    // Verificar conectividad con APIs externas
    const apis = [
      'https://mindicador.cl/api',
      'https://api.coingecko.com/api/v3/ping'
    ];

    const statuses = await Promise.all(
      apis.map(async (url) => {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 segundos timeout
          });
          return { url, status: response.ok ? 'online' : 'offline' };
        } catch {
          return { url, status: 'offline' };
        }
      })
    );

    return {
      externalApis: statuses,
      internalSystem: 'online',
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      externalApis: [],
      internalSystem: 'error',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}