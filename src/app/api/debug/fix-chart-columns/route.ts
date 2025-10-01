import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/debug/fix-chart-columns
 * Agregar las columnas faltantes a chart_of_accounts
 */
export async function POST() {
  try {
    console.log('🔧 Agregando columnas faltantes a chart_of_accounts...');

    // Usar la empresa que ya existe en tu base de datos
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    const companyId = existingCompany?.id || '8033ee69-b420-4d91-ba0e-482f46cd6fce';

    // Datos para insertar (usando la estructura que tu aplicación espera)
    const accountsData = [
      {
        company_id: companyId,
        code: '1',
        name: 'ACTIVOS',
        account_type: 'Activo',
        level_type: 'Titulo',
        parent_code: null,
        level: 1,
        is_active: true,
        is_detail: false,
        description: 'Cuenta principal de activos'
      },
      {
        company_id: companyId,
        code: '1.1.1.001',
        name: 'Caja',
        account_type: 'Activo',
        level_type: 'Imputable',
        parent_code: '1.1.1',
        level: 4,
        is_active: true,
        is_detail: true,
        description: 'Dinero en efectivo'
      },
      {
        company_id: companyId,
        code: '2.1.3.002',
        name: 'IVA Débito Fiscal',
        account_type: 'Pasivo',
        level_type: 'Imputable',
        parent_code: '2.1.3',
        level: 4,
        is_active: true,
        is_detail: true,
        description: 'IVA por pagar al SII'
      },
      {
        company_id: companyId,
        code: '5.1.1.001',
        name: 'Ventas del Giro',
        account_type: 'Ingreso',
        level_type: 'Imputable',
        parent_code: '5.1.1',
        level: 4,
        is_active: true,
        is_detail: true,
        description: 'Ingresos por ventas principales'
      }
    ];

    // Intentar insertar directamente
    const { data: insertResult, error: insertError } = await supabase
      .from('chart_of_accounts')
      .insert(accountsData)
      .select();

    if (insertError) {
      console.log('❌ Error en inserción:', insertError.message);

      // Si falla, puede ser que la tabla no tenga las columnas correctas
      return NextResponse.json({
        success: false,
        error: insertError.message,
        diagnosis: 'Table exists but likely missing required columns',
        sql_fix: `
-- Si la tabla no tiene las columnas correctas, ejecuta esto en Supabase Dashboard:

-- Opción 1: Recrear la tabla con estructura correcta
DROP TABLE IF EXISTS public.chart_of_accounts;

CREATE TABLE public.chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  account_type VARCHAR(50) NOT NULL,
  level_type VARCHAR(20) DEFAULT 'Imputable',
  parent_code VARCHAR(20),
  level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_detail BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Crear índices
CREATE INDEX idx_chart_accounts_code ON public.chart_of_accounts(code);
CREATE INDEX idx_chart_accounts_company ON public.chart_of_accounts(company_id);

-- Insertar datos básicos
INSERT INTO public.chart_of_accounts (company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail, description) VALUES
('${companyId}', '1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false, 'Cuenta principal de activos'),
('${companyId}', '1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true, 'Dinero en efectivo'),
('${companyId}', '2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true, 'IVA por pagar al SII'),
('${companyId}', '5.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '5.1.1', 4, true, true, 'Ingresos por ventas principales');
        `
      });
    }

    // Verificar resultado
    const { data: verifyData, error: verifyError } = await supabase
      .from('chart_of_accounts')
      .select('code, name', { count: 'exact' });

    return NextResponse.json({
      success: true,
      message: 'Chart of accounts populated successfully!',
      records_inserted: insertResult?.length || 0,
      total_records: verifyData?.length || 0,
      company_used: companyId,
      data: insertResult
    });

  } catch (error) {
    console.error('❌ Error fixing chart columns:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}