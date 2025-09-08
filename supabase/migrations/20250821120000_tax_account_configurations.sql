-- =============================================
-- TABLA DE CONFIGURACIONES DE CUENTAS DE IMPUESTOS
-- Fecha: 21 de agosto, 2025
-- Propósito: Configuración directa de cuentas por tipo de impuesto
-- =============================================

-- Crear tabla principal de configuraciones de impuestos
CREATE TABLE IF NOT EXISTS tax_account_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Información del impuesto
    tax_type VARCHAR(50) NOT NULL, -- 'iva_19', 'iva_exento', 'ila_20.5', etc.
    tax_name VARCHAR(100) NOT NULL, -- 'IVA 19%', 'ILA 20.5%', etc.
    tax_rate DECIMAL(5,2), -- Tasa del impuesto (19.0, 20.5, etc.)
    
    -- Asociación de cuentas
    sales_debit_account_code VARCHAR(20), -- Cuenta débito para ventas
    sales_debit_account_name VARCHAR(255),
    sales_credit_account_code VARCHAR(20), -- Cuenta crédito para ventas  
    sales_credit_account_name VARCHAR(255),
    
    purchases_debit_account_code VARCHAR(20), -- Cuenta débito para compras
    purchases_debit_account_name VARCHAR(255),
    purchases_credit_account_code VARCHAR(20), -- Cuenta crédito para compras
    purchases_credit_account_name VARCHAR(255),
    
    -- Metadatos
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_company_tax_type UNIQUE (company_id, tax_type),
    CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- Índices para optimizar consultas
CREATE INDEX idx_tax_config_company_id ON tax_account_configurations(company_id);
CREATE INDEX idx_tax_config_tax_type ON tax_account_configurations(tax_type);
CREATE INDEX idx_tax_config_active ON tax_account_configurations(is_active);
CREATE INDEX idx_tax_config_company_active ON tax_account_configurations(company_id, is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tax_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tax_config_updated_at
    BEFORE UPDATE ON tax_account_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_config_updated_at();

-- Insertar configuraciones por defecto para empresa demo
INSERT INTO tax_account_configurations (
    company_id, 
    tax_type, 
    tax_name, 
    tax_rate,
    sales_debit_account_code,
    sales_debit_account_name,
    sales_credit_account_code,
    sales_credit_account_name,
    purchases_debit_account_code,
    purchases_debit_account_name,
    purchases_credit_account_code,
    purchases_credit_account_name,
    notes
) VALUES 
-- IVA 19% General
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'iva_19', 'IVA 19%', 19.0,
 '1.1.4.001', 'IVA Débito Fiscal', '2.1.4.001', 'IVA por Pagar',
 '1.1.4.002', 'IVA Crédito Fiscal', '2.1.4.002', 'IVA por Recuperar',
 'Configuración estándar para IVA general del 19%'),

-- IVA Exento  
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'iva_exento', 'IVA Exento', 0.0,
 '1.1.4.003', 'Ventas Exentas', '', '',
 '1.1.4.004', 'Compras Exentas', '', '',
 'Operaciones exentas de IVA'),

-- ILA 20.5% (Bebidas alcohólicas)
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'ila_20.5', 'ILA 20.5%', 20.5,
 '1.1.4.101', 'ILA Débito 20.5%', '2.1.4.101', 'ILA por Pagar 20.5%',
 '1.1.4.102', 'ILA Crédito 20.5%', '2.1.4.102', 'ILA por Recuperar 20.5%',
 'Impuesto a bebidas alcohólicas (vinos, cervezas)'),

-- ILA 31.5% (Bebidas destiladas y analcohólicas)
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'ila_31.5', 'ILA 31.5%', 31.5,
 '1.1.4.103', 'ILA Débito 31.5%', '2.1.4.103', 'ILA por Pagar 31.5%',
 '1.1.4.104', 'ILA Crédito 31.5%', '2.1.4.104', 'ILA por Recuperar 31.5%',
 'Bebidas destiladas y analcohólicas con alto contenido de azúcar'),

-- ILA 10% (Bebidas analcohólicas bajo azúcar)
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'ila_10', 'ILA 10%', 10.0,
 '1.1.4.105', 'ILA Débito 10%', '2.1.4.105', 'ILA por Pagar 10%',
 '1.1.4.106', 'ILA Crédito 10%', '2.1.4.106', 'ILA por Recuperar 10%',
 'Bebidas analcohólicas con bajo contenido de azúcar'),

-- IABA 5% (Impuesto adicional bebidas azucaradas)
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'iaba_5', 'IABA 5%', 5.0,
 '1.1.4.107', 'IABA Débito 5%', '2.1.4.107', 'IABA por Pagar 5%',
 '1.1.4.108', 'IABA Crédito 5%', '2.1.4.108', 'IABA por Recuperar 5%',
 'Impuesto adicional a bebidas analcohólicas azucaradas'),

-- Impuesto al Diesel
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'diesel', 'Impuesto al Diesel', NULL,
 '1.1.4.201', 'Imp. Diesel Ventas', '2.1.4.201', 'Imp. Diesel por Pagar',
 '1.1.4.202', 'Imp. Diesel Compras', '2.1.4.202', 'Imp. Diesel por Recuperar',
 'Impuesto específico al combustible diesel'),

-- Impuesto a la Gasolina
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'gasolina', 'Impuesto a la Gasolina', NULL,
 '1.1.4.203', 'Imp. Gasolina Ventas', '2.1.4.203', 'Imp. Gasolina por Pagar',
 '1.1.4.204', 'Imp. Gasolina Compras', '2.1.4.204', 'Imp. Gasolina por Recuperar',
 'Impuesto específico a las gasolinas'),

-- Impuesto al Tabaco
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'tabaco', 'Impuesto al Tabaco', NULL,
 '1.1.4.205', 'Imp. Tabaco Ventas', '2.1.4.205', 'Imp. Tabaco por Pagar',
 '1.1.4.206', 'Imp. Tabaco Compras', '2.1.4.206', 'Imp. Tabaco por Recuperar',
 'Impuesto específico a productos del tabaco'),

-- Impuesto a Artículos de Lujo
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'lujo', 'Impuesto a Artículos de Lujo', 15.0,
 '1.1.4.207', 'Imp. Lujo Ventas', '2.1.4.207', 'Imp. Lujo por Pagar',
 '1.1.4.208', 'Imp. Lujo Compras', '2.1.4.208', 'Imp. Lujo por Recuperar',
 'Impuesto a artículos suntuarios y de lujo'),

-- IVA Servicios Digitales
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'digital', 'IVA Servicios Digitales', 19.0,
 '1.1.4.301', 'IVA Digital Ventas', '2.1.4.301', 'IVA Digital por Pagar',
 '1.1.4.302', 'IVA Digital Compras', '2.1.4.302', 'IVA Digital por Recuperar',
 'IVA para servicios digitales prestados desde el extranjero'),

-- Impuesto Verde a Vehículos
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'vehiculos', 'Impuesto Verde Vehículos', NULL,
 '1.1.4.401', 'Imp. Verde Ventas', '2.1.4.401', 'Imp. Verde por Pagar',
 '1.1.4.402', 'Imp. Verde Compras', '2.1.4.402', 'Imp. Verde por Recuperar',
 'Impuesto verde y adicional a vehículos');

-- Comentarios explicativos
COMMENT ON TABLE tax_account_configurations IS 'Configuración de cuentas contables para diferentes tipos de impuestos en operaciones RCV';
COMMENT ON COLUMN tax_account_configurations.tax_type IS 'Código único del tipo de impuesto (iva_19, ila_20.5, etc.)';
COMMENT ON COLUMN tax_account_configurations.tax_rate IS 'Tasa del impuesto en porcentaje (puede ser NULL para impuestos específicos)';
COMMENT ON COLUMN tax_account_configurations.sales_debit_account_code IS 'Cuenta de débito para registrar ventas con este impuesto';
COMMENT ON COLUMN tax_account_configurations.purchases_credit_account_code IS 'Cuenta de crédito para registrar compras con este impuesto';

-- Función para obtener configuración por tipo de impuesto
CREATE OR REPLACE FUNCTION get_tax_account_config(
    p_company_id UUID,
    p_tax_type VARCHAR(50)
)
RETURNS tax_account_configurations AS $$
DECLARE
    config tax_account_configurations;
BEGIN
    SELECT * INTO config
    FROM tax_account_configurations
    WHERE company_id = p_company_id 
    AND tax_type = p_tax_type 
    AND is_active = true;
    
    RETURN config;
END;
$$ LANGUAGE plpgsql;

-- Función para listar todas las configuraciones activas de una empresa
CREATE OR REPLACE FUNCTION get_company_tax_configs(p_company_id UUID)
RETURNS SETOF tax_account_configurations AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM tax_account_configurations
    WHERE company_id = p_company_id 
    AND is_active = true
    ORDER BY tax_name;
END;
$$ LANGUAGE plpgsql;

-- Vista para reporte de configuraciones
CREATE OR REPLACE VIEW v_tax_configurations_summary AS
SELECT 
    tac.company_id,
    tac.tax_type,
    tac.tax_name,
    tac.tax_rate,
    tac.sales_debit_account_code || ' - ' || tac.sales_debit_account_name AS sales_debit_account,
    tac.sales_credit_account_code || ' - ' || tac.sales_credit_account_name AS sales_credit_account,
    tac.purchases_debit_account_code || ' - ' || tac.purchases_debit_account_name AS purchases_debit_account,
    tac.purchases_credit_account_code || ' - ' || tac.purchases_credit_account_name AS purchases_credit_account,
    tac.is_active,
    tac.created_at,
    tac.updated_at
FROM tax_account_configurations tac
ORDER BY tac.tax_name;

-- Función para estadísticas de configuraciones
CREATE OR REPLACE FUNCTION get_tax_config_stats(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_configurations', COUNT(*),
        'active_configurations', COUNT(*) FILTER (WHERE is_active = true),
        'inactive_configurations', COUNT(*) FILTER (WHERE is_active = false),
        'iva_configurations', COUNT(*) FILTER (WHERE tax_type LIKE 'iva_%'),
        'ila_configurations', COUNT(*) FILTER (WHERE tax_type LIKE 'ila_%'),
        'other_configurations', COUNT(*) FILTER (WHERE tax_type NOT LIKE 'iva_%' AND tax_type NOT LIKE 'ila_%'),
        'last_updated', MAX(updated_at)
    ) INTO result
    FROM tax_account_configurations
    WHERE company_id = p_company_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear policy para RLS (Row Level Security)
ALTER TABLE tax_account_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_config_company_isolation ON tax_account_configurations
FOR ALL
USING (company_id = current_setting('app.current_company_id', true)::UUID);

-- Grants para el usuario de la aplicación
GRANT ALL ON tax_account_configurations TO postgres;
GRANT ALL ON tax_account_configurations TO anon;
GRANT ALL ON tax_account_configurations TO authenticated;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla tax_account_configurations creada exitosamente';
    RAISE NOTICE '📊 % configuraciones de ejemplo insertadas', (SELECT COUNT(*) FROM tax_account_configurations);
    RAISE NOTICE '🔧 Funciones auxiliares creadas: get_tax_account_config, get_company_tax_configs, get_tax_config_stats';
    RAISE NOTICE '📋 Vista de resumen creada: v_tax_configurations_summary';
END $$;