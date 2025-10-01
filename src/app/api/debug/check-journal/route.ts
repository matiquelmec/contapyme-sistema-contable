import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estructura de tabla journal_entries...')

    // Verificar si la tabla journal_entries existe
    const { data: sample, error: testError } = await supabase
      .from('journal_entries')
      .select('*')
      .limit(1)

    const tableExists = !testError

    let columns = []
    let sampleData = null

    if (tableExists) {
      // Obtener estructura de columnas
      const { data: columnsData, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'journal_entries')
        .order('ordinal_position')

      if (!columnsError) {
        columns = columnsData || []
      }

      // Obtener datos de ejemplo
      const { data: sampleData2, error: sampleError } = await supabase
        .from('journal_entries')
        .select('*')
        .limit(1)

      if (!sampleError) {
        sampleData = sampleData2?.[0] || null
      }
    }

    return NextResponse.json({
      success: true,
      journal_entries: {
        exists: tableExists,
        columns: columns,
        sampleData: sampleData,
        columnCount: columns.length,
        testError: testError?.message || null
      }
    })

  } catch (error) {
    console.error('❌ Error en debug journal:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}