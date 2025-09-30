-- ==========================================
-- SISTEMA DE INTEGRACIÓN LIBRO DIARIO
-- Tablas para configuración y seguimiento de integración automática
-- ==========================================

-- ✅ TABLA INTEGRATION_CONFIG - Configuración de asientos automáticos
CREATE TABLE IF NOT EXISTS integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(company_id)
);

-- ✅ TABLA INTEGRATION_LOG - Historial de procesamientos automáticos
CREATE TABLE IF NOT EXISTS integration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    source_module VARCHAR(50) NOT NULL, -- 'rcv', 'fixed_assets', 'payroll'
    source_type VARCHAR(50) NOT NULL,   -- 'purchase', 'sales', 'asset_acquisition'
    source_id UUID NOT NULL,            -- ID del registro origen (ledger_id, asset_id, etc.)
    journal_entry_id UUID,              -- ID del asiento creado (si aplica)
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    processing_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'automatic', 'manual'
    details JSONB,                      -- Detalles del procesamiento
    error_message TEXT,                 -- Mensaje de error si falló
    processed_by UUID,                  -- Usuario que procesó (opcional para automáticos)
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (status IN ('pending', 'processed', 'failed')),
    CHECK (processing_type IN ('automatic', 'manual'))
);

-- ✅ TABLA AUTOMATIC_JOURNAL_TEMPLATES - Templates para asientos automáticos
CREATE TABLE IF NOT EXISTS automatic_journal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Template de asiento
    description_template TEXT NOT NULL,
    journal_lines_template JSONB NOT NULL, -- Array de líneas con cuentas y fórmulas
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(company_id, source_module, source_type)
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE OPTIMIZADA
-- ==========================================

-- Índices para integration_config
CREATE INDEX IF NOT EXISTS idx_integration_config_company 
    ON integration_config(company_id);

-- Índices para integration_log
CREATE INDEX IF NOT EXISTS idx_integration_log_company 
    ON integration_log(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_log_source 
    ON integration_log(source_module, source_type);
CREATE INDEX IF NOT EXISTS idx_integration_log_source_id 
    ON integration_log(source_id);
CREATE INDEX IF NOT EXISTS idx_integration_log_status 
    ON integration_log(status);
CREATE INDEX IF NOT EXISTS idx_integration_log_processed_at 
    ON integration_log(processed_at);
CREATE INDEX IF NOT EXISTS idx_integration_log_journal_entry 
    ON integration_log(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- Índices para automatic_journal_templates
CREATE INDEX IF NOT EXISTS idx_automatic_journal_templates_company 
    ON automatic_journal_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_automatic_journal_templates_source 
    ON automatic_journal_templates(source_module, source_type);
CREATE INDEX IF NOT EXISTS idx_automatic_journal_templates_active 
    ON automatic_journal_templates(is_active) WHERE is_active = true;

-- ==========================================
-- FUNCIONES AUXILIARES POSTGRESQL
-- ==========================================

-- Función para obtener estadísticas de integración
CREATE OR REPLACE FUNCTION get_integration_stats(
    p_company_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    total_processed BIGINT,
    total_pending BIGINT,
    total_failed BIGINT,
    by_module JSONB,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            il.status,
            il.source_module,
            il.source_type,
            COUNT(*) as count,
            MAX(il.processed_at) as last_processed
        FROM integration_log il
        WHERE il.company_id = p_company_id
        AND (p_date_from IS NULL OR il.created_at >= p_date_from)
        AND (p_date_to IS NULL OR il.created_at <= p_date_to)
        GROUP BY il.status, il.source_module, il.source_type
    )
    SELECT 
        COALESCE(SUM(CASE WHEN s.status = 'processed' THEN s.count ELSE 0 END), 0) as total_processed,
        COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.count ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN s.status = 'failed' THEN s.count ELSE 0 END), 0) as total_failed,
        json_build_object(
            'rcv', json_build_object(
                'processed', COALESCE(SUM(CASE WHEN s.source_module = 'rcv' AND s.status = 'processed' THEN s.count ELSE 0 END), 0),
                'pending', COALESCE(SUM(CASE WHEN s.source_module = 'rcv' AND s.status = 'pending' THEN s.count ELSE 0 END), 0),
                'failed', COALESCE(SUM(CASE WHEN s.source_module = 'rcv' AND s.status = 'failed' THEN s.count ELSE 0 END), 0)
            ),
            'fixed_assets', json_build_object(
                'processed', COALESCE(SUM(CASE WHEN s.source_module = 'fixed_assets' AND s.status = 'processed' THEN s.count ELSE 0 END), 0),
                'pending', COALESCE(SUM(CASE WHEN s.source_module = 'fixed_assets' AND s.status = 'pending' THEN s.count ELSE 0 END), 0),
                'failed', COALESCE(SUM(CASE WHEN s.source_module = 'fixed_assets' AND s.status = 'failed' THEN s.count ELSE 0 END), 0)
            )
        ) as by_module,
        (
            SELECT json_agg(
                json_build_object(
                    'module', il2.source_module,
                    'type', il2.source_type,
                    'status', il2.status,
                    'processed_at', il2.processed_at
                )
            )
            FROM integration_log il2 
            WHERE il2.company_id = p_company_id
            AND il2.processed_at IS NOT NULL
            ORDER BY il2.processed_at DESC 
            LIMIT 10
        ) as recent_activity
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar transacción como procesada
CREATE OR REPLACE FUNCTION mark_transaction_processed(
    p_company_id UUID,
    p_source_module VARCHAR(50),
    p_source_type VARCHAR(50),
    p_source_id UUID,
    p_journal_entry_id UUID DEFAULT NULL,
    p_processing_type VARCHAR(20) DEFAULT 'manual',
    p_processed_by UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Insertar en integration_log
    INSERT INTO integration_log (
        company_id,
        source_module,
        source_type,
        source_id,
        journal_entry_id,
        status,
        processing_type,
        details,
        processed_by,
        processed_at
    ) VALUES (
        p_company_id,
        p_source_module,
        p_source_type,
        p_source_id,
        p_journal_entry_id,
        'processed',
        p_processing_type,
        p_details,
        p_processed_by,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (company_id, source_module, source_type, source_id) 
    DO UPDATE SET
        status = 'processed',
        journal_entry_id = p_journal_entry_id,
        processing_type = p_processing_type,
        details = p_details,
        processed_by = p_processed_by,
        processed_at = CURRENT_TIMESTAMP
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ==========================================

-- Trigger para actualizar updated_at en integration_config
CREATE TRIGGER update_integration_config_updated_at 
    BEFORE UPDATE ON integration_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en automatic_journal_templates
CREATE TRIGGER update_automatic_journal_templates_updated_at 
    BEFORE UPDATE ON automatic_journal_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- CONFIGURACIÓN POR DEFECTO
-- ==========================================

-- Insertar templates por defecto para una empresa demo (opcional)
-- Estos se pueden eliminar o comentar en producción

-- Template para RCV Ventas
INSERT INTO automatic_journal_templates (
    company_id,
    template_name,
    source_module,
    source_type,
    description_template,
    journal_lines_template
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'RCV Ventas Automático',
    'rcv',
    'sales',
    'Venta según RCV {period} - {file_name}',
    '[
        {
            "account_code": "1105001",
            "account_name": "Clientes",
            "debit_formula": "{total_amount}",
            "credit_formula": "0",
            "description": "Clientes por ventas RCV {period}"
        },
        {
            "account_code": "4101001",
            "account_name": "Ventas",
            "debit_formula": "0",
            "credit_formula": "{net_amount}",
            "description": "Ventas RCV {period}"
        },
        {
            "account_code": "2104001",
            "account_name": "IVA Débito Fiscal",
            "debit_formula": "0",
            "credit_formula": "{iva_amount}",
            "description": "IVA Ventas RCV {period}"
        }
    ]'::jsonb
) ON CONFLICT (company_id, source_module, source_type) DO NOTHING;

-- Template para RCV Compras
INSERT INTO automatic_journal_templates (
    company_id,
    template_name,
    source_module,
    source_type,
    description_template,
    journal_lines_template
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'RCV Compras Automático',
    'rcv',
    'purchases',
    'Compra según RCV {period} - {file_name}',
    '[
        {
            "account_code": "5101001",
            "account_name": "Gastos Generales",
            "debit_formula": "{net_amount}",
            "credit_formula": "0",
            "description": "Gastos por compras RCV {period}"
        },
        {
            "account_code": "1104001",
            "account_name": "IVA Crédito Fiscal",
            "debit_formula": "{iva_amount}",
            "credit_formula": "0",
            "description": "IVA Compras RCV {period}"
        },
        {
            "account_code": "2101001",
            "account_name": "Proveedores",
            "debit_formula": "0",
            "credit_formula": "{total_amount}",
            "description": "Proveedores por compras RCV {period}"
        }
    ]'::jsonb
) ON CONFLICT (company_id, source_module, source_type) DO NOTHING;

-- ==========================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE integration_config IS 'Configuración de asientos automáticos por empresa';
COMMENT ON TABLE integration_log IS 'Historial de procesamientos automáticos de integración';
COMMENT ON TABLE automatic_journal_templates IS 'Templates para generación automática de asientos contables';

COMMENT ON COLUMN integration_config.config IS 'Configuración JSON con cuentas y reglas por módulo';
COMMENT ON COLUMN integration_log.source_module IS 'Módulo origen: rcv, fixed_assets, payroll, etc.';
COMMENT ON COLUMN integration_log.source_type IS 'Tipo específico: purchase, sales, asset_acquisition, etc.';
COMMENT ON COLUMN integration_log.processing_type IS 'Tipo de procesamiento: automatic o manual';
COMMENT ON COLUMN automatic_journal_templates.journal_lines_template IS 'Template JSON con líneas de asiento y fórmulas de cálculo';

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

-- Verificar que todas las tablas se crearon correctamente
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('integration_config', 'integration_log', 'automatic_journal_templates')
ORDER BY table_name;

-- Mostrar mensaje de éxito
SELECT 'Journal Integration Tables created successfully! ✅' as status;