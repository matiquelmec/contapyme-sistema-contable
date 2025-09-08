-- ============================================
-- CONTAPYME - TABLAS FALTANTES
-- Fecha: 2025-09-08
-- Descripción: Script para crear las tablas que faltan en la base de datos
-- ============================================

-- Habilitar extensiones necesarias (si no están)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: EMPLOYEES (CRÍTICA - Requerida por la aplicación)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    rut VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    
    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Fechas importantes
    hire_date DATE NOT NULL,
    termination_date DATE,
    birth_date DATE,
    
    -- Estado actual
    current_position VARCHAR(255),
    current_department VARCHAR(255),
    employment_status VARCHAR(20) CHECK (employment_status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
    
    -- Información bancaria
    bank_name VARCHAR(100),
    bank_account_type VARCHAR(20),
    bank_account_number VARCHAR(50),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, rut),
    UNIQUE(company_id, employee_code)
);

-- ============================================
-- TABLA: EMPLOYMENT_CONTRACTS
-- ============================================
CREATE TABLE IF NOT EXISTS employment_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Tipo y duración
    contract_type VARCHAR(20) CHECK (contract_type IN ('indefinite', 'fixed_term', 'part_time', 'internship', 'project')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Remuneración
    base_salary DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Jornada
    working_hours_per_week INTEGER DEFAULT 45,
    working_days_per_week INTEGER DEFAULT 5,
    
    -- Cargo y ubicación
    position_title VARCHAR(255),
    department VARCHAR(255),
    work_location VARCHAR(255),
    
    -- Previsión
    afp_code VARCHAR(10),
    health_insurance_code VARCHAR(10),
    health_insurance_amount DECIMAL(8,2) DEFAULT 0,
    
    -- Beneficios
    has_legal_gratification BOOLEAN DEFAULT false,
    gratification_percentage DECIMAL(5,2) DEFAULT 25.0,
    
    -- Asignaciones
    family_allowance DECIMAL(8,2) DEFAULT 0,
    transportation_allowance DECIMAL(8,2) DEFAULT 0,
    meal_allowance DECIMAL(8,2) DEFAULT 0,
    housing_allowance DECIMAL(8,2) DEFAULT 0,
    
    -- Documentos
    contract_document_path VARCHAR(500),
    
    -- Estado
    is_current BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLA: CONTRACT_MODIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS contract_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES employment_contracts(id) ON DELETE CASCADE,
    modification_type VARCHAR(20) CHECK (modification_type IN ('salary', 'hours', 'position', 'department', 'contract_type', 'benefits', 'other')) NOT NULL,
    effective_date DATE NOT NULL,
    old_value JSONB,
    new_value JSONB NOT NULL,
    reason VARCHAR(500),
    supporting_document VARCHAR(500),
    
    -- Aprobación
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: PAYROLL_LIQUIDATIONS (CRÍTICA - Requerida por la aplicación)
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_liquidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Configuración base
    base_salary DECIMAL(10,2) NOT NULL,
    worked_days INTEGER DEFAULT 30,
    worked_hours DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    
    -- Haberes
    gross_salary DECIMAL(10,2) NOT NULL,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonuses JSONB DEFAULT '{}',
    allowances JSONB DEFAULT '{}',
    legal_gratification DECIMAL(10,2) DEFAULT 0,
    
    -- Descuentos legales
    afp_contribution DECIMAL(10,2) DEFAULT 0,
    health_contribution DECIMAL(10,2) DEFAULT 0,
    unemployment_insurance DECIMAL(10,2) DEFAULT 0,
    income_tax DECIMAL(10,2) DEFAULT 0,
    
    -- Otros descuentos
    other_deductions JSONB DEFAULT '{}',
    advances DECIMAL(10,2) DEFAULT 0,
    loans DECIMAL(10,2) DEFAULT 0,
    
    -- Resultado final
    net_salary DECIMAL(10,2) NOT NULL,
    
    -- Estados y aprobación
    status VARCHAR(20) CHECK (status IN ('draft', 'calculated', 'approved', 'paid')) DEFAULT 'draft',
    calculation_details JSONB,
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, period_year, period_month)
);

-- ============================================
-- TABLA: F29_ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS f29_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    analysis_version INTEGER DEFAULT 1,
    
    -- Información del formulario
    rut_company VARCHAR(20),
    folio VARCHAR(50),
    
    -- Montos principales
    total_sales DECIMAL(15,2),
    total_purchases DECIMAL(15,2),
    vat_payable DECIMAL(15,2),
    vat_receivable DECIMAL(15,2),
    net_vat DECIMAL(15,2),
    ppm_payment DECIMAL(15,2),
    
    -- Calidad y fuente
    confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    data_source VARCHAR(20) CHECK (data_source IN ('pdf_upload', 'manual_entry', 'api_integration')) NOT NULL,
    
    -- Archivo origen
    original_filename VARCHAR(255),
    file_hash VARCHAR(64),
    file_url VARCHAR(500),
    
    -- Procesamiento
    processing_notes TEXT,
    processing_warnings JSONB DEFAULT '[]',
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, period_year, period_month, analysis_version)
);

-- ============================================
-- TABLA: F29_LINE_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS f29_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    f29_analysis_id UUID REFERENCES f29_analyses(id) ON DELETE CASCADE,
    line_code VARCHAR(10) NOT NULL,
    line_description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    calculation_source VARCHAR(20) CHECK (calculation_source IN ('extracted', 'calculated', 'manual')) DEFAULT 'extracted',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: ECONOMIC_INDICATORS
-- ============================================
CREATE TABLE IF NOT EXISTS economic_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('monetary', 'currency', 'crypto', 'labor')) NOT NULL,
    value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(10),
    source VARCHAR(100),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(code, date)
);

-- ============================================
-- TABLA: DIGITAL_SIGNATURES
-- ============================================
CREATE TABLE IF NOT EXISTS digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Documento firmado
    document_type VARCHAR(100) NOT NULL,
    document_id UUID NOT NULL,
    document_title VARCHAR(255),
    
    -- Información del firmante
    signer_name VARCHAR(255) NOT NULL,
    signer_rut VARCHAR(20) NOT NULL,
    signer_position VARCHAR(255),
    signer_email VARCHAR(255),
    
    -- Criptografía
    signature_hash VARCHAR(128) NOT NULL,
    verification_code VARCHAR(20) UNIQUE NOT NULL,
    document_hash VARCHAR(128) NOT NULL,
    
    -- Metadatos de la firma
    signature_algorithm VARCHAR(50) DEFAULT 'SHA256+AES',
    signature_metadata JSONB DEFAULT '{}',
    
    -- Contexto de la firma
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Estado de la firma
    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT
);

-- ============================================
-- TABLA: SIGNATURE_VERIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS signature_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_id UUID REFERENCES digital_signatures(id) ON DELETE CASCADE,
    verification_code VARCHAR(20) NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    verifier_ip INET,
    verifier_user_agent TEXT,
    verification_result BOOLEAN NOT NULL,
    verification_details JSONB DEFAULT '{}'
);

-- ============================================
-- TABLA: RCV_ENTITIES
-- ============================================
CREATE TABLE IF NOT EXISTS rcv_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de la entidad
    entity_name VARCHAR(255) NOT NULL,
    entity_rut VARCHAR(20) NOT NULL,
    entity_type VARCHAR(20) CHECK (entity_type IN ('supplier', 'customer', 'both')) NOT NULL,
    
    -- Configuración contable
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    
    -- Configuración fiscal
    default_tax_rate DECIMAL(5,2) DEFAULT 19.0,
    is_tax_exempt BOOLEAN DEFAULT false,
    tax_classification VARCHAR(50),
    
    -- Información adicional
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Estadísticas de uso
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(company_id, entity_rut)
);

-- ============================================
-- TABLA: FIXED_ASSETS
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información básica
    asset_name VARCHAR(255) NOT NULL,
    asset_code VARCHAR(50),
    description TEXT,
    
    -- Clasificación
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Valores financieros
    purchase_value DECIMAL(15,2) NOT NULL,
    residual_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2),
    
    -- Depreciación
    useful_life_years INTEGER NOT NULL,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    
    -- Fechas importantes
    purchase_date DATE NOT NULL,
    start_depreciation_date DATE NOT NULL,
    
    -- Ubicación y responsable
    location VARCHAR(255),
    responsible_person VARCHAR(255),
    department VARCHAR(100),
    
    -- Estado
    asset_status VARCHAR(20) CHECK (asset_status IN ('active', 'inactive', 'sold', 'scrapped')) DEFAULT 'active',
    
    -- Configuración contable
    asset_account_code VARCHAR(20),
    depreciation_account_code VARCHAR(20),
    accumulated_depreciation_account_code VARCHAR(20),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, asset_code)
);

-- ============================================
-- TABLA: AUDIT_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Acción realizada
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    
    -- Datos del cambio
    old_values JSONB,
    new_values JSONB,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES OPTIMIZADOS PARA TABLAS NUEVAS
-- ============================================

-- Índices para employees
CREATE INDEX IF NOT EXISTS idx_employees_company_rut ON employees(company_id, rut);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(company_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(company_id, employee_code);

-- Índices para employment_contracts
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON employment_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_current ON employment_contracts(employee_id, is_current);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON employment_contracts(start_date, end_date);

-- Índices para payroll_liquidations
CREATE INDEX IF NOT EXISTS idx_liquidations_employee_period ON payroll_liquidations(employee_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_liquidations_status ON payroll_liquidations(status);

-- Índices para f29_analyses
CREATE INDEX IF NOT EXISTS idx_f29_company_period ON f29_analyses(company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_f29_company_confidence ON f29_analyses(company_id, confidence_score);

-- Índices para economic_indicators
CREATE INDEX IF NOT EXISTS idx_indicators_code_date ON economic_indicators(code, date);
CREATE INDEX IF NOT EXISTS idx_indicators_category ON economic_indicators(category);
CREATE INDEX IF NOT EXISTS idx_indicators_date ON economic_indicators(date);

-- Índices para digital_signatures
CREATE INDEX IF NOT EXISTS idx_signatures_company ON digital_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_signatures_verification_code ON digital_signatures(verification_code);
CREATE INDEX IF NOT EXISTS idx_signatures_document ON digital_signatures(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_date ON digital_signatures(signed_at);

-- Índices para rcv_entities
CREATE INDEX IF NOT EXISTS idx_rcv_entities_company_rut ON rcv_entities(company_id, entity_rut);
CREATE INDEX IF NOT EXISTS idx_rcv_entities_type ON rcv_entities(company_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_rcv_entities_active ON rcv_entities(company_id, is_active);

-- Índices para fixed_assets
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(company_id, asset_status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(company_id, category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_depreciation ON fixed_assets(company_id, start_depreciation_date);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_company_date ON audit_logs(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table_action ON audit_logs(table_name, action);

-- ============================================
-- ROW LEVEL SECURITY (RLS) PARA NUEVAS TABLAS
-- ============================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcv_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar indicadores económicos iniciales (solo si no existen)
INSERT INTO economic_indicators (code, name, category, value, unit, source, date) 
VALUES 
    ('UF', 'Unidad de Fomento', 'monetary', 37924.25, 'CLP', 'banco_central', CURRENT_DATE),
    ('UTM', 'Unidad Tributaria Mensual', 'monetary', 66236, 'CLP', 'sii', CURRENT_DATE),
    ('USD', 'Dólar Estadounidense', 'currency', 950.50, 'CLP', 'banco_central', CURRENT_DATE),
    ('EUR', 'Euro', 'currency', 1031.75, 'CLP', 'banco_central', CURRENT_DATE)
ON CONFLICT (code, date) DO NOTHING;

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a nuevas tablas
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employment_contracts_updated_at 
    BEFORE UPDATE ON employment_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_liquidations_updated_at 
    BEFORE UPDATE ON payroll_liquidations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_f29_analyses_updated_at 
    BEFORE UPDATE ON f29_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rcv_entities_updated_at 
    BEFORE UPDATE ON rcv_entities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_assets_updated_at 
    BEFORE UPDATE ON fixed_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE employees IS 'Empleados con historial completo - TABLA CRÍTICA para resolver errores de aplicación';
COMMENT ON TABLE employment_contracts IS 'Contratos con modificaciones temporales';
COMMENT ON TABLE payroll_liquidations IS 'Liquidaciones de sueldo optimizadas - TABLA CRÍTICA para resolver errores de aplicación';
COMMENT ON TABLE f29_analyses IS 'Análisis de formularios F29 con versionado';
COMMENT ON TABLE economic_indicators IS 'Indicadores económicos chilenos';
COMMENT ON TABLE digital_signatures IS 'Firmas digitales con verificación criptográfica';
COMMENT ON TABLE rcv_entities IS 'Entidades RCV para automatización contable';
COMMENT ON TABLE fixed_assets IS 'Activos fijos con depreciación automática';
COMMENT ON TABLE audit_logs IS 'Auditoría completa del sistema';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Confirmar que las tablas críticas se crearon exitosamente
SELECT 'MIGRACIÓN COMPLETADA - Tablas críticas creadas:' as resultado,
       COUNT(*) as total_tablas_nuevas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'payroll_liquidations', 'f29_analyses', 'economic_indicators', 'digital_signatures', 'rcv_entities', 'fixed_assets', 'audit_logs')
AND table_type = 'BASE TABLE';

-- Mostrar estado específico de tablas críticas
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees' AND table_schema = 'public')
        THEN '✅ employees - CREADA'
        ELSE '❌ employees - FALLÓ'
    END as tabla_employees,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_liquidations' AND table_schema = 'public')
        THEN '✅ payroll_liquidations - CREADA' 
        ELSE '❌ payroll_liquidations - FALLÓ'
    END as tabla_payroll_liquidations;