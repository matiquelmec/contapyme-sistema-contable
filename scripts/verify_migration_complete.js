const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigrationComplete() {
    console.log('🔍 Verificando que la migración se completó exitosamente...\n');
    
    const allExpectedTables = [
        'companies', 'users', 'company_settings', 'chart_of_accounts', 
        'journal_entries', 'journal_entry_lines', 'f29_analyses', 'f29_line_items',
        'employees', 'employment_contracts', 'contract_modifications', 'payroll_liquidations',
        'economic_indicators', 'digital_signatures', 'signature_verifications',
        'rcv_entities', 'fixed_assets', 'audit_logs'
    ];
    
    // Tablas que estaban faltando específicamente
    const previouslyMissingTables = [
        'f29_analyses', 'f29_line_items', 'employees', 'employment_contracts', 
        'contract_modifications', 'payroll_liquidations', 'economic_indicators',
        'digital_signatures', 'signature_verifications', 'rcv_entities', 
        'fixed_assets', 'audit_logs'
    ];
    
    const foundTables = [];
    const stillMissingTables = [];
    let criticalTablesCount = 0;
    
    console.log('📊 Verificando todas las tablas esperadas:\n');
    
    for (const tableName of allExpectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('id')
                .limit(1);
                
            if (!error) {
                foundTables.push(tableName);
                const wasPreviouslyMissing = previouslyMissingTables.includes(tableName);
                const status = wasPreviouslyMissing ? ' 🆕 NUEVA' : '';
                console.log(`  ✅ ${tableName}${status}`);
                
                // Contar tablas críticas
                if (tableName === 'employees' || tableName === 'payroll_liquidations') {
                    criticalTablesCount++;
                }
            } else if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                stillMissingTables.push(tableName);
                console.log(`  ❌ ${tableName} - AÚN FALTA`);
            } else if (error.message.includes('RLS') || error.message.includes('policy')) {
                foundTables.push(tableName);
                const wasPreviouslyMissing = previouslyMissingTables.includes(tableName);
                const status = wasPreviouslyMissing ? ' 🆕 NUEVA' : '';
                console.log(`  🔒 ${tableName}${status} - EXISTE (RLS activo)`);
                
                // Contar tablas críticas
                if (tableName === 'employees' || tableName === 'payroll_liquidations') {
                    criticalTablesCount++;
                }
            } else {
                console.log(`  ⚠️ ${tableName} - ERROR: ${error.message}`);
            }
        } catch (err) {
            stillMissingTables.push(tableName);
            console.log(`  💥 ${tableName} - EXCEPCIÓN: ${err.message}`);
        }
    }
    
    // Resumen general
    console.log('\n📈 RESUMEN DE LA MIGRACIÓN:');
    console.log(`  ✅ Tablas totales encontradas: ${foundTables.length}/${allExpectedTables.length}`);
    console.log(`  ❌ Tablas aún faltantes: ${stillMissingTables.length}`);
    
    // Estado de tablas previamente faltantes
    const newlyCreatedTables = foundTables.filter(table => previouslyMissingTables.includes(table));
    console.log(`  🆕 Tablas recién creadas: ${newlyCreatedTables.length}/${previouslyMissingTables.length}`);
    
    // Estado crítico
    console.log('\n🎯 ESTADO DE TABLAS CRÍTICAS:');
    const criticalTables = ['employees', 'payroll_liquidations'];
    criticalTables.forEach(tableName => {
        if (foundTables.includes(tableName)) {
            console.log(`  ✅ ${tableName} - EXISTE ¡Error de aplicación resuelto!`);
        } else {
            console.log(`  ❌ ${tableName} - AÚN FALTA (error de aplicación continuará)`);
        }
    });
    
    // Diagnóstico de éxito
    console.log('\n🏆 DIAGNÓSTICO DE ÉXITO DE LA MIGRACIÓN:');
    
    if (stillMissingTables.length === 0) {
        console.log('  ✅ ¡MIGRACIÓN COMPLETAMENTE EXITOSA!');
        console.log('  🎉 Todas las tablas están creadas y accesibles');
    } else if (criticalTablesCount === 2) {
        console.log('  ✅ ¡MIGRACIÓN EXITOSA PARA TABLAS CRÍTICAS!');
        console.log('  🎯 Los errores de aplicación deberían estar resueltos');
        console.log(`  ⚠️ ${stillMissingTables.length} tablas secundarias aún faltan`);
    } else {
        console.log('  ❌ MIGRACIÓN INCOMPLETA');
        console.log('  🚨 Las tablas críticas aún faltan - errores de aplicación continuarán');
    }
    
    // Instrucciones finales
    console.log('\n📋 PRÓXIMOS PASOS:');
    
    if (criticalTablesCount === 2) {
        console.log('  1. ✅ Reiniciar la aplicación web (npm run dev)');
        console.log('  2. ✅ Verificar que los errores "Could not find table" desaparecieron');
        console.log('  3. ✅ Probar las funcionalidades de empleados y nóminas');
    } else {
        console.log('  1. 🔧 Ejecutar el script SQL faltante en Supabase Dashboard');
        console.log('  2. 🔄 Ejecutar este verificador nuevamente');
        console.log('  3. 📧 Si persisten errores, revisar logs de Supabase');
    }
    
    if (stillMissingTables.length > 0) {
        console.log('\n📝 TABLAS AÚN FALTANTES:');
        stillMissingTables.forEach(table => console.log(`  - ${table}`));
    }
    
    console.log('\n🔗 ENLACES ÚTILES:');
    console.log(`   Dashboard: https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}`);
    console.log(`   SQL Editor: https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql`);
    
    return {
        totalFound: foundTables.length,
        totalExpected: allExpectedTables.length,
        criticalTablesExist: criticalTablesCount === 2,
        newlyCreated: newlyCreatedTables.length,
        stillMissing: stillMissingTables.length
    };
}

async function testCriticalTablesFunctionality() {
    console.log('\n🧪 PROBANDO FUNCIONALIDAD BÁSICA DE TABLAS CRÍTICAS...\n');
    
    try {
        // Probar tabla employees
        console.log('🔧 Probando tabla employees...');
        const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('id, full_name, employment_status')
            .limit(5);
            
        if (!employeesError) {
            console.log(`  ✅ employees: ${employeesData.length} registros encontrados`);
        } else {
            console.log(`  ❌ employees: ${employeesError.message}`);
        }
        
        // Probar tabla payroll_liquidations
        console.log('🔧 Probando tabla payroll_liquidations...');
        const { data: payrollData, error: payrollError } = await supabase
            .from('payroll_liquidations')
            .select('id, employee_id, period_year, period_month')
            .limit(5);
            
        if (!payrollError) {
            console.log(`  ✅ payroll_liquidations: ${payrollData.length} registros encontrados`);
        } else {
            console.log(`  ❌ payroll_liquidations: ${payrollError.message}`);
        }
        
        // Si ambas funcionan, la migración es exitosa
        if (!employeesError && !payrollError) {
            console.log('\n🎉 ¡TABLAS CRÍTICAS FUNCIONANDO CORRECTAMENTE!');
            console.log('✅ Los errores de aplicación deberían estar resueltos');
            return true;
        } else {
            console.log('\n⚠️ Algunas tablas críticas tienen problemas');
            return false;
        }
        
    } catch (error) {
        console.log('\n❌ Error probando funcionalidad:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Verificación completa post-migración ContaPyme\n');
    
    // Verificar tablas
    const results = await verifyMigrationComplete();
    
    // Probar funcionalidad si las tablas críticas existen
    if (results.criticalTablesExist) {
        await testCriticalTablesFunctionality();
    }
    
    console.log('\n🎯 RESUMEN EJECUTIVO:');
    
    if (results.criticalTablesExist && results.stillMissing === 0) {
        console.log('🏆 ESTADO: MIGRACIÓN COMPLETAMENTE EXITOSA');
        console.log('✅ ACCIÓN: La aplicación debería funcionar sin errores de esquema');
    } else if (results.criticalTablesExist) {
        console.log('🎯 ESTADO: MIGRACIÓN DE TABLAS CRÍTICAS EXITOSA');
        console.log('✅ ACCIÓN: Errores principales resueltos, tablas secundarias opcionales');
    } else {
        console.log('❌ ESTADO: MIGRACIÓN FALLIDA');
        console.log('🚨 ACCIÓN: Ejecutar script SQL manualmente en Dashboard');
    }
}

main().catch(error => {
    console.error('💥 Error en verificación:', error.message);
});