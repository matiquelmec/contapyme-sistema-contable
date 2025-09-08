-- ==========================================
-- CORREGIR TRIGGER DE CÁLCULO DE LIQUIDACIONES
-- PARA INCLUIR GRATIFICACIÓN ART. 50
-- Fecha: 12 de agosto, 2025
-- ==========================================

-- Eliminar función y trigger existente
DROP TRIGGER IF EXISTS calculate_liquidation_totals_trigger ON payroll_liquidations;
DROP FUNCTION IF EXISTS calculate_liquidation_totals();

-- Crear función corregida que incluye legal_gratification_art50
CREATE OR REPLACE FUNCTION calculate_liquidation_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular total ingresos gravables (INCLUIR GRATIFICACIÓN ART. 50)
    NEW.total_taxable_income = COALESCE(NEW.base_salary, 0) + 
                              COALESCE(NEW.overtime_amount, 0) + 
                              COALESCE(NEW.bonuses, 0) + 
                              COALESCE(NEW.commissions, 0) + 
                              COALESCE(NEW.gratification, 0) +
                              COALESCE(NEW.legal_gratification_art50, 0); -- ✅ INCLUIR ART. 50
    
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

-- Recrear trigger
CREATE TRIGGER calculate_liquidation_totals_trigger
    BEFORE INSERT OR UPDATE ON payroll_liquidations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_liquidation_totals();

-- Actualizar liquidación específica problemática
UPDATE payroll_liquidations 
SET 
  total_taxable_income = COALESCE(base_salary, 0) + COALESCE(overtime_amount, 0) + COALESCE(bonuses, 0) + COALESCE(commissions, 0) + COALESCE(gratification, 0) + COALESCE(legal_gratification_art50, 0),
  total_non_taxable_income = COALESCE(food_allowance, 0) + COALESCE(transport_allowance, 0) + COALESCE(family_allowance, 0) + COALESCE(other_allowances, 0)
WHERE id = 'a2ce069b-fb18-409f-9a90-1c78eba1ba51';

-- Verificar corrección
SELECT 
  'LIQUIDACIÓN CORREGIDA' as status,
  id,
  base_salary,
  bonuses,
  legal_gratification_art50,
  total_taxable_income,
  total_non_taxable_income,
  total_gross_income
FROM payroll_liquidations 
WHERE id = 'a2ce069b-fb18-409f-9a90-1c78eba1ba51';

-- Mensaje de confirmación
SELECT '🎉 TRIGGER CORREGIDO - Gratificación Art. 50 ahora incluida en cálculos automáticos' as final_status;