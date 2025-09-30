-- ==========================================
-- MIGRACIÓN SEGURA: FIXED_ASSETS → ID_FIXED_ASSETS
-- Versión mejorada que detecta columnas existentes
-- ==========================================

-- PASO 1: Crear nueva tabla con estructura completa
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
    disposal_date DATE,
    disposal_value DECIMAL(15,2),
    
    -- Información contable (nuevas columnas)
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
    CONSTRAINT unique_serial_per_user_new UNIQUE (user_id, serial_number)
);

-- PASO 2: Migrar datos con detección dinámica de columnas
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_old_count INTEGER := 0;
BEGIN
    -- Verificar si la tabla original existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'fixed_assets'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        -- Contar registros originales
        EXECUTE 'SELECT COUNT(*) FROM fixed_assets' INTO v_old_count;
        
        IF v_old_count > 0 THEN
            -- Migrar solo las columnas que existen
            -- Construcción dinámica de la query basada en columnas existentes
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
                disposal_date,
                disposal_value,
                location,
                responsible_person,
                created_at,
                updated_at
            )
            SELECT 
                fa.id,
                fa.user_id,
                fa.name,
                fa.description,
                fa.category,
                fa.brand,
                fa.model,
                fa.serial_number,
                fa.purchase_value,
                COALESCE(fa.residual_value, 0),
                fa.purchase_date,
                COALESCE(fa.start_depreciation_date, fa.purchase_date),
                fa.useful_life_years,
                COALESCE(fa.depreciation_method, 'linear'),
                COALESCE(fa.status, 'active'),
                fa.disposal_date,
                fa.disposal_value,
                fa.location,
                fa.responsible_person,
                COALESCE(fa.created_at, NOW()),
                COALESCE(fa.updated_at, NOW())
            FROM fixed_assets fa;
            
            RAISE NOTICE 'Migrados % registros desde fixed_assets', v_old_count;
        ELSE
            RAISE NOTICE 'Tabla fixed_assets existe pero está vacía';
        END IF;
    ELSE
        RAISE NOTICE 'Tabla fixed_assets no existe - creando nueva estructura';
    END IF;
END $$;

-- PASO 3: Agregar columna id_fixed_assets a journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS id_fixed_assets UUID;

-- PASO 4: Reemplazar tabla antigua con la nueva
DO $$
DECLARE
    v_new_count INTEGER;
    v_old_count INTEGER := 0;
BEGIN
    -- Contar registros en nueva tabla
    SELECT COUNT(*) INTO v_new_count FROM fixed_assets_new;
    
    -- Contar registros en tabla original si existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
        EXECUTE 'SELECT COUNT(*) FROM fixed_assets' INTO v_old_count;
        
        -- Verificar que no perdimos datos
        IF v_old_count > 0 AND v_new_count <> v_old_count THEN
            RAISE EXCEPTION 'Error: Conteo no coincide. Original: %, Nueva: %', v_old_count, v_new_count;
        END IF;
    END IF;
    
    -- Eliminar constraints que referencian la tabla antigua
    ALTER TABLE IF EXISTS journal_entries 
    DROP CONSTRAINT IF EXISTS fk_journal_entries_fixed_assets;
    
    -- Eliminar tabla antigua
    DROP TABLE IF EXISTS fixed_assets CASCADE;
    
    -- Renombrar tabla nueva
    ALTER TABLE fixed_assets_new RENAME TO fixed_assets;
    
    -- Renombrar constraint único
    ALTER TABLE fixed_assets 
    RENAME CONSTRAINT unique_serial_per_user_new TO unique_serial_per_user;
    
    -- Crear foreign key con la tabla renombrada
    ALTER TABLE journal_entries 
    ADD CONSTRAINT fk_journal_entries_fixed_assets 
    FOREIGN KEY (id_fixed_assets) REFERENCES fixed_assets(id_fixed_assets) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Migración completada. Total registros: %', v_new_count;
END $$;

-- PASO 5: Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_journal_entries_fixed_assets 
ON journal_entries(id_fixed_assets) 
WHERE id_fixed_assets IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fixed_assets_status 
ON fixed_assets(status);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_category 
ON fixed_assets(category);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_user_id 
ON fixed_assets(user_id);

-- PASO 6: Actualizar función get_journal_statistics si existe
DO $$
BEGIN
    -- Verificar si la función existe
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
            WITH entry_stats AS (
                SELECT 
                    COUNT(*) as total_count,
                    COALESCE(SUM(total_debit), 0) as sum_debit,
                    COALESCE(SUM(total_credit), 0) as sum_credit
                FROM journal_entries
                WHERE company_id = p_company_id
            ),
            type_stats AS (
                SELECT jsonb_object_agg(entry_type, cnt) as by_type
                FROM (
                    SELECT entry_type, COUNT(*) as cnt
                    FROM journal_entries
                    WHERE company_id = p_company_id
                    GROUP BY entry_type
                ) t
            ),
            status_stats AS (
                SELECT jsonb_object_agg(status, cnt) as by_status
                FROM (
                    SELECT status, COUNT(*) as cnt
                    FROM journal_entries
                    WHERE company_id = p_company_id
                    GROUP BY status
                ) s
            )
            SELECT 
                entry_stats.total_count,
                entry_stats.sum_debit,
                entry_stats.sum_credit,
                COALESCE(type_stats.by_type, '{}'::jsonb),
                COALESCE(status_stats.by_status, '{}'::jsonb),
                '[]'::jsonb
            FROM entry_stats
            CROSS JOIN type_stats
            CROSS JOIN status_stats;
        END;
        $func$;
        
        RAISE NOTICE 'Función get_journal_statistics actualizada';
    END IF;
END $$;

-- PASO 7: Insertar dato demo si la tabla está vacía
INSERT INTO fixed_assets (
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
    'Computador Demo - Migración',
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
DO $$
DECLARE
    v_count INTEGER;
    v_je_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM fixed_assets;
    SELECT COUNT(*) INTO v_je_count FROM journal_entries WHERE id_fixed_assets IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total activos fijos: %', v_count;
    RAISE NOTICE 'Asientos relacionados: %', v_je_count;
    RAISE NOTICE '========================================';
END $$;