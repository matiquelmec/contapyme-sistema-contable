import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    
    console.log('🔄 Actualizando AFP de empleados:', updates);
    
    for (const update of updates) {
      const { rut, afp_name } = update;
      
      // Actualizar en payroll_liquidations
      const { error: liquidationError } = await supabase
        .from('payroll_liquidations')
        .update({ afp_name: afp_name })
        .eq('employee_rut', rut);
        
      if (liquidationError) {
        console.error('Error actualizando liquidación para RUT:', rut, liquidationError);
      } else {
        console.log('✅ AFP actualizada para RUT:', rut, 'a:', afp_name);
      }
      
      // También actualizar en payroll_config si existe
      const { error: configError } = await supabase
        .from('payroll_config')
        .update({ afp_name: afp_name })
        .eq('employee_rut', rut);
        
      if (configError) {
        console.log('ℹ️ No se pudo actualizar payroll_config para RUT:', rut, '(puede no existir)');
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `AFP actualizada para ${updates.length} empleados` 
    });
    
  } catch (error) {
    console.error('Error actualizando AFP:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}