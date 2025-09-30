-- Migración final para corregir estructura payroll_config
-- Resolver conflicto entre estructuras de tabla

-- 1. Eliminar tabla existente (datos no críticos en desarrollo)
DROP TABLE IF EXISTS payroll_config CASCADE;

-- 2. Crear tabla con estructura definitiva compatible con API
CREATE TABLE payroll_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- AFP - Códigos estándar chilenos
    afp_code VARCHAR(20) NOT NULL DEFAULT 'HABITAT',
    
    -- Salud - Códigos instituciones
    health_institution_code VARCHAR(20) NOT NULL DEFAULT 'FONASA',
    
    -- Cargas familiares
    family_allowances INTEGER DEFAULT 0,
    
    -- Campos para expansión futura
    apv_amount INTEGER DEFAULT 0,
    other_deductions_json JSONB DEFAULT '{}',
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints de integridad
    UNIQUE(employee_id),
    CHECK (afp_code IN ('CAPITAL', 'CUPRUM', 'HABITAT', 'PLANVITAL', 'PROVIDA', 'MODELO', 'UNO')),
    CHECK (health_institution_code IN ('FONASA', 'BANMEDICA', 'CONSALUD', 'CRUZ_BLANCA', 'VIDA_TRES', 'COLMENA', 'MAS_VIDA')),
    CHECK (family_allowances >= 0 AND family_allowances <= 10)
);

-- 3. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_config_employee ON payroll_config(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_config_afp ON payroll_config(afp_code);
CREATE INDEX IF NOT EXISTS idx_payroll_config_health ON payroll_config(health_institution_code);

-- 4. Trigger para updated_at automático
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

-- 5. Configuración por defecto para empleados existentes
INSERT INTO payroll_config (employee_id, afp_code, health_institution_code, family_allowances)
SELECT 
    id,
    'HABITAT',
    'FONASA',
    0
FROM employees 
WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce'
ON CONFLICT (employee_id) DO NOTHING;

-- 6. Comentarios para documentación
COMMENT ON TABLE payroll_config IS 'Configuración previsional por empleado - estructura compatible con API';
COMMENT ON COLUMN payroll_config.afp_code IS 'Código AFP: CAPITAL, CUPRUM, HABITAT, PLANVITAL, PROVIDA, MODELO, UNO';
COMMENT ON COLUMN payroll_config.health_institution_code IS 'Código institución salud: FONASA, BANMEDICA, CONSALUD, etc';
COMMENT ON COLUMN payroll_config.family_allowances IS 'Número de cargas familiares (0-10)';

-- 7. Grant permisos básicos (si es necesario)
-- GRANT ALL ON payroll_config TO authenticated;
-- GRANT ALL ON payroll_config TO service_role;