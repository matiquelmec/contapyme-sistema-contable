import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    console.log('🧾 Probando creación de asiento con entry_type...')

    // Datos de prueba para crear un asiento
    const testJournalEntry = {
      company_id: '11111111-1111-1111-1111-111111111111', // Usar ID existente
      entry_number: `TEST-${Date.now()}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Asiento de prueba - verificación entry_type',
      total_debit: 100000,
      total_credit: 100000,
      entry_type: 'manual', // La nueva columna
      status: 'draft'
    }

    console.log('📝 Creando asiento:', testJournalEntry)

    // Crear el asiento
    const { data: newEntry, error: createError } = await supabase
      .from('journal_entries')
      .insert(testJournalEntry)
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creando asiento:', createError)
      return NextResponse.json({
        success: false,
        error: 'Error creando asiento',
        details: createError.message,
        test_data: testJournalEntry
      }, { status: 500 })
    }

    console.log('✅ Asiento creado exitosamente:', newEntry)

    // Ahora crear las líneas del asiento
    const journalLines = [
      {
        journal_entry_id: newEntry.id,
        account_code: '1.1.01.001',
        account_name: 'Caja',
        debit_amount: 100000,
        credit_amount: 0,
        description: 'Línea débito - Caja'
      },
      {
        journal_entry_id: newEntry.id,
        account_code: '4.1.01',
        account_name: 'Ventas',
        debit_amount: 0,
        credit_amount: 100000,
        description: 'Línea crédito - Ventas'
      }
    ]

    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)
      .select()

    if (linesError) {
      console.error('❌ Error creando líneas:', linesError)
      return NextResponse.json({
        success: false,
        error: 'Error creando líneas del asiento',
        details: linesError.message,
        entry_created: newEntry
      }, { status: 500 })
    }

    console.log('✅ Líneas creadas exitosamente:', lines)

    return NextResponse.json({
      success: true,
      message: '✅ Asiento creado exitosamente con entry_type',
      journal_entry: newEntry,
      journal_lines: lines,
      entry_type_working: true
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