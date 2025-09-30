import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/accounting/rcv-entities
 * Obtiene entidades RCV configuradas con cuentas contables específicas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const entityType = searchParams.get('entity_type'); // 'supplier', 'customer', 'both'
    const search = searchParams.get('search');
    const hasAccounts = searchParams.get('has_accounts') === 'true';

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log(`🏢 Fetching RCV entities for company: ${companyId}`);

    let query = supabase
      .from('rcv_entities')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('entity_name');

    // Filtrar por tipo de entidad
    if (entityType && entityType !== 'all') {
      if (entityType === 'supplier' || entityType === 'customer') {
        query = query.in('entity_type', [entityType, 'both']);
      } else {
        query = query.eq('entity_type', entityType);
      }
    }

    // Filtrar solo entidades con cuentas configuradas
    if (hasAccounts) {
      query = query.not('account_code', 'is', null);
    }

    // Búsqueda por texto
    if (search && search.trim()) {
      query = query.or(`entity_name.ilike.%${search.trim()}%,entity_rut.ilike.%${search.trim()}%`);
    }

    const { data: entities, error } = await query;

    if (error) {
      console.error('❌ Error fetching RCV entities:', error);
      return NextResponse.json(
        { success: false, error: 'Error obteniendo entidades RCV' },
        { status: 500 }
      );
    }

    // Obtener estadísticas
    const stats = {
      total: entities?.length || 0,
      suppliers: entities?.filter(e => e.entity_type === 'supplier' || e.entity_type === 'both').length || 0,
      customers: entities?.filter(e => e.entity_type === 'customer' || e.entity_type === 'both').length || 0,
      withAccounts: entities?.filter(e => e.account_code && e.account_name).length || 0
    };

    console.log(`✅ Found ${stats.total} RCV entities, ${stats.withAccounts} with accounts`);

    return NextResponse.json({
      success: true,
      data: entities || [],
      stats
    });

  } catch (error) {
    console.error('❌ Error in RCV entities GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/rcv-entities
 * Crea nueva entidad RCV con cuenta contable específica
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id,
      entity_name,
      entity_rut,
      entity_type,
      account_code,
      account_name,
      default_tax_rate = 19.0,
      is_tax_exempt = false,
      contact_email,
      contact_phone,
      address,
      notes
    } = body;

    if (!company_id || !entity_name || !entity_rut || !entity_type) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: company_id, entity_name, entity_rut, entity_type' },
        { status: 400 }
      );
    }

    if (!['supplier', 'customer', 'both'].includes(entity_type)) {
      return NextResponse.json(
        { success: false, error: 'entity_type debe ser: supplier, customer, o both' },
        { status: 400 }
      );
    }

    console.log(`🏢 Creating RCV entity: ${entity_name} (${entity_rut})`);

    // Verificar que no existe ya una entidad con el mismo RUT para esta empresa
    const { data: existing } = await supabase
      .from('rcv_entities')
      .select('id, entity_name')
      .eq('company_id', company_id)
      .eq('entity_rut', entity_rut)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe una entidad con RUT ${entity_rut}: ${existing.entity_name}` },
        { status: 409 }
      );
    }

    // Crear la nueva entidad
    const { data: newEntity, error } = await supabase
      .from('rcv_entities')
      .insert({
        company_id,
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
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating RCV entity:', error);
      return NextResponse.json(
        { success: false, error: 'Error creando entidad RCV' },
        { status: 500 }
      );
    }

    console.log(`✅ Created RCV entity: ${newEntity.entity_name} with account ${newEntity.account_code}`);

    return NextResponse.json({
      success: true,
      data: newEntity,
      message: 'Entidad RCV creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in RCV entities POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/rcv-entities
 * Actualiza entidad RCV existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de entidad es requerido' },
        { status: 400 }
      );
    }

    console.log(`🏢 Updating RCV entity: ${id}`);

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
      .eq('id', id)
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
    console.error('❌ Error in RCV entities PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}