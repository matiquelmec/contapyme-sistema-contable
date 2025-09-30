-- ============================================
-- TABLA PROCESSED_TRANSACTIONS - TRACKING SIMPLE DE TRANSACCIONES PROCESADAS
-- Solución limpia para marcar transacciones como contabilizadas
-- ============================================

-- Eliminar tabla si existe
DROP TABLE IF EXISTS processed_transactions CASCADE;

-- Crear tabla simple y específica
CREATE TABLE processed_transactions (
    -- ID único
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de empresa
    company_id TEXT NOT NULL,
    
    -- Información de la transacción original
    transaction_type TEXT NOT NULL, -- 'rcv', 'fixed_asset', 'payroll'
    transaction_subtype TEXT,       -- 'purchase', 'sales', etc.
    transaction_id TEXT NOT NULL,   -- ID de la transacción original
    
    -- Información del asiento contable generado
    journal_entry_id TEXT NOT NULL, -- ID del asiento en journal_entries
    
    -- Metadatos
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_by TEXT DEFAULT 'system',
    notes TEXT,
    
    -- Constraint para evitar duplicados
    UNIQUE(company_id, transaction_type, transaction_id)
);

-- Crear índices para búsquedas rápidas
CREATE INDEX idx_processed_transactions_company ON processed_transactions(company_id);
CREATE INDEX idx_processed_transactions_lookup ON processed_transactions(company_id, transaction_type, transaction_id);
CREATE INDEX idx_processed_transactions_journal ON processed_transactions(journal_entry_id);
CREATE INDEX idx_processed_transactions_date ON processed_transactions(processed_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE processed_transactions IS 'Tabla simple para tracking de transacciones procesadas/contabilizadas';
COMMENT ON COLUMN processed_transactions.transaction_type IS 'Tipo: rcv, fixed_asset, payroll';
COMMENT ON COLUMN processed_transactions.transaction_subtype IS 'Subtipo: purchase, sales, asset_acquisition, etc.';
COMMENT ON COLUMN processed_transactions.transaction_id IS 'ID original de la transacción en su tabla respectiva';
COMMENT ON COLUMN processed_transactions.journal_entry_id IS 'ID del asiento contable generado';

-- Insertar dato de ejemplo para testing
INSERT INTO processed_transactions (
    company_id,
    transaction_type,
    transaction_subtype,
    transaction_id,
    journal_entry_id,
    processed_by,
    notes
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'rcv',
    'purchase',
    'test-transaction-id',
    'test-journal-entry-id',
    'migration',
    'Test data created during migration'
);

-- Verificar creación
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'processed_transactions'
ORDER BY ordinal_position;