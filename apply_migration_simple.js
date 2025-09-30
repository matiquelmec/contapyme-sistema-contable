const fs = require('fs');
const path = require('path');

// Database connection details
const SUPABASE_URL = "https://lccdxfqrasizigmehotk.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjY2R4ZnFyYXNpemlnbWVob3RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTUyMCwiZXhwIjoyMDcyOTI1NTIwfQ.-8ZYpi-1Bv7sqgbMVzVltuOi9Fx0t4JGT4AAJdOEfJo";

async function executeSQLCommand(sql) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                sql: sql
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ SQL execution failed: ${error.message}`);
        return null;
    }
}

async function createExecutionFunction() {
    console.log('🔧 Creating SQL execution function...');
    
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
        RETURNS TEXT AS $$
        BEGIN
            EXECUTE sql_text;
            RETURN 'SUCCESS';
        EXCEPTION
            WHEN OTHERS THEN
                RETURN 'ERROR: ' || SQLERRM;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const result = await executeSQLCommand(createFunctionSQL);
    return result !== null;
}

async function executeMigration() {
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250908000000_estructura_modular_escalable.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            return false;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📖 Migration file loaded successfully');
        console.log(`📊 Migration size: ${migrationSQL.length} characters`);
        
        // Create the execution function first
        const functionCreated = await createExecutionFunction();
        if (!functionCreated) {
            console.error('❌ Failed to create execution function');
            return false;
        }
        
        console.log('✅ Execution function created');
        
        // Execute the entire migration as one command
        console.log('🚀 Executing migration...');
        const result = await executeSQLCommand(migrationSQL);
        
        if (result === null) {
            console.error('❌ Migration execution failed');
            return false;
        }
        
        if (typeof result === 'string' && result.includes('ERROR:')) {
            console.error('❌ Migration returned error:', result);
            return false;
        }
        
        console.log('✅ Migration executed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Error executing migration:', error.message);
        return false;
    }
}

async function verifyTables() {
    console.log('\n🔍 Verifying table creation...');
    
    const expectedTables = [
        'companies', 'users', 'company_settings', 'chart_of_accounts', 
        'journal_entries', 'journal_entry_lines', 'f29_analyses', 'f29_line_items',
        'employees', 'employment_contracts', 'contract_modifications', 'payroll_liquidations',
        'economic_indicators', 'digital_signatures', 'signature_verifications',
        'rcv_entities', 'fixed_assets', 'audit_logs'
    ];
    
    const foundTables = [];
    
    // Use a simple query to get all tables
    const checkTablesSQL = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `;
    
    try {
        const result = await executeSQLCommand(checkTablesSQL);
        
        if (result && Array.isArray(result)) {
            const tableNames = result.map(row => row.table_name);
            
            console.log(`📊 Found ${tableNames.length} tables in database:`);
            
            expectedTables.forEach(tableName => {
                if (tableNames.includes(tableName)) {
                    foundTables.push(tableName);
                    console.log(`  ✅ ${tableName}`);
                } else {
                    console.log(`  ❌ ${tableName} - MISSING`);
                }
            });
            
            // Check specifically for critical tables
            console.log('\n🎯 Critical tables status:');
            const criticalTables = ['employees', 'payroll_liquidations'];
            criticalTables.forEach(tableName => {
                if (tableNames.includes(tableName)) {
                    console.log(`  ✅ ${tableName} - EXISTS (should fix application errors)`);
                } else {
                    console.log(`  ❌ ${tableName} - MISSING (application errors will persist)`);
                }
            });
            
            // Show any extra tables that were created
            const extraTables = tableNames.filter(name => !expectedTables.includes(name));
            if (extraTables.length > 0) {
                console.log('\n📝 Additional tables found:');
                extraTables.forEach(name => console.log(`  📋 ${name}`));
            }
            
        } else {
            console.error('❌ Failed to retrieve table list');
        }
    } catch (error) {
        console.error('❌ Error verifying tables:', error.message);
    }
    
    return foundTables;
}

async function main() {
    console.log('🚀 Starting ContaPyme database migration...\n');
    
    // Execute the migration
    const migrationSuccess = await executeMigration();
    
    if (migrationSuccess) {
        // Wait for the migration to fully complete
        console.log('⏳ Waiting for migration to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify tables were created
        const foundTables = await verifyTables();
        
        console.log('\n🎉 Migration process completed!');
        console.log(`📊 Successfully verified ${foundTables.length} tables`);
        
        if (foundTables.includes('employees') && foundTables.includes('payroll_liquidations')) {
            console.log('✅ Critical tables exist - application errors should be resolved!');
        } else {
            console.log('⚠️ Some critical tables are missing - application errors may persist');
        }
    } else {
        console.log('\n❌ Migration failed - please check the errors above');
    }
}

// Run the migration
main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});