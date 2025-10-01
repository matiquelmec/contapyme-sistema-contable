import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    console.log('🔍 Verificando estructura de journal_entries...')

    // Intentar acceder a la tabla journal_entries
    const { data: testData, error: testError } = await supabase
      .from('journal_entries')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('❌ Error accediendo a journal_entries:', testError)

      // Verificar si la tabla existe usando información del esquema
      const { data: tableCheck, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'journal_entries')

      return NextResponse.json({
        success: false,
        journal_entries_exists: tableCheck && tableCheck.length > 0,
        error: testError.message,
        error_code: testError.code,
        table_check: tableCheck
      })
    }

    // Si llegamos aquí, la tabla existe y podemos acceder
    // Obtener estructura de columnas
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'journal_entries')
      .order('ordinal_position')

    return NextResponse.json({
      success: true,
      journal_entries: {
        exists: true,
        accessible: true,
        columns: columns || [],
        column_count: columns?.length || 0,
        sample_data: testData?.[0] || null,
        has_entry_type: columns?.some(col => col.column_name === 'entry_type') || false
      }
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}