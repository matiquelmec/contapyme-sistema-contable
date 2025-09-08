-- ==========================================
-- CONFIGURACIÓN CENTRALIZADA DE CUENTAS CONTABLES
-- Sistema para centralizar la configuración de cuentas por módulo
-- ==========================================

-- ✅ TABLA CENTRALIZED_ACCOUNT_CONFIG - Configuración centralizada por módulo
CREATE TABLE IF NOT EXISTS centralized_account_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Identificación del módulo y tipo de transacción
    module_name VARCHAR(50) NOT NULL,        -- 'rcv', 'fixed_assets', 'payroll'
    transaction_type VARCHAR(50) NOT NULL,   -- 'sales', 'purchases', 'acquisition', 'depreciation', 'salary', 'benefits'
    display_name VARCHAR(200) NOT NULL,      -- Nombre descriptivo para mostrar en UI
    
    -- Configuración de cuentas (3 cuentas principales por transacción)
    tax_account_code VARCHAR(20) NOT NULL,      -- Cuenta de impuestos (IVA, etc.)
    tax_account_name VARCHAR(200) NOT NULL,     -- Nombre de cuenta de impuestos
    
    revenue_account_code VARCHAR(20) NOT NULL,  -- Cuenta de utilidad/ingresos/gastos
    revenue_account_name VARCHAR(200) NOT NULL, -- Nombre de cuenta de utilidad
    
    asset_account_code VARCHAR(20) NOT NULL,    -- Cuenta de activo (clientes, inventario, etc.)
    asset_account_name VARCHAR(200) NOT NULL,   -- Nombre de cuenta de activo
    
    -- Metadatos
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(company_id, module_name, transaction_type),
    CHECK (module_name IN ('rcv', 'fixed_assets', 'payroll')),
    CHECK (transaction_type IN ('sales', 'purchases', 'acquisition', 'depreciation', 'salary', 'benefits'))
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE OPTIMIZADA
-- ==========================================

-- Índices principales
CREATE INDEX IF NOT EXISTS idx_centralized_account_config_company 
    ON centralized_account_config(company_id);
CREATE INDEX IF NOT EXISTS idx_centralized_account_config_module 
    ON centralized_account_config(module_name, transaction_type);
CREATE INDEX IF NOT EXISTS idx_centralized_account_config_active 
    ON centralized_account_config(is_active) WHERE is_active = true;

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_centralized_account_config_lookup 
    ON centralized_account_config(company_id, module_name, transaction_type) WHERE is_active = true;

-- ==========================================
-- FUNCIONES AUXILIARES POSTGRESQL
-- ==========================================

-- Función para obtener configuración por módulo y tipo
CREATE OR REPLACE FUNCTION get_centralized_account_config(
    p_company_id UUID,
    p_module_name VARCHAR(50),
    p_transaction_type VARCHAR(50)
) RETURNS TABLE (
    tax_account_code VARCHAR(20),
    tax_account_name VARCHAR(200),
    revenue_account_code VARCHAR(20),
    revenue_account_name VARCHAR(200),
    asset_account_code VARCHAR(20),
    asset_account_name VARCHAR(200)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.tax_account_code,
        c.tax_account_name,
        c.revenue_account_code,
        c.revenue_account_name,
        c.asset_account_code,
        c.asset_account_name
    FROM centralized_account_config c
    WHERE c.company_id = p_company_id
    AND c.module_name = p_module_name
    AND c.transaction_type = p_transaction_type
    AND c.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener configuraciones activas por empresa
CREATE OR REPLACE FUNCTION get_active_account_configs(
    p_company_id UUID
) RETURNS TABLE (
    id UUID,
    module_name VARCHAR(50),
    transaction_type VARCHAR(50),
    display_name VARCHAR(200),
    tax_account_code VARCHAR(20),
    tax_account_name VARCHAR(200),
    revenue_account_code VARCHAR(20),
    revenue_account_name VARCHAR(200),
    asset_account_code VARCHAR(20),
    asset_account_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.module_name,
        c.transaction_type,
        c.display_name,
        c.tax_account_code,
        c.tax_account_name,
        c.revenue_account_code,
        c.revenue_account_name,
        c.asset_account_code,
        c.asset_account_name,
        c.created_at,
        c.updated_at
    FROM centralized_account_config c
    WHERE c.company_id = p_company_id
    AND c.is_active = true
    ORDER BY c.module_name, c.transaction_type;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ==========================================

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_centralized_account_config_updated_at 
    BEFORE UPDATE ON centralized_account_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- CONFIGURACIONES EJEMPLO (OPCIONAL)
-- ==========================================

-- Insertar configuraciones de ejemplo para empresa demo
-- Solo si no existen configuraciones previas

-- RCV Ventas
INSERT INTO centralized_account_config (
    company_id,
    module_name,
    transaction_type,
    display_name,
    tax_account_code,
    tax_account_name,
    revenue_account_code,
    revenue_account_name,
    asset_account_code,
    asset_account_name
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'rcv',
    'sales',
    'RCV Ventas con IVA 19%',
    '2104001',
    'IVA Débito Fiscal',
    '4101001',
    'Ventas Productos',
    '1105001',
    'Clientes'
) ON CONFLICT (company_id, module_name, transaction_type) DO NOTHING;

-- RCV Compras
INSERT INTO centralized_account_config (
    company_id,
    module_name,
    transaction_type,
    display_name,
    tax_account_code,
    tax_account_name,
    revenue_account_code,
    revenue_account_name,
    asset_account_code,
    asset_account_name
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'rcv',
    'purchases',
    'RCV Compras con IVA 19%',
    '1104001',
    'IVA Crédito Fiscal',
    '5101001',
    'Gastos Generales',
    '2101001',
    'Proveedores'
) ON CONFLICT (company_id, module_name, transaction_type) DO NOTHING;

-- Activos Fijos - Adquisición
INSERT INTO centralized_account_config (
    company_id,
    module_name,
    transaction_type,
    display_name,
    tax_account_code,
    tax_account_name,
    revenue_account_code,
    revenue_account_name,
    asset_account_code,
    asset_account_name
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'fixed_assets',
    'acquisition',
    'Adquisición de Activos Fijos',
    '1104001',
    'IVA Crédito Fiscal',
    '1101001',
    'Caja y Bancos',
    '1201001',
    'Maquinarias y Equipos'
) ON CONFLICT (company_id, module_name, transaction_type) DO NOTHING;

-- ==========================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE centralized_account_config IS 'Configuración centralizada de cuentas contables por módulo y tipo de transacción';
COMMENT ON COLUMN centralized_account_config.module_name IS 'Módulo del sistema: rcv, fixed_assets, payroll';
COMMENT ON COLUMN centralized_account_config.transaction_type IS 'Tipo de transacción específica del módulo';
COMMENT ON COLUMN centralized_account_config.display_name IS 'Nombre descriptivo para mostrar en la interfaz de usuario';
COMMENT ON COLUMN centralized_account_config.tax_account_code IS 'Código de cuenta para impuestos (IVA, retenciones, etc.)';
COMMENT ON COLUMN centralized_account_config.revenue_account_code IS 'Código de cuenta para ingresos, gastos o utilidades';
COMMENT ON COLUMN centralized_account_config.asset_account_code IS 'Código de cuenta para activos (clientes, inventario, activos fijos)';

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'centralized_account_config' AND table_schema = 'public') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'centralized_account_config';

-- Mostrar mensaje de éxito
SELECT 'Centralized Account Configuration Table created successfully! ✅' as status;