-- Sistema Completo de Finiquitos Laborales Chile
-- Implementa toda la normativa laboral chilena para terminación de contratos

-- ============================================
-- TABLA PRINCIPAL DE TÉRMINOS DE CONTRATO
-- ============================================

CREATE TABLE IF NOT EXISTS employee_terminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    -- Información del término
    termination_date DATE NOT NULL,
    termination_cause_code VARCHAR(10) NOT NULL, -- Art. 159, 160, 161, etc.
    termination_cause_description TEXT NOT NULL,
    notice_given BOOLEAN NOT NULL DEFAULT false,
    notice_date DATE,
    notice_days INTEGER DEFAULT 0,
    
    -- Cálculos de finiquito
    worked_days_last_month INTEGER DEFAULT 0,
    pending_salary_days INTEGER DEFAULT 0,
    pending_salary_amount INTEGER DEFAULT 0,
    
    -- Vacaciones
    total_vacation_days_earned DECIMAL(6,2) DEFAULT 0,
    vacation_days_taken DECIMAL(6,2) DEFAULT 0,
    pending_vacation_days DECIMAL(6,2) DEFAULT 0,
    vacation_daily_rate INTEGER DEFAULT 0,
    pending_vacation_amount INTEGER DEFAULT 0,
    
    -- Feriado proporcional  
    proportional_vacation_days DECIMAL(6,2) DEFAULT 0,
    proportional_vacation_amount INTEGER DEFAULT 0,
    
    -- Indemnizaciones
    severance_years_service DECIMAL(4,2) DEFAULT 0,
    severance_monthly_salary INTEGER DEFAULT 0,
    severance_amount INTEGER DEFAULT 0,
    notice_indemnification_amount INTEGER DEFAULT 0,
    
    -- Otras compensaciones
    christmas_bonus_amount INTEGER DEFAULT 0,
    other_bonuses_amount INTEGER DEFAULT 0,
    pending_overtime_amount INTEGER DEFAULT 0,
    
    -- Totales
    total_to_pay INTEGER NOT NULL DEFAULT 0,
    total_deductions INTEGER DEFAULT 0,
    final_net_amount INTEGER NOT NULL DEFAULT 0,
    
    -- Estados del proceso
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, calculated, approved, notified, paid
    settlement_generated BOOLEAN DEFAULT false,
    notice_letter_generated BOOLEAN DEFAULT false,
    
    -- Información adicional
    termination_reason_details TEXT,
    employee_signature_date DATE,
    company_signature_date DATE,
    witness_name VARCHAR(100),
    witness_rut VARCHAR(20),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(company_id, employee_id, termination_date),
    CONSTRAINT valid_termination_status CHECK (status IN ('draft', 'calculated', 'approved', 'notified', 'paid')),
    CONSTRAINT valid_termination_cause CHECK (termination_cause_code ~ '^(159|160|161|162|163|164|165|166|167|168|169|170|171)$')
);

-- ============================================
-- TABLA DE CAUSALES DE TÉRMINO (Art. Código del Trabajo)
-- ============================================

CREATE TABLE IF NOT EXISTS termination_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_code VARCHAR(10) NOT NULL UNIQUE, -- 159, 160-1-a, etc.
    article_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requires_notice BOOLEAN NOT NULL DEFAULT false,
    notice_days INTEGER DEFAULT 0,
    requires_severance BOOLEAN NOT NULL DEFAULT false,
    severance_calculation_type VARCHAR(50), -- 'years_service', 'fixed_30_days', 'fixed_11_days', etc.
    is_with_just_cause BOOLEAN NOT NULL DEFAULT false,
    category VARCHAR(50) NOT NULL, -- 'employer_initiative', 'employee_initiative', 'mutual_agreement', 'force_majeure'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA DE HISTORIAL DE VACACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS employee_vacation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    vacation_year INTEGER NOT NULL,
    days_earned DECIMAL(6,2) NOT NULL DEFAULT 15.0, -- 15 días hábiles por año
    days_taken DECIMAL(6,2) NOT NULL DEFAULT 0,
    days_pending DECIMAL(6,2) GENERATED ALWAYS AS (days_earned - days_taken) STORED,
    
    -- Períodos de vacaciones tomadas
    vacation_periods JSONB DEFAULT '[]', -- [{start_date, end_date, business_days, amount_paid}]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, employee_id, vacation_year)
);

-- ============================================
-- FUNCIONES PARA CÁLCULOS AUTOMÁTICOS
-- ============================================

-- Función para calcular días hábiles entre dos fechas (excluyendo sábados y domingos)
CREATE OR REPLACE FUNCTION calculate_business_days(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    total_days INTEGER;
    weeks INTEGER;
    extra_days INTEGER;
    start_dow INTEGER;
    end_dow INTEGER;
BEGIN
    -- Si las fechas son iguales, devolver 0
    IF start_date >= end_date THEN
        RETURN 0;
    END IF;
    
    total_days := end_date - start_date;
    weeks := total_days / 7;
    extra_days := total_days % 7;
    
    -- Día de la semana (1 = lunes, 7 = domingo)
    start_dow := EXTRACT(ISODOW FROM start_date);
    end_dow := EXTRACT(ISODOW FROM end_date);
    
    -- Días hábiles base (5 días por semana)
    total_days := weeks * 5;
    
    -- Agregar días extra considerando fines de semana
    FOR i IN 1..extra_days LOOP
        IF (start_dow + i - 1) % 7 + 1 <= 5 THEN -- Lunes a Viernes
            total_days := total_days + 1;
        END IF;
    END LOOP;
    
    RETURN total_days;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular vacaciones proporcionales
CREATE OR REPLACE FUNCTION calculate_proportional_vacation(
    contract_start_date DATE,
    termination_date DATE,
    annual_vacation_days DECIMAL DEFAULT 15.0
)
RETURNS DECIMAL AS $$
DECLARE
    months_worked INTEGER;
    days_per_month DECIMAL;
    proportional_days DECIMAL;
BEGIN
    -- Calcular meses completos trabajados en el último año
    months_worked := EXTRACT(MONTH FROM AGE(termination_date, contract_start_date));
    
    -- Si ha trabajado más de un año, considerar solo el último año
    IF months_worked >= 12 THEN
        months_worked := EXTRACT(MONTH FROM AGE(termination_date, 
            (termination_date - INTERVAL '1 year')::DATE));
    END IF;
    
    -- Días de vacaciones por mes
    days_per_month := annual_vacation_days / 12.0;
    
    -- Calcular vacaciones proporcionales
    proportional_days := months_worked * days_per_month;
    
    RETURN ROUND(proportional_days, 2);
END;
$$ LANGUAGE plpgsql;

-- Función para calcular indemnización por años de servicio
CREATE OR REPLACE FUNCTION calculate_years_of_service_indemnification(
    contract_start_date DATE,
    termination_date DATE,
    monthly_salary INTEGER,
    max_months INTEGER DEFAULT 330 -- Tope legal 330 UF ≈ 11 meses
)
RETURNS INTEGER AS $$
DECLARE
    years_service DECIMAL;
    indemnification_months INTEGER;
    indemnification_amount INTEGER;
BEGIN
    -- Calcular años completos de servicio
    years_service := EXTRACT(YEAR FROM AGE(termination_date, contract_start_date)) + 
                    (EXTRACT(MONTH FROM AGE(termination_date, contract_start_date)) / 12.0);
    
    -- Un mes de sueldo por cada año de servicio (fracción superior a 6 meses = año completo)
    indemnification_months := CEIL(years_service);
    
    -- Aplicar tope legal si existe
    IF max_months IS NOT NULL AND indemnification_months > max_months THEN
        indemnification_months := max_months;
    END IF;
    
    indemnification_amount := indemnification_months * monthly_salary;
    
    RETURN indemnification_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSERTAR CAUSALES DE TÉRMINO ESTÁNDAR
-- ============================================

INSERT INTO termination_causes (article_code, article_name, description, requires_notice, notice_days, requires_severance, severance_calculation_type, is_with_just_cause, category) VALUES 
-- Terminación por necesidades de la empresa (Art. 161)
('161', 'Art. 161 - Necesidades de la empresa', 'Terminación del contrato por necesidades de la empresa, establecimiento o servicio', true, 30, true, 'years_service', false, 'employer_initiative'),

-- Terminación sin expresión de causa (Art. 159 - solo gerentes)  
('159', 'Art. 159 - Sin expresión de causa (gerentes)', 'Desahucio por parte del empleador sin expresión de causa (solo aplicable a gerentes, administradores, personas de exclusiva confianza)', true, 30, true, 'fixed_30_days', false, 'employer_initiative'),

-- Terminación por falta de probidad (Art. 160)
('160-1-a', 'Art. 160 N°1 letra a - Falta de probidad', 'Falta de probidad del trabajador en el desempeño de sus funciones', false, 0, false, null, true, 'employer_initiative'),
('160-1-b', 'Art. 160 N°1 letra b - Conductas de acoso', 'Conductas de acoso sexual o acoso laboral', false, 0, false, null, true, 'employer_initiative'),
('160-1-c', 'Art. 160 N°1 letra c - Vías de hecho', 'Vías de hecho ejercidas por el trabajador en contra del empleador o cualquier trabajador', false, 0, false, null, true, 'employer_initiative'),
('160-1-d', 'Art. 160 N°1 letra d - Injurias', 'Injurias proferidas por el trabajador al empleador', false, 0, false, null, true, 'employer_initiative'),
('160-1-e', 'Art. 160 N°1 letra e - Daño material', 'Daño material causado intencionalmente en las instalaciones, maquinarias, herramientas, útiles de trabajo, productos o mercaderías', false, 0, false, null, true, 'employer_initiative'),

-- Abandono del trabajo y faltas
('160-3', 'Art. 160 N°3 - Abandono del trabajo', 'Abandono del trabajo por parte del trabajador', false, 0, false, null, true, 'employer_initiative'),
('160-4', 'Art. 160 N°4 - Incumplimiento grave', 'Incumplimiento grave de las obligaciones que impone el contrato', false, 0, false, null, true, 'employer_initiative'),
('160-5', 'Art. 160 N°5 - Negociación incompatible', 'Negociación que ejecute el trabajador dentro del giro del negocio y que hubiere sido prohibida por escrito en el respectivo contrato', false, 0, false, null, true, 'employer_initiative'),

-- Renuncia voluntaria (Art. 159 inciso final)
('159-renuncia', 'Art. 159 - Renuncia voluntaria', 'Renuncia voluntaria del trabajador', false, 0, false, null, false, 'employee_initiative'),

-- Mutuo acuerdo
('mutual-agreement', 'Mutuo acuerdo', 'Terminación del contrato de común acuerdo entre las partes', false, 0, false, null, false, 'mutual_agreement'),

-- Vencimiento plazo fijo
('plazo-fijo', 'Vencimiento contrato plazo fijo', 'Término natural del contrato por cumplimiento del plazo convenido', false, 0, false, null, false, 'force_majeure'),

-- Fallecimiento trabajador
('fallecimiento', 'Fallecimiento del trabajador', 'Terminación del contrato por muerte del trabajador', false, 0, false, null, false, 'force_majeure');

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employee_terminations_company ON employee_terminations(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_employee ON employee_terminations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_date ON employee_terminations(termination_date);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_status ON employee_terminations(status);
CREATE INDEX IF NOT EXISTS idx_employee_vacation_history_company ON employee_vacation_history(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_vacation_history_employee ON employee_vacation_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_vacation_history_year ON employee_vacation_history(vacation_year);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE employee_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_vacation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their employee terminations" ON employee_terminations
    FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

CREATE POLICY "Companies can manage their employee vacation history" ON employee_vacation_history
    FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

-- ============================================
-- TRIGGER PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_employee_terminations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_terminations_updated_at
    BEFORE UPDATE ON employee_terminations
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_terminations_updated_at();

CREATE TRIGGER update_employee_vacation_history_updated_at
    BEFORE UPDATE ON employee_vacation_history
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_terminations_updated_at();

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE employee_terminations IS 'Registro completo de términos de contrato con cálculos automáticos de finiquito según normativa chilena';
COMMENT ON TABLE termination_causes IS 'Causales de término según Código del Trabajo chileno';
COMMENT ON TABLE employee_vacation_history IS 'Historial detallado de vacaciones por empleado para cálculos precisos de finiquito';

COMMENT ON FUNCTION calculate_business_days IS 'Calcula días hábiles entre dos fechas (excluyendo sábados y domingos)';
COMMENT ON FUNCTION calculate_proportional_vacation IS 'Calcula vacaciones proporcionales según meses trabajados';
COMMENT ON FUNCTION calculate_years_of_service_indemnification IS 'Calcula indemnización por años de servicio con tope legal';