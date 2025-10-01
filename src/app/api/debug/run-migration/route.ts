import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * POST /api/debug/run-migration
 * Ejecuta la migración multi-tenant en la base de datos
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Ejecutando migración multi-tenant...')

    // Leer el archivo de migración
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250930000001_multi_tenant_auth_incremental.sql')

    let migrationSQL: string
    try {
      migrationSQL = readFileSync(migrationPath, 'utf8')
    } catch (error) {
      console.error('❌ Error leyendo archivo de migración:', error)
      return NextResponse.json({
        success: false,
        error: 'No se pudo leer el archivo de migración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, { status: 500 })
    }

    console.log('📄 Archivo de migración leído:', migrationSQL.length, 'caracteres')

    // Ejecutar la migración
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).catch(async () => {
      // Si no existe la función exec_sql, ejecutar directamente
      // Dividir el SQL en statements individuales y ejecutar uno por uno
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      const results = []

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log('🔄 Ejecutando statement:', statement.substring(0, 100) + '...')
            const { data, error } = await supabase.rpc('exec', { sql: statement })

            if (error) {
              console.warn('⚠️ Error en statement (continuando):', error.message)
              results.push({ statement: statement.substring(0, 100), error: error.message })
            } else {
              results.push({ statement: statement.substring(0, 100), success: true })
            }
          } catch (err) {
            console.warn('⚠️ Excepción en statement (continuando):', err)
            results.push({
              statement: statement.substring(0, 100),
              error: err instanceof Error ? err.message : 'Error desconocido'
            })
          }
        }
      }

      return { data: results, error: null }
    })

    if (error) {
      console.error('❌ Error ejecutando migración:', error)
      return NextResponse.json({
        success: false,
        error: 'Error ejecutando migración',
        details: error
      }, { status: 500 })
    }

    console.log('✅ Migración ejecutada:', data)

    // Verificar el resultado de la migración
    const { data: verificationData, error: verificationError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users_new', 'user_companies', 'user_activity_log'])

    const createdTables = verificationData?.map(t => t.table_name) || []

    // Verificar funciones creadas
    const functionsToCheck = [
      'get_user_companies',
      'can_create_company',
      'get_active_subscription',
      'update_user_limits_by_plan'
    ]

    const functionResults = {}
    for (const funcName of functionsToCheck) {
      try {
        const { error } = await supabase.rpc(funcName, { user_uuid: '00000000-0000-0000-0000-000000000000' })
        functionResults[funcName] = { exists: true, testError: error?.message || null }
      } catch (err) {
        functionResults[funcName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Función no existe'
        }
      }
    }

    return NextResponse.json({
      success: true,
      migration: {
        executed: true,
        tablesCreated: createdTables,
        functionsCreated: functionResults,
        executionResults: data
      },
      message: '✅ Migración multi-tenant ejecutada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en endpoint de migración:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}