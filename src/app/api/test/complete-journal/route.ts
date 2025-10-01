import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    console.log('🧾 Probando creación completa de asiento...')

    // Verificar que ambas tablas existen
    const { data: tablesCheck } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['journal_entries', 'journal_lines'])

    const hasJournalEntries = tablesCheck?.some(t => t.table_name === 'journal_entries')
    const hasJournalLines = tablesCheck?.some(t => t.table_name === 'journal_lines')

    if (!hasJournalEntries) {
      return NextResponse.json({
        success: false,
        error: 'Tabla journal_entries no existe',
        tables_found: tablesCheck?.map(t => t.table_name) || []
      }, { status: 500 })
    }

    if (!hasJournalLines) {
      return NextResponse.json({
        success: false,
        error: 'Tabla journal_lines no existe - ejecutar migración primero',
        tables_found: tablesCheck?.map(t => t.table_name) || [],
        action_required: 'Ejecutar migración 20251001140000_create_journal_lines.sql en Supabase Dashboard'
      }, { status: 500 })
    }

    // Datos de prueba para crear un asiento completo
    const testJournalEntry = {
      company_id: '11111111-1111-1111-1111-111111111111',
      entry_number: `COMPLETE-${Date.now()}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Asiento completo de prueba - sistema funcionando',
      total_debit: 250000,
      total_credit: 250000,
      entry_type: 'manual',
      status: 'draft'
    }

    console.log('📝 Creando asiento completo:', testJournalEntry)

    // Crear el asiento
    const { data: newEntry, error: createError } = await supabase
      .from('journal_entries')
      .insert(testJournalEntry)
      .select()
      .single()

    if (createError) {
      return NextResponse.json({
        success: false,
        error: 'Error creando asiento',
        details: createError.message
      }, { status: 500 })
    }

    // Crear las líneas del asiento
    const journalLines = [
      {
        journal_entry_id: newEntry.id,
        account_code: '1.1.01.001',
        account_name: 'Caja',
        debit_amount: 250000,
        credit_amount: 0,
        description: 'Ingreso en efectivo',
        sort_order: 1
      },
      {
        journal_entry_id: newEntry.id,
        account_code: '4.1.01.001',
        account_name: 'Ventas de Mercaderías',
        debit_amount: 0,
        credit_amount: 250000,
        description: 'Venta de productos',
        sort_order: 2
      }
    ]

    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)
      .select()

    if (linesError) {
      return NextResponse.json({
        success: false,
        error: 'Error creando líneas del asiento',
        details: linesError.message,
        entry_created: newEntry
      }, { status: 500 })
    }

    console.log('✅ Asiento completo creado exitosamente')

    return NextResponse.json({
      success: true,
      message: '🎉 ¡Sistema de asientos funcionando completamente!',
      journal_entry: newEntry,
      journal_lines: lines,
      summary: {
        entry_type_working: true,
        journal_lines_working: true,
        total_debit: 250000,
        total_credit: 250000,
        is_balanced: true
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