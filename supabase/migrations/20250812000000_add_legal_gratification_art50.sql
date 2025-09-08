-- ==========================================
-- AGREGAR CAMPO LEGAL_GRATIFICATION_ART50 
-- A TABLA PAYROLL_LIQUIDATIONS
-- Fecha: 12 de agosto, 2025
-- ==========================================

-- Agregar campo de gratificación legal Art. 50 si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_liquidations' 
        AND column_name = 'legal_gratification_art50'
    ) THEN
        ALTER TABLE payroll_liquidations 
        ADD COLUMN legal_gratification_art50 INTEGER DEFAULT 0;
        
        -- Agregar comentario para documentar el campo
        COMMENT ON COLUMN payroll_liquidations.legal_gratification_art50 IS 'Gratificación legal según Art. 50 del Código del Trabajo (25% del sueldo con tope de 4.75 sueldos mínimos)';
        
        RAISE NOTICE '✅ Campo legal_gratification_art50 agregado a tabla payroll_liquidations';
    ELSE
        RAISE NOTICE '✅ Campo legal_gratification_art50 ya existe en tabla payroll_liquidations';
    END IF;
END $$;

-- Verificar que el campo se agregó correctamente
SELECT 
    'VERIFICACIÓN CAMPO AGREGADO' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_liquidations' 
            AND column_name = 'legal_gratification_art50'
        ) THEN '✅ CAMPO legal_gratification_art50 EXISTE' 
        ELSE '❌ CAMPO legal_gratification_art50 NO EXISTE' 
    END as result;

-- Mostrar estructura actualizada de la tabla (campos principales)
SELECT 
    'ESTRUCTURA PAYROLL_LIQUIDATIONS' as info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payroll_liquidations' 
AND table_schema = 'public'
AND column_name IN (
    'id', 'employee_id', 'period_year', 'period_month',
    'base_salary', 'legal_gratification_art50', 'total_gross_income',
    'net_salary', 'status', 'created_at', 'updated_at'
)
ORDER BY 
    CASE column_name
        WHEN 'id' THEN 1
        WHEN 'employee_id' THEN 2
        WHEN 'period_year' THEN 3
        WHEN 'period_month' THEN 4
        WHEN 'base_salary' THEN 5
        WHEN 'legal_gratification_art50' THEN 6
        WHEN 'total_gross_income' THEN 7
        WHEN 'net_salary' THEN 8
        WHEN 'status' THEN 9
        WHEN 'created_at' THEN 10
        WHEN 'updated_at' THEN 11
        ELSE 99
    END;

-- Mensaje de confirmación
SELECT '🎉 MIGRACIÓN COMPLETADA - Campo legal_gratification_art50 disponible para liquidaciones' as status;