-- ============================================
-- CONTAPYME - SISTEMA MULTI-EMPRESA FINAL
-- Migración: 20251001120000
-- Descripción: Migración final sin errores, completamente nueva
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- FUNCIÓN HELPER SEGURA
-- ============================================

CREATE OR REPLACE FUNCTION existe_tabla(nombre_tabla text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = nombre_tabla
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLA: users_new
-- ============================================

DO $$
BEGIN
    IF NOT existe_tabla('users_new') THEN
        CREATE TABLE users_new (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,

            -- Información personal
            phone VARCHAR(20),
            avatar_url VARCHAR(500),
            timezone VARCHAR(50) DEFAULT 'America/Santiago',
            language VARCHAR(10) DEFAULT 'es-CL',

            -- Suscripción
            subscription_plan VARCHAR(20) CHECK (subscription_plan IN ('monthly', 'semestral', 'annual')) DEFAULT 'monthly',
            subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'trial', 'suspended', 'expired')) DEFAULT 'trial',
            trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
            max_companies INTEGER DEFAULT 1,

            -- Estado
            last_login TIMESTAMPTZ,
            email_verified BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,

            -- Auditoría
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices
        CREATE INDEX idx_users_new_email ON users_new(email);
        CREATE INDEX idx_users_new_subscription ON users_new(subscription_plan, subscription_status);
        CREATE INDEX idx_users_new_active ON users_new(is_active);

        RAISE NOTICE '✅ Tabla users_new creada';
    ELSE
        RAISE NOTICE '⚠️ Tabla users_new ya existe';
    END IF;
END $$;

-- ============================================
-- TABLA: user_companies
-- ============================================

DO $$
BEGIN
    IF NOT existe_tabla('user_companies') THEN
        CREATE TABLE user_companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            company_id UUID NOT NULL,
            role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')) NOT NULL,
            permissions JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT true,
            access_granted_at TIMESTAMPTZ DEFAULT NOW(),
            access_granted_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, company_id)
        );

        -- Índices
        CREATE INDEX idx_user_companies_user ON user_companies(user_id);
        CREATE INDEX idx_user_companies_company ON user_companies(company_id);
        CREATE INDEX idx_user_companies_role ON user_companies(user_id, role);
        CREATE INDEX idx_user_companies_active ON user_companies(user_id, is_active);

        RAISE NOTICE '✅ Tabla user_companies creada';
    ELSE
        RAISE NOTICE '⚠️ Tabla user_companies ya existe';
    END IF;
END $$;

-- ============================================
-- TABLA: user_activity_log
-- ============================================

DO $$
BEGIN
    IF NOT existe_tabla('user_activity_log') THEN
        CREATE TABLE user_activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            company_id UUID,
            action VARCHAR(100) NOT NULL,
            description TEXT,
            metadata JSONB DEFAULT '{}',
            ip_address INET,
            user_agent TEXT,
            session_id VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices
        CREATE INDEX idx_activity_user_date ON user_activity_log(user_id, created_at);
        CREATE INDEX idx_activity_action ON user_activity_log(action);
        CREATE INDEX idx_activity_company ON user_activity_log(company_id, created_at);

        RAISE NOTICE '✅ Tabla user_activity_log creada';
    ELSE
        RAISE NOTICE '⚠️ Tabla user_activity_log ya existe';
    END IF;
END $$;

-- ============================================
-- AGREGAR FOREIGN KEYS DESPUÉS
-- ============================================

DO $$
BEGIN
    -- Foreign keys para user_companies
    IF existe_tabla('user_companies') AND existe_tabla('users_new') AND existe_tabla('companies') THEN
        -- Verificar si la foreign key ya existe antes de agregarla
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_user_companies_user_new'
            AND table_name = 'user_companies'
        ) THEN
            ALTER TABLE user_companies
            ADD CONSTRAINT fk_user_companies_user_new
            FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_user_companies_company'
            AND table_name = 'user_companies'
        ) THEN
            ALTER TABLE user_companies
            ADD CONSTRAINT fk_user_companies_company
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Foreign keys para user_activity_log
    IF existe_tabla('user_activity_log') AND existe_tabla('users_new') AND existe_tabla('companies') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_activity_log_user_new'
            AND table_name = 'user_activity_log'
        ) THEN
            ALTER TABLE user_activity_log
            ADD CONSTRAINT fk_activity_log_user_new
            FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_activity_log_company'
            AND table_name = 'user_activity_log'
        ) THEN
            ALTER TABLE user_activity_log
            ADD CONSTRAINT fk_activity_log_company
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
        END IF;
    END IF;

    RAISE NOTICE '✅ Foreign keys configuradas';
END $$;

-- ============================================
-- FUNCIONES ESPECIALIZADAS
-- ============================================

-- Función: Obtener empresas del usuario
CREATE OR REPLACE FUNCTION get_user_companies_new(user_uuid UUID)
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

-- Función: Verificar límite de empresas
CREATE OR REPLACE FUNCTION can_create_company_new(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM user_companies uc
    WHERE uc.user_id = user_uuid
    AND uc.role = 'owner'
    AND uc.is_active = true;

    SELECT max_companies INTO max_allowed
    FROM users_new
    WHERE id = user_uuid;

    IF max_allowed IS NULL THEN
        max_allowed := 1;
    END IF;

    RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener suscripción activa
CREATE OR REPLACE FUNCTION get_active_subscription_new(user_uuid UUID)
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

-- Función: Actualizar límites por plan
CREATE OR REPLACE FUNCTION update_user_limits_new(user_uuid UUID, new_plan VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    new_company_limit INTEGER;
    new_employee_limit INTEGER;
BEGIN
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

    UPDATE users_new
    SET
        subscription_plan = new_plan,
        max_companies = new_company_limit,
        updated_at = NOW()
    WHERE id = user_uuid;

    UPDATE subscriptions
    SET
        plan_type = new_plan,
        company_limit = new_company_limit,
        employee_limit = new_employee_limit,
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status IN ('active', 'trial');

    IF NOT FOUND THEN
        INSERT INTO subscriptions (
            user_id, plan_type, status, current_period_end,
            company_limit, employee_limit
        ) VALUES (
            user_uuid, new_plan, 'trial', NOW() + INTERVAL '30 days',
            new_company_limit, new_employee_limit
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRACIÓN SEGURA DE DATOS
-- ============================================

DO $$
DECLARE
    usuarios_migrados INTEGER := 0;
    relaciones_creadas INTEGER := 0;
BEGIN
    -- Migrar usuarios solo si existen ambas tablas
    IF existe_tabla('users') AND existe_tabla('users_new') THEN

        -- Migrar usuarios que no existan en users_new
        INSERT INTO users_new (
            id, email, full_name, phone, avatar_url, timezone, language,
            subscription_plan, subscription_status, max_companies,
            last_login, email_verified, is_active, created_at, updated_at
        )
        SELECT
            u.id, u.email, COALESCE(u.full_name, u.email), u.phone, u.avatar_url,
            COALESCE(u.timezone, 'America/Santiago'), COALESCE(u.language, 'es-CL'),
            'monthly', 'trial', 1, u.last_login, false, COALESCE(u.is_active, true),
            COALESCE(u.created_at, NOW()), COALESCE(u.updated_at, NOW())
        FROM users u
        WHERE u.id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM users_new un WHERE un.id = u.id
        );

        GET DIAGNOSTICS usuarios_migrados = ROW_COUNT;

        -- Crear relaciones usuario-empresa
        IF existe_tabla('user_companies') THEN
            INSERT INTO user_companies (user_id, company_id, role, is_active, created_at)
            SELECT DISTINCT
                u.id, u.company_id, 'owner', true, NOW()
            FROM users u
            WHERE u.company_id IS NOT NULL
            AND u.id IN (SELECT id FROM users_new)
            AND NOT EXISTS (
                SELECT 1 FROM user_companies uc
                WHERE uc.user_id = u.id AND uc.company_id = u.company_id
            );

            GET DIAGNOSTICS relaciones_creadas = ROW_COUNT;
        END IF;

        RAISE NOTICE '✅ % usuarios migrados, % relaciones creadas', usuarios_migrados, relaciones_creadas;
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas para users_new
DROP POLICY IF EXISTS "users_new_select_own" ON users_new;
CREATE POLICY "users_new_select_own" ON users_new
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_new_update_own" ON users_new;
CREATE POLICY "users_new_update_own" ON users_new
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_companies
DROP POLICY IF EXISTS "user_companies_select_own" ON user_companies;
CREATE POLICY "user_companies_select_own" ON user_companies
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_companies_manage_owner" ON user_companies;
CREATE POLICY "user_companies_manage_owner" ON user_companies
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
-- TRIGGERS
-- ============================================

-- Función para updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS users_new_updated_at ON users_new;
CREATE TRIGGER users_new_updated_at
    BEFORE UPDATE ON users_new
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

DROP TRIGGER IF EXISTS user_companies_updated_at ON user_companies;
CREATE TRIGGER user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ============================================
-- DATOS DE EJEMPLO (SIN CONFLICTOS)
-- ============================================

DO $$
BEGIN
    -- Solo insertar si no existe
    IF NOT EXISTS (SELECT 1 FROM users_new WHERE email = 'admin@contapyme.cl') THEN
        INSERT INTO users_new (
            email, full_name, subscription_plan, subscription_status,
            max_companies, email_verified
        ) VALUES (
            'admin@contapyme.cl', 'Admin ContaPyme', 'annual', 'active', 10, true
        );
        RAISE NOTICE '✅ Usuario admin creado';
    ELSE
        RAISE NOTICE '⚠️ Usuario admin ya existe';
    END IF;
END $$;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE users_new IS 'Usuarios del sistema multi-empresa';
COMMENT ON TABLE user_companies IS 'Relaciones usuario-empresa con roles';
COMMENT ON COLUMN users_new.max_companies IS 'Límite empresas: monthly=1, semestral=5, annual=10';

-- Limpiar función helper
DROP FUNCTION IF EXISTS existe_tabla(text);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    tablas_count INTEGER;
    funciones_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tablas_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users_new', 'user_companies', 'user_activity_log');

    SELECT COUNT(*) INTO funciones_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name LIKE '%_new';

    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Tablas: % | Funciones: %', tablas_count, funciones_count;
END $$;

-- Resultado final
SELECT
    '✅ Sistema multi-empresa listo' as status,
    NOW() as timestamp;