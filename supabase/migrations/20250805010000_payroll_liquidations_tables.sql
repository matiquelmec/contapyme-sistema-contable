-- Tabla principal de liquidaciones de sueldo
CREATE TABLE IF NOT EXISTS payroll_liquidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Datos del período
    days_worked INTEGER NOT NULL DEFAULT 30,
    worked_hours DECIMAL(8,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Haberes Imponibles
    base_salary INTEGER NOT NULL DEFAULT 0,
    overtime_amount INTEGER DEFAULT 0,
    bonuses INTEGER DEFAULT 0,
    commissions INTEGER DEFAULT 0,
    gratification INTEGER DEFAULT 0,
    total_taxable_income INTEGER NOT NULL DEFAULT 0,
    
    -- Haberes No Imponibles  
    food_allowance INTEGER DEFAULT 0,
    transport_allowance INTEGER DEFAULT 0,
    family_allowance INTEGER DEFAULT 0,
    other_allowances INTEGER DEFAULT 0,
    total_non_taxable_income INTEGER NOT NULL DEFAULT 0,
    
    -- Descuentos Previsionales
    afp_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    afp_commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.58,
    afp_amount INTEGER NOT NULL DEFAULT 0,
    afp_commission_amount INTEGER NOT NULL DEFAULT 0,
    sis_amount INTEGER NOT NULL DEFAULT 0,
    
    health_percentage DECIMAL(5,2) NOT NULL DEFAULT 7.00,
    health_amount INTEGER NOT NULL DEFAULT 0,
    
    unemployment_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.6,
    unemployment_amount INTEGER NOT NULL DEFAULT 0,
    
    -- Impuestos
    income_tax_amount INTEGER DEFAULT 0,
    
    -- Otros Descuentos
    loan_deductions INTEGER DEFAULT 0,
    advance_payments INTEGER DEFAULT 0,
    apv_amount INTEGER DEFAULT 0,
    other_deductions INTEGER DEFAULT 0,
    total_other_deductions INTEGER NOT NULL DEFAULT 0,
    
    -- Totales Calculados
    total_gross_income INTEGER NOT NULL DEFAULT 0,
    total_deductions INTEGER NOT NULL DEFAULT 0,
    net_salary INTEGER NOT NULL DEFAULT 0,
    
    -- Configuración usada (snapshot)
    calculation_config JSONB NOT NULL DEFAULT '{}',
    
    -- Metadatos
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, paid
    generated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices únicos
    UNIQUE(company_id, employee_id, period_year, period_month)
);

-- Tabla de conceptos adicionales por liquidación (flexibilidad)
CREATE TABLE IF NOT EXISTS payroll_liquidation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidation_id UUID NOT NULL REFERENCES payroll_liquidations(id) ON DELETE CASCADE,
    
    item_type VARCHAR(20) NOT NULL, -- 'income', 'deduction'
    category VARCHAR(50) NOT NULL, -- 'bonus', 'commission', 'loan', etc.
    description VARCHAR(200) NOT NULL,
    amount INTEGER NOT NULL,
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de lotes de liquidaciones (para procesamiento masivo)
CREATE TABLE IF NOT EXISTS payroll_liquidation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    batch_name VARCHAR(100) NOT NULL,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
    error_message TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Relación liquidaciones con lotes
ALTER TABLE payroll_liquidations ADD COLUMN batch_id UUID REFERENCES payroll_liquidation_batches(id);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_company ON payroll_liquidations(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_employee ON payroll_liquidations(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_period ON payroll_liquidations(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_liquidations_status ON payroll_liquidations(status);
CREATE INDEX IF NOT EXISTS idx_payroll_liquidation_items_liquidation ON payroll_liquidation_items(liquidation_id);
CREATE INDEX IF NOT EXISTS idx_payroll_liquidation_batches_company ON payroll_liquidation_batches(company_id);

-- RLS Policies
ALTER TABLE payroll_liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_liquidation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_liquidation_batches ENABLE ROW LEVEL SECURITY;

-- Policies para liquidaciones
CREATE POLICY "Companies can manage their payroll liquidations" ON payroll_liquidations
    FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

CREATE POLICY "Companies can manage their payroll liquidation items" ON payroll_liquidation_items
    FOR ALL USING (
        liquidation_id IN (
            SELECT id FROM payroll_liquidations 
            WHERE company_id = current_setting('app.current_company_id')::UUID
        )
    );

CREATE POLICY "Companies can manage their payroll liquidation batches" ON payroll_liquidation_batches
    FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_payroll_liquidations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_liquidations_updated_at
    BEFORE UPDATE ON payroll_liquidations
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_liquidations_updated_at();

-- Función para calcular totales automáticamente
CREATE OR REPLACE FUNCTION calculate_liquidation_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular total ingresos gravables
    NEW.total_taxable_income = COALESCE(NEW.base_salary, 0) + 
                              COALESCE(NEW.overtime_amount, 0) + 
                              COALESCE(NEW.bonuses, 0) + 
                              COALESCE(NEW.commissions, 0) + 
                              COALESCE(NEW.gratification, 0);
    
    -- Calcular total ingresos no gravables
    NEW.total_non_taxable_income = COALESCE(NEW.food_allowance, 0) + 
                                  COALESCE(NEW.transport_allowance, 0) + 
                                  COALESCE(NEW.family_allowance, 0) + 
                                  COALESCE(NEW.other_allowances, 0);
    
    -- Calcular total otros descuentos
    NEW.total_other_deductions = COALESCE(NEW.loan_deductions, 0) + 
                                COALESCE(NEW.advance_payments, 0) + 
                                COALESCE(NEW.apv_amount, 0) + 
                                COALESCE(NEW.other_deductions, 0);
    
    -- Calcular total ingresos brutos
    NEW.total_gross_income = NEW.total_taxable_income + NEW.total_non_taxable_income;
    
    -- Calcular total descuentos
    NEW.total_deductions = COALESCE(NEW.afp_amount, 0) + 
                          COALESCE(NEW.afp_commission_amount, 0) + 
                          COALESCE(NEW.sis_amount, 0) + 
                          COALESCE(NEW.health_amount, 0) + 
                          COALESCE(NEW.unemployment_amount, 0) + 
                          COALESCE(NEW.income_tax_amount, 0) + 
                          NEW.total_other_deductions;
    
    -- Calcular sueldo líquido
    NEW.net_salary = NEW.total_gross_income - NEW.total_deductions;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_liquidation_totals_trigger
    BEFORE INSERT OR UPDATE ON payroll_liquidations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_liquidation_totals();

-- Comentarios para documentación
COMMENT ON TABLE payroll_liquidations IS 'Liquidaciones de sueldo históricas con cálculos automáticos';
COMMENT ON TABLE payroll_liquidation_items IS 'Conceptos adicionales flexibles por liquidación';
COMMENT ON TABLE payroll_liquidation_batches IS 'Lotes de procesamiento masivo de liquidaciones';
COMMENT ON COLUMN payroll_liquidations.calculation_config IS 'Snapshot de la configuración previsional usada en el cálculo';
COMMENT ON COLUMN payroll_liquidations.total_taxable_income IS 'Total haberes imponibles (base para descuentos previsionales)';
COMMENT ON COLUMN payroll_liquidations.total_non_taxable_income IS 'Total haberes no imponibles (colación, movilización, etc.)';
COMMENT ON COLUMN payroll_liquidations.net_salary IS 'Sueldo líquido final = ingresos - descuentos';