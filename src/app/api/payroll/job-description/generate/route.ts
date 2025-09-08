import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// POST: Generar funciones de cargo usando IA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { position, department, company_type, additional_context } = body;

    if (!position) {
      return NextResponse.json({ error: 'El cargo es requerido' }, { status: 400 });
    }

    // Construir prompt contextualizado para Chile
    const prompt = `
Como experto en recursos humanos chilenos, necesito que generes un descriptor de cargo completo y realista para una PyME chilena.

INFORMACIÓN DEL CARGO:
- Cargo: ${position}
- Departamento: ${department || 'No especificado'}
- Tipo de empresa: ${company_type || 'PyME general'}
- Contexto adicional: ${additional_context || 'No especificado'}

Por favor genera un descriptor de cargo que incluya:

1. FUNCIONES PRINCIPALES (5-8 funciones específicas y medibles)
2. OBLIGACIONES LABORALES (obligaciones generales del empleado)
3. PROHIBICIONES (prohibiciones específicas del cargo)
4. REQUISITOS DEL CARGO (educación, experiencia, habilidades)

FORMATO REQUERIDO:
- Funciones en formato de lista clara y específica
- Cada función debe ser accionable y medible
- Usar terminología laboral chilena apropiada
- Enfoque en PyMEs (no corporaciones grandes)
- Máximo 200 caracteres por función

EJEMPLO DE CALIDAD ESPERADA:
✅ "Atender clientes de manera cordial y profesional en punto de venta"
✅ "Registrar ventas en sistema POS y manejar caja chica diaria"
❌ "Realizar tareas generales" (muy vago)
❌ "Desarrollar estrategias corporativas globales" (muy complejo para PyME)

Genera contenido práctico y realista para el contexto chileno.
`;

    // Llamar a Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const generatedContent = response.content[0];
    if (generatedContent.type !== 'text') {
      throw new Error('Respuesta inesperada de la IA');
    }

    // Parsear la respuesta para extraer las secciones
    const responseText = generatedContent.text;
    
    // Extraer funciones principales
    const functionsMatch = responseText.match(/FUNCIONES PRINCIPALES[:\s]*\n(.*?)(?=\n\s*\d+\.\s*OBLIGACIONES|\n\s*OBLIGACIONES|$)/s);
    const jobFunctions = functionsMatch ? 
      functionsMatch[1]
        .split(/\n\s*[-•*]\s*|\n\s*\d+\.?\s*/)
        .map(f => f.trim())
        .filter(f => f && f.length > 10)
        .slice(0, 8) : [];

    // Extraer obligaciones
    const obligationsMatch = responseText.match(/OBLIGACIONES[^:]*[:\s]*\n(.*?)(?=\n\s*\d+\.\s*PROHIBICIONES|\n\s*PROHIBICIONES|$)/s);
    const obligations = obligationsMatch ?
      obligationsMatch[1]
        .split(/\n\s*[-•*]\s*|\n\s*\d+\.?\s*/)
        .map(o => o.trim())
        .filter(o => o && o.length > 10)
        .slice(0, 6) : [];

    // Extraer prohibiciones
    const prohibitionsMatch = responseText.match(/PROHIBICIONES[^:]*[:\s]*\n(.*?)(?=\n\s*\d+\.\s*REQUISITOS|\n\s*REQUISITOS|$)/s);
    const prohibitions = prohibitionsMatch ?
      prohibitionsMatch[1]
        .split(/\n\s*[-•*]\s*|\n\s*\d+\.?\s*/)
        .map(p => p.trim())
        .filter(p => p && p.length > 10)
        .slice(0, 5) : [];

    // Extraer requisitos
    const requirementsMatch = responseText.match(/REQUISITOS[^:]*[:\s]*\n(.*?)$/s);
    const requirements = requirementsMatch ?
      requirementsMatch[1]
        .split(/\n\s*[-•*]\s*|\n\s*\d+\.?\s*/)
        .map(r => r.trim())
        .filter(r => r && r.length > 10)
        .slice(0, 6) : [];

    // Limpiar y formatear las funciones
    const cleanedJobFunctions = jobFunctions.map(func => 
      func.replace(/^\d+\.?\s*/, '').replace(/^[-•*]\s*/, '').trim()
    );

    const cleanedObligations = obligations.map(obl => 
      obl.replace(/^\d+\.?\s*/, '').replace(/^[-•*]\s*/, '').trim()
    );

    const cleanedProhibitions = prohibitions.map(proh => 
      proh.replace(/^\d+\.?\s*/, '').replace(/^[-•*]\s*/, '').trim()
    );

    const cleanedRequirements = requirements.map(req => 
      req.replace(/^\d+\.?\s*/, '').replace(/^[-•*]\s*/, '').trim()
    );

    return NextResponse.json({
      success: true,
      data: {
        position,
        department,
        job_functions: cleanedJobFunctions,
        obligations: cleanedObligations,
        prohibitions: cleanedProhibitions,
        requirements: cleanedRequirements,
        raw_response: responseText
      },
      generated_by: 'ai',
      message: 'Descriptor de cargo generado exitosamente por IA'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/job-description/generate:', error);
    
    // Error específico de Anthropic
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({ 
        error: 'Error de configuración de IA - verifique las credenciales',
        details: 'ANTHROPIC_API_KEY no configurada correctamente'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}