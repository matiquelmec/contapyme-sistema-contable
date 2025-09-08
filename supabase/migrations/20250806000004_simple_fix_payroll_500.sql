-- ==========================================
-- FIX SIMPLE: AGREGAR EMPRESA MISSING PARA PAYROLL API
-- Fecha: 6 de agosto, 2025
-- Problema: API payroll/employees busca company_id que no existe
-- ==========================================

-- PASO 1: Insertar empresa que está siendo referenciada por el frontend
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

-- PASO 2: Insertar empleados demo
INSERT INTO employees (
    id,
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
    '550e8400-e29b-41d4-a716-446655440001',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    '12.345.678-9',
    'Juan Carlos',
    'González',
    'Pérez',
    '1985-06-15',
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
    '2024-01-15T09:00:00Z'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    '11.111.111-1',
    'María Elena',
    'Rodríguez',
    NULL,
    '1990-03-22',
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
    '2024-02-01T09:00:00Z'
) ON CONFLICT (id) DO NOTHING;

-- PASO 3: Insertar contratos
INSERT INTO employment_contracts (
    id,
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
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'indefinido',
    'Contador Senior',
    'Contabilidad',
    '2024-01-15',
    1200000.00,
    'monthly',
    45.00,
    'active',
    '2024-01-15T09:30:00Z'
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'indefinido',
    'Asistente Administrativo',
    'Administración',
    '2024-02-01',
    800000.00,
    'monthly',
    45.00,
    'active',
    '2024-02-01T09:30:00Z'
) ON CONFLICT (id) DO NOTHING;

-- PASO 4: Insertar configuración previsional (solo si existe la tabla)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
        INSERT INTO payroll_config (
            id,
            employee_id,
            afp_code,
            health_institution_code,
            family_allowances,
            created_at
        ) VALUES 
        (
            '770e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440001',
            'HABITAT',
            'FONASA',
            2,
            '2024-01-15T10:00:00Z'
        ),
        (
            '770e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440002',
            'PROVIDA',
            'FONASA',
            0,
            '2024-02-01T10:00:00Z'
        ) ON CONFLICT (employee_id) DO NOTHING;
        
        RAISE NOTICE 'Configuración previsional creada para empleados';
    END IF;
END $$;

-- PASO 5: Verificación final
SELECT 
    'Fix completado - Empresa y empleados creados exitosamente' as status,
    COUNT(*) as total_employees
FROM employees 
WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- Mostrar datos creados
SELECT 
    e.first_name || ' ' || e.last_name as empleado,
    e.rut,
    ec.position,
    ec.base_salary
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
ORDER BY e.first_name;