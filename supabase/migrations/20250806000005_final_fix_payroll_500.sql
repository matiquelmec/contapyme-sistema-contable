-- ==========================================
-- FIX FINAL: PAYROLL API 500 ERROR - Sin problemas UUID
-- Fecha: 6 de agosto, 2025
-- ==========================================

-- PASO 1: Crear empresa que busca el frontend
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
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    updated_at = CURRENT_TIMESTAMP;

-- PASO 2: Crear empleados usando gen_random_uuid()
WITH inserted_employees AS (
    INSERT INTO employees (
        company_id,
        rut,
        first_name,
        last_name,
        middle_name,
        birth_date,
        gender,
        marital_status,
        nationality,
        email,
        phone,
        mobile_phone,
        address,
        city,
        region,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        status,
        created_at
    ) VALUES 
    (
        '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
        '12.345.678-9',
        'Juan Carlos',
        'González',
        'Pérez',
        '1985-06-15'::DATE,
        'Masculino',
        'Casado',
        'Chilena',
        'juan.gonzalez@contapyme.cl',
        '+56 2 2987 5433',
        '+56 9 8765 4321',
        'Los Alerces 1234, Depto 5B',
        'Santiago',
        'Metropolitana',
        '7500000',
        'María González',
        '+56 9 8765 4322',
        'Esposa',
        'active',
        '2024-01-15T09:00:00Z'::TIMESTAMPTZ
    ),
    (
        '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
        '11.111.111-1',
        'María Elena',
        'Rodríguez',
        NULL,
        '1990-03-22'::DATE,
        'Femenino',
        'Soltera',
        'Chilena',
        'maria.rodriguez@contapyme.cl',
        '+56 2 2987 5434',
        '+56 9 8765 4323',
        'San Francisco 567, Casa 12',
        'Santiago',
        'Metropolitana',
        '7500001',
        'Pedro Rodríguez',
        '+56 9 8765 4324',
        'Padre',
        'active',
        '2024-02-01T09:00:00Z'::TIMESTAMPTZ
    )
    ON CONFLICT (rut, company_id) DO NOTHING
    RETURNING id, first_name, rut
)
SELECT 'Empleados creados: ' || COUNT(*) as employees_created FROM inserted_employees;

-- PASO 3: Crear contratos para los empleados recién creados
INSERT INTO employment_contracts (
    employee_id,
    company_id,
    contract_type,
    position,
    department,
    start_date,
    base_salary,
    salary_type,
    weekly_hours,
    status,
    created_at
)
SELECT 
    e.id,
    '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
    'indefinido',
    CASE 
        WHEN e.rut = '12.345.678-9' THEN 'Contador Senior'
        WHEN e.rut = '11.111.111-1' THEN 'Asistente Administrativo'
        ELSE 'Empleado'
    END,
    CASE 
        WHEN e.rut = '12.345.678-9' THEN 'Contabilidad'
        WHEN e.rut = '11.111.111-1' THEN 'Administración'
        ELSE 'General'
    END,
    CASE 
        WHEN e.rut = '12.345.678-9' THEN '2024-01-15'::DATE
        WHEN e.rut = '11.111.111-1' THEN '2024-02-01'::DATE
        ELSE CURRENT_DATE
    END,
    CASE 
        WHEN e.rut = '12.345.678-9' THEN 1200000.00
        WHEN e.rut = '11.111.111-1' THEN 800000.00
        ELSE 500000.00
    END,
    'monthly',
    45.00,
    'active',
    CURRENT_TIMESTAMP
FROM employees e
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID
  AND e.rut IN ('12.345.678-9', '11.111.111-1')
ON CONFLICT DO NOTHING;

-- PASO 4: Crear configuración previsional (solo si la tabla existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
        INSERT INTO payroll_config (
            employee_id,
            afp_code,
            health_institution_code,
            family_allowances,
            created_at
        )
        SELECT 
            e.id,
            CASE 
                WHEN e.rut = '12.345.678-9' THEN 'HABITAT'
                WHEN e.rut = '11.111.111-1' THEN 'PROVIDA'
                ELSE 'HABITAT'
            END,
            'FONASA',
            CASE 
                WHEN e.rut = '12.345.678-9' THEN 2
                WHEN e.rut = '11.111.111-1' THEN 0
                ELSE 0
            END,
            CURRENT_TIMESTAMP
        FROM employees e
        WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID
          AND e.rut IN ('12.345.678-9', '11.111.111-1')
        ON CONFLICT (employee_id) DO NOTHING;
        
        RAISE NOTICE 'Configuración previsional creada para empleados';
    ELSE
        RAISE NOTICE 'Tabla payroll_config no existe - omitiendo configuración previsional';
    END IF;
END $$;

-- PASO 5: Verificación final
SELECT 
    'Fix completado exitosamente' as status,
    (SELECT COUNT(*) FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as companies_created,
    (SELECT COUNT(*) FROM employees WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as employees_created,
    (SELECT COUNT(*) FROM employment_contracts WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as contracts_created;

-- Mostrar empleados creados
SELECT 
    e.first_name || ' ' || e.last_name as empleado,
    e.rut,
    ec.position,
    ec.base_salary::TEXT as salario,
    pc.afp_code,
    pc.family_allowances
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id AND ec.status = 'active'
LEFT JOIN payroll_config pc ON e.id = pc.employee_id
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID
ORDER BY e.first_name;