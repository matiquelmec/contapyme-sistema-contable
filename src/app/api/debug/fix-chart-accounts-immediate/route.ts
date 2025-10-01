import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/debug/fix-chart-accounts-immediate
 * Solución inmediata: crear tabla chart_of_accounts básica
 */
export async function POST() {
  try {
    console.log('🚀 Creando tabla chart_of_accounts básica...');

    // Datos básicos para crear - usar el método más simple posible
    const accountsData = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
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
        id: '550e8400-e29b-41d4-a716-446655440002',
        company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
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
        id: '550e8400-e29b-41d4-a716-446655440003',
        company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
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
        id: '550e8400-e29b-41d4-a716-446655440004',
        company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
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

    let result = {
      table_created: false,
      records_inserted: 0,
      error: null,
      method_used: 'unknown'
    };

    try {
      // Método 1: Intentar insertar directamente (esto creará la tabla si existe)
      const { data: insertData, error: insertError } = await supabase
        .from('chart_of_accounts')
        .upsert(accountsData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (!insertError) {
        result.table_created = true;
        result.records_inserted = insertData?.length || 0;
        result.method_used = 'direct_insert';

        console.log('✅ Datos insertados directamente:', result.records_inserted);

      } else {
        console.log('❌ Error en inserción directa:', insertError.message);

        // Método 2: Si falla, la tabla probablemente no existe
        // Intentar crear con SQL más básico
        if (insertError.message.includes('relation "chart_of_accounts" does not exist')) {
          result.error = 'Table does not exist. Manual creation required in Supabase Dashboard.';
          result.method_used = 'table_missing';

          // Proporcionar el SQL para crear manualmente
          const createSQL = `
-- Ejecutar este SQL en Supabase Dashboard > SQL Editor:

CREATE TABLE public.chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID DEFAULT '8033ee69-b420-4d91-ba0e-482f46cd6fce',
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_chart_accounts_code ON public.chart_of_accounts(code);
CREATE INDEX idx_chart_accounts_company ON public.chart_of_accounts(company_id);

-- Insertar datos básicos
INSERT INTO public.chart_of_accounts (id, company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail, description) VALUES
('550e8400-e29b-41d4-a716-446655440001', '8033ee69-b420-4d91-ba0e-482f46cd6fce', '1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false, 'Cuenta principal de activos'),
('550e8400-e29b-41d4-a716-446655440002', '8033ee69-b420-4d91-ba0e-482f46cd6fce', '1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true, 'Dinero en efectivo'),
('550e8400-e29b-41d4-a716-446655440003', '8033ee69-b420-4d91-ba0e-482f46cd6fce', '2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true, 'IVA por pagar al SII'),
('550e8400-e29b-41d4-a716-446655440004', '8033ee69-b420-4d91-ba0e-482f46cd6fce', '5.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '5.1.1', 4, true, true, 'Ingresos por ventas principales');
          `;

          return NextResponse.json({
            success: false,
            message: 'Table chart_of_accounts does not exist. Manual creation required.',
            sql_to_execute: createSQL,
            next_steps: [
              '1. Go to Supabase Dashboard',
              '2. Navigate to SQL Editor',
              '3. Paste and execute the provided SQL',
              '4. Return to application - it should work'
            ],
            result
          });

        } else {
          result.error = insertError.message;
          result.method_used = 'failed_insert';
        }
      }

    } catch (err) {
      result.error = err instanceof Error ? err.message : 'Unknown error';
      result.method_used = 'exception';
    }

    // Verificar estado final
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from('chart_of_accounts')
        .select('code, name', { count: 'exact' })
        .limit(3);

      if (!verifyError) {
        result.records_inserted = verifyData?.length || 0;
        result.table_created = true;
      }
    } catch (verifyErr) {
      console.log('No se pudo verificar la tabla, probablemente no existe');
    }

    if (result.table_created) {
      return NextResponse.json({
        success: true,
        message: 'Chart of accounts table is ready!',
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Could not create chart_of_accounts table automatically',
        result
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in fix-chart-accounts-immediate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}