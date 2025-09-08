-- Crear tabla payroll_settings que falta
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(company_id, setting_key)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_settings_company ON payroll_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_key ON payroll_settings(company_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_active ON payroll_settings(company_id, is_active);

-- Habilitar RLS
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_payroll_settings_updated_at 
BEFORE UPDATE ON payroll_settings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales para la empresa demo
INSERT INTO payroll_settings (company_id, setting_key, setting_value, description) VALUES 
('00000000-0000-0000-0000-000000000001', 'minimum_wage', '{"amount": 460000, "currency": "CLP"}', 'Salario mínimo vigente'),
('00000000-0000-0000-0000-000000000001', 'uf_value', '{"amount": 37924.25, "currency": "CLP"}', 'Valor UF actual'),
('00000000-0000-0000-0000-000000000001', 'afp_rates', '{"normal": 10.0, "additional": 1.27}', 'Tasas AFP vigentes'),
('00000000-0000-0000-0000-000000000001', 'health_rates', '{"fonasa": 7.0, "isapre_min": 7.0}', 'Tasas salud vigentes'),
('00000000-0000-0000-0000-000000000001', 'unemployment_insurance', '{"worker": 0.6, "employer": 2.4}', 'Seguro cesantía'),
('00000000-0000-0000-0000-000000000001', 'family_allowance', '{"amount": 15000, "per_load": true}', 'Asignación familiar por carga')
ON CONFLICT (company_id, setting_key) DO NOTHING;

SELECT 'payroll_settings table created successfully' as result;