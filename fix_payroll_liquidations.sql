-- ============================================
-- FIX PAYROLL_LIQUIDATIONS TABLE - ADD MISSING COMPANY_ID
-- Fecha: 2025-09-08
-- Descripción: Agregar company_id faltante en tabla payroll_liquidations
-- ============================================

-- 1. AGREGAR COLUMNA COMPANY_ID A PAYROLL_LIQUIDATIONS
ALTER TABLE payroll_liquidations 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. ACTUALIZAR REGISTROS EXISTENTES CON COMPANY_ID DESDE EMPLOYEES
-- (Si hay registros existentes, obtener company_id desde la tabla employees)
UPDATE payroll_liquidations 
SET company_id = (
    SELECT e.company_id 
    FROM employees e 
    WHERE e.id = payroll_liquidations.employee_id
)
WHERE company_id IS NULL;

-- 3. CREAR ÍNDICE PARA COMPANY_ID (PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_company ON payroll_liquidations(company_id);

-- 4. CREAR ÍNDICE COMPUESTO PARA CONSULTAS TÍPICAS
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_company_period ON payroll_liquidations(company_id, period_year, period_month);

-- 5. VERIFICACIÓN FINAL
SELECT 'payroll_liquidations table fixed - company_id column added!' as result;

-- Verificar estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payroll_liquidations' 
AND column_name = 'company_id';