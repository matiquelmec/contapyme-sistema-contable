// Parser simple para PDFs usando solo APIs nativas del navegador

export async function extractBasicTextFromPDF(file: File): Promise<string> {
  try {
    console.log('Parser simple: analizando PDF...');
    
    // Método 1: Intentar leer como texto plano (funciona con algunos PDFs)
    const text = await file.text();
    console.log(`Contenido leído: ${text.length} caracteres`);
    
    if (text && text.length > 100 && !text.startsWith('%PDF')) {
      console.log('PDF leído como texto plano exitosamente');
      return text;
    }
    
    // Método 2: Buscar texto entre streams en el PDF binario
    if (text.includes('stream') && text.includes('endstream')) {
      console.log('Intentando extraer texto de streams PDF...');
      
      // Buscar patrones de texto entre streams
      const streamRegex = /stream([\s\S]*?)endstream/g;
      let extractedText = '';
      let match;
      
      while ((match = streamRegex.exec(text)) !== null) {
        const streamContent = match[1];
        
        // Buscar texto legible en el stream (caracteres alfanuméricos y espacios)
        const readableText = streamContent.match(/[a-zA-Z0-9\s.,;:()áéíóúñÁÉÍÓÚÑ\-]+/g);
        if (readableText) {
          extractedText += readableText.join(' ') + ' ';
        }
      }
      
      if (extractedText.length > 50) {
        console.log('Texto extraído de streams:', extractedText.substring(0, 200));
        return extractedText;
      }
    }
    
    // Método 3: Buscar patrones específicos de F29 en el contenido binario
    console.log('Buscando patrones F29 en contenido binario...');
    
    // Buscar códigos directamente en el contenido binario
    const codePatterns = [
      { code: '538', pattern: /538[\s\S]{0,100}?([0-9]{4,})/g },
      { code: '511', pattern: /511[\s\S]{0,100}?([0-9]{4,})/g },
      { code: '062', pattern: /062[\s\S]{0,100}?([0-9]{4,})/g },
      { code: '077', pattern: /077[\s\S]{0,100}?([0-9]{4,})/g },
      { code: '563', pattern: /563[\s\S]{0,100}?([0-9]{4,})/g }
    ];
    
    let foundData = '';
    const foundCodes: any = {};
    
    for (const { code, pattern } of codePatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = parseInt(match[1].replace(/\D/g, ''));
          if (value > 1000) { // Valores mínimos razonables
            foundCodes[`codigo${code}`] = value;
            foundData += `${code}: ${value} `;
            console.log(`Encontrado código ${code}:`, value);
            break;
          }
        }
      }
    }
    
    if (Object.keys(foundCodes).length > 0) {
      console.log('Códigos F29 extraídos del binario:', foundCodes);
      return `Códigos F29: ${foundData}`;
    }
    
    throw new Error('No se pudo extraer texto del PDF con métodos simples');
    
  } catch (error) {
    console.error('Error en parser simple:', error);
    throw new Error('No se pudo procesar el PDF');
  }
}

// Función para extraer códigos específicos del texto procesado
export function extractF29CodesFromSimpleText(text: string): any {
  const codes: any = {};
  
  // Patrones para buscar códigos en el texto extraído
  const patterns = {
    codigo538: [
      /538[\s\S]{0,100}?([0-9]{4,})/gi,
      /débito\s*fiscal[\s\S]{0,100}?([0-9]{4,})/gi
    ],
    codigo511: [
      /511[\s\S]{0,100}?([0-9]{4,})/gi,
      /crédito\s*fiscal[\s\S]{0,100}?([0-9]{4,})/gi
    ],
    codigo062: [
      /062[\s\S]{0,100}?([0-9]{4,})/gi,
      /ppm[\s\S]{0,100}?([0-9]{4,})/gi
    ],
    codigo077: [
      /077[\s\S]{0,100}?([0-9]{4,})/gi,
      /remanente[\s\S]{0,100}?([0-9]{4,})/gi
    ],
    codigo563: [
      /563[\s\S]{0,100}?([0-9]{4,})/gi,
      /ventas?\s*netas?[\s\S]{0,100}?([0-9]{4,})/gi
    ]
  };
  
  for (const [key, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = parseInt(match[1].replace(/\D/g, ''));
          if (value > 0) {
            codes[key] = value;
            console.log(`Encontrado ${key}: ${value}`);
            break;
          }
        }
      }
      if (codes[key]) break;
    }
  }
  
  return codes;
}