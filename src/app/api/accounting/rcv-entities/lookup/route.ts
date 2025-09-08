import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/accounting/rcv-entities/lookup?rut=12.345.678-9&company_id=xxx
// Busca una entidad RCV específica por RUT para integración automática
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rut = searchParams.get('rut');
    const companyId = searchParams.get('company_id') || '8033ee69-b420-4d91-ba0e-482f46cd6fce';

    if (!rut) {
      return NextResponse.json({
        success: false,
        error: 'RUT es requerido para la búsqueda'
      }, { status: 400 });
    }

    // Limpiar el RUT - remover espacios y puntos extra
    const cleanRut = rut.trim().replace(/\s+/g, '');
    
    console.log(`🔍 Lookup RCV Entity - RUT: ${cleanRut}, Company: ${companyId}`);

    // Buscar entidad exacta por RUT
    const { data: entity, error } = await supabase
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
      .eq('company_id', companyId)
      .eq('entity_rut', cleanRut)
      .eq('is_active', true)
      .single();

    if (error) {
      console.log(`❌ Entity not found: ${error.message}`);
      return NextResponse.json({
        success: false,
        error: 'Entidad no encontrada',
        entity_found: false,
        details: error.message
      }, { status: 404 });
    }

    if (!entity) {
      return NextResponse.json({
        success: false,
        error: `No se encontró ninguna entidad activa con RUT ${cleanRut}`,
        entity_found: false
      }, { status: 404 });
    }

    console.log(`✅ Entity found: ${entity.entity_name} - Account: ${entity.account_code}`);

    return NextResponse.json({
      success: true,
      entity_found: true,
      data: {
        id: entity.id,
        entity_name: entity.entity_name,
        entity_rut: entity.entity_rut,
        entity_business_name: entity.entity_business_name,
        entity_type: entity.entity_type,
        account_code: entity.account_code,
        account_name: entity.account_name,
        account_type: entity.account_type,
        default_tax_rate: entity.default_tax_rate,
        is_tax_exempt: entity.is_tax_exempt,
        // Información útil para integración automática
        suggested_accounts: {
          main_account: {
            code: entity.account_code,
            name: entity.account_name,
            type: entity.account_type
          },
          tax_rate: entity.default_tax_rate,
          is_exempt: entity.is_tax_exempt
        }
      },
      message: `Entidad encontrada: ${entity.entity_name}`
    });

  } catch (error) {
    console.error('Error in RCV entity lookup:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno en búsqueda de entidad',
      entity_found: false,
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}