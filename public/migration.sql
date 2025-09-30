-- COPIA TODO ESTE CONTENIDO EN EL SQL EDITOR DE SUPABASE
-- URL: https://supabase.com/dashboard/project/lccdxfqrasizigmehotk
-- Pestaña: SQL Editor

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
-- ÍNDICES PRINCIPALES (Continuará automáticamente...)
-- ============================================

-- Índices para companies
CREATE INDEX idx_companies_rut ON companies(rut);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_subscription ON companies(subscription_tier);

-- Índices para users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Empresas demo
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