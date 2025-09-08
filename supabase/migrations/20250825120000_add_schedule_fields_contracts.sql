-- Add schedule fields to employment_contracts table
-- Fecha: 25 de agosto 2025
-- Propósito: Agregar campos de horario laboral (entrada, salida, colación) según normativa chilena

-- Agregar columnas de horario si no existen
ALTER TABLE employment_contracts 
ADD COLUMN IF NOT EXISTS entry_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS exit_time TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS lunch_break_duration INTEGER DEFAULT 60;

-- Comentarios para documentación
COMMENT ON COLUMN employment_contracts.entry_time IS 'Hora de entrada al trabajo (formato HH:MM)';
COMMENT ON COLUMN employment_contracts.exit_time IS 'Hora de salida del trabajo (formato HH:MM)';
COMMENT ON COLUMN employment_contracts.lunch_break_duration IS 'Duración del período de colación en minutos (30-120)';

-- Agregar constraint para validar que hora de salida sea posterior a hora de entrada
ALTER TABLE employment_contracts 
ADD CONSTRAINT IF NOT EXISTS chk_exit_time_after_entry_time 
CHECK (exit_time > entry_time);

-- Agregar constraint para validar duración de colación
ALTER TABLE employment_contracts 
ADD CONSTRAINT IF NOT EXISTS chk_lunch_break_duration 
CHECK (lunch_break_duration >= 30 AND lunch_break_duration <= 120);

-- Actualizar registros existentes con valores por defecto
UPDATE employment_contracts 
SET 
  entry_time = '09:00',
  exit_time = '18:00',
  lunch_break_duration = 60
WHERE 
  entry_time IS NULL 
  OR exit_time IS NULL 
  OR lunch_break_duration IS NULL;