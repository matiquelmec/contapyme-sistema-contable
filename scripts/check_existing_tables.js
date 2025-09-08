const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTables() {
    console.log('🔍 Verificando estado actual de las tablas en Supabase...\n');
    
    const expectedTables = [
        'companies', 'users', 'company_settings', 'chart_of_accounts', 
        'journal_entries', 'journal_entry_lines', 'f29_analyses', 'f29_line_items',
        'employees', 'employment_contracts', 'contract_modifications', 'payroll_liquidations',
        'economic_indicators', 'digital_signatures', 'signature_verifications',
        'rcv_entities', 'fixed_assets', 'audit_logs'
    ];
    
    const foundTables = [];
    const missingTables = [];
    const errorTables = [];
    
    console.log('📊 Verificando cada tabla...\n');
    
    for (const tableName of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('id')
                .limit(1);
                
            if (!error) {
                foundTables.push(tableName);
                console.log(`  ✅ ${tableName} - EXISTE y ES ACCESIBLE`);
            } else if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                missingTables.push(tableName);
                console.log(`  ❌ ${tableName} - NO EXISTE`);
            } else if (error.message.includes('JWT')) {
                errorTables.push({ table: tableName, error: 'Problema de autenticación' });
                console.log(`  🔐 ${tableName} - ERROR DE AUTENTICACIÓN`);
            } else if (error.message.includes('RLS') || error.message.includes('policy')) {
                foundTables.push(tableName);
                console.log(`  🔒 ${tableName} - EXISTE pero RLS ACTIVO (normal)`);
            } else {
                errorTables.push({ table: tableName, error: error.message });
                console.log(`  ⚠️  ${tableName} - ERROR: ${error.message}`);
            }
        } catch (err) {
            errorTables.push({ table: tableName, error: err.message });
            console.log(`  💥 ${tableName} - EXCEPCIÓN: ${err.message}`);
        }
        
        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('\n📈 RESUMEN COMPLETO:');
    console.log(`  ✅ Tablas existentes y accesibles: ${foundTables.length}`);
    console.log(`  ❌ Tablas faltantes: ${missingTables.length}`);
    console.log(`  ⚠️  Tablas con errores: ${errorTables.length}`);
    
    // Mostrar tablas críticas
    console.log('\n🎯 ESTADO DE TABLAS CRÍTICAS (mencionadas en errores):');
    const criticalTables = ['employees', 'payroll_liquidations'];
    let criticalFound = 0;
    
    criticalTables.forEach(tableName => {
        if (foundTables.includes(tableName)) {
            console.log(`  ✅ ${tableName} - EXISTE (error debería resolverse)`);
            criticalFound++;
        } else if (missingTables.includes(tableName)) {
            console.log(`  ❌ ${tableName} - FALTA (error persistirá)`);
        } else {
            console.log(`  ⚠️ ${tableName} - ESTADO INCIERTO`);
        }
    });
    
    // Tablas faltantes
    if (missingTables.length > 0) {
        console.log('\n📋 TABLAS QUE NECESITAN CREARSE:');
        missingTables.forEach(table => console.log(`  - ${table}`));
    }
    
    // Errores específicos
    if (errorTables.length > 0 && errorTables.length < 10) {
        console.log('\n🚨 ERRORES ESPECÍFICOS:');
        errorTables.forEach(item => {
            console.log(`  ${item.table}: ${item.error}`);
        });
    }
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    
    if (criticalFound === 2) {
        console.log('  ✅ Las tablas críticas existen - revisar aplicación');
    } else if (missingTables.length > 0) {
        console.log('  🔧 Necesitas crear las tablas faltantes');
        console.log('  📄 Usa el script SQL de migración en Supabase Dashboard');
    }
    
    if (errorTables.length > 0) {
        console.log('  🔐 Revisar permisos y configuración de RLS');
    }
    
    return { foundTables, missingTables, criticalFound };
}

async function testBasicConnection() {
    console.log('🌐 Probando conexión básica a Supabase...');
    
    try {
        // Intentar una operación simple que no requiera tablas
        const { data, error } = await supabase
            .from('non_existent_table')
            .select('*')
            .limit(1);
            
        if (error) {
            if (error.message.includes('JWT')) {
                console.log('  ❌ Error de autenticación - revisar SUPABASE_SERVICE_ROLE_KEY');
                return false;
            } else if (error.code === 'PGRST106') {
                console.log('  ✅ Conexión exitosa - tabla inexistente detectada correctamente');
                return true;
            } else {
                console.log('  ✅ Conexión exitosa - error esperado para tabla inexistente');
                return true;
            }
        }
        
        return true;
    } catch (err) {
        console.log('  ❌ Error de conexión:', err.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Diagnóstico completo de base de datos ContaPyme\n');
    
    // Probar conexión básica
    const connected = await testBasicConnection();
    
    if (!connected) {
        console.log('\n💥 No se pudo conectar a Supabase - revisar configuración');
        return;
    }
    
    console.log(''); // Línea en blanco
    
    // Verificar tablas
    const result = await checkExistingTables();
    
    console.log('\n🎯 CONCLUSIÓN FINAL:');
    
    if (result.criticalFound === 2) {
        console.log('✅ Las tablas críticas EXISTEN - los errores de aplicación deberían estar resueltos');
        console.log('🔄 Si aún hay errores, reinicia la aplicación o revisa la configuración');
    } else {
        console.log('❌ Las tablas críticas NO EXISTEN - se necesita ejecutar la migración');
        console.log('📋 Copia el archivo SQL de migración al SQL Editor de Supabase Dashboard');
    }
    
    console.log('\n📍 Enlaces útiles:');
    console.log(`   Dashboard: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}`);
    console.log(`   SQL Editor: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);
}

main().catch(error => {
    console.error('💥 Error en diagnóstico:', error.message);
});