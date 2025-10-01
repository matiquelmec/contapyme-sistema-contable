import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/read-database-structure
 * Lee la estructura COMPLETA de la base de datos actual
 */
export async function GET() {
  try {
    console.log('🔍 Leyendo estructura completa de la base de datos...');

    const result = {
      tables: [],
      chart_accounts_info: null,
      companies_info: null,
      users_info: null,
      error: null
    };

    // 1. Obtener TODAS las tablas que existen
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      result.error = `Error getting tables: ${tablesError.message}`;
      return NextResponse.json(result);
    }

    result.tables = allTables || [];
    console.log('📋 Tablas encontradas:', result.tables.map(t => t.table_name));

    // 2. Verificar específicamente chart_of_accounts
    const chartTableExists = result.tables.some(t => t.table_name === 'chart_of_accounts');

    if (chartTableExists) {
      console.log('✅ Tabla chart_of_accounts EXISTE');

      // Obtener estructura de chart_of_accounts
      const { data: chartColumns, error: chartColError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'chart_of_accounts')
        .order('ordinal_position');

      if (!chartColError) {
        result.chart_accounts_info = {
          table_exists: true,
          columns: chartColumns,
          has_code: chartColumns?.some(c => c.column_name === 'code') || false,
          has_company_id: chartColumns?.some(c => c.column_name === 'company_id') || false,
          sample_data: null,
          record_count: 0
        };

        // Intentar obtener datos de muestra
        try {
          const { data: sampleData, error: sampleError, count } = await supabase
            .from('chart_of_accounts')
            .select('*', { count: 'exact' })
            .limit(5);

          if (!sampleError) {
            result.chart_accounts_info.sample_data = sampleData;
            result.chart_accounts_info.record_count = count || 0;
          } else {
            result.chart_accounts_info.sample_error = sampleError.message;
          }
        } catch (err) {
          result.chart_accounts_info.sample_error = 'Cannot read sample data';
        }
      } else {
        result.chart_accounts_info = {
          table_exists: true,
          error: chartColError.message
        };
      }
    } else {
      console.log('❌ Tabla chart_of_accounts NO EXISTE');
      result.chart_accounts_info = {
        table_exists: false,
        message: 'Table chart_of_accounts does not exist in the database'
      };
    }

    // 3. Verificar tabla companies
    const companiesExists = result.tables.some(t => t.table_name === 'companies');

    if (companiesExists) {
      const { data: companiesData, error: companiesError, count } = await supabase
        .from('companies')
        .select('id, business_name, rut, status', { count: 'exact' })
        .limit(3);

      result.companies_info = {
        table_exists: true,
        record_count: count || 0,
        sample_data: companiesData,
        error: companiesError?.message || null
      };
    } else {
      result.companies_info = {
        table_exists: false
      };
    }

    // 4. Verificar usuarios
    const usersNewExists = result.tables.some(t => t.table_name === 'users_new');
    const usersExists = result.tables.some(t => t.table_name === 'users');

    if (usersNewExists) {
      const { data: usersData, error: usersError, count } = await supabase
        .from('users_new')
        .select('id, email, full_name', { count: 'exact' })
        .limit(3);

      result.users_info = {
        table_type: 'users_new',
        table_exists: true,
        record_count: count || 0,
        sample_data: usersData,
        error: usersError?.message || null
      };
    } else if (usersExists) {
      const { data: usersData, error: usersError, count } = await supabase
        .from('users')
        .select('id, email, full_name', { count: 'exact' })
        .limit(3);

      result.users_info = {
        table_type: 'users',
        table_exists: true,
        record_count: count || 0,
        sample_data: usersData,
        error: usersError?.message || null
      };
    } else {
      result.users_info = {
        table_exists: false
      };
    }

    console.log('✅ Estructura de base de datos leída completamente');
    console.log('📊 Resumen:', {
      total_tables: result.tables.length,
      chart_accounts_exists: result.chart_accounts_info?.table_exists || false,
      companies_exists: result.companies_info?.table_exists || false,
      users_exists: result.users_info?.table_exists || false
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error reading database structure:', error);
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