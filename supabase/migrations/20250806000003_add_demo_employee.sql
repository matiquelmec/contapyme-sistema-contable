-- ==========================================
-- AGREGAR EMPLEADO DEMO PARA TESTING PAYROLL API
-- Fecha: 6 de agosto, 2025
-- ==========================================

-- Insertar empleado demo para la empresa ContaPyme
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
    created_at,
    created_by
) VALUES (
    'demo-employee-001',
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
    '2024-01-15T09:00:00Z',
    '550e8400-e29b-41d4-a716-446655440000'
) ON CONFLICT (id) DO NOTHING;

-- Insertar contrato para el empleado
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
    created_at,
    created_by
) VALUES (
    'demo-contract-001',
    'demo-employee-001',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'indefinido',
    'Contador Senior',
    'Contabilidad',
    '2024-01-15',
    1200000.00,
    'monthly',
    45.00,
    'active',
    '2024-01-15T09:30:00Z',
    '550e8400-e29b-41d4-a716-446655440000'
) ON CONFLICT (id) DO NOTHING;

-- Insertar configuración previsional
INSERT INTO payroll_config (
    id,
    employee_id,
    afp_name,
    afp_commission,
    health_system,
    health_provider,
    family_charges,
    created_at
) VALUES (
    'demo-payroll-config-001',
    'demo-employee-001',
    'Habitat',
    1.27,
    'fonasa',
    'FONASA',
    2,
    '2024-01-15T10:00:00Z'
) ON CONFLICT (employee_id) DO NOTHING;

-- Insertar segundo empleado para tener más datos
INSERT INTO employees (
    id,
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
    address,
    city,
    region,
    status,
    created_at
) VALUES (
    'demo-employee-002',
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    '11.111.111-1',
    'María Elena',
    'Rodríguez',
    '1990-03-22',
    'Femenino',
    'Soltera',
    'Chilena',
    'maria.rodriguez@contapyme.cl',
    '+56 2 2987 5434',
    'San Francisco 567, Casa 12',
    'Santiago',
    'Metropolitana',
    'active',
    '2024-02-01T09:00:00Z'
) ON CONFLICT (id) DO NOTHING;

-- Contrato para segundo empleado
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
) VALUES (
    'demo-contract-002',
    'demo-employee-002',
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

-- Configuración previsional para segundo empleado
INSERT INTO payroll_config (
    id,
    employee_id,
    afp_name,
    afp_commission,
    health_system,
    health_provider,
    family_charges,
    created_at
) VALUES (
    'demo-payroll-config-002',
    'demo-employee-002',
    'Provida',
    1.45,
    'fonasa',
    'FONASA',
    0,
    '2024-02-01T10:00:00Z'
) ON CONFLICT (employee_id) DO NOTHING;

-- Verificar datos insertados
SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.rut,
    ec.position,
    ec.base_salary,
    pc.afp_name,
    pc.family_charges
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id
LEFT JOIN payroll_config pc ON e.id = pc.employee_id
WHERE e.company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
ORDER BY e.first_name;

-- Mensaje de confirmación
SELECT 'Empleados demo creados exitosamente para ContaPyme Demo Enterprise' as status;