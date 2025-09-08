import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Listar descriptores de cargo guardados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const position = searchParams.get('position');
    const department = searchParams.get('department');
    const popular = searchParams.get('popular') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('job_descriptions')
      .select('*')
      .eq('company_id', companyId);

    // Filtros opcionales
    if (position) {
      query = query.ilike('job_position', `%${position}%`);
    }
    
    if (department) {
      query = query.ilike('department', `%${department}%`);
    }

    // Ordenamiento
    if (popular) {
      query = query.order('times_used', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job descriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/job-descriptions:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Guardar nuevo descriptor de cargo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id,
      title,
      position,
      department,
      job_functions = [],
      obligations = [],
      prohibitions = [],
      created_by = 'ai_assistant',
      source_type = 'ai',
      confidence_score,
      requirements = [],
      improvements_made = [],
      compliance_notes = []
    } = body;

    // Validaciones básicas
    if (!company_id || !title || !position) {
      return NextResponse.json({ 
        error: 'Campos requeridos faltantes',
        required: ['company_id', 'title', 'position']
      }, { status: 400 });
    }

    if (job_functions.length === 0 && obligations.length === 0 && prohibitions.length === 0) {
      return NextResponse.json({ 
        error: 'Debe incluir al menos funciones, obligaciones o prohibiciones'
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar que no exista un descriptor con el mismo título
    const { data: existing } = await supabase
      .from('job_descriptions')
      .select('id')
      .eq('company_id', company_id)
      .eq('title', title)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Ya existe un descriptor con este título',
        suggestion: 'Usa un título diferente o actualiza el existente'
      }, { status: 409 });
    }

    // Crear el descriptor
    const descriptionData = {
      company_id,
      title,
      job_position: position,
      department,
      job_functions,
      obligations,
      prohibitions,
      created_by,
      source_type,
      confidence_score,
      requirements,
      improvements_made,
      compliance_notes
    };

    const { data: newDescription, error: insertError } = await supabase
      .from('job_descriptions')
      .insert(descriptionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating job description:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: newDescription,
      message: 'Descriptor de cargo guardado exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/job-descriptions:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Eliminar descriptor de cargo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('company_id');

    if (!id || !companyId) {
      return NextResponse.json({ 
        error: 'ID y company_id son requeridos' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Eliminar el descriptor (solo si pertenece a la empresa)
    const { data, error } = await supabase
      .from('job_descriptions')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting job description:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'Descriptor no encontrado o no tienes permisos para eliminarlo' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Descriptor eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/payroll/job-descriptions:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}