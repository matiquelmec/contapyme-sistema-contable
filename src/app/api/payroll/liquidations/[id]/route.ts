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
    const liquidationId = params.id;

    console.log('🔍 GET Liquidation Detail - ID:', liquidationId, 'Company:', companyId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!liquidationId) {
      return NextResponse.json(
        { success: false, error: 'liquidation_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener liquidación específica con datos del empleado
    const { data: liquidation, error } = await supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name
        )
      `)
      .eq('id', liquidationId)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('❌ Error fetching liquidation detail:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Liquidación no encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Error al obtener liquidación' },
        { status: 500 }
      );
    }

    if (!liquidation) {
      return NextResponse.json(
        { success: false, error: 'Liquidación no encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Liquidation detail found:', liquidation.id);
    console.log('🔍 Raw liquidation data:', {
      legal_gratification_art50: liquidation.legal_gratification_art50,
      total_gross_income: liquidation.total_gross_income,
      total_taxable_income: liquidation.total_taxable_income,
      base_salary: liquidation.base_salary,
      employee: liquidation.employees
    });

    // ✅ USAR VALORES DE DB TAL COMO VIENEN (sin corrección duplicada)
    console.log('🔍 Raw liquidation data:', {
      legal_gratification_art50: liquidation.legal_gratification_art50,
      total_gross_income: liquidation.total_gross_income,
      total_taxable_income: liquidation.total_taxable_income,
      base_salary: liquidation.base_salary
    });

    // Formatear datos para respuesta con valores por defecto
    const formattedLiquidation = {
      id: liquidation.id,
      employee: {
        rut: liquidation.employees?.rut || '',
        first_name: liquidation.employees?.first_name || '',
        last_name: liquidation.employees?.last_name || ''
      },
      period_year: liquidation.period_year,
      period_month: liquidation.period_month,
      days_worked: liquidation.days_worked || 30,
      
      // Haberes
      base_salary: liquidation.base_salary || 0,
      overtime_amount: liquidation.overtime_amount || 0,
      bonuses: liquidation.bonuses || 0,
      commissions: liquidation.commissions || 0,
      gratification: liquidation.gratification || 0,
      legal_gratification_art50: liquidation.legal_gratification_art50 || 0,
      food_allowance: liquidation.food_allowance || 0,
      transport_allowance: liquidation.transport_allowance || 0,
      family_allowance: liquidation.family_allowance || 0,
      total_taxable_income: liquidation.total_taxable_income || 0,
      total_non_taxable_income: liquidation.total_non_taxable_income || 0,
      
      // Descuentos
      afp_percentage: liquidation.afp_percentage || 10.0,
      afp_commission_percentage: liquidation.afp_commission_percentage || 0.58,
      afp_amount: liquidation.afp_amount || 0,
      afp_commission_amount: liquidation.afp_commission_amount || 0,
      health_percentage: liquidation.health_percentage || 7.0,
      health_amount: liquidation.health_amount || 0,
      unemployment_percentage: liquidation.unemployment_percentage || 0.6,
      unemployment_amount: liquidation.unemployment_amount || 0,
      income_tax_amount: liquidation.income_tax_amount || 0,
      
      // Otros descuentos
      loan_deductions: liquidation.loan_deductions || 0,
      advance_payments: liquidation.advance_payments || 0,
      apv_amount: liquidation.apv_amount || 0,
      other_deductions: liquidation.other_deductions || 0,
      total_other_deductions: liquidation.total_other_deductions || 0,
      
      // Totales - USAR VALORES EXACTOS DE LA BASE DE DATOS
      total_gross_income: liquidation.total_gross_income || 0,
      total_deductions: liquidation.total_deductions || 0,
      net_salary: liquidation.net_salary || 0,
      
      status: liquidation.status || 'draft',
      created_at: liquidation.created_at,
      updated_at: liquidation.updated_at
    };

    return NextResponse.json({
      success: true,
      data: formattedLiquidation
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/payroll/liquidations/[id]:', error);
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
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const liquidationId = params.id;
    const updateData = await request.json();

    console.log('🔍 PUT Liquidation - ID:', liquidationId, 'Data:', updateData);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!liquidationId) {
      return NextResponse.json(
        { success: false, error: 'liquidation_id es requerido' },
        { status: 400 }
      );
    }

    // Actualizar liquidación
    const { data: updated, error: updateError } = await supabase
      .from('payroll_liquidations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', liquidationId)
      .eq('company_id', companyId)
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating liquidation:', updateError);
      
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Liquidación no encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al actualizar liquidación',
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Liquidation updated:', updated.id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Liquidación actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/payroll/liquidations/[id]:', error);
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
    const liquidationId = params.id;

    console.log('🔍 DELETE Liquidation - ID:', liquidationId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!liquidationId) {
      return NextResponse.json(
        { success: false, error: 'liquidation_id es requerido' },
        { status: 400 }
      );
    }

    // Eliminar liquidación
    const { data: deleted, error: deleteError } = await supabase
      .from('payroll_liquidations')
      .delete()
      .eq('id', liquidationId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (deleteError) {
      console.error('❌ Error deleting liquidation:', deleteError);
      
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Liquidación no encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al eliminar liquidación',
          details: deleteError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Liquidation deleted:', deleted.id);

    return NextResponse.json({
      success: true,
      data: deleted,
      message: 'Liquidación eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/payroll/liquidations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}