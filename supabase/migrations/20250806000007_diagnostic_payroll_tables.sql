-- ==========================================
-- DIAGNÓSTICO: VERIFICAR ESTADO TABLAS PAYROLL
-- Fecha: 6 de agosto, 2025
-- ==========================================

-- PASO 1: Verificar si existe la empresa
SELECT 
    'VERIFICACIÓN EMPRESA' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') 
        THEN '✅ EMPRESA EXISTE' 
        ELSE '❌ EMPRESA NO EXISTE' 
    END as result,
    (SELECT COUNT(*) FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as count_found;

-- PASO 2: Verificar estructura de tabla employees
SELECT 
    'VERIFICACIÓN TABLA EMPLOYEES' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
        THEN '✅ TABLA EMPLOYEES EXISTE' 
        ELSE '❌ TABLA EMPLOYEES NO EXISTE' 
    END as result,
    (SELECT COUNT(*) FROM employees WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as employees_count;

-- PASO 3: Verificar estructura de tabla employment_contracts
SELECT 
    'VERIFICACIÓN TABLA EMPLOYMENT_CONTRACTS' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employment_contracts') 
        THEN '✅ TABLA EMPLOYMENT_CONTRACTS EXISTE' 
        ELSE '❌ TABLA EMPLOYMENT_CONTRACTS NO EXISTE' 
    END as result,
    (SELECT COUNT(*) FROM employment_contracts WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as contracts_count;

-- PASO 4: Verificar estructura de tabla payroll_config
SELECT 
    'VERIFICACIÓN TABLA PAYROLL_CONFIG' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') 
        THEN '✅ TABLA PAYROLL_CONFIG EXISTE' 
        ELSE '❌ TABLA PAYROLL_CONFIG NO EXISTE' 
    END as result,
    (SELECT COUNT(*) FROM payroll_config pc 
     JOIN employees e ON pc.employee_id = e.id 
     WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as payroll_configs_count;

-- PASO 5: Mostrar empleados si existen
SELECT 
    'EMPLEADOS ENCONTRADOS' as info_type,
    e.id,
    e.first_name,
    e.last_name,
    e.rut,
    e.company_id,
    ec.position,
    ec.base_salary,
    pc.afp_code,
    pc.family_allowances
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id AND ec.status = 'active'
LEFT JOIN payroll_config pc ON e.id = pc.employee_id
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
ORDER BY e.first_name;

-- PASO 6: Verificar columnas de tabla employees (para detectar problemas de estructura)
SELECT 
    'ESTRUCTURA TABLA EMPLOYEES' as info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 7: Verificar si hay problemas de foreign keys
SELECT 
    'FOREIGN KEY CONSTRAINTS' as info_type,
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('employees', 'employment_contracts', 'payroll_config')
ORDER BY tc.table_name;

-- PASO 8: Si la empresa no existe, crearla ahora
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') THEN
        -- Intentar crear la empresa
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
            '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
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
            }'::JSONB,
            '{
                "employees": 100,
                "f29Documents": 48,
                "fixedAssets": 500,
                "storage": "2GB"
            }'::JSONB,
            '2024-01-01T08:00:00Z'::TIMESTAMPTZ
        );
        RAISE NOTICE '🔧 EMPRESA CREADA: ContaPyme Demo Enterprise';
    ELSE
        RAISE NOTICE '✅ EMPRESA YA EXISTE: ContaPyme Demo Enterprise';
    END IF;
END $$;

-- PASO 9: Mensaje final
SELECT '🔍 DIAGNÓSTICO COMPLETADO - Revisa los resultados arriba' as status;