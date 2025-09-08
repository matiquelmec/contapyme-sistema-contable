-- Migración para tabla de entidades RCV
-- Fecha: 10 de agosto, 2025
-- Propósito: Almacenar entidades del RCV con sus cuentas contables asociadas

-- Crear tabla de entidades RCV
CREATE TABLE IF NOT EXISTS rcv_entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Datos de la entidad
    entity_name VARCHAR(255) NOT NULL,
    entity_rut VARCHAR(20) NOT NULL,
    entity_business_name VARCHAR(255), -- Razón social completa (opcional)
    entity_type VARCHAR(50) DEFAULT 'supplier' CHECK (entity_type IN ('supplier', 'customer', 'both')),
    
    -- Configuración contable
    account_code VARCHAR(20) NOT NULL, -- Código de cuenta del plan de cuentas
    account_name VARCHAR(255) NOT NULL, -- Nombre de la cuenta (para referencia)
    account_type VARCHAR(50), -- Tipo de cuenta (asset, liability, etc.)
    
    -- Configuración adicional
    default_tax_rate DECIMAL(5,2) DEFAULT 19.0, -- Tasa de IVA por defecto
    is_tax_exempt BOOLEAN DEFAULT false,
    
    -- Metadatos
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, entity_rut), -- Un RUT por empresa
    CONSTRAINT valid_rut_format CHECK (entity_rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9K]$')
);

-- Índices para optimizar consultas
CREATE INDEX idx_rcv_entities_company_id ON rcv_entities(company_id);
CREATE INDEX idx_rcv_entities_rut ON rcv_entities(entity_rut);
CREATE INDEX idx_rcv_entities_name ON rcv_entities(entity_name);
CREATE INDEX idx_rcv_entities_account_code ON rcv_entities(account_code);
CREATE INDEX idx_rcv_entities_active ON rcv_entities(is_active) WHERE is_active = true;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_rcv_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rcv_entities_updated_at
    BEFORE UPDATE ON rcv_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_rcv_entities_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE rcv_entities IS 'Entidades del RCV con cuentas contables asociadas para automatización de asientos';
COMMENT ON COLUMN rcv_entities.entity_name IS 'Nombre comercial o razón social de la entidad';
COMMENT ON COLUMN rcv_entities.entity_rut IS 'RUT en formato XX.XXX.XXX-X';
COMMENT ON COLUMN rcv_entities.entity_type IS 'Tipo: supplier (proveedor), customer (cliente), both (ambos)';
COMMENT ON COLUMN rcv_entities.account_code IS 'Código de cuenta del plan de cuentas para asientos automáticos';
COMMENT ON COLUMN rcv_entities.default_tax_rate IS 'Tasa de IVA por defecto para esta entidad (19.0 = 19%)';
COMMENT ON COLUMN rcv_entities.is_tax_exempt IS 'Indica si la entidad está exenta de IVA';

-- Función para buscar entidad por RUT
CREATE OR REPLACE FUNCTION get_rcv_entity_by_rut(
    p_company_id UUID,
    p_rut VARCHAR(20)
)
RETURNS TABLE (
    id UUID,
    entity_name VARCHAR(255),
    entity_rut VARCHAR(20),
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    default_tax_rate DECIMAL(5,2),
    is_tax_exempt BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.entity_name,
        e.entity_rut,
        e.account_code,
        e.account_name,
        e.default_tax_rate,
        e.is_tax_exempt
    FROM rcv_entities e
    WHERE e.company_id = p_company_id 
      AND e.entity_rut = p_rut 
      AND e.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener todas las entidades activas de una empresa
CREATE OR REPLACE FUNCTION get_company_rcv_entities(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    entity_name VARCHAR(255),
    entity_rut VARCHAR(20),
    entity_business_name VARCHAR(255),
    entity_type VARCHAR(50),
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    account_type VARCHAR(50),
    default_tax_rate DECIMAL(5,2),
    is_tax_exempt BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.entity_name,
        e.entity_rut,
        e.entity_business_name,
        e.entity_type,
        e.account_code,
        e.account_name,
        e.account_type,
        e.default_tax_rate,
        e.is_tax_exempt,
        e.is_active,
        e.created_at,
        e.updated_at
    FROM rcv_entities e
    WHERE e.company_id = p_company_id
    ORDER BY e.entity_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Datos de ejemplo para testing (opcional)
-- Comentar estas líneas en producción
/*
INSERT INTO rcv_entities (
    company_id,
    entity_name,
    entity_rut,
    entity_business_name,
    entity_type,
    account_code,
    account_name,
    account_type,
    default_tax_rate,
    is_tax_exempt
) VALUES 
-- Proveedores comunes
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'Empresa ABC Ltda.', '76.123.456-7', 'Empresa ABC Limitada', 'supplier', '2.1.1.001', 'Proveedores Nacionales', 'liability', 19.0, false),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'Servicios XYZ SpA', '96.789.123-4', 'Servicios XYZ Sociedad Por Acciones', 'supplier', '2.1.1.001', 'Proveedores Nacionales', 'liability', 19.0, false),
-- Clientes comunes  
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'Cliente Principal S.A.', '90.555.666-7', 'Cliente Principal Sociedad Anónima', 'customer', '1.1.1.001', 'Clientes Nacionales', 'asset', 19.0, false),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'Distribuidora Norte', '85.111.222-3', 'Distribuidora Norte Limitada', 'customer', '1.1.1.001', 'Clientes Nacionales', 'asset', 19.0, false);
*/