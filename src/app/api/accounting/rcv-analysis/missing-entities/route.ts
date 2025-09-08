import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

interface MissingEntity {
  rut: string;
  razon_social: string;
  transaction_count: number;
  total_amount: number;
  suggested_type: 'supplier' | 'customer' | 'both';
  suggested_account_code: string;
  suggested_account_name: string;
}

// Formatear RUT chileno al formato estándar XX.XXX.XXX-X
function formatRUT(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return rut;
  }
  
  // Limpiar RUT (quitar puntos, guiones, espacios)
  const cleanRUT = rut.replace(/[.\-\s]/g, '').toUpperCase();
  
  // Validar que tenga al menos 8 caracteres (7 números + 1 dígito verificador)
  if (cleanRUT.length < 8 || cleanRUT.length > 9) {
    return rut; // Retornar original si la longitud no es válida
  }
  
  // Separar número y dígito verificador
  const rutNumber = cleanRUT.slice(0, -1);
  const verifier = cleanRUT.slice(-1);
  
  // Validar que el número sea numérico (excepto el dígito verificador)
  if (!/^\d+$/.test(rutNumber)) {
    return rut; // Retornar original si no es numérico
  }
  
  // Formatear con puntos de derecha a izquierda
  let formattedNumber = '';
  for (let i = rutNumber.length - 1, counter = 0; i >= 0; i--, counter++) {
    if (counter > 0 && counter % 3 === 0) {
      formattedNumber = '.' + formattedNumber;
    }
    formattedNumber = rutNumber[i] + formattedNumber;
  }
  
  return `${formattedNumber}-${verifier}`;
}

// POST - Identificar entidades faltantes del RCV análisis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, rcv_analysis, rcv_type } = body;

    if (!company_id) {
      return NextResponse.json({
        success: false,
        error: 'ID de empresa es requerido'
      }, { status: 400 });
    }

    if (!rcv_analysis || !rcv_analysis.proveedoresPrincipales) {
      return NextResponse.json({
        success: false,
        error: 'Datos de análisis RCV requeridos'
      }, { status: 400 });
    }

    console.log('🔍 Identificando entidades faltantes para empresa:', company_id);
    console.log('📊 RCV tipo:', rcv_type);
    console.log('📋 Proveedores en análisis:', rcv_analysis.proveedoresPrincipales.length);

    // Extraer todos los RUTs del análisis RCV
    const rcvRuts = rcv_analysis.proveedoresPrincipales
      .map((p: any) => p.rutProveedor)
      .filter((rut: string) => rut && rut.length > 5); // Filtrar RUTs válidos

    if (rcvRuts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          missing_entities: [],
          message: 'No se encontraron RUTs válidos en el análisis RCV'
        }
      });
    }

    console.log('🎯 RUTs extraídos del RCV:', rcvRuts.length);
    console.log('📋 Primeros 3 RUTs del RCV:', rcvRuts.slice(0, 3));

    // Formatear RUTs del RCV para comparación consistente
    const formattedRcvRuts = rcvRuts.map((rut: string) => formatRUT(rut));
    console.log('📋 Primeros 3 RUTs formateados:', formattedRcvRuts.slice(0, 3));

    // Buscar cuáles RUTs YA están configurados en rcv_entities usando Supabase directo
    console.log('🔄 Consultando Supabase para RUTs existentes...');
    
    const { data: allEntities, error } = await supabase
      .from('rcv_entities')
      .select('entity_rut, entity_name')
      .eq('company_id', company_id)
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Error consultando entidades:', error);
      return NextResponse.json({
        success: false,
        error: 'Error consultando base de datos'
      }, { status: 500 });
    }
    
    console.log('🏢 Total entidades en base de datos:', allEntities?.length || 0);
    
    if (allEntities && allEntities.length > 0) {
      console.log('📋 Primeras 5 entidades existentes:');
      allEntities.slice(0, 5).forEach((e: any) => {
        console.log(`   - ${e.entity_rut}: ${e.entity_name}`);
      });
    }
    
    // Crear array de RUTs existentes
    const allExistingRuts = allEntities ? allEntities.map((e: any) => e.entity_rut) : [];
    
    console.log('✅ Total RUTs ya configurados:', allExistingRuts.length);
    console.log('📋 Primeros 5 RUTs del RCV para comparar:', formattedRcvRuts.slice(0, 5));
    
    // Debug: verificar coincidencias exactas
    const matchingRuts: string[] = [];
    for (const rcvRut of formattedRcvRuts.slice(0, 10)) {
      if (allExistingRuts.includes(rcvRut)) {
        matchingRuts.push(rcvRut);
        console.log(`✅ COINCIDENCIA EXACTA: ${rcvRut}`);
      } else {
        // Buscar coincidencia más flexible (sin puntos/guiones)
        const cleanRcvRut = rcvRut.replace(/[.\-]/g, '');
        const foundMatch = allExistingRuts.find(existingRut => 
          existingRut.replace(/[.\-]/g, '') === cleanRcvRut
        );
        if (foundMatch) {
          console.log(`⚠️ COINCIDENCIA FORMATO DIFERENTE: ${rcvRut} vs ${foundMatch}`);
          matchingRuts.push(rcvRut);
        } else {
          console.log(`❌ NO ENCONTRADO: ${rcvRut}`);
        }
      }
    }
    
    console.log('🎯 Coincidencias encontradas (primeros 10):', matchingRuts.length);

    // Identificar RUTs faltantes con comparación flexible
    const missingRuts = formattedRcvRuts.filter((rcvRut: string) => {
      // Buscar coincidencia exacta primero
      if (allExistingRuts.includes(rcvRut)) {
        return false; // Ya existe
      }
      
      // Buscar coincidencia flexible (sin puntos/guiones)
      const cleanRcvRut = rcvRut.replace(/[.\-]/g, '');
      const foundMatch = allExistingRuts.find(existingRut => 
        existingRut.replace(/[.\-]/g, '') === cleanRcvRut
      );
      
      return !foundMatch; // Solo incluir si NO se encuentra coincidencia
    });
    
    console.log('❌ RUTs faltantes después de comparación flexible:', missingRuts.length);
    console.log('📋 Primeros 3 RUTs faltantes:', missingRuts.slice(0, 3));

    if (missingRuts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          missing_entities: [],
          message: 'Todas las entidades del RCV ya están configuradas'
        }
      });
    }

    // Generar datos de entidades faltantes con sugerencias automáticas
    const missingEntities: MissingEntity[] = [];

    for (const rut of missingRuts) {
      // Buscar data del proveedor usando el RUT original (sin formatear) del RCV
      const originalRut = rcvRuts[formattedRcvRuts.indexOf(rut)];
      const proveedorData = rcv_analysis.proveedoresPrincipales.find((p: any) => p.rutProveedor === originalRut);
      
      if (proveedorData) {
        // Sugerir tipo de entidad basado en el tipo de RCV y análisis
        let suggestedType: 'supplier' | 'customer' | 'both' = 'supplier';
        let suggestedAccountCode = '2.1.1.001';
        let suggestedAccountName = 'Proveedores Nacionales';

        if (rcv_type === 'sales') {
          suggestedType = 'customer';
          suggestedAccountCode = '1.1.2.001';
          suggestedAccountName = 'Clientes Nacionales';
        } else if (rcv_type === 'purchase') {
          suggestedType = 'supplier';
          // Determinar si es nacional o extranjero basado en formato RUT
          if (rut.includes('-') && rut.length >= 8) {
            suggestedAccountCode = '2.1.1.001';
            suggestedAccountName = 'Proveedores Nacionales';
          } else {
            suggestedAccountCode = '2.1.2.001';
            suggestedAccountName = 'Proveedores Extranjeros';
          }
        }

        missingEntities.push({
          rut: rut,
          razon_social: proveedorData.razonSocial || `Entidad ${rut}`,
          transaction_count: proveedorData.totalTransacciones || 1,
          total_amount: proveedorData.montoCalculado || 0,
          suggested_type: suggestedType,
          suggested_account_code: suggestedAccountCode,
          suggested_account_name: suggestedAccountName
        });
      }
    }

    // Ordenar por cantidad de transacciones (entidades más importantes primero)
    missingEntities.sort((a, b) => b.transaction_count - a.transaction_count);

    console.log('📋 Entidades faltantes generadas:', missingEntities.length);

    return NextResponse.json({
      success: true,
      data: {
        missing_entities: missingEntities,
        total_missing: missingEntities.length,
        total_analyzed: rcvRuts.length,
        coverage_percentage: ((rcvRuts.length - missingEntities.length) / rcvRuts.length * 100).toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error identificando entidades faltantes:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}