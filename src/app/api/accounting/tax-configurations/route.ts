import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabaseConfig';

export const dynamic = 'force-dynamic';

// GET - Obtener todas las configuraciones de impuestos de una empresa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'company_id es requerido' 
      }, { status: 400 });
    }

    // Obtener configuraciones usando la función de la base de datos
    const { data: configurations, error } = await supabase
      .rpc('get_company_tax_configs', { p_company_id: companyId });

    if (error) {
      console.error('Error getting tax configurations:', error);
      
      // Si la tabla o función no existe, devolver configuraciones por defecto
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.message?.includes('function')) {
        return NextResponse.json({ 
          success: true, 
          data: [
            {
              id: 'default-iva-19',
              company_id: companyId,
              tax_type: 'iva_19',
              tax_name: 'IVA 19%',
              tax_rate: 19.0,
              is_active: true,
              message: 'Configuración por defecto (tabla no creada aún)'
            }
          ],
          stats: {
            total_configurations: 1,
            active_configurations: 1,
            message: 'Datos por defecto - crear tabla para configuraciones reales'
          },
          count: 1
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Error al obtener configuraciones: ' + error.message 
      }, { status: 500 });
    }

    // Obtener estadísticas
    const { data: stats, error: statsError } = await supabase
      .rpc('get_tax_config_stats', { p_company_id: companyId });

    if (statsError) {
      console.error('Error getting stats:', statsError);
    }

    return NextResponse.json({ 
      success: true, 
      data: configurations || [],
      stats: stats || {},
      count: configurations?.length || 0
    });

  } catch (error) {
    console.error('Error in GET tax configurations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

// POST - Crear nueva configuración de impuesto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      company_id,
      tax_type,
      tax_name,
      tax_rate,
      sales_account_code,
      sales_account_name,
      purchases_account_code,
      purchases_account_name
    } = body;

    // Validaciones básicas
    if (!company_id || !tax_type || !tax_name) {
      return NextResponse.json({ 
        success: false, 
        error: 'company_id, tax_type y tax_name son requeridos' 
      }, { status: 400 });
    }

    // Verificar si ya existe una configuración para este tipo de impuesto
    const { data: existing, error: checkError } = await supabase
      .from('tax_account_configurations')
      .select('id')
      .eq('company_id', company_id)
      .eq('tax_type', tax_type)
      .single();

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: `Ya existe una configuración para el impuesto ${tax_name}` 
      }, { status: 409 });
    }

    // Insertar nueva configuración
    const { data: newConfig, error } = await supabase
      .from('tax_account_configurations')
      .insert({
        company_id,
        tax_type,
        tax_name,
        tax_rate: tax_rate ? parseFloat(tax_rate) : null,
        sales_account_code,
        sales_account_name,
        purchases_account_code,
        purchases_account_name,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tax configuration:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error al crear configuración: ' + error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: newConfig,
      message: `Configuración de ${tax_name} creada exitosamente` 
    });

  } catch (error) {
    console.error('Error in POST tax configurations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

// PUT - Actualizar configuración existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      tax_name,
      tax_rate,
      sales_account_code,
      sales_account_name,
      purchases_account_code,
      purchases_account_name,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de configuración es requerido' 
      }, { status: 400 });
    }

    // Actualizar configuración
    const { data: updatedConfig, error } = await supabase
      .from('tax_account_configurations')
      .update({
        tax_name,
        tax_rate: tax_rate ? parseFloat(tax_rate) : null,
        sales_account_code,
        sales_account_name,
        purchases_account_code,
        purchases_account_name,
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tax configuration:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error al actualizar configuración: ' + error.message 
      }, { status: 500 });
    }

    if (!updatedConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración no encontrada' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedConfig,
      message: `Configuración de ${tax_name} actualizada exitosamente` 
    });

  } catch (error) {
    console.error('Error in PUT tax configurations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

// DELETE - Eliminar configuración (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de configuración es requerido' 
      }, { status: 400 });
    }

    if (force) {
      // Eliminación física
      const { error } = await supabase
        .from('tax_account_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting tax configuration:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Error al eliminar configuración: ' + error.message 
        }, { status: 500 });
      }
    } else {
      // Eliminación lógica (soft delete)
      const { error } = await supabase
        .from('tax_account_configurations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating tax configuration:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Error al desactivar configuración: ' + error.message 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración eliminada exitosamente' 
    });

  } catch (error) {
    console.error('Error in DELETE tax configurations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}