import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    // Si no hay company_id, obtener el empleado sin filtrar por compañía
    const query = supabase
      .from('employees')
      .select(`
        *,
        employment_contracts (
          id,
          position,
          base_salary,
          status,
          start_date,
          end_date,
          contract_type
        ),
        payroll_config (
          id,
          afp_code,
          health_institution_code,
          family_allowances,
          legal_gratification_type
        )
      `)
      .eq('id', params.id);

    if (companyId) {
      query.eq('company_id', companyId);
    }

    const { data: employee, error } = await query.single();

    if (error) {
      console.error('Error fetching employee:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener empleado' },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Restructurar la respuesta para el modal
    const contract = employee.employment_contracts?.find((c: any) => c.status === 'active') || employee.employment_contracts?.[0] || null;
    const payrollConfig = employee.payroll_config?.[0] || null;

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        rut: employee.rut,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        bank_name: employee.bank_name,
        bank_account_type: employee.bank_account_type,
        bank_account_number: employee.bank_account_number
      },
      contract: contract ? {
        id: contract.id,
        base_salary: contract.base_salary,
        contract_type: contract.contract_type
      } : null,
      payrollConfig: payrollConfig ? {
        afp_code: payrollConfig.afp_code,
        health_institution_code: payrollConfig.health_institution_code,
        legal_gratification_type: payrollConfig.legal_gratification_type || 'none'
      } : null
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/employees/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const employeeId = params.id;

    // Actualizar datos del empleado
    const { error: employeeError } = await supabase
      .from('employees')
      .update({
        email: body.email,
        bank_name: body.bank_name,
        bank_account_type: body.bank_account_type,
        bank_account_number: body.bank_account_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId);

    if (employeeError) {
      console.error('Error updating employee:', employeeError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar empleado' },
        { status: 500 }
      );
    }

    // Actualizar contrato si se proporcionan datos contractuales
    if (body.base_salary !== undefined || body.contract_type) {
      // Primero buscar si existe un contrato activo
      const { data: existingContract } = await supabase
        .from('employment_contracts')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .single();

      if (existingContract) {
        // Actualizar contrato existente
        const { error: contractError } = await supabase
          .from('employment_contracts')
          .update({
            base_salary: body.base_salary,
            contract_type: body.contract_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContract.id);

        if (contractError) {
          console.error('Error updating contract:', contractError);
        }
      }
    }

    // Actualizar o crear configuración de nómina
    if (body.afp_code || body.health_institution_code || body.legal_gratification_type) {
      // Primero verificar si existe configuración
      const { data: existingConfig } = await supabase
        .from('payroll_config')
        .select('id')
        .eq('employee_id', employeeId)
        .single();

      if (existingConfig) {
        // Actualizar configuración existente
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (body.afp_code) updateData.afp_code = body.afp_code;
        if (body.health_institution_code) updateData.health_institution_code = body.health_institution_code;
        if (body.legal_gratification_type) updateData.legal_gratification_type = body.legal_gratification_type;

        const { error: payrollError } = await supabase
          .from('payroll_config')
          .update(updateData)
          .eq('id', existingConfig.id);

        if (payrollError) {
          console.error('Error updating payroll config:', payrollError);
        }
      } else {
        // Crear nueva configuración
        const { error: payrollError } = await supabase
          .from('payroll_config')
          .insert({
            employee_id: employeeId,
            afp_code: body.afp_code || 'HABITAT',
            health_institution_code: body.health_institution_code || 'FONASA',
            legal_gratification_type: body.legal_gratification_type || 'none',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (payrollError) {
          console.error('Error creating payroll config:', payrollError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Empleado actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/employees/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // En lugar de eliminar físicamente, marcamos como inactivo
    const { data: employee, error } = await supabase
      .from('employees')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating employee:', error);
      return NextResponse.json(
        { success: false, error: 'Error al dar de baja empleado' },
        { status: 500 }
      );
    }

    // También marcamos los contratos como terminados
    await supabase
      .from('employment_contracts')
      .update({
        status: 'terminated',
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', params.id)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      data: employee,
      message: 'Empleado dado de baja exitosamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/payroll/employees/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}