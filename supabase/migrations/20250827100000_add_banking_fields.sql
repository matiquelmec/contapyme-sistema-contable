-- Agregar campos bancarios a la tabla employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50), -- cuenta_corriente, cuenta_vista, cuenta_ahorro
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);

-- Agregar comentarios para documentación
COMMENT ON COLUMN employees.bank_name IS 'Nombre del banco del empleado';
COMMENT ON COLUMN employees.bank_account_type IS 'Tipo de cuenta bancaria: cuenta_corriente, cuenta_vista, cuenta_ahorro';
COMMENT ON COLUMN employees.bank_account_number IS 'Número de cuenta bancaria';