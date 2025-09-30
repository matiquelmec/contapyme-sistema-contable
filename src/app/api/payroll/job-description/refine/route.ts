import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// POST: Refinar funciones de cargo con IA y normativa chilena
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      position, 
      department, 
      raw_functions = [], 
      raw_obligations = [], 
      raw_prohibitions = [],
      company_type = 'PyME general',
      contract_type = 'indefinido',
      additional_context = ''
    } = body;

    if (!position) {
      return NextResponse.json({ error: 'El cargo es requerido' }, { status: 400 });
    }

    if (!raw_functions.length && !raw_obligations.length && !raw_prohibitions.length) {
      return NextResponse.json({ error: 'Se requiere al menos una función, obligación o prohibición para refinar' }, { status: 400 });
    }

    // Construir prompt especializado para refinamiento con normativa chilena
    const prompt = `
Como experto en derecho laboral chileno y recursos humanos para PyMEs, necesito que refines y mejores un descriptor de cargo para cumplir con la normativa legal chilena y mejores prácticas.

INFORMACIÓN DEL CARGO:
- Cargo: ${position}
- Departamento: ${department || 'No especificado'}
- Tipo de empresa: ${company_type}
- Tipo de contrato: ${contract_type}
- Contexto adicional: ${additional_context || 'No especificado'}

FUNCIONES ORIGINALES A REFINAR:
${raw_functions.map((func: string, idx: number) => `${idx + 1}. ${func}`).join('\n')}

OBLIGACIONES ORIGINALES:
${raw_obligations.map((obl: string, idx: number) => `${idx + 1}. ${obl}`).join('\n')}

PROHIBICIONES ORIGINALES:
${raw_prohibitions.map((proh: string, idx: number) => `${idx + 1}. ${proh}`).join('\n')}

INSTRUCCIONES DE REFINAMIENTO:

1. FUNCIONES PRINCIPALES (5-8 funciones refinadas):
   - Convierte funciones informales a lenguaje profesional
   - Agrega funciones esenciales que falten para el cargo
   - Ordena por importancia y frecuencia de uso
   - Usa terminología apropiada para PyMEs chilenas
   - Cada función debe ser específica, medible y accionable
   - Máximo 150 caracteres por función

2. OBLIGACIONES LABORALES (4-6 obligaciones):
   - Incluye obligaciones según Código del Trabajo chileno
   - Agrega responsabilidades de seguridad laboral
   - Incluye deberes de confidencialidad si aplica
   - Obligaciones específicas del cargo y generales del empleado

3. PROHIBICIONES (3-5 prohibiciones):
   - Prohibiciones según Art. 160 Código del Trabajo
   - Prohibiciones específicas del cargo/industria
   - Uso apropiado de recursos empresariales
   - Conductas incompatibles con el puesto

CRITERIOS DE CALIDAD:
✅ Lenguaje profesional pero comprensible
✅ Cumplimiento Código del Trabajo Chile
✅ Adaptado a realidad PyME
✅ Específico para el cargo mencionado
✅ Sin ambigüedades o generalidades vagas
✅ Términos laborales chilenos apropiados

FORMATO DE RESPUESTA:
Organiza tu respuesta en estas secciones exactas:

FUNCIONES PRINCIPALES REFINADAS:
• [función refinada 1]
• [función refinada 2]
• [etc...]

OBLIGACIONES LABORALES:
• [obligación 1]
• [obligación 2]
• [etc...]

PROHIBICIONES:
• [prohibición 1]
• [prohibición 2]
• [etc...]

MEJORAS REALIZADAS:
• [descripción de mejoras aplicadas]

NOTAS DE COMPLIANCE:
• [referencias legales consideradas]

Refina y mejora el descriptor manteniendo la esencia del cargo pero elevando la calidad profesional y compliance legal.
`;

    // Llamar a Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3, // Menos creativo, más consistente para refinamiento
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const generatedContent = response.content[0];
    if (generatedContent.type !== 'text') {
      throw new Error('Respuesta inesperada de la IA');
    }

    const responseText = generatedContent.text;
    
    // Parsear la respuesta estructurada
    const functionsMatch = responseText.match(/FUNCIONES PRINCIPALES REFINADAS:[:\s]*\n(.*?)(?=\n\s*OBLIGACIONES LABORALES:|$)/s);
    const refinedFunctions = functionsMatch ? 
      functionsMatch[1]
        .split(/\n\s*[•*-]\s*/)
        .map(f => f.trim())
        .filter(f => f && f.length > 10)
        .slice(0, 8) : [];

    const obligationsMatch = responseText.match(/OBLIGACIONES LABORALES:[:\s]*\n(.*?)(?=\n\s*PROHIBICIONES:|$)/s);
    const refinedObligations = obligationsMatch ?
      obligationsMatch[1]
        .split(/\n\s*[•*-]\s*/)
        .map(o => o.trim())
        .filter(o => o && o.length > 10)
        .slice(0, 6) : [];

    const prohibitionsMatch = responseText.match(/PROHIBICIONES:[:\s]*\n(.*?)(?=\n\s*MEJORAS REALIZADAS:|$)/s);
    const refinedProhibitions = prohibitionsMatch ?
      prohibitionsMatch[1]
        .split(/\n\s*[•*-]\s*/)
        .map(p => p.trim())
        .filter(p => p && p.length > 10)
        .slice(0, 5) : [];

    // Extraer mejoras y notas de compliance
    const improvementsMatch = responseText.match(/MEJORAS REALIZADAS:[:\s]*\n(.*?)(?=\n\s*NOTAS DE COMPLIANCE:|$)/s);
    const improvements = improvementsMatch ?
      improvementsMatch[1]
        .split(/\n\s*[•*-]\s*/)
        .map(i => i.trim())
        .filter(i => i && i.length > 5) : [];

    const complianceMatch = responseText.match(/NOTAS DE COMPLIANCE:[:\s]*\n(.*?)$/s);
    const complianceNotes = complianceMatch ?
      complianceMatch[1]
        .split(/\n\s*[•*-]\s*/)
        .map(c => c.trim())
        .filter(c => c && c.length > 5) : [];

    // Limpiar arrays eliminando bullets y numeración
    const cleanArray = (arr: string[]) => arr.map(item => 
      item.replace(/^\d+\.?\s*/, '').replace(/^[•*-]\s*/, '').trim()
    ).filter(item => item.length > 0);

    const cleanedFunctions = cleanArray(refinedFunctions);
    const cleanedObligations = cleanArray(refinedObligations);
    const cleanedProhibitions = cleanArray(refinedProhibitions);

    return NextResponse.json({
      success: true,
      data: {
        position,
        department,
        refined_functions: cleanedFunctions,
        refined_obligations: cleanedObligations,
        refined_prohibitions: cleanedProhibitions,
        improvements_made: improvements,
        compliance_notes: complianceNotes,
        raw_response: responseText
      },
      refined_by: 'ai',
      refinement_quality: {
        functions_improved: cleanedFunctions.length,
        obligations_added: cleanedObligations.length,
        prohibitions_added: cleanedProhibitions.length,
        compliance_level: complianceNotes.length > 0 ? 'high' : 'medium'
      },
      message: 'Descriptor de cargo refinado exitosamente según normativa chilena'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/job-description/refine:', error);
    
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