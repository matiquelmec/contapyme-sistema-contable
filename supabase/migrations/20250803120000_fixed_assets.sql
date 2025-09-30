-- =============================================
-- MIGRACIÓN: MÓDULO DE ACTIVOS FIJOS
-- Fecha: 3 de agosto, 2025
-- Descripción: Gestión completa de activos fijos con depreciación
-- =============================================

-- Tabla principal: fixed_assets
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información básica del activo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'muebles', 'equipos', 'vehiculos', 'inmuebles', 'intangibles'
    
    -- Valores económicos
    purchase_value DECIMAL(15,2) NOT NULL,
    residual_value DECIMAL(15,2) DEFAULT 0,
    depreciable_value DECIMAL(15,2) GENERATED ALWAYS AS (purchase_value - residual_value) STORED,
    
    -- Fechas importantes
    purchase_date DATE NOT NULL,
    start_depreciation_date DATE NOT NULL,
    
    -- Vida útil y depreciación
    useful_life_years INTEGER NOT NULL CHECK (useful_life_years > 0),
    useful_life_months INTEGER GENERATED ALWAYS AS (useful_life_years * 12) STORED,
    depreciation_method VARCHAR(50) DEFAULT 'linear', -- 'linear', 'accelerated', 'units_production'
    
    -- Asociación con plan de cuentas
    asset_account_code VARCHAR(20), -- Código de cuenta de activo
    depreciation_account_code VARCHAR(20), -- Código de cuenta depreciación acumulada
    expense_account_code VARCHAR(20), -- Código de cuenta gasto depreciación
    
    -- Estado del activo
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'disposed', 'fully_depreciated'
    disposal_date DATE,
    disposal_value DECIMAL(15,2),
    
    -- Información adicional
    serial_number VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    location VARCHAR(255),
    responsible_person VARCHAR(255),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para histórico de depreciaciones
CREATE TABLE IF NOT EXISTS fixed_assets_depreciation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fixed_asset_id UUID REFERENCES fixed_assets(id) ON DELETE CASCADE,
    
    -- Período de depreciación
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    
    -- Valores de depreciación
    monthly_depreciation DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    book_value DECIMAL(15,2) NOT NULL,
    
    -- Estado
    is_calculated BOOLEAN DEFAULT false,
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para consultas rápidas
    UNIQUE(fixed_asset_id, period_year, period_month)
);

-- Tabla para categorías predefinidas de activos fijos
CREATE TABLE IF NOT EXISTS fixed_assets_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_useful_life_years INTEGER,
    suggested_asset_account VARCHAR(20),
    suggested_depreciation_account VARCHAR(20),
    suggested_expense_account VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías predefinidas chilenas
INSERT INTO fixed_assets_categories (name, description, default_useful_life_years, suggested_asset_account, suggested_depreciation_account, suggested_expense_account) VALUES
('Muebles y Útiles', 'Mobiliario de oficina, escritorios, sillas, estanterías', 7, '1.2.01.001', '1.2.01.002', '3.1.08'),
('Equipos Computacionales', 'Computadores, laptops, servidores, impresoras', 3, '1.2.02.001', '1.2.02.002', '3.1.09'),
('Vehículos', 'Automóviles, camiones, motocicletas para uso empresarial', 7, '1.2.03.001', '1.2.03.002', '3.1.10'),
('Maquinaria y Equipos', 'Maquinaria industrial, herramientas especializadas', 10, '1.2.04.001', '1.2.04.002', '3.1.11'),
('Instalaciones y Equipos', 'Equipamiento fijo, instalaciones eléctricas', 10, '1.2.05.001', '1.2.05.002', '3.1.12'),
('Inmuebles', 'Edificios, terrenos, construcciones', 50, '1.2.06.001', '1.2.06.002', '3.1.13'),
('Intangibles', 'Software, licencias, patentes, marcas', 5, '1.2.07.001', '1.2.07.002', '3.1.14')
ON CONFLICT (name) DO NOTHING;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_fixed_assets_user_id ON fixed_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_purchase_date ON fixed_assets(purchase_date);

CREATE INDEX IF NOT EXISTS idx_depreciation_asset_id ON fixed_assets_depreciation(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_period ON fixed_assets_depreciation(period_year, period_month);

-- Función para calcular depreciación mensual lineal
CREATE OR REPLACE FUNCTION calculate_monthly_depreciation(
    p_purchase_value DECIMAL,
    p_residual_value DECIMAL,
    p_useful_life_months INTEGER
) RETURNS DECIMAL AS $$
BEGIN
    IF p_useful_life_months <= 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((p_purchase_value - p_residual_value) / p_useful_life_months, 2);
END;
$$ LANGUAGE plpgsql;

-- Función para generar depreciaciones automáticas
CREATE OR REPLACE FUNCTION generate_depreciation_schedule(p_fixed_asset_id UUID)
RETURNS TABLE(
    period_year INTEGER,
    period_month INTEGER,
    monthly_depreciation DECIMAL,
    accumulated_depreciation DECIMAL,
    book_value DECIMAL
) AS $$
DECLARE
    asset_record RECORD;
    current_date DATE;
    end_date DATE;
    monthly_dep DECIMAL;
    accum_dep DECIMAL;
    book_val DECIMAL;
    year_val INTEGER;
    month_val INTEGER;
BEGIN
    -- Obtener información del activo
    SELECT * INTO asset_record
    FROM fixed_assets
    WHERE id = p_fixed_asset_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calcular depreciación mensual
    monthly_dep := calculate_monthly_depreciation(
        asset_record.purchase_value,
        asset_record.residual_value,
        asset_record.useful_life_months
    );
    
    -- Configurar fechas
    current_date := asset_record.start_depreciation_date;
    end_date := current_date + INTERVAL '1 month' * asset_record.useful_life_months;
    accum_dep := 0;
    
    -- Generar cronograma
    WHILE current_date < end_date LOOP
        year_val := EXTRACT(YEAR FROM current_date);
        month_val := EXTRACT(MONTH FROM current_date);
        
        accum_dep := accum_dep + monthly_dep;
        book_val := asset_record.purchase_value - accum_dep;
        
        -- Asegurar que no se deprecie más del valor depreciable
        IF accum_dep > asset_record.depreciable_value THEN
            accum_dep := asset_record.depreciable_value;
            book_val := asset_record.residual_value;
        END IF;
        
        period_year := year_val;
        period_month := month_val;
        monthly_depreciation := monthly_dep;
        accumulated_depreciation := accum_dep;
        book_value := book_val;
        
        RETURN NEXT;
        
        current_date := current_date + INTERVAL '1 month';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_fixed_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fixed_assets_updated_at
    BEFORE UPDATE ON fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_fixed_assets_updated_at();

-- Row Level Security (RLS)
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fixed_assets
CREATE POLICY "Users can view their own fixed assets" ON fixed_assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed assets" ON fixed_assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed assets" ON fixed_assets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed assets" ON fixed_assets
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para fixed_assets_depreciation
CREATE POLICY "Users can view depreciation of their assets" ON fixed_assets_depreciation
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fixed_assets
            WHERE fixed_assets.id = fixed_assets_depreciation.fixed_asset_id
            AND fixed_assets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert depreciation for their assets" ON fixed_assets_depreciation
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM fixed_assets
            WHERE fixed_assets.id = fixed_assets_depreciation.fixed_asset_id
            AND fixed_assets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update depreciation of their assets" ON fixed_assets_depreciation
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM fixed_assets
            WHERE fixed_assets.id = fixed_assets_depreciation.fixed_asset_id
            AND fixed_assets.user_id = auth.uid()
        )
    );

-- Política para categorías (lectura pública)
CREATE POLICY "Categories are viewable by all authenticated users" ON fixed_assets_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE fixed_assets IS 'Registro de activos fijos de la empresa con información para depreciación';
COMMENT ON TABLE fixed_assets_depreciation IS 'Histórico de depreciaciones calculadas por período';
COMMENT ON TABLE fixed_assets_categories IS 'Categorías predefinidas de activos fijos con valores sugeridos';

COMMENT ON COLUMN fixed_assets.depreciable_value IS 'Valor a depreciar (purchase_value - residual_value) - calculado automáticamente';
COMMENT ON COLUMN fixed_assets.useful_life_months IS 'Vida útil en meses (useful_life_years * 12) - calculado automáticamente';
COMMENT ON COLUMN fixed_assets.depreciation_method IS 'Método de depreciación: linear, accelerated, units_production';
COMMENT ON COLUMN fixed_assets.status IS 'Estado del activo: active, disposed, fully_depreciated';