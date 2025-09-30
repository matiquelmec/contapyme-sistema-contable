-- Corregir estructura de payroll_config para liquidaciones automáticas

-- Verificar si existe la tabla y recrearla con la estructura correcta
DROP TABLE IF EXISTS payroll_config CASCADE;

CREATE TABLE payroll_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- AFP (códigos estándar para compatibilidad)
    afp_code VARCHAR(20) NOT NULL DEFAULT 'HABITAT',
    
    -- Salud
    health_institution_code VARCHAR(20) NOT NULL DEFAULT 'FONASA',
    
    -- Cargas familiares
    family_allowances INTEGER DEFAULT 0,
    
    -- Campos adicionales para futuro
    apv_amount INTEGER DEFAULT 0,
    other_deductions_json JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(employee_id),
    CHECK (afp_code IN ('CAPITAL', 'CUPRUM', 'HABITAT', 'PLANVITAL', 'PROVIDA', 'MODELO', 'UNO')),
    CHECK (health_institution_code IN ('FONASA', 'BANMEDICA', 'CONSALUD', 'CRUZ_BLANCA', 'VIDA_TRES', 'COLMENA')),
    CHECK (family_allowances >= 0 AND family_allowances <= 10)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_config_employee ON payroll_config(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_config_afp ON payroll_config(afp_code);

-- RLS
ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;

-- Policy: solo la empresa puede ver configuración de sus empleados
CREATE POLICY "Companies can manage employee payroll config" ON payroll_config
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE company_id = current_setting('app.current_company_id')::UUID
        )
    );

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_payroll_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_config_updated_at
    BEFORE UPDATE ON payroll_config
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_config_updated_at();

-- Insertar configuración por defecto para empleados existentes
INSERT INTO payroll_config (employee_id, afp_code, health_institution_code, family_allowances)
SELECT 
    id,
    'HABITAT',
    'FONASA', 
    0
FROM employees 
WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
AND id NOT IN (SELECT employee_id FROM payroll_config WHERE employee_id IS NOT NULL)
ON CONFLICT (employee_id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE payroll_config IS 'Configuración previsional por empleado para cálculo automático de liquidaciones';
COMMENT ON COLUMN payroll_config.afp_code IS 'Código AFP: CAPITAL, CUPRUM, HABITAT, PLANVITAL, PROVIDA, MODELO, UNO';
COMMENT ON COLUMN payroll_config.health_institution_code IS 'Institución salud: FONASA o códigos ISAPRE';
COMMENT ON COLUMN payroll_config.family_allowances IS 'Número de cargas familiares (0-10)';