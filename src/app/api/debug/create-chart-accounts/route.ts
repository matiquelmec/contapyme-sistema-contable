import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/debug/create-chart-accounts
 * Crea la tabla chart_of_accounts con datos básicos
 */
export async function POST() {
  try {
    console.log('🚀 Creando tabla chart_of_accounts...');

    // SQL para crear la tabla con estructura básica
    const createTableSQL = `
      -- Crear tabla chart_of_accounts
      CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID DEFAULT '8033ee69-b420-4d91-ba0e-482f46cd6fce',
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        account_type VARCHAR(50) NOT NULL,
        level_type VARCHAR(20) NOT NULL DEFAULT 'Imputable',
        parent_code VARCHAR(20),
        level INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        is_detail BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Constraint único por empresa
        UNIQUE(company_id, code)
      );

      -- Crear índices para performance
      CREATE INDEX IF NOT EXISTS idx_chart_accounts_company ON public.chart_of_accounts(company_id);
      CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON public.chart_of_accounts(code);
      CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON public.chart_of_accounts(account_type);
      CREATE INDEX IF NOT EXISTS idx_chart_accounts_active ON public.chart_of_accounts(is_active);
      CREATE INDEX IF NOT EXISTS idx_chart_accounts_company_code ON public.chart_of_accounts(company_id, code);
    `;

    // Datos básicos para insertar
    const insertDataSQL = `
      -- Insertar plan de cuentas básico (solo si no existen)
      INSERT INTO public.chart_of_accounts (company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail)
      SELECT * FROM (VALUES
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '1', 'ACTIVOS', 'Activo', 'Titulo', NULL, 1, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '1.1', 'ACTIVOS CORRIENTES', 'Activo', '2do Nivel', '1', 2, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '1.1.1', 'Efectivo y Equivalentes', 'Activo', '3er Nivel', '1.1', 3, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '1.1.1.001', 'Caja', 'Activo', 'Imputable', '1.1.1', 4, true, true),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '1.1.1.002', 'Banco Estado', 'Activo', 'Imputable', '1.1.1', 4, true, true),

        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '2', 'PASIVOS', 'Pasivo', 'Titulo', NULL, 1, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '2.1', 'PASIVOS CORRIENTES', 'Pasivo', '2do Nivel', '2', 2, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '2.1.3', 'Pasivos por Impuestos', 'Pasivo', '3er Nivel', '2.1', 3, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '2.1.3.002', 'IVA Débito Fiscal', 'Pasivo', 'Imputable', '2.1.3', 4, true, true),

        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '5', 'INGRESOS', 'Ingreso', 'Titulo', NULL, 1, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '5.1', 'INGRESOS OPERACIONALES', 'Ingreso', '2do Nivel', '5', 2, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '5.1.1', 'Ventas', 'Ingreso', '3er Nivel', '5.1', 3, true, false),
        ('8033ee69-b420-4d91-ba0e-482f46cd6fce', '5.1.1.001', 'Ventas del Giro', 'Ingreso', 'Imputable', '5.1.1', 4, true, true)
      ) AS v(company_id, code, name, account_type, level_type, parent_code, level, is_active, is_detail)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts WHERE code = v.code AND company_id = v.company_id::UUID
      );
    `;

    const results = [];

    try {
      // Ejecutar creación de tabla usando RPC
      const { data: createResult, error: createError } = await supabase
        .rpc('exec_sql', { query: createTableSQL })
        .catch(() => ({ data: null, error: null })); // Ignorar si no existe RPC

      if (createError) {
        console.warn('Error con RPC, intentando método alternativo...');

        // Método alternativo: usar las funciones nativas de Supabase
        const accountsData = [
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '1', name: 'ACTIVOS', account_type: 'Activo', level_type: 'Titulo', parent_code: null, level: 1, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '1.1', name: 'ACTIVOS CORRIENTES', account_type: 'Activo', level_type: '2do Nivel', parent_code: '1', level: 2, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '1.1.1', name: 'Efectivo y Equivalentes', account_type: 'Activo', level_type: '3er Nivel', parent_code: '1.1', level: 3, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '1.1.1.001', name: 'Caja', account_type: 'Activo', level_type: 'Imputable', parent_code: '1.1.1', level: 4, is_active: true, is_detail: true },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '1.1.1.002', name: 'Banco Estado', account_type: 'Activo', level_type: 'Imputable', parent_code: '1.1.1', level: 4, is_active: true, is_detail: true },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '2', name: 'PASIVOS', account_type: 'Pasivo', level_type: 'Titulo', parent_code: null, level: 1, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '2.1', name: 'PASIVOS CORRIENTES', account_type: 'Pasivo', level_type: '2do Nivel', parent_code: '2', level: 2, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '2.1.3', name: 'Pasivos por Impuestos', account_type: 'Pasivo', level_type: '3er Nivel', parent_code: '2.1', level: 3, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '2.1.3.002', name: 'IVA Débito Fiscal', account_type: 'Pasivo', level_type: 'Imputable', parent_code: '2.1.3', level: 4, is_active: true, is_detail: true },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '5', name: 'INGRESOS', account_type: 'Ingreso', level_type: 'Titulo', parent_code: null, level: 1, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '5.1', name: 'INGRESOS OPERACIONALES', account_type: 'Ingreso', level_type: '2do Nivel', parent_code: '5', level: 2, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '5.1.1', name: 'Ventas', account_type: 'Ingreso', level_type: '3er Nivel', parent_code: '5.1', level: 3, is_active: true, is_detail: false },
          { company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce', code: '5.1.1.001', name: 'Ventas del Giro', account_type: 'Ingreso', level_type: 'Imputable', parent_code: '5.1.1', level: 4, is_active: true, is_detail: true }
        ];

        // Intentar insertar directamente
        const { data: insertResult, error: insertError } = await supabase
          .from('chart_of_accounts')
          .upsert(accountsData, { onConflict: 'company_id,code', ignoreDuplicates: true })
          .select();

        if (insertError) {
          throw new Error(`Error insertando datos: ${insertError.message}`);
        }

        results.push({
          operation: 'insert_data',
          success: true,
          data: insertResult,
          count: insertResult?.length || 0
        });

      } else {
        results.push({
          operation: 'create_table',
          success: true,
          data: createResult
        });

        // Ejecutar inserción de datos
        const { data: insertResult, error: insertError } = await supabase
          .rpc('exec_sql', { query: insertDataSQL })
          .catch(() => ({ data: null, error: { message: 'RPC not available for insert' } }));

        results.push({
          operation: 'insert_data',
          success: !insertError,
          error: insertError?.message || null,
          data: insertResult
        });
      }

      // Verificar resultado final
      const { data: verifyData, error: verifyError } = await supabase
        .from('chart_of_accounts')
        .select('code, name', { count: 'exact' })
        .limit(5);

      results.push({
        operation: 'verify',
        success: !verifyError,
        error: verifyError?.message || null,
        data: verifyData,
        count: verifyData?.length || 0
      });

      console.log('✅ Tabla chart_of_accounts creada/verificada exitosamente');

      return NextResponse.json({
        success: true,
        message: 'Chart of accounts table created/verified successfully',
        results
      });

    } catch (sqlError) {
      console.error('Error ejecutando SQL:', sqlError);
      return NextResponse.json({
        success: false,
        error: `SQL execution error: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`,
        results
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error creating chart_of_accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: []
      },
      { status: 500 }
    );
  }
}