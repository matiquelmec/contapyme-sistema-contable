-- =============================================
-- LIMPIEZA TOTAL Y RECREACIÓN DEL SISTEMA CONTABLE
-- Fecha: 6 de agosto, 2025  
-- Descripción: Eliminación completa y recreación con IDs únicos garantizados
-- =============================================

-- =======================
-- 1. ELIMINACIÓN COMPLETA Y SEGURA
-- =======================

-- Eliminar todo el sistema anterior
DO $$
BEGIN
    -- Eliminar triggers
    DROP TRIGGER IF EXISTS trigger_journal_details_update ON journal_book_details;
    
    -- Eliminar funciones
    DROP FUNCTION IF EXISTS trigger_update_journal_totals();
    DROP FUNCTION IF EXISTS update_journal_book_totals(VARCHAR);
    DROP FUNCTION IF EXISTS create_complete_journal_entry(DATE, TEXT, VARCHAR, VARCHAR, UUID, JSONB);
    
    -- Eliminar vistas
    DROP VIEW IF EXISTS journal_book_view;
    
    -- Eliminar tabla de detalles
    DROP TABLE IF EXISTS journal_book_details CASCADE;
    
    -- Eliminar constraints de journal_book
    ALTER TABLE journal_book DROP CONSTRAINT IF EXISTS balanced_journal_entry;
    
    -- ELIMINAR TODOS LOS DATOS (no truncate, DELETE completo)
    DELETE FROM journal_book;
    
    -- Eliminar columnas problemáticas
    ALTER TABLE journal_book DROP COLUMN IF EXISTS debit;
    ALTER TABLE journal_book DROP COLUMN IF EXISTS credit;
    ALTER TABLE journal_book DROP COLUMN IF EXISTS total_debit;
    ALTER TABLE journal_book DROP COLUMN IF EXISTS total_credit;
    ALTER TABLE journal_book DROP COLUMN IF EXISTS entry_number;
    ALTER TABLE journal_book DROP COLUMN IF EXISTS is_balanced;
    
    RAISE NOTICE 'Limpieza completa realizada';
END
$$;

-- =======================
-- 2. RECREAR ESTRUCTURA DE JOURNAL_BOOK
-- =======================

-- Agregar columnas para sistema multi-línea
ALTER TABLE journal_book ADD COLUMN total_debit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN total_credit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN entry_number INTEGER;
ALTER TABLE journal_book ADD COLUMN is_balanced BOOLEAN DEFAULT FALSE;

-- =======================
-- 3. CREAR TABLA DE DETALLES
-- =======================

CREATE TABLE journal_book_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jbid VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT single_amount_per_line CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    
    FOREIGN KEY (jbid) REFERENCES journal_book(jbid) ON DELETE CASCADE
);

-- =======================
-- 4. ÍNDICES
-- =======================

CREATE INDEX idx_journal_book_details_jbid ON journal_book_details(jbid);
CREATE INDEX idx_journal_book_details_account ON journal_book_details(account_code);
CREATE INDEX idx_journal_book_entry_number ON journal_book(entry_number);

-- =======================
-- 5. FUNCIÓN PARA GENERAR ID ÚNICO GARANTIZADO
-- =======================

CREATE OR REPLACE FUNCTION generate_unique_journal_id()
RETURNS VARCHAR(20) AS $$
DECLARE
    v_jbid VARCHAR(20);
    v_exists BOOLEAN := TRUE;
    v_counter INTEGER := 0;
BEGIN
    WHILE v_exists AND v_counter < 10 LOOP
        -- Generar ID con timestamp + random
        v_jbid := 'JB' || EXTRACT(EPOCH FROM NOW())::BIGINT || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        
        -- Verificar si existe
        SELECT EXISTS(SELECT 1 FROM journal_book WHERE jbid = v_jbid) INTO v_exists;
        
        v_counter := v_counter + 1;
        
        -- Si existe, esperar un poco para cambiar el timestamp
        IF v_exists THEN
            PERFORM pg_sleep(0.001);
        END IF;
    END LOOP;
    
    IF v_exists THEN
        RAISE EXCEPTION 'No se pudo generar un ID único después de % intentos', v_counter;
    END IF;
    
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 6. FUNCIÓN PARA ACTUALIZAR TOTALES
-- =======================

CREATE OR REPLACE FUNCTION update_journal_book_totals(p_jbid VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
    v_is_balanced BOOLEAN;
BEGIN
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_book_details
    WHERE jbid = p_jbid;
    
    v_is_balanced := ABS(v_total_debit - v_total_credit) < 0.01;
    
    UPDATE journal_book
    SET 
        total_debit = v_total_debit,
        total_credit = v_total_credit,
        is_balanced = v_is_balanced
    WHERE jbid = p_jbid;
    
    RETURN v_is_balanced;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 7. FUNCIÓN PRINCIPAL PARA CREAR ASIENTOS
-- =======================

CREATE OR REPLACE FUNCTION create_complete_journal_entry(
    p_date DATE,
    p_description TEXT,
    p_document_number VARCHAR(50) DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT 'MANUAL',
    p_reference_id UUID DEFAULT NULL,
    p_entry_lines JSONB DEFAULT '[]'::jsonb
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
    -- Validar entrada
    IF p_entry_lines IS NULL OR jsonb_array_length(p_entry_lines) < 2 THEN
        RAISE EXCEPTION 'Se requieren al menos 2 líneas para el asiento';
    END IF;
    
    -- Generar ID único garantizado
    v_jbid := generate_unique_journal_id();
    
    -- Generar número de asiento
    SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_entry_number FROM journal_book;
    
    -- Calcular totales
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_entry_lines)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit_amount')::DECIMAL(15,2), 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit_amount')::DECIMAL(15,2), 0);
    END LOOP;
    
    -- Validar balance
    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Asiento desbalanceado: Débito=% Crédito=%', v_total_debit, v_total_credit;
    END IF;
    
    -- Crear encabezado
    INSERT INTO journal_book (
        jbid, date, description, document_number, 
        reference_type, reference_id, entry_number,
        total_debit, total_credit, is_balanced, status
    ) VALUES (
        v_jbid, p_date, p_description, p_document_number,
        p_reference_type, p_reference_id, v_entry_number,
        v_total_debit, v_total_credit, TRUE, 'active'
    );
    
    -- Crear líneas
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
    
    RAISE NOTICE 'Asiento creado: % con % líneas', v_jbid, jsonb_array_length(p_entry_lines);
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 8. CREAR TRIGGERS
-- =======================

CREATE OR REPLACE FUNCTION trigger_update_journal_totals()
RETURNS TRIGGER AS $$
DECLARE
    affected_jbid VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_jbid := OLD.jbid;
    ELSE
        affected_jbid := NEW.jbid;
    END IF;
    
    PERFORM update_journal_book_totals(affected_jbid);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_journal_details_update
    AFTER INSERT OR UPDATE OR DELETE ON journal_book_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_journal_totals();

-- =======================
-- 9. CONSTRAINT FINAL
-- =======================

ALTER TABLE journal_book ADD CONSTRAINT balanced_journal_entry 
CHECK (ABS(total_debit - total_credit) < 0.01);

-- =======================
-- 10. CREAR VISTA
-- =======================

CREATE VIEW journal_book_view AS
SELECT 
    jb.jbid,
    jb.entry_number,
    jb.date,
    jb.description,
    jb.document_number,
    jb.reference_type,
    jb.total_debit,
    jb.total_credit,
    jb.is_balanced,
    jb.status,
    jbd.line_number,
    jbd.account_code,
    jbd.account_name,
    jbd.debit_amount,
    jbd.credit_amount,
    jbd.description AS line_description
FROM journal_book jb
LEFT JOIN journal_book_details jbd ON jb.jbid = jbd.jbid
ORDER BY jb.entry_number DESC, jbd.line_number ASC;

-- =======================
-- 11. CREAR ASIENTOS DE EJEMPLO CON DELAY
-- =======================

-- Asiento 1: Venta (con delay para garantizar ID único)
DO $$
DECLARE
    venta_jbid VARCHAR(20);
BEGIN
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
                "debit_amount": 119000,
                "credit_amount": 0,
                "description": "Cobro factura 001"
            },
            {
                "account_code": "4.1.1.001",
                "account_name": "Ventas Nacionales",
                "debit_amount": 0,
                "credit_amount": 100000,
                "description": "Venta neta"
            },
            {
                "account_code": "2.1.2.001",
                "account_name": "IVA Débito Fiscal",
                "debit_amount": 0,
                "credit_amount": 19000,
                "description": "IVA 19%"
            }
        ]'::jsonb
    ) INTO venta_jbid;
    
    -- Delay para asegurar timestamp diferente
    PERFORM pg_sleep(0.1);
    
    RAISE NOTICE 'Asiento de venta creado: %', venta_jbid;
END
$$;

-- Asiento 2: Compra (con delay)
DO $$
DECLARE
    compra_jbid VARCHAR(20);
BEGIN
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
                "debit_amount": 50000,
                "credit_amount": 0,
                "description": "Materiales comprados"
            },
            {
                "account_code": "2.1.3.001",
                "account_name": "IVA Crédito Fiscal",
                "debit_amount": 9500,
                "credit_amount": 0,
                "description": "IVA recuperable 19%"
            },
            {
                "account_code": "1.1.1.002",
                "account_name": "Banco Estado",
                "debit_amount": 0,
                "credit_amount": 59500,
                "description": "Pago a proveedor"
            }
        ]'::jsonb
    ) INTO compra_jbid;
    
    RAISE NOTICE 'Asiento de compra creado: %', compra_jbid;
END
$$;

-- =======================
-- 12. VERIFICACIÓN FINAL
-- =======================

-- Mostrar asientos creados
SELECT 
    jbid,
    entry_number,
    LEFT(description, 30) AS description_short,
    total_debit,
    total_credit,
    is_balanced,
    CASE 
        WHEN is_balanced THEN '✅ BALANCEADO'
        ELSE '❌ DESBALANCEADO'
    END AS status,
    (SELECT COUNT(*) FROM journal_book_details WHERE journal_book_details.jbid = journal_book.jbid) AS lineas
FROM journal_book 
WHERE status = 'active'
ORDER BY entry_number DESC;

-- Contar líneas de detalle
SELECT 
    'Total asientos creados:' AS descripcion,
    COUNT(*) AS cantidad
FROM journal_book 
WHERE status = 'active'
UNION ALL
SELECT 
    'Total líneas de detalle:' AS descripcion,
    COUNT(*) AS cantidad
FROM journal_book_details;

SELECT 'SISTEMA CONTABLE MULTI-LÍNEA - IMPLEMENTACIÓN COMPLETA Y EXITOSA' AS resultado;