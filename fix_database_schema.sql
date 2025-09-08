-- ============================================
-- FIX CONTAPYME DATABASE SCHEMA ISSUES
-- Fecha: 2025-09-08
-- Descripción: Arreglar inconsistencias entre código y base de datos
-- ============================================

-- 1. AGREGAR COLUMNAS FALTANTES EN EMPLOYEES
-- El código busca first_name, last_name pero tenemos full_name
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 2. MIGRAR DATOS DE full_name A first_name/last_name SI EXISTEN
UPDATE employees 
SET 
    first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = CASE 
        WHEN array_length(string_to_array(full_name, ' '), 1) >= 2 
        THEN array_to_string(string_to_array(full_name, ' ')[2:], ' ')
        ELSE full_name
    END
WHERE full_name IS NOT NULL 
AND (first_name IS NULL OR last_name IS NULL);

-- 3. CREAR TABLA PAYROLL_CONFIG QUE FALTA
CREATE TABLE IF NOT EXISTS payroll_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Previsión
    afp_code VARCHAR(20) DEFAULT 'HABITAT',
    health_institution_code VARCHAR(20) DEFAULT 'FONASA',
    health_plan_value DECIMAL(10,2) DEFAULT 0,
    
    -- Cargas familiares
    family_allowances INTEGER DEFAULT 0,
    
    -- Otros beneficios
    transportation_allowance DECIMAL(8,2) DEFAULT 0,
    food_allowance DECIMAL(8,2) DEFAULT 0,
    housing_allowance DECIMAL(8,2) DEFAULT 0,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(employee_id)
);

-- 4. AGREGAR CAMPOS FALTANTES EN EMPLOYMENT_CONTRACTS
ALTER TABLE employment_contracts
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'indefinido',
ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS weekly_hours DECIMAL(5,2) DEFAULT 44,
ADD COLUMN IF NOT EXISTS entry_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS exit_time TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS lunch_break_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS job_functions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS obligations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS prohibitions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 5. CORREGIR DATOS EN EMPLOYMENT_CONTRACTS SI POSITION_TITLE EXISTE
UPDATE employment_contracts 
SET position = position_title 
WHERE position IS NULL AND position_title IS NOT NULL;

-- 6. ÍNDICES PARA PAYROLL_CONFIG
CREATE INDEX IF NOT EXISTS idx_payroll_config_employee ON payroll_config(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_config_company ON payroll_config(company_id);

-- 7. HABILITAR RLS EN PAYROLL_CONFIG
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;

-- 8. TRIGGER PARA UPDATE_AT EN PAYROLL_CONFIG
CREATE TRIGGER update_payroll_config_updated_at 
BEFORE UPDATE ON payroll_config 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 9. CREAR REGISTROS DEMO PARA TESTING
-- Empresa demo
INSERT INTO employees (
    id, 
    company_id, 
    employee_code,
    rut, 
    full_name,
    first_name,
    last_name,
    email, 
    phone,
    employment_status,
    hire_date,
    current_position,
    current_department
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001', -- Demo company
    'EMP001',
    '12.345.678-9',
    'Juan Carlos Pérez González',
    'Juan Carlos',
    'Pérez González',
    'juan.perez@contapyme.cl',
    '+56 9 8888 8888',
    'active',
    '2024-01-15',
    'Contador Senior',
    'Contabilidad'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    current_position = EXCLUDED.current_position,
    current_department = EXCLUDED.current_department;

-- Contrato demo
INSERT INTO employment_contracts (
    id,
    employee_id,
    contract_type,
    start_date,
    base_salary,
    position,
    department,
    working_hours_per_week,
    is_current
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'indefinite',
    '2024-01-15',
    800000,
    'Contador Senior',
    'Contabilidad',
    44,
    true
) ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position,
    department = EXCLUDED.department,
    base_salary = EXCLUDED.base_salary;

-- Configuración previsional demo
INSERT INTO payroll_config (
    employee_id,
    company_id,
    afp_code,
    health_institution_code,
    family_allowances
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'HABITAT',
    'FONASA',
    1
) ON CONFLICT (employee_id) DO UPDATE SET
    afp_code = EXCLUDED.afp_code,
    health_institution_code = EXCLUDED.health_institution_code;

-- 10. VERIFICACIÓN FINAL
SELECT 'Database schema fixed successfully!' as result;

-- Contar registros para verificar
SELECT 
    (SELECT COUNT(*) FROM employees) as employees_count,
    (SELECT COUNT(*) FROM employment_contracts) as contracts_count,
    (SELECT COUNT(*) FROM payroll_config) as payroll_config_count,
    (SELECT COUNT(*) FROM payroll_settings) as payroll_settings_count;