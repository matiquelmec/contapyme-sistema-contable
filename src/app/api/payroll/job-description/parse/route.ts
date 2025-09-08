import { NextRequest, NextResponse } from 'next/server';

// Función para extraer texto de PDF similar al F29
async function extractJobDescriptionFromPDF(buffer: Buffer): Promise<{
  position?: string;
  department?: string;
  jobFunctions?: string[];
  requirements?: string[];
  responsibilities?: string[];
  rawText: string;
}> {
  try {
    // Convertir buffer a string con múltiples encodings
    const encodings = ['utf-8', 'latin1', 'ascii'];
    let extractedText = '';
    
    for (const encoding of encodings) {
      try {
        const text = buffer.toString(encoding as BufferEncoding);
        if (text.length > extractedText.length) {
          extractedText = text;
        }
      } catch (e) {
        continue;
      }
    }

    // Patrones para identificar secciones comunes en descriptores de cargo
    const patterns = {
      position: [
        /(?:cargo|puesto|posición|título)\s*:?\s*([^\n\r]+)/i,
        /(?:job\s+title|position)\s*:?\s*([^\n\r]+)/i
      ],
      department: [
        /(?:departamento|área|división|unidad)\s*:?\s*([^\n\r]+)/i,
        /(?:department|division)\s*:?\s*([^\n\r]+)/i
      ],
      functions: [
        /(?:funciones|responsabilidades|tareas|actividades)\s*:?\s*([^]*?)(?=\n\s*(?:[A-Z][^:]*:|$))/i,
        /(?:functions|responsibilities|duties)\s*:?\s*([^]*?)(?=\n\s*(?:[A-Z][^:]*:|$))/i
      ],
      requirements: [
        /(?:requisitos|requerimientos|perfil|qualificaciones)\s*:?\s*([^]*?)(?=\n\s*(?:[A-Z][^:]*:|$))/i,
        /(?:requirements|qualifications|skills)\s*:?\s*([^]*?)(?=\n\s*(?:[A-Z][^:]*:|$))/i
      ]
    };

    const result: any = { rawText: extractedText };

    // Extraer cargo/posición
    for (const pattern of patterns.position) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        result.position = match[1].trim();
        break;
      }
    }

    // Extraer departamento
    for (const pattern of patterns.department) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        result.department = match[1].trim();
        break;
      }
    }

    // Extraer funciones
    for (const pattern of patterns.functions) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        const functionsText = match[1].trim();
        // Dividir por bullets, números o saltos de línea
        const functions = functionsText
          .split(/(?:\n\s*[-•*]\s*|\n\s*\d+\.?\s*|\n\s*[a-z]\)\s*|\n(?=\S))/g)
          .map(f => f.trim())
          .filter(f => f.length > 10 && f.length < 200); // Filtrar funciones razonables
        
        if (functions.length > 0) {
          result.jobFunctions = functions;
        }
        break;
      }
    }

    // Extraer requisitos
    for (const pattern of patterns.requirements) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        const reqText = match[1].trim();
        const requirements = reqText
          .split(/(?:\n\s*[-•*]\s*|\n\s*\d+\.?\s*|\n\s*[a-z]\)\s*|\n(?=\S))/g)
          .map(r => r.trim())
          .filter(r => r.length > 10 && r.length < 200);
        
        if (requirements.length > 0) {
          result.requirements = requirements;
        }
        break;
      }
    }

    return result;

  } catch (error) {
    console.error('Error extracting job description:', error);
    return {
      rawText: '',
      jobFunctions: [],
      requirements: []
    };
  }
}

// POST: Analizar PDF de descriptor de cargo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 });
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (max 10MB)' }, { status: 400 });
    }

    // Convertir a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extraer información del descriptor de cargo
    const extracted = await extractJobDescriptionFromPDF(buffer);

    // Calcular nivel de confianza basado en datos extraídos
    let confidence = 0;
    if (extracted.position) confidence += 30;
    if (extracted.department) confidence += 20;
    if (extracted.jobFunctions && extracted.jobFunctions.length > 0) confidence += 40;
    if (extracted.requirements && extracted.requirements.length > 0) confidence += 10;

    return NextResponse.json({
      success: true,
      data: extracted,
      confidence,
      message: confidence > 50 
        ? 'Descriptor de cargo analizado exitosamente'
        : 'Información extraída parcialmente - considere revisar manualmente'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/job-description/parse:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}