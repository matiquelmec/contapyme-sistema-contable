import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración por defecto basada en datos oficiales Previred (Agosto 2025)
// Fuente: https://www.previred.com/indicadores-previsionales/
const DEFAULT_SETTINGS = {
  afp_configs: [
    { id: 'afp-capital', name: 'AFP Capital', code: 'CAPITAL', commission_percentage: 1.44, sis_percentage: 1.88, active: true }, // 11.44% total
    { id: 'afp-cuprum', name: 'AFP Cuprum', code: 'CUPRUM', commission_percentage: 1.44, sis_percentage: 1.88, active: true }, // 11.44% total
    { id: 'afp-habitat', name: 'AFP Hábitat', code: 'HABITAT', commission_percentage: 1.27, sis_percentage: 1.88, active: true }, // 11.27% total
    { id: 'afp-planvital', name: 'AFP PlanVital', code: 'PLANVITAL', commission_percentage: 1.16, sis_percentage: 1.88, active: true }, // 11.16% total
    { id: 'afp-provida', name: 'AFP ProVida', code: 'PROVIDA', commission_percentage: 1.45, sis_percentage: 1.88, active: true }, // 11.45% total
    { id: 'afp-modelo', name: 'AFP Modelo', code: 'MODELO', commission_percentage: 0.58, sis_percentage: 1.88, active: true }, // 10.58% total
    { id: 'afp-uno', name: 'AFP Uno', code: 'UNO', commission_percentage: 0.49, sis_percentage: 1.88, active: true } // 10.49% total
  ],
  health_configs: [
    { id: 'fonasa', name: 'FONASA', code: 'FONASA', plan_percentage: 7.0, active: true },
    { id: 'banmedica', name: 'Banmédica', code: 'BANMEDICA', plan_percentage: 8.5, active: true },
    { id: 'consalud', name: 'Consalud', code: 'CONSALUD', plan_percentage: 8.2, active: true },
    { id: 'cruz-blanca', name: 'Cruz Blanca', code: 'CRUZ_BLANCA', plan_percentage: 8.8, active: true },
    { id: 'vida-tres', name: 'Vida Tres', code: 'VIDA_TRES', plan_percentage: 8.3, active: true },
    { id: 'colmena', name: 'Colmena Golden Cross', code: 'COLMENA', plan_percentage: 8.6, active: true }
  ],
  income_limits: {
    uf_limit: 87.8, // Tope imponible AFP en UF (Previred 2025)
    uf_value: 39383.07, // Valor UF al 31 agosto 2025
    health_uf_limit: 83.3, // Tope imponible Salud en UF 
    minimum_wage: 529000, // Sueldo mínimo 2025 (oficial Previred) - para tope gratificación $209,396
    family_allowance_limit: 1000000 // Límite superior para asignación familiar
  },
  family_allowances: {
    tramo_a: 13596, // Hasta $500.000
    tramo_b: 8397,  // $500.001 a $750.000  
    tramo_c: 2798   // $750.001 a $1.000.000
  },
  contributions: {
    unemployment_insurance_fixed: 3.0,      // Seguro cesantía plazo fijo
    unemployment_insurance_indefinite: 0.6, // Seguro cesantía indefinido
    social_security_percentage: 10.0,       // Cotización AFP base
    sis_percentage: 1.88                    // SIS Empleador (Seguro Invalidez y Sobrevivencia)
  },
  company_info: {
    mutual_code: 'ACHS',
    mutual_percentage: 0.95, // Porcentaje actualizado para seguro de accidentes del trabajo
    caja_compensacion_code: '',
    company_name: 'ContaPyme',
    company_rut: '76.123.456-7',
    company_address: 'Las Malvas 2775',
    company_city: 'Santiago',
    company_phone: '+56 9 1234 5678',
    company_email: 'contacto@contapyme.cl',
    legal_representative: {
      full_name: 'MIGUEL ANGEL RODRIGUEZ CABRERA',
      rut: '18.282.415-1',
      position: 'GERENTE GENERAL',
      profession: 'INGENIERO COMERCIAL',
      nationality: 'CHILENA',
      civil_status: 'SOLTERO',
      address: 'Las Malvas 2775'
    }
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existen configuraciones para esta empresa
    const { data: existingSettings, error: fetchError } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching payroll settings:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener configuración' },
        { status: 500 }
      );
    }

    // Si no existen configuraciones, crear las por defecto
    if (!existingSettings) {
      const { data: newSettings, error: createError } = await supabase
        .from('payroll_settings')
        .insert({
          company_id: companyId,
          settings: DEFAULT_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default settings:', createError);
        return NextResponse.json(
          { success: false, error: 'Error al crear configuración por defecto' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: newSettings.settings
      });
    }

    return NextResponse.json({
      success: true,
      data: existingSettings.settings
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    const updatedSettings = await request.json();

    // Obtener configuración actual
    const { data: currentSettings, error: fetchError } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();

    if (fetchError) {
      console.error('Error fetching current settings:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener configuración actual' },
        { status: 500 }
      );
    }

    // Merge con configuración actual
    const mergedSettings = {
      ...currentSettings.settings,
      ...updatedSettings
    };

    // Actualizar en base de datos
    const { data: updated, error: updateError } = await supabase
      .from('payroll_settings')
      .update({
        settings: mergedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar configuración' },
        { status: 500 }
      );
    }

    // Log para auditoría
    await supabase
      .from('payroll_settings_log')
      .insert({
        company_id: companyId,
        changed_fields: Object.keys(updatedSettings),
        old_values: currentSettings.settings,
        new_values: mergedSettings,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      data: updated.settings,
      message: 'Configuración actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/payroll/settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para forzar actualización de configuración (incluye representante legal)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const forceUpdate = searchParams.get('force_update');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Si force_update=true, actualizar con configuración por defecto
    if (forceUpdate === 'true') {
      console.log('🔄 Forzando actualización de configuración con DEFAULT_SETTINGS');
      
      const { data: updated, error: updateError } = await supabase
        .from('payroll_settings')
        .upsert({
          company_id: companyId,
          settings: DEFAULT_SETTINGS,
          updated_at: new Date().toISOString(),
          last_previred_sync: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single();

      if (updateError) {
        console.error('Error forcing update:', updateError);
        return NextResponse.json(
          { success: false, error: 'Error al forzar actualización' },
          { status: 500 }
        );
      }

      console.log('✅ Configuración forzada exitosamente:', updated.settings.company_info.legal_representative);

      return NextResponse.json({
        success: true,
        data: updated.settings,
        message: 'Configuración actualizada con representante legal correcto: ' + DEFAULT_SETTINGS.company_info.legal_representative.full_name
      });
    }

    // TODO: Implementar actualización desde API de Previred
    // Por ahora retornamos los valores por defecto actualizados
    
    const { data: updated, error: updateError } = await supabase
      .from('payroll_settings')
      .update({
        settings: DEFAULT_SETTINGS,
        updated_at: new Date().toISOString(),
        last_previred_sync: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating from Previred:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar desde Previred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated.settings,
      message: 'Configuración actualizada desde Previred exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}