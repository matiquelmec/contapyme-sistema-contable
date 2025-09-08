-- =============================================
-- MIGRACIÓN: PLAN DE CUENTAS Y ASIENTOS CONTABLES
-- Fecha: 4 de agosto, 2025  
-- Descripción: Sistema contable completo para activos fijos
-- =============================================

-- TABLA 1: Plan de Cuentas
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level_type VARCHAR(20) NOT NULL, -- '1er Nivel', '2do Nivel', '3er Nivel', 'Imputable'
    parent_code VARCHAR(20),
    account_type VARCHAR(50), -- 'ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_parent_account FOREIGN KEY (parent_code) REFERENCES chart_of_accounts(code)
);

-- TABLA 2: Asientos Contables
CREATE TABLE IF NOT EXISTS accounting_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT DEFAULT 'demo-user',
    entry_number INTEGER NOT NULL, -- Número correlativo de asiento
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'FIXED_ASSET_PURCHASE', 'DEPRECIATION', 'MANUAL'
    reference_id UUID, -- ID del activo fijo u otra referencia
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'reversed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT balanced_entry CHECK (total_debit = total_credit)
);

-- TABLA 3: Detalle de Asientos (Debe y Haber)
CREATE TABLE IF NOT EXISTS accounting_entry_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(code),
    account_name VARCHAR(255) NOT NULL, -- Desnormalizado para performance
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_amounts CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- TABLA 4: Actualizar fixed_assets con cuentas contables
ALTER TABLE fixed_assets 
ADD COLUMN IF NOT EXISTS asset_account_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS depreciation_account_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS expense_account_code VARCHAR(20);

-- Agregar foreign keys
ALTER TABLE fixed_assets 
ADD CONSTRAINT IF NOT EXISTS fk_asset_account 
FOREIGN KEY (asset_account_code) REFERENCES chart_of_accounts(code);

ALTER TABLE fixed_assets 
ADD CONSTRAINT IF NOT EXISTS fk_depreciation_account 
FOREIGN KEY (depreciation_account_code) REFERENCES chart_of_accounts(code);

ALTER TABLE fixed_assets 
ADD CONSTRAINT IF NOT EXISTS fk_expense_account 
FOREIGN KEY (expense_account_code) REFERENCES chart_of_accounts(code);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_level ON chart_of_accounts(level_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_user ON accounting_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_reference ON accounting_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_entry_details_entry ON accounting_entry_details(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_details_account ON accounting_entry_details(account_code);

-- FUNCIÓN: Generar número correlativo de asiento
CREATE OR REPLACE FUNCTION get_next_entry_number(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(entry_number), 0) + 1 
    INTO next_number
    FROM accounting_entries 
    WHERE user_id = p_user_id;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN: Crear asiento contable automático
CREATE OR REPLACE FUNCTION create_accounting_entry(
    p_user_id TEXT,
    p_description TEXT,
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_entry_details JSONB -- Array de {account_code, debit, credit, description}
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_entry_number INTEGER;
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
    v_detail JSONB;
BEGIN
    -- Calcular totales
    FOR v_detail IN SELECT * FROM jsonb_array_elements(p_entry_details)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_detail->>'debit_amount')::DECIMAL(15,2), 0);
        v_total_credit := v_total_credit + COALESCE((v_detail->>'credit_amount')::DECIMAL(15,2), 0);
    END LOOP;
    
    -- Validar balance
    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Asiento desbalanceado: Debe=% Haber=%', v_total_debit, v_total_credit;
    END IF;
    
    -- Obtener número correlativo
    v_entry_number := get_next_entry_number(p_user_id);
    
    -- Crear asiento principal
    INSERT INTO accounting_entries (
        user_id, entry_number, entry_date, description, 
        reference_type, reference_id, total_debit, total_credit
    ) VALUES (
        p_user_id, v_entry_number, CURRENT_DATE, p_description,
        p_reference_type, p_reference_id, v_total_debit, v_total_credit
    )
    RETURNING id INTO v_entry_id;
    
    -- Crear detalles
    FOR v_detail IN SELECT * FROM jsonb_array_elements(p_entry_details)
    LOOP
        INSERT INTO accounting_entry_details (
            entry_id, account_code, account_name, 
            debit_amount, credit_amount, description
        ) VALUES (
            v_entry_id,
            v_detail->>'account_code',
            v_detail->>'account_name',
            COALESCE((v_detail->>'debit_amount')::DECIMAL(15,2), 0),
            COALESCE((v_detail->>'credit_amount')::DECIMAL(15,2), 0),
            v_detail->>'description'
        );
    END LOOP;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- DATOS DEMO: Cargar plan de cuentas básico
INSERT INTO chart_of_accounts (code, name, level_type, account_type, parent_code) VALUES
-- Nivel 1
('1', 'ACTIVO', '1er Nivel', 'ACTIVO', NULL),
('2', 'PASIVO', '1er Nivel', 'PASIVO', NULL),
('3', 'PATRIMONIO', '1er Nivel', 'PATRIMONIO', NULL),
('5', 'INGRESOS', '1er Nivel', 'INGRESO', NULL),
('6', 'GASTOS', '1er Nivel', 'GASTO', NULL),

-- Nivel 2 - Activos
('1.1', 'ACTIVO CORRIENTE', '2do Nivel', 'ACTIVO', '1'),
('1.2', 'ACTIVO NO CORRIENTE', '2do Nivel', 'ACTIVO', '1'),

-- Nivel 3 - Activos Fijos
('1.2.1', 'PROPIEDAD, PLANTA Y EQUIPO', '3er Nivel', 'ACTIVO', '1.2'),
('1.2.2', 'DEPRECIACIÓN ACUMULADA', '3er Nivel', 'ACTIVO', '1.2'),

-- Nivel 3 - Gastos
('6.1', 'GASTOS OPERACIONALES', '3er Nivel', 'GASTO', '6'),

-- Cuentas Imputables - Activos Fijos
('1.2.1.001', 'Equipos de Computación', 'Imputable', 'ACTIVO', '1.2.1'),
('1.2.1.002', 'Muebles y Enseres', 'Imputable', 'ACTIVO', '1.2.1'),
('1.2.1.003', 'Equipos de Oficina', 'Imputable', 'ACTIVO', '1.2.1'),
('1.2.1.004', 'Vehículos', 'Imputable', 'ACTIVO', '1.2.1'),

-- Cuentas Imputables - Depreciación Acumulada
('1.2.2.001', 'Dep. Acum. Equipos de Computación', 'Imputable', 'ACTIVO', '1.2.2'),
('1.2.2.002', 'Dep. Acum. Muebles y Enseres', 'Imputable', 'ACTIVO', '1.2.2'),
('1.2.2.003', 'Dep. Acum. Equipos de Oficina', 'Imputable', 'ACTIVO', '1.2.2'),
('1.2.2.004', 'Dep. Acum. Vehículos', 'Imputable', 'ACTIVO', '1.2.2'),

-- Cuentas Imputables - Gastos Depreciación
('6.1.1.001', 'Gasto Depreciación Equipos Computación', 'Imputable', 'GASTO', '6.1'),
('6.1.1.002', 'Gasto Depreciación Muebles y Enseres', 'Imputable', 'GASTO', '6.1'),
('6.1.1.003', 'Gasto Depreciación Equipos Oficina', 'Imputable', 'GASTO', '6.1'),
('6.1.1.004', 'Gasto Depreciación Vehículos', 'Imputable', 'GASTO', '6.1'),

-- Otras cuentas básicas
('1.1.1.001', 'Caja', 'Imputable', 'ACTIVO', '1.1'),
('1.1.1.002', 'Banco Estado', 'Imputable', 'ACTIVO', '1.1')

ON CONFLICT (code) DO NOTHING;

-- ACTUALIZAR ACTIVOS EXISTENTES con cuentas contables apropiadas
UPDATE fixed_assets SET 
    asset_account_code = CASE 
        WHEN category = 'Equipos de Computación' THEN '1.2.1.001'
        WHEN category = 'Muebles y Enseres' THEN '1.2.1.002'
        WHEN category = 'Equipos de Oficina' THEN '1.2.1.003'
        ELSE '1.2.1.001'
    END,
    depreciation_account_code = CASE 
        WHEN category = 'Equipos de Computación' THEN '1.2.2.001'
        WHEN category = 'Muebles y Enseres' THEN '1.2.2.002'
        WHEN category = 'Equipos de Oficina' THEN '1.2.2.003'
        ELSE '1.2.2.001'
    END,
    expense_account_code = CASE 
        WHEN category = 'Equipos de Computación' THEN '6.1.1.001'
        WHEN category = 'Muebles y Enseres' THEN '6.1.1.002'
        WHEN category = 'Equipos de Oficina' THEN '6.1.1.003'
        ELSE '6.1.1.001'
    END
WHERE user_id = 'demo-user';

-- GENERAR ASIENTOS DEMO para los activos existentes
DO $$
DECLARE
    asset_record RECORD;
    entry_details JSONB;
BEGIN
    -- Para cada activo fijo existente, generar asiento de compra
    FOR asset_record IN 
        SELECT * FROM fixed_assets WHERE user_id = 'demo-user'
    LOOP
        -- Crear asiento de compra
        entry_details := jsonb_build_array(
            jsonb_build_object(
                'account_code', asset_record.asset_account_code,
                'account_name', (SELECT name FROM chart_of_accounts WHERE code = asset_record.asset_account_code),
                'debit_amount', asset_record.purchase_value,
                'credit_amount', 0,
                'description', 'Compra ' || asset_record.name
            ),
            jsonb_build_object(
                'account_code', '1.1.1.002',
                'account_name', 'Banco Estado',
                'debit_amount', 0,
                'credit_amount', asset_record.purchase_value,
                'description', 'Pago compra ' || asset_record.name
            )
        );
        
        PERFORM create_accounting_entry(
            'demo-user',
            'Compra activo fijo: ' || asset_record.name,
            'FIXED_ASSET_PURCHASE',
            asset_record.id,
            entry_details
        );
    END LOOP;
END
$$;

-- Mensaje final
SELECT 'MIGRACIÓN CONTABLE COMPLETADA - Plan de cuentas y asientos automáticos implementados' AS resultado;