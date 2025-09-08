-- ==========================================
-- SCRIPT DE CONFIGURACIÓN INICIAL F29 ANALYSIS
-- Para PostgreSQL directo (sin Docker)
-- ==========================================

-- Crear base de datos y usuario
-- EJECUTAR COMO ADMINISTRADOR DE POSTGRESQL:
-- CREATE DATABASE contapyme_db;
-- CREATE USER contapyme_user WITH PASSWORD 'contapyme_pass';
-- GRANT ALL PRIVILEGES ON DATABASE contapyme_db TO contapyme_user;

-- Conectar a la base de datos contapyme_db y ejecutar:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'CLIENT', 'ACCOUNTANT');
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE report_type AS ENUM ('BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW', 'TRIAL_BALANCE');

-- Users table (simplificada para desarrollo)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'CLIENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla principal de formularios F29
CREATE TABLE IF NOT EXISTS f29_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Metadatos del archivo
  period VARCHAR(6) NOT NULL, -- 202401, 202402, etc.
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name VARCHAR(255),
  file_size INTEGER,
  
  -- Información básica extraída
  rut VARCHAR(20),
  folio VARCHAR(50),
  year INTEGER,
  month INTEGER,
  
  -- Datos extraídos (JSON para flexibilidad total)
  raw_data JSONB NOT NULL DEFAULT '{}',
  calculated_data JSONB NOT NULL DEFAULT '{}',
  
  -- Métricas principales (para queries rápidas sin JSON)
  ventas_netas DECIMAL(15,2) DEFAULT 0,
  compras_netas DECIMAL(15,2) DEFAULT 0,
  iva_debito DECIMAL(15,2) DEFAULT 0,        -- Código 538
  iva_credito DECIMAL(15,2) DEFAULT 0,       -- Código 511
  iva_determinado DECIMAL(15,2) DEFAULT 0,   -- 538 - 511
  ppm DECIMAL(15,2) DEFAULT 0,               -- Código 062
  remanente DECIMAL(15,2) DEFAULT 0,         -- Código 077
  total_a_pagar DECIMAL(15,2) DEFAULT 0,
  margen_bruto DECIMAL(15,2) DEFAULT 0,
  
  -- Códigos específicos F29 más comunes
  codigo_538 DECIMAL(15,2) DEFAULT 0,  -- Débito Fiscal
  codigo_511 DECIMAL(15,2) DEFAULT 0,  -- Crédito Fiscal
  codigo_563 DECIMAL(15,2) DEFAULT 0,  -- Ventas Netas
  codigo_062 DECIMAL(15,2) DEFAULT 0,  -- PPM
  codigo_077 DECIMAL(15,2) DEFAULT 0,  -- Remanente
  
  -- Validación y confianza
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed', 'manual_review')),
  validation_errors JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, period), -- Un F29 por período por empresa
  CHECK (period ~ '^[0-9]{6}$'), -- Formato YYYYMM
  CHECK (year >= 2020 AND year <= 2030),
  CHECK (month >= 1 AND month <= 12)
);

-- Tabla para análisis comparativos cachéados
CREATE TABLE IF NOT EXISTS f29_comparative_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Rango de períodos analizados
  period_start VARCHAR(6) NOT NULL,  -- 202301
  period_end VARCHAR(6) NOT NULL,    -- 202312
  period_range VARCHAR(20) GENERATED ALWAYS AS (period_start || '-' || period_end) STORED,
  
  -- Datos del análisis (JSON optimizado)
  analysis_data JSONB NOT NULL DEFAULT '{}',
  
  -- Métricas resumidas para queries rápidas
  total_periods INTEGER DEFAULT 0,
  avg_monthly_sales DECIMAL(15,2) DEFAULT 0,
  growth_rate DECIMAL(5,2) DEFAULT 0,
  best_month VARCHAR(6),
  worst_month VARCHAR(6),
  
  -- Insights automáticos generados
  insights JSONB DEFAULT '[]',
  trends JSONB DEFAULT '{}',
  seasonality JSONB DEFAULT '{}',
  anomalies JSONB DEFAULT '[]',
  
  -- Metadatos del análisis
  analysis_version VARCHAR(10) DEFAULT '1.0',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un análisis por empresa por rango de períodos
  UNIQUE(company_id, period_range)
);

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_f29_company_period ON f29_forms(company_id, period);
CREATE INDEX IF NOT EXISTS idx_f29_period ON f29_forms(period);
CREATE INDEX IF NOT EXISTS idx_f29_company_year_month ON f29_forms(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_f29_validation_status ON f29_forms(validation_status);
CREATE INDEX IF NOT EXISTS idx_f29_upload_date ON f29_forms(upload_date DESC);

-- Función para calcular métricas automáticamente
CREATE OR REPLACE FUNCTION calculate_f29_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Extraer valores de calculated_data JSON
  NEW.ventas_netas := COALESCE((NEW.calculated_data->>'codigo563')::DECIMAL(15,2), 0);
  NEW.iva_debito := COALESCE((NEW.calculated_data->>'codigo538')::DECIMAL(15,2), 0);
  NEW.iva_credito := COALESCE((NEW.calculated_data->>'codigo511')::DECIMAL(15,2), 0);
  NEW.ppm := COALESCE((NEW.calculated_data->>'codigo062')::DECIMAL(15,2), 0);
  NEW.remanente := COALESCE((NEW.calculated_data->>'codigo077')::DECIMAL(15,2), 0);
  
  -- Calcular valores derivados
  NEW.iva_determinado := NEW.iva_debito - NEW.iva_credito;
  NEW.compras_netas := CASE WHEN NEW.iva_debito > 0 THEN NEW.iva_debito / 0.19 ELSE 0 END;
  NEW.margen_bruto := NEW.ventas_netas - NEW.compras_netas;
  NEW.total_a_pagar := NEW.iva_determinado + NEW.ppm + NEW.remanente;
  
  -- Sincronizar códigos específicos
  NEW.codigo_538 := NEW.iva_debito;
  NEW.codigo_511 := NEW.iva_credito;
  NEW.codigo_563 := NEW.ventas_netas;
  NEW.codigo_062 := NEW.ppm;
  NEW.codigo_077 := NEW.remanente;
  
  -- Extraer año y mes del período
  NEW.year := SUBSTRING(NEW.period, 1, 4)::INTEGER;
  NEW.month := SUBSTRING(NEW.period, 5, 2)::INTEGER;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para cálculo automático
DROP TRIGGER IF EXISTS trigger_calculate_f29_metrics ON f29_forms;
CREATE TRIGGER trigger_calculate_f29_metrics
  BEFORE INSERT OR UPDATE ON f29_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_f29_metrics();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers de updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_f29_forms_updated_at ON f29_forms;
CREATE TRIGGER update_f29_forms_updated_at BEFORE UPDATE ON f29_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_f29_analysis_updated_at ON f29_comparative_analysis;
CREATE TRIGGER update_f29_analysis_updated_at BEFORE UPDATE ON f29_comparative_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos de prueba
INSERT INTO users (id, email, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'matias@contapyme.cl', 'Matías Riquelme')
ON CONFLICT (email) DO NOTHING;

INSERT INTO companies (id, name, rut, user_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Empresa Demo F29', '76.123.456-7', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (rut) DO NOTHING;

-- Mensaje de confirmación
SELECT 'Base de datos F29 Analysis configurada correctamente!' AS status;