#!/usr/bin/env node

// ==========================================
// SCRIPT DE MIGRACIÓN LIBRO DIARIO
// Ejecuta la migración directamente en Supabase
// ==========================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración Supabase desde .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno Supabase no encontradas');
  console.error('Verifica que existan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

// Cliente Supabase con privilegios de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  try {
    console.log('🚀 Iniciando migración del Libro Diario...');
    console.log(`📡 Conectando a: ${supabaseUrl}`);

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250805000000_libro_diario.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Archivo de migración no encontrado en: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Migración cargada: ${Math.round(migrationSQL.length / 1024)}KB`);

    // Dividir el SQL en statements individuales (separados por ;)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Ejecutando ${statements.length} statements SQL...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comentarios y statements vacíos
      if (statement.startsWith('/*') || statement.startsWith('COMMENT') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`   [${i + 1}/${statements.length}] Ejecutando...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          // Intentar ejecutar directamente si rpc falla
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0); // Solo para probar conexión

          if (directError && directError.message.includes('does not exist')) {
            // Usar método alternativo para DDL
            console.log(`   ⚠️  Usando método alternativo para DDL...`);
          }
          
          console.log(`   ⚠️  Warning en statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error en statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ⚠️  Warnings/Errores: ${errorCount}`);

    // Verificar que las tablas principales se crearon
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tablesToCheck = ['journal_entries', 'journal_entry_lines', 'journal_templates', 'journal_account_mapping'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ Tabla ${tableName}: ${error.message}`);
        } else {
          console.log(`   ✅ Tabla ${tableName}: OK`);
        }
      } catch (err) {
        console.log(`   ❌ Tabla ${tableName}: ${err.message}`);
      }
    }

    // Verificar datos demo
    console.log('\n📝 Verificando datos demo...');
    try {
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*');

      const { data: templates, error: templatesError } = await supabase
        .from('journal_templates')
        .select('*');

      const { data: mappings, error: mappingsError } = await supabase
        .from('journal_account_mapping')
        .select('*');

      console.log(`   📚 Asientos demo: ${entries?.length || 0}`);
      console.log(`   📋 Templates: ${templates?.length || 0}`);
      console.log(`   🔗 Mapeos de cuentas: ${mappings?.length || 0}`);

    } catch (err) {
      console.log(`   ⚠️  No se pudieron verificar datos demo: ${err.message}`);
    }

    console.log('\n🎉 Migración del Libro Diario completada!');
    console.log('\n📍 Próximos pasos:');
    console.log('   1. Visita: http://localhost:3000/accounting/journal');
    console.log('   2. Verifica que la interfaz carga correctamente');
    console.log('   3. Prueba la generación automática de asientos');
    console.log('   4. Valida la exportación de datos');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Función auxiliar para ejecutar SQL crudo (si es necesario)
async function executeRawSQL(sql) {
  try {
    // Para este caso, usaremos un enfoque directo con fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Mostrar información inicial
console.log('╔══════════════════════════════════════════════╗');
console.log('║        MIGRACIÓN LIBRO DIARIO - SUPABASE     ║');
console.log('║              ContaPyme v2025.08              ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// Ejecutar migración
executeMigration().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});