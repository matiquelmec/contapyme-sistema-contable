-- =============================================
-- MIGRACIÓN SIMPLIFICADA: ACTIVOS FIJOS PARA MODO DEMO
-- Fecha: 4 de agosto, 2025  
-- Descripción: Crear tabla fixed_assets sin dependencias de auth.users
-- =============================================

-- PASO 1: Crear tabla fixed_assets simplificada (sin usuario real)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT DEFAULT 'demo-user',  -- Texto simple en lugar de UUID
    
    -- Información básica del activo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Valores económicos
    purchase_value DECIMAL(15,2) NOT NULL,
    residual_value DECIMAL(15,2) DEFAULT 0,
    
    -- Fechas importantes
    purchase_date DATE NOT NULL,
    start_depreciation_date DATE NOT NULL,
    
    -- Vida útil y depreciación
    useful_life_years INTEGER NOT NULL CHECK (useful_life_years > 0),
    depreciation_method VARCHAR(50) DEFAULT 'linear',
    
    -- Estado del activo
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints básicos
    CONSTRAINT valid_purchase_value CHECK (purchase_value > 0),
    CONSTRAINT valid_residual_value CHECK (residual_value >= 0),
    CONSTRAINT valid_useful_life CHECK (useful_life_years > 0 AND useful_life_years <= 100)
);

-- Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_fixed_assets_user_id ON fixed_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_created_at ON fixed_assets(created_at);

-- PASO 2: Poblar con datos demo realistas
INSERT INTO fixed_assets (
    user_id,
    name,
    description,
    category,
    purchase_value,
    residual_value,
    purchase_date,
    start_depreciation_date,
    useful_life_years,
    depreciation_method,
    serial_number,
    brand,
    model,
    location,
    responsible_person,
    status
) VALUES 
-- Activo 1: Computador de Oficina
(
    'demo-user',
    'Computador Dell OptiPlex 3090',
    'Computador de escritorio para tareas administrativas y contables',
    'Equipos de Computación',
    850000.00,
    85000.00,
    '2024-03-15',
    '2024-04-01',
    5,
    'linear',
    'DELL-OPX-2024-001',
    'Dell',
    'OptiPlex 3090',
    'Oficina Principal - Escritorio Contabilidad',
    'María González (Contadora)',
    'active'
),
-- Activo 2: Mobiliario de Oficina
(
    'demo-user',
    'Escritorio Ejecutivo con Cajonera',
    'Escritorio de madera con cajonera integrada para oficina principal',
    'Muebles y Enseres',
    180000.00,
    18000.00,
    '2024-01-20',
    '2024-02-01',
    10,
    'linear',
    'MUE-ESC-2024-001',
    'Muebles Sur',
    'Ejecutivo Premium',
    'Oficina Principal - Área Gerencial',
    'Carlos Pérez (Gerente)',
    'active'
),
-- Activo 3: Equipo de Impresión
(
    'demo-user',
    'Impresora Multifuncional HP LaserJet Pro',
    'Impresora láser multifuncional para documentos oficiales y reportes',
    'Equipos de Oficina',
    320000.00,
    32000.00,
    '2024-02-10',
    '2024-03-01',
    7,
    'linear',
    'HP-LJ-2024-001',
    'HP',
    'LaserJet Pro MFP M428fdw',
    'Área Administrativa - Estación de Impresión',
    'Ana Rodríguez (Secretaria)',
    'active'
),
-- Activo 4: Mobiliario Ergonómico
(
    'demo-user',
    'Set de 4 Sillas Ergonómicas',
    'Sillas ergonómicas con soporte lumbar para estaciones de trabajo',
    'Muebles y Enseres',
    240000.00,
    24000.00,
    '2024-01-25',
    '2024-02-01',
    8,
    'linear',
    'SIL-ERG-2024-SET01',
    'Ofisillas',
    'Ergonómica Pro',
    'Área de Trabajo - Múltiples Estaciones',
    'Equipo Administrativo',
    'active'
),
-- Activo 5: Equipo Tecnológico Móvil
(
    'demo-user',
    'Laptop Lenovo ThinkPad E15',
    'Laptop para trabajo remoto y presentaciones a clientes',
    'Equipos de Computación',
    750000.00,
    75000.00,
    '2024-05-10',
    '2024-06-01',
    4,
    'linear',
    'LEN-TP-2024-001',
    'Lenovo',
    'ThinkPad E15 Gen 4',
    'Equipo Móvil - Área Comercial',
    'Luis Martínez (Ejecutivo Comercial)',
    'active'
)
ON CONFLICT DO NOTHING;  -- No insertar si ya existen

-- PASO 3: Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_fixed_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_fixed_assets_updated_at ON fixed_assets;
CREATE TRIGGER update_fixed_assets_updated_at
    BEFORE UPDATE ON fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_fixed_assets_updated_at();

-- Mensaje final
DO $$
DECLARE
    asset_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM fixed_assets WHERE user_id = 'demo-user';
    RAISE NOTICE '✅ MIGRACIÓN SIMPLIFICADA COMPLETADA';
    RAISE NOTICE '🏢 Tabla fixed_assets creada exitosamente';
    RAISE NOTICE '📊 % activos demo insertados', asset_count;
    RAISE NOTICE '⚡ Sistema listo para funcionar';
END
$$;