-- ==========================================
-- FIX ULTRA SIMPLE: PAYROLL API 500 ERROR
-- Sin ON CONFLICT, sin problemas
-- Fecha: 6 de agosto, 2025
-- ==========================================

-- PASO 1: Verificar si la empresa ya existe, si no, crearla
DO $$
BEGIN
    -- Solo insertar si no existe
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') THEN
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
        RAISE NOTICE 'Empresa ContaPyme Demo Enterprise creada';
    ELSE
        RAISE NOTICE 'Empresa ContaPyme Demo Enterprise ya existe';
    END IF;
END $$;

-- PASO 2: Crear empleado Juan Carlos si no existe
DO $$
DECLARE
    employee_id_1 UUID;
BEGIN
    -- Verificar si el empleado ya existe
    SELECT id INTO employee_id_1 
    FROM employees 
    WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce' 
    AND rut = '12.345.678-9';
    
    -- Si no existe, crearlo
    IF employee_id_1 IS NULL THEN
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
        ) VALUES (
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
        ) RETURNING id INTO employee_id_1;
        
        RAISE NOTICE 'Empleado Juan Carlos González creado con ID: %', employee_id_1;
        
        -- Crear contrato para Juan Carlos
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
        ) VALUES (
            employee_id_1,
            '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
            'indefinido',
            'Contador Senior',
            'Contabilidad',
            '2024-01-15'::DATE,
            1200000.00,
            'monthly',
            45.00,
            'active',
            '2024-01-15T09:30:00Z'::TIMESTAMPTZ
        );
        
        RAISE NOTICE 'Contrato creado para Juan Carlos González';
        
        -- Crear configuración previsional si la tabla existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
            INSERT INTO payroll_config (
                employee_id,
                afp_code,
                health_institution_code,
                family_allowances,
                created_at
            ) VALUES (
                employee_id_1,
                'HABITAT',
                'FONASA',
                2,
                '2024-01-15T10:00:00Z'::TIMESTAMPTZ
            );
            RAISE NOTICE 'Configuración previsional creada para Juan Carlos González';
        END IF;
    ELSE
        RAISE NOTICE 'Empleado Juan Carlos González ya existe con ID: %', employee_id_1;
    END IF;
END $$;

-- PASO 3: Crear empleado María Elena si no existe
DO $$
DECLARE
    employee_id_2 UUID;
BEGIN
    -- Verificar si el empleado ya existe
    SELECT id INTO employee_id_2 
    FROM employees 
    WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce' 
    AND rut = '11.111.111-1';
    
    -- Si no existe, crearlo
    IF employee_id_2 IS NULL THEN
        INSERT INTO employees (
            company_id,
            rut,
            first_name,
            last_name,
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
        ) VALUES (
            '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
            '11.111.111-1',
            'María Elena',
            'Rodríguez',
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
        ) RETURNING id INTO employee_id_2;
        
        RAISE NOTICE 'Empleado María Elena Rodríguez creada con ID: %', employee_id_2;
        
        -- Crear contrato para María Elena
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
        ) VALUES (
            employee_id_2,
            '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
            'indefinido',
            'Asistente Administrativo',
            'Administración',
            '2024-02-01'::DATE,
            800000.00,
            'monthly',
            45.00,
            'active',
            '2024-02-01T09:30:00Z'::TIMESTAMPTZ
        );
        
        RAISE NOTICE 'Contrato creado para María Elena Rodríguez';
        
        -- Crear configuración previsional si la tabla existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
            INSERT INTO payroll_config (
                employee_id,
                afp_code,
                health_institution_code,
                family_allowances,
                created_at
            ) VALUES (
                employee_id_2,
                'PROVIDA',
                'FONASA',
                0,
                '2024-02-01T10:00:00Z'::TIMESTAMPTZ
            );
            RAISE NOTICE 'Configuración previsional creada para María Elena Rodríguez';
        END IF;
    ELSE
        RAISE NOTICE 'Empleado María Elena Rodríguez ya existe con ID: %', employee_id_2;
    END IF;
END $$;

-- PASO 4: Verificación final
SELECT 
    'Fix completado exitosamente' as status,
    (SELECT COUNT(*) FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as companies_count,
    (SELECT COUNT(*) FROM employees WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as employees_count,
    (SELECT COUNT(*) FROM employment_contracts WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce') as contracts_count;

-- Mostrar empleados creados
SELECT 
    e.first_name || ' ' || e.last_name as empleado,
    e.rut,
    ec.position,
    '$' || ec.base_salary::TEXT as salario,
    COALESCE(pc.afp_code, 'Sin configurar') as afp,
    COALESCE(pc.family_allowances::TEXT, '0') as cargas_familiares
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id AND ec.status = 'active'
LEFT JOIN payroll_config pc ON e.id = pc.employee_id
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID
ORDER BY e.first_name;