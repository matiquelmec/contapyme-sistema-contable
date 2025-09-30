-- Tabla para almacenar firmas digitales de documentos contables
CREATE TABLE IF NOT EXISTS digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del documento firmado
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('balance_8_columns', 'balance_general', 'estado_resultados', 'libro_diario', 'libro_mayor')),
    document_id VARCHAR(255), -- ID opcional del documento específico
    document_name VARCHAR(255) NOT NULL,
    document_period VARCHAR(7), -- YYYY-MM para períodos mensuales
    
    -- Información de la firma
    signer_name VARCHAR(255) NOT NULL,
    signer_rut VARCHAR(20) NOT NULL,
    signer_role VARCHAR(100) NOT NULL, -- Contador, Gerente, Auditor, etc.
    signer_email VARCHAR(255),
    
    -- Datos técnicos de la firma
    signature_hash TEXT NOT NULL, -- Hash SHA-256 del documento
    signature_data TEXT NOT NULL, -- Firma digital encriptada
    public_key TEXT, -- Clave pública para verificación
    certificate_data TEXT, -- Certificado digital si aplica
    
    -- Datos del documento
    document_hash TEXT NOT NULL, -- Hash del contenido del documento
    document_content JSONB, -- Contenido del documento para verificación
    pdf_url TEXT, -- URL del PDF firmado almacenado
    
    -- Verificación y validez
    verification_code VARCHAR(100) UNIQUE, -- Código único para verificación pública
    qr_code_data TEXT, -- Datos del código QR para verificación
    is_valid BOOLEAN DEFAULT true,
    valid_until TIMESTAMP, -- Fecha de expiración de la firma
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    
    -- Metadata y auditoría
    ip_address INET,
    user_agent TEXT,
    location JSONB, -- Ubicación geográfica si está disponible
    metadata JSONB, -- Información adicional
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_digital_signatures_company ON digital_signatures(company_id);
CREATE INDEX idx_digital_signatures_document_type ON digital_signatures(document_type);
CREATE INDEX idx_digital_signatures_signer_rut ON digital_signatures(signer_rut);
CREATE INDEX idx_digital_signatures_verification_code ON digital_signatures(verification_code);
CREATE INDEX idx_digital_signatures_created_at ON digital_signatures(created_at DESC);
CREATE INDEX idx_digital_signatures_document_period ON digital_signatures(document_period);

-- Tabla para el registro de verificaciones de firmas
CREATE TABLE IF NOT EXISTS signature_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_id UUID REFERENCES digital_signatures(id) ON DELETE CASCADE,
    verification_code VARCHAR(100),
    
    -- Resultado de la verificación
    is_valid BOOLEAN NOT NULL,
    verification_details JSONB,
    error_message TEXT,
    
    -- Información del verificador
    verifier_ip INET,
    verifier_agent TEXT,
    verifier_location JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para verificaciones
CREATE INDEX idx_signature_verifications_signature ON signature_verifications(signature_id);
CREATE INDEX idx_signature_verifications_code ON signature_verifications(verification_code);

-- Función para generar código de verificación único
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_count INT;
BEGIN
    LOOP
        -- Generar código de 10 caracteres alfanuméricos
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 10));
        
        -- Verificar si ya existe
        SELECT COUNT(*) INTO exists_count 
        FROM digital_signatures 
        WHERE verification_code = code;
        
        -- Si no existe, retornar el código
        IF exists_count = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar la validez de una firma
CREATE OR REPLACE FUNCTION verify_signature(p_verification_code VARCHAR)
RETURNS TABLE (
    is_valid BOOLEAN,
    document_type VARCHAR,
    document_name VARCHAR,
    signer_name VARCHAR,
    signer_rut VARCHAR,
    signer_role VARCHAR,
    signed_at TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP,
    revoked BOOLEAN,
    revocation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.is_valid AND ds.revoked_at IS NULL AND (ds.valid_until IS NULL OR ds.valid_until > NOW()),
        ds.document_type,
        ds.document_name,
        ds.signer_name,
        ds.signer_rut,
        ds.signer_role,
        ds.created_at,
        ds.valid_until,
        ds.revoked_at IS NOT NULL,
        ds.revocation_reason
    FROM digital_signatures ds
    WHERE ds.verification_code = p_verification_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_digital_signatures_updated_at
    BEFORE UPDATE ON digital_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE digital_signatures IS 'Almacena firmas digitales de documentos contables con trazabilidad completa';
COMMENT ON TABLE signature_verifications IS 'Registro de verificaciones realizadas a las firmas digitales';
COMMENT ON COLUMN digital_signatures.document_type IS 'Tipo de documento firmado (balance, estado resultados, etc.)';
COMMENT ON COLUMN digital_signatures.signature_hash IS 'Hash SHA-256 único de la firma digital';
COMMENT ON COLUMN digital_signatures.document_hash IS 'Hash del contenido del documento para verificar integridad';
COMMENT ON COLUMN digital_signatures.verification_code IS 'Código único para verificación pública de la firma';
COMMENT ON COLUMN digital_signatures.qr_code_data IS 'Datos para generar código QR de verificación';