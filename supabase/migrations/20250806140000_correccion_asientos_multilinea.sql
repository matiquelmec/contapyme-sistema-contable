-- =============================================
-- CORRECCIÓN SISTEMA CONTABLE: ASIENTOS MULTI-LÍNEA
-- Fecha: 6 de agosto, 2025  
-- Descripción: Corrección para asientos contables reales con múltiples líneas
-- Problema: Cada asiento tenía debit = credit (incorrecto)
-- Solución: Asientos con múltiples líneas donde total débito = total crédito
-- =============================================

-- =======================
-- 1. ELIMINAR CONSTRAINT INCORRECTO
-- =======================

-- Eliminar la restricción que fuerza debit = credit en cada línea
ALTER TABLE journal_book DROP CONSTRAINT IF EXISTS balanced_journal_entry;

-- =======================
-- 2. MODIFICAR TABLA JOURNAL_BOOK
-- =======================

-- Convertir journal_book en tabla de encabezado de asientos
ALTER TABLE journal_book DROP COLUMN IF EXISTS debit;
ALTER TABLE journal_book DROP COLUMN IF EXISTS credit;

-- Agregar campos de control de asiento
ALTER TABLE journal_book ADD COLUMN IF NOT EXISTS total_debit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN IF NOT EXISTS total_credit DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE journal_book ADD COLUMN IF NOT EXISTS entry_number INTEGER;
ALTER TABLE journal_book ADD COLUMN IF NOT EXISTS is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED;

-- Agregar constraint correcto: total_debit = total_credit por asiento
ALTER TABLE journal_book ADD CONSTRAINT balanced_journal_entry 
CHECK (total_debit = total_credit);

-- =======================
-- 3. CREAR TABLA DE DETALLES DE ASIENTOS
-- =======================

-- Tabla para las líneas individuales de cada asiento
CREATE TABLE IF NOT EXISTS journal_book_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jbid VARCHAR(20) NOT NULL, -- FK a journal_book
    line_number INTEGER NOT NULL, -- Número de línea dentro del asiento
    account_code VARCHAR(20), -- Código de cuenta contable
    account_name VARCHAR(255), -- Nombre de la cuenta (desnormalizado)
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT, -- Descripción específica de esta línea
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: cada línea tiene SOLO débito O SOLO crédito
    CONSTRAINT single_amount_per_line CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    
    -- FK a journal_book
    FOREIGN KEY (jbid) REFERENCES journal_book(jbid) ON DELETE CASCADE
);

-- =======================
-- 4. ÍNDICES PARA PERFORMANCE
-- =======================

CREATE INDEX IF NOT EXISTS idx_journal_book_details_jbid ON journal_book_details(jbid);
CREATE INDEX IF NOT EXISTS idx_journal_book_details_account ON journal_book_details(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_book_entry_number ON journal_book(entry_number);

-- =======================
-- 5. FUNCIÓN PARA VALIDAR Y ACTUALIZAR TOTALES
-- =======================

-- Función que recalcula los totales de un asiento
CREATE OR REPLACE FUNCTION update_journal_book_totals(p_jbid VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_total_debit DECIMAL(15,2);
    v_total_credit DECIMAL(15,2);
BEGIN
    -- Calcular totales desde las líneas de detalle
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_book_details
    WHERE jbid = p_jbid;
    
    -- Actualizar el encabezado
    UPDATE journal_book
    SET 
        total_debit = v_total_debit,
        total_credit = v_total_credit
    WHERE jbid = p_jbid;
    
    -- Retornar si está balanceado
    RETURN v_total_debit = v_total_credit;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 6. TRIGGER AUTOMÁTICO PARA MANTENER TOTALES
-- =======================

-- Función trigger para actualizar totales automáticamente
CREATE OR REPLACE FUNCTION trigger_update_journal_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar totales del asiento afectado
    IF TG_OP = 'DELETE' THEN
        PERFORM update_journal_book_totals(OLD.jbid);
        RETURN OLD;
    ELSE
        PERFORM update_journal_book_totals(NEW.jbid);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_journal_details_update ON journal_book_details;
CREATE TRIGGER trigger_journal_details_update
    AFTER INSERT OR UPDATE OR DELETE ON journal_book_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_journal_totals();

-- =======================
-- 7. FUNCIÓN PARA CREAR ASIENTOS COMPLETOS
-- =======================

-- Función para crear un asiento contable completo con múltiples líneas
CREATE OR REPLACE FUNCTION create_complete_journal_entry(
    p_date DATE,
    p_description TEXT,
    p_document_number VARCHAR(50),
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_entry_lines JSONB -- Array de líneas: [{account_code, account_name, debit, credit, description}]
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
    
    -- Calcular totales
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_entry_lines)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit_amount')::DECIMAL(15,2), 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit_amount')::DECIMAL(15,2), 0);
    END LOOP;
    
    -- Validar que esté balanceado
    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Asiento desbalanceado: Débito=% Crédito=%', v_total_debit, v_total_credit;
    END IF;
    
    -- Crear encabezado del asiento
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
            v_line->>'description'
        );
        
        v_line_number := v_line_number + 1;
    END LOOP;
    
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 8. DATOS DE EJEMPLO CORRECTOS
-- =======================

-- Crear un asiento de ejemplo: Venta $119.000
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
);

-- Crear un asiento de ejemplo: Compra $59.500
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
);

-- =======================
-- 9. VISTA PARA CONSULTAS SIMPLES
-- =======================

-- Vista que muestra el libro diario en formato tradicional
CREATE OR REPLACE VIEW journal_book_view AS
SELECT 
    jb.jbid,
    jb.entry_number,
    jb.date,
    jb.description AS entry_description,
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
    jbd.description AS line_description,
    jb.created_at
FROM journal_book jb
LEFT JOIN journal_book_details jbd ON jb.jbid = jbd.jbid
ORDER BY jb.entry_number DESC, jbd.line_number ASC;

-- Mensaje final
SELECT 'SISTEMA CONTABLE CORREGIDO - Asientos multi-línea implementados' AS resultado;