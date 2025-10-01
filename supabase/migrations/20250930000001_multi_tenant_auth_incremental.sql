-- ============================================
-- CONTAPYME - SISTEMA MULTI-EMPRESA INCREMENTAL
-- Migración: 20250930000001
-- Descripción: Migración incremental que verifica tablas existentes
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- VERIFICACIÓN Y CREACIÓN DE TABLAS
-- ============================================

-- Función helper para verificar si una tabla existe
CREATE OR REPLACE FUNCTION table_exists(table_name_param text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = table_name_param
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLA: users_new (Nueva estructura de usuarios)
-- ============================================

DO $$
BEGIN
    IF NOT table_exists('users_new') THEN
        CREATE TABLE users_new (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,

            -- Información personal
            phone VARCHAR(20),
            avatar_url VARCHAR(500),
            timezone VARCHAR(50) DEFAULT 'America/Santiago',
            language VARCHAR(10) DEFAULT 'es-CL',

            -- Plan de suscripción personal
            subscription_plan VARCHAR(20) CHECK (subscription_plan IN ('monthly', 'semestral', 'annual')) DEFAULT 'monthly',
            subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'trial', 'suspended', 'expired')) DEFAULT 'trial',
            trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

            -- Límites por plan
            max_companies INTEGER DEFAULT 1, -- mensual: 1, semestral: 5, anual: 10

            -- Metadatos
            last_login TIMESTAMPTZ,
            email_verified BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,

            -- Auditoría
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices para users_new
        CREATE INDEX idx_users_new_email ON users_new(email);
        CREATE INDEX idx_users_new_subscription ON users_new(subscription_plan, subscription_status);
        CREATE INDEX idx_users_new_active ON users_new(is_active);

        RAISE NOTICE 'Tabla users_new creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla users_new ya existe, saltando creación';
    END IF;
END $$;

-- ============================================
-- TABLA: user_companies (Relación usuarios-empresas)
-- ============================================

DO $$
BEGIN
    IF NOT table_exists('user_companies') THEN
        CREATE TABLE user_companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

            -- Rol específico del usuario en esta empresa
            role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')) NOT NULL,

            -- Permisos específicos (JSONB flexible)
            permissions JSONB DEFAULT '{}',

            -- Control de acceso
            is_active BOOLEAN DEFAULT true,
            access_granted_at TIMESTAMPTZ DEFAULT NOW(),
            access_granted_by UUID REFERENCES users_new(id),

            -- Auditoría
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),

            UNIQUE(user_id, company_id)
        );

        -- Índices para user_companies
        CREATE INDEX idx_user_companies_user ON user_companies(user_id);
        CREATE INDEX idx_user_companies_company ON user_companies(company_id);
        CREATE INDEX idx_user_companies_user_role ON user_companies(user_id, role);
        CREATE INDEX idx_user_companies_active ON user_companies(user_id, is_active);

        RAISE NOTICE 'Tabla user_companies creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla user_companies ya existe, saltando creación';
    END IF;
END $$;

-- ============================================
-- TABLA: subscriptions (Solo si no existe)
-- ============================================

DO $$
BEGIN
    IF NOT table_exists('subscriptions') THEN
        CREATE TABLE subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,

            -- Plan y facturación
            plan_type VARCHAR(20) CHECK (plan_type IN ('monthly', 'semestral', 'annual')) NOT NULL,
            status VARCHAR(20) CHECK (status IN ('active', 'trial', 'suspended', 'cancelled', 'expired')) NOT NULL,

            -- Fechas importantes
            started_at TIMESTAMPTZ DEFAULT NOW(),
            current_period_start TIMESTAMPTZ DEFAULT NOW(),
            current_period_end TIMESTAMPTZ NOT NULL,
            trial_end TIMESTAMPTZ,
            cancelled_at TIMESTAMPTZ,

            -- Límites específicos del plan
            company_limit INTEGER NOT NULL,
            employee_limit INTEGER DEFAULT 50,
            storage_limit VARCHAR(20) DEFAULT '1GB',

            -- Facturación
            amount_cents INTEGER, -- En centavos para evitar problemas de redondeo
            currency VARCHAR(3) DEFAULT 'CLP',
            payment_method VARCHAR(50),

            -- Metadatos de pago
            stripe_subscription_id VARCHAR(255),
            stripe_customer_id VARCHAR(255),

            -- Auditoría
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices para subscriptions
        CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
        CREATE INDEX idx_subscriptions_status ON subscriptions(status);
        CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_start, current_period_end);

        RAISE NOTICE 'Tabla subscriptions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla subscriptions ya existe, saltando creación';
    END IF;
END $$;

-- ============================================
-- TABLA: user_activity_log
-- ============================================

DO $$
BEGIN
    IF NOT table_exists('user_activity_log') THEN
        CREATE TABLE user_activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
            company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

            -- Actividad
            action VARCHAR(100) NOT NULL, -- 'login', 'company_switch', 'create_company', etc.
            description TEXT,
            metadata JSONB DEFAULT '{}',

            -- Contexto técnico
            ip_address INET,
            user_agent TEXT,
            session_id VARCHAR(255),

            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices para user_activity_log
        CREATE INDEX idx_activity_user_date ON user_activity_log(user_id, created_at);
        CREATE INDEX idx_activity_action ON user_activity_log(action);
        CREATE INDEX idx_activity_company ON user_activity_log(company_id, created_at);

        RAISE NOTICE 'Tabla user_activity_log creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla user_activity_log ya existe, saltando creación';
    END IF;
END $$;

-- ============================================
-- FUNCIONES ESPECIALIZADAS
-- ============================================

-- Función para obtener empresas accesibles por un usuario
CREATE OR REPLACE FUNCTION get_user_companies(user_uuid UUID)
RETURNS TABLE(
    company_id UUID,
    company_name VARCHAR(255),
    company_rut VARCHAR(20),
    user_role VARCHAR(20),
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.business_name,
        c.rut,
        uc.role,
        (uc.role = 'owner') as is_owner
    FROM companies c
    JOIN user_companies uc ON uc.company_id = c.id
    WHERE uc.user_id = user_uuid
    AND uc.is_active = true
    AND c.status = 'active'
    ORDER BY uc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede crear más empresas
CREATE OR REPLACE FUNCTION can_create_company(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Contar empresas donde el usuario es owner
    SELECT COUNT(*) INTO current_count
    FROM user_companies uc
    WHERE uc.user_id = user_uuid
    AND uc.role = 'owner'
    AND uc.is_active = true;

    -- Obtener límite del usuario
    SELECT max_companies INTO max_allowed
    FROM users_new
    WHERE id = user_uuid;

    -- Si no existe en users_new, asumir límite de 1 (plan mensual)
    IF max_allowed IS NULL THEN
        max_allowed := 1;
    END IF;

    RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener suscripción activa de un usuario
CREATE OR REPLACE FUNCTION get_active_subscription(user_uuid UUID)
RETURNS subscriptions AS $$
DECLARE
    subscription subscriptions%ROWTYPE;
BEGIN
    SELECT * INTO subscription
    FROM subscriptions
    WHERE user_id = user_uuid
    AND status IN ('active', 'trial')
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar límites basados en plan
CREATE OR REPLACE FUNCTION update_user_limits_by_plan(user_uuid UUID, new_plan VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    new_company_limit INTEGER;
    new_employee_limit INTEGER;
BEGIN
    -- Definir límites por plan
    CASE new_plan
        WHEN 'monthly' THEN
            new_company_limit := 1;
            new_employee_limit := 10;
        WHEN 'semestral' THEN
            new_company_limit := 5;
            new_employee_limit := 50;
        WHEN 'annual' THEN
            new_company_limit := 10;
            new_employee_limit := 100;
        ELSE
            new_company_limit := 1;
            new_employee_limit := 10;
    END CASE;

    -- Actualizar usuario
    UPDATE users_new
    SET
        subscription_plan = new_plan,
        max_companies = new_company_limit,
        updated_at = NOW()
    WHERE id = user_uuid;

    -- Actualizar o crear suscripción activa
    UPDATE subscriptions
    SET
        plan_type = new_plan,
        company_limit = new_company_limit,
        employee_limit = new_employee_limit,
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status IN ('active', 'trial');

    -- Si no existe suscripción, crear una
    IF NOT FOUND THEN
        INSERT INTO subscriptions (
            user_id,
            plan_type,
            status,
            current_period_end,
            company_limit,
            employee_limit
        ) VALUES (
            user_uuid,
            new_plan,
            'trial',
            NOW() + INTERVAL '30 days',
            new_company_limit,
            new_employee_limit
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ============================================

-- Migrar usuarios existentes si hay datos en la tabla users
DO $$
BEGIN
    IF table_exists('users') AND table_exists('users_new') THEN
        -- Solo migrar si users_new está vacía
        IF (SELECT COUNT(*) FROM users_new) = 0 THEN
            INSERT INTO users_new (
                id,
                email,
                full_name,
                phone,
                avatar_url,
                timezone,
                language,
                subscription_plan,
                subscription_status,
                max_companies,
                last_login,
                email_verified,
                is_active,
                created_at,
                updated_at
            )
            SELECT
                id,
                email,
                COALESCE(full_name, email) as full_name,
                phone,
                avatar_url,
                COALESCE(timezone, 'America/Santiago') as timezone,
                COALESCE(language, 'es-CL') as language,
                'monthly'::VARCHAR(20) as subscription_plan,
                'trial'::VARCHAR(20) as subscription_status,
                1 as max_companies,
                last_login,
                false as email_verified,
                COALESCE(is_active, true) as is_active,
                COALESCE(created_at, NOW()) as created_at,
                COALESCE(updated_at, NOW()) as updated_at
            FROM users
            WHERE id IS NOT NULL
            ON CONFLICT (email) DO NOTHING;

            RAISE NOTICE 'Usuarios migrados desde tabla users existente';
        END IF;

        -- Crear relaciones user-company para usuarios existentes que tengan company_id
        IF table_exists('user_companies') THEN
            INSERT INTO user_companies (user_id, company_id, role, is_active, created_at)
            SELECT
                u.id as user_id,
                u.company_id,
                'owner'::VARCHAR(20) as role,
                true as is_active,
                NOW() as created_at
            FROM users u
            WHERE u.company_id IS NOT NULL
            AND u.id IN (SELECT id FROM users_new)
            ON CONFLICT (user_id, company_id) DO NOTHING;

            RAISE NOTICE 'Relaciones usuario-empresa creadas para usuarios existentes';
        END IF;
    END IF;
END $$;

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Solo habilitar RLS en subscriptions y user_activity_log si se crearon en esta migración
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions' AND schemaname = 'public') THEN
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_activity_log' AND schemaname = 'public') THEN
        ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Políticas para users_new
DROP POLICY IF EXISTS "Users can view own profile" ON users_new;
CREATE POLICY "Users can view own profile" ON users_new
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users_new;
CREATE POLICY "Users can update own profile" ON users_new
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_companies
DROP POLICY IF EXISTS "Users can view their company relationships" ON user_companies;
CREATE POLICY "Users can view their company relationships" ON user_companies
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Company owners can manage user relationships" ON user_companies;
CREATE POLICY "Company owners can manage user relationships" ON user_companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_companies uc
            WHERE uc.company_id = user_companies.company_id
            AND uc.user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.is_active = true
        )
    );

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

-- Función para updated_at (crear solo si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para las nuevas tablas
DROP TRIGGER IF EXISTS update_users_new_updated_at ON users_new;
CREATE TRIGGER update_users_new_updated_at
    BEFORE UPDATE ON users_new
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_companies_updated_at ON user_companies;
CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Solo crear triggers si las tablas existen
DO $$
BEGIN
    IF table_exists('subscriptions') THEN
        DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
        CREATE TRIGGER update_subscriptions_updated_at
            BEFORE UPDATE ON subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- DATOS DE EJEMPLO PARA DESARROLLO
-- ============================================

-- Usuario de ejemplo con múltiples empresas (para testing)
INSERT INTO users_new (
    id,
    email,
    full_name,
    subscription_plan,
    subscription_status,
    max_companies,
    email_verified
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@contapyme.cl',
    'Administrador ContaPyme',
    'annual',
    'active',
    10,
    true
) ON CONFLICT (email) DO NOTHING;

-- Crear suscripción para usuario de ejemplo
INSERT INTO subscriptions (
    user_id,
    plan_type,
    status,
    current_period_end,
    company_limit,
    employee_limit,
    amount_cents,
    currency
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'annual',
    'active',
    (NOW() + INTERVAL '1 year'),
    10,
    100,
    99990, -- $999.90 CLP anuales (ejemplo)
    'CLP'
) ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE users_new IS 'Usuarios principales del sistema - Modelo multi-empresa';
COMMENT ON TABLE user_companies IS 'Relación many-to-many usuarios-empresas con roles específicos';
COMMENT ON COLUMN users_new.max_companies IS 'Límite de empresas por plan: mensual=1, semestral=5, anual=10';
COMMENT ON COLUMN user_companies.role IS 'Rol específico del usuario en la empresa';

-- Limpiar función helper
DROP FUNCTION IF EXISTS table_exists(text);

-- ============================================
-- FINALIZACIÓN
-- ============================================

SELECT
    'Sistema de autenticación multi-empresa configurado exitosamente (incremental)' as resultado,
    COUNT(DISTINCT table_name) as tablas_verificadas
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users_new', 'user_companies', 'subscriptions', 'user_activity_log');