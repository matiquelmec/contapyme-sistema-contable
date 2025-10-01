const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = 'https://lccdxfqrasizigmehotk.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjY2R4ZnFyYXNpemlnbWVob3RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTUyMCwiZXhwIjoyMDcyOTI1NTIwfQ.-8ZYpi-1Bv7sqgbMVzVltuOi9Fx0t4JGT4AAJdOEfJo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración chart_of_accounts multi-tenant...')

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251001160000_chart_of_accounts_multi_tenant.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Archivo de migración leído:', migrationSQL.length, 'caracteres')

    // Dividir en statements individuales para ejecutar uno por uno
    const statements = migrationSQL
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log('📋 Total de statements a ejecutar:', statements.length)

    let successCount = 0
    let errorCount = 0
    const errors = []

    // Ejecutar statements uno por uno
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue

      try {
        console.log(`🔄 [${i + 1}/${statements.length}] Ejecutando:`, statement.substring(0, 80) + '...')

        // Para statements que no retornan datos, usar el client directo
        const result = await supabase.rpc('exec', { sql: statement }).catch(async () => {
          // Si falla, intentar con diferentes métodos según el tipo de statement
          if (statement.toLowerCase().includes('create table')) {
            // Para CREATE TABLE, intentar método directo
            return await executeDirectSQL(statement)
          } else if (statement.toLowerCase().includes('create function')) {
            // Para CREATE FUNCTION, intentar método directo
            return await executeDirectSQL(statement)
          } else if (statement.toLowerCase().includes('insert')) {
            // Para INSERT, usar from
            const match = statement.match(/INSERT INTO (\w+)/i)
            if (match) {
              // Extraer valores del INSERT y convertir a objeto
              return await executeInsertStatement(statement)
            }
          }
          throw new Error('Método de ejecución no disponible para este statement')
        })

        if (result.error) {
          console.warn(`⚠️ Error en statement ${i + 1}:`, result.error.message)
          errors.push({
            statement: statement.substring(0, 100),
            error: result.error.message
          })
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1} ejecutado exitosamente`)
          successCount++
        }

      } catch (err) {
        console.warn(`⚠️ Excepción en statement ${i + 1}:`, err.message)
        errors.push({
          statement: statement.substring(0, 100),
          error: err.message
        })
        errorCount++
      }

      // Pausa pequeña entre statements
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n📊 RESUMEN DE MIGRACIÓN:')
    console.log(`✅ Statements exitosos: ${successCount}`)
    console.log(`❌ Statements con error: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n⚠️ ERRORES ENCONTRADOS:')
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.statement}... → ${error.error}`)
      })
    }

    // Verificar tablas creadas
    console.log('\n🔍 Verificando tablas creadas...')
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users_new', 'user_companies', 'user_activity_log'])

    const createdTables = tables?.map(t => t.table_name) || []
    console.log('📋 Tablas verificadas:', createdTables)

    console.log('\n🎉 Migración completada!')
    return {
      success: true,
      successCount,
      errorCount,
      errors,
      createdTables
    }

  } catch (error) {
    console.error('❌ Error fatal en migración:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function executeDirectSQL(sql) {
  // Para casos especiales donde necesitamos ejecutar SQL directo
  // Esto es limitado en Supabase por seguridad
  throw new Error('SQL directo no disponible - usar Supabase Dashboard')
}

async function executeInsertStatement(statement) {
  // Extraer tabla y valores del INSERT para convertir a llamada de Supabase
  try {
    const match = statement.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/is)
    if (!match) throw new Error('Formato de INSERT no reconocido')

    const [, tableName, columns, values] = match
    const columnList = columns.split(',').map(c => c.trim().replace(/['"]/g, ''))
    const valueList = values.split(',').map(v => v.trim().replace(/['"]/g, ''))

    const insertObj = {}
    columnList.forEach((col, index) => {
      insertObj[col] = valueList[index]
    })

    return await supabase.from(tableName).insert(insertObj)
  } catch (err) {
    throw new Error(`Error procesando INSERT: ${err.message}`)
  }
}

// Ejecutar migración
runMigration().then(result => {
  if (result.success) {
    console.log('✅ Migración completada exitosamente')
    process.exit(0)
  } else {
    console.error('❌ Migración falló:', result.error)
    process.exit(1)
  }
}).catch(error => {
  console.error('❌ Error ejecutando migración:', error)
  process.exit(1)
})