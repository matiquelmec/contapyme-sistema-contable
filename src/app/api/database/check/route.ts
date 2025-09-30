import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Verificar el estado de las tablas de la base de datos
export async function GET(request: NextRequest) {
  try {
    const checks = {
      companies: { exists: false, count: 0, structure: null },
      employees: { exists: false, count: 0, structure: null },
      employment_contracts: { exists: false, count: 0, structure: null },
      payroll_config: { exists: false, count: 0, structure: null },
      payroll_documents: { exists: false, count: 0, structure: null },
      payroll_parameters: { exists: false, count: 0, structure: null },
      users: { exists: false, count: 0, structure: null }
    };

    // Verificar cada tabla
    for (const tableName of Object.keys(checks)) {
      try {
        // Verificar si la tabla existe y obtener conteo
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        checks[tableName as keyof typeof checks].exists = !error;
        checks[tableName as keyof typeof checks].count = count || 0;

        // Si la tabla existe, obtener un registro de ejemplo para ver la estructura
        if (!error && count && count > 0) {
          const { data: sampleData } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (sampleData && sampleData.length > 0) {
            checks[tableName as keyof typeof checks].structure = Object.keys(sampleData[0]);
          }
        }
      } catch (tableError) {
        console.error(`Error checking table ${tableName}:`, tableError);
        checks[tableName as keyof typeof checks].exists = false;
      }
    }

    // Verificar funciones de la base de datos
    const functions = {
      calculate_unique_tax: false,
      validate_chilean_rut: false
    };

    try {
      // Intentar llamar a las funciones para verificar si existen
      const { error: taxError } = await supabase.rpc('calculate_unique_tax', {
        taxable_income: 1000000,
        utm_value: 65967
      });
      functions.calculate_unique_tax = !taxError || !taxError.message.includes('function') || !taxError.message.includes('does not exist');

      const { error: rutError } = await supabase.rpc('validate_chilean_rut', {
        rut_to_validate: '12345678-9'
      });
      functions.validate_chilean_rut = !rutError || !rutError.message.includes('function') || !rutError.message.includes('does not exist');
    } catch (funcError) {
      console.error('Error checking functions:', funcError);
    }

    // Verificar migraciones aplicadas
    let migrations = [];
    try {
      const { data: migrationData } = await supabase
        .from('supabase_migrations')
        .select('version, name')
        .order('version', { ascending: true });
      
      migrations = migrationData || [];
    } catch (migError) {
      console.log('No se pudieron obtener las migraciones:', migError);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database_url: supabaseUrl ? 'Configurado' : 'No configurado',
      service_key: supabaseServiceKey ? 'Configurado' : 'No configurado',
      tables: checks,
      functions,
      migrations_count: migrations.length,
      migrations: migrations.map(m => ({ version: m.version, name: m.name }))
    });

  } catch (error) {
    console.error('Error en database check:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}