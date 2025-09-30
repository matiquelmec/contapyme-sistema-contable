import * as pdfjsLib from 'pdfjs-dist';

// Configurar PDF.js para que NUNCA use worker (evitar todos los problemas de CORS/versiones)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  console.log('PDF.js versión:', pdfjsLib.version);
  console.log('Worker DESHABILITADO para evitar problemas de compatibilidad');
}

export interface PDFExtractedData {
  text: string;
  pages: string[];
  metadata?: any;
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractedData> {
  try {
    console.log('Extrayendo texto PDF con PDF.js (modo single-thread)...');
    
    // Convertir archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Configurar opciones de carga del PDF - MÁXIMA compatibilidad
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0, // Silenciar warnings
      disableWorker: true, // SIEMPRE sin worker
      isEvalSupported: false, // Seguridad
      disableCreateObjectURL: false,
      useSystemFonts: true, // Usar fuentes del sistema
      standardFontDataUrl: null, // No cargar fuentes externas
      cMapUrl: null, // No cargar mapas de caracteres externos
      cMapPacked: false
    });
    
    // Agregar timeout para evitar que se cuelgue
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF processing timeout')), 10000); // 10 segundos
    });
    
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as any;
    
    console.log(`PDF cargado exitosamente: ${pdf.numPages} páginas`);
    
    const pages: string[] = [];
    let fullText = '';
    
    // Extraer texto de cada página (máximo 5 páginas para PDFs grandes)
    const maxPages = Math.min(pdf.numPages, 5);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`Procesando página ${pageNum}/${maxPages}...`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Construir el texto de la página
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      pages.push(pageText);
      fullText += pageText + '\n';
      
      console.log(`Página ${pageNum} procesada: ${pageText.length} caracteres`);
    }
    
    // Obtener metadata del PDF
    const metadata = await pdf.getMetadata();
    
    return {
      text: fullText,
      pages,
      metadata: metadata.info
    };
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    console.log('PDF.js falló, el parser simple tomará el control');
    throw new Error('PDF.js failed - usando parser alternativo');
  }
}

// Función específica para extraer códigos F29
export function extractF29CodesFromText(text: string): any {
  const codes: any = {};
  
  console.log('Analizando texto para códigos F29, longitud:', text.length);
  console.log('Primeros 500 caracteres:', text.substring(0, 500));
  
  // Patrones mejorados y más comprehensivos para F29 del SII
  const patterns = {
    codigo538: [
      // Patrones más específicos primero
      /(?:código\s*538|cod\.?\s*538)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /(?:débito\s*fiscal\s*total?|debito\s*fiscal)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /538[\s\-\|\.:]{1,20}([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
      // Formato tabla: código en una columna, valor en otra
      /538[\s\t]*\|?[\s\t]*([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g,
      // Línea completa con código 538
      /.*538.*?([0-9]{4,})/g
    ],
    codigo511: [
      /(?:código\s*511|cod\.?\s*511)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /(?:crédito\s*fiscal|credito\s*fiscal)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /511[\s\-\|\.:]{1,20}([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
      /511[\s\t]*\|?[\s\t]*([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g,
      /.*511.*?([0-9]{4,})/g
    ],
    codigo062: [
      /(?:código\s*062|cod\.?\s*062)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /(?:ppm|p\.p\.m\.?|pago\s*provisional\s*mensual)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /062[\s\-\|\.:]{1,20}([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
      /062[\s\t]*\|?[\s\t]*([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g,
      /.*062.*?([0-9]{4,})/g
    ],
    codigo077: [
      /(?:código\s*077|cod\.?\s*077)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /(?:remanente|remanente\s*período\s*anterior)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /077[\s\-\|\.:]{1,20}([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
      /077[\s\t]*\|?[\s\t]*([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g,
      /.*077.*?([0-9]{4,})/g
    ],
    codigo563: [
      /(?:código\s*563|cod\.?\s*563)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /(?:ventas?\s*netas?|monto\s*ventas?)[\s\S]{0,100}?([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/gi,
      /563[\s\-\|\.:]{1,20}([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
      /563[\s\t]*\|?[\s\t]*([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g,
      /.*563.*?([0-9]{4,})/g
    ]
  };
  
  // Buscar con cada patrón
  for (const [key, patternList] of Object.entries(patterns)) {
    let bestValue = 0;
    let bestMatch = '';
    
    for (const pattern of patternList) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = parseChileanNumber(match[1]);
          if (value > bestValue && value >= 1000) { // Mínimo razonable para montos F29
            bestValue = value;
            bestMatch = match[0].substring(0, 50);
          }
        }
      }
    }
    
    if (bestValue > 0) {
      codes[key] = bestValue;
      console.log(`✓ ${key}: ${bestValue.toLocaleString('es-CL')} encontrado en: "${bestMatch}..."`);
    } else {
      console.log(`✗ ${key}: No encontrado`);
    }
  }
  
  // Buscar patrones adicionales línea por línea
  const lines = text.split(/\r?\n/);
  console.log(`Analizando ${lines.length} líneas...`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 5) continue;
    
    // Buscar códigos específicos en cada línea
    const codeChecks = [
      { code: '538', key: 'codigo538', keywords: ['538', 'débito', 'debito'] },
      { code: '511', key: 'codigo511', keywords: ['511', 'crédito', 'credito'] },
      { code: '062', key: 'codigo062', keywords: ['062', 'ppm', 'provisional'] },
      { code: '077', key: 'codigo077', keywords: ['077', 'remanente'] },
      { code: '563', key: 'codigo563', keywords: ['563', 'ventas', 'netas'] }
    ];
    
    for (const { code, key, keywords } of codeChecks) {
      if (codes[key]) continue; // Ya encontrado
      
      const hasKeyword = keywords.some(kw => line.toLowerCase().includes(kw));
      if (hasKeyword) {
        // Extraer todos los números de la línea
        const numbers = line.match(/([0-9]{1,3}(?:[.,\s]*[0-9]{3})*(?:[.,][0-9]{1,2})?)/g);
        if (numbers) {
          for (const numStr of numbers) {
            const value = parseChileanNumber(numStr);
            if (value >= 10000) { // Valor mínimo razonable
              codes[key] = value;
              console.log(`📍 ${key}: ${value.toLocaleString('es-CL')} en línea ${i+1}: "${line}"`);
              break;
            }
          }
        }
      }
    }
  }
  
  // Búsqueda adicional en formato tabla CSV-like
  const tablePattern = /(\d{3})[\s,;\t\|]+([0-9]{1,3}(?:[.,\s]*[0-9]{3})*)/g;
  const tableMatches = [...text.matchAll(tablePattern)];
  
  for (const match of tableMatches) {
    const code = match[1];
    const value = parseChileanNumber(match[2]);
    
    if (value >= 1000) {
      const key = `codigo${code}`;
      if (['codigo538', 'codigo511', 'codigo062', 'codigo077', 'codigo563'].includes(key)) {
        if (!codes[key] || codes[key] < value) {
          codes[key] = value;
          console.log(`🔢 ${key}: ${value.toLocaleString('es-CL')} (formato tabla)`);
        }
      }
    }
  }
  
  return codes;
}

// Función mejorada para parsear números en formato chileno
function parseChileanNumber(str: string): number {
  if (!str || typeof str !== 'string') return 0;
  
  // Limpiar string - mantener solo números, puntos, comas y espacios
  let cleanStr = str.trim().replace(/[^\d.,\s]/g, '');
  
  if (!cleanStr) return 0;
  
  // Remover espacios internos
  cleanStr = cleanStr.replace(/\s+/g, '');
  
  console.log(`Parseando número: "${str}" -> "${cleanStr}"`);
  
  // Caso especial: solo números sin separadores
  if (!/[.,]/.test(cleanStr)) {
    const num = parseInt(cleanStr, 10);
    return isNaN(num) ? 0 : num;
  }
  
  // Detectar formato chileno vs internacional
  if (cleanStr.includes('.') && cleanStr.includes(',')) {
    const lastDot = cleanStr.lastIndexOf('.');
    const lastComma = cleanStr.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      // Formato chileno: 1.234.567,89 (coma decimal)
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato internacional: 1,234,567.89 (punto decimal)
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (cleanStr.includes('.')) {
    // Solo puntos
    const dotCount = (cleanStr.match(/\./g) || []).length;
    const lastDotPos = cleanStr.lastIndexOf('.');
    const afterLastDot = cleanStr.substring(lastDotPos + 1);
    
    if (dotCount === 1 && afterLastDot.length <= 2 && cleanStr.length <= 8) {
      // Probablemente decimal: 1234.56
      // Mantener como está
    } else {
      // Separador de miles: 1.234.567
      cleanStr = cleanStr.replace(/\./g, '');
    }
  } else if (cleanStr.includes(',')) {
    // Solo comas
    const commaCount = (cleanStr.match(/,/g) || []).length;
    const lastCommaPos = cleanStr.lastIndexOf(',');
    const afterLastComma = cleanStr.substring(lastCommaPos + 1);
    
    if (commaCount === 1 && afterLastComma.length <= 2 && cleanStr.length <= 8) {
      // Probablemente decimal: 1234,56
      cleanStr = cleanStr.replace(',', '.');
    } else {
      // Separador de miles: 1,234,567
      cleanStr = cleanStr.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(cleanStr);
  const result = isNaN(num) ? 0 : Math.floor(num);
  
  if (result > 0) {
    console.log(`✓ Número parseado: "${str}" -> ${result.toLocaleString('es-CL')}`);
  }
  
  return result;
}