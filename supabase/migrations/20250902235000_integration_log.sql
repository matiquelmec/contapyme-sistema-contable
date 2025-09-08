-- ============================================
-- TABLA INTEGRATION_LOG - LOG DE TRANSACCIONES PROCESADAS
-- Para tracking de transacciones contabilizadas
-- ============================================

-- Eliminar tabla si existe (para testing)
DROP TABLE IF EXISTS integration_log CASCADE;

-- Crear tabla integration_log
CREATE TABLE integration_log (
    -- Identificación única
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de empresa
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de fuente
    source_module VARCHAR(50) NOT NULL, -- 'rcv', 'fixed_asset', 'payroll'
    source_type VARCHAR(50) NOT NULL,   -- 'purchase', 'sales', 'asset_acquisition', etc.
    source_id UUID NOT NULL,           -- ID de la transacción original
    
    -- Información de contabilización
    journal_entry_id UUID,             -- ID del asiento contable generado
    status VARCHAR(20) NOT NULL DEFAULT 'processed', -- 'processed', 'failed', 'pending'
    processing_type VARCHAR(20) NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual'
    
    -- Detalles adicionales (JSONB para flexibilidad)
    details JSONB,
    
    -- Timestamps
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_status CHECK (status IN ('processed', 'failed', 'pending')),
    CONSTRAINT check_processing_type CHECK (processing_type IN ('automatic', 'manual')),
    CONSTRAINT check_source_module CHECK (source_module IN ('rcv', 'fixed_asset', 'payroll', 'other'))
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_integration_log_company_id ON integration_log(company_id);
CREATE INDEX idx_integration_log_source ON integration_log(source_module, source_type, source_id);
CREATE INDEX idx_integration_log_journal_entry ON integration_log(journal_entry_id);
CREATE INDEX idx_integration_log_status ON integration_log(status);
CREATE INDEX idx_integration_log_processed_at ON integration_log(processed_at DESC);

-- Crear índice único para evitar duplicados de una misma transacción
CREATE UNIQUE INDEX idx_integration_log_unique_source ON integration_log(company_id, source_module, source_type, source_id);

-- Comentarios para documentación
COMMENT ON TABLE integration_log IS 'Log de transacciones procesadas contablemente - tracking completo';
COMMENT ON COLUMN integration_log.source_module IS 'Módulo de origen: rcv, fixed_asset, payroll';
COMMENT ON COLUMN integration_log.source_type IS 'Tipo específico: purchase, sales, asset_acquisition, etc.';
COMMENT ON COLUMN integration_log.source_id IS 'ID de la transacción original en su tabla respectiva';
COMMENT ON COLUMN integration_log.journal_entry_id IS 'ID del asiento contable generado (puede ser NULL si falló)';
COMMENT ON COLUMN integration_log.status IS 'Estado del procesamiento: processed, failed, pending';
COMMENT ON COLUMN integration_log.processing_type IS 'Tipo de procesamiento: automatic, manual';
COMMENT ON COLUMN integration_log.details IS 'Detalles adicionales en formato JSON';

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integration_log_updated_at
    BEFORE UPDATE ON integration_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo para testing (opcional)
INSERT INTO integration_log (
    company_id, 
    source_module, 
    source_type, 
    source_id, 
    journal_entry_id,
    status,
    processing_type,
    details
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'rcv',
    'purchase',
    gen_random_uuid(),
    gen_random_uuid(),
    'processed',
    'automatic',
    '{"test": true, "created_by": "migration"}'::jsonb
);

-- Verificar creación
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'integration_log'
ORDER BY ordinal_position;