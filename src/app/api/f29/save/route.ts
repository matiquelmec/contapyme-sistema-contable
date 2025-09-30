import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  console.log('💾 F29 Save API: Guardando F29 en base de datos...');
  
  try {
    const body = await request.json();
    const { 
      parsedData, 
      fileName, 
      userId = '550e8400-e29b-41d4-a716-446655440000', // Demo user por defecto
      companyId = '550e8400-e29b-41d4-a716-446655440001' // Demo company por defecto
    } = body;

    if (!parsedData) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se proporcionaron datos para guardar' 
      }, { status: 400 });
    }

    // Extraer período del F29 (formato YYYYMM)
    let period = parsedData.periodo || '';
    if (!period && parsedData.year && parsedData.month) {
      period = `${parsedData.year}${String(parsedData.month).padStart(2, '0')}`;
    }
    
    // Validar formato del período
    if (!period || !/^\d{6}$/.test(period)) {
      console.warn('⚠️ Período inválido o no detectado:', period);
      // Intentar generar un período por defecto basado en la fecha actual
      const now = new Date();
      period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const year = parseInt(period.substring(0, 4));
    const month = parseInt(period.substring(4, 6));

    // Preparar datos para insertar
    const f29Record = {
      user_id: userId,
      company_id: companyId,
      period: period,
      file_name: fileName || 'f29_upload.pdf',
      year: year,
      month: month,
      rut: parsedData.rut || '',
      folio: parsedData.folio || '',
      
      // Datos completos en JSON
      raw_data: parsedData,
      calculated_data: {
        method: parsedData.method || 'unknown',
        confidence: parsedData.confidence || 0,
        processing_time: new Date().toISOString()
      },
      
      // Campos principales para queries rápidas
      ventas_netas: parsedData.ventasNetas || parsedData.codigo563 || 0,
      compras_netas: parsedData.comprasNetas || 0,
      iva_debito: parsedData.codigo538 || parsedData.debitoFiscal || 0,
      iva_credito: parsedData.codigo511 || parsedData.creditoFiscal || 0,
      iva_determinado: parsedData.ivaDeterminado || 0,
      ppm: parsedData.codigo062 || parsedData.ppm || 0,
      remanente: parsedData.codigo077 || parsedData.remanente || 0,
      total_a_pagar: parsedData.totalAPagar || 0,
      margen_bruto: parsedData.margenBruto || 0,
      
      // Códigos específicos
      codigo_538: parsedData.codigo538 || 0,
      codigo_511: parsedData.codigo511 || 0,
      codigo_563: parsedData.codigo563 || 0,
      codigo_062: parsedData.codigo062 || 0,
      codigo_077: parsedData.codigo077 || 0,
      
      // Validación
      confidence_score: parsedData.confidence || 0,
      validation_status: parsedData.confidence > 80 ? 'validated' : 'manual_review',
      validation_errors: parsedData.errors || []
    };

    console.log('📝 Preparando insert para período:', period);

    // Intentar actualizar si ya existe (upsert)
    const { data, error } = await supabase
      .from('f29_forms')
      .upsert(f29Record, {
        onConflict: 'company_id,period',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error guardando F29:', error);
      
      // Si es error de constraint único, intentar actualizar
      if (error.code === '23505') {
        console.log('🔄 F29 ya existe para este período, actualizando...');
        
        const { data: updateData, error: updateError } = await supabase
          .from('f29_forms')
          .update(f29Record)
          .eq('company_id', companyId)
          .eq('period', period)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        return NextResponse.json({
          success: true,
          message: 'F29 actualizado exitosamente',
          data: updateData,
          action: 'updated'
        });
      }
      
      throw error;
    }

    console.log('✅ F29 guardado exitosamente:', data?.id);

    // Opcional: Limpiar análisis comparativo cacheado para forzar recálculo
    if (data) {
      await supabase
        .from('f29_comparative_analysis')
        .delete()
        .eq('company_id', companyId)
        .gte('period_start', period)
        .lte('period_end', period);
    }

    return NextResponse.json({
      success: true,
      message: 'F29 guardado exitosamente en base de datos',
      data: data,
      action: 'created',
      summary: {
        id: data?.id,
        period: period,
        ventas: f29Record.ventas_netas,
        confidence: f29Record.confidence_score
      }
    });

  } catch (error) {
    console.error('❌ Error en F29 Save API:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Error guardando F29'
    }, { status: 500 });
  }
}

// GET - Obtener F29 guardados
export async function GET(request: NextRequest) {
  console.log('📖 F29 Save API: Obteniendo F29 guardados...');
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || '550e8400-e29b-41d4-a716-446655440001';
    const userId = searchParams.get('user_id');
    const period = searchParams.get('period');
    const limit = parseInt(searchParams.get('limit') || '24');

    let query = supabase
      .from('f29_forms')
      .select('*')
      .eq('company_id', companyId)
      .order('period', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Agrupar por año para mejor visualización
    const groupedByYear = data?.reduce((acc: any, f29: any) => {
      const year = f29.year || f29.period.substring(0, 4);
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(f29);
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      data: data || [],
      grouped: groupedByYear,
      summary: {
        total: data?.length || 0,
        years: Object.keys(groupedByYear),
        latest: data?.[0]?.period,
        oldest: data?.[data.length - 1]?.period
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo F29:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo F29'
    }, { status: 500 });
  }
}