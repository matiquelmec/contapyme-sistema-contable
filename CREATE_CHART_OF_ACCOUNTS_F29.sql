-- ==========================================
-- CREAR PLAN DE CUENTAS BÁSICO PARA F29
-- Solución al error de cuentas faltantes
-- ==========================================

-- 1. Crear tabla chart_of_accounts si no existe
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  account_type VARCHAR(50) NOT NULL,
  level_type VARCHAR(20) NOT NULL DEFAULT 'Imputable',
  parent_code VARCHAR(20),
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  is_detail BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_active ON chart_of_accounts(is_active);

-- 3. Insertar cuentas básicas para F29
INSERT INTO chart_of_accounts (code, name, account_type, level_type, parent_code, level, is_active, is_detail) VALUES
-- Estructura básica de activos
('1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false),
('1.1', 'ACTIVOS CORRIENTES', 'Activo', '2do Nivel', '1', 2, true, false),
('1.1.1', 'Efectivo y Equivalentes', 'Activo', '3er Nivel', '1.1', 3, true, false),
('1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true),
('1.1.1.002', 'Banco Estado', 'Activo', 'Imputable', '1.1.1', 4, true, true),

-- Estructura básica de pasivos
('2', 'PASIVOS', 'Pasivo', 'Titulo', NULL, 1, true, false),
('2.1', 'PASIVOS CORRIENTES', 'Pasivo', '2do Nivel', '2', 2, true, false),
('2.1.3', 'Pasivos por Impuestos', 'Pasivo', '3er Nivel', '2.1', 3, true, false),
('2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true),

-- Estructura básica de ingresos
('5', 'INGRESOS', 'Ingreso', 'Titulo', NULL, 1, true, false),
('5.1', 'INGRESOS OPERACIONALES', 'Ingreso', '2do Nivel', '5', 2, true, false),
('5.1.1', 'Ventas', 'Ingreso', '3er Nivel', '5.1', 3, true, false),
('5.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '5.1.1', 4, true, true)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  level_type = EXCLUDED.level_type,
  parent_code = EXCLUDED.parent_code,
  level = EXCLUDED.level,
  is_active = EXCLUDED.is_active,
  is_detail = EXCLUDED.is_detail,
  updated_at = NOW();

-- 4. Verificar que las cuentas se crearon correctamente
SELECT
    'VERIFICACIÓN CUENTAS F29' as status,
    code,
    name,
    account_type,
    level_type,
    is_active
FROM chart_of_accounts
WHERE code IN ('1.1.1.001', '2.1.3.002', '5.1.1.001')
ORDER BY code;

-- 5. Mensaje de confirmación
SELECT
    '✅ CUENTAS F29 CREADAS' as status,
    'Las cuentas Caja, IVA Débito Fiscal y Ventas del Giro están listas para F29' as description,
    COUNT(*) as cuentas_creadas
FROM chart_of_accounts
WHERE code IN ('1.1.1.001', '2.1.3.002', '5.1.1.001') AND is_active = true;