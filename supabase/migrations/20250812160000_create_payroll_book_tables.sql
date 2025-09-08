-- Crear tablas para libro de remuneraciones
-- Migración para Supabase

-- Tabla principal del libro de remuneraciones
CREATE TABLE IF NOT EXISTS payroll_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    period VARCHAR(7) NOT NULL, -- formato YYYY-MM
    book_number INTEGER NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_rut VARCHAR(20) NOT NULL,
    generation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID, -- referencia a usuario que lo generó
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'final')),
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_haberes DECIMAL(12,2) DEFAULT 0,
    total_descuentos DECIMAL(12,2) DEFAULT 0,
    total_liquido DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint único por empresa y período
    UNIQUE(company_id, period)
);

-- Tabla de detalles del libro (un registro por empleado)
CREATE TABLE IF NOT EXISTS payroll_book_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_book_id UUID NOT NULL REFERENCES payroll_books(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    employee_rut VARCHAR(20) NOT NULL,
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    nombres VARCHAR(100),
    cargo VARCHAR(100),
    area VARCHAR(100),
    centro_costo VARCHAR(100) DEFAULT 'GENERAL',
    
    -- Datos laborales
    dias_trabajados INTEGER DEFAULT 30,
    horas_semanales INTEGER DEFAULT 45,
    horas_no_trabajadas INTEGER DEFAULT 0,
    
    -- Bases imponibles
    base_imp_prevision DECIMAL(12,2) DEFAULT 0,
    base_imp_cesantia DECIMAL(12,2) DEFAULT 0,
    
    -- Haberes
    sueldo_base DECIMAL(12,2) DEFAULT 0,
    aporte_asistencia DECIMAL(12,2) DEFAULT 0,
    horas_extras DECIMAL(12,2) DEFAULT 0,
    asignacion_familiar DECIMAL(12,2) DEFAULT 0,
    asignacion_antiguedad DECIMAL(12,2) DEFAULT 0,
    asignacion_perdida_caja DECIMAL(12,2) DEFAULT 0,
    asignacion_tramo DECIMAL(12,2) DEFAULT 0,
    asignacion_zona DECIMAL(12,2) DEFAULT 0,
    asignacion_responsabilidad_directiva DECIMAL(12,2) DEFAULT 0,
    bono_compensatorio DECIMAL(12,2) DEFAULT 0,
    bono_asesoria_centro_alumno DECIMAL(12,2) DEFAULT 0,
    bono_responsabilidad DECIMAL(12,2) DEFAULT 0,
    bono_leumag DECIMAL(12,2) DEFAULT 0,
    bono_nocturno DECIMAL(12,2) DEFAULT 0,
    bono_cargo DECIMAL(12,2) DEFAULT 0,
    bono_desempeno DECIMAL(12,2) DEFAULT 0,
    brp DECIMAL(12,2) DEFAULT 0,
    brp_mencion DECIMAL(12,2) DEFAULT 0,
    colacion DECIMAL(12,2) DEFAULT 0,
    gratificacion_mensual DECIMAL(12,2) DEFAULT 0,
    ley_19464 DECIMAL(12,2) DEFAULT 0,
    movilizacion DECIMAL(12,2) DEFAULT 0,
    otros_haberes_imponibles DECIMAL(12,2) DEFAULT 0,
    planilla_suplementaria DECIMAL(12,2) DEFAULT 0,
    total_haberes DECIMAL(12,2) DEFAULT 0,
    
    -- Descuentos
    prevision_afp DECIMAL(12,2) DEFAULT 0,
    apv DECIMAL(12,2) DEFAULT 0,
    salud DECIMAL(12,2) DEFAULT 0,
    salud_voluntaria DECIMAL(12,2) DEFAULT 0,
    cesantia DECIMAL(12,2) DEFAULT 0,
    impuesto_unico DECIMAL(12,2) DEFAULT 0,
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
    total_descuentos DECIMAL(12,2) DEFAULT 0,
    
    -- Resultado final
    sueldo_liquido DECIMAL(12,2) DEFAULT 0,
    sobregiro DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_payroll_books_company_period ON payroll_books(company_id, period);
CREATE INDEX IF NOT EXISTS idx_payroll_books_generation_date ON payroll_books(generation_date);
CREATE INDEX IF NOT EXISTS idx_payroll_book_details_book_id ON payroll_book_details(payroll_book_id);
CREATE INDEX IF NOT EXISTS idx_payroll_book_details_employee ON payroll_book_details(employee_id);

-- Habilitar RLS (Row Level Security) para Supabase
ALTER TABLE payroll_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_book_details ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (ajustar según necesidades)
CREATE POLICY "Enable read access for all users" ON payroll_books FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON payroll_books FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON payroll_books FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON payroll_books FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON payroll_book_details FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON payroll_book_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON payroll_book_details FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON payroll_book_details FOR DELETE USING (true);

-- Comentarios para documentación
COMMENT ON TABLE payroll_books IS 'Libro de remuneraciones por período';
COMMENT ON TABLE payroll_book_details IS 'Detalles de empleados en el libro de remuneraciones';
COMMENT ON COLUMN payroll_books.period IS 'Período en formato YYYY-MM (ej: 2025-08)';
COMMENT ON COLUMN payroll_books.book_number IS 'Número correlativo del libro de remuneraciones';