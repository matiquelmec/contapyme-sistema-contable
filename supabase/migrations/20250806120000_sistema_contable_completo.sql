-- =============================================
-- SISTEMA CONTABLE COMPLETO SEGÚN DIAGRAMA
-- Fecha: 6 de agosto, 2025  
-- Descripción: Implementación completa según imagen base de datos ejemplo.jpeg
-- Incluye: Plan de cuentas jerárquico, Libro Diario, Libros Compra/Venta, IVA
-- =============================================

-- =======================
-- 1. PLAN DE CUENTAS JERÁRQUICO (4 NIVELES)
-- =======================

-- Nivel 1: Títulos principales (1, 2, 3, 4, 5)
CREATE TABLE IF NOT EXISTS title_chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tcoaid VARCHAR(10) UNIQUE NOT NULL, -- PK original del diagrama
    code VARCHAR(2) UNIQUE NOT NULL, -- 1, 2, 3, 4, 5
    name VARCHAR(100) NOT NULL, -- ACTIVO, PASIVO, PATRIMONIO, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nivel 2: Mayores (1.1, 1.2, 2.1, etc.)
CREATE TABLE IF NOT EXISTS major_chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mcoaid VARCHAR(10) UNIQUE NOT NULL, -- PK original del diagrama
    tcoaid VARCHAR(10) NOT NULL, -- FK a title_chart_of_accounts
    code VARCHAR(10) UNIQUE NOT NULL, -- 1.1, 1.2, 2.1, etc.
    name VARCHAR(150) NOT NULL, -- ACTIVO CORRIENTE, ACTIVO NO CORRIENTE, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (tcoaid) REFERENCES title_chart_of_accounts(tcoaid) ON DELETE CASCADE
);

-- Nivel 3: Sub-cuentas (1.1.1, 1.1.2, etc.)
CREATE TABLE IF NOT EXISTS sub_chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sucoaid VARCHAR(15) UNIQUE NOT NULL, -- PK original del diagrama
    mcoaid VARCHAR(10) NOT NULL, -- FK a major_chart_of_accounts
    code VARCHAR(15) UNIQUE NOT NULL, -- 1.1.1, 1.1.2, etc.
    name VARCHAR(200) NOT NULL, -- Caja, Bancos, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (mcoaid) REFERENCES major_chart_of_accounts(mcoaid) ON DELETE CASCADE
);

-- Nivel 4: Específicas (cuentas imputables finales)
CREATE TABLE IF NOT EXISTS specific_chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spcoaid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    sucoaid VARCHAR(15) NOT NULL, -- FK a sub_chart_of_accounts
    code VARCHAR(20) UNIQUE NOT NULL, -- 1.1.1.001, 1.1.1.002, etc.
    name VARCHAR(255) NOT NULL, -- Caja Pesos, Banco Estado, etc.
    is_fixed BOOLEAN DEFAULT false, -- Para marcar cuentas de activos fijos
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (sucoaid) REFERENCES sub_chart_of_accounts(sucoaid) ON DELETE CASCADE
);

-- =======================
-- 2. LIBRO DIARIO CENTRALIZADO
-- =======================

-- Tabla central del libro diario
CREATE TABLE IF NOT EXISTS journal_book (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jbid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    date DATE NOT NULL,
    debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    document_number VARCHAR(50), -- Número de documento soporte
    reference_type VARCHAR(50), -- COMPRA, VENTA, REMUNERACION, ACTIVO_FIJO, etc.
    reference_id UUID, -- ID del documento/liquidación/activo que originó el asiento
    status VARCHAR(20) DEFAULT 'active', -- active, reversed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT balanced_journal_entry CHECK (debit = credit)
);

-- =======================
-- 3. LIBROS DE COMPRA Y VENTA
-- =======================

-- Libro de Compras (resumen por período)
CREATE TABLE IF NOT EXISTS purchase_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    pdid VARCHAR(20) NOT NULL, -- FK a purchase_document
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    supplier_name VARCHAR(255),
    supplier_rut VARCHAR(12),
    total_net DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_iva DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    accounting_entry VARCHAR(20), -- FK a journal_book (jbid)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documentos de Compra (facturas, notas, etc.)
CREATE TABLE IF NOT EXISTS purchase_document (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    date DATE NOT NULL,
    folio VARCHAR(50) NOT NULL, -- Número de factura/documento
    supplier_name VARCHAR(255) NOT NULL,
    supplier_rut VARCHAR(12),
    document_type VARCHAR(50) DEFAULT 'FACTURA', -- FACTURA, NOTA_CREDITO, NOTA_DEBITO
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_rate DECIMAL(5,2) DEFAULT 19.00, -- % IVA (19% en Chile)
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Libro de Ventas (resumen por período)
CREATE TABLE IF NOT EXISTS sales_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    sdid VARCHAR(20) NOT NULL, -- FK a sale_document
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    client_name VARCHAR(255),
    client_rut VARCHAR(12),
    total_net DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_iva DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    accounting_entry VARCHAR(20), -- FK a journal_book (jbid)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documentos de Venta
CREATE TABLE IF NOT EXISTS sale_document (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sdid VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    date DATE NOT NULL,
    folio VARCHAR(50) NOT NULL, -- Número de factura/boleta
    client_name VARCHAR(255),
    client_rut VARCHAR(12),
    document_type VARCHAR(50) DEFAULT 'FACTURA', -- FACTURA, BOLETA, NOTA_CREDITO
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_rate DECIMAL(5,2) DEFAULT 19.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- 4. CONEXIÓN CON ACTIVOS FIJOS
-- =======================

-- Tabla de conexión activos fijos con journal_book
CREATE TABLE IF NOT EXISTS fixed_assets_entry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idfae VARCHAR(20) UNIQUE NOT NULL, -- PK original del diagrama
    name VARCHAR(255) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    document VARCHAR(100), -- Referencia al documento
    accounting_entry VARCHAR(20), -- FK a journal_book (jbid)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- 5. FOREIGN KEYS SEGÚN EL DIAGRAMA
-- =======================

-- Purchase ledger → Purchase document
ALTER TABLE purchase_ledger 
ADD CONSTRAINT fk_purchase_ledger_document 
FOREIGN KEY (pdid) REFERENCES purchase_document(pdid);

-- Purchase ledger → Journal book
ALTER TABLE purchase_ledger 
ADD CONSTRAINT fk_purchase_ledger_journal 
FOREIGN KEY (accounting_entry) REFERENCES journal_book(jbid);

-- Sales ledger → Sale document
ALTER TABLE sales_ledger 
ADD CONSTRAINT fk_sales_ledger_document 
FOREIGN KEY (sdid) REFERENCES sale_document(sdid);

-- Sales ledger → Journal book
ALTER TABLE sales_ledger 
ADD CONSTRAINT fk_sales_ledger_journal 
FOREIGN KEY (accounting_entry) REFERENCES journal_book(jbid);

-- Fixed assets entry → Journal book
ALTER TABLE fixed_assets_entry 
ADD CONSTRAINT fk_fixed_assets_journal 
FOREIGN KEY (accounting_entry) REFERENCES journal_book(jbid);

-- =======================
-- 6. ÍNDICES PARA PERFORMANCE
-- =======================

-- Plan de cuentas
CREATE INDEX IF NOT EXISTS idx_title_chart_code ON title_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_major_chart_code ON major_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_sub_chart_code ON sub_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_specific_chart_code ON specific_chart_of_accounts(code);

-- Journal book
CREATE INDEX IF NOT EXISTS idx_journal_book_date ON journal_book(date);
CREATE INDEX IF NOT EXISTS idx_journal_book_reference ON journal_book(reference_type, reference_id);

-- Purchase/Sales
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_period ON purchase_ledger(period);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_period ON sales_ledger(period);
CREATE INDEX IF NOT EXISTS idx_purchase_document_date ON purchase_document(date);
CREATE INDEX IF NOT EXISTS idx_sale_document_date ON sale_document(date);

-- =======================
-- 7. FUNCIONES AUXILIARES
-- =======================

-- Función para generar ID secuencial por tabla
CREATE OR REPLACE FUNCTION generate_sequential_id(table_prefix VARCHAR(10))
RETURNS VARCHAR(20) AS $$
DECLARE
    next_number INTEGER;
    formatted_id VARCHAR(20);
BEGIN
    -- Esta es una implementación simple, podrías mejorarlo con secuencias específicas por tabla
    SELECT EXTRACT(EPOCH FROM NOW())::INTEGER INTO next_number;
    formatted_id := table_prefix || LPAD(next_number::TEXT, 10, '0');
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Función para crear asiento en journal_book desde compras
CREATE OR REPLACE FUNCTION create_purchase_journal_entry(
    p_pdid VARCHAR(20),
    p_net_amount DECIMAL(15,2),
    p_iva_amount DECIMAL(15,2),
    p_total_amount DECIMAL(15,2),
    p_description TEXT
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_jbid VARCHAR(20);
BEGIN
    -- Generar ID para journal_book
    v_jbid := generate_sequential_id('JB');
    
    -- Crear asiento en journal_book
    INSERT INTO journal_book (
        jbid, date, debit, credit, description, 
        reference_type, reference_id
    ) VALUES (
        v_jbid, CURRENT_DATE, p_total_amount, p_total_amount,
        p_description, 'COMPRA', 
        (SELECT id FROM purchase_document WHERE pdid = p_pdid)
    );
    
    RETURN v_jbid;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 8. DATOS INICIALES DEL PLAN DE CUENTAS
-- =======================

-- Insertar títulos principales
INSERT INTO title_chart_of_accounts (tcoaid, code, name) VALUES
('T001', '1', 'ACTIVO'),
('T002', '2', 'PASIVO'),
('T003', '3', 'PATRIMONIO'),
('T004', '4', 'INGRESOS'),
('T005', '5', 'GASTOS')
ON CONFLICT (tcoaid) DO NOTHING;

-- Insertar mayores
INSERT INTO major_chart_of_accounts (mcoaid, tcoaid, code, name) VALUES
('M001', 'T001', '1.1', 'ACTIVO CORRIENTE'),
('M002', 'T001', '1.2', 'ACTIVO NO CORRIENTE'),
('M003', 'T002', '2.1', 'PASIVO CORRIENTE'),
('M004', 'T002', '2.2', 'PASIVO NO CORRIENTE'),
('M005', 'T003', '3.1', 'CAPITAL'),
('M006', 'T004', '4.1', 'INGRESOS OPERACIONALES'),
('M007', 'T005', '5.1', 'GASTOS OPERACIONALES')
ON CONFLICT (mcoaid) DO NOTHING;

-- Insertar sub-cuentas
INSERT INTO sub_chart_of_accounts (sucoaid, mcoaid, code, name) VALUES
('S001', 'M001', '1.1.1', 'DISPONIBLE'),
('S002', 'M001', '1.1.2', 'DEUDORES POR VENTAS'),
('S003', 'M002', '1.2.1', 'PROPIEDAD, PLANTA Y EQUIPO'),
('S004', 'M002', '1.2.2', 'DEPRECIACIÓN ACUMULADA'),
('S005', 'M003', '2.1.1', 'PROVEEDORES'),
('S006', 'M003', '2.1.2', 'IVA DÉBITO FISCAL'),
('S007', 'M003', '2.1.3', 'IVA CRÉDITO FISCAL'),
('S008', 'M006', '4.1.1', 'VENTAS'),
('S009', 'M007', '5.1.1', 'COSTO DE VENTAS'),
('S010', 'M007', '5.1.2', 'GASTOS DE ADMINISTRACIÓN'),
('S011', 'M007', '5.1.3', 'GASTOS DE REMUNERACIONES')
ON CONFLICT (sucoaid) DO NOTHING;

-- Insertar cuentas específicas (imputables)
INSERT INTO specific_chart_of_accounts (spcoaid, sucoaid, code, name, is_fixed) VALUES
-- Disponible
('SP001', 'S001', '1.1.1.001', 'Caja', false),
('SP002', 'S001', '1.1.1.002', 'Banco Estado', false),
('SP003', 'S001', '1.1.1.003', 'Banco Chile', false),

-- Activos Fijos
('SP004', 'S003', '1.2.1.001', 'Equipos de Computación', true),
('SP005', 'S003', '1.2.1.002', 'Muebles y Enseres', true),
('SP006', 'S003', '1.2.1.003', 'Equipos de Oficina', true),
('SP007', 'S003', '1.2.1.004', 'Vehículos', true),

-- Depreciación Acumulada  
('SP008', 'S004', '1.2.2.001', 'Dep. Acum. Equipos Computación', true),
('SP009', 'S004', '1.2.2.002', 'Dep. Acum. Muebles y Enseres', true),
('SP010', 'S004', '1.2.2.003', 'Dep. Acum. Equipos Oficina', true),
('SP011', 'S004', '1.2.2.004', 'Dep. Acum. Vehículos', true),

-- IVA
('SP012', 'S006', '2.1.2.001', 'IVA Débito Fiscal', false),
('SP013', 'S007', '2.1.3.001', 'IVA Crédito Fiscal', false),

-- Ventas
('SP014', 'S008', '4.1.1.001', 'Ventas Nacionales', false),
('SP015', 'S008', '4.1.1.002', 'Ventas Exportación', false),

-- Gastos
('SP016', 'S009', '5.1.1.001', 'Costo de Mercaderías', false),
('SP017', 'S010', '5.1.2.001', 'Gastos Generales', false),
('SP018', 'S010', '5.1.2.002', 'Gasto Depreciación', false),
('SP019', 'S011', '5.1.3.001', 'Sueldos y Salarios', false),
('SP020', 'S011', '5.1.3.002', 'Leyes Sociales', false)

ON CONFLICT (spcoaid) DO NOTHING;

-- =======================
-- 9. MIGRACIÓN DE DATOS EXISTENTES (OPCIONAL)
-- =======================

-- Comentario: Aquí podrías agregar scripts para migrar desde chart_of_accounts
-- y accounting_entries existentes hacia el nuevo sistema

-- Mensaje final
SELECT 'SISTEMA CONTABLE COMPLETO IMPLEMENTADO - Base según diagrama' AS resultado;