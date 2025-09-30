-- =====================================================
-- MIGRACIÓN SIMPLE: Solo agregar campos para contratos
-- Fecha: 2025-08-13
-- Descripción: Agrega solo los campos esenciales sin crear vistas problemáticas
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

-- =====================================================
-- PASO 2: AGREGAR CAMPOS A TABLA EMPLOYEES
-- =====================================================

-- Agregar información bancaria para depósito de sueldo
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(20),
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

-- =====================================================
-- PASO 4: CREAR TABLA DE PLANTILLAS DE CONTRATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de la plantilla
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    position_category VARCHAR(100),
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

-- =====================================================
-- PASO 5: CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_contract_templates_company ON contract_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(is_active);

-- =====================================================
-- PASO 6: INSERTAR PLANTILLA DE EJEMPLO
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
-- PASO 7: ACTUALIZAR EMPRESA DEMO
-- =====================================================

UPDATE companies 
SET 
    legal_representative_name = 'María Magdalena Añasco Cifuentes',
    legal_representative_rut = '13.692.973-9',
    fiscal_address = 'Roberto Carvajal N° 0881',
    fiscal_city = 'Punta Arenas'
WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- =====================================================
-- PASO 8: HABILITAR RLS PARA TEMPLATES
-- =====================================================

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
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 'Migración simple de campos de contratos completada exitosamente' as status;

-- Verificar que las columnas se agregaron correctamente
SELECT 
    'companies' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name IN ('legal_representative_name', 'legal_representative_rut', 'fiscal_address')
UNION ALL
SELECT 
    'employees' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name IN ('bank_name', 'bank_account_type', 'bank_account_number')
UNION ALL
SELECT 
    'employment_contracts' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'employment_contracts'
    AND column_name IN ('workplace_address', 'schedule_details', 'job_functions', 'bonuses', 'allowances')
ORDER BY table_name, column_name;