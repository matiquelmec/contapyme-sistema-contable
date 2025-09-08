import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';

export async function POST(request: NextRequest) {
  try {
    const { liquidation_id } = await request.json();
    
    if (!liquidation_id) {
      return NextResponse.json(
        { error: 'liquidation_id es requerido' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // Obtener la liquidación actual
    const { data: liquidation, error: fetchError } = await supabase
      .from('payroll_liquidations')
      .select('*')
      .eq('id', liquidation_id)
      .single();
    
    if (fetchError || !liquidation) {
      return NextResponse.json(
        { error: 'Liquidación no encontrada' },
        { status: 404 }
      );
    }
    
    // Recalcular los totales correctamente
    const taxableIncome = (liquidation.base_salary || 0) + 
                         (liquidation.overtime_amount || 0) + 
                         (liquidation.bonuses || 0) + 
                         (liquidation.commissions || 0) + 
                         (liquidation.gratification || 0) + 
                         (liquidation.legal_gratification_art50 || 0); // INCLUIR ART. 50
    
    const nonTaxableIncome = (liquidation.food_allowance || 0) + 
                            (liquidation.transport_allowance || 0) + 
                            (liquidation.family_allowance || 0);
    
    const grossIncome = taxableIncome + nonTaxableIncome;
    
    // Actualizar con los valores correctos
    const { data: updated, error: updateError } = await supabase
      .from('payroll_liquidations')
      .update({
        total_taxable_income: taxableIncome,
        total_non_taxable_income: nonTaxableIncome,
        total_gross_income: grossIncome
      })
      .eq('id', liquidation_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error actualizando liquidación:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la liquidación', details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Liquidación actualizada correctamente',
      data: {
        id: liquidation_id,
        previous: {
          total_taxable_income: liquidation.total_taxable_income,
          total_non_taxable_income: liquidation.total_non_taxable_income,
          total_gross_income: liquidation.total_gross_income
        },
        updated: {
          total_taxable_income: taxableIncome,
          total_non_taxable_income: nonTaxableIncome,
          total_gross_income: grossIncome
        },
        details: {
          base_salary: liquidation.base_salary || 0,
          bonuses: liquidation.bonuses || 0,
          legal_gratification_art50: liquidation.legal_gratification_art50 || 0,
          food_allowance: liquidation.food_allowance || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error en fix-liquidation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET para verificar el estado actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const liquidation_id = searchParams.get('id');
    
    if (!liquidation_id) {
      return NextResponse.json(
        { error: 'ID de liquidación requerido' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('payroll_liquidations')
      .select('*')
      .eq('id', liquidation_id)
      .single();
    
    if (error || !data) {
      return NextResponse.json(
        { error: 'Liquidación no encontrada' },
        { status: 404 }
      );
    }
    
    // Calcular lo que deberían ser los totales
    const expectedTaxableIncome = (data.base_salary || 0) + 
                                  (data.overtime_amount || 0) + 
                                  (data.bonuses || 0) + 
                                  (data.commissions || 0) + 
                                  (data.gratification || 0) + 
                                  (data.legal_gratification_art50 || 0);
    
    const expectedNonTaxableIncome = (data.food_allowance || 0) + 
                                     (data.transport_allowance || 0) + 
                                     (data.family_allowance || 0);
    
    const expectedGrossIncome = expectedTaxableIncome + expectedNonTaxableIncome;
    
    return NextResponse.json({
      current: {
        id: data.id,
        total_taxable_income: data.total_taxable_income,
        total_non_taxable_income: data.total_non_taxable_income,
        total_gross_income: data.total_gross_income
      },
      expected: {
        total_taxable_income: expectedTaxableIncome,
        total_non_taxable_income: expectedNonTaxableIncome,
        total_gross_income: expectedGrossIncome
      },
      needs_fix: data.total_taxable_income !== expectedTaxableIncome || 
                 data.total_gross_income !== expectedGrossIncome,
      details: {
        base_salary: data.base_salary || 0,
        bonuses: data.bonuses || 0,
        legal_gratification_art50: data.legal_gratification_art50 || 0,
        food_allowance: data.food_allowance || 0
      }
    });
    
  } catch (error) {
    console.error('Error verificando liquidación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}