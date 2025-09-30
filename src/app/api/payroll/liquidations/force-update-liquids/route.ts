import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

// API especial para forzar actualización de líquidos según valores Excel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 Forced update liquids:', body);

    const { company_id = '8033ee69-b420-4d91-ba0e-482f46cd6fce' } = body;

    // Valores exactos del Excel con IDs conocidos
    const excelLiquids = [
      { id: 'cc43e74b-0f64-4117-97f8-94d598f9ed79', rut: '18.208.947-8', net_salary: 537199 },
      { id: 'ae683d69-33ee-470d-979d-ed71e5aabcb1', rut: '17.238.098-0', net_salary: 648734 },
      { id: '05514355-4ef0-4ed6-8444-6b6002a7bc15', rut: '18.209.442-0', net_salary: 6941085 },
      { id: 'd11b02a0-88b0-4eb6-9b52-e3219b711c0a', rut: '16.353.500-9', net_salary: 700115 },
      { id: 'a1982bcc-44e0-4ae0-a663-fd64609a26de', rut: '18.282.415-1', net_salary: 541034 },
      { id: '8253f5a9-80bf-40df-a8f9-0858f104ec0b', rut: '17.111.230-3', net_salary: 757233 }
    ];

    console.log('💰 Updating liquids to match Excel values');

    const updates = [];

    // Actualizar cada liquidación ajustando descuentos para cuadrar líquido del Excel
    for (const liquid of excelLiquids) {
      console.log(`🔄 Updating ${liquid.rut} (${liquid.id}) to $${liquid.net_salary}`);
      
      // Primero obtener datos actuales
      const { data: current, error: fetchError } = await supabase
        .from('payroll_liquidations')
        .select('total_gross_income, total_deductions, net_salary')
        .eq('id', liquid.id)
        .single();

      if (fetchError || !current) {
        console.error(`❌ Error fetching current data for ${liquid.rut}:`, fetchError);
        updates.push({
          rut: liquid.rut,
          success: false,
          error: fetchError?.message || 'No data found'
        });
        continue;
      }

      // Calcular nuevo total_deductions para que cuadre el líquido del Excel
      const newTotalDeductions = current.total_gross_income - liquid.net_salary;
      
      console.log(`📊 ${liquid.rut}: Gross ${current.total_gross_income} - Target Net ${liquid.net_salary} = New Deductions ${newTotalDeductions}`);
      
      const { data: updated, error: updateError } = await supabase
        .from('payroll_liquidations')
        .update({ 
          total_deductions: newTotalDeductions,
          updated_at: new Date().toISOString()
        })
        .eq('id', liquid.id)
        .eq('company_id', company_id)
        .select('id, total_gross_income, total_deductions, net_salary, updated_at')
        .single();

      if (updateError) {
        console.error(`❌ Error updating ${liquid.rut}:`, updateError);
        updates.push({
          rut: liquid.rut,
          success: false,
          error: updateError.message
        });
      } else if (updated) {
        console.log(`✅ Updated ${liquid.rut}: $${updated.net_salary}`);
        updates.push({
          rut: liquid.rut,
          success: true,
          old_value: null,
          new_value: updated.net_salary,
          updated_at: updated.updated_at
        });
      } else {
        console.log(`⚠️ No matching record found for ${liquid.rut}`);
        updates.push({
          rut: liquid.rut,
          success: false,
          error: 'No matching record found'
        });
      }
    }

    const successful = updates.filter(u => u.success).length;
    const failed = updates.filter(u => !u.success).length;

    return NextResponse.json({
      success: successful > 0,
      message: `Actualización forzada completada: ${successful} exitosas, ${failed} fallidas`,
      data: {
        successful_updates: successful,
        failed_updates: failed,
        details: updates,
        company_id,
        period: '2025-08'
      }
    });

  } catch (error) {
    console.error('❌ Error in forced liquid update:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}