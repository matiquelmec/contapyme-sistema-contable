import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * GET /api/debug/db-structure
 * Debug endpoint para verificar estructura de base de datos
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Verificando estructura de base de datos...')

    // Verificar conexión a Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('companies')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error('❌ Error de conexión Supabase:', connectionError)
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a Supabase',
        details: connectionError
      }, { status: 500 })
    }

    // Obtener todas las tablas de la base de datos usando SQL directo
    let tables = null
    let tablesError = null

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_tables')
      tables = rpcData
      tablesError = rpcError
    } catch {
      // Fallback si no existe la función, usar consulta SQL directa
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      tables = data
      tablesError = error
    }

    // Verificar tablas específicas del sistema multi-empresa
    const criticalTables = ['users', 'users_new', 'companies', 'user_companies', 'subscriptions', 'user_activity_log']
    const tableStatus = {}

    for (const tableName of criticalTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        tableStatus[tableName] = {
          exists: !error,
          error: error?.message || null,
          hasData: data && data.length > 0
        }
      } catch (err) {
        tableStatus[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
          hasData: false
        }
      }
    }

    // Verificar estructura de tabla users existente
    let usersStructure = null
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      if (!usersError && usersData) {
        // Obtener estructura de columnas
        const sampleUser = usersData[0]
        usersStructure = {
          hasData: usersData.length > 0,
          columns: sampleUser ? Object.keys(sampleUser) : [],
          sampleRecord: sampleUser || null
        }
      }
    } catch (err) {
      usersStructure = { error: 'No se pudo obtener estructura de users' }
    }

    // Verificar estructura de tabla companies
    let companiesStructure = null
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .limit(1)

      if (!companiesError && companiesData) {
        companiesStructure = {
          hasData: companiesData.length > 0,
          columns: companiesData[0] ? Object.keys(companiesData[0]) : [],
          sampleRecord: companiesData[0] || null
        }
      }
    } catch (err) {
      companiesStructure = { error: 'No se pudo obtener estructura de companies' }
    }

    // Verificar funciones existentes
    const functionsToCheck = [
      'get_user_companies',
      'can_create_company',
      'get_active_subscription',
      'update_user_limits_by_plan'
    ]

    const functionStatus = {}
    for (const funcName of functionsToCheck) {
      try {
        // Intentar ejecutar función con parámetros dummy para ver si existe
        const { error } = await supabase
          .rpc(funcName, { user_uuid: '00000000-0000-0000-0000-000000000000' })

        functionStatus[funcName] = {
          exists: true,
          error: error?.message || null
        }
      } catch (err) {
        functionStatus[funcName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Función no existe'
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        connection_status: 'OK',
        supabase_url: supabaseUrl,
        tables_status: tableStatus,
        users_structure: usersStructure,
        companies_structure: companiesStructure,
        functions_status: functionStatus,
        migration_compatibility: {
          needs_users_new: !tableStatus.users_new?.exists,
          needs_user_companies: !tableStatus.user_companies?.exists,
          needs_subscriptions: !tableStatus.subscriptions?.exists,
          can_migrate_users: tableStatus.users?.exists && tableStatus.users?.hasData,
          migration_file: '20250930000001_multi_tenant_auth_incremental.sql'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en debug endpoint:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}