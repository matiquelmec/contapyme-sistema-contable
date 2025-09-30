import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    console.log('🔧 FIXING GRATIFICATION - Company ID:', companyId);

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // 1. Buscar todas las liquidaciones con gratificación Art. 50 > 0
    const { data: liquidationsWithGratification, error: fetchError } = await supabase
      .from('payroll_liquidations')
      .select('id, legal_gratification_art50, total_gross_income, base_salary, net_salary, total_deductions')
      .eq('company_id', companyId)
      .gt('legal_gratification_art50', 0);

    if (fetchError) {
      console.error('❌ Error fetching liquidations:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener liquidaciones' },
        { status: 500 }
      );
    }

    console.log(`🔍 Encontradas ${liquidationsWithGratification?.length || 0} liquidaciones con gratificación`);

    const updates = [];
    const fixes = [];

    for (const liquidation of liquidationsWithGratification || []) {
      const gratificationAmount = liquidation.legal_gratification_art50 || 0;
      const currentTotalGross = liquidation.total_gross_income || 0;
      const baseSalary = liquidation.base_salary || 0;
      const currentNetSalary = liquidation.net_salary || 0;
      const totalDeductions = liquidation.total_deductions || 0;

      // Verificar si la gratificación NO está incluida en el total
      const expectedMinimumTotal = baseSalary + gratificationAmount;
      const needsFix = currentTotalGross < expectedMinimumTotal;

      if (needsFix) {
        const correctedTotalGross = currentTotalGross + gratificationAmount;
        const correctedNetSalary = correctedTotalGross - totalDeductions;

        console.log(`🔧 Liquidación ${liquidation.id}:`);
        console.log(`  - Total original: ${currentTotalGross}`);
        console.log(`  - Gratificación: ${gratificationAmount}`);
        console.log(`  - Total corregido: ${correctedTotalGross}`);
        console.log(`  - Líquido corregido: ${correctedNetSalary}`);

        updates.push({
          id: liquidation.id,
          total_gross_income: correctedTotalGross,
          net_salary: correctedNetSalary,
          updated_at: new Date().toISOString()
        });

        fixes.push({
          id: liquidation.id,
          original_total: currentTotalGross,
          gratification: gratificationAmount,
          corrected_total: correctedTotalGross,
          original_net: currentNetSalary,
          corrected_net: correctedNetSalary
        });
      }
    }

    console.log(`🎯 Se requieren ${updates.length} actualizaciones`);

    // 2. Aplicar actualizaciones una por una
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        const { error: updateError } = await supabase
          .from('payroll_liquidations')
          .update({
            total_gross_income: update.total_gross_income,
            net_salary: update.net_salary,
            updated_at: update.updated_at
          })
          .eq('id', update.id)
          .eq('company_id', companyId);

        if (updateError) {
          console.error(`❌ Error updating liquidation ${update.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated liquidation ${update.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception updating liquidation ${update.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total_liquidations_checked: liquidationsWithGratification?.length || 0,
        liquidations_needing_fix: updates.length,
        successful_updates: successCount,
        failed_updates: errorCount,
        fixes: fixes
      },
      message: `Proceso completado: ${successCount} actualizaciones exitosas, ${errorCount} errores`
    });

  } catch (error) {
    console.error('❌ Error in POST /api/payroll/liquidations/fix-gratification:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}