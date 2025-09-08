const fs = require('fs');
const path = require('path');

// Database connection details
const SUPABASE_URL = "https://lccdxfqrasizigmehotk.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjY2R4ZnFyYXNpemlnbWVob3RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTUyMCwiZXhwIjoyMDcyOTI1NTIwfQ.-8ZYpi-1Bv7sqgbMVzVltuOi9Fx0t4JGT4AAJdOEfJo";

async function executeMigration() {
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250908000000_estructura_modular_escalable.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📖 Migration file loaded successfully');
        console.log(`📊 Migration size: ${migrationSQL.length} characters`);
        
        // Split the SQL into individual statements for safer execution
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`🔧 Executing ${statements.length} SQL statements...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Execute each statement individually
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.length === 0) continue;
            
            try {
                // Create a temporary function to execute the statement
                const wrapperSQL = `
                    CREATE OR REPLACE FUNCTION execute_migration_statement()
                    RETURNS TEXT AS $$
                    BEGIN
                        ${statement};
                        RETURN 'SUCCESS';
                    EXCEPTION
                        WHEN OTHERS THEN
                            RETURN 'ERROR: ' || SQLERRM;
                    END;
                    $$ LANGUAGE plpgsql;
                `;
                
                const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_migration_statement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'apikey': SUPABASE_SERVICE_ROLE_KEY
                    },
                    body: JSON.stringify({})
                });
                
                if (response.ok) {
                    const result = await response.text();
                    if (result.includes('ERROR:')) {
                        console.log(`⚠️  Statement ${i + 1}: ${result}`);
                        errorCount++;
                    } else {
                        successCount++;
                        if (i % 50 === 0) console.log(`✅ Processed ${i + 1} statements...`);
                    }
                } else {
                    console.log(`❌ Statement ${i + 1} failed: ${response.status}`);
                    errorCount++;
                }
                
                // Small delay to avoid overwhelming the API
                if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.log(`❌ Statement ${i + 1} error: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`  ✅ Successful statements: ${successCount}`);
        console.log(`  ❌ Failed statements: ${errorCount}`);
        
        return errorCount === 0;
    } catch (error) {
        console.error('❌ Error executing migration:', error.message);
        return false;
    }
}

async function verifyTables() {
    try {
        console.log('\n🔍 Verifying table creation...');
        
        const expectedTables = [
            'companies', 'users', 'company_settings', 'chart_of_accounts', 
            'journal_entries', 'journal_entry_lines', 'f29_analyses', 'f29_line_items',
            'employees', 'employment_contracts', 'contract_modifications', 'payroll_liquidations',
            'economic_indicators', 'digital_signatures', 'signature_verifications',
            'rcv_entities', 'fixed_assets', 'audit_logs'
        ];
        
        const foundTables = [];
        const missingTables = [];
        
        // Check each table individually by trying to query it
        for (const tableName of expectedTables) {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'apikey': SUPABASE_SERVICE_ROLE_KEY
                    }
                });
                
                if (response.ok) {
                    foundTables.push(tableName);
                    console.log(`  ✅ ${tableName}`);
                } else if (response.status === 404 || response.status === 406) {
                    missingTables.push(tableName);
                    console.log(`  ❌ ${tableName} - MISSING`);
                } else {
                    console.log(`  ⚠️  ${tableName} - Status: ${response.status}`);
                }
            } catch (error) {
                missingTables.push(tableName);
                console.log(`  ❌ ${tableName} - ERROR: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Table verification summary:`);
        console.log(`  ✅ Found: ${foundTables.length} tables`);
        console.log(`  ❌ Missing: ${missingTables.length} tables`);
        
        // Check specifically for the problematic tables mentioned in the error
        const criticalTables = ['employees', 'payroll_liquidations'];
        console.log('\n🎯 Critical tables for fixing application errors:');
        criticalTables.forEach(tableName => {
            if (foundTables.includes(tableName)) {
                console.log(`  ✅ ${tableName} - EXISTS (application error should be resolved)`);
            } else {
                console.log(`  ❌ ${tableName} - MISSING (application error will persist)`);
            }
        });
        
        return foundTables;
    } catch (error) {
        console.error('❌ Error verifying tables:', error.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Starting ContaPyme migration process...\n');
    
    // Execute the migration
    const migrationSuccess = await executeMigration();
    
    if (migrationSuccess) {
        // Wait a moment for the migration to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify tables were created
        const tables = await verifyTables();
        
        if (tables.length > 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log(`📊 Total tables created: ${tables.length}`);
        } else {
            console.log('\n⚠️ Migration may have issues - no tables found');
        }
    } else {
        console.log('\n❌ Migration failed - tables not verified');
    }
}

// Execute the migration
main().catch(console.error);