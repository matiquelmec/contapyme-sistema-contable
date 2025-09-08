-- ============================================
-- AGREGAR COLUMNA entry_number A TABLAS LEDGER
-- Para vincular directamente con journal_entries
-- ============================================

-- Agregar columna entry_number a sales_ledger
ALTER TABLE sales_ledger 
ADD COLUMN IF NOT EXISTS entry_number VARCHAR(20) DEFAULT NULL;

-- Agregar columna entry_number a purchase_ledger
ALTER TABLE purchase_ledger 
ADD COLUMN IF NOT EXISTS entry_number VARCHAR(20) DEFAULT NULL;

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sales_ledger_entry_number ON sales_ledger(entry_number);
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_entry_number ON purchase_ledger(entry_number);

-- Agregar comentarios para documentación
COMMENT ON COLUMN sales_ledger.entry_number IS 'Número del asiento contable en journal_entries. NULL = pendiente de contabilizar';
COMMENT ON COLUMN purchase_ledger.entry_number IS 'Número del asiento contable en journal_entries. NULL = pendiente de contabilizar';

-- Crear función para verificar si un registro está procesado
CREATE OR REPLACE FUNCTION is_ledger_processed(
    p_table_name TEXT,
    p_ledger_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_entry_number VARCHAR(20);
BEGIN
    IF p_table_name = 'sales_ledger' THEN
        SELECT entry_number INTO v_entry_number
        FROM sales_ledger
        WHERE id = p_ledger_id;
    ELSIF p_table_name = 'purchase_ledger' THEN
        SELECT entry_number INTO v_entry_number
        FROM purchase_ledger
        WHERE id = p_ledger_id;
    ELSE
        RETURN FALSE;
    END IF;
    
    RETURN v_entry_number IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener transacciones pendientes
CREATE OR REPLACE FUNCTION get_pending_ledger_transactions(
    p_company_id UUID
) RETURNS TABLE (
    id UUID,
    ledger_type TEXT,
    period VARCHAR(10),
    file_name TEXT,
    total_amount DECIMAL,
    transaction_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        'sales'::TEXT as ledger_type,
        s.period_identifier as period,
        s.file_name,
        s.total_calculated_amount as total_amount,
        s.total_transactions as transaction_count,
        s.created_at
    FROM sales_ledger s
    WHERE s.company_id = p_company_id
      AND s.entry_number IS NULL
    
    UNION ALL
    
    SELECT 
        p.id,
        'purchase'::TEXT as ledger_type,
        p.period_identifier as period,
        p.file_name,
        p.total_calculated_amount as total_amount,
        p.total_transactions as transaction_count,
        p.created_at
    FROM purchase_ledger p
    WHERE p.company_id = p_company_id
      AND p.entry_number IS NULL
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Verificar cambios
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('sales_ledger', 'purchase_ledger')
  AND column_name = 'entry_number';