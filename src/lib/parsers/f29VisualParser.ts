// ==========================================
// F29 VISUAL PARSER - ANÁLISIS CON VISIÓN AI
// Convierte PDF a imagen y analiza visualmente con Claude
// ==========================================

export interface F29Data {
  // Información básica
  rut: string;
  folio: string;
  periodo: string;
  razonSocial: string;
  
  // Códigos principales
  codigo049: number; // PRÉSTAMO SOLIDARIO (Ret. 3% Rta 42 N°1)
  codigo537: number; // TOTAL CRÉDITOS
  codigo538: number; // TOTAL DÉBITOS
  codigo562: number; // COMPRAS NETAS ADICIONALES
  codigo563: number; // BASE IMPONIBLE
  codigo062: number; // PPM NETO DETERMINADO
  codigo077: number; // REMANENTE DE CRÉDITO FISC.
  codigo089: number; // IMP. DETERM. IVA
  codigo151: number; // RETENCIÓN
  
  // Calculados
  totalCreditos: number; // Código 537 - Código 077
  comprasNetas: number;
  ivaDeterminado: number;
  totalAPagar: number;
  margenBruto: number;
  
  // Metadatos
  confidence: number;
  method: string;
}

// Función principal que convierte PDF a imagen y analiza con Claude
export async function parseF29Visual(file: File): Promise<F29Data> {
  console.log('🎯 F29 Visual Parser: Iniciando análisis visual con IA...');
  console.log(`📄 Archivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  try {
    // Paso 1: Preparar PDF para análisis directo con Claude
    console.log('📄 Preparando PDF para Claude Vision...');
    const pdfBase64 = await convertPDFToImage(file);
    
    if (!pdfBase64) {
      throw new Error('No se pudo preparar el PDF');
    }
    
    console.log('✅ PDF preparado exitosamente');
    
    // Paso 2: Enviar PDF a Claude para análisis visual directo
    console.log('🤖 Enviando PDF a Claude Vision para análisis...');
    const result = await analyzeWithClaude(pdfBase64);
    
    if (!result) {
      throw new Error('Claude no pudo analizar el PDF');
    }
    
    console.log('✅ Análisis completado exitosamente');
    return result;
    
  } catch (error) {
    console.error('❌ Error en análisis visual:', error);
    throw error;
  }
}

// Convierte PDF a base64 para envío directo a Claude
async function convertPDFToImage(file: File): Promise<string | null> {
  try {
    console.log('📤 Preparando PDF para análisis visual...');
    
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    console.log(`✅ PDF preparado para Claude Vision (${base64.length} caracteres)`);
    return base64;
    
  } catch (error) {
    console.error('❌ Error preparando PDF:', error);
    return null;
  }
}

// Analiza la imagen con Claude Vision
async function analyzeWithClaude(imageBase64: string): Promise<F29Data | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY no configurada');
      return null;
    }
    
    console.log('📡 Enviando imagen a Claude Vision...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de un formulario F29 chileno del SII.

EXTRAE EXACTAMENTE estos valores:
- RUT del contribuyente
- FOLIO del formulario
- PERIODO tributario (formato YYYYMM)
- RAZÓN SOCIAL de la empresa
- Código 049: PRÉSTAMO SOLIDARIO / Ret. 3% Rta 42 N°1
- Código 537: TOTAL CRÉDITOS
- Código 538: TOTAL DÉBITOS
- Código 562: COMPRAS NETAS ADICIONALES
- Código 563: BASE IMPONIBLE
- Código 062: PPM NETO DETERMINADO
- Código 077: REMANENTE DE CRÉDITO FISCAL
- Código 089: IMP. DETERM. IVA
- Código 151: RETENCIÓN

IMPORTANTE:
- Extrae SOLO los valores numéricos sin puntos ni comas
- Si no encuentras un código, usa 0
- El RUT debe incluir puntos y guión (formato: XX.XXX.XXX-X)

Responde ÚNICAMENTE con este JSON:
{
  "rut": "XX.XXX.XXX-X",
  "folio": "numero_folio",
  "periodo": "YYYYMM",
  "razonSocial": "NOMBRE EMPRESA",
  "codigo049": numero,
  "codigo537": numero,
  "codigo538": numero,
  "codigo562": numero,
  "codigo563": numero,
  "codigo062": numero,
  "codigo077": numero,
  "codigo089": numero,
  "codigo151": numero
}`
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });
    
    console.log(`📊 Respuesta de Claude: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error de Claude:', error);
      return null;
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text;
    
    if (!content) {
      console.error('❌ Sin contenido en respuesta de Claude');
      return null;
    }
    
    console.log('📝 Respuesta de Claude:', content.substring(0, 200) + '...');
    
    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('❌ No se encontró JSON en la respuesta');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Crear resultado con cálculos
    const result: F29Data = {
      rut: parsed.rut || '',
      folio: parsed.folio || '',
      periodo: parsed.periodo || '',
      razonSocial: parsed.razonSocial || '',
      codigo049: parseInt(parsed.codigo049) || 0,
      codigo537: parseInt(parsed.codigo537) || 0,
      codigo538: parseInt(parsed.codigo538) || 0,
      codigo562: parseInt(parsed.codigo562) || 0,
      codigo563: parseInt(parsed.codigo563) || 0,
      codigo062: parseInt(parsed.codigo062) || 0,
      codigo077: parseInt(parsed.codigo077) || 0,
      codigo089: parseInt(parsed.codigo089) || 0,
      codigo151: parseInt(parsed.codigo151) || 0,
      totalCreditos: 0,
      comprasNetas: 0,
      ivaDeterminado: 0,
      totalAPagar: 0,
      margenBruto: 0,
      confidence: 99, // Alta confianza en análisis visual
      method: 'claude-vision-analysis'
    };
    
    // Calcular campos derivados
    calculateFields(result);
    
    console.log('✅ Resultado del análisis visual:', {
      rut: result.rut,
      codigo537: result.codigo537.toLocaleString(),
      codigo538: result.codigo538.toLocaleString(),
      ivaDeterminado: result.ivaDeterminado.toLocaleString(),
      totalAPagar: result.totalAPagar.toLocaleString()
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error en análisis con Claude:', error);
    return null;
  }
}

// Calcula campos derivados
function calculateFields(result: F29Data) {
  // Total Créditos = Código 537 (sin restar remanente)
  result.totalCreditos = result.codigo537;
  
  // Compras Netas = (Total Créditos ÷ 0.19) + Código 562
  if (result.totalCreditos > 0) {
    result.comprasNetas = Math.round(result.totalCreditos / 0.19) + result.codigo562;
  } else {
    result.comprasNetas = result.codigo562;
  }
  
  // IVA Determinado - usar código 089 si está disponible
  if (result.codigo089 > 0) {
    result.ivaDeterminado = result.codigo089;
  } else if (result.codigo538 > 0 && result.totalCreditos > 0) {
    result.ivaDeterminado = result.codigo538 - result.totalCreditos;
  }
  
  // Total a Pagar - Si hay remanente (077 > 0), total es 0
  if (result.codigo077 > 0) {
    result.totalAPagar = 0;
  } else {
    // Si tenemos IVA determinado (089), usar ese + PPM + Préstamo Solidario
    if (result.codigo089 > 0) {
      result.totalAPagar = result.codigo089 + result.codigo062 + result.codigo049;
    } else {
      // Fórmula estándar + Préstamo Solidario
      result.totalAPagar = Math.abs(result.ivaDeterminado) + result.codigo062 + result.codigo049;
    }
  }
  
  // Margen Bruto = Ventas - Compras
  if (result.codigo563 > 0 && result.comprasNetas > 0) {
    result.margenBruto = result.codigo563 - result.comprasNetas;
  }
  
  console.log('🧮 Campos calculados:', {
    totalCreditos: result.totalCreditos.toLocaleString(),
    comprasNetas: result.comprasNetas.toLocaleString(),
    ivaDeterminado: result.ivaDeterminado.toLocaleString(),
    totalAPagar: result.totalAPagar.toLocaleString(),
    margenBruto: result.margenBruto.toLocaleString()
  });
}