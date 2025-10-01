import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/check-chart-constraints
 * Verificar constraints y estructura de chart_of_accounts
 */
export async function GET() {
  try {
    console.log('🔍 Verificando constraints de chart_of_accounts...');

    const result = {
      table_exists: false,
      sample_data: [],
      columns_info: [],
      constraints: [],
      indexes: [],
      unique_constraints: [],
      code_column_analysis: null,
      recommendation: null
    };

    // 1. Verificar si la tabla existe y obtener datos
    try {
      const { data: chartData, error: chartError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .limit(5);

      if (!chartError) {
        result.table_exists = true;
        result.sample_data = chartData || [];

        if (chartData && chartData.length > 0) {
          result.columns_info = Object.keys(chartData[0]).map(key => ({
            column: key,
            sample_value: chartData[0][key],
            type: typeof chartData[0][key]
          }));
        }

        console.log('✅ chart_of_accounts existe con', chartData?.length || 0, 'registros');
      } else {
        result.table_exists = false;
        console.log('❌ chart_of_accounts no accesible:', chartError.message);
      }
    } catch (err) {
      console.log('Error accessing chart_of_accounts:', err);
    }

    // 2. Intentar obtener información de constraints usando consultas SQL
    if (result.table_exists) {
      // Análisis de la columna code específicamente
      try {
        const { data: codeAnalysis, error: codeError } = await supabase
          .from('chart_of_accounts')
          .select('code')
          .not('code', 'is', null);

        if (!codeError && codeAnalysis) {
          const codes = codeAnalysis.map(item => item.code);
          const uniqueCodes = [...new Set(codes)];

          result.code_column_analysis = {
            total_records: codes.length,
            unique_codes: uniqueCodes.length,
            has_duplicates: codes.length !== uniqueCodes.length,
            sample_codes: uniqueCodes.slice(0, 10),
            duplicates: codes.length !== uniqueCodes.length ?
              codes.filter((code, index) => codes.indexOf(code) !== index) : []
          };
        }
      } catch (codeErr) {
        console.log('Error analyzing code column:', codeErr);
      }

      // 3. Generar recomendación basada en análisis
      if (result.code_column_analysis) {
        if (result.code_column_analysis.has_duplicates) {
          result.recommendation = {
            action: 'CANNOT_CREATE_UNIQUE_CONSTRAINT',
            reason: 'La columna code tiene valores duplicados',
            duplicates: result.code_column_analysis.duplicates,
            solution: 'Limpiar duplicados antes de crear constraint único',
            alternative_sql: `
-- Opción 1: Usar foreign key sin unique constraint (menos seguro)
ALTER TABLE public.fixed_assets_categories
DROP CONSTRAINT IF EXISTS fk_categories_asset_account;

-- No crear foreign key hasta resolver duplicados en chart_of_accounts

-- Opción 2: Crear unique constraint primero (después de limpiar duplicados)
-- DELETE FROM chart_of_accounts WHERE id NOT IN (
--   SELECT MIN(id) FROM chart_of_accounts GROUP BY code
-- );
-- ALTER TABLE chart_of_accounts ADD CONSTRAINT unique_chart_code UNIQUE (code);
            `
          };
        } else if (result.code_column_analysis.unique_codes > 0) {
          result.recommendation = {
            action: 'CREATE_UNIQUE_CONSTRAINT_FIRST',
            reason: 'La columna code no tiene duplicados, se puede crear constraint único',
            solution: 'Crear constraint único en code antes de foreign key',
            sql: `
-- Crear constraint único en chart_of_accounts.code
ALTER TABLE chart_of_accounts
ADD CONSTRAINT unique_chart_code UNIQUE (code);

-- Luego crear foreign key en fixed_assets_categories
ALTER TABLE public.fixed_assets_categories
ADD CONSTRAINT fk_categories_asset_account
FOREIGN KEY (account_asset_code) REFERENCES public.chart_of_accounts(code);
            `
          };
        } else {
          result.recommendation = {
            action: 'NO_DATA_TO_REFERENCE',
            reason: 'chart_of_accounts no tiene datos en columna code',
            solution: 'Ejecutar primero la migración de chart_of_accounts'
          };
        }
      }
    } else {
      result.recommendation = {
        action: 'TABLE_NOT_EXISTS',
        reason: 'chart_of_accounts no existe',
        solution: 'Ejecutar primero la migración 20251001170000_fix_chart_of_accounts_final.sql'
      };
    }

    console.log('✅ Análisis de constraints completado');

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error checking chart constraints:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      },
      { status: 500 }
    );
  }
}