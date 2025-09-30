-- =============================================
-- SISTEMA CONTABLE LIMPIO - ORDEN CORRECTO
-- Fecha: 6 de agosto, 2025  
-- Descripción: Creación ordenada sin referencias cruzadas
-- =============================================

-- =======================
-- 1. LIMPIAR SOLO LO QUE EXISTE
-- =======================

-- Limpiar solo si existen (sin errores)
DO $$
BEGIN
    -- Eliminar triggers si existen
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_journal_details_update') THEN
        DROP TRIGGER trigger_journal_details_update ON journal_book_details;
    END IF;
    
    -- Eliminar funciones si existen
    DROP FUNCTION IF EXISTS trigger_update_journal_totals();
    DROP FUNCTION IF EXISTS update_journal_book_totals(VARCHAR);
    DROP FUNCTION IF EXISTS create_complete_journal_entry(DATE, TEXT, VARCHAR, VARCHAR, UUID, JSONB);
    
    -- Eliminar vista si existe
    DROP VIEW IF EXISTS journal_book_view;
    
    -- Eliminar tabla de detalles si existe
    DROP TABLE IF EXISTS journal_book_details CASCADE;
END
$$;

-- =======================
-- 2. LIMPIAR JOURNAL_BOOK
-- =======================

-- Eliminar constraints problemáticos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balanced_journal_entry') THEN
        ALTER TABLE journal_book DROP CONSTRAINT balanced_journal_entry;
    END IF;
END
$$;

-- Limpiar datos existentes
TRUNCATE TABLE journal_book CASCADE;

-- Eliminar columnas problemáticas
ALTER TABLE journal_book DROP COLUMN IF EXISTS debit;
ALTER TABLE journal_book DROP COLUMN IF EXISTS credit;
ALTER TABLE journal_book DROP COLUMN IF EXISTS total_debit;
ALTER TABLE journal_book DROP COLUMN IF EXISTS total_credit;
ALTER TABLE journal_book DROP COLUMN IF EXISTS entry_number;
ALTER TABLE journal_book DROP COLUMN IF EXISTS is_balanced;

-- Agregar columnas correctas
ALTER TABLE journal_book ADD COLUMN total_debit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN total_credit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN entry_number INTEGER;
ALTER TABLE journal_book ADD COLUMN is_balanced BOOLEAN DEFAULT FALSE;

-- =======================
-- 3. CREAR TABLA DE DETALLES (SIN FK TODAVÍA)
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
    
    -- Constraint: cada línea tiene SOLO débito O SOLO crédito
    CONSTRAINT single_amount_per_line CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- =======================
-- 4. AGREGAR FK DESPUÉS DE CREAR TABLA
-- =======================

ALTER TABLE journal_book_details 
ADD CONSTRAINT fk_journal_details_book 
FOREIGN KEY (jbid) REFERENCES journal_book(jbid) ON DELETE CASCADE;

-- =======================
-- 5. CREAR ÍNDICES
-- =======================

CREATE INDEX idx_journal_book_details_jbid ON journal_book_details(jbid);
CREATE INDEX idx_journal_book_details_account ON journal_book_details(account_code);
CREATE INDEX idx_journal_book_entry_number ON journal_book(entry_number);

-- =======================
-- 6. CREAR FUNCIONES (SIN USAR TRIGGERS AÚN)
-- =======================

-- Función básica para actualizar totales
CREATE OR REPLACE FUNCTION update_journal_book_totals(p_jbid VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
    v_is_balanced BOOLEAN;
BEGIN
    -- Calcular totales
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_book_details
    WHERE jbid = p_jbid;
    
    v_is_balanced := ABS(v_total_debit - v_total_credit) < 0.01;
    
    -- Actualizar encabezado
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
    
    -- Generar ID y número
    v_jbid := 'JB' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    
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
    
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 8. CREAR ASIENTOS DE EJEMPLO
-- =======================

-- Ejemplo 1: Venta
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
) AS venta_jbid;

-- Ejemplo 2: Compra
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
) AS compra_jbid;

-- =======================
-- 9. CREAR TRIGGER (DESPUÉS DE TODO LO DEMÁS)
-- =======================

-- Función trigger
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

-- Crear trigger
CREATE TRIGGER trigger_journal_details_update
    AFTER INSERT OR UPDATE OR DELETE ON journal_book_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_journal_totals();

-- =======================
-- 10. CONSTRAINT FINAL Y VERIFICACIÓN
-- =======================

-- Constraint con tolerancia
ALTER TABLE journal_book ADD CONSTRAINT balanced_journal_entry 
CHECK (ABS(total_debit - total_credit) < 0.01);

-- Vista simple
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

-- Verificación final
SELECT 
    jbid,
    entry_number,
    description,
    total_debit,
    total_credit,
    is_balanced,
    CASE 
        WHEN is_balanced THEN '✅ BALANCEADO'
        ELSE '❌ DESBALANCEADO'
    END AS status
FROM journal_book 
WHERE status = 'active'
ORDER BY entry_number DESC;

SELECT 'SISTEMA CONTABLE MULTI-LÍNEA - IMPLEMENTACIÓN EXITOSA' AS resultado;