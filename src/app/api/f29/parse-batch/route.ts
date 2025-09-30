import { NextRequest, NextResponse } from 'next/server';
import { parseF29 } from '@/lib/parsers/f29Parser';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minuto para procesar múltiples archivos
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚀 F29 Batch API: Procesamiento múltiple iniciado...');
  
  try {
    const formData = await request.formData();
    console.log('📋 FormData batch procesado');
    
    // Extraer todos los archivos del FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      console.error('❌ No files provided');
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    
    console.log(`📄 Procesando ${files.length} archivos F29...`);
    
    // Procesar archivos en lotes para evitar sobrecargar el sistema
    const batchSize = 3;
    const results = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(files.length/batchSize)}`);
      
      // Procesar el lote en paralelo
      const batchPromises = batch.map(async (file, index) => {
        try {
          console.log(`📄 Procesando: ${file.name} (${Math.round(file.size/1024)}KB)`);
          
          // Validar tipo de archivo
          if (file.type !== 'application/pdf') {
            throw new Error(`Archivo ${file.name}: Solo se soportan archivos PDF`);
          }
          
          // Procesar con el mismo parser que el análisis individual
          const result = await parseF29(file);
          
          console.log(`✅ ${file.name}: ${result.confidence}% confidence (${result.method})`);
          
          // 💾 NUEVO: Guardar automáticamente en base de datos
          try {
            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/f29/save`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parsedData: result,
                fileName: file.name,
                userId: '550e8400-e29b-41d4-a716-446655440000', // Demo user
                companyId: '550e8400-e29b-41d4-a716-446655440001' // Demo company
              })
            });
            
            const saveData = await saveResponse.json();
            
            if (saveData.success) {
              console.log(`💾 ${file.name}: Guardado en BD - ID: ${saveData.data?.id}`);
            } else {
              console.warn(`⚠️ ${file.name}: No se pudo guardar en BD: ${saveData.error}`);
            }
            
          } catch (saveError) {
            console.warn(`⚠️ ${file.name}: Error guardando en BD:`, saveError);
            // No fallar el procesamiento por error de guardado
          }
          
          return {
            file_name: file.name,
            success: true,
            data: result,
            confidence_score: result.confidence,
            method: result.method,
            period: result.periodo,
            processing_time: new Date().getTime(),
            saved_to_db: true // Indicar que se intentó guardar
          };
          
        } catch (error) {
          console.error(`❌ Error procesando ${file.name}:`, error);
          
          return {
            file_name: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            confidence_score: 0,
            processing_time: new Date().getTime()
          };
        }
      });
      
      // Esperar a que termine el lote
      const batchResults = await Promise.all(batchPromises);
      
      // Separar éxitos y errores
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
      
      // Pequeña pausa entre lotes para evitar saturar el sistema
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`🎯 Procesamiento batch completado: ${results.length} éxitos, ${errors.length} errores`);
    
    // Calcular estadísticas del procesamiento
    const totalFiles = files.length;
    const successCount = results.length;
    const errorCount = errors.length;
    const successRate = (successCount / totalFiles) * 100;
    const avgConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length 
      : 0;
    
    return NextResponse.json({
      success: true,
      summary: {
        total_files: totalFiles,
        processed_successfully: successCount,
        failed: errorCount,
        success_rate: Math.round(successRate * 100) / 100,
        average_confidence: Math.round(avgConfidence * 100) / 100
      },
      results: results,
      errors: errors.length > 0 ? errors : undefined,
      processing_completed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error crítico en procesamiento batch:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}