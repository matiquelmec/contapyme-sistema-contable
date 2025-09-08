import { NextRequest, NextResponse } from 'next/server';
import { parseRCV } from '@/lib/parsers/rcvParser';

export async function POST(request: NextRequest) {
  console.log('🚀 API RCV: Iniciando procesamiento...');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('company_id') as string;
    const rcvType = formData.get('rcv_type') as string; // 'purchase' o 'sales'
    const storeInDB = formData.get('store_in_db') as string; // 'true' o 'false'
    
    if (!file) {
      console.error('❌ No se recibió archivo');
      return NextResponse.json({
        success: false,
        error: 'No se recibió ningún archivo'
      }, { status: 400 });
    }
    
    // Validar que sea un archivo CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ Archivo no es CSV:', file.name);
      return NextResponse.json({
        success: false,
        error: 'El archivo debe ser un CSV (.csv)'
      }, { status: 400 });
    }
    
    // Validar tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ Archivo muy grande:', file.size);
      return NextResponse.json({
        success: false,
        error: 'El archivo es muy grande. Máximo 10MB.'
      }, { status: 400 });
    }
    
    console.log(`📄 Procesando archivo RCV: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    // Procesar archivo RCV
    const result = await parseRCV(file);
    
    console.log('✅ Archivo RCV procesado exitosamente');
    console.log(`📊 Transacciones: ${result.totalTransacciones}, Proveedores: ${result.proveedoresPrincipales.length}`);
    
    let storeResult = null;
    
    // ✅ ALMACENAR EN BASE DE DATOS SI SE SOLICITA
    if (storeInDB === 'true' && companyId && rcvType) {
      try {
        console.log('💾 Almacenando RCV en base de datos...');
        
        const storeResponse = await fetch(`${request.nextUrl.origin}/api/rcv/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: companyId,
            rcv_data: result,
            file_metadata: {
              file_name: file.name,
              file_size: file.size
            },
            rcv_type: rcvType
          })
        });

        if (storeResponse.ok) {
          storeResult = await storeResponse.json();
          console.log('✅ RCV almacenado en base de datos:', storeResult.data);
        } else {
          console.warn('⚠️ Error almacenando RCV en base de datos');
        }
      } catch (storeError) {
        console.error('❌ Error almacenando RCV:', storeError);
        // No fallar el procesamiento por error de almacenamiento
      }
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      storage: storeResult,
      message: `RCV procesado: ${result.totalTransacciones} transacciones de ${result.proveedoresPrincipales.length} ${rcvType === 'purchase' ? 'proveedores' : 'clientes'}${storeResult ? ' (almacenado en BD)' : ''}`
    });
    
  } catch (error) {
    console.error('❌ Error procesando RCV:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error procesando archivo RCV'
    }, { status: 500 });
  }
}