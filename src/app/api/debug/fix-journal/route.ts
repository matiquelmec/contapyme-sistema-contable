import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    console.log('🔧 Ejecutando migración para agregar entry_type...')

    // SQL para agregar la columna entry_type
    const addColumnSQL = `
      -- Agregar la columna entry_type si no existe
      ALTER TABLE journal_entries
      ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'manual'
      CHECK (entry_type IN ('manual', 'automatic', 'f29', 'payroll', 'fixed_assets', 'adjustment'));

      -- Actualizar los registros existentes con un valor por defecto
      UPDATE journal_entries
      SET entry_type = 'manual'
      WHERE entry_type IS NULL;
    `

    // Ejecutar el SQL
    const { error } = await supabase.rpc('execute_sql', { sql: addColumnSQL })

    if (error) {
      console.error('❌ Error ejecutando migración:', error)
      // Intentar método alternativo
      const { error: altError } = await supabase
        .from('journal_entries')
        .select('entry_type')
        .limit(1)

      if (altError && altError.message.includes('entry_type')) {
        // La columna aún no existe, intentar crearla directamente
        return NextResponse.json({
          success: false,
          message: 'La migración debe ejecutarse en Supabase Dashboard',
          migration_sql: addColumnSQL,
          instructions: [
            '1. Ve a Supabase Dashboard > SQL Editor',
            '2. Ejecuta el siguiente SQL:',
            addColumnSQL,
            '3. Luego vuelve a probar el sistema'
          ]
        })
      }
    }

    // Verificar que la columna ahora existe
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'journal_entries')
      .eq('column_name', 'entry_type')

    const hasEntryType = columns && columns.length > 0

    return NextResponse.json({
      success: hasEntryType,
      message: hasEntryType
        ? '✅ Columna entry_type agregada exitosamente'
        : '❌ La columna entry_type aún no existe',
      entry_type_exists: hasEntryType,
      migration_sql: addColumnSQL
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando migración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}