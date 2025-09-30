import { NextRequest, NextResponse } from 'next/server';
import { parseF29 } from '@/lib/parsers/f29Parser';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚀 F29 API: Implementación desde cero iniciada...');
  
  try {
    console.log('📥 Recibiendo request...');
    
    const formData = await request.formData();
    console.log('📋 FormData procesado');
    
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      console.error('❌ Wrong file type:', file.type);
      return NextResponse.json({ 
        error: 'Only PDF files supported' 
      }, { status: 400 });
    }
    
    console.log(`📄 Archivo: ${file.name} (${Math.round(file.size/1024)}KB)`);
    console.log('🔄 Iniciando parseF29...');
    
    // VERIFICAR VARIABLES DE ENTORNO
    console.log('🔑 Verificando variables de entorno...');
    console.log('ANTHROPIC_API_KEY presente:', !!process.env.ANTHROPIC_API_KEY);
    
    // UNA SOLA FUNCIÓN - SIN COMPLICACIONES
    const result = await parseF29(file);
    
    console.log(`✅ Completado: ${result.confidence}% confidence (${result.method})`);
    
    return NextResponse.json({
      success: true,
      data: result,
      method: result.method,
      confidence: result.confidence
    });
    
  } catch (error) {
    console.error('❌ API Error detallado:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    
    // En lugar de devolver datos falsos, devolver error claro
    return NextResponse.json({
      success: false,
      error: 'No se pudieron extraer datos del PDF. Verifica que el archivo sea un F29 válido.',
      details: error instanceof Error ? error.message : 'Error desconocido',
      errorType: error?.constructor?.name || 'Unknown'
    }, { status: 500 });
  }
}