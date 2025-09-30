-- ==========================================
-- MIGRACIÓN: PLAN DE CUENTAS IFRS
-- Sistema de cuentas contables basado en IFRS
-- ==========================================

-- Crear tabla de plan de cuentas
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Cuentas del sistema que no se pueden eliminar
  is_detail BOOLEAN DEFAULT true, -- Si es cuenta de detalle (se pueden hacer asientos)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Restricciones
  CONSTRAINT unique_account_code_per_company UNIQUE(company_id, code)
);

-- Índices para mejorar performance
CREATE INDEX idx_chart_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX idx_chart_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX idx_chart_accounts_code ON chart_of_accounts(code);
CREATE INDEX idx_chart_accounts_type ON chart_of_accounts(account_type);

-- Crear tabla para plantillas de plan de cuentas
CREATE TABLE IF NOT EXISTS chart_of_accounts_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  country_code VARCHAR(2) DEFAULT 'CL',
  is_default BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL, -- Estructura completa del plan en JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar plantilla demo basada en IFRS para PyMEs Chile
INSERT INTO chart_of_accounts_templates (name, description, is_default, template_data) VALUES 
('Plan de Cuentas IFRS PyMEs Chile', 'Plan de cuentas estándar basado en IFRS para pequeñas y medianas empresas en Chile', true, 
'{
  "accounts": [
    {
      "code": "1",
      "name": "ACTIVOS",
      "type": "asset",
      "level": 1,
      "is_detail": false,
      "children": [
        {
          "code": "1.1",
          "name": "ACTIVOS CORRIENTES",
          "type": "asset",
          "level": 2,
          "is_detail": false,
          "children": [
            {
              "code": "1.1.01",
              "name": "Efectivo y Equivalentes al Efectivo",
              "type": "asset",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "1.1.01.001", "name": "Caja", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.01.002", "name": "Banco Estado - Cuenta Corriente", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.01.003", "name": "Banco Santander - Cuenta Corriente", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.01.004", "name": "Fondos Mutuos", "type": "asset", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "1.1.02",
              "name": "Cuentas por Cobrar Comerciales",
              "type": "asset",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "1.1.02.001", "name": "Clientes Nacionales", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.02.002", "name": "Documentos por Cobrar", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.02.003", "name": "Deudores Varios", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.02.099", "name": "Provisión Deudores Incobrables", "type": "asset", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "1.1.03",
              "name": "Inventarios",
              "type": "asset",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "1.1.03.001", "name": "Mercaderías", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.03.002", "name": "Materias Primas", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.03.003", "name": "Productos en Proceso", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.03.004", "name": "Productos Terminados", "type": "asset", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "1.1.04",
              "name": "Activos por Impuestos Corrientes",
              "type": "asset",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "1.1.04.001", "name": "IVA Crédito Fiscal", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.04.002", "name": "PPM por Recuperar", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.1.04.003", "name": "Crédito SENCE", "type": "asset", "level": 4, "is_detail": true}
              ]
            }
          ]
        },
        {
          "code": "1.2",
          "name": "ACTIVOS NO CORRIENTES",
          "type": "asset",
          "level": 2,
          "is_detail": false,
          "children": [
            {
              "code": "1.2.01",
              "name": "Propiedades, Planta y Equipo",
              "type": "asset",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "1.2.01.001", "name": "Terrenos", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.2.01.002", "name": "Edificios", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.2.01.003", "name": "Maquinarias y Equipos", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.2.01.004", "name": "Vehículos", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.2.01.005", "name": "Muebles y Útiles", "type": "asset", "level": 4, "is_detail": true},
                {"code": "1.2.01.099", "name": "Depreciación Acumulada", "type": "asset", "level": 4, "is_detail": true}
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "2",
      "name": "PASIVOS",
      "type": "liability",
      "level": 1,
      "is_detail": false,
      "children": [
        {
          "code": "2.1",
          "name": "PASIVOS CORRIENTES",
          "type": "liability",
          "level": 2,
          "is_detail": false,
          "children": [
            {
              "code": "2.1.01",
              "name": "Cuentas por Pagar Comerciales",
              "type": "liability",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "2.1.01.001", "name": "Proveedores Nacionales", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.01.002", "name": "Documentos por Pagar", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.01.003", "name": "Acreedores Varios", "type": "liability", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "2.1.02",
              "name": "Pasivos por Impuestos Corrientes",
              "type": "liability",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "2.1.02.001", "name": "IVA Débito Fiscal", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.02.002", "name": "PPM por Pagar", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.02.003", "name": "Impuesto a la Renta por Pagar", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.02.004", "name": "Retenciones por Pagar", "type": "liability", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "2.1.03",
              "name": "Obligaciones con Empleados",
              "type": "liability",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "2.1.03.001", "name": "Remuneraciones por Pagar", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.03.002", "name": "Imposiciones por Pagar", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.1.03.003", "name": "Vacaciones por Pagar", "type": "liability", "level": 4, "is_detail": true}
              ]
            }
          ]
        },
        {
          "code": "2.2",
          "name": "PASIVOS NO CORRIENTES",
          "type": "liability",
          "level": 2,
          "is_detail": false,
          "children": [
            {
              "code": "2.2.01",
              "name": "Obligaciones Financieras",
              "type": "liability",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "2.2.01.001", "name": "Préstamos Bancarios Largo Plazo", "type": "liability", "level": 4, "is_detail": true},
                {"code": "2.2.01.002", "name": "Leasing Financiero", "type": "liability", "level": 4, "is_detail": true}
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "3",
      "name": "PATRIMONIO",
      "type": "equity",
      "level": 1,
      "is_detail": false,
      "children": [
        {
          "code": "3.1",
          "name": "CAPITAL",
          "type": "equity",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "3.1.01", "name": "Capital Social", "type": "equity", "level": 3, "is_detail": true},
            {"code": "3.1.02", "name": "Sobreprecio en Venta de Acciones", "type": "equity", "level": 3, "is_detail": true}
          ]
        },
        {
          "code": "3.2",
          "name": "RESERVAS",
          "type": "equity",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "3.2.01", "name": "Reserva Legal", "type": "equity", "level": 3, "is_detail": true},
            {"code": "3.2.02", "name": "Otras Reservas", "type": "equity", "level": 3, "is_detail": true}
          ]
        },
        {
          "code": "3.3",
          "name": "RESULTADOS ACUMULADOS",
          "type": "equity",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "3.3.01", "name": "Utilidades Acumuladas", "type": "equity", "level": 3, "is_detail": true},
            {"code": "3.3.02", "name": "Pérdidas Acumuladas", "type": "equity", "level": 3, "is_detail": true},
            {"code": "3.3.03", "name": "Resultado del Ejercicio", "type": "equity", "level": 3, "is_detail": true}
          ]
        }
      ]
    },
    {
      "code": "4",
      "name": "INGRESOS",
      "type": "income",
      "level": 1,
      "is_detail": false,
      "children": [
        {
          "code": "4.1",
          "name": "INGRESOS OPERACIONALES",
          "type": "income",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "4.1.01", "name": "Ventas de Mercaderías", "type": "income", "level": 3, "is_detail": true},
            {"code": "4.1.02", "name": "Ventas de Servicios", "type": "income", "level": 3, "is_detail": true},
            {"code": "4.1.03", "name": "Devoluciones sobre Ventas", "type": "income", "level": 3, "is_detail": true}
          ]
        },
        {
          "code": "4.2",
          "name": "OTROS INGRESOS",
          "type": "income",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "4.2.01", "name": "Ingresos Financieros", "type": "income", "level": 3, "is_detail": true},
            {"code": "4.2.02", "name": "Otros Ingresos No Operacionales", "type": "income", "level": 3, "is_detail": true}
          ]
        }
      ]
    },
    {
      "code": "5",
      "name": "COSTOS Y GASTOS",
      "type": "expense",
      "level": 1,
      "is_detail": false,
      "children": [
        {
          "code": "5.1",
          "name": "COSTO DE VENTAS",
          "type": "expense",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "5.1.01", "name": "Costo de Mercaderías Vendidas", "type": "expense", "level": 3, "is_detail": true},
            {"code": "5.1.02", "name": "Costo de Servicios", "type": "expense", "level": 3, "is_detail": true}
          ]
        },
        {
          "code": "5.2",
          "name": "GASTOS OPERACIONALES",
          "type": "expense",
          "level": 2,
          "is_detail": false,
          "children": [
            {
              "code": "5.2.01",
              "name": "Gastos de Personal",
              "type": "expense",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "5.2.01.001", "name": "Sueldos y Salarios", "type": "expense", "level": 4, "is_detail": true},
                {"code": "5.2.01.002", "name": "Leyes Sociales", "type": "expense", "level": 4, "is_detail": true},
                {"code": "5.2.01.003", "name": "Honorarios", "type": "expense", "level": 4, "is_detail": true}
              ]
            },
            {
              "code": "5.2.02",
              "name": "Gastos Generales",
              "type": "expense",
              "level": 3,
              "is_detail": false,
              "children": [
                {"code": "5.2.02.001", "name": "Arriendo", "type": "expense", "level": 4, "is_detail": true},
                {"code": "5.2.02.002", "name": "Servicios Básicos", "type": "expense", "level": 4, "is_detail": true},
                {"code": "5.2.02.003", "name": "Mantención y Reparaciones", "type": "expense", "level": 4, "is_detail": true},
                {"code": "5.2.02.004", "name": "Gastos de Oficina", "type": "expense", "level": 4, "is_detail": true}
              ]
            }
          ]
        },
        {
          "code": "5.3",
          "name": "GASTOS FINANCIEROS",
          "type": "expense",
          "level": 2,
          "is_detail": false,
          "children": [
            {"code": "5.3.01", "name": "Intereses Bancarios", "type": "expense", "level": 3, "is_detail": true},
            {"code": "5.3.02", "name": "Comisiones Bancarias", "type": "expense", "level": 3, "is_detail": true}
          ]
        }
      ]
    }
  ]
}');

-- Función para crear un plan de cuentas desde una plantilla
CREATE OR REPLACE FUNCTION create_chart_from_template(
  p_company_id UUID,
  p_template_id UUID,
  p_created_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_template_data JSONB;
  v_account JSONB;
BEGIN
  -- Obtener la plantilla
  SELECT template_data INTO v_template_data
  FROM chart_of_accounts_templates
  WHERE id = p_template_id;
  
  IF v_template_data IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Función recursiva para insertar cuentas
  PERFORM insert_accounts_recursive(
    p_company_id,
    p_created_by,
    v_template_data->'accounts',
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar para insertar cuentas recursivamente
CREATE OR REPLACE FUNCTION insert_accounts_recursive(
  p_company_id UUID,
  p_created_by UUID,
  p_accounts JSONB,
  p_parent_id UUID
) RETURNS VOID AS $$
DECLARE
  v_account JSONB;
  v_account_id UUID;
BEGIN
  FOR v_account IN SELECT * FROM jsonb_array_elements(p_accounts)
  LOOP
    -- Insertar la cuenta
    INSERT INTO chart_of_accounts (
      company_id,
      code,
      name,
      account_type,
      parent_id,
      level,
      is_detail,
      created_by
    ) VALUES (
      p_company_id,
      v_account->>'code',
      v_account->>'name',
      v_account->>'type',
      p_parent_id,
      (v_account->>'level')::INTEGER,
      COALESCE((v_account->>'is_detail')::BOOLEAN, true),
      p_created_by
    ) RETURNING id INTO v_account_id;
    
    -- Si tiene hijos, procesarlos recursivamente
    IF v_account->'children' IS NOT NULL THEN
      PERFORM insert_accounts_recursive(
        p_company_id,
        p_created_by,
        v_account->'children',
        v_account_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE
    ON chart_of_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Políticas de seguridad RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para chart_of_accounts
CREATE POLICY "Users can view their company accounts" ON chart_of_accounts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert accounts for their companies" ON chart_of_accounts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Users can update accounts for their companies" ON chart_of_accounts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Users can delete non-system accounts for their companies" ON chart_of_accounts
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role = 'admin'
        ) AND is_system = false
    );

-- Políticas para templates (solo lectura para todos)
CREATE POLICY "Anyone can view templates" ON chart_of_accounts_templates
    FOR SELECT USING (true);