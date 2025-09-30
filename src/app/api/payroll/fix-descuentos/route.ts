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
        { error: 'Liquidación no encontrada', details: fetchError },
        { status: 404 }
      );
    }
    
    // Valores exactos proporcionados por el usuario (corregidos)
    const afpCombinadoPorcentaje = 11.27; // 10% AFP + 1.27% Comisión
    const afpMonto = 75932; // Valor exacto proporcionado corregido
    const saludMonto = 47163; // Valor exacto proporcionado corregido
    const cesantiaMonto = 4043; // Valor exacto proporcionado corregido
    
    // Separar AFP y comisión para la base de datos
    const afpPorcentaje = 10.0;
    const afpComisionPorcentaje = 1.27;
    const afpBase = Math.round(afpMonto * (10.0 / 11.27));
    const afpComisionBase = afpMonto - afpBase;
    const saludPorcentaje = 7.0;
    const cesantiaPorcentaje = 0.6;
    
    const totalDescuentos = afpMonto + saludMonto + cesantiaMonto;
    const liquidoAPagar = liquidation.total_gross_income - totalDescuentos;
    
    // Actualizar con valores correctos
    const { data: updated, error: updateError } = await supabase
      .from('payroll_liquidations')
      .update({
        afp_percentage: afpPorcentaje,
        afp_amount: afpBase,
        afp_commission_percentage: afpComisionPorcentaje,
        afp_commission_amount: afpComisionBase,
        health_percentage: saludPorcentaje,
        health_amount: saludMonto,
        unemployment_percentage: cesantiaPorcentaje,
        unemployment_amount: cesantiaMonto,
        total_deductions: totalDescuentos,
        net_salary: liquidoAPagar,
        updated_at: new Date().toISOString()
      })
      .eq('id', liquidation_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error actualizando descuentos:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar descuentos', details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Descuentos corregidos según normativa chilena 2025',
      data: {
        id: liquidation_id,
        descuentos_corregidos: {
          afp_combinado: { porcentaje: afpCombinadoPorcentaje, monto: afpMonto },
          afp_base: { porcentaje: afpPorcentaje, monto: afpBase },
          afp_comision: { porcentaje: afpComisionPorcentaje, monto: afpComisionBase },
          salud: { porcentaje: saludPorcentaje, monto: saludMonto },
          cesantia: { porcentaje: cesantiaPorcentaje, monto: cesantiaMonto },
          total: totalDescuentos
        },
        liquido_a_pagar: liquidoAPagar,
        valores_exactos_aplicados: {
          afp_total: `$${afpMonto.toLocaleString('es-CL')} (11.27%)`,
          salud: `$${saludMonto.toLocaleString('es-CL')} (7%)`, 
          cesantia: `$${cesantiaMonto.toLocaleString('es-CL')} (0.6%)`,
          total: `$${totalDescuentos.toLocaleString('es-CL')}`,
          nota: "PDF calculará dinámicamente sumando todos los descuentos existentes"
        }
      }
    });
    
  } catch (error) {
    console.error('Error en fix-descuentos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}