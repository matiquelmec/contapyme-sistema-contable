-- ==========================================
-- MIGRACIÓN LIBRO DIARIO - CONTAPYME
-- Integración con F29, RCV y Activos Fijos
-- ==========================================

-- Crear tabla principal del libro diario
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'demo-user',
  company_id TEXT DEFAULT 'demo-company',
  
  -- Información básica del asiento
  entry_number SERIAL,                        -- Número correlativo del asiento
  entry_date DATE NOT NULL,                   -- Fecha del asiento contable
  description TEXT NOT NULL,                  -- Descripción/concepto del asiento
  reference VARCHAR(100),                     -- Referencia (número documento, etc)
  
  -- Tipo y origen del asiento
  entry_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, f29, rcv, fixed_asset, automatic
  source_type VARCHAR(50),                    -- f29_analysis, rcv_analysis, asset_depreciation, manual
  source_id UUID,                             -- ID del documento/análisis origen
  source_period VARCHAR(6),                   -- Período origen (YYYYMM)
  
  -- Control de estado
  status VARCHAR(20) DEFAULT 'draft',         -- draft, approved, posted, cancelled
  approved_by TEXT,                           -- Usuario que aprobó
  approved_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,        -- Fecha de contabilización definitiva
  
  -- Totales (para validación)
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_by TEXT,
  
  -- Constraints
  CONSTRAINT valid_totals CHECK (total_debit = total_credit),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'approved', 'posted', 'cancelled')),
  CONSTRAINT valid_entry_type CHECK (entry_type IN ('manual', 'f29', 'rcv', 'fixed_asset', 'automatic'))
);

-- Crear tabla de detalles del libro diario (debe-haber)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Información contable
  account_code VARCHAR(20) NOT NULL,          -- Código cuenta contable
  account_name VARCHAR(200) NOT NULL,        -- Nombre cuenta contable
  line_number INTEGER NOT NULL,              -- Orden línea dentro del asiento
  
  -- Importes
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Descripción específica de la línea
  line_description TEXT,
  reference VARCHAR(100),                     -- Referencia específica de la línea
  
  -- Información adicional
  cost_center VARCHAR(50),                    -- Centro de costo
  analytical_account VARCHAR(50),             -- Cuenta analítica
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- Crear tabla de plantillas de asientos automáticos
CREATE TABLE IF NOT EXISTS journal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL,        -- f29_iva, f29_ventas, rcv_compras, asset_depreciation
  description TEXT,
  
  -- Configuración de la plantilla (JSON)
  template_config JSONB NOT NULL DEFAULT '{}',
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de configuración del plan de cuentas para libro diario
CREATE TABLE IF NOT EXISTS journal_account_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Mapeo origen -> cuenta contable
  source_type VARCHAR(50) NOT NULL,          -- f29, rcv, fixed_asset
  source_field VARCHAR(100) NOT NULL,       -- codigo_538, ventas_netas, depreciation, etc
  account_code VARCHAR(20) NOT NULL,        -- Código cuenta contable destino
  
  -- Configuración
  is_debit BOOLEAN NOT NULL,                 -- true=debe, false=haber
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint única
  UNIQUE(source_type, source_field)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(source_period);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_lines_amounts ON journal_entry_lines(debit_amount, credit_amount);

-- Crear función para actualizar totales del asiento
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries 
  SET 
    total_debit = (
      SELECT COALESCE(SUM(debit_amount), 0) 
      FROM journal_entry_lines 
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    total_credit = (
      SELECT COALESCE(SUM(credit_amount), 0) 
      FROM journal_entry_lines 
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para mantener totales actualizados
DROP TRIGGER IF EXISTS trigger_update_totals_on_insert ON journal_entry_lines;
CREATE TRIGGER trigger_update_totals_on_insert
  AFTER INSERT ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_journal_entry_totals();

DROP TRIGGER IF EXISTS trigger_update_totals_on_update ON journal_entry_lines;
CREATE TRIGGER trigger_update_totals_on_update
  AFTER UPDATE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_journal_entry_totals();

DROP TRIGGER IF EXISTS trigger_update_totals_on_delete ON journal_entry_lines;
CREATE TRIGGER trigger_update_totals_on_delete
  AFTER DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_journal_entry_totals();

-- Insertar plantillas base para asientos automáticos
INSERT INTO journal_templates (template_name, template_type, description, template_config) VALUES
(
  'Asiento IVA desde F29',
  'f29_iva',
  'Plantilla para registrar IVA débito y crédito fiscal desde análisis F29',
  '{
    "accounts": [
      {"field": "iva_debito", "account": "11070001", "type": "debit", "name": "IVA Débito Fiscal"},
      {"field": "iva_credito", "account": "21050001", "type": "credit", "name": "IVA Crédito Fiscal"}
    ],
    "description_template": "Reg. IVA período {period} según F29"
  }'
),
(
  'Ventas desde F29',
  'f29_ventas',
  'Plantilla para registrar ventas netas desde análisis F29',
  '{
    "accounts": [
      {"field": "ventas_netas", "account": "41010001", "type": "credit", "name": "Ventas Netas"},
      {"field": "iva_debito", "account": "11070001", "type": "debit", "name": "IVA Débito Fiscal"}
    ],
    "description_template": "Reg. ventas período {period} según F29"
  }'
),
(
  'Compras desde RCV',
  'rcv_compras',
  'Plantilla para registrar compras desde análisis RCV',
  '{
    "accounts": [
      {"field": "monto_neto", "account": "51010001", "type": "debit", "name": "Compras"},
      {"field": "iva_credito", "account": "11070002", "type": "debit", "name": "IVA Crédito Fiscal"},
      {"field": "total_pagado", "account": "21010001", "type": "credit", "name": "Proveedores"}
    ],
    "description_template": "Reg. compras según RCV {period}"
  }'
),
(
  'Depreciación Activos Fijos',
  'asset_depreciation',
  'Plantilla para registrar depreciación mensual de activos fijos',
  '{
    "accounts": [
      {"field": "depreciation_expense", "account": "61010001", "type": "debit", "name": "Gasto Depreciación"},
      {"field": "accumulated_depreciation", "account": "13020001", "type": "credit", "name": "Depreciación Acumulada"}
    ],
    "description_template": "Depreciación mensual activos fijos {period}"
  }'
)
ON CONFLICT DO NOTHING;

-- Insertar mapeos base de cuentas contables
INSERT INTO journal_account_mapping (source_type, source_field, account_code, is_debit, description) VALUES
-- Mapeos F29
('f29', 'iva_debito', '11070001', true, 'IVA Débito Fiscal'),
('f29', 'iva_credito', '21050001', false, 'IVA Crédito Fiscal por Pagar'),
('f29', 'ventas_netas', '41010001', false, 'Ingresos por Ventas'),
('f29', 'ppm', '21050002', false, 'PPM por Pagar'),

-- Mapeos RCV
('rcv', 'monto_neto', '51010001', true, 'Compras de Mercaderías'),
('rcv', 'iva_credito', '11070002', true, 'IVA Crédito Fiscal'),
('rcv', 'total_facturado', '21010001', false, 'Cuentas por Pagar Proveedores'),

-- Mapeos Activos Fijos
('fixed_asset', 'purchase_value', '13010001', true, 'Activos Fijos'),
('fixed_asset', 'depreciation_expense', '61010001', true, 'Gasto por Depreciación'),
('fixed_asset', 'accumulated_depreciation', '13020001', false, 'Depreciación Acumulada')
ON CONFLICT DO NOTHING;

-- Función para generar asientos automáticos desde F29
CREATE OR REPLACE FUNCTION generate_journal_entries_from_f29(
  p_f29_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_f29_record RECORD;
  v_journal_entry_id UUID;
  v_line_number INTEGER := 1;
BEGIN
  -- Obtener datos del F29
  SELECT * INTO v_f29_record FROM f29_forms WHERE id = p_f29_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'F29 no encontrado: %', p_f29_id;
  END IF;
  
  -- Crear asiento principal
  INSERT INTO journal_entries (
    entry_date,
    description,
    reference,
    entry_type,
    source_type,
    source_id,
    source_period,
    status
  ) VALUES (
    p_entry_date,
    'Registro contable período ' || v_f29_record.period || ' según F29',
    'F29-' || v_f29_record.period,
    'f29',
    'f29_analysis',
    p_f29_id,
    v_f29_record.period,
    'draft'
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Registrar IVA Débito Fiscal (si > 0)
  IF v_f29_record.iva_debito > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      debit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '11070001', 'IVA Débito Fiscal', v_line_number,
      v_f29_record.iva_debito, 'IVA Débito período ' || v_f29_record.period
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Registrar IVA Crédito Fiscal (si > 0)
  IF v_f29_record.iva_credito > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      credit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '21050001', 'IVA Crédito Fiscal', v_line_number,
      v_f29_record.iva_credito, 'IVA Crédito período ' || v_f29_record.period
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Registrar Ventas Netas (si > 0)
  IF v_f29_record.ventas_netas > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      credit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '41010001', 'Ingresos por Ventas', v_line_number,
      v_f29_record.ventas_netas, 'Ventas netas período ' || v_f29_record.period
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  -- Registrar PPM (si > 0)
  IF v_f29_record.ppm > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      credit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '21050002', 'PPM por Pagar', v_line_number,
      v_f29_record.ppm, 'PPM período ' || v_f29_record.period
    );
    v_line_number := v_line_number + 1;
  END IF;
  
  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Función para generar asientos desde activos fijos (depreciación)
CREATE OR REPLACE FUNCTION generate_depreciation_entries(
  p_period VARCHAR(6), -- YYYYMM
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_journal_entry_id UUID;
  v_asset_record RECORD;
  v_line_number INTEGER := 1;
  v_total_depreciation DECIMAL(15,2) := 0;
BEGIN
  -- Crear asiento principal
  INSERT INTO journal_entries (
    entry_date,
    description,
    reference,
    entry_type,
    source_type,
    source_period,
    status
  ) VALUES (
    p_entry_date,
    'Depreciación mensual activos fijos período ' || p_period,
    'DEP-' || p_period,
    'fixed_asset',
    'asset_depreciation',
    p_period,
    'draft'
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Procesar cada activo fijo activo
  FOR v_asset_record IN 
    SELECT 
      id, name, monthly_depreciation, account_code,
      accumulated_depreciation_account
    FROM fixed_assets 
    WHERE status = 'active' 
    AND monthly_depreciation > 0
  LOOP
    -- Registrar gasto por depreciación (DEBE)
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      debit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '61010001', 'Gasto por Depreciación', v_line_number,
      v_asset_record.monthly_depreciation, 'Depreciación ' || v_asset_record.name
    );
    v_line_number := v_line_number + 1;
    
    -- Acumular total
    v_total_depreciation := v_total_depreciation + v_asset_record.monthly_depreciation;
  END LOOP;
  
  -- Registrar depreciación acumulada total (HABER)
  IF v_total_depreciation > 0 THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      credit_amount, line_description
    ) VALUES (
      v_journal_entry_id, '13020001', 'Depreciación Acumulada', v_line_number,
      v_total_depreciation, 'Depreciación acumulada período ' || p_period
    );
  END IF;
  
  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener libro diario con filtros
CREATE OR REPLACE FUNCTION get_journal_entries(
  p_company_id TEXT DEFAULT 'demo-company',
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_entry_type VARCHAR(50) DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  entry_number INTEGER,
  entry_date DATE,
  description TEXT,
  reference VARCHAR(100),
  entry_type VARCHAR(50),
  source_type VARCHAR(50),
  status VARCHAR(20),
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  lines_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.reference,
    je.entry_type,
    je.source_type,
    je.status,
    je.total_debit,
    je.total_credit,
    COUNT(jel.id) as lines_count,
    je.created_at
  FROM journal_entries je
  LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
  WHERE je.company_id = p_company_id
    AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
    AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
    AND (p_entry_type IS NULL OR je.entry_type = p_entry_type)
    AND (p_status IS NULL OR je.status = p_status)
  GROUP BY je.id
  ORDER BY je.entry_date DESC, je.entry_number DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener estadísticas del libro diario
CREATE OR REPLACE FUNCTION get_journal_statistics(
  p_company_id TEXT DEFAULT 'demo-company',
  p_period VARCHAR(6) DEFAULT NULL
)
RETURNS TABLE(
  total_entries BIGINT,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  entries_by_type JSONB,
  entries_by_status JSONB,
  monthly_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_entries,
    COALESCE(SUM(je.total_debit), 0) as total_debit,
    COALESCE(SUM(je.total_credit), 0) as total_credit,
    
    -- Conteo por tipo
    (SELECT jsonb_object_agg(entry_type, count) 
     FROM (
       SELECT entry_type, COUNT(*) as count 
       FROM journal_entries 
       WHERE company_id = p_company_id
       GROUP BY entry_type
     ) t) as entries_by_type,
    
    -- Conteo por estado  
    (SELECT jsonb_object_agg(status, count)
     FROM (
       SELECT status, COUNT(*) as count
       FROM journal_entries
       WHERE company_id = p_company_id  
       GROUP BY status
     ) s) as entries_by_status,
    
    -- Tendencia mensual últimos 6 meses
    (SELECT jsonb_agg(
       jsonb_build_object(
         'month', to_char(month_date, 'YYYY-MM'),
         'entries', entry_count,
         'total_amount', total_amount
       )
     )
     FROM (
       SELECT 
         date_trunc('month', entry_date) as month_date,
         COUNT(*) as entry_count,
         SUM(total_debit) as total_amount
       FROM journal_entries
       WHERE company_id = p_company_id
         AND entry_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY date_trunc('month', entry_date)
       ORDER BY month_date DESC
       LIMIT 6
     ) m) as monthly_trend
     
  FROM journal_entries je
  WHERE je.company_id = p_company_id
    AND (p_period IS NULL OR je.source_period = p_period);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at en journal_entries
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en journal_templates  
DROP TRIGGER IF EXISTS update_journal_templates_updated_at ON journal_templates;
CREATE TRIGGER update_journal_templates_updated_at
  BEFORE UPDATE ON journal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE journal_entries IS 'Libro diario - Asientos contables principales';
COMMENT ON TABLE journal_entry_lines IS 'Líneas de detalle del libro diario (debe/haber)';
COMMENT ON TABLE journal_templates IS 'Plantillas para generación automática de asientos';
COMMENT ON TABLE journal_account_mapping IS 'Mapeo de campos origen a cuentas contables';

COMMENT ON COLUMN journal_entries.entry_type IS 'Tipo: manual, f29, rcv, fixed_asset, automatic';
COMMENT ON COLUMN journal_entries.source_type IS 'Origen específico: f29_analysis, rcv_analysis, asset_depreciation';
COMMENT ON COLUMN journal_entries.status IS 'Estado: draft, approved, posted, cancelled';

-- Temporalmente deshabilitar constraint para insertar datos demo
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS valid_totals;

-- Insertar datos demo para pruebas
INSERT INTO journal_entries (
  entry_date, description, reference, entry_type, source_type, status
) VALUES 
(
  CURRENT_DATE - INTERVAL '1 day',
  'Asiento de prueba - Ventas del día',
  'VTA-001',
  'manual',
  NULL,
  'draft'
),
(
  CURRENT_DATE - INTERVAL '2 days', 
  'Registro IVA período 202408 según F29',
  'F29-202408',
  'f29',
  'f29_analysis',
  'approved'
);

-- Obtener los IDs de los asientos recién creados para insertar líneas
DO $$
DECLARE
  v_entry1_id UUID;
  v_entry2_id UUID;
BEGIN
  -- Obtener ID del primer asiento
  SELECT id INTO v_entry1_id 
  FROM journal_entries 
  WHERE reference = 'VTA-001' 
  LIMIT 1;
  
  -- Obtener ID del segundo asiento
  SELECT id INTO v_entry2_id 
  FROM journal_entries 
  WHERE reference = 'F29-202408' 
  LIMIT 1;
  
  -- Insertar líneas para el primer asiento (Ventas)
  IF v_entry1_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      debit_amount, credit_amount, line_description
    ) VALUES 
    (v_entry1_id, '11010001', 'Caja', 1, 119000, 0, 'Cobro ventas del día'),
    (v_entry1_id, '41010001', 'Ventas', 2, 0, 100000, 'Ventas netas del día'),
    (v_entry1_id, '21050001', 'IVA por Pagar', 3, 0, 19000, 'IVA débito fiscal');
  END IF;
  
  -- Insertar líneas para el segundo asiento (F29)
  IF v_entry2_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_code, account_name, line_number,
      debit_amount, credit_amount, line_description
    ) VALUES 
    (v_entry2_id, '11070001', 'IVA Débito Fiscal', 1, 4188643, 0, 'IVA débito período 202408'),
    (v_entry2_id, '21050001', 'IVA Crédito Fiscal', 2, 0, 4188643, 'IVA crédito período 202408');
  END IF;
END $$;

-- Rehabilitar constraint después de insertar datos balanceados
ALTER TABLE journal_entries ADD CONSTRAINT valid_totals CHECK (total_debit = total_credit);

-- Final del script
SELECT 'Migración libro diario completada exitosamente' as status;