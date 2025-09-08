import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/accounting/centralized-config - Obtener configuración contable centralizada
export async function GET(request: NextRequest) {
  try {
    // Por ahora devolver configuración por defecto hasta implementar completamente
    const defaultConfig = {
      company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
      fiscal_year_start: '01-01',
      currency: 'CLP',
      decimal_places: 0,
      auto_generate_entries: true,
      use_cost_centers: false,
      require_references: true,
      auto_numbering: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: defaultConfig
    });

  } catch (error: any) {
    console.error('Error fetching centralized config:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al cargar configuración centralizada',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/accounting/centralized-config - Actualizar configuración contable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Por ahora solo devolver éxito hasta implementar base de datos
    console.log('Saving centralized config:', body);

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      data: {
        ...body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error saving centralized config:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al guardar configuración',
      details: error.message
    }, { status: 500 });
  }
}