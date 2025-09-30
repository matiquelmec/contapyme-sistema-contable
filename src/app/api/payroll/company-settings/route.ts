import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/payroll/company-settings - Obtener configuración de empresa para payroll
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id') || '8033ee69-b420-4d91-ba0e-482f46cd6fce';

    // Por ahora devolver configuración por defecto hasta implementar completamente
    const defaultSettings = {
      company_id,
      company_name: 'Empresa Demo ContaPyme',
      company_rut: '12.345.678-9',
      address: 'Av. Libertador Bernardo O\'Higgins 1234, Santiago',
      phone: '+56 2 2345 6789',
      email: 'contacto@contapyme.cl',
      
      // Configuración payroll
      default_working_hours: 45,
      overtime_rate: 1.5,
      sunday_overtime_rate: 2.0,
      
      // Previsionales
      afp_default: 'HABITAT',
      health_default: 'FONASA',
      
      // Configuración liquidaciones
      liquidation_period_start: 1,
      liquidation_period_end: 30,
      payment_day: 30,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings
    });

  } catch (error: any) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al cargar configuración de empresa',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/payroll/company-settings - Actualizar configuración de empresa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validaciones básicas
    if (!body.company_name || !body.company_rut) {
      return NextResponse.json({
        success: false,
        error: 'Nombre de empresa y RUT son requeridos'
      }, { status: 400 });
    }

    // Por ahora solo devolver éxito hasta implementar base de datos
    console.log('Saving company settings:', body);

    return NextResponse.json({
      success: true,
      message: 'Configuración de empresa guardada exitosamente',
      data: {
        ...body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error saving company settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al guardar configuración de empresa',
      details: error.message
    }, { status: 500 });
  }
}

// PUT /api/payroll/company-settings - Actualizar configuración existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Por ahora usar la misma lógica que POST
    return POST(request);

  } catch (error: any) {
    console.error('Error updating company settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar configuración de empresa',
      details: error.message
    }, { status: 500 });
  }
}