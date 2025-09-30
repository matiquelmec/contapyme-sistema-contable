-- Agregar campo cash_allowance (asignación de caja) a las liquidaciones
-- Este campo es un haber no imponible que se suma al total de haberes

BEGIN;

-- Agregar campo cash_allowance a la tabla payroll_liquidations
ALTER TABLE payroll_liquidations 
ADD COLUMN IF NOT EXISTS cash_allowance INTEGER DEFAULT 0;

-- Comentar el campo para documentación
COMMENT ON COLUMN payroll_liquidations.cash_allowance IS 'Asignación de caja - Haber no imponible';

-- Actualizar el cálculo de total_non_taxable_income para incluir cash_allowance
-- en liquidaciones existentes (si las hay)
UPDATE payroll_liquidations 
SET cash_allowance = 0
WHERE cash_allowance IS NULL;

COMMIT;