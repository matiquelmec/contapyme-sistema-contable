const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

async function createSampleEntries() {
  console.log('🚀 Creando asientos de ejemplo...');
  
  // Asientos de ejemplo
  const sampleEntries = [
    {
      company_id: COMPANY_ID,
      entry_number: 1,
      entry_date: '2025-09-01',
      description: 'Compra de mercadería',
      reference: 'FACT-001',
      entry_type: 'manual',
      status: 'approved',
      total_debit: 119000,
      total_credit: 119000
    },
    {
      company_id: COMPANY_ID,
      entry_number: 2,
      entry_date: '2025-09-02',
      description: 'Venta de productos',
      reference: 'BOL-001',
      entry_type: 'manual',
      status: 'approved',
      total_debit: 238000,
      total_credit: 238000
    },
    {
      company_id: COMPANY_ID,
      entry_number: 3,
      entry_date: '2025-09-03',
      description: 'Pago de servicios básicos',
      reference: 'SERV-001',
      entry_type: 'manual',
      status: 'approved',
      total_debit: 50000,
      total_credit: 50000
    },
    {
      company_id: COMPANY_ID,
      entry_number: 4,
      entry_date: '2025-09-04',
      description: 'Pago de sueldos',
      reference: 'REM-092025',
      entry_type: 'automatic',
      source_type: 'payroll',
      source_period: '2025-09',
      status: 'approved',
      total_debit: 3500000,
      total_credit: 3500000
    },
    {
      company_id: COMPANY_ID,
      entry_number: 5,
      entry_date: '2025-09-05',
      description: 'Compra de activo fijo - Computador',
      reference: 'AF-001',
      entry_type: 'fixed_asset',
      status: 'approved',
      total_debit: 800000,
      total_credit: 800000
    }
  ];

  // Líneas para cada asiento
  const sampleLines = [
    // Asiento 1: Compra de mercadería
    [
      { account_code: '1105', account_name: 'Mercaderías', line_number: 1, debit_amount: 100000, credit_amount: 0, line_description: 'Compra mercadería' },
      { account_code: '1107', account_name: 'IVA Crédito Fiscal', line_number: 2, debit_amount: 19000, credit_amount: 0, line_description: 'IVA 19%' },
      { account_code: '2101', account_name: 'Proveedores', line_number: 3, debit_amount: 0, credit_amount: 119000, line_description: 'Por pagar' }
    ],
    // Asiento 2: Venta de productos
    [
      { account_code: '1103', account_name: 'Clientes', line_number: 1, debit_amount: 238000, credit_amount: 0, line_description: 'Venta a crédito' },
      { account_code: '4101', account_name: 'Ventas', line_number: 2, debit_amount: 0, credit_amount: 200000, line_description: 'Venta neta' },
      { account_code: '2107', account_name: 'IVA Débito Fiscal', line_number: 3, debit_amount: 0, credit_amount: 38000, line_description: 'IVA 19%' }
    ],
    // Asiento 3: Pago de servicios
    [
      { account_code: '5201', account_name: 'Gastos de Administración', line_number: 1, debit_amount: 50000, credit_amount: 0, line_description: 'Servicios básicos' },
      { account_code: '1101', account_name: 'Caja', line_number: 2, debit_amount: 0, credit_amount: 50000, line_description: 'Pago en efectivo' }
    ],
    // Asiento 4: Pago de sueldos
    [
      { account_code: '5101', account_name: 'Sueldos y Salarios', line_number: 1, debit_amount: 3000000, credit_amount: 0, line_description: 'Sueldos brutos' },
      { account_code: '5102', account_name: 'Leyes Sociales', line_number: 2, debit_amount: 500000, credit_amount: 0, line_description: 'Cotizaciones empleador' },
      { account_code: '2104', account_name: 'Remuneraciones por Pagar', line_number: 3, debit_amount: 0, credit_amount: 2500000, line_description: 'Líquido a pagar' },
      { account_code: '2105', account_name: 'Cotizaciones por Pagar', line_number: 4, debit_amount: 0, credit_amount: 1000000, line_description: 'AFP, Salud, etc.' }
    ],
    // Asiento 5: Compra de activo fijo
    [
      { account_code: '1201', account_name: 'Equipos Computacionales', line_number: 1, debit_amount: 672269, credit_amount: 0, line_description: 'Computador HP' },
      { account_code: '1107', account_name: 'IVA Crédito Fiscal', line_number: 2, debit_amount: 127731, credit_amount: 0, line_description: 'IVA 19%' },
      { account_code: '1102', account_name: 'Banco', line_number: 3, debit_amount: 0, credit_amount: 800000, line_description: 'Transferencia bancaria' }
    ]
  ];

  try {
    // Primero verificar si ya existen asientos
    const { data: existingEntries, error: checkError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .limit(1);

    if (checkError) {
      console.error('❌ Error verificando asientos existentes:', checkError);
      return;
    }

    if (existingEntries && existingEntries.length > 0) {
      console.log('ℹ️ Ya existen asientos para esta empresa. No se crearán duplicados.');
      return;
    }

    // Crear asientos y líneas
    for (let i = 0; i < sampleEntries.length; i++) {
      const entry = sampleEntries[i];
      const lines = sampleLines[i];

      // Insertar asiento
      const { data: insertedEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert(entry)
        .select()
        .single();

      if (entryError) {
        console.error(`❌ Error creando asiento ${i + 1}:`, entryError);
        continue;
      }

      console.log(`✅ Asiento ${i + 1} creado:`, insertedEntry.description);

      // Insertar líneas del asiento
      const linesWithEntryId = lines.map(line => ({
        ...line,
        entry_id: insertedEntry.id
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);

      if (linesError) {
        console.error(`❌ Error creando líneas del asiento ${i + 1}:`, linesError);
      } else {
        console.log(`   ✅ ${lines.length} líneas creadas`);
      }
    }

    console.log('\n✅ Proceso completado. Asientos de ejemplo creados.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
createSampleEntries();