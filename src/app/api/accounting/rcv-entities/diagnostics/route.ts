import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/accounting/rcv-entities/diagnostics
 * Obtiene diagnósticos del sistema de entidades RCV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || '8033ee69-b420-4d91-ba0e-482f46cd6fce';

    console.log(`🔍 Running RCV entities diagnostics for company: ${companyId}`);

    const diagnostics = {
      database_status: 'healthy',
      entities_summary: {
        total: 0,
        active: 0,
        suppliers: 0,
        customers: 0,
        both: 0,
        with_accounts: 0,
        without_accounts: 0
      },
      account_validation: {
        valid_accounts: 0,
        invalid_accounts: 0,
        missing_accounts: 0
      },
      integration_readiness: {
        ready_for_rcv_integration: false,
        automation_percentage: 0,
        issues: []
      },
      recommendations: []
    };

    try {
      // Obtener estadísticas de entidades
      const { data: entities, error: entitiesError } = await supabase
        .from('rcv_entities')
        .select('*')
        .eq('company_id', companyId);

      if (entitiesError) {
        diagnostics.database_status = 'error';
        diagnostics.integration_readiness.issues.push(`Error de base de datos: ${entitiesError.message}`);
      } else if (entities) {
        diagnostics.entities_summary.total = entities.length;
        diagnostics.entities_summary.active = entities.filter(e => e.is_active).length;
        diagnostics.entities_summary.suppliers = entities.filter(e => e.entity_type === 'supplier' || e.entity_type === 'both').length;
        diagnostics.entities_summary.customers = entities.filter(e => e.entity_type === 'customer' || e.entity_type === 'both').length;
        diagnostics.entities_summary.both = entities.filter(e => e.entity_type === 'both').length;
        diagnostics.entities_summary.with_accounts = entities.filter(e => e.account_code && e.account_name).length;
        diagnostics.entities_summary.without_accounts = entities.filter(e => !e.account_code || !e.account_name).length;
      }

      // Validar cuentas contables
      const { data: chartAccounts } = await supabase
        .from('chart_of_accounts')
        .select('code, name')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (entities && chartAccounts) {
        const validAccountCodes = new Set(chartAccounts.map(acc => acc.code));
        
        let validAccounts = 0;
        let invalidAccounts = 0;
        
        entities.forEach(entity => {
          if (entity.account_code) {
            if (validAccountCodes.has(entity.account_code)) {
              validAccounts++;
            } else {
              invalidAccounts++;
              diagnostics.integration_readiness.issues.push(
                `Entidad "${entity.entity_name}" usa cuenta inválida: ${entity.account_code}`
              );
            }
          }
        });

        diagnostics.account_validation.valid_accounts = validAccounts;
        diagnostics.account_validation.invalid_accounts = invalidAccounts;
        diagnostics.account_validation.missing_accounts = diagnostics.entities_summary.without_accounts;
      }

      // Calcular preparación para integración
      const totalEntities = diagnostics.entities_summary.active;
      const entitiesWithValidAccounts = diagnostics.account_validation.valid_accounts;
      
      if (totalEntities > 0) {
        diagnostics.integration_readiness.automation_percentage = Math.round(
          (entitiesWithValidAccounts / totalEntities) * 100
        );
        diagnostics.integration_readiness.ready_for_rcv_integration = 
          diagnostics.integration_readiness.automation_percentage >= 50;
      }

      // Generar recomendaciones
      if (diagnostics.entities_summary.total === 0) {
        diagnostics.recommendations.push({
          priority: 'high',
          title: 'Sin entidades configuradas',
          description: 'Agrega proveedores y clientes con sus cuentas contables específicas para automatizar asientos RCV',
          action: 'Crear entidades RCV'
        });
      } else {
        if (diagnostics.entities_summary.without_accounts > 0) {
          diagnostics.recommendations.push({
            priority: 'medium',
            title: `${diagnostics.entities_summary.without_accounts} entidades sin cuenta contable`,
            description: 'Configura cuentas contables para estas entidades para automatizar completamente los asientos',
            action: 'Configurar cuentas faltantes'
          });
        }

        if (diagnostics.account_validation.invalid_accounts > 0) {
          diagnostics.recommendations.push({
            priority: 'high',
            title: `${diagnostics.account_validation.invalid_accounts} cuentas inválidas detectadas`,
            description: 'Algunas entidades tienen códigos de cuenta que no existen en el plan de cuentas',
            action: 'Corregir cuentas inválidas'
          });
        }

        if (diagnostics.integration_readiness.automation_percentage < 80) {
          diagnostics.recommendations.push({
            priority: 'low',
            title: 'Mejorar nivel de automatización',
            description: `Actualmente ${diagnostics.integration_readiness.automation_percentage}% de entidades están listas para automatización`,
            action: 'Configurar más entidades con cuentas específicas'
          });
        }
      }

      if (diagnostics.integration_readiness.automation_percentage >= 80) {
        diagnostics.recommendations.push({
          priority: 'info',
          title: '¡Sistema listo para automatización!',
          description: 'Tu sistema está configurado para automatizar la mayoría de los asientos RCV',
          action: 'Procesar RCV con automatización activada'
        });
      }

    } catch (error) {
      console.error('Error running diagnostics:', error);
      diagnostics.database_status = 'error';
      diagnostics.integration_readiness.issues.push(`Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    console.log(`✅ Diagnostics completed: ${diagnostics.integration_readiness.automation_percentage}% automation ready`);

    return NextResponse.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    console.error('❌ Error in diagnostics endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Error ejecutando diagnósticos' },
      { status: 500 }
    );
  }
}