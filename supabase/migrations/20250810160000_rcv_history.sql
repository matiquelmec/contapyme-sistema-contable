-- Migración para tablas de historial RCV (Registro de Compras y Ventas)
-- Fecha: 10 de agosto, 2025
-- Propósito: Almacenar todos los registros del RCV y generar entidades automáticamente

-- Crear tabla para almacenar registros RCV históricos
CREATE TABLE IF NOT EXISTS rcv_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('purchase', 'sale')), -- compra o venta
    document_type VARCHAR(50) NOT NULL, -- Factura, Boleta, NC, ND, etc.
    document_number VARCHAR(50),
    document_date DATE NOT NULL,
    
    -- Información de la entidad (extraída automáticamente del RCV)
    entity_rut VARCHAR(20) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_business_name VARCHAR(255), -- Razón social si está disponible
    entity_address TEXT,
    entity_commune VARCHAR(100),
    
    -- Montos del documento
    net_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0, -- IVA
    exempt_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Impuestos adicionales
    iaba_amount DECIMAL(15,2) DEFAULT 0, -- Impuesto bebidas alcohólicas
    other_taxes_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Información adicional
    payment_type VARCHAR(50), -- Contado, Crédito, etc.
    due_date DATE,
    description TEXT,
    reference_document VARCHAR(100), -- Para NC/ND
    
    -- Estado y procesamiento
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error', 'rejected')),
    journal_entry_id UUID, -- Referencia al asiento contable generado
    processing_notes TEXT,
    
    -- Metadatos de importación
    import_batch_id VARCHAR(100), -- ID del lote de importación
    import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    import_source VARCHAR(50), -- 'manual', 'csv', 'api', 'sii'
    original_data JSONB, -- Datos originales del CSV/API para auditoría
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_rut_format CHECK (entity_rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9K]$')
);

-- Índices para optimizar consultas
CREATE INDEX idx_rcv_records_company_id ON rcv_records(company_id);
CREATE INDEX idx_rcv_records_entity_rut ON rcv_records(entity_rut);
CREATE INDEX idx_rcv_records_entity_name ON rcv_records(entity_name);
CREATE INDEX idx_rcv_records_document_date ON rcv_records(document_date);
CREATE INDEX idx_rcv_records_record_type ON rcv_records(record_type);
CREATE INDEX idx_rcv_records_status ON rcv_records(status);
CREATE INDEX idx_rcv_records_import_batch ON rcv_records(import_batch_id);

-- Tabla para lotes de importación RCV
CREATE TABLE IF NOT EXISTS rcv_import_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Información del archivo
    file_name VARCHAR(255),
    file_type VARCHAR(50), -- 'csv', 'excel', 'xml'
    file_size INTEGER,
    
    -- Estadísticas del procesamiento
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    
    -- Período del RCV
    period_year INTEGER,
    period_month INTEGER,
    record_type VARCHAR(20), -- 'purchase', 'sale', 'mixed'
    
    -- Estado
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    error_message TEXT,
    
    -- Metadatos
    uploaded_by UUID, -- Usuario que subió el archivo
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Resumen de montos
    total_net_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_rcv_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rcv_records_updated_at
    BEFORE UPDATE ON rcv_records
    FOR EACH ROW
    EXECUTE FUNCTION update_rcv_records_updated_at();

-- Función para extraer y crear entidades automáticamente desde RCV
CREATE OR REPLACE FUNCTION create_entity_from_rcv(
    p_company_id UUID,
    p_entity_rut VARCHAR(20),
    p_entity_name VARCHAR(255),
    p_entity_business_name VARCHAR(255),
    p_record_type VARCHAR(20)
)
RETURNS UUID AS $$
DECLARE
    v_entity_id UUID;
    v_entity_type VARCHAR(50);
    v_account_code VARCHAR(20);
    v_account_name VARCHAR(255);
BEGIN
    -- Determinar tipo de entidad basado en el tipo de registro
    IF p_record_type = 'purchase' THEN
        v_entity_type := 'supplier';
        v_account_code := '2.1.1.001'; -- Cuenta por defecto para proveedores
        v_account_name := 'Proveedores Nacionales';
    ELSIF p_record_type = 'sale' THEN
        v_entity_type := 'customer';
        v_account_code := '1.1.1.001'; -- Cuenta por defecto para clientes
        v_account_name := 'Clientes Nacionales';
    ELSE
        v_entity_type := 'both';
        v_account_code := '1.1.1.001';
        v_account_name := 'Clientes y Proveedores';
    END IF;
    
    -- Verificar si la entidad ya existe
    SELECT id INTO v_entity_id
    FROM rcv_entities
    WHERE company_id = p_company_id 
      AND entity_rut = p_entity_rut;
    
    -- Si no existe, crearla
    IF v_entity_id IS NULL THEN
        INSERT INTO rcv_entities (
            company_id,
            entity_name,
            entity_rut,
            entity_business_name,
            entity_type,
            account_code,
            account_name,
            default_tax_rate,
            is_tax_exempt,
            is_active,
            notes
        ) VALUES (
            p_company_id,
            p_entity_name,
            p_entity_rut,
            p_entity_business_name,
            v_entity_type,
            v_account_code,
            v_account_name,
            19.0, -- IVA por defecto
            false,
            true,
            'Entidad creada automáticamente desde RCV'
        )
        RETURNING id INTO v_entity_id;
    ELSE
        -- Actualizar información si el nombre cambió o hay nueva información
        UPDATE rcv_entities
        SET entity_name = p_entity_name,
            entity_business_name = COALESCE(entity_business_name, p_entity_business_name),
            updated_at = NOW()
        WHERE id = v_entity_id
          AND (entity_name != p_entity_name OR entity_business_name IS NULL);
    END IF;
    
    RETURN v_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Función para procesar un registro RCV y crear/actualizar entidad
CREATE OR REPLACE FUNCTION process_rcv_record(p_record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
    v_entity_id UUID;
BEGIN
    -- Obtener el registro RCV
    SELECT * INTO v_record
    FROM rcv_records
    WHERE id = p_record_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Crear o actualizar la entidad
    v_entity_id := create_entity_from_rcv(
        v_record.company_id,
        v_record.entity_rut,
        v_record.entity_name,
        v_record.entity_business_name,
        v_record.record_type
    );
    
    -- Marcar el registro como procesado
    UPDATE rcv_records
    SET status = 'processed',
        processing_notes = 'Entidad procesada: ' || v_entity_id::TEXT,
        updated_at = NOW()
    WHERE id = p_record_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Vista para obtener resumen de entidades desde RCV
CREATE OR REPLACE VIEW rcv_entity_summary AS
SELECT 
    r.company_id,
    r.entity_rut,
    r.entity_name,
    MAX(r.entity_business_name) as entity_business_name,
    COUNT(DISTINCT CASE WHEN r.record_type = 'purchase' THEN r.id END) as purchase_count,
    COUNT(DISTINCT CASE WHEN r.record_type = 'sale' THEN r.id END) as sale_count,
    SUM(CASE WHEN r.record_type = 'purchase' THEN r.total_amount ELSE 0 END) as total_purchases,
    SUM(CASE WHEN r.record_type = 'sale' THEN r.total_amount ELSE 0 END) as total_sales,
    MIN(r.document_date) as first_transaction,
    MAX(r.document_date) as last_transaction,
    COUNT(*) as total_transactions,
    CASE 
        WHEN COUNT(DISTINCT r.record_type) = 2 THEN 'both'
        WHEN MAX(r.record_type) = 'purchase' THEN 'supplier'
        ELSE 'customer'
    END as suggested_entity_type,
    EXISTS(
        SELECT 1 FROM rcv_entities e 
        WHERE e.company_id = r.company_id 
          AND e.entity_rut = r.entity_rut
    ) as entity_exists
FROM rcv_records r
GROUP BY r.company_id, r.entity_rut, r.entity_name;

-- Función para obtener estadísticas del RCV por período
CREATE OR REPLACE FUNCTION get_rcv_statistics(
    p_company_id UUID,
    p_year INTEGER DEFAULT NULL,
    p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
    total_records BIGINT,
    total_purchases BIGINT,
    total_sales BIGINT,
    unique_entities BIGINT,
    total_net_amount DECIMAL(15,2),
    total_tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    pending_records BIGINT,
    processed_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_records,
        COUNT(CASE WHEN record_type = 'purchase' THEN 1 END)::BIGINT as total_purchases,
        COUNT(CASE WHEN record_type = 'sale' THEN 1 END)::BIGINT as total_sales,
        COUNT(DISTINCT entity_rut)::BIGINT as unique_entities,
        COALESCE(SUM(net_amount), 0) as total_net_amount,
        COALESCE(SUM(tax_amount), 0) as total_tax_amount,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT as pending_records,
        COUNT(CASE WHEN status = 'processed' THEN 1 END)::BIGINT as processed_records
    FROM rcv_records
    WHERE company_id = p_company_id
      AND (p_year IS NULL OR EXTRACT(YEAR FROM document_date) = p_year)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM document_date) = p_month);
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE rcv_records IS 'Historial completo de registros RCV con extracción automática de entidades';
COMMENT ON TABLE rcv_import_batches IS 'Control de lotes de importación de archivos RCV';
COMMENT ON FUNCTION create_entity_from_rcv IS 'Crea o actualiza una entidad automáticamente desde datos del RCV';
COMMENT ON FUNCTION process_rcv_record IS 'Procesa un registro RCV y gestiona la entidad asociada';
COMMENT ON VIEW rcv_entity_summary IS 'Resumen de entidades extraídas del RCV con estadísticas';

-- Datos de ejemplo (comentar en producción)
/*
INSERT INTO rcv_records (
    company_id, record_type, document_type, document_number, document_date,
    entity_rut, entity_name, entity_business_name,
    net_amount, tax_amount, total_amount, status
) VALUES 
(
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'purchase',
    'Factura',
    '12345',
    '2025-08-01',
    '76.123.456-7',
    'Proveedor Ejemplo Ltda.',
    'Proveedor Ejemplo Limitada',
    100000,
    19000,
    119000,
    'pending'
);
*/