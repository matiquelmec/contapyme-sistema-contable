import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 Obteniendo conceptos Previred para company:', companyId);

    const { data: concepts, error } = await supabase
      .rpc('get_previred_concepts_by_company', { 
        company_uuid: companyId 
      });

    if (error) {
      console.error('Error obteniendo conceptos Previred:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener conceptos Previred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: concepts || []
    });

  } catch (error) {
    console.error('Error en GET /api/payroll/previred-concepts:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      concept_code,
      concept_name,
      concept_description,
      is_taxable = true,
      affects_afp = true,
      affects_health = true,
      affects_unemployment = true,
      calculation_type = 'fixed',
      percentage_rate = 0,
      fixed_amount = 0
    } = body;

    if (!concept_code || !concept_name) {
      return NextResponse.json(
        { success: false, error: 'concept_code y concept_name son requeridos' },
        { status: 400 }
      );
    }

    console.log('✨ Creando concepto Previred:', concept_code, 'para company:', companyId);

    const { data: newConcept, error: insertError } = await supabase
      .from('previred_concepts')
      .insert({
        company_id: companyId,
        concept_code,
        concept_name,
        concept_description,
        is_taxable,
        affects_afp,
        affects_health,
        affects_unemployment,
        calculation_type,
        percentage_rate,
        fixed_amount,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creando concepto:', insertError);
      return NextResponse.json(
        { success: false, error: 'Error al crear concepto Previred' },
        { status: 500 }
      );
    }

    console.log('✅ Concepto Previred creado:', newConcept.concept_name);

    return NextResponse.json({
      success: true,
      data: newConcept,
      message: 'Concepto Previred creado exitosamente'
    });

  } catch (error) {
    console.error('Error en POST /api/payroll/previred-concepts:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const conceptId = searchParams.get('concept_id');

    if (!companyId || !conceptId) {
      return NextResponse.json(
        { success: false, error: 'company_id y concept_id son requeridos' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    console.log('🔄 Actualizando concepto Previred:', conceptId);

    const { data: updatedConcept, error: updateError } = await supabase
      .from('previred_concepts')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando concepto:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar concepto Previred' },
        { status: 500 }
      );
    }

    console.log('✅ Concepto actualizado:', updatedConcept.concept_name);

    return NextResponse.json({
      success: true,
      data: updatedConcept,
      message: 'Concepto Previred actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /api/payroll/previred-concepts:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const conceptId = searchParams.get('concept_id');

    if (!companyId || !conceptId) {
      return NextResponse.json(
        { success: false, error: 'company_id y concept_id son requeridos' },
        { status: 400 }
      );
    }

    console.log('🗑️ Eliminando concepto Previred:', conceptId);

    const { error: deleteError } = await supabase
      .from('previred_concepts')
      .delete()
      .eq('id', conceptId)
      .eq('company_id', companyId);

    if (deleteError) {
      console.error('Error eliminando concepto:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar concepto Previred' },
        { status: 500 }
      );
    }

    console.log('✅ Concepto eliminado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Concepto Previred eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en DELETE /api/payroll/previred-concepts:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}