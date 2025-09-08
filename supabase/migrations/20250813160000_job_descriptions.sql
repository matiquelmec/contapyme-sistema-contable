-- Crear tabla para guardar descriptores de cargo
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información básica
    title VARCHAR(255) NOT NULL,
    job_position VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    
    -- Funciones y responsabilidades
    job_functions JSONB NOT NULL DEFAULT '[]',
    obligations JSONB NOT NULL DEFAULT '[]',
    prohibitions JSONB NOT NULL DEFAULT '[]',
    
    -- Metadatos de creación
    created_by VARCHAR(100) DEFAULT 'ai_assistant',
    source_type VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual', 'pdf'
    confidence_score INTEGER,
    
    -- Información adicional
    requirements JSONB DEFAULT '[]',
    improvements_made JSONB DEFAULT '[]',
    compliance_notes JSONB DEFAULT '[]',
    
    -- Uso y estadísticas
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices y constraints
    CONSTRAINT job_descriptions_title_company_unique UNIQUE(company_id, title)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_job_descriptions_company_id ON job_descriptions(company_id);
CREATE INDEX idx_job_descriptions_job_position ON job_descriptions(job_position);
CREATE INDEX idx_job_descriptions_department ON job_descriptions(department);
CREATE INDEX idx_job_descriptions_created_at ON job_descriptions(created_at DESC);
CREATE INDEX idx_job_descriptions_times_used ON job_descriptions(times_used DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_job_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_descriptions_updated_at
    BEFORE UPDATE ON job_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_job_descriptions_updated_at();

-- Función para incrementar uso
CREATE OR REPLACE FUNCTION increment_job_description_usage(description_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE job_descriptions 
    SET 
        times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = description_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener descriptores más usados
CREATE OR REPLACE FUNCTION get_popular_job_descriptions(company_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    job_position VARCHAR(255),
    department VARCHAR(255),
    times_used INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jd.id,
        jd.title,
        jd.job_position,
        jd.department,
        jd.times_used,
        jd.last_used_at,
        jd.created_at
    FROM job_descriptions jd
    WHERE jd.company_id = company_uuid
    ORDER BY jd.times_used DESC, jd.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insertar algunos descriptores de ejemplo para testing
INSERT INTO job_descriptions (
    company_id, 
    title, 
    job_position, 
    department, 
    job_functions, 
    obligations, 
    prohibitions,
    created_by,
    source_type
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce'::UUID,
    'Vendedor PyME - Ejemplo',
    'Vendedor',
    'Ventas',
    '["Atender clientes de manera cordial y profesional", "Realizar seguimiento de leads y oportunidades comerciales", "Mantener actualizada la base de datos de clientes", "Cumplir con metas mensuales de ventas", "Participar en capacitaciones comerciales"]'::JSONB,
    '["Cumplir horarios de trabajo establecidos", "Mantener confidencialidad de información comercial", "Reportar semanalmente resultados de gestión", "Participar en reuniones de equipo", "Mantener presentación personal apropiada"]'::JSONB,
    '["Realizar actividades comerciales fuera de la empresa", "Divulgar información confidencial de clientes", "Usar recursos de la empresa para fines personales", "Atender asuntos personales en horario laboral", "Competir directa o indirectamente con la empresa"]'::JSONB,
    'system_example',
    'ai'
);

-- Comentarios en la tabla
COMMENT ON TABLE job_descriptions IS 'Almacena descriptores de cargo creados con IA para reutilización';
COMMENT ON COLUMN job_descriptions.job_functions IS 'Array JSON de funciones principales del cargo';
COMMENT ON COLUMN job_descriptions.obligations IS 'Array JSON de obligaciones específicas del cargo';
COMMENT ON COLUMN job_descriptions.prohibitions IS 'Array JSON de prohibiciones específicas del cargo';
COMMENT ON COLUMN job_descriptions.times_used IS 'Contador de veces que se ha usado este descriptor';
COMMENT ON COLUMN job_descriptions.confidence_score IS 'Puntuación de confianza de la IA (0-100)';