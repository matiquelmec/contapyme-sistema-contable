-- ============================================
-- CONTAPYME - ESTRUCTURA MODULAR ESCALABLE
-- Migración: 20250908000000
-- Descripción: Base de datos multi-tenant optimizada
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- MÓDULO: CORE SYSTEM (Sistema Central)
-- ============================================

-- Empresas (Multi-tenant desde el diseño)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    rut VARCHAR(20) UNIQUE NOT NULL,
    industry_sector VARCHAR(100),
    company_size VARCHAR(20) CHECK (company_size IN ('micro', 'small', 'medium', 'large')) DEFAULT 'small',
    subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'professional', 'enterprise')) DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'trial')) DEFAULT 'active',
    
    -- Metadatos adicionales
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    
    -- Configuración fiscal
    tax_regime VARCHAR(50),
    accounting_period_start INTEGER DEFAULT 1, -- Mes inicio período contable
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Auditoría
    created_by UUID,
    updated_by UUID
);

-- Usuarios con roles granulares
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')) DEFAULT 'viewer',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Metadatos usuario
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'America/Santiago',
    language VARCHAR(10) DEFAULT 'es-CL'
);

-- Configuración empresarial centralizada
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, module_name)
);

-- ============================================
-- MÓDULO: ACCOUNTING (Contabilidad Avanzada)
-- ============================================

-- Plan de cuentas jerárquico optimizado
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')) NOT NULL,
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    allows_transactions BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Configuración adicional
    account_nature VARCHAR(10) CHECK (account_nature IN ('debit', 'credit')),
    tax_category VARCHAR(50),
    description TEXT,
    
    -- Metadatos
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, account_code)
);

-- Libro diario con trazabilidad completa
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    reference_document VARCHAR(255),
    description TEXT NOT NULL,
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Trazabilidad del origen
    source_module VARCHAR(50), -- 'f29', 'payroll', 'manual', 'rcv', etc.
    source_id UUID, -- ID del documento origen
    
    -- Estados y aprobaciones
    status VARCHAR(20) CHECK (status IN ('draft', 'posted', 'reversed')) DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Control de balance
    CONSTRAINT balanced_entry CHECK (total_debit = total_credit),
    UNIQUE(company_id, entry_number)
);

-- Detalle de asientos optimizado
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    
    -- Trazabilidad de entidades
    entity_rut VARCHAR(20),
    entity_name VARCHAR(255),
    
    -- Orden y agrupación
    line_order INTEGER DEFAULT 1,
    
    -- Validaciones
    CONSTRAINT valid_amounts CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (debit_amount = 0 AND credit_amount > 0)
    )
);

-- ============================================
-- MÓDULO: F29 ANALYSIS (Análisis Tributario)
-- ============================================

-- Análisis F29 con versionado
CREATE TABLE f29_analyses (
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
    file_hash VARCHAR(64), -- SHA-256 del archivo
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

-- Códigos F29 detallados
CREATE TABLE f29_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    f29_analysis_id UUID REFERENCES f29_analyses(id) ON DELETE CASCADE,
    line_code VARCHAR(10) NOT NULL, -- '538', '511', etc.
    line_description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    calculation_source VARCHAR(20) CHECK (calculation_source IN ('extracted', 'calculated', 'manual')) DEFAULT 'extracted',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MÓDULO: PAYROLL (Remuneraciones Avanzadas)
-- ============================================

-- Empleados con historial completo
CREATE TABLE employees (
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

-- Contratos con flexibilidad completa
CREATE TABLE employment_contracts (
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

-- Modificaciones contractuales (para tracking histórico)
CREATE TABLE contract_modifications (
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

-- Liquidaciones optimizadas
CREATE TABLE payroll_liquidations (
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
    bonuses JSONB DEFAULT '{}', -- Estructura flexible para bonos
    allowances JSONB DEFAULT '{}', -- Asignaciones
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
    calculation_details JSONB, -- Para debugging
    
    -- Auditoría
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, period_year, period_month)
);

-- ============================================
-- MÓDULO: ECONOMIC INDICATORS (Indicadores)
-- ============================================

-- Indicadores económicos
CREATE TABLE economic_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL, -- 'UF', 'UTM', 'USD', etc.
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('monetary', 'currency', 'crypto', 'labor')) NOT NULL,
    value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(10), -- 'CLP', 'USD', '%', etc.
    source VARCHAR(100), -- 'banco_central', 'mindicador', 'coingecko'
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(code, date)
);

-- ============================================
-- MÓDULO: DIGITAL SIGNATURES (Firmas)
-- ============================================

-- Firmas digitales con trazabilidad completa
CREATE TABLE digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Documento firmado
    document_type VARCHAR(100) NOT NULL, -- 'balance_8_columns', 'income_statement', etc.
    document_id UUID NOT NULL, -- ID del documento original
    document_title VARCHAR(255),
    
    -- Información del firmante
    signer_name VARCHAR(255) NOT NULL,
    signer_rut VARCHAR(20) NOT NULL,
    signer_position VARCHAR(255),
    signer_email VARCHAR(255),
    
    -- Criptografía
    signature_hash VARCHAR(128) NOT NULL, -- SHA-256 de la firma
    verification_code VARCHAR(20) UNIQUE NOT NULL, -- Código público para verificación
    document_hash VARCHAR(128) NOT NULL, -- Hash del documento firmado
    
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

-- Verificaciones de firma (para auditoría)
CREATE TABLE signature_verifications (
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
-- MÓDULO: RCV ENTITIES (Entidades RCV)
-- ============================================

-- Entidades RCV para automatización
CREATE TABLE rcv_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de la entidad
    entity_name VARCHAR(255) NOT NULL,
    entity_rut VARCHAR(20) NOT NULL,
    entity_type VARCHAR(20) CHECK (entity_type IN ('supplier', 'customer', 'both')) NOT NULL,
    
    -- Configuración contable
    account_code VARCHAR(20), -- Referencia al plan de cuentas
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
-- MÓDULO: FIXED ASSETS (Activos Fijos)
-- ============================================

-- Activos fijos con depreciación automática
CREATE TABLE fixed_assets (
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
    useful_life_months INTEGER GENERATED ALWAYS AS (useful_life_years * 12) STORED,
    monthly_depreciation DECIMAL(15,2) GENERATED ALWAYS AS ((purchase_value - residual_value) / (useful_life_years * 12)) STORED,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    
    -- Fechas importantes
    purchase_date DATE NOT NULL,
    start_depreciation_date DATE NOT NULL,
    end_depreciation_date DATE GENERATED ALWAYS AS (start_depreciation_date + INTERVAL '1 month' * useful_life_years * 12) STORED,
    
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
-- MÓDULO: AUDIT LOGS (Auditoría)
-- ============================================

-- Auditoría completa del sistema
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Acción realizada
    action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
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
-- ÍNDICES OPTIMIZADOS
-- ============================================

-- Índices para companies
CREATE INDEX idx_companies_rut ON companies(rut);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_subscription ON companies(subscription_tier);

-- Índices para users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Índices para chart_of_accounts
CREATE INDEX idx_chart_company_code ON chart_of_accounts(company_id, account_code);
CREATE INDEX idx_chart_company_type ON chart_of_accounts(company_id, account_type);
CREATE INDEX idx_chart_active ON chart_of_accounts(company_id, is_active);

-- Índices para journal_entries
CREATE INDEX idx_journal_company_date ON journal_entries(company_id, entry_date);
CREATE INDEX idx_journal_company_number ON journal_entries(company_id, entry_number);
CREATE INDEX idx_journal_source ON journal_entries(company_id, source_module);
CREATE INDEX idx_journal_status ON journal_entries(company_id, status);

-- Índices para journal_entry_lines
CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);

-- Índices para f29_analyses
CREATE INDEX idx_f29_company_period ON f29_analyses(company_id, period_year, period_month);
CREATE INDEX idx_f29_company_confidence ON f29_analyses(company_id, confidence_score);

-- Índices para employees
CREATE INDEX idx_employees_company_rut ON employees(company_id, rut);
CREATE INDEX idx_employees_status ON employees(company_id, employment_status);
CREATE INDEX idx_employees_code ON employees(company_id, employee_code);

-- Índices para employment_contracts
CREATE INDEX idx_contracts_employee ON employment_contracts(employee_id);
CREATE INDEX idx_contracts_current ON employment_contracts(employee_id, is_current);
CREATE INDEX idx_contracts_dates ON employment_contracts(start_date, end_date);

-- Índices para payroll_liquidations
CREATE INDEX idx_liquidations_employee_period ON payroll_liquidations(employee_id, period_year, period_month);
CREATE INDEX idx_liquidations_company_period ON payroll_liquidations((SELECT company_id FROM employees WHERE id = employee_id), period_year, period_month);
CREATE INDEX idx_liquidations_status ON payroll_liquidations(status);

-- Índices para economic_indicators
CREATE INDEX idx_indicators_code_date ON economic_indicators(code, date);
CREATE INDEX idx_indicators_category ON economic_indicators(category);
CREATE INDEX idx_indicators_date ON economic_indicators(date);

-- Índices para digital_signatures
CREATE INDEX idx_signatures_company ON digital_signatures(company_id);
CREATE INDEX idx_signatures_verification_code ON digital_signatures(verification_code);
CREATE INDEX idx_signatures_document ON digital_signatures(document_type, document_id);
CREATE INDEX idx_signatures_date ON digital_signatures(signed_at);

-- Índices para rcv_entities
CREATE INDEX idx_rcv_entities_company_rut ON rcv_entities(company_id, entity_rut);
CREATE INDEX idx_rcv_entities_type ON rcv_entities(company_id, entity_type);
CREATE INDEX idx_rcv_entities_active ON rcv_entities(company_id, is_active);

-- Índices para fixed_assets
CREATE INDEX idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX idx_fixed_assets_status ON fixed_assets(company_id, asset_status);
CREATE INDEX idx_fixed_assets_category ON fixed_assets(company_id, category);
CREATE INDEX idx_fixed_assets_depreciation ON fixed_assets(company_id, start_depreciation_date);

-- Índices para audit_logs
CREATE INDEX idx_audit_company_date ON audit_logs(company_id, created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_table_action ON audit_logs(table_name, action);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcv_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCIONES ESPECIALIZADAS
-- ============================================

-- Función para obtener la empresa del usuario actual
CREATE OR REPLACE FUNCTION get_user_company_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular depreciación actual de activo fijo
CREATE OR REPLACE FUNCTION calculate_current_depreciation(asset_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    asset_record fixed_assets%ROWTYPE;
    months_since_start INTEGER;
    max_depreciation DECIMAL(15,2);
BEGIN
    SELECT * INTO asset_record FROM fixed_assets WHERE id = asset_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calcular meses transcurridos desde inicio de depreciación
    months_since_start := EXTRACT(YEAR FROM AGE(CURRENT_DATE, asset_record.start_depreciation_date)) * 12 +
                         EXTRACT(MONTH FROM AGE(CURRENT_DATE, asset_record.start_depreciation_date));
    
    -- Depreciación máxima es el valor de compra menos residual
    max_depreciation := asset_record.purchase_value - asset_record.residual_value;
    
    -- Retornar el menor entre depreciación calculada y máxima
    RETURN LEAST(months_since_start * asset_record.monthly_depreciation, max_depreciation);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener contrato vigente en un período específico
CREATE OR REPLACE FUNCTION get_contract_for_period(emp_id UUID, period_year INTEGER, period_month INTEGER)
RETURNS employment_contracts AS $$
DECLARE
    contract employment_contracts%ROWTYPE;
    period_date DATE;
BEGIN
    period_date := make_date(period_year, period_month, 1);
    
    SELECT * INTO contract 
    FROM employment_contracts 
    WHERE employee_id = emp_id 
    AND start_date <= period_date 
    AND (end_date IS NULL OR end_date >= period_date)
    ORDER BY start_date DESC
    LIMIT 1;
    
    RETURN contract;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si debe pagar seguro de cesantía
CREATE OR REPLACE FUNCTION should_pay_unemployment_insurance(contract_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN contract_type = 'indefinite';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_f29_analyses_updated_at BEFORE UPDATE ON f29_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employment_contracts_updated_at BEFORE UPDATE ON employment_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_liquidations_updated_at BEFORE UPDATE ON payroll_liquidations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rcv_entities_updated_at BEFORE UPDATE ON rcv_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fixed_assets_updated_at BEFORE UPDATE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (SEEDS)
-- ============================================

-- Empresa de demostración
INSERT INTO companies (
    id, 
    business_name, 
    legal_name, 
    rut, 
    industry_sector, 
    company_size,
    address,
    phone,
    email,
    tax_regime,
    currency
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ContaPyme Demo',
    'ContaPyme Sistemas Contables Demo SpA',
    '12.345.678-9',
    'Software y Tecnología',
    'small',
    'Av. Providencia 1234, Santiago, Chile',
    '+56 9 9999 9999',
    'demo@contapyme.cl',
    'Primera Categoría',
    'CLP'
) ON CONFLICT (rut) DO NOTHING;

-- Usuario administrador de demo
INSERT INTO users (
    id,
    email,
    full_name,
    role,
    company_id,
    timezone,
    language
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@contapyme.cl',
    'Usuario Demo ContaPyme',
    'owner',
    '00000000-0000-0000-0000-000000000001',
    'America/Santiago',
    'es-CL'
) ON CONFLICT (email) DO NOTHING;

-- Plan de cuentas básico chileno
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, level, account_nature) VALUES
('00000000-0000-0000-0000-000000000001', '1', 'ACTIVOS', 'asset', 1, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1', 'ACTIVOS CORRIENTES', 'asset', 2, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.1', 'DISPONIBLE', 'asset', 3, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.1.001', 'Caja', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.1.002', 'Banco Estado', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.1.003', 'Banco Chile', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.2', 'EXIGIBLE', 'asset', 3, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.2.001', 'Clientes Nacionales', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.1.2.002', 'Documentos por Cobrar', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.3.1.001', 'IVA Crédito Fiscal', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '1.3.1.002', 'PPM', 'asset', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '2', 'PASIVOS', 'liability', 1, 'credit'),
('00000000-0000-0000-0000-000000000001', '2.1', 'PASIVOS CORRIENTES', 'liability', 2, 'credit'),
('00000000-0000-0000-0000-000000000001', '2.1.1.001', 'Proveedores Nacionales', 'liability', 4, 'credit'),
('00000000-0000-0000-0000-000000000001', '2.1.4.001', 'IVA Débito Fiscal', 'liability', 4, 'credit'),
('00000000-0000-0000-0000-000000000001', '3', 'PATRIMONIO', 'equity', 1, 'credit'),
('00000000-0000-0000-0000-000000000001', '3.1.1.001', 'Capital', 'equity', 4, 'credit'),
('00000000-0000-0000-0000-000000000001', '4', 'INGRESOS', 'income', 1, 'credit'),
('00000000-0000-0000-0000-000000000001', '4.1.1.001', 'Ventas', 'income', 4, 'credit'),
('00000000-0000-0000-0000-000000000001', '5', 'GASTOS', 'expense', 1, 'debit'),
('00000000-0000-0000-0000-000000000001', '5.1.1.001', 'Costo de Ventas', 'expense', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '5.2.1.001', 'Remuneraciones', 'expense', 4, 'debit'),
('00000000-0000-0000-0000-000000000001', '5.2.1.002', 'Leyes Sociales', 'expense', 4, 'debit')
ON CONFLICT (company_id, account_code) DO NOTHING;

-- Indicadores económicos iniciales
INSERT INTO economic_indicators (code, name, category, value, unit, source, date) VALUES
('UF', 'Unidad de Fomento', 'monetary', 37924.25, 'CLP', 'banco_central', CURRENT_DATE),
('UTM', 'Unidad Tributaria Mensual', 'monetary', 66236, 'CLP', 'sii', CURRENT_DATE),
('USD', 'Dólar Estadounidense', 'currency', 950.50, 'CLP', 'banco_central', CURRENT_DATE),
('EUR', 'Euro', 'currency', 1031.75, 'CLP', 'banco_central', CURRENT_DATE),
('BTC', 'Bitcoin', 'crypto', 44823.45, 'USD', 'coingecko', CURRENT_DATE)
ON CONFLICT (code, date) DO NOTHING;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE companies IS 'Empresas del sistema - Diseño multi-tenant';
COMMENT ON TABLE users IS 'Usuarios con roles granulares por empresa';
COMMENT ON TABLE chart_of_accounts IS 'Plan de cuentas jerárquico optimizado';
COMMENT ON TABLE journal_entries IS 'Libro diario con trazabilidad completa';
COMMENT ON TABLE f29_analyses IS 'Análisis de formularios F29 con versionado';
COMMENT ON TABLE employees IS 'Empleados con historial completo';
COMMENT ON TABLE employment_contracts IS 'Contratos con modificaciones temporales';
COMMENT ON TABLE payroll_liquidations IS 'Liquidaciones de sueldo optimizadas';
COMMENT ON TABLE economic_indicators IS 'Indicadores económicos chilenos';
COMMENT ON TABLE digital_signatures IS 'Firmas digitales con verificación criptográfica';
COMMENT ON TABLE rcv_entities IS 'Entidades RCV para automatización contable';
COMMENT ON TABLE fixed_assets IS 'Activos fijos con depreciación automática';
COMMENT ON TABLE audit_logs IS 'Auditoría completa del sistema';

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Confirmar que la migración se completó exitosamente
SELECT 'ContaPyme - Estructura modular escalable creada exitosamente' as resultado,
       COUNT(*) as total_tablas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';