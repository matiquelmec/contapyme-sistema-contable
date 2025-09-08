import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Búsqueda rápida de entidades RCV por RUT
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const rut = searchParams.get('rut');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    if (!rut) {
      return NextResponse.json({
        success: false,
        error: 'rut es requerido para búsqueda'
      }, { status: 400 });
    }

    // Usar la función PostgreSQL para búsqueda optimizada
    const { data: entities, error } = await supabase
      .rpc('get_rcv_entity_by_rut', {
        p_company_id: companyId,
        p_rut: rut
      });

    if (error) {
      console.error('Error searching RCV entity by RUT:', error);
      return NextResponse.json({
        success: false,
        error: 'Error en búsqueda de entidad'
      }, { status: 500 });
    }

    // Si se encuentra la entidad, devolver los datos completos
    if (entities && entities.length > 0) {
      const entity = entities[0];
      return NextResponse.json({
        success: true,
        found: true,
        data: {
          id: entity.id,
          entity_name: entity.entity_name,
          entity_rut: entity.entity_rut,
          account_code: entity.account_code,
          account_name: entity.account_name,
          default_tax_rate: entity.default_tax_rate,
          is_tax_exempt: entity.is_tax_exempt
        },
        message: `Entidad encontrada: ${entity.entity_name}`
      });
    }

    // Si no se encuentra, devolver respuesta vacía
    return NextResponse.json({
      success: true,
      found: false,
      data: null,
      message: `No se encontró entidad con RUT ${rut}`
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/rcv-entities/search:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST - Búsqueda avanzada con múltiples criterios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_id, 
      search_term, 
      entity_type, 
      is_active,
      account_type,
      limit = 20 
    } = body;

    if (!company_id) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    let query = supabase
      .from('rcv_entities')
      .select(`
        id,
        entity_name,
        entity_rut,
        entity_business_name,
        entity_type,
        account_code,
        account_name,
        account_type,
        default_tax_rate,
        is_tax_exempt,
        is_active
      `)
      .eq('company_id', company_id);

    // Filtros
    if (entity_type && entity_type !== 'all') {
      query = query.eq('entity_type', entity_type);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (account_type && account_type !== 'all') {
      query = query.eq('account_type', account_type);
    }

    // Búsqueda de texto
    if (search_term && search_term.trim()) {
      const term = search_term.trim();
      query = query.or(`entity_name.ilike.%${term}%,entity_rut.ilike.%${term}%,entity_business_name.ilike.%${term}%,account_name.ilike.%${term}%`);
    }

    // Límite y orden
    query = query
      .order('entity_name', { ascending: true })
      .limit(limit);

    const { data: entities, error } = await query;

    if (error) {
      console.error('Error in advanced search:', error);
      return NextResponse.json({
        success: false,
        error: 'Error en búsqueda avanzada'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: entities || [],
      total_found: entities?.length || 0,
      message: `${entities?.length || 0} entidades encontradas`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/rcv-entities/search:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}