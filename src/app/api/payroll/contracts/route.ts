import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Listar contratos con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const includeDetails = searchParams.get('include_details') === 'true';

    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Usar tabla principal con joins si se requieren detalles
    const tableName = 'employment_contracts';
    
    let query;
    
    if (includeDetails) {
      // Query con joins para obtener detalles completos
      query = supabase
        .from('employment_contracts')
        .select(`
          *,
          employees!inner(
            rut,
            first_name,
            middle_name,
            last_name,
            birth_date,
            nationality,
            marital_status,
            address,
            city,
            email,
            phone,
            bank_name,
            bank_account_type,
            bank_account_number
          ),
          companies!inner(
            name,
            rut,
            legal_representative_name,
            legal_representative_rut,
            fiscal_address,
            fiscal_city
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    } else {
      // Query simple sin joins
      query = supabase
        .from('employment_contracts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/contracts:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Crear nuevo contrato
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      company_id,
      template_id,
      contract_type,
      position,
      department,
      start_date,
      end_date,
      base_salary,
      salary_type = 'monthly',
      currency = 'CLP',
      weekly_hours,
      workplace_address,
      schedule_details,
      job_functions,
      obligations,
      prohibitions,
      gratification_amount,
      bonuses,
      allowances,
      health_insurance,
      pension_fund,
      resignation_notice_days = 30
    } = body;

    // Validaciones básicas
    if (!employee_id || !company_id || !contract_type || !position || !start_date || !base_salary) {
      return NextResponse.json({ 
        error: 'Campos requeridos faltantes',
        required: ['employee_id', 'company_id', 'contract_type', 'position', 'start_date', 'base_salary']
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Si se proporciona un template_id, obtener datos de la plantilla
    let templateData = {};
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (!templateError && template) {
        templateData = {
          job_functions: job_functions || template.job_functions,
          obligations: obligations || template.obligations,
          prohibitions: prohibitions || template.prohibitions,
          bonuses: bonuses || template.standard_bonuses,
          allowances: allowances || template.standard_allowances,
          resignation_notice_days: resignation_notice_days || template.resignation_notice_days
        };
      }
    }

    // Calcular gratificación legal si no se proporciona (25% del sueldo base con tope)
    const calculatedGratification = gratification_amount || Math.min(base_salary * 0.25, 2512750);

    // Crear el contrato
    const contractData = {
      employee_id,
      company_id,
      contract_type,
      position,
      department,
      start_date,
      end_date,
      base_salary,
      salary_type,
      currency,
      weekly_hours,
      workplace_address,
      schedule_details: schedule_details || {},
      gratification_amount: calculatedGratification,
      health_insurance,
      pension_fund,
      status: 'draft',
      ...templateData,
      // Sobrescribir con datos específicos si se proporcionan
      ...(job_functions && { job_functions }),
      ...(obligations && { obligations }),
      ...(prohibitions && { prohibitions }),
      ...(bonuses && { bonuses }),
      ...(allowances && { allowances })
    };

    const { data: newContract, error: insertError } = await supabase
      .from('employment_contracts')
      .insert(contractData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating contract:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: newContract,
      message: 'Contrato creado exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/contracts:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Actualizar contrato existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID del contrato es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Actualizar el contrato
    const { data, error } = await supabase
      .from('employment_contracts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Contrato actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/contracts:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}