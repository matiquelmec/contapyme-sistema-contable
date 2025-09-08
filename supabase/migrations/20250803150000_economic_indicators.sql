-- =============================================
-- MIGRACION: MODULO DE INDICADORES ECONOMICOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla para almacenar indicadores economicos historicos
CREATE TABLE IF NOT EXISTS economic_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identificacion del indicador
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    
    -- Valor y fecha
    value DECIMAL(15,4) NOT NULL,
    date DATE NOT NULL,
    
    -- Metadatos
    source VARCHAR(100) DEFAULT 'mindicador.cl',
    category VARCHAR(50) NOT NULL,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar duplicados
    UNIQUE(code, date)
);

-- Tabla para configuracion de indicadores
CREATE TABLE IF NOT EXISTS indicator_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Configuracion del indicador
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    
    -- API Configuration
    api_endpoint VARCHAR(255),
    api_enabled BOOLEAN DEFAULT true,
    update_frequency VARCHAR(20) DEFAULT 'daily',
    
    -- Display configuration
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    decimal_places INTEGER DEFAULT 2,
    format_type VARCHAR(20) DEFAULT 'currency',
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuracion inicial de indicadores chilenos
INSERT INTO indicator_config (code, name, description, unit, category, api_endpoint, display_order, decimal_places, format_type) VALUES
-- Indicadores Monetarios Chilenos
('uf', 'Unidad de Fomento', 'Unidad de cuenta reajustable chilena', 'CLP', 'monetary', 'https://mindicador.cl/api/uf', 1, 2, 'currency'),
('utm', 'Unidad Tributaria Mensual', 'Medida tributaria reajustable mensualmente', 'CLP', 'monetary', 'https://mindicador.cl/api/utm', 2, 0, 'currency'),
('ipc', 'Indice de Precios al Consumidor', 'Correccion monetaria - variacion mensual IPC', '%', 'monetary', 'https://mindicador.cl/api/ipc', 3, 2, 'percentage'),
('tpm', 'Tasa de Politica Monetaria', 'Tasa de referencia del Banco Central', '%', 'monetary', 'https://mindicador.cl/api/tpm', 4, 2, 'percentage'),

-- Salarios y Empleo
('sueldo_minimo', 'Sueldo Minimo', 'Ingreso minimo mensual legal en Chile', 'CLP', 'labor', '', 5, 0, 'currency'),
('tasa_desempleo', 'Tasa de Desempleo', 'Porcentaje de desempleo nacional', '%', 'labor', 'https://mindicador.cl/api/tasa_desempleo', 6, 1, 'percentage'),

-- Divisas
('dolar', 'Dolar Observado', 'Tipo de cambio USD/CLP oficial', 'CLP', 'currency', 'https://mindicador.cl/api/dolar', 7, 2, 'currency'),
('euro', 'Euro', 'Tipo de cambio EUR/CLP', 'CLP', 'currency', 'https://mindicador.cl/api/euro', 8, 2, 'currency'),

-- Criptomonedas
('bitcoin', 'Bitcoin', 'Valor Bitcoin en USD', 'USD', 'crypto', 'https://mindicador.cl/api/bitcoin', 9, 0, 'currency')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar algunos valores historicos de ejemplo
INSERT INTO economic_indicators (code, name, unit, value, date, category) VALUES
-- UF (valores aproximados)
('uf', 'Unidad de Fomento', 'CLP', 39184.08, '2025-08-03', 'monetary'),
('uf', 'Unidad de Fomento', 'CLP', 39170.25, '2025-08-02', 'monetary'),
('uf', 'Unidad de Fomento', 'CLP', 39156.42, '2025-08-01', 'monetary'),

-- UTM (valores aproximados)
('utm', 'Unidad Tributaria Mensual', 'CLP', 68923, '2025-08-01', 'monetary'),
('utm', 'Unidad Tributaria Mensual', 'CLP', 68456, '2025-07-01', 'monetary'),
('utm', 'Unidad Tributaria Mensual', 'CLP', 67989, '2025-06-01', 'monetary'),

-- Dolar (valores aproximados)
('dolar', 'Dolar Observado', 'CLP', 920.50, '2025-08-03', 'currency'),
('dolar', 'Dolar Observado', 'CLP', 918.25, '2025-08-02', 'currency'),
('dolar', 'Dolar Observado', 'CLP', 922.10, '2025-08-01', 'currency'),

-- Bitcoin (valores aproximados)
('bitcoin', 'Bitcoin', 'USD', 65000, '2025-08-03', 'crypto'),
('bitcoin', 'Bitcoin', 'USD', 64500, '2025-08-02', 'crypto'),
('bitcoin', 'Bitcoin', 'USD', 66000, '2025-08-01', 'crypto'),

-- Sueldo Minimo Chile (valor aproximado)
('sueldo_minimo', 'Sueldo Minimo', 'CLP', 500000, '2025-08-01', 'labor'),
('sueldo_minimo', 'Sueldo Minimo', 'CLP', 500000, '2025-07-01', 'labor'),
('sueldo_minimo', 'Sueldo Minimo', 'CLP', 500000, '2025-06-01', 'labor')

ON CONFLICT (code, date) DO NOTHING;

-- Indices para optimizacion
CREATE INDEX IF NOT EXISTS idx_economic_indicators_code ON economic_indicators(code);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_date ON economic_indicators(date);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_code_date ON economic_indicators(code, date);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_category ON economic_indicators(category);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_economic_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_economic_indicators_updated_at
    BEFORE UPDATE ON economic_indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_economic_indicators_updated_at();

CREATE TRIGGER trigger_indicator_config_updated_at
    BEFORE UPDATE ON indicator_config
    FOR EACH ROW
    EXECUTE FUNCTION update_economic_indicators_updated_at();

-- Funcion para obtener el valor mas reciente de un indicador
CREATE OR REPLACE FUNCTION get_latest_indicator_value(indicator_code VARCHAR)
RETURNS TABLE (
    code VARCHAR,
    name VARCHAR,
    value DECIMAL,
    date DATE,
    unit VARCHAR,
    category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ei.code,
        ei.name,
        ei.value,
        ei.date,
        ei.unit,
        ei.category
    FROM economic_indicators ei
    WHERE ei.code = indicator_code
    ORDER BY ei.date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Funcion para obtener indicadores por categoria
CREATE OR REPLACE FUNCTION get_indicators_by_category(cat VARCHAR)
RETURNS TABLE (
    code VARCHAR,
    name VARCHAR,
    value DECIMAL,
    date DATE,
    unit VARCHAR,
    category VARCHAR,
    format_type VARCHAR,
    decimal_places INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ei.code)
        ei.code,
        ei.name,
        ei.value,
        ei.date,
        ei.unit,
        ei.category,
        ic.format_type,
        ic.decimal_places
    FROM economic_indicators ei
    JOIN indicator_config ic ON ei.code = ic.code
    WHERE ei.category = cat AND ic.is_active = true
    ORDER BY ei.code, ei.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentacion
COMMENT ON TABLE economic_indicators IS 'Almacena valores historicos de indicadores economicos chilenos';
COMMENT ON TABLE indicator_config IS 'Configuracion de indicadores economicos y sus APIs';