import { NextRequest, NextResponse } from 'next/server';
import { getIndicatorsDashboard, updateIndicatorValue } from '@/lib/database/databaseSimple';

// GET /api/indicators - Obtener dashboard de indicadores económicos
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getIndicatorsDashboard();

    if (error) {
      console.error('Error fetching indicators dashboard:', error);
      return NextResponse.json(
        { error: 'Error al obtener indicadores económicos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      data: data,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/indicators - Actualizar indicador manualmente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, value, date } = body;

    if (!code || !value) {
      return NextResponse.json(
        { error: 'Código y valor son requeridos' },
        { status: 400 }
      );
    }

    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json(
        { error: 'El valor debe ser un número positivo' },
        { status: 400 }
      );
    }

    const { data, error } = await updateIndicatorValue(code, value, date);

    if (error) {
      console.error('Error updating indicator:', error);
      return NextResponse.json(
        { error: 'Error al actualizar indicador' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      indicator: data,
      message: `Indicador ${code} actualizado exitosamente`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}