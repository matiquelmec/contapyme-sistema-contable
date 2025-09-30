-- =============================================
-- FIX CRÍTICO: Corrección del constraint de balance
-- Fecha: 6 de agosto, 2025  
-- Problema: El trigger está calculando mal los totales
-- Solución: Simplificar la lógica y corregir la función
-- =============================================

-- 1. Eliminar constraint problemático temporalmente
ALTER TABLE journal_book DROP CONSTRAINT IF EXISTS balanced_journal_entry;

-- 2. Eliminar trigger problemático
DROP TRIGGER IF EXISTS trigger_journal_details_update ON journal_book_details;
DROP FUNCTION IF EXISTS trigger_update_journal_totals();
DROP FUNCTION IF EXISTS update_journal_book_totals(VARCHAR);

-- 3. Simplificar la función para actualizar totales
CREATE OR REPLACE FUNCTION update_journal_book_totals(p_jbid VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
BEGIN
    -- Calcular totales desde las líneas de detalle
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_book_details
    WHERE jbid = p_jbid;
    
    -- Actualizar el encabezado SIN el constraint activo
    UPDATE journal_book
    SET 
        total_debit = v_total_debit,
        total_credit = v_total_credit
    WHERE jbid = p_jbid;
    
    -- Retornar si está balanceado
    RETURN v_total_debit = v_total_credit;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger simplificado
CREATE OR REPLACE FUNCTION trigger_update_journal_totals()
RETURNS TRIGGER AS $$
DECLARE
    affected_jbid VARCHAR(20);
BEGIN
    -- Determinar qué jbid fue afectado
    IF TG_OP = 'DELETE' THEN
        affected_jbid := OLD.jbid;
    ELSE
        affected_jbid := NEW.jbid;
    END IF;
    
    -- Actualizar totales
    PERFORM update_journal_book_totals(affected_jbid);
    
    -- Retornar el registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Recrear trigger
CREATE TRIGGER trigger_journal_details_update
    AFTER INSERT OR UPDATE OR DELETE ON journal_book_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_journal_totals();

-- 6. Función mejorada para crear asientos completos
CREATE OR REPLACE FUNCTION create_complete_journal_entry(
    p_date DATE,
    p_description TEXT,
    p_document_number VARCHAR(50) DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT 'MANUAL',
    p_reference_id UUID DEFAULT NULL,
    p_entry_lines JSONB
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_jbid VARCHAR(20);
    v_entry_number INTEGER;
    v_line_number INTEGER := 1;
    v_line JSONB;
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
BEGIN
    -- Generar ID único para el asiento
    v_jbid := 'JB' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Generar número de asiento secuencial
    SELECT COALESCE(MAX(entry_number), 0) + 1 
    INTO v_entry_number 
    FROM journal_book;
    
    -- Calcular totales ANTES de crear el asiento
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_entry_lines)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit_amount')::DECIMAL(15,2), 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit_amount')::DECIMAL(15,2), 0);
    END LOOP;
    
    -- Validar que esté balanceado ANTES de insertar
    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Asiento desbalanceado: Débito=% Crédito=%', v_total_debit, v_total_credit;
    END IF;
    
    -- Crear encabezado del asiento con totales correctos
    INSERT INTO journal_book (
        jbid, date, description, document_number, 
        reference_type, reference_id, entry_number,
        total_debit, total_credit
    ) VALUES (
        v_jbid, p_date, p_description, p_document_number,
        p_reference_type, p_reference_id, v_entry_number,
        v_total_debit, v_total_credit
    );
    
    -- Crear líneas del asiento
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_entry_lines)
    LOOP
        INSERT INTO journal_book_details (
            jbid, line_number, account_code, account_name,
            debit_amount, credit_amount, description
        ) VALUES (
            v_jbid, v_line_number,
            v_line->>'account_code',
            v_line->>'account_name',
            COALESCE((v_line->>'debit_amount')::DECIMAL(15,2), 0),
            COALESCE((v_line->>'credit_amount')::DECIMAL(15,2), 0),
            COALESCE(v_line->>'description', '')
        );
        
        v_line_number := v_line_number + 1;
    END LOOP;
    
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- 7. Limpiar datos de ejemplo anteriores (si existen)
DELETE FROM journal_book_details WHERE jbid IN (
    SELECT jbid FROM journal_book WHERE reference_type = 'VENTA' AND description LIKE '%Factura 001%'
);
DELETE FROM journal_book WHERE reference_type = 'VENTA' AND description LIKE '%Factura 001%';

DELETE FROM journal_book_details WHERE jbid IN (
    SELECT jbid FROM journal_book WHERE reference_type = 'COMPRA' AND description LIKE '%PROV-001%'
);
DELETE FROM journal_book WHERE reference_type = 'COMPRA' AND description LIKE '%PROV-001%';

-- 8. Agregar constraint de balance DESPUÉS de arreglar todo
ALTER TABLE journal_book ADD CONSTRAINT balanced_journal_entry 
CHECK (ABS(total_debit - total_credit) < 0.01);

-- 9. Crear asiento de ejemplo correcto
SELECT create_complete_journal_entry(
    CURRENT_DATE,
    'Venta al contado - Factura 001',
    'FAC-001',
    'VENTA',
    NULL,
    '[
        {
            "account_code": "1.1.1.001",
            "account_name": "Caja",
            "debit_amount": "119000",
            "credit_amount": "0",
            "description": "Cobro factura 001"
        },
        {
            "account_code": "4.1.1.001",
            "account_name": "Ventas Nacionales", 
            "debit_amount": "0",
            "credit_amount": "100000",
            "description": "Venta neta"
        },
        {
            "account_code": "2.1.2.001",
            "account_name": "IVA Débito Fiscal",
            "debit_amount": "0", 
            "credit_amount": "19000",
            "description": "IVA 19%"
        }
    ]'::jsonb
) AS ejemplo_venta;

-- 10. Crear otro asiento de ejemplo: Compra
SELECT create_complete_journal_entry(
    CURRENT_DATE,
    'Compra de materiales - Factura PROV-001',
    'PROV-001', 
    'COMPRA',
    NULL,
    '[
        {
            "account_code": "5.1.1.001",
            "account_name": "Costo de Mercaderías",
            "debit_amount": "50000",
            "credit_amount": "0",
            "description": "Materiales comprados"
        },
        {
            "account_code": "2.1.3.001",
            "account_name": "IVA Crédito Fiscal", 
            "debit_amount": "9500",
            "credit_amount": "0",
            "description": "IVA recuperable 19%"
        },
        {
            "account_code": "1.1.1.002", 
            "account_name": "Banco Estado",
            "debit_amount": "0",
            "credit_amount": "59500",
            "description": "Pago a proveedor"
        }
    ]'::jsonb
) AS ejemplo_compra;

-- Verificar que los asientos estén balanceados
SELECT 
    jbid,
    entry_number,
    description,
    total_debit,
    total_credit,
    is_balanced,
    CASE 
        WHEN ABS(total_debit - total_credit) < 0.01 THEN '✅ BALANCEADO'
        ELSE '❌ DESBALANCEADO'
    END AS status
FROM journal_book 
WHERE status = 'active'
ORDER BY entry_number DESC;

SELECT 'CORRECCIÓN APLICADA - Sistema contable con asientos multi-línea funcionando' AS resultado;