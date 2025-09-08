-- Migración para resolver conflictos en la tabla companies
-- Fecha: 6 de Agosto 2025
-- Problema: Dos definiciones diferentes de companies en initial_schema.sql y companies_structure.sql

-- ==========================================
-- PASO 1: DROP TABLE companies SI EXISTE CON ESTRUCTURA ANTIGUA
-- ==========================================

-- Verificar si existe la tabla companies con la estructura antigua (con user_id)
-- Si existe, la eliminamos para crear la nueva estructura unificada

-- Primero, eliminar las foreign keys que dependen de companies
DROP TABLE IF EXISTS f29_forms CASCADE;
DROP TABLE IF EXISTS fixed_assets CASCADE;  
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS employment_contracts CASCADE;
DROP TABLE IF EXISTS payroll_config CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS economic_indicators CASCADE;

-- Eliminar la tabla companies actual (sea cual sea su estructura)
DROP TABLE IF EXISTS companies CASCADE;

-- ==========================================
-- PASO 2: CREAR TABLA COMPANIES UNIFICADA
-- ==========================================

-- Crear la tabla companies con la estructura completa y unificada
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Información básica (compatible con estructura antigua)
    name VARCHAR(255) NOT NULL,           -- Nombre de la empresa
    rut VARCHAR(20) UNIQUE NOT NULL,      -- RUT chileno (formato flexible)
    address TEXT,                         -- Dirección
    phone VARCHAR(20),                    -- Teléfono
    email VARCHAR(255),                   -- Email
    
    -- Información extendida (nueva estructura)
    razon_social VARCHAR(255),            -- Si es diferente del name
    nombre_fantasia VARCHAR(255),         -- Nombre comercial
    giro TEXT,                           -- Actividad económica
    website VARCHAR(255),                -- Sitio web
    logo VARCHAR(500),                   -- URL del logo
    
    -- Configuración de cuenta
    plan_tipo VARCHAR(20) DEFAULT 'demo' CHECK (plan_tipo IN ('demo', 'basico', 'profesional', 'empresarial')),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'inactivo')),
    
    -- Autenticación y usuarios (preparado para futuro)
    owner_user_id UUID,                  -- Compatible con user_id anterior  
    password_hash VARCHAR(255),          -- Para autenticación directa
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Configuración y límites
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    -- Restricciones
    CONSTRAINT valid_rut CHECK (
        rut ~ '^[0-9]+-[0-9Kk]$' OR           -- Formato simple: 12345678-9
        rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$' -- Formato con puntos: 12.345.678-9
    )
);

-- ==========================================
-- PASO 3: INSERTAR EMPRESA DEMO
-- ==========================================

-- Empresa demo unificada (funciona para todos los módulos)
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
    'demo-company-12345678-9',
    'PyME Ejemplo S.A.',
    '12.345.678-9',
    'PyME Ejemplo S.A.',
    'PyME Ejemplo',
    'Servicios de Consultoría y Asesoría Empresarial',
    'Av. Providencia 1234, Piso 8, Oficina 802, Providencia, Santiago',
    '+56 2 2345 6789',
    'contacto@pymeejemplo.cl',
    'https://pymeejemplo.cl',
    'demo',
    'activo',
    '{
        "f29Analysis": true,
        "f29Comparative": true,
        "economicIndicators": true,
        "fixedAssets": true,
        "payroll": true,
        "reports": true,
        "configuration": true,
        "chartOfAccounts": true
    }',
    '{
        "employees": 50,
        "f29Documents": 24,
        "fixedAssets": 100,
        "storage": "500MB"
    }',
    '2024-01-15T10:00:00Z'
) ON CONFLICT (rut) DO UPDATE SET
    name = EXCLUDED.name,
    razon_social = EXCLUDED.razon_social,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits;

-- ==========================================
-- PASO 4: RECREAR TABLAS DEPENDIENTES
-- ==========================================

-- Recrear tabla users si no existe (compatible con estructura inicial)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'CLIENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar usuario demo si no existe
INSERT INTO users (id, email, name, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'demo@pymeejemplo.cl', 'Usuario Demo', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Actualizar company con owner_user_id
UPDATE companies SET owner_user_id = '550e8400-e29b-41d4-a716-446655440000' 
WHERE id = 'demo-company-12345678-9';

-- ==========================================
-- PASO 5: RECREAR TABLA EMPLOYEES
-- ==========================================

CREATE TABLE employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información Personal
    rut VARCHAR(12) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    birth_date DATE NOT NULL,
    gender VARCHAR(20),
    marital_status VARCHAR(30),
    nationality VARCHAR(50) DEFAULT 'Chilena',
    
    -- Información de Contacto
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Información de Emergencia
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, terminated
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_employee_rut_company UNIQUE (rut, company_id)
);

-- ==========================================
-- PASO 6: RECREAR TABLA EMPLOYMENT_CONTRACTS
-- ==========================================

CREATE TABLE employment_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del Contrato
    contract_type VARCHAR(50) NOT NULL DEFAULT 'indefinido',
    position VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    
    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE,
    trial_period_end_date DATE,
    
    -- Información Salarial
    base_salary DECIMAL(12,2) NOT NULL,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Jornada Laboral
    work_schedule VARCHAR(50) DEFAULT 'full_time',
    weekly_hours DECIMAL(4,2) DEFAULT 45,
    
    -- Beneficios
    health_insurance VARCHAR(100),
    pension_fund VARCHAR(100),
    
    -- Estado del Contrato
    status VARCHAR(20) DEFAULT 'active',
    termination_date DATE,
    termination_reason TEXT,
    
    -- Documentos
    contract_document_url TEXT,
    signed_date DATE,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_contract_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_termination_date CHECK (termination_date IS NULL OR termination_date >= start_date)
);

-- ==========================================
-- PASO 7: RECREAR TABLA PAYROLL_CONFIG
-- ==========================================

CREATE TABLE payroll_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Configuración AFP
    afp_name VARCHAR(50),
    afp_commission DECIMAL(5,2) DEFAULT 1.27,
    
    -- Configuración Salud
    health_system VARCHAR(20) DEFAULT 'fonasa', -- fonasa, isapre
    health_provider VARCHAR(100),
    health_plan VARCHAR(100),
    health_plan_uf DECIMAL(5,2),
    
    -- Configuración AFC (Seguro de Cesantía)
    afc_contract_type VARCHAR(20) DEFAULT 'indefinido',
    
    -- Cargas familiares
    family_charges INTEGER DEFAULT 0,
    
    -- Depósito convenido
    has_agreed_deposit BOOLEAN DEFAULT false,
    agreed_deposit_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_payroll_config_employee UNIQUE (employee_id)
);

-- ==========================================
-- PASO 8: FUNCIONES Y TRIGGERS
-- ==========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at 
    BEFORE UPDATE ON employment_contracts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PASO 9: ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices companies
CREATE INDEX idx_companies_rut ON companies(rut);
CREATE INDEX idx_companies_estado ON companies(estado);
CREATE INDEX idx_companies_plan_tipo ON companies(plan_tipo);

-- Índices employees
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_rut ON employees(rut);
CREATE INDEX idx_employees_status ON employees(status);

-- Índices employment_contracts
CREATE INDEX idx_contracts_employee_id ON employment_contracts(employee_id);
CREATE INDEX idx_contracts_company_id ON employment_contracts(company_id);
CREATE INDEX idx_contracts_status ON employment_contracts(status);

-- ==========================================
-- PASO 10: VISTAS Y FUNCIONES ÚTILES
-- ==========================================

-- Vista de empleados con contrato activo
CREATE OR REPLACE VIEW employee_active_contracts AS
SELECT 
    e.*,
    ec.position,
    ec.department,
    ec.contract_type,
    ec.start_date,
    ec.end_date,
    ec.base_salary,
    ec.salary_type,
    ec.weekly_hours,
    ec.status as contract_status
FROM employees e
LEFT JOIN employment_contracts ec ON e.id = ec.employee_id
WHERE ec.status = 'active'
ORDER BY e.first_name, e.last_name;

-- Función para obtener empresa demo
CREATE OR REPLACE FUNCTION get_demo_company()
RETURNS companies AS $$
BEGIN
    RETURN (SELECT * FROM companies WHERE id = 'demo-company-12345678-9' LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PASO 11: RLS (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas para empresa demo (acceso público para testing)
CREATE POLICY "Demo company visible" ON companies
    FOR ALL USING (id = 'demo-company-12345678-9');

CREATE POLICY "Demo employees visible" ON employees
    FOR ALL USING (company_id = 'demo-company-12345678-9');

CREATE POLICY "Demo contracts visible" ON employment_contracts
    FOR ALL USING (company_id = 'demo-company-12345678-9');

-- ==========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE companies IS 'Tabla unificada de empresas - compatible con todos los módulos';
COMMENT ON TABLE employees IS 'Tabla de empleados con información personal completa';
COMMENT ON TABLE employment_contracts IS 'Contratos laborales con información salarial y beneficios';
COMMENT ON TABLE payroll_config IS 'Configuración previsional específica por empleado';

-- Verificación final
SELECT 'Migration completed successfully - Companies table unified' as status;