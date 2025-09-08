-- Migración para agregar campos adicionales de Previred en liquidaciones
-- Especialmente para trabajadores con períodos parciales o situaciones especiales

-- Agregar campos adicionales a la tabla payroll_liquidations
ALTER TABLE payroll_liquidations 
ADD COLUMN IF NOT EXISTS start_work_date DATE, -- Fecha inicio de trabajo en el período
ADD COLUMN IF NOT EXISTS end_work_date DATE,   -- Fecha fin de trabajo en el período
ADD COLUMN IF NOT EXISTS incorporation_workplace_amount INTEGER DEFAULT 0, -- Valor incorporación en lugar trabajo
ADD COLUMN IF NOT EXISTS sick_leave_days INTEGER DEFAULT 0, -- Días de licencia médica
ADD COLUMN IF NOT EXISTS sick_leave_start_date DATE, -- Inicio licencia médica
ADD COLUMN IF NOT EXISTS sick_leave_end_date DATE,   -- Fin licencia médica
ADD COLUMN IF NOT EXISTS sick_leave_amount INTEGER DEFAULT 0, -- Monto subsidio licencia
ADD COLUMN IF NOT EXISTS vacation_days INTEGER DEFAULT 0, -- Días de vacaciones
ADD COLUMN IF NOT EXISTS vacation_amount INTEGER DEFAULT 0, -- Monto vacaciones
ADD COLUMN IF NOT EXISTS partial_period_reason VARCHAR(100), -- Razón del período parcial
ADD COLUMN IF NOT EXISTS previred_notes TEXT, -- Notas adicionales para Previred
ADD COLUMN IF NOT EXISTS movement_code VARCHAR(10) DEFAULT '0', -- Código movimiento personal Previred
ADD COLUMN IF NOT EXISTS worker_type_code VARCHAR(10) DEFAULT '0', -- Tipo trabajador Previred
ADD COLUMN IF NOT EXISTS has_special_regime BOOLEAN DEFAULT false; -- Régimen especial

-- Crear tabla para movimientos de personal específicos de Previred
CREATE TABLE IF NOT EXISTS previred_personnel_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidation_id UUID NOT NULL REFERENCES payroll_liquidations(id) ON DELETE CASCADE,
    
    -- Códigos oficiales Previred
    movement_code VARCHAR(10) NOT NULL, -- Código movimiento (01=Ingreso, 02=Egreso, etc.)
    movement_description VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Valores asociados al movimiento
    affected_amount INTEGER DEFAULT 0,
    days_affected INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para conceptos específicos de Previred (pre-configurados)
CREATE TABLE IF NOT EXISTS previred_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    concept_code VARCHAR(20) NOT NULL, -- Código interno del concepto
    concept_name VARCHAR(100) NOT NULL,
    concept_description TEXT,
    
    -- Configuración del concepto
    is_taxable BOOLEAN DEFAULT true,
    affects_afp BOOLEAN DEFAULT true,
    affects_health BOOLEAN DEFAULT true,
    affects_unemployment BOOLEAN DEFAULT true,
    
    -- Para cálculos automáticos
    calculation_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed', 'percentage', 'days'
    percentage_rate DECIMAL(5,2) DEFAULT 0,
    fixed_amount INTEGER DEFAULT 0,
    
    -- Control
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, concept_code)
);

-- Insertar conceptos típicos de Previred para períodos parciales
INSERT INTO previred_concepts (
    company_id, 
    concept_code, 
    concept_name, 
    concept_description,
    is_taxable,
    affects_afp,
    affects_health,
    affects_unemployment,
    calculation_type
) VALUES 
-- Usar company_id por defecto para demo (reemplazar por empresa real)
(
    '8033ee69-b420-4d91-ba0e-482f46cd6fce', 
    'INCORP_WORKPLACE', 
    'Incorporación en lugar de trabajo',
    'Valor proporcional por incorporación durante el período laboral',
    true, true, true, true, 'days'
),
(
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'SICK_LEAVE_SUBSIDY',
    'Subsidio licencia médica',
    'Subsidio por días de licencia médica del trabajador',
    true, false, false, false, 'days'
),
(
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'VACATION_BONUS',
    'Bono vacaciones proporcional',
    'Pago proporcional de vacaciones por período parcial',
    true, true, true, true, 'days'
),
(
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'PARTIAL_MONTH_ADJUST',
    'Ajuste mes parcial',
    'Ajuste de remuneración por mes parcial trabajado',
    true, true, true, true, 'percentage'
);

-- Crear función para calcular valores proporcionales automáticamente
CREATE OR REPLACE FUNCTION calculate_proportional_amount(
    base_amount INTEGER,
    days_worked INTEGER,
    total_days INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
BEGIN
    IF total_days = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(base_amount * days_worked::DECIMAL / total_days::DECIMAL);
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener conceptos Previred por empresa
CREATE OR REPLACE FUNCTION get_previred_concepts_by_company(company_uuid UUID)
RETURNS TABLE (
    concept_code VARCHAR,
    concept_name VARCHAR,
    concept_description TEXT,
    is_taxable BOOLEAN,
    calculation_type VARCHAR,
    percentage_rate DECIMAL,
    fixed_amount INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.concept_code,
        pc.concept_name,
        pc.concept_description,
        pc.is_taxable,
        pc.calculation_type,
        pc.percentage_rate,
        pc.fixed_amount
    FROM previred_concepts pc
    WHERE pc.company_id = company_uuid 
      AND pc.is_active = true
    ORDER BY pc.concept_name;
END;
$$ LANGUAGE plpgsql;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_previred_movements_liquidation 
ON previred_personnel_movements(liquidation_id);

CREATE INDEX IF NOT EXISTS idx_previred_concepts_company 
ON previred_concepts(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_liquidations_partial_period 
ON payroll_liquidations(days_worked) WHERE days_worked < 30;

-- Comentarios para documentación
COMMENT ON COLUMN payroll_liquidations.incorporation_workplace_amount IS 'Monto por incorporación en lugar de trabajo cuando no se trabajan 30 días completos';
COMMENT ON COLUMN payroll_liquidations.sick_leave_days IS 'Días de licencia médica en el período';
COMMENT ON COLUMN payroll_liquidations.partial_period_reason IS 'Razón por la cual el período no es completo (ingreso, egreso, licencia, etc.)';
COMMENT ON TABLE previred_personnel_movements IS 'Movimientos de personal específicos para reporte Previred';
COMMENT ON TABLE previred_concepts IS 'Conceptos pre-configurados para casos especiales de Previred';