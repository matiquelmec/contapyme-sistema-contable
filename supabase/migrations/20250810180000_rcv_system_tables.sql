-- ==========================================
-- SISTEMA RCV - REGISTRO DE COMPRAS Y VENTAS
-- Esquema de base de datos para almacenar información RCV
-- ==========================================

-- ✅ TABLA PURCHASE_LEDGER - Libro de compras maestro por período
CREATE TABLE IF NOT EXISTS purchase_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_identifier VARCHAR(7) NOT NULL, -- YYYY-MM
    
    -- Totales calculados
    total_transactions INTEGER NOT NULL DEFAULT 0,
    sum_transactions INTEGER NOT NULL DEFAULT 0, -- Tipo 33, 34
    subtract_transactions INTEGER NOT NULL DEFAULT 0, -- Tipo 61
    total_exempt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_calculated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Estadísticas del período
    unique_suppliers INTEGER NOT NULL DEFAULT 0,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    processing_method VARCHAR(50) DEFAULT 'csv-direct-parsing',
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by UUID, -- Usuario que procesó
    file_name VARCHAR(255),
    file_size INTEGER,
    
    -- Constraints
    UNIQUE(company_id, period_identifier)
);

-- ✅ TABLA SALES_LEDGER - Libro de ventas maestro por período  
CREATE TABLE IF NOT EXISTS sales_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_identifier VARCHAR(7) NOT NULL, -- YYYY-MM
    
    -- Totales calculados
    total_transactions INTEGER NOT NULL DEFAULT 0,
    sum_transactions INTEGER NOT NULL DEFAULT 0, -- Ventas
    subtract_transactions INTEGER NOT NULL DEFAULT 0, -- Devoluciones
    total_exempt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_calculated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Estadísticas del período
    unique_customers INTEGER NOT NULL DEFAULT 0,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    processing_method VARCHAR(50) DEFAULT 'csv-direct-parsing',
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by UUID,
    file_name VARCHAR(255),
    file_size INTEGER,
    
    -- Constraints
    UNIQUE(company_id, period_identifier)
);

-- ✅ TABLA PURCHASE_DOCUMENT - Documentos individuales de compra
CREATE TABLE IF NOT EXISTS purchase_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_ledger_id UUID NOT NULL REFERENCES purchase_ledger(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    -- Información del documento
    document_number VARCHAR(50) NOT NULL,
    document_type VARCHAR(10) NOT NULL, -- 33, 34, 61, etc.
    purchase_type VARCHAR(10),
    folio VARCHAR(50),
    
    -- Fechas
    document_date DATE NOT NULL,
    reception_date DATE,
    acknowledgment_date DATE,
    
    -- Información del proveedor
    supplier_rut VARCHAR(20) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    
    -- Montos (columnas J, K, etc del RCV)
    exempt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_non_recoverable DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_non_recoverable_code VARCHAR(10),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Activos fijos
    net_amount_fixed_assets DECIMAL(15,2) DEFAULT 0,
    iva_fixed_assets DECIMAL(15,2) DEFAULT 0,
    iva_common_use DECIMAL(15,2) DEFAULT 0,
    tax_no_credit_right DECIMAL(15,2) DEFAULT 0,
    iva_not_withheld DECIMAL(15,2) DEFAULT 0,
    
    -- Impuestos especiales
    tobacco_cigars DECIMAL(15,2) DEFAULT 0,
    tobacco_cigarettes DECIMAL(15,2) DEFAULT 0,
    tobacco_processed DECIMAL(15,2) DEFAULT 0,
    nce_nde_invoice DECIMAL(15,2) DEFAULT 0,
    
    -- Otros impuestos
    other_tax_code VARCHAR(10),
    other_tax_value DECIMAL(15,2) DEFAULT 0,
    other_tax_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ TABLA SALE_DOCUMENT - Documentos individuales de venta
CREATE TABLE IF NOT EXISTS sale_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_ledger_id UUID NOT NULL REFERENCES sales_ledger(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    -- Información del documento
    document_number VARCHAR(50) NOT NULL,
    document_type VARCHAR(10) NOT NULL,
    sale_type VARCHAR(10),
    folio VARCHAR(50),
    
    -- Fechas
    document_date DATE NOT NULL,
    reception_date DATE,
    acknowledgment_date DATE,
    
    -- Información del cliente
    customer_rut VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    
    -- Montos
    exempt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_non_recoverable DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_non_recoverable_code VARCHAR(10),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Activos fijos
    net_amount_fixed_assets DECIMAL(15,2) DEFAULT 0,
    iva_fixed_assets DECIMAL(15,2) DEFAULT 0,
    iva_common_use DECIMAL(15,2) DEFAULT 0,
    tax_no_credit_right DECIMAL(15,2) DEFAULT 0,
    iva_not_withheld DECIMAL(15,2) DEFAULT 0,
    
    -- Impuestos especiales
    tobacco_cigars DECIMAL(15,2) DEFAULT 0,
    tobacco_cigarettes DECIMAL(15,2) DEFAULT 0,
    tobacco_processed DECIMAL(15,2) DEFAULT 0,
    nce_nde_invoice DECIMAL(15,2) DEFAULT 0,
    
    -- Otros impuestos
    other_tax_code VARCHAR(10),
    other_tax_value DECIMAL(15,2) DEFAULT 0,
    other_tax_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE OPTIMIZADA
-- ==========================================

-- Índices para purchase_ledger
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_company_period 
    ON purchase_ledger(company_id, period_identifier);
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_dates 
    ON purchase_ledger(period_start, period_end);

-- Índices para sales_ledger  
CREATE INDEX IF NOT EXISTS idx_sales_ledger_company_period 
    ON sales_ledger(company_id, period_identifier);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_dates 
    ON sales_ledger(period_start, period_end);

-- Índices para purchase_document
CREATE INDEX IF NOT EXISTS idx_purchase_document_ledger 
    ON purchase_document(purchase_ledger_id);
CREATE INDEX IF NOT EXISTS idx_purchase_document_company 
    ON purchase_document(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_document_supplier 
    ON purchase_document(supplier_rut);
CREATE INDEX IF NOT EXISTS idx_purchase_document_date 
    ON purchase_document(document_date);
CREATE INDEX IF NOT EXISTS idx_purchase_document_type 
    ON purchase_document(document_type);

-- Índices para sale_document
CREATE INDEX IF NOT EXISTS idx_sale_document_ledger 
    ON sale_document(sales_ledger_id);
CREATE INDEX IF NOT EXISTS idx_sale_document_company 
    ON sale_document(company_id);
CREATE INDEX IF NOT EXISTS idx_sale_document_customer 
    ON sale_document(customer_rut);
CREATE INDEX IF NOT EXISTS idx_sale_document_date 
    ON sale_document(document_date);
CREATE INDEX IF NOT EXISTS idx_sale_document_type 
    ON sale_document(document_type);

-- ==========================================
-- FUNCIONES AUXILIARES POSTGRESQL
-- ==========================================

-- Función para obtener resumen de compras por período
CREATE OR REPLACE FUNCTION get_purchase_summary(
    p_company_id UUID,
    p_period_identifier VARCHAR(7)
) RETURNS TABLE (
    ledger_id UUID,
    total_suppliers BIGINT,
    total_amount DECIMAL(15,2),
    top_supplier_name VARCHAR(255),
    top_supplier_amount DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as ledger_id,
        COUNT(DISTINCT pd.supplier_rut) as total_suppliers,
        SUM(pd.net_amount + pd.exempt_amount) as total_amount,
        (SELECT pd2.supplier_name 
         FROM purchase_document pd2 
         WHERE pd2.purchase_ledger_id = pl.id 
         GROUP BY pd2.supplier_rut, pd2.supplier_name
         ORDER BY SUM(pd2.net_amount + pd2.exempt_amount) DESC 
         LIMIT 1) as top_supplier_name,
        (SELECT SUM(pd2.net_amount + pd2.exempt_amount)
         FROM purchase_document pd2 
         WHERE pd2.purchase_ledger_id = pl.id 
         GROUP BY pd2.supplier_rut
         ORDER BY SUM(pd2.net_amount + pd2.exempt_amount) DESC 
         LIMIT 1) as top_supplier_amount
    FROM purchase_ledger pl
    LEFT JOIN purchase_document pd ON pd.purchase_ledger_id = pl.id
    WHERE pl.company_id = p_company_id 
    AND pl.period_identifier = p_period_identifier
    GROUP BY pl.id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de ventas por período
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_company_id UUID,
    p_period_identifier VARCHAR(7)
) RETURNS TABLE (
    ledger_id UUID,
    total_customers BIGINT,
    total_amount DECIMAL(15,2),
    top_customer_name VARCHAR(255),
    top_customer_amount DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id as ledger_id,
        COUNT(DISTINCT sd.customer_rut) as total_customers,
        SUM(sd.net_amount + sd.exempt_amount) as total_amount,
        (SELECT sd2.customer_name 
         FROM sale_document sd2 
         WHERE sd2.sales_ledger_id = sl.id 
         GROUP BY sd2.customer_rut, sd2.customer_name
         ORDER BY SUM(sd2.net_amount + sd2.exempt_amount) DESC 
         LIMIT 1) as top_customer_name,
        (SELECT SUM(sd2.net_amount + sd2.exempt_amount)
         FROM sale_document sd2 
         WHERE sd2.sales_ledger_id = sl.id 
         GROUP BY sd2.customer_rut
         ORDER BY SUM(sd2.net_amount + sd2.exempt_amount) DESC 
         LIMIT 1) as top_customer_amount
    FROM sales_ledger sl
    LEFT JOIN sale_document sd ON sd.sales_ledger_id = sl.id
    WHERE sl.company_id = p_company_id 
    AND sl.period_identifier = p_period_identifier
    GROUP BY sl.id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ==========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_purchase_ledger_updated_at 
    BEFORE UPDATE ON purchase_ledger 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_ledger_updated_at 
    BEFORE UPDATE ON sales_ledger 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_document_updated_at 
    BEFORE UPDATE ON purchase_document 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_document_updated_at 
    BEFORE UPDATE ON sale_document 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE purchase_ledger IS 'Libro maestro de compras por período - una entrada por mes/empresa';
COMMENT ON TABLE sales_ledger IS 'Libro maestro de ventas por período - una entrada por mes/empresa';
COMMENT ON TABLE purchase_document IS 'Documentos individuales de compra del RCV';
COMMENT ON TABLE sale_document IS 'Documentos individuales de venta del RCV';

COMMENT ON COLUMN purchase_ledger.period_identifier IS 'Período en formato YYYY-MM para indexación rápida';
COMMENT ON COLUMN sales_ledger.period_identifier IS 'Período en formato YYYY-MM para indexación rápida';
COMMENT ON COLUMN purchase_document.document_type IS 'Tipo documento SII: 33=Factura, 34=Factura Exenta, 61=Nota Crédito';
COMMENT ON COLUMN sale_document.document_type IS 'Tipo documento SII: 33=Factura, 34=Factura Exenta, 61=Nota Crédito';