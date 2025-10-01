-- ==========================================
-- MIGRACIÓN: CHART OF ACCOUNTS - CORRECCIÓN FINAL
-- Fecha: 01 Oct 2025 17:00:00
-- Descripción: Recrear chart_of_accounts desde cero con estructura correcta
-- Basado en: Base de datos real existente con 12 empresas activas
-- ==========================================

-- ==========================================
-- 1. ELIMINAR TABLA DEFECTUOSA EXISTENTE
-- ==========================================

-- Eliminar tabla chart_of_accounts existente (que está mal estructurada)
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;

-- ==========================================
-- 2. CREAR TABLA CON ESTRUCTURA CORRECTA
-- ==========================================

CREATE TABLE public.chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    account_type VARCHAR(50) NOT NULL,
    level_type VARCHAR(20) NOT NULL DEFAULT 'Imputable',
    parent_code VARCHAR(20),
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    is_detail BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint único por empresa y código
    UNIQUE(company_id, code)
);

-- ==========================================
-- 3. CREAR ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX idx_chart_accounts_company ON public.chart_of_accounts(company_id);
CREATE INDEX idx_chart_accounts_code ON public.chart_of_accounts(code);
CREATE INDEX idx_chart_accounts_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_chart_accounts_active ON public.chart_of_accounts(is_active);
CREATE INDEX idx_chart_accounts_company_code ON public.chart_of_accounts(company_id, code);
CREATE INDEX idx_chart_accounts_parent ON public.chart_of_accounts(parent_code);

-- ==========================================
-- 4. AGREGAR FOREIGN KEY A COMPANIES
-- ==========================================

-- Solo agregar si la tabla companies existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE public.chart_of_accounts
        ADD CONSTRAINT fk_chart_accounts_company
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

        RAISE NOTICE '✅ Foreign key a companies agregada';
    ELSE
        RAISE NOTICE '⚠️ Tabla companies no existe, saltando foreign key';
    END IF;
END $$;

-- ==========================================
-- 5. INSERTAR PLAN DE CUENTAS BÁSICO
-- ==========================================

-- Insertar plan de cuentas para las empresas activas existentes
DO $$
DECLARE
    company_record RECORD;
    accounts_inserted INTEGER := 0;
BEGIN
    -- Para cada empresa activa en la base de datos
    FOR company_record IN
        SELECT id, business_name FROM companies WHERE status = 'active'
    LOOP
        -- Insertar plan de cuentas básico para cada empresa
        INSERT INTO public.chart_of_accounts (company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail, description) VALUES

        -- NIVEL 1: PRINCIPALES
        (company_record.id, '1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false, 'Cuentas de activos'),
        (company_record.id, '2', 'PASIVOS', 'Pasivo', 'Titulo', NULL, 1, true, false, 'Cuentas de pasivos'),
        (company_record.id, '3', 'PATRIMONIO', 'Patrimonio', 'Titulo', NULL, 1, true, false, 'Cuentas de patrimonio'),
        (company_record.id, '4', 'INGRESOS', 'Ingreso', 'Titulo', NULL, 1, true, false, 'Cuentas de ingresos'),
        (company_record.id, '5', 'GASTOS', 'Gasto', 'Titulo', NULL, 1, true, false, 'Cuentas de gastos'),

        -- NIVEL 2: ACTIVOS
        (company_record.id, '1.1', 'ACTIVOS CORRIENTES', 'Activo', '2do Nivel', '1', 2, true, false, 'Activos de corto plazo'),
        (company_record.id, '1.2', 'ACTIVOS NO CORRIENTES', 'Activo', '2do Nivel', '1', 2, true, false, 'Activos de largo plazo'),

        -- NIVEL 3: EFECTIVO Y EQUIVALENTES
        (company_record.id, '1.1.1', 'Efectivo y Equivalentes', 'Activo', '3er Nivel', '1.1', 3, true, false, 'Dinero disponible'),

        -- NIVEL 4: CUENTAS IMPUTABLES BÁSICAS
        (company_record.id, '1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true, 'Dinero en efectivo'),
        (company_record.id, '1.1.1.002', 'Banco Estado', 'Activo', 'Imputable', '1.1.1', 4, true, true, 'Cuenta corriente Banco Estado'),
        (company_record.id, '1.1.1.003', 'Banco Chile', 'Activo', 'Imputable', '1.1.1', 4, true, true, 'Cuenta corriente Banco Chile'),

        -- PASIVOS BÁSICOS
        (company_record.id, '2.1', 'PASIVOS CORRIENTES', 'Pasivo', '2do Nivel', '2', 2, true, false, 'Pasivos de corto plazo'),
        (company_record.id, '2.1.3', 'Pasivos por Impuestos', 'Pasivo', '3er Nivel', '2.1', 3, true, false, 'Impuestos por pagar'),
        (company_record.id, '2.1.3.001', 'IVA Crédito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true, 'IVA a favor de la empresa'),
        (company_record.id, '2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true, 'IVA por pagar al SII'),
        (company_record.id, '2.1.3.003', 'PPM Renta', 'Pasivo', 'Imputable', '2.1.3', 4, true, true, 'Pagos provisionales mensuales'),

        -- INGRESOS BÁSICOS
        (company_record.id, '4.1', 'INGRESOS OPERACIONALES', 'Ingreso', '2do Nivel', '4', 2, true, false, 'Ingresos del giro'),
        (company_record.id, '4.1.1', 'Ventas', 'Ingreso', '3er Nivel', '4.1', 3, true, false, 'Ventas de productos/servicios'),
        (company_record.id, '4.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '4.1.1', 4, true, true, 'Ventas principales de la empresa'),
        (company_record.id, '4.1.1.002', 'Servicios', 'Ingreso', 'Imputable', '4.1.1', 4, true, true, 'Ingresos por servicios'),

        -- GASTOS BÁSICOS
        (company_record.id, '5.1', 'GASTOS OPERACIONALES', 'Gasto', '2do Nivel', '5', 2, true, false, 'Gastos de operación'),
        (company_record.id, '5.1.1', 'Gastos Administrativos', 'Gasto', '3er Nivel', '5.1', 3, true, false, 'Gastos de administración'),
        (company_record.id, '5.1.1.001', 'Remuneraciones', 'Gasto', 'Imputable', '5.1.1', 4, true, true, 'Sueldos y salarios'),
        (company_record.id, '5.1.1.002', 'Servicios Básicos', 'Gasto', 'Imputable', '5.1.1', 4, true, true, 'Luz, agua, teléfono, internet');

        accounts_inserted := accounts_inserted + 22; -- 22 cuentas por empresa

        RAISE NOTICE '✅ Plan de cuentas creado para empresa: % (ID: %)', company_record.business_name, company_record.id;
    END LOOP;

    RAISE NOTICE '🎉 TOTAL: % cuentas insertadas para todas las empresas activas', accounts_inserted;
END $$;

-- ==========================================
-- 6. HABILITAR ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven cuentas de sus empresas
DROP POLICY IF EXISTS "chart_accounts_company_access" ON public.chart_of_accounts;
CREATE POLICY "chart_accounts_company_access" ON public.chart_of_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.company_id = chart_of_accounts.company_id
            AND uc.user_id = auth.uid()
            AND uc.is_active = true
        )
        OR
        EXISTS (
            -- Fallback para usuarios legacy
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.company_id = chart_of_accounts.company_id
            AND u.is_active = true
        )
    );

-- ==========================================
-- 7. CREAR TRIGGER PARA UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chart_accounts_updated_at ON public.chart_of_accounts;
CREATE TRIGGER chart_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ==========================================
-- 8. VERIFICACIÓN FINAL
-- ==========================================

DO $$
DECLARE
    total_accounts INTEGER;
    total_companies INTEGER;
    accounts_per_company DECIMAL;
BEGIN
    SELECT COUNT(*) INTO total_accounts FROM public.chart_of_accounts;
    SELECT COUNT(*) INTO total_companies FROM public.companies WHERE status = 'active';

    IF total_companies > 0 THEN
        accounts_per_company := total_accounts::DECIMAL / total_companies;
    ELSE
        accounts_per_company := 0;
    END IF;

    RAISE NOTICE '📊 VERIFICACIÓN FINAL:';
    RAISE NOTICE 'Total cuentas creadas: %', total_accounts;
    RAISE NOTICE 'Total empresas activas: %', total_companies;
    RAISE NOTICE 'Promedio cuentas por empresa: %', accounts_per_company;

    IF total_accounts > 0 THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Chart of accounts operativo';
    ELSE
        RAISE NOTICE '❌ ERROR - No se crearon cuentas';
    END IF;
END $$;

-- ==========================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE public.chart_of_accounts IS 'Plan de cuentas multi-empresa - Estructura contable chilena';
COMMENT ON COLUMN public.chart_of_accounts.code IS 'Código único de cuenta (ej: 1.1.1.001)';
COMMENT ON COLUMN public.chart_of_accounts.level_type IS 'Tipo: Titulo, 2do Nivel, 3er Nivel, Imputable';
COMMENT ON COLUMN public.chart_of_accounts.account_type IS 'Tipo contable: Activo, Pasivo, Patrimonio, Ingreso, Gasto';

-- Resultado final
SELECT
    '✅ MIGRACIÓN CHART_OF_ACCOUNTS COMPLETADA' as status,
    COUNT(*) as cuentas_creadas,
    COUNT(DISTINCT company_id) as empresas_cubiertas,
    NOW() as timestamp
FROM public.chart_of_accounts;