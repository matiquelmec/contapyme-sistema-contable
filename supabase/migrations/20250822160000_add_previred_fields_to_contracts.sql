-- Migración: Agregar campos previsionales a contratos para integración automática con Previred
-- Fecha: 2025-08-22
-- Descripción: Permite almacenar información de AFP, salud e Isapre en contratos para automatizar generación de liquidaciones y archivos Previred

-- Agregar columnas previsionales a employment_contracts
ALTER TABLE employment_contracts 
ADD COLUMN IF NOT EXISTS afp_name VARCHAR(50) DEFAULT 'MODELO',
ADD COLUMN IF NOT EXISTS health_institution VARCHAR(50) DEFAULT 'FONASA',
ADD COLUMN IF NOT EXISTS isapre_plan VARCHAR(100),
ADD COLUMN IF NOT EXISTS afp_auto_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previred_source VARCHAR(20) DEFAULT 'manual'; -- 'manual', 'SII_API', 'PREVIRED_API'

-- Agregar comentarios para documentación
COMMENT ON COLUMN employment_contracts.afp_name IS 'Nombre de la AFP del trabajador (MODELO, CUPRUM, HABITAT, PLANVITAL, CAPITAL, PROVIDA, UNO)';
COMMENT ON COLUMN employment_contracts.health_institution IS 'Institución de salud (FONASA o nombre de Isapre)';
COMMENT ON COLUMN employment_contracts.isapre_plan IS 'Nombre del plan de Isapre (si aplica)';
COMMENT ON COLUMN employment_contracts.afp_auto_detected IS 'Indica si los datos fueron detectados automáticamente desde API externa';
COMMENT ON COLUMN employment_contracts.previred_source IS 'Fuente de los datos previsionales (manual, SII_API, PREVIRED_API)';

-- Crear índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_employment_contracts_afp_name ON employment_contracts(afp_name);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_health_institution ON employment_contracts(health_institution);

-- Función para validar AFP
CREATE OR REPLACE FUNCTION validate_afp_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.afp_name NOT IN ('CAPITAL', 'CUPRUM', 'HABITAT', 'MODELO', 'PLANVITAL', 'PROVIDA', 'UNO') THEN
        RAISE EXCEPTION 'AFP inválida. Valores permitidos: CAPITAL, CUPRUM, HABITAT, MODELO, PLANVITAL, PROVIDA, UNO';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar AFP
CREATE TRIGGER validate_afp_name_trigger
    BEFORE INSERT OR UPDATE ON employment_contracts
    FOR EACH ROW
    EXECUTE FUNCTION validate_afp_name();

-- Función para obtener información previsional de un contrato
CREATE OR REPLACE FUNCTION get_contract_previred_info(contract_id UUID)
RETURNS TABLE (
    employee_rut VARCHAR(20),
    afp_name VARCHAR(50),
    health_institution VARCHAR(50),
    isapre_plan VARCHAR(100),
    afp_auto_detected BOOLEAN,
    previred_source VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.rut,
        ec.afp_name,
        ec.health_institution,
        ec.isapre_plan,
        ec.afp_auto_detected,
        ec.previred_source
    FROM employment_contracts ec
    JOIN employees e ON ec.employee_id = e.id
    WHERE ec.id = contract_id;
END;
$$ LANGUAGE plpgsql;

-- Insertar datos ejemplo para testing (opcional)
-- UPDATE employment_contracts 
-- SET 
--     afp_name = 'MODELO',
--     health_institution = 'FONASA',
--     afp_auto_detected = true,
--     previred_source = 'SII_API'
-- WHERE id IS NOT NULL;

-- Log de migración
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES (
    '20250822160000_add_previred_fields_to_contracts',
    NOW(),
    'Agregar campos previsionales a contratos para integración automática con Previred'
) ON CONFLICT (migration_name) DO NOTHING;