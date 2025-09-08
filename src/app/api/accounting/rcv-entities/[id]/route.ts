import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/accounting/rcv-entities/[id]
 * Obtiene una entidad RCV específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entityId = params.id;
    
    if (!entityId) {
      return NextResponse.json(
        { success: false, error: 'ID de entidad es requerido' },
        { status: 400 }
      );
    }

    console.log(`🏢 Fetching RCV entity: ${entityId}`);

    const { data: entity, error } = await supabase
      .from('rcv_entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (error) {
      console.error('❌ Error fetching RCV entity:', error);
      return NextResponse.json(
        { success: false, error: 'Entidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entity
    });

  } catch (error) {
    console.error('❌ Error in RCV entity GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/rcv-entities/[id]
 * Elimina (desactiva) una entidad RCV específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entityId = params.id;
    
    if (!entityId) {
      return NextResponse.json(
        { success: false, error: 'ID de entidad es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting RCV entity: ${entityId}`);

    // En lugar de eliminar físicamente, marcar como inactiva
    const { data: deletedEntity, error } = await supabase
      .from('rcv_entities')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', entityId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deleting RCV entity:', error);
      return NextResponse.json(
        { success: false, error: 'Error eliminando entidad RCV' },
        { status: 500 }
      );
    }

    console.log(`✅ Deleted RCV entity: ${deletedEntity.entity_name}`);

    return NextResponse.json({
      success: true,
      message: 'Entidad RCV eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in RCV entity DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/rcv-entities/[id]
 * Actualiza una entidad RCV específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entityId = params.id;
    const body = await request.json();
    
    const {
      entity_name,
      entity_rut,
      entity_type,
      account_code,
      account_name,
      default_tax_rate,
      is_tax_exempt,
      contact_email,
      contact_phone,
      address,
      notes
    } = body;

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: 'ID de entidad es requerido' },
        { status: 400 }
      );
    }

    console.log(`🏢 Updating RCV entity: ${entityId}`);

    const { data: updatedEntity, error } = await supabase
      .from('rcv_entities')
      .update({
        entity_name,
        entity_rut,
        entity_type,
        account_code,
        account_name,
        default_tax_rate,
        is_tax_exempt,
        contact_email,
        contact_phone,
        address,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', entityId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating RCV entity:', error);
      return NextResponse.json(
        { success: false, error: 'Error actualizando entidad RCV' },
        { status: 500 }
      );
    }

    console.log(`✅ Updated RCV entity: ${updatedEntity.entity_name}`);

    return NextResponse.json({
      success: true,
      data: updatedEntity,
      message: 'Entidad RCV actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in RCV entity PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}