// ==========================================
// API PARA UPLOAD MÚLTIPLE DE F29
// Procesa múltiples archivos en paralelo
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { parseF29 } from '@/lib/parsers/f29Parser';
import { insertF29Form } from '@/lib/database/databaseSimple';

// Configuración para archivos grandes
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos
export const dynamic = 'force-dynamic';

interface ProcessResult {
  file_name: string;
  period?: string;
  success: boolean;
  error?: string;
  confidence_score?: number;
  extracted_data?: any;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Iniciando upload múltiple F29...');
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('f29_files') as File[];
    const companyId = formData.get('company_id') as string;
    const userId = formData.get('user_id') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron archivos' },
        { status: 400 }
      );
    }

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'company_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    console.log(`📤 Procesando ${files.length} archivos F29...`);

    // Validar tipos de archivo
    const validFiles = files.filter(file => file.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      console.warn(`⚠️ ${files.length - validFiles.length} archivos no son PDF`);
    }

    // Procesar archivos en lotes de 3 para evitar sobrecargar
    const batchSize = 3;
    const results: ProcessResult[] = [];

    for (let i = 0; i < validFiles.length; i += batchSize) {
      const batch = validFiles.slice(i, i + batchSize);
      console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(validFiles.length/batchSize)}`);

      const batchPromises = batch.map(async (file): Promise<ProcessResult> => {
        try {
          console.log(`📄 Procesando: ${file.name} (${Math.round(file.size/1024)}KB)`);

          // USAR EL NUEVO PARSER LIMPIO
          console.log(`🚀 Procesando con parser limpio: ${file.name}`);
          const extracted = await parseF29(file);
          
          if (!extracted || extracted.confidence === 0) {
            throw new Error('No se pudieron extraer datos del PDF con ningún parser');
          }

          // 2. Usar período detectado por el smart parser
          const period = extracted.periodo || detectPeriodFromFileName(file.name);
          
          if (!period) {
            throw new Error('No se pudo detectar el período del formulario');
          }

          return {
            file_name: file.name,
            period,
            success: true,
            confidence_score: extracted.confidence,
            data: extracted, // Agregar datos extraídos para el frontend
            diagnostic: extracted.debugInfo || {}, // Agregar info de diagnóstico si existe
            extracted_data: {
              raw_data: extracted,
              calculated_data: {
                rut: extracted.rut,
                periodo: extracted.periodo,
                folio: extracted.folio,
                razonSocial: extracted.razonSocial,
                codigo538: extracted.codigo538,
                codigo511: extracted.codigo511,
                codigo563: extracted.codigo563,
                codigo062: extracted.codigo062,
                codigo077: extracted.codigo077,
                comprasNetas: extracted.comprasNetas,
                ivaPagar: extracted.ivaDeterminado,
                totalAPagar: extracted.totalAPagar,
                confidence: extracted.confidence,
                method: extracted.method,
                debugInfo: extracted.debugInfo
              },
              file_size: file.size,
              period,
              rut: extracted.rut || '',
              folio: extracted.folio || ''
            }
          };

        } catch (error) {
          console.error(`❌ Error procesando ${file.name}:`, error);
          return {
            file_name: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Pequeña pausa entre lotes
      if (i + batchSize < validFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 5. Guardar resultados exitosos en base de datos
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Exitosos: ${successful.length}, ❌ Fallidos: ${failed.length}`);

    if (successful.length > 0) {
      try {
        let savedCount = 0;
        
        for (const result of successful) {
          const dbRecord = {
            company_id: companyId,
            user_id: userId,
            period: result.period,
            file_name: result.file_name,
            file_size: result.extracted_data.file_size,
            raw_data: result.extracted_data.raw_data,
            calculated_data: result.extracted_data.calculated_data,
            confidence_score: result.confidence_score,
            validation_status: result.confidence_score && result.confidence_score >= 70 ? 'validated' : 'manual_review',
            rut: result.extracted_data.rut,
            folio: result.extracted_data.folio,
            // Extraer métricas principales
            ventas_netas: result.extracted_data.calculated_data?.codigo563 || 0,
            compras_netas: result.extracted_data.calculated_data?.compras_calculadas || 0,
            iva_debito: result.extracted_data.calculated_data?.codigo538 || 0,
            iva_credito: result.extracted_data.calculated_data?.codigo511 || 0,
            iva_determinado: (result.extracted_data.calculated_data?.codigo538 || 0) - (result.extracted_data.calculated_data?.codigo511 || 0),
            ppm: result.extracted_data.calculated_data?.codigo062 || 0,
            remanente: result.extracted_data.calculated_data?.codigo077 || 0,
            margen_bruto: (result.extracted_data.calculated_data?.codigo563 || 0) - (result.extracted_data.calculated_data?.compras_calculadas || 0),
            codigo_538: result.extracted_data.calculated_data?.codigo538 || 0,
            codigo_511: result.extracted_data.calculated_data?.codigo511 || 0,
            codigo_563: result.extracted_data.calculated_data?.codigo563 || 0,
            codigo_062: result.extracted_data.calculated_data?.codigo062 || 0,
            codigo_077: result.extracted_data.calculated_data?.codigo077 || 0,
            year: result.period ? parseInt(result.period.substring(0, 4)) : new Date().getFullYear(),
            month: result.period ? parseInt(result.period.substring(4, 6)) : new Date().getMonth() + 1
          };

          const { error: insertError } = await insertF29Form(dbRecord);
          
          if (insertError) {
            console.error(`❌ Error guardando ${result.file_name}:`, insertError);
          } else {
            savedCount++;
          }
        }

        console.log(`💾 Guardados ${savedCount}/${successful.length} registros en BD`);

      } catch (dbError) {
        console.error('❌ Error de base de datos:', dbError);
      }
    }

    // 6. Generar análisis comparativo si hay suficientes datos
    let analysis = null;
    if (successful.length >= 3) { // Mínimo 3 formularios para análisis básico
      try {
        console.log('📊 Generando análisis comparativo...');
        analysis = await generateQuickAnalysis(successful, companyId);
      } catch (analysisError) {
        console.error('❌ Error generando análisis:', analysisError);
      }
    }

    // 7. Respuesta final
    const response = {
      success: true,
      summary: {
        total_files: files.length,
        processed: validFiles.length,
        successful: successful.length,
        failed: failed.length,
        has_analysis: !!analysis
      },
      results: results.map(r => ({
        file_name: r.file_name,
        success: r.success,
        period: r.period,
        confidence_score: r.confidence_score,
        error: r.error,
        data: (r as any).data // Incluir datos extraídos
      })),
      analysis,
      next_steps: generateNextSteps(successful.length, failed.length)
    };

    console.log('🎉 Upload múltiple completado exitosamente');
    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 Error fatal en upload múltiple:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function detectPeriodFromFileName(fileName: string): string | null {
  // Intentar extraer período YYYYMM del nombre del archivo
  const periodMatch = fileName.match(/(\d{4})(\d{2})/);
  if (periodMatch) {
    return periodMatch[1] + periodMatch[2];
  }
  
  // Si no se encuentra, usar período actual como fallback
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

function detectPeriodFromData(data: any, fileName: string): string | null {
  // 1. Intentar desde datos extraídos
  if (data.period && /^\d{6}$/.test(data.period)) {
    return data.period;
  }

  // 2. Intentar desde año y mes separados
  if (data.year && data.month) {
    const year = parseInt(data.year);
    const month = parseInt(data.month);
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      return `${year}${month.toString().padStart(2, '0')}`;
    }
  }

  // 3. Intentar desde nombre del archivo
  const fileNameMatch = fileName.match(/(\d{4}).*?(\d{1,2})/);
  if (fileNameMatch) {
    const year = parseInt(fileNameMatch[1]);
    const month = parseInt(fileNameMatch[2]);
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      return `${year}${month.toString().padStart(2, '0')}`;
    }
  }

  // 4. Intentar patrón YYYYMM directamente en nombre
  const directMatch = fileName.match(/(\d{6})/);
  if (directMatch) {
    const period = directMatch[1];
    const year = parseInt(period.substring(0, 4));
    const month = parseInt(period.substring(4, 6));
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      return period;
    }
  }

  return null;
}

function calculateConfidenceScore(data: any): number {
  let score = 0;

  // Verificar presencia de códigos principales (40 puntos)
  if (data.codigo538 && data.codigo538 > 0) score += 15;
  if (data.codigo511 && data.codigo511 > 0) score += 15;
  if (data.codigo563 && data.codigo563 > 0) score += 10;

  // Verificar coherencia matemática (30 puntos)
  if (data.codigo538 && data.codigo511) {
    const ivaCalculado = data.codigo538 - data.codigo511;
    if (Math.abs(ivaCalculado - (data.iva_determinado || 0)) < 100) {
      score += 20;
    }
  }

  if (data.codigo563 && data.codigo538) {
    const comprasCalculadas = data.codigo538 / 0.19;
    if (data.codigo563 > comprasCalculadas * 0.5 && data.codigo563 < comprasCalculadas * 2) {
      score += 10;
    }
  }

  // Verificar información básica (20 puntos)
  if (data.rut && /^\d{1,2}\.\d{3}\.\d{3}-[\dK]$/.test(data.rut)) score += 10;
  if (data.folio) score += 5;
  if (data.period || data.year) score += 5;

  // Verificar valores razonables (10 puntos)
  if (data.codigo563 && data.codigo563 > 1000000 && data.codigo563 < 100000000000) score += 10;

  return Math.min(score, 100);
}

async function generateQuickAnalysis(successful: ProcessResult[], companyId: string) {
  try {
    const periods = successful
      .filter(r => r.period)
      .map(r => r.period!)
      .sort();

    // Extraer datos para análisis
    const analysisData = successful.map(r => {
      const calcs = r.extracted_data?.calculated_data || {};
      const ventas = calcs.codigo563 || 0;
      const comprasNetas = calcs.comprasNetas || 0;
      const rut = calcs.rut || r.extracted_data?.rut || '';
      const periodo = r.period || '';
      
      return {
        period: periodo,
        rut: rut,
        ventas: typeof ventas === 'number' ? ventas : parseFloat(ventas.toString()) || 0,
        comprasNetas: typeof comprasNetas === 'number' ? comprasNetas : parseFloat(comprasNetas.toString()) || 0,
        codigo511: calcs.codigo511 || 0,
        codigo538: calcs.codigo538 || 0,
        codigo562: calcs.codigo562 || 0
      };
    }).filter(d => d.period);

    if (analysisData.length < 2) {
      return null;
    }

    // Validar mismo RUT
    const ruts = analysisData.map(d => d.rut).filter(r => r);
    const uniqueRuts = [...new Set(ruts)];
    if (uniqueRuts.length > 1) {
      return {
        error: 'Los formularios F29 corresponden a diferentes RUTs',
        ruts_encontrados: uniqueRuts
      };
    }

    // Validar año completo (01-12)
    const yearGroups = analysisData.reduce((acc, d) => {
      const year = d.period.substring(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(d);
      return acc;
    }, {} as Record<string, typeof analysisData>);

    // Buscar año completo
    let yearCompleteData = null;
    let selectedYear = '';
    
    for (const [year, data] of Object.entries(yearGroups)) {
      const months = data.map(d => parseInt(d.period.substring(4, 6)));
      const hasAllMonths = Array.from({length: 12}, (_, i) => i + 1)
        .every(month => months.includes(month));
      
      if (hasAllMonths && data.length === 12) {
        yearCompleteData = data.sort((a, b) => a.period.localeCompare(b.period));
        selectedYear = year;
        break;
      }
    }

    // Cálculos anuales
    const totalVentasAnual = analysisData.reduce((sum, d) => sum + d.ventas, 0);
    const totalComprasNetasAnual = analysisData.reduce((sum, d) => sum + d.comprasNetas, 0);
    const margenBrutoAnual = totalVentasAnual > 0 
      ? ((totalVentasAnual - totalComprasNetasAnual) / totalVentasAnual) * 100
      : 0;

    // Análisis mensual
    const promedioVentas = totalVentasAnual / analysisData.length;
    const promedioCompras = totalComprasNetasAnual / analysisData.length;
    
    const ventasOrdenadas = [...analysisData].sort((a, b) => a.ventas - b.ventas);
    const mejorMes = ventasOrdenadas[ventasOrdenadas.length - 1];
    const peorMes = ventasOrdenadas[0];

    // Crecimiento
    const crecimiento = analysisData.length >= 2 
      ? ((analysisData[analysisData.length - 1].ventas - analysisData[0].ventas) / analysisData[0].ventas) * 100
      : 0;

    return {
      periodos_analizados: periods.length,
      rango_temporal: {
        inicio: periods[0],
        fin: periods[periods.length - 1]
      },
      validacion_anual: {
        tiene_año_completo: !!yearCompleteData,
        año_analizado: selectedYear || null,
        meses_presentes: yearCompleteData ? yearCompleteData.map(d => parseInt(d.period.substring(4, 6))) : [],
        rut_validado: uniqueRuts[0] || 'No detectado'
      },
      metricas_anuales: {
        total_ventas_anual: totalVentasAnual,
        total_compras_netas_anual: totalComprasNetasAnual,
        margen_bruto_anual_porcentaje: margenBrutoAnual,
        margen_bruto_anual_monto: totalVentasAnual - totalComprasNetasAnual
      },
      metricas_clave: {
        total_ventas: totalVentasAnual,
        promedio_mensual: promedioVentas,
        promedio_compras_mensual: promedioCompras,
        crecimiento_periodo: crecimiento,
        mejor_mes: mejorMes,
        peor_mes: peorMes
      },
      insights_iniciales: [
        `📊 Se analizaron ${periods.length} períodos de F29`,
        yearCompleteData ? `✅ Año completo ${selectedYear} validado (12 meses)` : `⚠️ No se encontró un año completo con 12 meses`,
        `💰 Ventas netas totales: $${Math.round(totalVentasAnual).toLocaleString()}`,
        `🛒 Compras netas totales: $${Math.round(totalComprasNetasAnual).toLocaleString()}`,
        `📈 Margen bruto anual: ${margenBrutoAnual.toFixed(1)}% ($${Math.round(totalVentasAnual - totalComprasNetasAnual).toLocaleString()})`,
        `📅 Mejor mes: ${mejorMes.period} con $${Math.round(mejorMes.ventas).toLocaleString()} en ventas`,
        crecimiento > 0 
          ? `🚀 Crecimiento positivo del ${crecimiento.toFixed(1)}%`
          : `📉 Decrecimiento del ${Math.abs(crecimiento).toFixed(1)}%`
      ]
    };

  } catch (error) {
    console.error('Error en análisis rápido:', error);
    return null;
  }
}

function generateNextSteps(successful: number, failed: number): string[] {
  const steps: string[] = [];

  if (successful > 0) {
    steps.push(`✅ ${successful} formularios procesados exitosamente`);
  }

  if (failed > 0) {
    steps.push(`⚠️ ${failed} archivos fallaron - revisa la calidad de los PDFs`);
  }

  if (successful >= 6) {
    steps.push('📊 Suficientes datos para análisis comparativo completo');
    steps.push('🎯 Ve al dashboard para insights detallados');
  } else if (successful >= 3) {
    steps.push('📈 Análisis básico disponible - agrega más F29 para insights completos');
  } else if (successful >= 1) {
    steps.push('📄 Pocos formularios para análisis - sube más F29 de diferentes períodos');
  }

  return steps;
}