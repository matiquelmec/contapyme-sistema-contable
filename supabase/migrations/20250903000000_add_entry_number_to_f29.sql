-- ==========================================
-- AGREGAR ENTRY_NUMBER A F29_FORMS
-- Fecha: 3 Septiembre 2025
-- Propósito: Integrar F29 con libro diario usando entry_number
-- ==========================================

-- Agregar columna entry_number a f29_forms
ALTER TABLE f29_forms ADD COLUMN IF NOT EXISTS entry_number VARCHAR(20) DEFAULT NULL;

-- Agregar índice para consultas rápidas de integración
CREATE INDEX IF NOT EXISTS idx_f29_entry_number ON f29_forms(entry_number);

-- Agregar índice para consultas de pendientes
CREATE INDEX IF NOT EXISTS idx_f29_pending_integration ON f29_forms(company_id) WHERE entry_number IS NULL;

-- Comentario explicativo
COMMENT ON COLUMN f29_forms.entry_number IS 'Número de asiento contable asociado en journal_entries, NULL indica pendiente de contabilizar';