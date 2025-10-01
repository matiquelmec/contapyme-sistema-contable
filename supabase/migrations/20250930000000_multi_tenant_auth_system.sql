-- ============================================
-- CONTAPYME - SISTEMA DE AUTENTICACIÓN MULTI-EMPRESA
-- Migración: 20250930000000
-- Descripción: Reestructuración para gestión multi-empresa por usuario
-- ============================================

-- ============================================
-- PASO 1: NUEVAS TABLAS PARA SISTEMA MULTI-EMPRESA
-- ============================================

-- Tabla de usuarios principales (sin company_id)
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

-- Tabla de relación usuarios-empresas con roles específicos
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

-- Tabla de suscripciones y facturación
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

-- Tabla para historial de actividad de usuarios
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

-- ============================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- ============================================

-- Migrar usuarios existentes al nuevo esquema
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
    full_name,
    phone,
    avatar_url,
    timezone,
    language,
    'monthly'::VARCHAR(20) as subscription_plan, -- Default to monthly
    'trial'::VARCHAR(20) as subscription_status,
    1 as max_companies, -- Start with monthly limit
    last_login,
    false as email_verified, -- Reset email verification
    is_active,
    created_at,
    updated_at
FROM users
WHERE id IS NOT NULL;

-- Crear relaciones user-company para usuarios existentes
INSERT INTO user_companies (user_id, company_id, role, is_active, created_at)
SELECT
    u.id as user_id,
    u.company_id,
    'owner'::VARCHAR(20) as role, -- Existing users become owners
    true as is_active,
    NOW() as created_at
FROM users u
WHERE u.company_id IS NOT NULL;

-- Crear suscripciones iniciales para usuarios existentes
INSERT INTO subscriptions (
    user_id,
    plan_type,
    status,
    current_period_end,
    trial_end,
    company_limit,
    employee_limit,
    amount_cents,
    currency
)
SELECT
    un.id as user_id,
    'monthly'::VARCHAR(20) as plan_type,
    'trial'::VARCHAR(20) as status,
    (NOW() + INTERVAL '30 days') as current_period_end,
    (NOW() + INTERVAL '30 days') as trial_end,
    1 as company_limit,
    10 as employee_limit,
    0 as amount_cents, -- Trial period
    'CLP' as currency
FROM users_new un;

-- ============================================
-- PASO 3: RECREAR POLÍTICAS RLS
-- ============================================

-- Deshabilitar temporalmente RLS en users para la migración
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS en nuevas tablas
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas para users_new
CREATE POLICY "Users can view own profile" ON users_new
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_new
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_companies
CREATE POLICY "Users can view their company relationships" ON user_companies
    FOR SELECT USING (auth.uid() = user_id);

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

-- Políticas para subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para user_activity_log
CREATE POLICY "Users can view own activity" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PASO 4: ACTUALIZAR POLÍTICAS EXISTENTES
-- ============================================

-- Actualizar políticas de companies para el nuevo modelo
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;

-- Nuevas políticas basadas en user_companies
CREATE POLICY "Users can view accessible companies" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies uc
            WHERE uc.company_id = companies.id
            AND uc.user_id = auth.uid()
            AND uc.is_active = true
        )
    );

CREATE POLICY "Company owners can update companies" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies uc
            WHERE uc.company_id = companies.id
            AND uc.user_id = auth.uid()
            AND uc.role IN ('owner', 'admin')
            AND uc.is_active = true
        )
    );

CREATE POLICY "Users can create companies within limits" ON companies
    FOR INSERT WITH CHECK (
        (
            SELECT COUNT(*) FROM user_companies uc
            JOIN users_new u ON u.id = uc.user_id
            WHERE uc.user_id = auth.uid() AND uc.role = 'owner'
        ) < (
            SELECT max_companies FROM users_new WHERE id = auth.uid()
        )
    );

CREATE POLICY "Company owners can delete companies" ON companies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_companies uc
            WHERE uc.company_id = companies.id
            AND uc.user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.is_active = true
        )
    );

-- ============================================
-- PASO 5: FUNCIONES ESPECIALIZADAS
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

    -- Actualizar suscripción activa
    UPDATE subscriptions
    SET
        plan_type = new_plan,
        company_limit = new_company_limit,
        employee_limit = new_employee_limit,
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status IN ('active', 'trial');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 6: TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger para actualizar updated_at en nuevas tablas
CREATE TRIGGER update_users_new_updated_at
    BEFORE UPDATE ON users_new
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para log de actividad automático en login
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_activity_log (user_id, action, description, metadata)
    VALUES (
        NEW.id,
        'profile_update',
        'User profile updated',
        json_build_object('last_login', NEW.last_login)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_user_login
    AFTER UPDATE OF last_login ON users_new
    FOR EACH ROW
    WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
    EXECUTE FUNCTION log_user_activity();

-- ============================================
-- PASO 7: ÍNDICES OPTIMIZADOS
-- ============================================

-- Índices para users_new
CREATE INDEX idx_users_new_email ON users_new(email);
CREATE INDEX idx_users_new_subscription ON users_new(subscription_plan, subscription_status);
CREATE INDEX idx_users_new_active ON users_new(is_active);

-- Índices para user_companies
CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
CREATE INDEX idx_user_companies_user_role ON user_companies(user_id, role);
CREATE INDEX idx_user_companies_active ON user_companies(user_id, is_active);

-- Índices para subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_start, current_period_end);

-- Índices para user_activity_log
CREATE INDEX idx_activity_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX idx_activity_action ON user_activity_log(action);
CREATE INDEX idx_activity_company ON user_activity_log(company_id, created_at);

-- ============================================
-- PASO 8: DATOS DE EJEMPLO PARA DESARROLLO
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

-- Empresa adicional para testing multi-empresa
INSERT INTO companies (
    id,
    business_name,
    legal_name,
    rut,
    industry_sector,
    company_size,
    status
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Empresa Secundaria Demo',
    'Empresa Secundaria Demo Ltda.',
    '98.765.432-1',
    'Comercio',
    'small',
    'active'
) ON CONFLICT (rut) DO NOTHING;

-- Relación usuario-empresa para testing
INSERT INTO user_companies (user_id, company_id, role) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'owner'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'owner')
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Suscripción para usuario de ejemplo
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
    999900, -- $9,999 CLP anuales
    'CLP'
) ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 9: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE users_new IS 'Usuarios principales del sistema - Modelo multi-empresa';
COMMENT ON TABLE user_companies IS 'Relación many-to-many usuarios-empresas con roles específicos';
COMMENT ON TABLE subscriptions IS 'Suscripciones y facturación por usuario';
COMMENT ON TABLE user_activity_log IS 'Log de actividad de usuarios para auditoría';

COMMENT ON COLUMN users_new.max_companies IS 'Límite de empresas por plan: mensual=1, semestral=5, anual=10';
COMMENT ON COLUMN user_companies.role IS 'Rol específico del usuario en la empresa';
COMMENT ON COLUMN subscriptions.company_limit IS 'Límite de empresas permitidas en este plan';

-- ============================================
-- FINALIZACIÓN
-- ============================================

SELECT
    'Sistema de autenticación multi-empresa configurado exitosamente' as resultado,
    COUNT(DISTINCT table_name) as nuevas_tablas
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users_new', 'user_companies', 'subscriptions', 'user_activity_log');