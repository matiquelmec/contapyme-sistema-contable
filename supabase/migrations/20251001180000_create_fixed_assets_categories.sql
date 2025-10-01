-- ==========================================
-- MIGRACIÓN: FIXED ASSETS CATEGORIES
-- Fecha: 01 Oct 2025 18:00:00
-- Descripción: Crear tabla fixed_assets_categories faltante
-- ==========================================

-- ==========================================
-- 1. CREAR TABLA FIXED_ASSETS_CATEGORIES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.fixed_assets_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  depreciation_years INTEGER DEFAULT 3,
  account_asset_code VARCHAR(20),
  account_depreciation_code VARCHAR(20),
  account_expense_code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CREAR ÍNDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_fixed_assets_categories_name ON public.fixed_assets_categories(name);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_categories_active ON public.fixed_assets_categories(is_active);

-- ==========================================
-- 3. INSERTAR CATEGORÍAS BÁSICAS CHILENAS
-- ==========================================

INSERT INTO public.fixed_assets_categories (name, description, depreciation_years, account_asset_code, account_depreciation_code, account_expense_code) VALUES
('Equipos de Computación', 'Computadores, laptops, servidores, equipos informáticos', 3, '1.2.1.001', '1.2.2.001', '6.1.1.001'),
('Muebles y Enseres', 'Escritorios, sillas, estanterías, mobiliario de oficina', 7, '1.2.1.002', '1.2.2.002', '6.1.1.002'),
('Equipos de Oficina', 'Impresoras, teléfonos, proyectores, equipos de comunicación', 5, '1.2.1.003', '1.2.2.003', '6.1.1.003'),
('Vehículos', 'Automóviles, camiones, motocicletas, vehículos comerciales', 7, '1.2.1.004', '1.2.2.004', '6.1.1.004'),
('Maquinaria y Equipos', 'Equipos industriales, maquinaria de producción', 10, '1.2.1.005', '1.2.2.005', '6.1.1.005'),
('Herramientas', 'Herramientas de trabajo, equipos menores', 3, '1.2.1.006', '1.2.2.006', '6.1.1.006'),
('Instalaciones', 'Mejoras a instalaciones, equipos fijos', 10, '1.2.1.007', '1.2.2.007', '6.1.1.007')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  depreciation_years = EXCLUDED.depreciation_years,
  account_asset_code = EXCLUDED.account_asset_code,
  account_depreciation_code = EXCLUDED.account_depreciation_code,
  account_expense_code = EXCLUDED.account_expense_code,
  updated_at = NOW();

-- ==========================================
-- 4. NOTA SOBRE FOREIGN KEYS
-- ==========================================

-- NOTA: No se crean foreign keys a chart_of_accounts.code porque:
-- 1. En sistema multi-tenant, el código 'code' se repite por empresa
-- 2. No existe constraint único en 'code' (ni debería haberlo)
-- 3. La relación correcta sería (company_id, code) pero no es práctica aquí
-- 4. Se validará por aplicación, no por base de datos

-- Si en el futuro se requiere foreign key, usar esta estructura:
-- ALTER TABLE chart_of_accounts ADD CONSTRAINT unique_company_code UNIQUE (company_id, code);
-- ALTER TABLE fixed_assets_categories ADD COLUMN company_id UUID;
-- ALTER TABLE fixed_assets_categories ADD CONSTRAINT fk_categories_account
-- FOREIGN KEY (company_id, account_asset_code) REFERENCES chart_of_accounts(company_id, code);

DO $$
BEGIN
    RAISE NOTICE '⚠️ Foreign keys a chart_of_accounts omitidas por diseño multi-tenant';
END $$;

-- ==========================================
-- 5. TRIGGER PARA UPDATED_AT
-- ==========================================

-- Verificar si la función ya existe
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS fixed_assets_categories_updated_at ON public.fixed_assets_categories;
CREATE TRIGGER fixed_assets_categories_updated_at
    BEFORE UPDATE ON public.fixed_assets_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ==========================================
-- 6. COMENTARIOS
-- ==========================================

COMMENT ON TABLE public.fixed_assets_categories IS 'Categorías de activos fijos con depreciación y cuentas contables asociadas';
COMMENT ON COLUMN public.fixed_assets_categories.depreciation_years IS 'Años de depreciación según normativa chilena';
COMMENT ON COLUMN public.fixed_assets_categories.account_asset_code IS 'Código de cuenta de activo en chart_of_accounts';
COMMENT ON COLUMN public.fixed_assets_categories.account_depreciation_code IS 'Código de cuenta de depreciación acumulada';
COMMENT ON COLUMN public.fixed_assets_categories.account_expense_code IS 'Código de cuenta de gasto por depreciación';

-- ==========================================
-- 7. VERIFICACIÓN FINAL
-- ==========================================

DO $$
DECLARE
    categories_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO categories_count FROM public.fixed_assets_categories WHERE is_active = true;

    RAISE NOTICE '📊 VERIFICACIÓN FIXED_ASSETS_CATEGORIES:';
    RAISE NOTICE 'Categorías creadas: %', categories_count;

    IF categories_count > 0 THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Fixed assets categories operativo';
    ELSE
        RAISE NOTICE '❌ ERROR - No se crearon categorías';
    END IF;
END $$;

-- Resultado final
SELECT
    '✅ MIGRACIÓN FIXED_ASSETS_CATEGORIES COMPLETADA' as status,
    COUNT(*) as categorias_creadas,
    NOW() as timestamp
FROM public.fixed_assets_categories;