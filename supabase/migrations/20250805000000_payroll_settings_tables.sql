-- Tabla de configuración previsional por empresa
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    settings JSONB NOT NULL DEFAULT '{}',
    last_previred_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Tabla de log de cambios en configuración previsional
CREATE TABLE IF NOT EXISTS payroll_settings_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    company_id UUID NOT NULL REFERENCES companies(id),
    changed_fields TEXT[] NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payroll_settings_company ON payroll_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_log_company ON payroll_settings_log(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_log_created ON payroll_settings_log(created_at DESC);

-- RLS Policies
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings_log ENABLE ROW LEVEL SECURITY;

-- Policy para payroll_settings - solo la empresa puede ver y editar su configuración
CREATE POLICY "Companies can manage their payroll settings" ON payroll_settings
    FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

-- Policy para payroll_settings_log - solo la empresa puede ver su histórico
CREATE POLICY "Companies can view their payroll settings log" ON payroll_settings_log
    FOR SELECT USING (company_id = current_setting('app.current_company_id')::UUID);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_payroll_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_settings_updated_at
    BEFORE UPDATE ON payroll_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_settings_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE payroll_settings IS 'Configuración previsional por empresa (AFP, Salud, Topes, etc.)';
COMMENT ON TABLE payroll_settings_log IS 'Histórico de cambios en configuración previsional';
COMMENT ON COLUMN payroll_settings.settings IS 'Configuración en formato JSON con AFP, Salud, Topes, Asignaciones Familiares, etc.';
COMMENT ON COLUMN payroll_settings.last_previred_sync IS 'Última sincronización con datos oficiales de Previred';
COMMENT ON COLUMN payroll_settings_log.changed_fields IS 'Array de campos que fueron modificados';
COMMENT ON COLUMN payroll_settings_log.old_values IS 'Valores anteriores antes del cambio';
COMMENT ON COLUMN payroll_settings_log.new_values IS 'Nuevos valores después del cambio';