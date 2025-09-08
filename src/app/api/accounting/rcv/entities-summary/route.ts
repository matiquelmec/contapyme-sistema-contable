import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener resumen de entidades desde RCV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const onlyMissing = searchParams.get('only_missing') === 'true'; // Solo entidades no configuradas
    
    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'company_id es requerido'
      }, { status: 400 });
    }

    // Obtener resumen de entidades desde la vista
    let query = supabase
      .from('rcv_entity_summary')
      .select('*')
      .eq('company_id', companyId);
    
    if (onlyMissing) {
      query = query.eq('entity_exists', false);
    }
    
    query = query.order('total_transactions', { ascending: false });
    
    const { data: entities, error } = await query;

    if (error) {
      console.error('Error fetching entity summary:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener resumen de entidades'
      }, { status: 500 });
    }

    // Calcular estadísticas
    const stats = {
      total_entities: entities?.length || 0,
      configured_entities: entities?.filter(e => e.entity_exists).length || 0,
      missing_entities: entities?.filter(e => !e.entity_exists).length || 0,
      suppliers: entities?.filter(e => e.suggested_entity_type === 'supplier').length || 0,
      customers: entities?.filter(e => e.suggested_entity_type === 'customer').length || 0,
      both: entities?.filter(e => e.suggested_entity_type === 'both').length || 0,
      total_purchase_amount: entities?.reduce((sum, e) => sum + (e.total_purchases || 0), 0) || 0,
      total_sales_amount: entities?.reduce((sum, e) => sum + (e.total_sales || 0), 0) || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        entities: entities || [],
        statistics: stats
      },
      message: `${entities?.length || 0} entidades encontradas en RCV`
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/rcv/entities-summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST - Crear entidades faltantes masivamente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, entity_ruts } = body;

    if (!company_id || !entity_ruts || !Array.isArray(entity_ruts)) {
      return NextResponse.json({
        success: false,
        error: 'company_id y entity_ruts (array) son requeridos'
      }, { status: 400 });
    }

    // Obtener información de las entidades desde RCV
    const { data: rcvEntities, error: fetchError } = await supabase
      .from('rcv_entity_summary')
      .select('*')
      .eq('company_id', company_id)
      .in('entity_rut', entity_ruts)
      .eq('entity_exists', false);

    if (fetchError) {
      console.error('Error fetching RCV entities:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener información de entidades'
      }, { status: 500 });
    }

    if (!rcvEntities || rcvEntities.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron entidades para crear'
      }, { status: 404 });
    }

    // Crear entidades
    const createdEntities = [];
    const errors = [];

    for (const rcvEntity of rcvEntities) {
      try {
        // Determinar tipo de entidad y cuenta por defecto
        let entityType = rcvEntity.suggested_entity_type;
        let accountCode = '1.1.1.001'; // Por defecto clientes
        let accountName = 'Clientes Nacionales';

        if (entityType === 'supplier') {
          accountCode = '2.1.1.001';
          accountName = 'Proveedores Nacionales';
        } else if (entityType === 'both') {
          // Para entidades mixtas, usar la cuenta basada en mayoría de transacciones
          if (rcvEntity.purchase_count > rcvEntity.sale_count) {
            accountCode = '2.1.1.001';
            accountName = 'Proveedores Nacionales';
          }
        }

        // Crear la entidad
        const { data: newEntity, error: createError } = await supabase
          .from('rcv_entities')
          .insert({
            company_id,
            entity_name: rcvEntity.entity_name,
            entity_rut: rcvEntity.entity_rut,
            entity_business_name: rcvEntity.entity_business_name,
            entity_type: entityType,
            account_code: accountCode,
            account_name: accountName,
            default_tax_rate: 19.0,
            is_tax_exempt: false,
            is_active: true,
            notes: `Creada automáticamente desde RCV. Transacciones: ${rcvEntity.total_transactions} (Compras: ${rcvEntity.purchase_count}, Ventas: ${rcvEntity.sale_count})`
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating entity ${rcvEntity.entity_rut}:`, createError);
          errors.push({
            rut: rcvEntity.entity_rut,
            name: rcvEntity.entity_name,
            error: createError.message
          });
        } else {
          createdEntities.push(newEntity);
        }
      } catch (error) {
        console.error(`Error processing entity ${rcvEntity.entity_rut}:`, error);
        errors.push({
          rut: rcvEntity.entity_rut,
          name: rcvEntity.entity_name,
          error: 'Error al procesar entidad'
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        created: createdEntities,
        errors: errors,
        total_created: createdEntities.length,
        total_errors: errors.length
      },
      message: `${createdEntities.length} entidades creadas exitosamente${errors.length > 0 ? `, ${errors.length} con errores` : ''}`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/rcv/entities-summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}