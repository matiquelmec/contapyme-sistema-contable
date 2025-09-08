import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * POST /api/accounting/journal-book/integration/rcv-detailed-auto
 * SISTEMA AUTOMÁTICO DE ASIENTOS DETALLADOS USANDO CUENTAS ESPECÍFICAS DE ENTIDADES RCV
 * 
 * Este endpoint reemplaza la integración genérica con asientos específicos línea por línea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, transactions } = body;

    console.log('🚀 PROCESANDO ASIENTOS DETALLADOS CON CUENTAS ESPECÍFICAS');
    
    const results = [];
    
    for (const transaction of transactions) {
      if (transaction.type === 'rcv') {
        console.log(`📋 Procesando RCV ${transaction.id} con sistema detallado`);
        
        // Usar el sistema detallado que ya creamos
        const detailedResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/accounting/journal-book/integration/rcv-detailed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id,
            period: transaction.data.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            rcv_data: transaction.data.transacciones || transaction.data.transactions || [],
            rcv_type: transaction.subtype || 'purchase',
            options: {
              save_to_database: true,
              allow_default_accounts: true,
              include_export_format: false
            }
          })
        });

        const result = await detailedResponse.json();
        
        if (result.success) {
          console.log('✅ Asientos detallados creados exitosamente');
          results.push({
            id: transaction.id,
            success: true,
            journal_entries_created: result.data.summary.total_entries_generated,
            total_lines_generated: result.data.summary.total_lines_generated,
            entities_with_specific_accounts: result.data.summary.entities_with_accounts,
            message: `${result.data.summary.total_entries_generated} asientos creados con ${result.data.summary.total_lines_generated} líneas detalladas`
          });
        } else {
          console.error('❌ Error creando asientos detallados:', result.error);
          results.push({
            id: transaction.id,
            success: false,
            error: result.error
          });
        }
      } else {
        // Para otros tipos de transacciones, usar el sistema original
        const originalResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/accounting/journal-book/integration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id,
            transactions: [transaction],
            create_journal_entries: true
          })
        });

        const result = await originalResponse.json();
        results.push(result.data?.results?.[0] || { id: transaction.id, success: false, error: 'Error procesando transacción' });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });

  } catch (error) {
    console.error('❌ Error en procesamiento automático detallado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/accounting/journal-book/integration/rcv-detailed-auto
 * Obtiene información sobre el sistema de integración detallada
 */
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

    // Obtener estadísticas de entidades configuradas
    const { data: entities } = await supabase
      .from('rcv_entities')
      .select('entity_rut, entity_name, account_code, account_name, entity_type')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const stats = {
      total_entities: entities?.length || 0,
      entities_with_accounts: entities?.filter(e => e.account_code).length || 0,
      suppliers: entities?.filter(e => e.entity_type === 'supplier' || e.entity_type === 'both').length || 0,
      customers: entities?.filter(e => e.entity_type === 'customer' || e.entity_type === 'both').length || 0,
      coverage_percentage: entities?.length > 0 ? 
        ((entities?.filter(e => e.account_code).length || 0) / entities.length) * 100 : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        system_status: {
          enabled: true,
          type: 'detailed_with_entity_accounts',
          description: 'Sistema automático de asientos detallados con cuentas específicas por entidad'
        },
        entity_configuration: stats,
        benefits: [
          'Asientos detallados línea por línea por cada transacción RCV',
          'Uso automático de cuentas contables específicas por entidad',
          'Fallback a cuentas genéricas para entidades sin configurar',
          'Validación automática de balance de asientos',
          'Procesamiento por lotes para archivos grandes'
        ],
        recommendations: stats.coverage_percentage < 100 ? [
          `Configure cuentas contables para ${stats.total_entities - stats.entities_with_accounts} entidades restantes`,
          'Vaya a /accounting/configuration → Entidades RCV para configurar',
          'Mayor cobertura = mayor automatización de asientos'
        ] : [
          '¡Sistema completamente configurado!',
          'Todas las entidades tienen cuentas específicas asignadas'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo información del sistema:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}