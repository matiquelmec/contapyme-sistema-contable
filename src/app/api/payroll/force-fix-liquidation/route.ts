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
    
    // Obtener la liquidación actual con SQL directo
    const { data: liquidationData, error: fetchError } = await supabase
      .from('payroll_liquidations')
      .select('*')
      .eq('id', liquidation_id)
      .single();
    
    if (fetchError || !liquidationData) {
      return NextResponse.json(
        { error: 'Liquidación no encontrada', details: fetchError },
        { status: 404 }
      );
    }
    
    // Calcular los valores correctos manualmente
    const taxableIncome = (liquidationData.base_salary || 0) + 
                         (liquidationData.overtime_amount || 0) + 
                         (liquidationData.bonuses || 0) + 
                         (liquidationData.commissions || 0) + 
                         (liquidationData.gratification || 0) + 
                         (liquidationData.legal_gratification_art50 || 0);
    
    const nonTaxableIncome = (liquidationData.food_allowance || 0) + 
                            (liquidationData.transport_allowance || 0) + 
                            (liquidationData.family_allowance || 0) + 
                            (liquidationData.other_allowances || 0);
    
    const grossIncome = taxableIncome + nonTaxableIncome;
    
    // Usar RPC (Remote Procedure Call) para ejecutar SQL directo
    const { data: updateResult, error: updateError } = await supabase
      .rpc('force_update_liquidation_totals', {
        p_liquidation_id: liquidation_id,
        p_total_taxable_income: taxableIncome,
        p_total_non_taxable_income: nonTaxableIncome,
        p_total_gross_income: grossIncome
      });
    
    if (updateError) {
      // Si el RPC no funciona, intentar con SQL directo menos complejo
      const sqlQuery = `
        UPDATE payroll_liquidations 
        SET 
          total_taxable_income = ${taxableIncome},
          total_non_taxable_income = ${nonTaxableIncome},
          total_gross_income = ${grossIncome},
          updated_at = NOW()
        WHERE id = '${liquidation_id}'
        RETURNING *;
      `;
      
      const { data: directUpdate, error: directError } = await supabase
        .from('payroll_liquidations')
        .select('*')
        .eq('id', liquidation_id)
        .single();
        
      // Intentar actualización directa campo por campo
      const updates = [
        { field: 'total_taxable_income', value: taxableIncome },
        { field: 'total_non_taxable_income', value: nonTaxableIncome },
        { field: 'total_gross_income', value: grossIncome }
      ];
      
      let successCount = 0;
      const errors = [];
      
      for (const update of updates) {
        try {
          const { error: fieldError } = await supabase
            .from('payroll_liquidations')
            .update({ [update.field]: update.value })
            .eq('id', liquidation_id);
            
          if (fieldError) {
            errors.push(`${update.field}: ${fieldError.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`${update.field}: ${err}`);
        }
      }
      
      return NextResponse.json({
        success: successCount > 0,
        message: `Actualización parcial completada: ${successCount}/3 campos`,
        data: {
          id: liquidation_id,
          updates_applied: successCount,
          total_updates: 3,
          values: {
            total_taxable_income: taxableIncome,
            total_non_taxable_income: nonTaxableIncome,
            total_gross_income: grossIncome
          },
          errors: errors,
          calculation_details: {
            base_salary: liquidationData.base_salary || 0,
            bonuses: liquidationData.bonuses || 0,
            legal_gratification_art50: liquidationData.legal_gratification_art50 || 0,
            food_allowance: liquidationData.food_allowance || 0
          }
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Liquidación forzada a valores correctos',
      data: {
        id: liquidation_id,
        previous: {
          total_taxable_income: liquidationData.total_taxable_income,
          total_non_taxable_income: liquidationData.total_non_taxable_income,
          total_gross_income: liquidationData.total_gross_income
        },
        updated: {
          total_taxable_income: taxableIncome,
          total_non_taxable_income: nonTaxableIncome,
          total_gross_income: grossIncome
        },
        calculation_details: {
          base_salary: liquidationData.base_salary || 0,
          bonuses: liquidationData.bonuses || 0,
          legal_gratification_art50: liquidationData.legal_gratification_art50 || 0,
          food_allowance: liquidationData.food_allowance || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error en force-fix-liquidation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}