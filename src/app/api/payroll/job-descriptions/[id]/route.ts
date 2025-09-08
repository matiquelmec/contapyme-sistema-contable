import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Obtener descriptor específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching job description:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'Descriptor no encontrado' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/job-descriptions/[id]:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Usar descriptor (incrementar contador)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Incrementar el uso del descriptor
    const { data, error } = await supabase
      .rpc('increment_job_description_usage', { description_id: id });

    if (error) {
      console.error('Error incrementing job description usage:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener el descriptor actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated job description:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updated,
      message: 'Descriptor utilizado exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/job-descriptions/[id]:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Actualizar descriptor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { company_id, ...updateData } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Actualizar el descriptor (solo si pertenece a la empresa)
    const { data, error } = await supabase
      .from('job_descriptions')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job description:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'Descriptor no encontrado o no tienes permisos para actualizarlo' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Descriptor actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/job-descriptions/[id]:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Eliminar descriptor específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
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
    console.error('Error in DELETE /api/payroll/job-descriptions/[id]:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}