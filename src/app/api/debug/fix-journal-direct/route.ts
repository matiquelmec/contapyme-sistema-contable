import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    console.log('🔧 Intentando agregar columna entry_type directamente...')

    // Primero verificar si ya existe
    const { data: checkColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'journal_entries')
      .eq('column_name', 'entry_type')

    if (checkColumns && checkColumns.length > 0) {
      return NextResponse.json({
        success: true,
        message: '✅ La columna entry_type ya existe',
        entry_type_exists: true
      })
    }

    // Si no existe, proporcionar instrucciones claras para ejecutar en Supabase Dashboard
    const migrationSQL = `
-- Agregar columna entry_type a journal_entries
ALTER TABLE journal_entries
ADD COLUMN entry_type VARCHAR(50) DEFAULT 'manual'
CHECK (entry_type IN ('manual', 'automatic', 'f29', 'payroll', 'fixed_assets', 'adjustment'));

-- Actualizar registros existentes
UPDATE journal_entries
SET entry_type = 'manual'
WHERE entry_type IS NULL;

-- Verificar que se creó
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'journal_entries'
AND column_name = 'entry_type';
`

    return NextResponse.json({
      success: false,
      message: '❌ La columna entry_type no existe y debe crearse manualmente',
      entry_type_exists: false,
      action_required: true,
      instructions: {
        step1: 'Ir a Supabase Dashboard',
        step2: 'Abrir SQL Editor',
        step3: 'Ejecutar el siguiente SQL:',
        sql: migrationSQL,
        step4: 'Verificar que el resultado muestre la columna creada',
        step5: 'Probar nuevamente el sistema'
      },
      dashboard_url: 'https://supabase.com/dashboard/project/lccdxfqrasizigmehotk/sql'
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error verificando columna',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}