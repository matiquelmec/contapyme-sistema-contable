-- =============================================
-- MIGRACIÓN: USUARIO DEMO + ACTIVOS FIJOS REALES
-- Fecha: 4 de agosto, 2025
-- Descripción: Crear usuario demo y funcionalidad completa de activos fijos
-- =============================================

-- PASO 1: Crear usuario demo en auth.users (si no existe)
DO $$
BEGIN
    -- Verificar si el usuario demo ya existe
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = 'demo@pymeejemplo.cl'
    ) THEN
        -- Crear usuario demo
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user
        ) VALUES (
            '12345678-9abc-def0-1234-56789abcdef0',  -- UUID fijo para demo
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'demo@pymeejemplo.cl',
            '$2a$10$demopasswordhashforfixedassetsdemo',  -- Hash de password demo
            NOW(),
            NOW(),
            '',
            NOW(),
            '',
            NULL,
            '',
            '',
            NULL,
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Usuario Demo PyME","company":"PyME Ejemplo S.A.","rut":"12.345.678-9"}',
            false,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            0,
            NULL,
            '',
            NULL,
            false
        );
        
        RAISE NOTICE 'Usuario demo creado exitosamente';
    ELSE
        RAISE NOTICE 'Usuario demo ya existe, continuando...';
    END IF;
END
$$;

-- PASO 2: Crear tabla fixed_assets (adaptada para producción)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información básica del activo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
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
    
    -- Constraints
    CONSTRAINT valid_purchase_value CHECK (purchase_value > 0),
    CONSTRAINT valid_residual_value CHECK (residual_value >= 0 AND residual_value < purchase_value),
    CONSTRAINT valid_useful_life CHECK (useful_life_years > 0 AND useful_life_years <= 100),
    CONSTRAINT valid_disposal_dates CHECK (disposal_date IS NULL OR disposal_date >= purchase_date)
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_fixed_assets_user_id ON fixed_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_created_at ON fixed_assets(created_at);

-- Función para actualizar updated_at automáticamente
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

-- PASO 3: Configurar Row Level Security (RLS)
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo pueden ver sus propios activos
CREATE POLICY "Users can only see their own fixed assets" ON fixed_assets
    FOR ALL USING (auth.uid() = user_id);

-- Política especial para usuario demo (visible para todos en modo demo)
CREATE POLICY "Demo user assets visible to all" ON fixed_assets
    FOR ALL USING (user_id = '12345678-9abc-def0-1234-56789abcdef0');

-- PASO 4: Poblar con datos demo realistas
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
    '12345678-9abc-def0-1234-56789abcdef0',
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
    '12345678-9abc-def0-1234-56789abcdef0',
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
    '12345678-9abc-def0-1234-56789abcdef0',
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
    '12345678-9abc-def0-1234-56789abcdef0',
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
    '12345678-9abc-def0-1234-56789abcdef0',
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
);

-- PASO 5: Crear tabla para cronograma de depreciación (opcional)
CREATE TABLE IF NOT EXISTS fixed_assets_depreciation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fixed_asset_id UUID REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    monthly_depreciation DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    book_value DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fixed_asset_id, period_year, period_month)
);

-- Crear índices para cronograma
CREATE INDEX IF NOT EXISTS idx_depreciation_asset_id ON fixed_assets_depreciation(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_period ON fixed_assets_depreciation(period_year, period_month);

-- PASO 6: Función para generar cronograma de depreciación automático
CREATE OR REPLACE FUNCTION generate_depreciation_schedule(asset_id UUID)
RETURNS TABLE(
    period_year INTEGER,
    period_month INTEGER,
    monthly_depreciation DECIMAL(15,2),
    accumulated_depreciation DECIMAL(15,2),
    book_value DECIMAL(15,2)
) AS $$
DECLARE
    asset_record RECORD;
    current_date DATE;
    end_date DATE;
    monthly_dep DECIMAL(15,2);
    acc_dep DECIMAL(15,2) := 0;
    current_book_value DECIMAL(15,2);
BEGIN
    -- Obtener datos del activo
    SELECT * INTO asset_record FROM fixed_assets WHERE id = asset_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Activo fijo no encontrado: %', asset_id;
    END IF;
    
    -- Calcular depreciación mensual
    monthly_dep := asset_record.depreciable_value / asset_record.useful_life_months;
    current_book_value := asset_record.purchase_value;
    
    -- Generar cronograma desde fecha de inicio hasta fin de vida útil
    current_date := asset_record.start_depreciation_date;
    end_date := current_date + INTERVAL '1 month' * asset_record.useful_life_months;
    
    WHILE current_date < end_date LOOP
        acc_dep := acc_dep + monthly_dep;
        current_book_value := GREATEST(asset_record.purchase_value - acc_dep, asset_record.residual_value);
        
        period_year := EXTRACT(YEAR FROM current_date);
        period_month := EXTRACT(MONTH FROM current_date);
        monthly_depreciation := LEAST(monthly_dep, current_book_value - asset_record.residual_value + acc_dep - monthly_dep);
        accumulated_depreciation := acc_dep;
        book_value := current_book_value;
        
        RETURN NEXT;
        
        current_date := current_date + INTERVAL '1 month';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- PASO 7: Comentarios y documentación
COMMENT ON TABLE fixed_assets IS 'Tabla principal de activos fijos con depreciación automática';
COMMENT ON COLUMN fixed_assets.user_id IS 'Usuario propietario del activo (FK auth.users)';
COMMENT ON COLUMN fixed_assets.depreciable_value IS 'Valor depreciable calculado automáticamente (purchase_value - residual_value)';
COMMENT ON COLUMN fixed_assets.useful_life_months IS 'Vida útil en meses calculada automáticamente (useful_life_years * 12)';

COMMENT ON TABLE fixed_assets_depreciation IS 'Cronograma de depreciación mensual por activo';
COMMENT ON FUNCTION generate_depreciation_schedule(UUID) IS 'Genera cronograma de depreciación automático para un activo';

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📊 Usuario demo creado: demo@pymeejemplo.cl';
    RAISE NOTICE '🏢 5 activos fijos demo insertados';
    RAISE NOTICE '🔒 RLS configurado para seguridad';
    RAISE NOTICE '⚡ Funcionalidad completamente operativa';
END
$$;