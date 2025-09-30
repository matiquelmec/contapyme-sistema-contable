-- DIAGNÓSTICO SIMPLE PARA ERROR 500 PAYROLL
-- Solo las verificaciones esenciales

-- 1. ¿Existe la empresa?
SELECT COUNT(*) as empresa_count FROM companies WHERE id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- 2. ¿Existe tabla employees?
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') as tabla_employees_existe;

-- 3. ¿Cuántos empleados hay?
SELECT COUNT(*) as empleados_count FROM employees WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce';

-- 4. Mostrar empleados si los hay
SELECT first_name, last_name, rut FROM employees WHERE company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce' LIMIT 5;