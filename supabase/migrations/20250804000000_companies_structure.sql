-- Tabla de empresas (preparada para futuro, no afecta funcionalidad actual)
-- Solo se ejecuta cuando se active modo empresarial

CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_fantasia VARCHAR(255),
    giro TEXT,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo VARCHAR(500),
    
    -- Configuración de cuenta
    plan_tipo VARCHAR(20) DEFAULT 'basico' CHECK (plan_tipo IN ('demo', 'basico', 'profesional', 'empresarial')),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'inactivo')),
    
    -- Autenticación (preparada para futuro)
    password_hash VARCHAR(255), -- Cuando se active autenticación real
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
    
    -- Índices para performance
    CONSTRAINT valid_rut CHECK (rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$')
);

-- Empresa demo (insertada automáticamente)
INSERT INTO companies (
    id,
    rut,
    razon_social,
    nombre_fantasia,
    giro,
    direccion,
    telefono,
    email,
    website,
    plan_tipo,
    estado,
    features,
    limits,
    created_at
) VALUES (
    'demo-company-12345678-9',
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
        "configuration": true
    }',
    '{
        "employees": 10,
        "f29Documents": 24,
        "storage": "100MB"
    }',
    '2024-01-15T10:00:00Z'
) ON CONFLICT (rut) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_rut ON companies(rut);
CREATE INDEX IF NOT EXISTS idx_companies_estado ON companies(estado);
CREATE INDEX IF NOT EXISTS idx_companies_plan_tipo ON companies(plan_tipo);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- RLS (Row Level Security) preparado para futuro
-- Por ahora DESHABILITADO para no afectar modo demo
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política demo: todos pueden ver empresa demo
CREATE POLICY "Demo company visible" ON companies
    FOR ALL USING (id = 'demo-company-12345678-9');

-- Política futura: solo ver sus propias empresas (DESHABILITADA por ahora)
-- CREATE POLICY "Users can only see their companies" ON companies
--     FOR ALL USING (auth.uid()::text = created_by);

-- Comentarios para documentación
COMMENT ON TABLE companies IS 'Tabla principal de empresas del sistema. En modo demo solo existe una empresa ficticia.';
COMMENT ON COLUMN companies.rut IS 'RUT chileno con formato XX.XXX.XXX-X';
COMMENT ON COLUMN companies.plan_tipo IS 'Tipo de plan: demo, basico, profesional, empresarial';
COMMENT ON COLUMN companies.features IS 'JSONB con funcionalidades habilitadas por empresa';
COMMENT ON COLUMN companies.limits IS 'JSONB con límites específicos del plan de la empresa';

-- Función útil para obtener empresa demo
CREATE OR REPLACE FUNCTION get_demo_company()
RETURNS companies AS $$
BEGIN
    RETURN (SELECT * FROM companies WHERE id = 'demo-company-12345678-9' LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si está en modo demo
CREATE OR REPLACE FUNCTION is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    -- En modo demo siempre retorna true
    -- En producción: verificar sesión de usuario
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;