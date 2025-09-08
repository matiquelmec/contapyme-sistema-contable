-- ==========================================
-- FIX: AGREGAR EMPRESA MISSING PARA PAYROLL API
-- Fecha: 6 de agosto, 2025
-- Problema: API payroll/employees busca company_id '8033ee69-b420-4d91-ba0e-482f46cd6fce' que no existe
-- ==========================================

-- Insertar empresa que está siendo referenciada por el frontend
INSERT INTO companies (
    id,
    name,
    rut,
    razon_social,
    nombre_fantasia,
    giro,
    address,
    phone,
    email,
    website,
    plan_tipo,
    estado,
    features,
    limits,
    created_at
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'ContaPyme Demo Enterprise',
    '76.123.456-7',
    'ContaPyme Demo Enterprise S.A.',
    'ContaPyme Demo',
    'Servicios de Contabilidad y Gestión Empresarial',
    'Av. Apoquindo 3000, Piso 15, Las Condes, Santiago',
    '+56 2 2987 5432',
    'demo@contapyme.cl',
    'https://contapyme.netlify.app',
    'empresarial',
    'activo',
    '{
        "f29Analysis": true,
        "f29Comparative": true,
        "economicIndicators": true,
        "fixedAssets": true,
        "payroll": true,
        "reports": true,
        "configuration": true,
        "chartOfAccounts": true,
        "journalEntries": true
    }',
    '{
        "employees": 100,
        "f29Documents": 48,
        "fixedAssets": 500,
        "storage": "2GB"
    }',
    '2024-01-01T08:00:00Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    updated_at = CURRENT_TIMESTAMP;

-- Crear política RLS para esta empresa también
DO $$
BEGIN
    -- Política para companies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'companies' 
        AND policyname = 'ContaPyme Demo Enterprise visible'
    ) THEN
        CREATE POLICY "ContaPyme Demo Enterprise visible" ON companies
            FOR ALL USING (id = '8033ee69-b420-4d91-ba0e-482f46cd6fce');
    END IF;

    -- Política para employees
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees' 
        AND policyname = 'ContaPyme Demo Enterprise employees visible'
    ) THEN
        CREATE POLICY "ContaPyme Demo Enterprise employees visible" ON employees
            FOR ALL USING (company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce');
    END IF;

    -- Política para employment_contracts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employment_contracts' 
        AND policyname = 'ContaPyme Demo Enterprise contracts visible'
    ) THEN
        CREATE POLICY "ContaPyme Demo Enterprise contracts visible" ON employment_contracts
            FOR ALL USING (company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce');
    END IF;

    -- Política para payroll_config (solo si la tabla existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'payroll_config' 
            AND policyname = 'ContaPyme Demo Enterprise payroll visible'
        ) THEN
            CREATE POLICY "ContaPyme Demo Enterprise payroll visible" ON payroll_config
                FOR ALL USING (
                    employee_id IN (
                        SELECT id FROM employees 
                        WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
                    )
                );
        END IF;
    END IF;
END $$;

-- Verificar que la empresa fue creada correctamente
SELECT 
    id,
    name,
    rut,
    plan_tipo,
    estado,
    created_at
FROM companies 
WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- Mensaje de confirmación
SELECT 'Empresa ContaPyme Demo Enterprise creada exitosamente' as status;