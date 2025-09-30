-- =====================================================
-- MÓDULO LIBRO DE REMUNERACIONES ELECTRÓNICO
-- Basado en estructura real FUDE UMAG
-- =====================================================

-- 1. Tabla principal del libro de remuneraciones (por período)
CREATE TABLE IF NOT EXISTS payroll_books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del período
    period VARCHAR(7) NOT NULL, -- YYYY-MM (ej: 2025-06)
    book_number INTEGER NOT NULL, -- Número correlativo del libro
    
    -- Metadatos del libro
    company_name VARCHAR(255) NOT NULL,
    company_rut VARCHAR(12) NOT NULL,
    generation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    
    -- Estado y control
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'locked', 'archived')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    
    -- Resumen totales
    total_employees INTEGER DEFAULT 0,
    total_haberes DECIMAL(15,2) DEFAULT 0,
    total_descuentos DECIMAL(15,2) DEFAULT 0,
    total_liquido DECIMAL(15,2) DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, period, book_number)
);

-- 2. Detalle de empleados en el libro (una fila por empleado por período)
CREATE TABLE IF NOT EXISTS payroll_book_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_book_id UUID NOT NULL REFERENCES payroll_books(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    -- Información básica del empleado (snapshot del período)
    employee_rut VARCHAR(12) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    nombres VARCHAR(200) NOT NULL,
    cargo VARCHAR(200),
    area VARCHAR(200),
    centro_costo VARCHAR(200),
    
    -- Información laboral del período
    dias_trabajados INTEGER DEFAULT 30,
    horas_semanales DECIMAL(4,2),
    horas_no_trabajadas DECIMAL(6,2) DEFAULT 0,
    
    -- Bases imponibles
    base_imp_prevision DECIMAL(12,2) NOT NULL,
    base_imp_cesantia DECIMAL(12,2) NOT NULL,
    
    -- HABERES DETALLADOS
    sueldo_base DECIMAL(12,2) DEFAULT 0,
    aporte_asistencia DECIMAL(12,2) DEFAULT 0,
    horas_extras DECIMAL(12,2) DEFAULT 0,
    asignacion_familiar DECIMAL(12,2) DEFAULT 0,
    asignacion_antiguedad DECIMAL(12,2) DEFAULT 0,
    asignacion_perdida_caja DECIMAL(12,2) DEFAULT 0,
    asignacion_tramo DECIMAL(12,2) DEFAULT 0,
    asignacion_zona DECIMAL(12,2) DEFAULT 0,
    asignacion_responsabilidad_directiva DECIMAL(12,2) DEFAULT 0,
    
    -- Bonos específicos
    bono_compensatorio DECIMAL(12,2) DEFAULT 0,
    bono_asesoria_centro_alumno DECIMAL(12,2) DEFAULT 0,
    bono_responsabilidad DECIMAL(12,2) DEFAULT 0,
    bono_leumag DECIMAL(12,2) DEFAULT 0,
    bono_nocturno DECIMAL(12,2) DEFAULT 0,
    bono_cargo DECIMAL(12,2) DEFAULT 0,
    bono_desempeno DECIMAL(12,2) DEFAULT 0,
    brp DECIMAL(12,2) DEFAULT 0,
    brp_mencion DECIMAL(12,2) DEFAULT 0,
    
    -- Otros haberes
    colacion DECIMAL(12,2) DEFAULT 0,
    gratificacion_mensual DECIMAL(12,2) DEFAULT 0,
    ley_19464 DECIMAL(12,2) DEFAULT 0,
    movilizacion DECIMAL(12,2) DEFAULT 0,
    otros_haberes_imponibles DECIMAL(12,2) DEFAULT 0,
    planilla_suplementaria DECIMAL(12,2) DEFAULT 0,
    
    -- TOTAL HABERES
    total_haberes DECIMAL(12,2) NOT NULL,
    
    -- DESCUENTOS LEGALES
    prevision_afp DECIMAL(12,2) DEFAULT 0,
    apv DECIMAL(12,2) DEFAULT 0,
    salud DECIMAL(12,2) DEFAULT 0,
    salud_voluntaria DECIMAL(12,2) DEFAULT 0,
    cesantia DECIMAL(12,2) DEFAULT 0,
    impuesto_unico DECIMAL(12,2) DEFAULT 0,
    
    -- DESCUENTOS VOLUNTARIOS Y OTROS
    cuenta_2 DECIMAL(12,2) DEFAULT 0,
    sobregiro_desc DECIMAL(12,2) DEFAULT 0,
    acciones_coopeuch DECIMAL(12,2) DEFAULT 0,
    agrupacion_aluen DECIMAL(12,2) DEFAULT 0,
    ahorro_coopeuch DECIMAL(12,2) DEFAULT 0,
    aporte_jornadas DECIMAL(12,2) DEFAULT 0,
    comite_solidaridad DECIMAL(12,2) DEFAULT 0,
    credito_coopeuch DECIMAL(12,2) DEFAULT 0,
    cuenta_2_pesos DECIMAL(12,2) DEFAULT 0,
    cuota_sindical DECIMAL(12,2) DEFAULT 0,
    descuento_optica DECIMAL(12,2) DEFAULT 0,
    falp DECIMAL(12,2) DEFAULT 0,
    mutual_seguros DECIMAL(12,2) DEFAULT 0,
    prestamo_empresa DECIMAL(12,2) DEFAULT 0,
    proteger DECIMAL(12,2) DEFAULT 0,
    retencion_3_prestamo_solidario DECIMAL(12,2) DEFAULT 0,
    seguro_complementario DECIMAL(12,2) DEFAULT 0,
    credito_personal_caja_andes DECIMAL(12,2) DEFAULT 0,
    leasing_ahorro_caja_andes DECIMAL(12,2) DEFAULT 0,
    seguro_vida_caja_andes DECIMAL(12,2) DEFAULT 0,
    
    -- TOTALES FINALES
    total_descuentos DECIMAL(12,2) NOT NULL,
    sueldo_liquido DECIMAL(12,2) NOT NULL,
    sobregiro DECIMAL(12,2) DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(payroll_book_id, employee_id)
);

-- 3. Tabla de configuración de haberes y descuentos por empresa
CREATE TABLE IF NOT EXISTS payroll_item_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Clasificación
    item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('haber', 'descuento')),
    category VARCHAR(50) NOT NULL, -- legal, voluntario, bono, asignacion
    
    -- Información del item
    code VARCHAR(20) NOT NULL, -- Código interno
    name VARCHAR(100) NOT NULL, -- Nombre para mostrar
    description TEXT,
    
    -- Propiedades contables
    is_taxable BOOLEAN DEFAULT true, -- Afecto a impuesto único
    is_imponible BOOLEAN DEFAULT true, -- Afecto a AFP/Salud
    is_gratifiable BOOLEAN DEFAULT true, -- Se considera para gratificación
    
    -- Configuración para cálculos
    calculation_type VARCHAR(20) DEFAULT 'fixed', -- fixed, percentage, formula
    default_value DECIMAL(12,2) DEFAULT 0,
    percentage DECIMAL(5,2), -- Para cálculos porcentuales
    formula TEXT, -- Para cálculos complejos
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, code)
);

-- 4. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_books_company_period ON payroll_books(company_id, period);
CREATE INDEX IF NOT EXISTS idx_payroll_books_status ON payroll_books(status);
CREATE INDEX IF NOT EXISTS idx_payroll_book_details_book ON payroll_book_details(payroll_book_id);
CREATE INDEX IF NOT EXISTS idx_payroll_book_details_employee ON payroll_book_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_catalog_company ON payroll_item_catalog(company_id, item_type);

-- 5. Triggers para actualización automática
CREATE OR REPLACE FUNCTION update_payroll_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_books_updated_at
    BEFORE UPDATE ON payroll_books
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_books_updated_at();

CREATE TRIGGER update_payroll_book_details_updated_at
    BEFORE UPDATE ON payroll_book_details
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_books_updated_at();

-- 6. Función para generar libro de remuneraciones
CREATE OR REPLACE FUNCTION generate_payroll_book(
    p_company_id UUID,
    p_period VARCHAR(7),
    p_company_name VARCHAR(255),
    p_company_rut VARCHAR(12),
    p_generated_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_book_id UUID;
    v_book_number INTEGER;
    v_employee_record RECORD;
    v_total_employees INTEGER := 0;
    v_total_haberes DECIMAL(15,2) := 0;
    v_total_descuentos DECIMAL(15,2) := 0;
    v_total_liquido DECIMAL(15,2) := 0;
BEGIN
    -- Obtener siguiente número de libro
    SELECT COALESCE(MAX(book_number), 0) + 1 INTO v_book_number
    FROM payroll_books
    WHERE company_id = p_company_id
      AND EXTRACT(YEAR FROM TO_DATE(period || '-01', 'YYYY-MM-DD')) = EXTRACT(YEAR FROM TO_DATE(p_period || '-01', 'YYYY-MM-DD'));
    
    -- Crear libro de remuneraciones
    INSERT INTO payroll_books (
        company_id, period, book_number, company_name, company_rut, generated_by
    ) VALUES (
        p_company_id, p_period, v_book_number, p_company_name, p_company_rut, p_generated_by
    ) RETURNING id INTO v_book_id;
    
    -- Agregar empleados con liquidaciones del período
    FOR v_employee_record IN
        SELECT 
            e.id as employee_id,
            e.rut as employee_rut,
            e.last_name as apellido_paterno,
            e.middle_name as apellido_materno,
            e.first_name as nombres,
            ec.position as cargo,
            ec.department as area,
            'GENERAL' as centro_costo, -- Valor por defecto
            ec.weekly_hours as horas_semanales,
            COALESCE(pd.worked_days, 30) as dias_trabajados,
            COALESCE(pd.gross_income, ec.base_salary * 1.25) as total_haberes,
            COALESCE(pd.total_deductions, ec.base_salary * 0.20) as total_descuentos,
            COALESCE(pd.net_income, ec.base_salary * 1.05) as sueldo_liquido,
            ec.base_salary as sueldo_base
        FROM employees e
        LEFT JOIN employment_contracts ec ON e.id = ec.employee_id AND ec.status = 'active'
        LEFT JOIN payroll_documents pd ON e.id = pd.employee_id AND pd.period = p_period AND pd.document_type = 'liquidacion'
        WHERE e.company_id = p_company_id
          AND e.status = 'active'
        ORDER BY e.last_name, e.first_name
    LOOP
        -- Insertar detalle del empleado
        INSERT INTO payroll_book_details (
            payroll_book_id,
            employee_id,
            employee_rut,
            apellido_paterno,
            apellido_materno,
            nombres,
            cargo,
            area,
            centro_costo,
            dias_trabajados,
            horas_semanales,
            horas_no_trabajadas,
            base_imp_prevision,
            base_imp_cesantia,
            sueldo_base,
            total_haberes,
            total_descuentos,
            sueldo_liquido
        ) VALUES (
            v_book_id,
            v_employee_record.employee_id,
            v_employee_record.employee_rut,
            v_employee_record.apellido_paterno,
            v_employee_record.apellido_materno,
            v_employee_record.nombres,
            v_employee_record.cargo,
            v_employee_record.area,
            v_employee_record.centro_costo,
            v_employee_record.dias_trabajados,
            v_employee_record.horas_semanales,
            0, -- horas_no_trabajadas
            v_employee_record.total_haberes, -- base_imp_prevision
            v_employee_record.total_haberes, -- base_imp_cesantia
            v_employee_record.sueldo_base,
            v_employee_record.total_haberes,
            v_employee_record.total_descuentos,
            v_employee_record.sueldo_liquido
        );
        
        -- Acumular totales
        v_total_employees := v_total_employees + 1;
        v_total_haberes := v_total_haberes + v_employee_record.total_haberes;
        v_total_descuentos := v_total_descuentos + v_employee_record.total_descuentos;
        v_total_liquido := v_total_liquido + v_employee_record.sueldo_liquido;
    END LOOP;
    
    -- Actualizar totales en el libro
    UPDATE payroll_books SET
        total_employees = v_total_employees,
        total_haberes = v_total_haberes,
        total_descuentos = v_total_descuentos,
        total_liquido = v_total_liquido
    WHERE id = v_book_id;
    
    RETURN v_book_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar catálogo inicial de haberes y descuentos (basado en tu archivo)
INSERT INTO payroll_item_catalog (company_id, item_type, category, code, name, is_taxable, is_imponible, display_order) VALUES
-- Seleccionar empresa demo
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'base', 'SUELDO_BASE', 'Sueldo Base', true, true, 1),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'asignacion', 'ASIG_FAMILIAR', 'Asignación Familiar', false, false, 10),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'asignacion', 'ASIG_ANTIGUEDAD', 'Asignación de Antigüedad', true, true, 11),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'asignacion', 'ASIG_ZONA', 'Asignación de Zona', true, true, 12),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'bono', 'BONO_COMPENSATORIO', 'Bono Compensatorio', true, true, 20),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'bono', 'BONO_RESPONSABILIDAD', 'Bono de Responsabilidad', true, true, 21),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'otros', 'GRATIFICACION', 'Gratificación Mensual', true, true, 30),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'otros', 'HORAS_EXTRAS', 'Horas Extras', true, true, 31),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'otros', 'MOVILIZACION', 'Movilización', false, false, 32),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'haber', 'otros', 'COLACION', 'Colación', false, false, 33),

-- Descuentos legales
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'legal', 'AFP', 'Previsión AFP', false, false, 50),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'legal', 'SALUD', 'Salud', false, false, 51),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'legal', 'CESANTIA', 'Seguro Cesantía', false, false, 52),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'legal', 'IMPUESTO_UNICO', 'Impuesto Único', false, false, 53),

-- Descuentos voluntarios
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'voluntario', 'APV', 'APV', false, false, 60),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'voluntario', 'COOPEUCH', 'Crédito Coopeuch', false, false, 61),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'voluntario', 'CUOTA_SINDICAL', 'Cuota Sindical', false, false, 62),
('8033ee69-b420-4d91-ba0e-482f46cd6fce', 'descuento', 'voluntario', 'PRESTAMO_EMPRESA', 'Préstamo de Empresa', false, false, 63)
ON CONFLICT (company_id, code) DO NOTHING;

-- 8. Comentarios para documentación
COMMENT ON TABLE payroll_books IS 'Libros de remuneraciones por período - cabecera';
COMMENT ON TABLE payroll_book_details IS 'Detalle de empleados en libro de remuneraciones - replica estructura FUDE UMAG';
COMMENT ON TABLE payroll_item_catalog IS 'Catálogo de haberes y descuentos configurables por empresa';
COMMENT ON FUNCTION generate_payroll_book IS 'Genera libro de remuneraciones completo para un período específico';

-- 9. Vista para exportar libro en formato CSV/Excel
CREATE OR REPLACE VIEW v_payroll_book_export AS
SELECT 
    pb.company_name,
    pb.company_rut,
    pb.period,
    pb.generation_date,
    
    -- Información del empleado
    pbd.employee_rut as "RUT",
    pbd.apellido_paterno as "AP PATERNO",
    pbd.apellido_materno as "AP MATERNO", 
    pbd.nombres as "NOMBRES",
    pbd.cargo as "CARGO",
    pbd.area as "AREA",
    pbd.centro_costo as "CENTRO COSTO",
    pbd.dias_trabajados as "DÍAS TRABAJADOS",
    pbd.horas_semanales as "HORAS SEMANALES",
    pbd.horas_no_trabajadas as "HORAS NO TRABAJADAS",
    
    -- Bases imponibles
    pbd.base_imp_prevision as "BASE IMP. PREVISIÓN",
    pbd.base_imp_cesantia as "BASE IMP. CESANTÍA",
    
    -- Haberes detallados (siguiendo estructura original)
    pbd.sueldo_base as "SUELDO BASE",
    pbd.aporte_asistencia as "APORTE ASISTENCIA",
    pbd.horas_extras as "HORAS EXTRAS",
    pbd.asignacion_familiar as "ASIGNACIÓN FAMILIAR",
    pbd.asignacion_antiguedad as "ASIGNACION DE ANTIGUEDAD",
    pbd.asignacion_perdida_caja as "ASIGNACION DE PERDIDA DE CAJA",
    pbd.asignacion_tramo as "ASIGNACION DE TRAMO",
    pbd.asignacion_zona as "ASIGNACIÓN DE ZONA",
    pbd.asignacion_responsabilidad_directiva as "ASIGNACION RESPONSABILIDAD DIRECTIVA",
    pbd.bono_compensatorio as "BONO COMPENSATORIO",
    pbd.bono_asesoria_centro_alumno as "BONO DE ASESORIA CENTRO DE ALUMNO",
    pbd.bono_responsabilidad as "BONO DE RESPONSABILIDAD",
    pbd.bono_leumag as "BONO LEUMAG",
    pbd.bono_nocturno as "BONO NOCTURNO",
    pbd.bono_cargo as "BONO POR CARGO",
    pbd.bono_desempeno as "BONO POR DESEMPEÑO",
    pbd.brp as "B.R.P",
    pbd.brp_mencion as "B.R.P MENCION",
    pbd.colacion as "COLACIÓN",
    pbd.gratificacion_mensual as "GRATIFICACION MENSUAL",
    pbd.ley_19464 as "LEY 19464",
    pbd.movilizacion as "MOVILIZACIÓN",
    pbd.otros_haberes_imponibles as "OTROS HABERES IMPONIBLES Y TRIBUTABLES",
    pbd.planilla_suplementaria as "PLANILLA SUPLEMENTARIA",
    pbd.total_haberes as "TOTAL HABERES",
    
    -- Descuentos detallados
    pbd.prevision_afp as "PREVIS",
    pbd.apv as "APV",
    pbd.salud as "SALUD",
    pbd.salud_voluntaria as "SALUD VOLUNTARIA",
    pbd.cesantia as "CESANTÍA",
    pbd.impuesto_unico as "IMPUESTO",
    pbd.cuenta_2 as "CUENTA_2",
    pbd.sobregiro_desc as "SOBREGIRO DESC.",
    pbd.acciones_coopeuch as "ACCIONES COOPEUCH",
    pbd.agrupacion_aluen as "AGRUPACION ALUEN",
    pbd.ahorro_coopeuch as "AHORRO COOPEUCH",
    pbd.aporte_jornadas as "APORTE JORNADAS",
    pbd.comite_solidaridad as "COMITE SOLIDARIDAD",
    pbd.credito_coopeuch as "CREDITO COOPEUCH",
    pbd.cuenta_2_pesos as "CUENTA 2 PESOS",
    pbd.cuota_sindical as "CUOTA SINDICAL",
    pbd.descuento_optica as "DESCUENTO OPTICA",
    pbd.falp as "FALP",
    pbd.mutual_seguros as "MUTUAL DE SEGUROS",
    pbd.prestamo_empresa as "PRÉSTAMO DE EMPRESA",
    pbd.proteger as "PROTEGER",
    pbd.retencion_3_prestamo_solidario as "RETENCION 3% PRESTAMO SOLIDARIO",
    pbd.seguro_complementario as "SEGURO COMPLEMENTARIO",
    pbd.credito_personal_caja_andes as "CRÉDITO PERSONAL CAJA LOS ANDES",
    pbd.leasing_ahorro_caja_andes as "LEASING (AHORRO) CAJA LOS ANDES",
    pbd.seguro_vida_caja_andes as "SEGURO DE VIDA CAJA LOS ANDES",
    pbd.total_descuentos as "TOTAL DESCUENTOS",
    pbd.sueldo_liquido as "SUELDO LÍQUIDO",
    pbd.sobregiro as "SOBREGIRO"
    
FROM payroll_books pb
JOIN payroll_book_details pbd ON pb.id = pbd.payroll_book_id
ORDER BY pb.period DESC, pbd.apellido_paterno, pbd.nombres;