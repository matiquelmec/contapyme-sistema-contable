-- ==========================================
-- MIGRACIÓN: MODIFICAR RELACIÓN FIXED_ASSETS - JOURNAL_ENTRIES
-- Fecha: 6 de agosto, 2025
-- Descripción: 
-- 1. Cambiar columna 'id' a 'id_fixed_assets' en tabla fixed_assets
-- 2. Agregar columna 'id_fixed_assets' como FK en journal_entries
-- ==========================================

-- PASO 1: Modificar tabla fixed_assets
-- Nota: En PostgreSQL no se puede renombrar la columna de clave primaria directamente
-- Se debe crear una nueva tabla y migrar los datos

-- Crear tabla temporal con la nueva estructura
CREATE TABLE IF NOT EXISTS fixed_assets_new (
    id_fixed_assets UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT DEFAULT 'demo-user',
    
    -- Información básica del activo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
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
    
    -- Información contable
    account_code VARCHAR(20) NOT NULL DEFAULT '13010001',
    depreciation_account_code VARCHAR(20) DEFAULT '13020001',
    expense_account_code VARCHAR(20) DEFAULT '61010001',
    
    -- Ubicación y responsable
    location VARCHAR(255),
    responsible_person VARCHAR(255),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT DEFAULT 'system',
    
    -- Índices únicos opcionales
    CONSTRAINT unique_serial_per_user UNIQUE (user_id, serial_number)
);

-- Migrar datos existentes de fixed_assets a fixed_assets_new
-- Usando COALESCE para manejar columnas que podrían no existir
DO $$
BEGIN
    -- Verificar si la tabla fixed_assets existe y tiene datos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
        INSERT INTO fixed_assets_new (
            id_fixed_assets,
            user_id,
            name,
            description,
            category,
            brand,
            model,
            serial_number,
            purchase_value,
            residual_value,
            purchase_date,
            start_depreciation_date,
            useful_life_years,
            depreciation_method,
            status,
            account_code,
            depreciation_account_code,
            expense_account_code,
            location,
            responsible_person,
            created_at,
            updated_at,
            created_by
        )
        SELECT 
            id as id_fixed_assets,
            user_id,
            name,
            description,
            category,
            brand,
            model,
            serial_number,
            purchase_value,
            COALESCE(residual_value, 0),
            purchase_date,
            COALESCE(start_depreciation_date, purchase_date),
            useful_life_years,
            COALESCE(depreciation_method, 'linear'),
            COALESCE(status, 'active'),
            '13010001',  -- account_code por defecto
            '13020001',  -- depreciation_account_code por defecto
            '61010001',  -- expense_account_code por defecto
            location,
            responsible_person,
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW()),
            'system'     -- created_by por defecto
        FROM fixed_assets;
        
        RAISE NOTICE 'Datos migrados desde fixed_assets a fixed_assets_new';
    ELSE
        RAISE NOTICE 'Tabla fixed_assets no existe o está vacía - creando tabla nueva vacía';
    END IF;
END $$;

-- PASO 2: Agregar columna id_fixed_assets a journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS id_fixed_assets UUID;

-- Crear foreign key constraint hacia la nueva tabla
ALTER TABLE journal_entries 
ADD CONSTRAINT fk_journal_entries_fixed_assets 
FOREIGN KEY (id_fixed_assets) REFERENCES fixed_assets_new(id_fixed_assets) 
ON DELETE SET NULL;

-- PASO 3: Eliminar tabla antigua y renombrar la nueva
-- Esto se debe hacer con cuidado para no perder referencias

-- Verificar que la migración fue exitosa
DO $$
DECLARE
    old_count INTEGER := 0;
    new_count INTEGER := 0;
BEGIN
    -- Contar registros en tabla original (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
        SELECT COUNT(*) INTO old_count FROM fixed_assets;
    END IF;
    
    -- Contar registros en tabla nueva
    SELECT COUNT(*) INTO new_count FROM fixed_assets_new;
    
    -- Proceder si:
    -- 1. Los conteos coinciden (migración exitosa)
    -- 2. O si la tabla original no existe (instalación nueva)
    IF old_count = new_count OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
        -- Eliminar tabla antigua si existe
        DROP TABLE IF EXISTS fixed_assets CASCADE;
        
        -- Renombrar tabla nueva
        ALTER TABLE fixed_assets_new RENAME TO fixed_assets;
        
        -- Mensaje de éxito
        IF old_count > 0 THEN
            RAISE NOTICE 'Migración exitosa: % registros migrados', new_count;
        ELSE
            RAISE NOTICE 'Tabla fixed_assets creada exitosamente (instalación nueva)';
        END IF;
    ELSE
        RAISE EXCEPTION 'Error en migración: old_count=%, new_count=%', old_count, new_count;
    END IF;
END $$;

-- PASO 4: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_journal_entries_fixed_assets 
ON journal_entries(id_fixed_assets) 
WHERE id_fixed_assets IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fixed_assets_status 
ON fixed_assets(status);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_category 
ON fixed_assets(category);

-- PASO 5: Actualizar funciones existentes (si las hay)
-- Esta función se ejecuta solo si existe la función get_journal_statistics
DO $$
BEGIN
    -- Verificar si existe la función
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_journal_statistics'
    ) THEN
        -- Recrear función con nueva estructura
        DROP FUNCTION IF EXISTS get_journal_statistics(TEXT);
        
        CREATE OR REPLACE FUNCTION get_journal_statistics(p_company_id TEXT DEFAULT 'demo-company')
        RETURNS TABLE (
            total_entries BIGINT,
            total_debit NUMERIC,
            total_credit NUMERIC,
            entries_by_type JSONB,
            entries_by_status JSONB,
            monthly_trend JSONB
        ) 
        LANGUAGE plpgsql
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                COUNT(*)::BIGINT as total_entries,
                COALESCE(SUM(je.total_debit), 0) as total_debit,
                COALESCE(SUM(je.total_credit), 0) as total_credit,
                COALESCE(
                    json_object_agg(je.entry_type, type_counts.cnt)::jsonb, 
                    '{}'::jsonb
                ) as entries_by_type,
                COALESCE(
                    json_object_agg(je.status, status_counts.cnt)::jsonb, 
                    '{}'::jsonb
                ) as entries_by_status,
                '[]'::jsonb as monthly_trend
            FROM journal_entries je
            LEFT JOIN (
                SELECT entry_type, COUNT(*) as cnt 
                FROM journal_entries 
                WHERE company_id = p_company_id 
                GROUP BY entry_type
            ) type_counts ON je.entry_type = type_counts.entry_type
            LEFT JOIN (
                SELECT status, COUNT(*) as cnt 
                FROM journal_entries 
                WHERE company_id = p_company_id 
                GROUP BY status
            ) status_counts ON je.status = status_counts.status
            WHERE je.company_id = p_company_id;
        END;
        $func$;
        
        RAISE NOTICE 'Función get_journal_statistics actualizada';
    END IF;
END $$;

-- PASO 6: Comentarios en las nuevas columnas
COMMENT ON COLUMN journal_entries.id_fixed_assets IS 'Referencia al activo fijo relacionado con este asiento contable (FK)';
COMMENT ON COLUMN fixed_assets.id_fixed_assets IS 'Clave primaria de activos fijos (reemplaza id)';

-- PASO 7: Datos demo actualizados (opcional)
-- Solo insertar si no hay datos existentes
INSERT INTO fixed_assets (
    id_fixed_assets,
    name,
    category,
    brand,
    model,
    purchase_value,
    residual_value,
    purchase_date,
    start_depreciation_date,
    useful_life_years,
    account_code
) 
SELECT 
    gen_random_uuid(),
    'Computador Demo Migración',
    'Equipos de Computación',
    'Dell',
    'Latitude 5520',
    1500000,
    150000,
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE - INTERVAL '6 months',
    3,
    '13010001'
WHERE NOT EXISTS (SELECT 1 FROM fixed_assets LIMIT 1);

-- Mensaje final
SELECT 'Migración de fixed_assets y journal_entries completada exitosamente' as status;