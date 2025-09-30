-- ===============================================
-- SISTEMA DE MODIFICACIONES CONTRACTUALES AUTOMÁTICAS
-- Fecha: 27 de agosto, 2025
-- Funcionalidad: Tracking automático de cambios contractuales con aplicación por período
-- ===============================================

-- Tabla para tracking de todas las modificaciones contractuales
CREATE TABLE contract_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Tipo de modificación
    modification_type VARCHAR(50) NOT NULL CHECK (modification_type IN (
        'salary_change',        -- Cambio de sueldo base
        'hours_change',         -- Modificación horaria (anexo)
        'contract_type_change', -- Plazo fijo ↔ Indefinido
        'position_change',      -- Cambio de cargo
        'department_change',    -- Cambio de departamento
        'benefits_change',      -- Cambio en beneficios
        'other'                 -- Otras modificaciones
    )),
    
    -- Fechas críticas
    effective_date DATE NOT NULL,              -- Fecha desde cuándo aplica la modificación
    created_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Fecha cuando se registró
    
    -- Valores antes y después del cambio (JSON flexible)
    old_values JSONB NOT NULL,                 -- Valores anteriores
    new_values JSONB NOT NULL,                 -- Valores nuevos
    
    -- Documentación y trazabilidad
    reason TEXT,                               -- Motivo de la modificación
    document_reference VARCHAR(100),           -- Referencia a anexo, resolución, etc.
    created_by UUID,                           -- Usuario que registró la modificación
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    INDEX idx_contract_modifications_employee_date (employee_id, effective_date),
    INDEX idx_contract_modifications_company (company_id),
    INDEX idx_contract_modifications_type (modification_type),
    INDEX idx_contract_modifications_effective_date (effective_date)
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_contract_modifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contract_modifications_updated_at
    BEFORE UPDATE ON contract_modifications
    FOR EACH ROW EXECUTE FUNCTION update_contract_modifications_updated_at();

-- ===============================================
-- FUNCIONES ESPECIALIZADAS PARA EL SISTEMA
-- ===============================================

-- Función para obtener el contrato vigente en una fecha específica
CREATE OR REPLACE FUNCTION get_contract_for_period(
    p_employee_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS TABLE (
    base_salary DECIMAL(12,2),
    weekly_hours INTEGER,
    contract_type VARCHAR(20),
    position VARCHAR(100),
    department VARCHAR(100),
    modifications_applied JSONB
) AS $$
DECLARE
    period_date DATE;
    base_contract RECORD;
    modification_record RECORD;
    result_salary DECIMAL(12,2);
    result_hours INTEGER;
    result_type VARCHAR(20);
    result_position VARCHAR(100);
    result_department VARCHAR(100);
    applied_mods JSONB := '[]';
BEGIN
    -- Calcular la fecha del período (primer día del mes)
    period_date := make_date(p_year, p_month, 1);
    
    -- Obtener el contrato base (employment_contracts actual)
    SELECT ec.base_salary, ec.weekly_hours, ec.contract_type, ec.position, ec.department
    INTO base_contract
    FROM employment_contracts ec
    WHERE ec.employee_id = p_employee_id
    AND ec.status = 'active'
    ORDER BY ec.created_at DESC
    LIMIT 1;
    
    -- Inicializar con valores base
    result_salary := base_contract.base_salary;
    result_hours := base_contract.weekly_hours;
    result_type := base_contract.contract_type;
    result_position := base_contract.position;
    result_department := base_contract.department;
    
    -- Aplicar modificaciones que estén vigentes para el período solicitado
    FOR modification_record IN 
        SELECT cm.modification_type, cm.old_values, cm.new_values, cm.effective_date, cm.reason
        FROM contract_modifications cm
        WHERE cm.employee_id = p_employee_id
        AND cm.effective_date <= period_date
        ORDER BY cm.effective_date ASC
    LOOP
        -- Aplicar modificación según tipo
        CASE modification_record.modification_type
            WHEN 'salary_change' THEN
                result_salary := (modification_record.new_values->>'base_salary')::DECIMAL(12,2);
            WHEN 'hours_change' THEN
                result_hours := (modification_record.new_values->>'weekly_hours')::INTEGER;
            WHEN 'contract_type_change' THEN
                result_type := modification_record.new_values->>'contract_type';
            WHEN 'position_change' THEN
                result_position := modification_record.new_values->>'position';
            WHEN 'department_change' THEN
                result_department := modification_record.new_values->>'department';
        END CASE;
        
        -- Registrar modificación aplicada
        applied_mods := applied_mods || jsonb_build_object(
            'type', modification_record.modification_type,
            'effective_date', modification_record.effective_date,
            'reason', modification_record.reason
        );
    END LOOP;
    
    -- Retornar resultado
    base_salary := result_salary;
    weekly_hours := result_hours;
    contract_type := result_type;
    position := result_position;
    department := result_department;
    modifications_applied := applied_mods;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un empleado debe pagar cesantía en un período
CREATE OR REPLACE FUNCTION should_pay_unemployment_insurance(
    p_employee_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    contract_info RECORD;
BEGIN
    -- Obtener información del contrato para el período
    SELECT contract_type 
    INTO contract_info
    FROM get_contract_for_period(p_employee_id, p_year, p_month);
    
    -- Regla: Solo contratos indefinidos pagan cesantía
    RETURN contract_info.contract_type = 'indefinido';
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el historial completo de modificaciones de un empleado
CREATE OR REPLACE FUNCTION get_employee_modification_history(p_employee_id UUID)
RETURNS TABLE (
    modification_date DATE,
    modification_type VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    document_reference VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.effective_date as modification_date,
        cm.modification_type,
        cm.old_values,
        cm.new_values,
        cm.reason,
        cm.document_reference
    FROM contract_modifications cm
    WHERE cm.employee_id = p_employee_id
    ORDER BY cm.effective_date DESC, cm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DATOS DE EJEMPLO PARA TESTING
-- ===============================================

-- Ejemplo: Francisco Mancilla cambió de 44h a 30h el 1 de Agosto (ya existente)
-- Este registro documenta que su contrato original tenía otra configuración

-- Comentarios para el usuario:
-- Este sistema permite:
-- 1. Registrar cualquier cambio contractual con fecha efectiva
-- 2. Aplicar automáticamente el contrato vigente según el período de liquidación  
-- 3. Detectar automáticamente cuándo aplicar cesantía (indefinidos)
-- 4. Mantener historial completo de modificaciones para auditorías
-- 5. Calcular liquidaciones con los valores correctos según el período

COMMENT ON TABLE contract_modifications IS 'Sistema de modificaciones contractuales automáticas - permite aplicar cambios según período de liquidación';
COMMENT ON FUNCTION get_contract_for_period IS 'Obtiene el contrato vigente para un empleado en un período específico, aplicando modificaciones históricas';
COMMENT ON FUNCTION should_pay_unemployment_insurance IS 'Determina si un empleado debe pagar cesantía según su tipo de contrato en el período';