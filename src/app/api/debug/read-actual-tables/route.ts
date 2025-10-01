import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/read-actual-tables
 * Lee las tablas que realmente existen intentando acceder a ellas
 */
export async function GET() {
  try {
    console.log('🔍 Verificando tablas reales en la base de datos...');

    const result = {
      existing_tables: [],
      table_tests: [],
      chart_accounts_analysis: null,
      recommendations: []
    };

    // Lista de tablas que esperamos encontrar
    const tablesToTest = [
      'chart_of_accounts',
      'companies',
      'users',
      'users_new',
      'user_companies',
      'fixed_assets',
      'accounting_entries',
      'payroll_employees',
      'rcv_entities'
    ];

    // Probar cada tabla individualmente
    for (const tableName of tablesToTest) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);

        if (!error) {
          result.existing_tables.push(tableName);
          result.table_tests.push({
            table: tableName,
            exists: true,
            record_count: count || 0,
            sample_columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            first_record: data && data.length > 0 ? data[0] : null
          });

          console.log(`✅ Tabla ${tableName} existe con ${count || 0} registros`);
        } else {
          result.table_tests.push({
            table: tableName,
            exists: false,
            error: error.message
          });

          console.log(`❌ Tabla ${tableName} no existe: ${error.message}`);
        }
      } catch (err) {
        result.table_tests.push({
          table: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Análisis específico de chart_of_accounts
    const chartTest = result.table_tests.find(t => t.table === 'chart_of_accounts');

    if (chartTest && chartTest.exists) {
      console.log('📊 Analizando estructura de chart_of_accounts...');

      try {
        // Obtener más datos de muestra
        const { data: moreData, error: moreError } = await supabase
          .from('chart_of_accounts')
          .select('*')
          .limit(10);

        if (!moreError && moreData) {
          result.chart_accounts_analysis = {
            exists: true,
            total_records: chartTest.record_count,
            columns: chartTest.sample_columns,
            has_code: chartTest.sample_columns.includes('code'),
            has_company_id: chartTest.sample_columns.includes('company_id'),
            has_name: chartTest.sample_columns.includes('name'),
            sample_records: moreData,
            column_analysis: {}
          };

          // Analizar contenido de columnas importantes
          if (result.chart_accounts_analysis.has_code) {
            const codes = moreData.map(r => r.code).filter(c => c);
            result.chart_accounts_analysis.column_analysis.codes = codes;
          }

          if (result.chart_accounts_analysis.has_name) {
            const names = moreData.map(r => r.name).filter(n => n);
            result.chart_accounts_analysis.column_analysis.names = names;
          }

          console.log('✅ chart_of_accounts analizada exitosamente');
        }
      } catch (analysisErr) {
        result.chart_accounts_analysis = {
          exists: true,
          error: analysisErr instanceof Error ? analysisErr.message : 'Analysis failed'
        };
      }
    } else {
      result.chart_accounts_analysis = {
        exists: false,
        error: chartTest?.error || 'Table not found'
      };
    }

    // Generar recomendaciones basadas en lo encontrado
    if (!result.existing_tables.includes('chart_of_accounts')) {
      result.recommendations.push({
        priority: 'HIGH',
        issue: 'Missing chart_of_accounts table',
        action: 'Create chart_of_accounts table with proper structure',
        sql_needed: true
      });
    } else if (result.chart_accounts_analysis && !result.chart_accounts_analysis.has_code) {
      result.recommendations.push({
        priority: 'HIGH',
        issue: 'chart_of_accounts exists but missing "code" column',
        action: 'Add "code" column to chart_of_accounts table',
        sql_needed: true
      });
    }

    if (!result.existing_tables.includes('companies')) {
      result.recommendations.push({
        priority: 'MEDIUM',
        issue: 'Missing companies table',
        action: 'Create companies table for multi-tenant support'
      });
    }

    console.log('✅ Análisis de base de datos completado');
    console.log('📊 Tablas encontradas:', result.existing_tables);

    return NextResponse.json({
      success: true,
      summary: {
        total_tables_found: result.existing_tables.length,
        chart_accounts_exists: result.existing_tables.includes('chart_of_accounts'),
        critical_issues: result.recommendations.filter(r => r.priority === 'HIGH').length
      },
      data: result
    });

  } catch (error) {
    console.error('❌ Error reading actual tables:', error);
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