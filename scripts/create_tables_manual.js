const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sentencias CREATE TABLE extraídas de la migración
const createTableStatements = [
    // 1. Companies (tabla base)
    `CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        rut VARCHAR(20) UNIQUE NOT NULL,
        industry_sector VARCHAR(100),
        company_size VARCHAR(20) CHECK (company_size IN ('micro', 'small', 'medium', 'large')) DEFAULT 'small',
        subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'professional', 'enterprise')) DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'trial')) DEFAULT 'active',
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        logo_url VARCHAR(500),
        tax_regime VARCHAR(50),
        accounting_period_start INTEGER DEFAULT 1,
        currency VARCHAR(3) DEFAULT 'CLP',
        created_by UUID,
        updated_by UUID
    )`,

    // 2. Users
    `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')) DEFAULT 'viewer',
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        permissions JSONB DEFAULT '{}',
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        phone VARCHAR(20),
        avatar_url VARCHAR(500),
        timezone VARCHAR(50) DEFAULT 'America/Santiago',
        language VARCHAR(10) DEFAULT 'es-CL'
    )`,

    // 3. Company Settings
    `CREATE TABLE IF NOT EXISTS company_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        module_name VARCHAR(100) NOT NULL,
        settings JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, module_name)
    )`,

    // 4. Chart of Accounts
    `CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        account_code VARCHAR(20) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(20) CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')) NOT NULL,
        parent_account_id UUID REFERENCES chart_of_accounts(id),
        level INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        allows_transactions BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        account_nature VARCHAR(10) CHECK (account_nature IN ('debit', 'credit')),
        tax_category VARCHAR(50),
        description TEXT,
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        UNIQUE(company_id, account_code)
    )`,

    // 5. Journal Entries
    `CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        entry_number VARCHAR(50) NOT NULL,
        entry_date DATE NOT NULL,
        reference_document VARCHAR(255),
        description TEXT NOT NULL,
        total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
        source_module VARCHAR(50),
        source_id UUID,
        status VARCHAR(20) CHECK (status IN ('draft', 'posted', 'reversed')) DEFAULT 'draft',
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, entry_number)
    )`,

    // 6. Journal Entry Lines
    `CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
        debit_amount DECIMAL(15,2) DEFAULT 0,
        credit_amount DECIMAL(15,2) DEFAULT 0,
        description TEXT,
        entity_rut VARCHAR(20),
        entity_name VARCHAR(255),
        line_order INTEGER DEFAULT 1
    )`,

    // 7. Employees (TABLA CRÍTICA)
    `CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        employee_code VARCHAR(50),
        rut VARCHAR(20) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        hire_date DATE NOT NULL,
        termination_date DATE,
        birth_date DATE,
        current_position VARCHAR(255),
        current_department VARCHAR(255),
        employment_status VARCHAR(20) CHECK (employment_status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
        bank_name VARCHAR(100),
        bank_account_type VARCHAR(20),
        bank_account_number VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        UNIQUE(company_id, rut),
        UNIQUE(company_id, employee_code)
    )`,

    // 8. Employment Contracts
    `CREATE TABLE IF NOT EXISTS employment_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        contract_type VARCHAR(20) CHECK (contract_type IN ('indefinite', 'fixed_term', 'part_time', 'internship', 'project')) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        base_salary DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'CLP',
        working_hours_per_week INTEGER DEFAULT 45,
        working_days_per_week INTEGER DEFAULT 5,
        position_title VARCHAR(255),
        department VARCHAR(255),
        work_location VARCHAR(255),
        afp_code VARCHAR(10),
        health_insurance_code VARCHAR(10),
        health_insurance_amount DECIMAL(8,2) DEFAULT 0,
        has_legal_gratification BOOLEAN DEFAULT false,
        gratification_percentage DECIMAL(5,2) DEFAULT 25.0,
        family_allowance DECIMAL(8,2) DEFAULT 0,
        transportation_allowance DECIMAL(8,2) DEFAULT 0,
        meal_allowance DECIMAL(8,2) DEFAULT 0,
        housing_allowance DECIMAL(8,2) DEFAULT 0,
        contract_document_path VARCHAR(500),
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id)
    )`,

    // 9. Payroll Liquidations (TABLA CRÍTICA)
    `CREATE TABLE IF NOT EXISTS payroll_liquidations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        base_salary DECIMAL(10,2) NOT NULL,
        worked_days INTEGER DEFAULT 30,
        worked_hours DECIMAL(6,2) DEFAULT 0,
        overtime_hours DECIMAL(6,2) DEFAULT 0,
        gross_salary DECIMAL(10,2) NOT NULL,
        overtime_amount DECIMAL(10,2) DEFAULT 0,
        bonuses JSONB DEFAULT '{}',
        allowances JSONB DEFAULT '{}',
        legal_gratification DECIMAL(10,2) DEFAULT 0,
        afp_contribution DECIMAL(10,2) DEFAULT 0,
        health_contribution DECIMAL(10,2) DEFAULT 0,
        unemployment_insurance DECIMAL(10,2) DEFAULT 0,
        income_tax DECIMAL(10,2) DEFAULT 0,
        other_deductions JSONB DEFAULT '{}',
        advances DECIMAL(10,2) DEFAULT 0,
        loans DECIMAL(10,2) DEFAULT 0,
        net_salary DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('draft', 'calculated', 'approved', 'paid')) DEFAULT 'draft',
        calculation_details JSONB,
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(employee_id, period_year, period_month)
    )`,

    // 10. F29 Analyses
    `CREATE TABLE IF NOT EXISTS f29_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        analysis_version INTEGER DEFAULT 1,
        rut_company VARCHAR(20),
        folio VARCHAR(50),
        total_sales DECIMAL(15,2),
        total_purchases DECIMAL(15,2),
        vat_payable DECIMAL(15,2),
        vat_receivable DECIMAL(15,2),
        net_vat DECIMAL(15,2),
        ppm_payment DECIMAL(15,2),
        confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
        data_source VARCHAR(20) CHECK (data_source IN ('pdf_upload', 'manual_entry', 'api_integration')) NOT NULL,
        original_filename VARCHAR(255),
        file_hash VARCHAR(64),
        file_url VARCHAR(500),
        processing_notes TEXT,
        processing_warnings JSONB DEFAULT '[]',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, period_year, period_month, analysis_version)
    )`,

    // 11. Economic Indicators
    `CREATE TABLE IF NOT EXISTS economic_indicators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) CHECK (category IN ('monetary', 'currency', 'crypto', 'labor')) NOT NULL,
        value DECIMAL(15,6) NOT NULL,
        unit VARCHAR(10),
        source VARCHAR(100),
        date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(code, date)
    )`,

    // 12. Digital Signatures
    `CREATE TABLE IF NOT EXISTS digital_signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        document_id UUID NOT NULL,
        document_title VARCHAR(255),
        signer_name VARCHAR(255) NOT NULL,
        signer_rut VARCHAR(20) NOT NULL,
        signer_position VARCHAR(255),
        signer_email VARCHAR(255),
        signature_hash VARCHAR(128) NOT NULL,
        verification_code VARCHAR(20) UNIQUE NOT NULL,
        document_hash VARCHAR(128) NOT NULL,
        signature_algorithm VARCHAR(50) DEFAULT 'SHA256+AES',
        signature_metadata JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        signed_at TIMESTAMPTZ DEFAULT NOW(),
        is_valid BOOLEAN DEFAULT true,
        revoked_at TIMESTAMPTZ,
        revoked_by UUID REFERENCES users(id),
        revocation_reason TEXT
    )`,

    // 13. RCV Entities
    `CREATE TABLE IF NOT EXISTS rcv_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        entity_name VARCHAR(255) NOT NULL,
        entity_rut VARCHAR(20) NOT NULL,
        entity_type VARCHAR(20) CHECK (entity_type IN ('supplier', 'customer', 'both')) NOT NULL,
        account_code VARCHAR(20),
        account_name VARCHAR(255),
        default_tax_rate DECIMAL(5,2) DEFAULT 19.0,
        is_tax_exempt BOOLEAN DEFAULT false,
        tax_classification VARCHAR(50),
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        UNIQUE(company_id, entity_rut)
    )`,

    // 14. Fixed Assets
    `CREATE TABLE IF NOT EXISTS fixed_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        asset_name VARCHAR(255) NOT NULL,
        asset_code VARCHAR(50),
        description TEXT,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        brand VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(100),
        purchase_value DECIMAL(15,2) NOT NULL,
        residual_value DECIMAL(15,2) DEFAULT 0,
        current_value DECIMAL(15,2),
        useful_life_years INTEGER NOT NULL,
        accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
        purchase_date DATE NOT NULL,
        start_depreciation_date DATE NOT NULL,
        location VARCHAR(255),
        responsible_person VARCHAR(255),
        department VARCHAR(100),
        asset_status VARCHAR(20) CHECK (asset_status IN ('active', 'inactive', 'sold', 'scrapped')) DEFAULT 'active',
        asset_account_code VARCHAR(20),
        depreciation_account_code VARCHAR(20),
        accumulated_depreciation_account_code VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        UNIQUE(company_id, asset_code)
    )`,

    // 15. Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100),
        record_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`
];

async function createTables() {
    console.log('🚀 Creando tablas principales de ContaPyme...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const createdTables = [];
    const errors = [];
    
    for (let i = 0; i < createTableStatements.length; i++) {
        const statement = createTableStatements[i];
        
        // Extraer nombre de tabla del statement
        const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        const tableName = match ? match[1] : `tabla_${i + 1}`;
        
        try {
            console.log(`🔧 Creando ${tableName}...`);
            
            // Usar el RPC para ejecutar SQL
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            });
            
            if (error) {
                console.log(`  ❌ Error: ${error.message}`);
                errors.push({ table: tableName, error: error.message });
                errorCount++;
            } else {
                console.log(`  ✅ ${tableName} creada exitosamente`);
                createdTables.push(tableName);
                successCount++;
            }
            
        } catch (err) {
            console.log(`  ❌ Error: ${err.message}`);
            errors.push({ table: tableName, error: err.message });
            errorCount++;
        }
        
        // Pequeña pausa entre tablas
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Resumen de creación de tablas:`);
    console.log(`  ✅ Tablas creadas exitosamente: ${successCount}`);
    console.log(`  ❌ Tablas con errores: ${errorCount}`);
    
    if (errors.length > 0 && errors.length < 10) {
        console.log(`\n⚠️ Errores encontrados:`);
        errors.forEach(err => {
            console.log(`  ${err.table}: ${err.error}`);
        });
    }
    
    return createdTables;
}

async function verifyTables() {
    console.log('\n🔍 Verificando tablas creadas...');
    
    const expectedTables = [
        'companies', 'users', 'company_settings', 'chart_of_accounts', 
        'journal_entries', 'journal_entry_lines', 'employees', 
        'employment_contracts', 'payroll_liquidations', 'f29_analyses',
        'economic_indicators', 'digital_signatures', 'rcv_entities', 
        'fixed_assets', 'audit_logs'
    ];
    
    const foundTables = [];
    
    for (const tableName of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
                
            if (!error) {
                foundTables.push(tableName);
                console.log(`  ✅ ${tableName} - EXISTE`);
            } else if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
                console.log(`  ❌ ${tableName} - NO EXISTE`);
            } else {
                // Tabla existe pero hay RLS u otro error
                foundTables.push(tableName);
                console.log(`  ✅ ${tableName} - EXISTE (RLS activo)`);
            }
        } catch (error) {
            console.log(`  ⚠️ ${tableName} - ERROR: ${error.message}`);
        }
    }
    
    // Verificar tablas críticas específicamente
    console.log('\n🎯 Estado de tablas críticas:');
    const criticalTables = ['employees', 'payroll_liquidations'];
    let criticalTablesExist = 0;
    
    criticalTables.forEach(tableName => {
        if (foundTables.includes(tableName)) {
            console.log(`  ✅ ${tableName} - EXISTE (error de aplicación debería resolverse)`);
            criticalTablesExist++;
        } else {
            console.log(`  ❌ ${tableName} - FALTA (error de aplicación persistirá)`);
        }
    });
    
    return { foundTables, criticalTablesExist };
}

async function createExecFunction() {
    console.log('🔧 Verificando función exec_sql...');
    
    // Intentar usar la función primero
    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: 'SELECT 1 as test'
        });
        
        if (!error) {
            console.log('✅ Función exec_sql está disponible');
            return true;
        }
    } catch (error) {
        // Función no existe, intentar crearla
    }
    
    console.log('⚠️ Función exec_sql no disponible');
    console.log('💡 Nota: Ejecutaremos las sentencias usando método alternativo');
    
    return false;
}

async function main() {
    console.log('🚀 Iniciando creación manual de tablas ContaPyme...\n');
    
    // Verificar función SQL
    const functionAvailable = await createExecFunction();
    
    if (!functionAvailable) {
        console.log('\n❌ No se puede ejecutar SQL directamente');
        console.log('💡 Alternativas:');
        console.log('   1. Usar la consola SQL de Supabase Dashboard');
        console.log('   2. Usar psql directamente');
        console.log('   3. Contactar al administrador de la base de datos');
        return;
    }
    
    // Crear tablas
    const createdTables = await createTables();
    
    // Verificar tablas
    const { foundTables, criticalTablesExist } = await verifyTables();
    
    console.log('\n🎉 Proceso completado!');
    console.log(`📊 Tablas verificadas: ${foundTables.length}`);
    
    if (criticalTablesExist === 2) {
        console.log('\n✅ ¡Éxito! Las tablas críticas (employees, payroll_liquidations) existen');
        console.log('🎯 Los errores de aplicación deberían estar resueltos');
    } else if (criticalTablesExist > 0) {
        console.log('\n⚠️ Algunas tablas críticas existen pero no todas');
        console.log('🔄 Algunos errores de aplicación pueden persistir');
    } else {
        console.log('\n❌ Las tablas críticas no se crearon');
        console.log('⚠️ Los errores de aplicación continuarán');
    }
    
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Verificar la aplicación web');
    console.log('   2. Revisar errores de esquema restantes');
    console.log('   3. Ejecutar seeds si es necesario');
}

// Ejecutar
main().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
});