import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/check-chart-structure
 * Verifica la estructura actual de chart_of_accounts
 */
export async function GET() {
  try {
    console.log('🔍 Verificando estructura de chart_of_accounts...');

    const result = {
      table_exists: false,
      column_info: [],
      indexes: [],
      constraints: [],
      sample_data: [],
      table_count: 0,
      error: null
    };

    // 1. Verificar si la tabla existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_name', 'chart_of_accounts');

    if (tableError) {
      result.error = `Error checking table existence: ${tableError.message}`;
      return NextResponse.json(result);
    }

    result.table_exists = tableCheck && tableCheck.length > 0;

    if (!result.table_exists) {
      result.error = 'Table chart_of_accounts does not exist';
      return NextResponse.json(result);
    }

    // 2. Obtener información de columnas
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'chart_of_accounts')
      .order('ordinal_position');

    if (columnsError) {
      result.error = `Error getting columns: ${columnsError.message}`;
    } else {
      result.column_info = columns || [];
    }

    // 3. Obtener índices
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'chart_of_accounts');

    if (!indexesError) {
      result.indexes = indexes || [];
    }

    // 4. Obtener constraints
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'chart_of_accounts');

    if (!constraintsError) {
      result.constraints = constraints || [];
    }

    // 5. Intentar obtener datos de muestra (cuidadosamente)
    try {
      // Primero verificar si tiene la columna code
      const hasCodeColumn = result.column_info.some(col => col.column_name === 'code');

      if (hasCodeColumn) {
        const { data: sampleData, error: sampleError, count } = await supabase
          .from('chart_of_accounts')
          .select('*', { count: 'exact' })
          .limit(5);

        if (!sampleError) {
          result.sample_data = sampleData || [];
          result.table_count = count || 0;
        } else {
          result.error = `Error getting sample data: ${sampleError.message}`;
        }
      } else {
        // Si no tiene la columna code, intentar obtener cualquier dato disponible
        const { data: rawData, error: rawError } = await supabase
          .rpc('exec_sql', { sql: 'SELECT * FROM chart_of_accounts LIMIT 5' })
          .catch(() => ({ data: null, error: { message: 'Cannot execute raw SQL' } }));

        if (!rawError && rawData) {
          result.sample_data = rawData;
        }
      }
    } catch (sampleErr) {
      console.warn('Error getting sample data:', sampleErr);
    }

    console.log('✅ Estructura verificada:', {
      exists: result.table_exists,
      columns: result.column_info.length,
      hasCode: result.column_info.some(col => col.column_name === 'code'),
      hasCompanyId: result.column_info.some(col => col.column_name === 'company_id')
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error checking chart structure:', error);
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