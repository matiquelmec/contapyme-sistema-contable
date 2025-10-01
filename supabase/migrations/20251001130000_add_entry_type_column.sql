-- Migración: Agregar columna entry_type a journal_entries
-- Fecha: 2025-10-01 13:00:00
-- Descripción: Añade la columna entry_type faltante que está causando errores en la creación de asientos

-- Agregar la columna entry_type si no existe
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'manual' CHECK (entry_type IN ('manual', 'automatic', 'f29', 'payroll', 'fixed_assets', 'adjustment'));

-- Actualizar los registros existentes con un valor por defecto
UPDATE journal_entries
SET entry_type = 'manual'
WHERE entry_type IS NULL;

-- Comentario de la columna
COMMENT ON COLUMN journal_entries.entry_type IS 'Tipo de asiento: manual, automatic, f29, payroll, fixed_assets, adjustment';

-- Verificación final
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'journal_entries'
    AND column_name = 'entry_type'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Columna entry_type agregada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Columna entry_type no fue creada';
  END IF;
END $$;