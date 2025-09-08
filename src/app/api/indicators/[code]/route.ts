import { NextRequest, NextResponse } from 'next/server';
import { getIndicatorHistory } from '@/lib/database/databaseSimple';

// Hacer la ruta dinámica explícitamente
export const dynamic = 'force-dynamic';

// GET /api/indicators/[code] - Obtener historial de un indicador específico
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    // Usar nextUrl.searchParams en lugar de new URL(request.url)
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

    if (!code) {
      return NextResponse.json(
        { error: 'Código de indicador requerido' },
        { status: 400 }
      );
    }

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Los días deben estar entre 1 y 365' },
        { status: 400 }
      );
    }

    const { data, error } = await getIndicatorHistory(code, days);

    if (error) {
      console.error('Error fetching indicator history:', error);
      return NextResponse.json(
        { error: 'Error al obtener historial del indicador' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron datos para este indicador' },
        { status: 404 }
      );
    }

    // Calcular estadísticas básicas
    const values = data.map((item: any) => item.value);
    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : null;
    
    const change = previous ? latest.value - previous.value : 0;
    const changePercentage = previous && previous.value !== 0 
      ? ((latest.value - previous.value) / previous.value) * 100 
      : 0;

    const stats = {
      current: latest.value,
      change,
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      min: Math.min(...values),
      max: Math.max(...values),
      avg: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
      count: data.length
    };

    return NextResponse.json({
      indicator: {
        code,
        name: latest.name,
        unit: latest.unit,
        category: latest.category
      },
      history: data,
      statistics: stats,
      period: {
        from: data[0].date,
        to: latest.date,
        days
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}