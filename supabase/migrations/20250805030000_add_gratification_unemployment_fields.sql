-- Agregar campos de gratificación legal y seguro cesantía a payroll_config

-- Agregar nuevos campos a la tabla payroll_config
ALTER TABLE payroll_config 
ADD COLUMN IF NOT EXISTS legal_gratification_type VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS has_unemployment_insurance BOOLEAN DEFAULT true;

-- Agregar comentarios para documentación
COMMENT ON COLUMN payroll_config.legal_gratification_type IS 'Tipo de gratificación legal: none, code_47 (25%), code_50 (30%)';
COMMENT ON COLUMN payroll_config.has_unemployment_insurance IS 'Si el trabajador tiene seguro de cesantía';

-- Agregar constraint para tipo de gratificación
ALTER TABLE payroll_config 
ADD CONSTRAINT IF NOT EXISTS check_legal_gratification_type 
CHECK (legal_gratification_type IN ('none', 'code_47', 'code_50'));

-- Actualizar registros existentes con valores por defecto según lógica de negocio
UPDATE payroll_config 
SET 
  legal_gratification_type = 'none',
  has_unemployment_insurance = true
WHERE legal_gratification_type IS NULL;

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_payroll_config_gratification ON payroll_config(legal_gratification_type);
CREATE INDEX IF NOT EXISTS idx_payroll_config_unemployment ON payroll_config(has_unemployment_insurance);

-- Mostrar estado de la tabla actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payroll_config' 
AND table_schema = 'public'
ORDER BY ordinal_position;