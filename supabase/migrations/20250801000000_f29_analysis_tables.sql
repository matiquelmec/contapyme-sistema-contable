-- ==========================================
-- MIGRACIÓN F29 ANÁLISIS COMPARATIVO
-- Fecha: 1 Agosto 2025
-- Propósito: Tablas para análisis comparativo de múltiples F29
-- ==========================================

-- Tabla principal de formularios F29
CREATE TABLE f29_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Metadatos del archivo
  period VARCHAR(6) NOT NULL, -- 202401, 202402, etc.
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name VARCHAR(255),
  file_size INTEGER,
  
  -- Información básica extraída
  rut VARCHAR(20),
  folio VARCHAR(50),
  year INTEGER,
  month INTEGER,
  
  -- Datos extraídos (JSON para flexibilidad total)
  raw_data JSONB NOT NULL DEFAULT '{}',
  calculated_data JSONB NOT NULL DEFAULT '{}',
  
  -- Métricas principales (para queries rápidas sin JSON)
  ventas_netas DECIMAL(15,2) DEFAULT 0,
  compras_netas DECIMAL(15,2) DEFAULT 0,
  iva_debito DECIMAL(15,2) DEFAULT 0,        -- Código 538
  iva_credito DECIMAL(15,2) DEFAULT 0,       -- Código 511
  iva_determinado DECIMAL(15,2) DEFAULT 0,   -- 538 - 511
  ppm DECIMAL(15,2) DEFAULT 0,               -- Código 062
  remanente DECIMAL(15,2) DEFAULT 0,         -- Código 077
  total_a_pagar DECIMAL(15,2) DEFAULT 0,
  margen_bruto DECIMAL(15,2) DEFAULT 0,
  
  -- Códigos específicos F29 más comunes
  codigo_538 DECIMAL(15,2) DEFAULT 0,  -- Débito Fiscal
  codigo_511 DECIMAL(15,2) DEFAULT 0,  -- Crédito Fiscal
  codigo_563 DECIMAL(15,2) DEFAULT 0,  -- Ventas Netas
  codigo_062 DECIMAL(15,2) DEFAULT 0,  -- PPM
  codigo_077 DECIMAL(15,2) DEFAULT 0,  -- Remanente
  
  -- Validación y confianza
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed', 'manual_review')),
  validation_errors JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, period), -- Un F29 por período por empresa
  CHECK (period ~ '^[0-9]{6}$'), -- Formato YYYYMM
  CHECK (year >= 2020 AND year <= 2030),
  CHECK (month >= 1 AND month <= 12)
);

-- Tabla para análisis comparativos cachéados
CREATE TABLE f29_comparative_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Rango de períodos analizados
  period_start VARCHAR(6) NOT NULL,  -- 202301
  period_end VARCHAR(6) NOT NULL,    -- 202312
  period_range VARCHAR(20) GENERATED ALWAYS AS (period_start || '-' || period_end) STORED,
  
  -- Datos del análisis (JSON optimizado)
  analysis_data JSONB NOT NULL DEFAULT '{}',
  
  -- Métricas resumidas para queries rápidas
  total_periods INTEGER DEFAULT 0,
  avg_monthly_sales DECIMAL(15,2) DEFAULT 0,
  growth_rate DECIMAL(5,2) DEFAULT 0,
  best_month VARCHAR(6),
  worst_month VARCHAR(6),
  
  -- Insights automáticos generados
  insights JSONB DEFAULT '[]',
  trends JSONB DEFAULT '{}',
  seasonality JSONB DEFAULT '{}',
  anomalies JSONB DEFAULT '[]',
  
  -- Metadatos del análisis
  analysis_version VARCHAR(10) DEFAULT '1.0',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un análisis por empresa por rango de períodos
  UNIQUE(company_id, period_range)
);

-- Tabla para notificaciones de insights importantes
CREATE TABLE f29_insights_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo y contenido del insight
  insight_type VARCHAR(50) NOT NULL, -- 'growth', 'decline', 'anomaly', 'seasonal', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'alert', 'success')),
  
  -- Período relacionado
  related_period VARCHAR(6),
  related_f29_id UUID REFERENCES f29_forms(id) ON DELETE SET NULL,
  
  -- Estado de la notificación
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  
  -- Datos adicionales del insight
  insight_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES OPTIMIZADOS PARA PERFORMANCE
-- ==========================================

-- Índices principales para f29_forms
CREATE INDEX idx_f29_company_period ON f29_forms(company_id, period);
CREATE INDEX idx_f29_period ON f29_forms(period);
CREATE INDEX idx_f29_company_year_month ON f29_forms(company_id, year, month);
CREATE INDEX idx_f29_validation_status ON f29_forms(validation_status);
CREATE INDEX idx_f29_confidence ON f29_forms(confidence_score DESC);
CREATE INDEX idx_f29_upload_date ON f29_forms(upload_date DESC);

-- Índices para métricas (para análisis rápidos)
CREATE INDEX idx_f29_metrics_sales ON f29_forms(company_id, ventas_netas DESC);
CREATE INDEX idx_f29_metrics_margin ON f29_forms(company_id, margen_bruto DESC);
CREATE INDEX idx_f29_metrics_iva ON f29_forms(company_id, iva_determinado);

-- Índices para análisis comparativo
CREATE INDEX idx_f29_analysis_company ON f29_comparative_analysis(company_id);
CREATE INDEX idx_f29_analysis_period_range ON f29_comparative_analysis(period_range);
CREATE INDEX idx_f29_analysis_expires ON f29_comparative_analysis(expires_at);

-- Índices para notificaciones
CREATE INDEX idx_f29_notifications_user ON f29_insights_notifications(user_id, is_read);
CREATE INDEX idx_f29_notifications_company ON f29_insights_notifications(company_id, created_at DESC);

-- ==========================================
-- FUNCIONES AUXILIARES
-- ==========================================

-- Función para calcular métricas automáticamente
CREATE OR REPLACE FUNCTION calculate_f29_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Extraer valores de calculated_data JSON
  NEW.ventas_netas := COALESCE((NEW.calculated_data->>'codigo563')::DECIMAL(15,2), 0);
  NEW.iva_debito := COALESCE((NEW.calculated_data->>'codigo538')::DECIMAL(15,2), 0);
  NEW.iva_credito := COALESCE((NEW.calculated_data->>'codigo511')::DECIMAL(15,2), 0);
  NEW.ppm := COALESCE((NEW.calculated_data->>'codigo062')::DECIMAL(15,2), 0);
  NEW.remanente := COALESCE((NEW.calculated_data->>'codigo077')::DECIMAL(15,2), 0);
  
  -- Calcular valores derivados
  NEW.iva_determinado := NEW.iva_debito - NEW.iva_credito;
  NEW.compras_netas := CASE WHEN NEW.iva_debito > 0 THEN NEW.iva_debito / 0.19 ELSE 0 END;
  NEW.margen_bruto := NEW.ventas_netas - NEW.compras_netas;
  NEW.total_a_pagar := NEW.iva_determinado + NEW.ppm + NEW.remanente;
  
  -- Sincronizar códigos específicos
  NEW.codigo_538 := NEW.iva_debito;
  NEW.codigo_511 := NEW.iva_credito;
  NEW.codigo_563 := NEW.ventas_netas;
  NEW.codigo_062 := NEW.ppm;
  NEW.codigo_077 := NEW.remanente;
  
  -- Extraer año y mes del período
  NEW.year := SUBSTRING(NEW.period, 1, 4)::INTEGER;
  NEW.month := SUBSTRING(NEW.period, 5, 2)::INTEGER;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para cálculo automático
CREATE TRIGGER trigger_calculate_f29_metrics
  BEFORE INSERT OR UPDATE ON f29_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_f29_metrics();

-- Función para limpiar análisis expirados
CREATE OR REPLACE FUNCTION cleanup_expired_analysis()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM f29_comparative_analysis
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE f29_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_comparative_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE f29_insights_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para f29_forms
CREATE POLICY "Users can view own company F29 forms" ON f29_forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_forms.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert F29 forms for own companies" ON f29_forms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_forms.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company F29 forms" ON f29_forms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_forms.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own company F29 forms" ON f29_forms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_forms.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Políticas para análisis comparativo
CREATE POLICY "Users can view own company analysis" ON f29_comparative_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_comparative_analysis.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own company analysis" ON f29_comparative_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = f29_comparative_analysis.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Políticas para notificaciones
CREATE POLICY "Users can view own notifications" ON f29_insights_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications" ON f29_insights_notifications
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- TRIGGERS PARA ACTUALIZACIONES AUTOMÁTICAS
-- ==========================================

-- Aplicar trigger de updated_at a las nuevas tablas
CREATE TRIGGER update_f29_forms_updated_at BEFORE UPDATE ON f29_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_f29_analysis_updated_at BEFORE UPDATE ON f29_comparative_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_f29_notifications_updated_at BEFORE UPDATE ON f29_insights_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE f29_forms IS 'Almacena formularios F29 procesados con datos extraídos y calculados';
COMMENT ON TABLE f29_comparative_analysis IS 'Caché de análisis comparativos temporales de F29';
COMMENT ON TABLE f29_insights_notifications IS 'Notificaciones de insights importantes generados automáticamente';

COMMENT ON COLUMN f29_forms.period IS 'Período en formato YYYYMM (202401, 202402, etc.)';
COMMENT ON COLUMN f29_forms.confidence_score IS 'Confianza del parsing (0-100)';
COMMENT ON COLUMN f29_forms.raw_data IS 'Datos crudos extraídos del PDF';
COMMENT ON COLUMN f29_forms.calculated_data IS 'Datos procesados y validados';

COMMENT ON FUNCTION calculate_f29_metrics() IS 'Calcula automáticamente métricas derivadas de los datos F29';
COMMENT ON FUNCTION cleanup_expired_analysis() IS 'Limpia análisis comparativos expirados';