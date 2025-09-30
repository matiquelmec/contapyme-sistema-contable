-- =====================================================
-- MIGRACIÓN SEGURA: Agregar campos para generación de contratos (CORREGIDA)
-- Fecha: 2025-08-13
-- Descripción: Agrega campos necesarios para generar contratos laborales completos
-- sin afectar funcionalidades existentes - Versión corregida con campos reales
-- =====================================================

-- =====================================================
-- PASO 1: AGREGAR CAMPOS A TABLA COMPANIES
-- =====================================================

-- Agregar información del representante legal y dirección fiscal
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS legal_representative_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS legal_representative_rut VARCHAR(20),
ADD COLUMN IF NOT EXISTS fiscal_address TEXT,
ADD COLUMN IF NOT EXISTS fiscal_city VARCHAR(100) DEFAULT 'Punta Arenas';

-- Actualizar empresa demo con datos de ejemplo
UPDATE companies 
SET 
    legal_representative_name = 'María Magdalena Añasco Cifuentes',
    legal_representative_rut = '13.692.973-9',
    fiscal_address = 'Roberto Carvajal N° 0881',
    fiscal_city = 'Punta Arenas'
WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- =====================================================
-- PASO 2: AGREGAR CAMPOS A TABLA EMPLOYEES
-- =====================================================

-- Agregar información bancaria para depósito de sueldo
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('corriente', 'vista', 'ahorro')),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);

-- =====================================================
-- PASO 3: EXPANDIR TABLA EMPLOYMENT_CONTRACTS
-- =====================================================

-- Agregar campos para detalles del contrato
ALTER TABLE employment_contracts
ADD COLUMN IF NOT EXISTS workplace_address TEXT,
ADD COLUMN IF NOT EXISTS schedule_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS job_functions TEXT[],
ADD COLUMN IF NOT EXISTS obligations TEXT[],
ADD COLUMN IF NOT EXISTS prohibitions TEXT[],
ADD COLUMN IF NOT EXISTS gratification_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonuses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS resignation_notice_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS total_gross_salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_liquid_salary DECIMAL(10,2);

-- Agregar comentarios descriptivos
COMMENT ON COLUMN employment_contracts.workplace_address IS 'Dirección específica del lugar de trabajo';
COMMENT ON COLUMN employment_contracts.schedule_details IS 'JSON con horarios: {entry, exit, lunch_start, lunch_end, days}';
COMMENT ON COLUMN employment_contracts.job_functions IS 'Array de funciones específicas del cargo';
COMMENT ON COLUMN employment_contracts.obligations IS 'Array de obligaciones del trabajador';
COMMENT ON COLUMN employment_contracts.prohibitions IS 'Array de prohibiciones del trabajador';
COMMENT ON COLUMN employment_contracts.bonuses IS 'JSON array de bonos: [{type, amount, description}]';
COMMENT ON COLUMN employment_contracts.allowances IS 'JSON de asignaciones: {meal, transport, cash, other}';

-- =====================================================
-- PASO 4: CREAR TABLA DE PLANTILLAS DE CONTRATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de la plantilla
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- indefinido, plazo_fijo, por_obra, part_time
    position_category VARCHAR(100), -- ventas, administracion, operaciones, etc
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Contenido de la plantilla
    job_functions TEXT[],
    obligations TEXT[],
    prohibitions TEXT[],
    standard_bonuses JSONB DEFAULT '[]',
    standard_allowances JSONB DEFAULT '{}',
    resignation_notice_days INTEGER DEFAULT 30,
    
    -- Cláusulas adicionales
    additional_clauses TEXT[],
    special_conditions TEXT,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    CONSTRAINT unique_template_name_company UNIQUE (template_name, company_id)
);

-- Índices para plantillas
CREATE INDEX IF NOT EXISTS idx_contract_templates_company ON contract_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(is_active);

-- =====================================================
-- PASO 5: CREAR PLANTILLA DE EJEMPLO
-- =====================================================

INSERT INTO contract_templates (
    company_id,
    template_name,
    template_type,
    position_category,
    is_default,
    job_functions,
    obligations,
    prohibitions,
    standard_bonuses,
    standard_allowances,
    resignation_notice_days
) VALUES (
    '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    'Contrato Vendedor Part-Time',
    'plazo_fijo',
    'ventas',
    true,
    ARRAY[
        'Recibir y saludar cordialmente a los clientes',
        'Identificar las necesidades del cliente',
        'Brindar asesoramiento técnico sobre los productos',
        'Registrar los productos en el sistema de punto de venta',
        'Cobrar en efectivo, tarjetas o transferencias',
        'Entregar boleta o factura según requerimiento',
        'Realizar arqueos de caja',
        'Mantener el orden y limpieza del área de trabajo'
    ],
    ARRAY[
        'Cumplir íntegramente la jornada de trabajo establecida',
        'Acatar las órdenes e instrucciones del empleador',
        'Respetar al empleador, jefes, compañeros y clientes',
        'Velar por los intereses del empleador',
        'Cumplir todas las labores inherentes al cargo'
    ],
    ARRAY[
        'Consumir bebidas alcohólicas o drogas durante el trabajo',
        'Ejecutar actividades ajenas a su labor en horario laboral',
        'Ingresar personas ajenas durante el horario laboral',
        'Divulgar información confidencial de la empresa',
        'Usar recursos de la empresa para fines personales'
    ],
    '[{"type": "responsabilidad", "amount": 120000, "description": "Bono por responsabilidad"}]'::jsonb,
    '{"meal": 50000, "transport": 50000, "cash": 44500}'::jsonb,
    30
) ON CONFLICT (template_name, company_id) DO NOTHING;

-- =====================================================
-- PASO 6: CREAR FUNCIÓN PARA CALCULAR SALARIOS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_contract_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular salario bruto total
    NEW.total_gross_salary = COALESCE(NEW.base_salary, 0) + 
                             COALESCE(NEW.gratification_amount, 0);
    
    -- Agregar bonos al total bruto
    IF NEW.bonuses IS NOT NULL AND jsonb_array_length(NEW.bonuses) > 0 THEN
        NEW.total_gross_salary = NEW.total_gross_salary + 
            COALESCE((SELECT SUM((bonus->>'amount')::decimal) FROM jsonb_array_elements(NEW.bonuses) AS bonus), 0);
    END IF;
    
    -- Por ahora el líquido es igual al bruto (se ajustará con cálculos de AFP, salud, etc)
    NEW.total_liquid_salary = NEW.total_gross_salary;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para calcular totales automáticamente (solo si no existe)
DO $$
BEGIN
    -- Verificar si el trigger ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'calculate_contract_totals_trigger' 
        AND tgrelid = 'employment_contracts'::regclass
    ) THEN
        CREATE TRIGGER calculate_contract_totals_trigger
        BEFORE INSERT OR UPDATE ON employment_contracts
        FOR EACH ROW
        EXECUTE FUNCTION calculate_contract_totals();
    END IF;
END $$;

-- =====================================================
-- PASO 7: CREAR VISTA PARA CONTRATOS COMPLETOS (CORREGIDA)
-- =====================================================

-- Primero eliminar la vista si existe
DROP VIEW IF EXISTS contract_full_details;

-- Crear vista con campos que realmente existen
CREATE OR REPLACE VIEW contract_full_details AS
SELECT 
    ec.*,
    e.rut as employee_rut,
    e.first_name || ' ' || COALESCE(e.middle_name || ' ', '') || e.last_name as employee_full_name,
    e.birth_date as employee_birth_date,
    e.nationality as employee_nationality,
    e.marital_status as employee_marital_status,
    e.address as employee_address,
    e.city as employee_city,
    e.email as employee_email,
    e.phone as employee_phone,
    e.bank_name,
    e.bank_account_type,
    e.bank_account_number,
    c.name as company_name,
    c.rut as company_rut,
    c.legal_representative_name,
    c.legal_representative_rut,
    c.fiscal_address as company_address,
    c.fiscal_city as company_city,
    -- Campos de payroll_config que existen según las migraciones
    CASE 
        WHEN pc.afp_name IS NOT NULL THEN pc.afp_name
        WHEN pc.afp_code IS NOT NULL THEN pc.afp_code
        ELSE 'AFP Modelo'
    END as afp_name,
    CASE 
        WHEN pc.health_provider IS NOT NULL THEN pc.health_provider
        WHEN pc.health_institution_code IS NOT NULL THEN pc.health_institution_code
        WHEN pc.health_system IS NOT NULL THEN pc.health_system
        ELSE 'Fonasa'
    END as health_insurance_name,
    CASE 
        WHEN pc.health_system IS NOT NULL THEN pc.health_system
        WHEN pc.health_institution_code IS NOT NULL THEN 
            CASE WHEN pc.health_institution_code = 'FONASA' THEN 'fonasa' ELSE 'isapre' END
        ELSE 'fonasa'
    END as health_insurance_type
FROM employment_contracts ec
INNER JOIN employees e ON ec.employee_id = e.id
INNER JOIN companies c ON ec.company_id = c.id
LEFT JOIN payroll_config pc ON e.id = pc.employee_id
ORDER BY ec.created_at DESC;

-- =====================================================
-- PASO 8: AGREGAR POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Políticas para contract_templates
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Crear política solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contract_templates' 
        AND policyname = 'Contract templates visible for company'
    ) THEN
        CREATE POLICY "Contract templates visible for company" ON contract_templates
            FOR ALL USING (company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce');
    END IF;
END $$;

-- =====================================================
-- PASO 9: FUNCIÓN PARA GENERAR CONTRATO DESDE PLANTILLA
-- =====================================================

CREATE OR REPLACE FUNCTION generate_contract_from_template(
    p_employee_id UUID,
    p_template_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_base_salary DECIMAL,
    p_custom_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_contract_id UUID;
    v_template RECORD;
    v_employee RECORD;
BEGIN
    -- Obtener datos de la plantilla
    SELECT * INTO v_template FROM contract_templates WHERE id = p_template_id;
    
    -- Obtener datos del empleado
    SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
    
    -- Crear el contrato basado en la plantilla
    INSERT INTO employment_contracts (
        employee_id,
        company_id,
        contract_type,
        position,
        start_date,
        end_date,
        base_salary,
        job_functions,
        obligations,
        prohibitions,
        bonuses,
        allowances,
        resignation_notice_days,
        status
    ) VALUES (
        p_employee_id,
        v_employee.company_id,
        v_template.template_type,
        COALESCE(p_custom_data->>'position', 'Empleado'),
        p_start_date,
        p_end_date,
        p_base_salary,
        v_template.job_functions,
        v_template.obligations,
        v_template.prohibitions,
        v_template.standard_bonuses,
        v_template.standard_allowances,
        v_template.resignation_notice_days,
        'draft'
    ) RETURNING id INTO v_contract_id;
    
    RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 'Migración de campos de contratos completada exitosamente - Versión corregida' as status;

-- Verificar que las columnas se agregaron correctamente
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('companies', 'employees', 'employment_contracts', 'contract_templates')
    AND column_name IN (
        'legal_representative_name', 'legal_representative_rut', 'fiscal_address',
        'bank_name', 'bank_account_type', 'bank_account_number',
        'workplace_address', 'schedule_details', 'job_functions',
        'bonuses', 'allowances', 'template_name'
    )
ORDER BY table_name, ordinal_position;