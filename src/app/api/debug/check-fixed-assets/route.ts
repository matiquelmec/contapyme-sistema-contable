import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/debug/check-fixed-assets
 * Verificar estructura de tabla fixed_assets
 */
export async function GET() {
  try {
    console.log('🔍 Verificando estructura de fixed_assets...');

    const result = {
      fixed_assets_exists: false,
      fixed_assets_categories_exists: false,
      fixed_assets_structure: null,
      categories_available: [],
      recommendation: null
    };

    // 1. Verificar fixed_assets
    try {
      const { data: assetsData, error: assetsError } = await supabase
        .from('fixed_assets')
        .select('*')
        .limit(1);

      if (!assetsError) {
        result.fixed_assets_exists = true;
        result.fixed_assets_structure = assetsData && assetsData.length > 0 ? Object.keys(assetsData[0]) : 'empty_table';

        // Si hay datos, obtener categorías únicas
        if (assetsData && assetsData.length > 0) {
          const { data: categoriesData } = await supabase
            .from('fixed_assets')
            .select('category')
            .not('category', 'is', null);

          if (categoriesData) {
            result.categories_available = [...new Set(categoriesData.map(item => item.category))];
          }
        }
      }
    } catch (assetsErr) {
      console.log('fixed_assets error:', assetsErr);
    }

    // 2. Verificar fixed_assets_categories
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('fixed_assets_categories')
        .select('*')
        .limit(1);

      if (!categoriesError) {
        result.fixed_assets_categories_exists = true;
      }
    } catch (categoriesErr) {
      console.log('fixed_assets_categories error:', categoriesErr);
    }

    // 3. Generar recomendación
    if (result.fixed_assets_exists && !result.fixed_assets_categories_exists) {
      result.recommendation = {
        action: 'CREATE_CATEGORIES_TABLE',
        description: 'Create fixed_assets_categories table with basic categories',
        sql: `
CREATE TABLE public.fixed_assets_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  depreciation_years INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.fixed_assets_categories (name, description, depreciation_years) VALUES
('Equipos de Computación', 'Computadores, laptops, servidores', 3),
('Muebles y Enseres', 'Escritorios, sillas, estanterías', 7),
('Equipos de Oficina', 'Impresoras, teléfonos, proyectores', 5),
('Vehículos', 'Automóviles, camiones, motocicletas', 7),
('Maquinaria', 'Equipos industriales y maquinaria', 10);
        `
      };
    } else if (!result.fixed_assets_exists && !result.fixed_assets_categories_exists) {
      result.recommendation = {
        action: 'FIX_IN_CHART_ACCOUNTS_MIGRATION',
        description: 'Both tables missing - will be created in chart_of_accounts migration'
      };
    } else if (result.fixed_assets_categories_exists) {
      result.recommendation = {
        action: 'NO_ACTION_NEEDED',
        description: 'fixed_assets_categories table already exists'
      };
    }

    console.log('✅ Fixed assets analysis completed');

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error checking fixed assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      },
      { status: 500 }
    );
  }
}