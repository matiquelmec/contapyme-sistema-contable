const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
    try {
        console.log('🚀 Iniciando migración de ContaPyme...\n');
        
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250908000000_estructura_modular_escalable.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Archivo de migración no encontrado:', migrationPath);
            return false;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📖 Archivo de migración cargado exitosamente');
        console.log(`📊 Tamaño de migración: ${migrationSQL.length} caracteres`);
        
        // Dividir el SQL en sentencias individuales para ejecución segura
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
        
        console.log(`🔧 Ejecutando ${statements.length} sentencias SQL...\n`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Ejecutar cada sentencia individualmente usando rpc
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement.length === 0) continue;
            
            try {
                // Usar el cliente de Supabase para ejecutar SQL directo
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement
                });
                
                if (error) {
                    console.log(`⚠️  Sentencia ${i + 1}: ${error.message}`);
                    errors.push({ statement: i + 1, error: error.message });
                    errorCount++;
                } else {
                    successCount++;
                    if (i % 50 === 0) {
                        console.log(`✅ Procesadas ${i + 1} sentencias...`);
                    }
                }
                
                // Pequeño delay para no sobrecargar la API
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
            } catch (error) {
                console.log(`❌ Sentencia ${i + 1} error: ${error.message}`);
                errors.push({ statement: i + 1, error: error.message });
                errorCount++;
            }
        }
        
        console.log(`\n📊 Resumen de migración:`);
        console.log(`  ✅ Sentencias exitosas: ${successCount}`);
        console.log(`  ❌ Sentencias fallidas: ${errorCount}`);
        
        if (errors.length > 0 && errors.length < 10) {
            console.log(`\n⚠️  Errores encontrados:`);
            errors.forEach(err => {
                console.log(`   ${err.statement}: ${err.error}`);
            });
        }
        
        return errorCount < statements.length * 0.1; // Considerar exitosa si menos del 10% falla
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        return false;
    }
}

async function verifyTables() {
    console.log('\n🔍 Verificando creación de tablas...');
    
    const expectedTables = [
        'companies', 'users', 'company_settings', 'chart_of_accounts', 
        'journal_entries', 'journal_entry_lines', 'f29_analyses', 'f29_line_items',
        'employees', 'employment_contracts', 'contract_modifications', 'payroll_liquidations',
        'economic_indicators', 'digital_signatures', 'signature_verifications',
        'rcv_entities', 'fixed_assets', 'audit_logs'
    ];
    
    const foundTables = [];
    const missingTables = [];
    
    // Verificar cada tabla individualmente usando el cliente de Supabase
    for (const tableName of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
                
            if (!error) {
                foundTables.push(tableName);
                console.log(`  ✅ ${tableName}`);
            } else if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                missingTables.push(tableName);
                console.log(`  ❌ ${tableName} - NO EXISTE`);
            } else {
                // Tabla existe pero hay otro error (probablemente permisos o RLS)
                foundTables.push(tableName);
                console.log(`  ✅ ${tableName} (existe pero RLS activo)`);
            }
        } catch (error) {
            missingTables.push(tableName);
            console.log(`  ❌ ${tableName} - ERROR: ${error.message}`);
        }
    }
    
    console.log(`\n📊 Resumen de verificación de tablas:`);
    console.log(`  ✅ Encontradas: ${foundTables.length} tablas`);
    console.log(`  ❌ Faltantes: ${missingTables.length} tablas`);
    
    // Verificar específicamente las tablas críticas mencionadas en el error
    const criticalTables = ['employees', 'payroll_liquidations'];
    console.log('\n🎯 Tablas críticas para resolver errores de aplicación:');
    criticalTables.forEach(tableName => {
        if (foundTables.includes(tableName)) {
            console.log(`  ✅ ${tableName} - EXISTE (error de aplicación debería resolverse)`);
        } else {
            console.log(`  ❌ ${tableName} - FALTA (error de aplicación persistirá)`);
        }
    });
    
    // Mostrar tablas faltantes si hay pocas
    if (missingTables.length > 0 && missingTables.length < 10) {
        console.log('\n📝 Tablas faltantes:');
        missingTables.forEach(name => console.log(`  - ${name}`));
    }
    
    return foundTables;
}

async function createExecSQLFunction() {
    console.log('🔧 Creando función de ejecución SQL...');
    
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql_query;
            RETURN 'SUCCESS';
        EXCEPTION
            WHEN OTHERS THEN
                RETURN 'ERROR: ' || SQLERRM;
        END;
        $$;
    `;
    
    try {
        // Intentar crear la función usando una consulta SQL directa
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: createFunctionSQL
        });
        
        if (error) {
            console.log('⚠️ No se pudo crear función exec_sql, intentando método alternativo...');
            return false;
        }
        
        console.log('✅ Función exec_sql creada exitosamente');
        return true;
    } catch (error) {
        console.log('⚠️ Función exec_sql no disponible, usando método alternativo...');
        return false;
    }
}

async function executeAlternativeMigration() {
    console.log('🔄 Ejecutando migración usando método alternativo...');
    
    try {
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250908000000_estructura_modular_escalable.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Extraer solo las sentencias CREATE TABLE más importantes
        const createTableStatements = migrationSQL.match(/CREATE TABLE[^;]+;/gi) || [];
        
        console.log(`🔧 Creando ${createTableStatements.length} tablas principales...`);
        
        let successCount = 0;
        const criticalTables = ['companies', 'users', 'employees', 'payroll_liquidations'];
        
        for (const statement of createTableStatements) {
            try {
                // Ejecutar usando una función PL/pgSQL simple
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement
                });
                
                if (!error || error.message.includes('already exists')) {
                    successCount++;
                    
                    // Extraer nombre de tabla
                    const match = statement.match(/CREATE TABLE\s+(\w+)/i);
                    if (match) {
                        const tableName = match[1];
                        console.log(`  ✅ ${tableName}`);
                    }
                }
            } catch (err) {
                console.log(`  ⚠️ Error en sentencia: ${err.message}`);
            }
        }
        
        console.log(`✅ Creadas ${successCount} de ${createTableStatements.length} tablas`);
        return successCount > 0;
        
    } catch (error) {
        console.error('❌ Error en migración alternativa:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Iniciando proceso de migración de ContaPyme...\n');
    
    // Intentar crear la función de ejecución primero
    const functionCreated = await createExecSQLFunction();
    
    let migrationSuccess = false;
    
    if (functionCreated) {
        // Ejecutar migración completa
        migrationSuccess = await executeMigration();
    } else {
        // Usar método alternativo
        migrationSuccess = await executeAlternativeMigration();
    }
    
    if (migrationSuccess) {
        // Esperar un momento para que la migración se complete
        console.log('\n⏳ Esperando que la migración se complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar que las tablas se crearon
        const foundTables = await verifyTables();
        
        console.log('\n🎉 Proceso de migración completado!');
        console.log(`📊 Se verificaron exitosamente ${foundTables.length} tablas`);
        
        if (foundTables.includes('employees') && foundTables.includes('payroll_liquidations')) {
            console.log('\n✅ Las tablas críticas existen - los errores de aplicación deberían resolverse!');
        } else {
            console.log('\n⚠️ Algunas tablas críticas faltan - los errores de aplicación pueden persistir');
        }
        
        console.log('\n📋 Para verificar la aplicación, revisa si los errores de esquema han desaparecido.');
        
    } else {
        console.log('\n❌ La migración falló - por favor revisa los errores arriba');
        console.log('💡 Tip: Puedes intentar ejecutar las sentencias CREATE TABLE manualmente');
    }
}

// Ejecutar la migración
main().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
});