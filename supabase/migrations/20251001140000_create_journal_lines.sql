-- Migración: Crear tabla journal_lines
-- Fecha: 2025-10-01 14:00:00
-- Descripción: Crea la tabla journal_lines para las líneas de los asientos contables

-- Crear tabla journal_lines
CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT journal_lines_amounts_check CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  ),
  CONSTRAINT journal_lines_amounts_positive CHECK (
    debit_amount >= 0 AND credit_amount >= 0
  )
);

-- Indices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_lines_created_at ON journal_lines(created_at);

-- RLS (Row Level Security) para multi-tenancy
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver líneas de asientos de sus empresas
CREATE POLICY "Users can view journal lines from their companies" ON journal_lines
FOR SELECT USING (
  journal_entry_id IN (
    SELECT je.id
    FROM journal_entries je
    JOIN user_companies uc ON je.company_id = uc.company_id
    WHERE uc.user_id = auth.uid()
  )
);

-- Política: Los usuarios solo pueden insertar líneas en asientos de sus empresas
CREATE POLICY "Users can insert journal lines for their companies" ON journal_lines
FOR INSERT WITH CHECK (
  journal_entry_id IN (
    SELECT je.id
    FROM journal_entries je
    JOIN user_companies uc ON je.company_id = uc.company_id
    WHERE uc.user_id = auth.uid()
  )
);

-- Política: Los usuarios solo pueden actualizar líneas de asientos de sus empresas
CREATE POLICY "Users can update journal lines from their companies" ON journal_lines
FOR UPDATE USING (
  journal_entry_id IN (
    SELECT je.id
    FROM journal_entries je
    JOIN user_companies uc ON je.company_id = uc.company_id
    WHERE uc.user_id = auth.uid()
  )
);

-- Política: Los usuarios solo pueden eliminar líneas de asientos de sus empresas
CREATE POLICY "Users can delete journal lines from their companies" ON journal_lines
FOR DELETE USING (
  journal_entry_id IN (
    SELECT je.id
    FROM journal_entries je
    JOIN user_companies uc ON je.company_id = uc.company_id
    WHERE uc.user_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_journal_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_lines_updated_at_trigger
  BEFORE UPDATE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_lines_updated_at();

-- Comentarios de documentación
COMMENT ON TABLE journal_lines IS 'Líneas individuales de los asientos contables';
COMMENT ON COLUMN journal_lines.journal_entry_id IS 'ID del asiento contable padre';
COMMENT ON COLUMN journal_lines.account_code IS 'Código de la cuenta contable';
COMMENT ON COLUMN journal_lines.account_name IS 'Nombre de la cuenta contable';
COMMENT ON COLUMN journal_lines.debit_amount IS 'Monto del débito (positivo)';
COMMENT ON COLUMN journal_lines.credit_amount IS 'Monto del crédito (positivo)';
COMMENT ON COLUMN journal_lines.description IS 'Descripción de la línea del asiento';
COMMENT ON COLUMN journal_lines.sort_order IS 'Orden de visualización de las líneas';

-- Verificación final
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'journal_lines'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Tabla journal_lines creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla journal_lines no fue creada';
  END IF;
END $$;