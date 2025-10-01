-- ==========================================
-- MIGRACIÓN: CHART OF ACCOUNTS MULTI-TENANT
-- Fecha: 01 Oct 2025 16:00:00
-- Descripción: Migrar chart_of_accounts a sistema multi-empresa
-- ==========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- FUNCIÓN HELPER
-- ==========================================

CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_name
        AND column_name = column_name
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRAR CHART_OF_ACCOUNTS A MULTI-TENANT
-- ==========================================

DO $$
DECLARE
    company_default_id UUID;
    records_migrated INTEGER := 0;
BEGIN
    -- Verificar si existe la tabla companies y obtener una empresa por defecto
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        SELECT id INTO company_default_id
        FROM companies
        WHERE status = 'active'
        ORDER BY created_at ASC
        LIMIT 1;

        IF company_default_id IS NULL THEN
            -- Crear empresa por defecto si no existe ninguna
            INSERT INTO companies (
                business_name, legal_name, rut, industry_sector,
                address, phone, email, status, created_at
            ) VALUES (
                'Empresa Demo', 'Empresa Demo Ltda.', '12345678-9', 'Servicios',
                'Santiago, Chile', '+56912345678', 'demo@contapyme.cl', 'active', NOW()
            ) RETURNING id INTO company_default_id;

            RAISE NOTICE '✅ Empresa demo creada: %', company_default_id;
        END IF;
    ELSE
        RAISE EXCEPTION '❌ Tabla companies no existe. Ejecutar primero migraciones de empresas.';
    END IF;

    -- Verificar estructura actual de chart_of_accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN

        -- Caso 1: Si ya tiene company_id, no hacer nada
        IF column_exists('chart_of_accounts', 'company_id') THEN
            RAISE NOTICE '⚠️ La tabla chart_of_accounts ya es multi-tenant';

        -- Caso 2: Si NO tiene company_id, migrar estructura
        ELSE
            RAISE NOTICE '🔄 Migrando chart_of_accounts a multi-tenant...';

            -- Crear tabla temporal con nueva estructura
            CREATE TABLE chart_of_accounts_new (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                company_id UUID NOT NULL,
                code VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                account_type VARCHAR(50) NOT NULL,
                level_type VARCHAR(20) NOT NULL DEFAULT 'Imputable',
                parent_code VARCHAR(20),
                level INTEGER NOT NULL DEFAULT 1,
                is_active BOOLEAN DEFAULT true,
                is_system BOOLEAN DEFAULT false,
                is_detail BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),

                -- Constraint único por empresa
                UNIQUE(company_id, code)
            );

            -- Migrar datos existentes a la nueva estructura
            INSERT INTO chart_of_accounts_new (
                company_id, code, name, description, account_type, level_type,
                parent_code, level, is_active, is_system, is_detail, created_at, updated_at
            )
            SELECT
                company_default_id, -- Asignar a empresa por defecto
                code, name,
                COALESCE(description, ''),
                account_type, level_type,
                parent_code, level,
                COALESCE(is_active, true),
                COALESCE(is_system, false),
                COALESCE(is_detail, true),
                COALESCE(created_at, NOW()),
                COALESCE(updated_at, NOW())
            FROM chart_of_accounts
            WHERE code IS NOT NULL;

            GET DIAGNOSTICS records_migrated = ROW_COUNT;

            -- Renombrar tablas (swap)
            ALTER TABLE chart_of_accounts RENAME TO chart_of_accounts_old;
            ALTER TABLE chart_of_accounts_new RENAME TO chart_of_accounts;

            -- Crear índices
            CREATE INDEX IF NOT EXISTS idx_chart_accounts_company ON chart_of_accounts(company_id);
            CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON chart_of_accounts(code);
            CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON chart_of_accounts(account_type);
            CREATE INDEX IF NOT EXISTS idx_chart_accounts_active ON chart_of_accounts(is_active);
            CREATE INDEX IF NOT EXISTS idx_chart_accounts_company_code ON chart_of_accounts(company_id, code);

            -- Agregar foreign key
            ALTER TABLE chart_of_accounts
            ADD CONSTRAINT fk_chart_accounts_company
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

            RAISE NOTICE '✅ % registros migrados a estructura multi-tenant', records_migrated;
        END IF;

    ELSE
        -- Crear tabla desde cero
        RAISE NOTICE '🆕 Creando chart_of_accounts multi-tenant desde cero...';

        CREATE TABLE chart_of_accounts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID NOT NULL,
            code VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            account_type VARCHAR(50) NOT NULL,
            level_type VARCHAR(20) NOT NULL DEFAULT 'Imputable',
            parent_code VARCHAR(20),
            level INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN DEFAULT true,
            is_system BOOLEAN DEFAULT false,
            is_detail BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),

            -- Constraint único por empresa
            UNIQUE(company_id, code)
        );

        -- Índices
        CREATE INDEX idx_chart_accounts_company ON chart_of_accounts(company_id);
        CREATE INDEX idx_chart_accounts_code ON chart_of_accounts(code);
        CREATE INDEX idx_chart_accounts_type ON chart_of_accounts(account_type);
        CREATE INDEX idx_chart_accounts_active ON chart_of_accounts(is_active);
        CREATE INDEX idx_chart_accounts_company_code ON chart_of_accounts(company_id, code);

        -- Foreign key
        ALTER TABLE chart_of_accounts
        ADD CONSTRAINT fk_chart_accounts_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

        -- Insertar plan de cuentas básico
        INSERT INTO chart_of_accounts (company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail) VALUES
        -- Estructura básica
        (company_default_id, '1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false),
        (company_default_id, '1.1', 'ACTIVOS CORRIENTES', 'Activo', '2do Nivel', '1', 2, true, false),
        (company_default_id, '1.1.1', 'Efectivo y Equivalentes', 'Activo', '3er Nivel', '1.1', 3, true, false),
        (company_default_id, '1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true),
        (company_default_id, '1.1.1.002', 'Banco Estado', 'Activo', 'Imputable', '1.1.1', 4, true, true),

        (company_default_id, '2', 'PASIVOS', 'Pasivo', 'Titulo', NULL, 1, true, false),
        (company_default_id, '2.1', 'PASIVOS CORRIENTES', 'Pasivo', '2do Nivel', '2', 2, true, false),
        (company_default_id, '2.1.3', 'Pasivos por Impuestos', 'Pasivo', '3er Nivel', '2.1', 3, true, false),
        (company_default_id, '2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true),

        (company_default_id, '5', 'INGRESOS', 'Ingreso', 'Titulo', NULL, 1, true, false),
        (company_default_id, '5.1', 'INGRESOS OPERACIONALES', 'Ingreso', '2do Nivel', '5', 2, true, false),
        (company_default_id, '5.1.1', 'Ventas', 'Ingreso', '3er Nivel', '5.1', 3, true, false),
        (company_default_id, '5.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '5.1.1', 4, true, true);

        GET DIAGNOSTICS records_migrated = ROW_COUNT;
        RAISE NOTICE '✅ % cuentas básicas creadas', records_migrated;
    END IF;

    -- Habilitar RLS
    ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

    -- Política: Los usuarios solo ven cuentas de sus empresas
    DROP POLICY IF EXISTS "chart_accounts_company_access" ON chart_of_accounts;
    CREATE POLICY "chart_accounts_company_access" ON chart_of_accounts
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM user_companies uc
                WHERE uc.company_id = chart_of_accounts.company_id
                AND uc.user_id = auth.uid()
                AND uc.is_active = true
            )
        );

    RAISE NOTICE '🎉 MIGRACIÓN CHART_OF_ACCOUNTS COMPLETADA';
END $$;

-- ==========================================
-- TRIGGER PARA UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chart_accounts_updated_at ON chart_of_accounts;
CREATE TRIGGER chart_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ==========================================
-- FUNCIONES AUXILIARES
-- ==========================================

-- Función para obtener cuentas de una empresa
CREATE OR REPLACE FUNCTION get_company_chart_accounts(company_uuid UUID)
RETURNS TABLE(
    id UUID,
    code VARCHAR(20),
    name VARCHAR(255),
    account_type VARCHAR(50),
    level_type VARCHAR(20),
    parent_code VARCHAR(20),
    level INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ca.id, ca.code, ca.name, ca.account_type, ca.level_type,
        ca.parent_code, ca.level, ca.is_active
    FROM chart_of_accounts ca
    WHERE ca.company_id = company_uuid
    AND ca.is_active = true
    ORDER BY ca.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpiar función helper
DROP FUNCTION IF EXISTS column_exists(text, text);

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

DO $$
DECLARE
    cuentas_count INTEGER;
    empresas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cuentas_count FROM chart_of_accounts;
    SELECT COUNT(*) INTO empresas_count FROM companies WHERE status = 'active';

    RAISE NOTICE '📊 ESTADO FINAL:';
    RAISE NOTICE 'Cuentas: % | Empresas activas: %', cuentas_count, empresas_count;
END $$;

-- Resultado
SELECT
    '✅ Chart of Accounts Multi-Tenant Ready' as status,
    COUNT(*) as total_accounts,
    COUNT(DISTINCT company_id) as companies_with_accounts
FROM chart_of_accounts
WHERE is_active = true;