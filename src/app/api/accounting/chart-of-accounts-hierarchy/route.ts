import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener plan de cuentas jerárquico completo
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API Chart of Accounts Hierarchy - GET');

    // Obtener toda la jerarquía en paralelo para mejor performance
    const [titleResult, majorResult, subResult, specificResult] = await Promise.all([
      // Nivel 1: Títulos
      supabase
        .from('title_chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code'),

      // Nivel 2: Mayores  
      supabase
        .from('major_chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code'),

      // Nivel 3: Sub-cuentas
      supabase
        .from('sub_chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code'),

      // Nivel 4: Específicas (imputables)
      supabase
        .from('specific_chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code')
    ]);

    // Verificar errores
    if (titleResult.error) throw titleResult.error;
    if (majorResult.error) throw majorResult.error;
    if (subResult.error) throw subResult.error;
    if (specificResult.error) throw specificResult.error;

    const titles = titleResult.data || [];
    const majors = majorResult.data || [];
    const subs = subResult.data || [];
    const specifics = specificResult.data || [];

    // Construir árbol jerárquico
    const hierarchy = titles.map(title => ({
      ...title,
      majors: majors
        .filter(major => major.tcoaid === title.tcoaid)
        .map(major => ({
          ...major,
          subs: subs
            .filter(sub => sub.mcoaid === major.mcoaid)
            .map(sub => ({
              ...sub,
              specifics: specifics.filter(specific => specific.sucoaid === sub.sucoaid)
            }))
        }))
    }));

    // También devolver listas planas para facilidad de uso
    const flatAccounts = {
      titles,
      majors,
      subs,
      specifics,
      // Todas las cuentas imputables (específicas)
      imputable_accounts: specifics.map(spec => ({
        id: spec.id,
        code: spec.code,
        name: spec.name,
        full_name: `${spec.code} - ${spec.name}`,
        is_fixed: spec.is_fixed,
        parent_hierarchy: {
          title: titles.find(t => majors.find(m => m.tcoaid === t.tcoaid && subs.find(s => s.mcoaid === m.mcoaid && s.sucoaid === spec.sucoaid)))?.name,
          major: majors.find(m => subs.find(s => s.mcoaid === m.mcoaid && s.sucoaid === spec.sucoaid))?.name,
          sub: subs.find(s => s.sucoaid === spec.sucoaid)?.name
        }
      }))
    };

    console.log(`✅ Plan de cuentas cargado: ${titles.length} títulos, ${majors.length} mayores, ${subs.length} subs, ${specifics.length} específicas`);

    return NextResponse.json({
      success: true,
      data: {
        hierarchy,
        flat: flatAccounts,
        summary: {
          total_titles: titles.length,
          total_majors: majors.length,
          total_subs: subs.length,
          total_specifics: specifics.length,
          total_fixed_asset_accounts: specifics.filter(s => s.is_fixed).length
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/accounting/chart-of-accounts-hierarchy:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva cuenta en cualquier nivel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 API Chart of Accounts Hierarchy - POST:', body);

    const { level, parent_id, code, name, is_fixed = false } = body;

    if (!level || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'level, code y name son requeridos' },
        { status: 400 }
      );
    }

    let result;
    let tableName;
    let idField;

    switch (level) {
      case 'title':
        tableName = 'title_chart_of_accounts';
        idField = 'tcoaid';
        result = await supabase
          .from(tableName)
          .insert({
            tcoaid: `T${Date.now()}`, // Generar ID único
            code,
            name
          })
          .select()
          .single();
        break;

      case 'major':
        if (!parent_id) {
          return NextResponse.json(
            { success: false, error: 'parent_id requerido para cuentas mayores' },
            { status: 400 }
          );
        }
        tableName = 'major_chart_of_accounts';
        idField = 'mcoaid';
        result = await supabase
          .from(tableName)
          .insert({
            mcoaid: `M${Date.now()}`,
            tcoaid: parent_id,
            code,
            name
          })
          .select()
          .single();
        break;

      case 'sub':
        if (!parent_id) {
          return NextResponse.json(
            { success: false, error: 'parent_id requerido para sub-cuentas' },
            { status: 400 }
          );
        }
        tableName = 'sub_chart_of_accounts';
        idField = 'sucoaid';
        result = await supabase
          .from(tableName)
          .insert({
            sucoaid: `S${Date.now()}`,
            mcoaid: parent_id,
            code,
            name
          })
          .select()
          .single();
        break;

      case 'specific':
        if (!parent_id) {
          return NextResponse.json(
            { success: false, error: 'parent_id requerido para cuentas específicas' },
            { status: 400 }
          );
        }
        tableName = 'specific_chart_of_accounts';
        idField = 'spcoaid';
        result = await supabase
          .from(tableName)
          .insert({
            spcoaid: `SP${Date.now()}`,
            sucoaid: parent_id,
            code,
            name,
            is_fixed
          })
          .select()
          .single();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'level debe ser: title, major, sub o specific' },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error(`Error creating ${level} account:`, result.error);
      return NextResponse.json(
        { success: false, error: `Error al crear cuenta ${level}` },
        { status: 500 }
      );
    }

    console.log(`✅ Nueva cuenta ${level} creada: ${code} - ${name}`);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Cuenta ${level} creada exitosamente`
    });

  } catch (error) {
    console.error('Error in POST /api/accounting/chart-of-accounts-hierarchy:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}