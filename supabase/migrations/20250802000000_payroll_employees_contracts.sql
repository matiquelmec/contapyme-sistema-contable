-- Migración para el módulo de Payroll - Empleados y Contratos
-- Fecha: 2 de Agosto 2025

-- Tabla de Empleados
CREATE TABLE IF NOT EXISTS employees (
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
    nationality VARCHAR(50),
    
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

-- Tabla de Contratos
CREATE TABLE IF NOT EXISTS employment_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del Contrato
    contract_type VARCHAR(50) NOT NULL, -- indefinido, plazo_fijo, por_obra, part_time
    position VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    
    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE, -- NULL para contratos indefinidos
    trial_period_end_date DATE,
    
    -- Información Salarial
    base_salary DECIMAL(10,2) NOT NULL,
    salary_type VARCHAR(20) NOT NULL, -- monthly, hourly, daily
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Jornada Laboral
    work_schedule VARCHAR(50), -- full_time, part_time, por_turnos
    weekly_hours DECIMAL(4,2),
    
    -- Beneficios
    health_insurance VARCHAR(100),
    pension_fund VARCHAR(100),
    
    -- Estado del Contrato
    status VARCHAR(20) DEFAULT 'active', -- draft, active, terminated, expired
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

-- Índices para mejorar performance
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_rut ON employees(rut);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_full_name ON employees(first_name, last_name);

CREATE INDEX idx_contracts_employee_id ON employment_contracts(employee_id);
CREATE INDEX idx_contracts_company_id ON employment_contracts(company_id);
CREATE INDEX idx_contracts_status ON employment_contracts(status);
CREATE INDEX idx_contracts_dates ON employment_contracts(start_date, end_date);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON employment_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para obtener información completa de empleados con contrato activo
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

-- Comentarios para documentación
COMMENT ON TABLE employees IS 'Tabla de empleados de la empresa';
COMMENT ON TABLE employment_contracts IS 'Tabla de contratos laborales';
COMMENT ON COLUMN employees.status IS 'Estado del empleado: active, inactive, terminated';
COMMENT ON COLUMN employment_contracts.contract_type IS 'Tipo de contrato: indefinido, plazo_fijo, por_obra, part_time';
COMMENT ON COLUMN employment_contracts.salary_type IS 'Tipo de salario: monthly, hourly, daily';