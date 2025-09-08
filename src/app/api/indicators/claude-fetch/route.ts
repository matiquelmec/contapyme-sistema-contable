import { NextRequest, NextResponse } from 'next/server';
import { updateIndicatorValue, ensureIndicatorConfig } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// Rate limiting simple en memoria
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 3; // Máximo 3 requests por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip);
  const recentRequests = requests.filter((time: number) => time > windowStart);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// POST /api/indicators/claude-fetch - Obtener indicadores reales usando Claude
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      console.log('⚠️ Rate limit exceeded for:', ip);
      return NextResponse.json(
        { error: 'Demasiadas requests. Inténtalo en un minuto.' },
        { status: 429 }
      );
    }

    const { indicators } = await request.json();
    
    if (!indicators || !Array.isArray(indicators)) {
      return NextResponse.json(
        { error: 'Se requiere array de indicadores a consultar' },
        { status: 400 }
      );
    }

    // Obtener fecha y hora actual de Chile
    const now = new Date();
    const chileTime = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    // Mapear códigos para que Claude use los correctos
    const codeMapping = {
      'uf': 'uf',
      'utm': 'utm', 
      'dolar': 'dolar',
      'euro': 'euro',
      'bitcoin': 'bitcoin',
      'sueldo_minimo': 'sueldo_minimo'  // NO MINIMUM_WAGE
    };

    // Prompt con códigos específicos
    const prompt = `Proporciona valores actualizados para estos indicadores económicos chilenos usando los CÓDIGOS EXACTOS especificados:

INDICADORES CON CÓDIGOS EXACTOS:
${indicators.map(ind => `- ${ind.name}: código "${ind.code}" (usar exactamente este código)`).join('\n')}

CONTEXTO: Sistema financiero chileno - valores representativos agosto 2025.

INSTRUCCIONES CRÍTICAS:
• USA EXACTAMENTE los códigos proporcionados arriba
• UF (código: "uf"): ~$39,000-$40,000 CLP
• UTM (código: "utm"): ~$68,000-$70,000 CLP  
• Dólar (código: "dolar"): ~$950-$1000 CLP
• Euro (código: "euro"): ~$1,050-$1,150 CLP
• Bitcoin (código: "bitcoin"): ~$60,000-$70,000 USD
• Sueldo Mínimo (código: "sueldo_minimo"): $529,000 CLP

⚠️ IMPORTANTE: NO uses códigos como "MINIMUM_WAGE", usa "sueldo_minimo"

RESPONDE SOLO JSON (sin explicaciones):
{
  "indicators": [
    {
      "code": "CODIGO_EXACTO_DE_LA_LISTA",
      "value": NUMERO_VALIDO,
      "source": "Estimación de mercado",
      "date": "${now.toISOString().split('T')[0]}"
    }
  ],
  "updated_at": "${now.toISOString()}",
  "success": true
}`;

    // Hacer llamada a Claude con retry logic y modelos alternativos
    let claudeResponse;
    let lastError;
    const maxRetries = 3;
    const models = [
      'claude-3-5-sonnet-20241022', // Modelo principal más reciente
      'claude-3-5-haiku-20241022',  // Modelo de respaldo más reciente
      'claude-3-haiku-20240307'     // Modelo más básico como último recurso
    ];
    
    let modelIndex = 0;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentModel = models[modelIndex];
        console.log(`🤖 Intento ${attempt}/${maxRetries} con modelo ${currentModel}...`);
        
        claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: currentModel,
            max_tokens: 1500, // Reducido para ser más conservador
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });

        if (claudeResponse.ok) {
          console.log('✅ Claude API respondió exitosamente');
          break;
        } else {
          const errorText = await claudeResponse.text();
          lastError = {
            status: claudeResponse.status,
            message: errorText
          };
          
          console.error(`❌ Claude API error (intento ${attempt}):`, claudeResponse.status, errorText);
          
          // Si es error 404 (modelo no encontrado), probar siguiente modelo
          if (claudeResponse.status === 404) {
            console.error(`❌ Error 404: Modelo ${models[modelIndex]} no encontrado.`);
            modelIndex++;
            
            if (modelIndex < models.length) {
              console.log(`🔄 Probando siguiente modelo: ${models[modelIndex]}`);
              continue; // Probar siguiente modelo
            } else {
              console.error('❌ Todos los modelos de Claude fallaron con 404.');
              lastError = {
                status: claudeResponse.status,
                message: errorText,
                modelError: true
              };
              break; // No más modelos para probar
            }
          }
          
          // Si es error 40x (rate limit o auth), esperar más tiempo
          if (claudeResponse.status >= 400 && claudeResponse.status < 500) {
            const waitTime = attempt * 2000; // 2s, 4s, 6s
            console.log(`⏱️ Esperando ${waitTime}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (fetchError) {
        console.error(`❌ Error de red en intento ${attempt}:`, fetchError);
        lastError = fetchError;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!claudeResponse || !claudeResponse.ok) {
      console.error('❌ Todos los intentos de Claude fallaron:', lastError);
      return NextResponse.json(
        { 
          error: 'Claude API no disponible temporalmente. Usando sistema de respaldo.',
          claude_error: lastError,
          fallback_active: true
        },
        { status: 503 }
      );
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'Respuesta vacía de Claude' },
        { status: 500 }
      );
    }

    // Parsear respuesta JSON de Claude
    let parsedResponse;
    try {
      // Extraer JSON de la respuesta (en caso de que tenga texto adicional)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      parsedResponse = JSON.parse(jsonString);
      
      console.log('📝 Claude response parsed:', JSON.stringify(parsedResponse, null, 2));
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Claude response:', content);
      return NextResponse.json(
        { error: 'Respuesta inválida de Claude', debug: content },
        { status: 500 }
      );
    }

    if (!parsedResponse.indicators || !Array.isArray(parsedResponse.indicators)) {
      console.error('❌ Formato inválido de respuesta:', parsedResponse);
      return NextResponse.json(
        { error: 'Formato de respuesta inválido de Claude' },
        { status: 500 }
      );
    }

    // Asegurar que existe la configuración de indicadores antes de actualizar
    await ensureIndicatorConfig();
    
    // Mapeo de códigos incorrectos que Claude podría enviar
    const codeCorrections = {
      'MINIMUM_WAGE': 'sueldo_minimo',
      'UF': 'uf',
      'UTM': 'utm',
      'USD': 'dolar',
      'EUR': 'euro',
      'BTC': 'bitcoin',
      'SUELDO_MIN': 'sueldo_minimo'
    };

    // Actualizar valores en la base de datos
    const updateResults = [];
    
    for (const indicator of parsedResponse.indicators) {
      try {
        // Corregir código si es necesario
        let correctedCode = indicator.code;
        if (codeCorrections[indicator.code]) {
          correctedCode = codeCorrections[indicator.code];
          console.log(`🔄 Corrigiendo código: ${indicator.code} → ${correctedCode}`);
        }

        // Validar que el indicador tenga un valor válido
        if (indicator.value === null || indicator.value === undefined || isNaN(indicator.value)) {
          console.error(`❌ Valor inválido para ${correctedCode}:`, indicator.value);
          updateResults.push({
            code: correctedCode,
            value: null,
            success: false,
            error: `Valor inválido: ${indicator.value}`
          });
          continue;
        }
        
        const { data, error } = await updateIndicatorValue(
          correctedCode,  // Usar código corregido
          Number(indicator.value), // Asegurar que es número
          indicator.date || new Date().toISOString().split('T')[0]
        );

        updateResults.push({
          code: correctedCode,  // Usar código corregido también aquí
          value: indicator.value,
          source: indicator.source,
          success: !error,
          error: error?.message
        });

        if (!error && data) {
          console.log(`✅ Updated ${correctedCode}: $${indicator.value.toLocaleString()}`);
        } else {
          console.error(`❌ Failed to update ${correctedCode}:`, error);
          // Intentar crear el indicador si el error es que no existe
          if (error?.code === 'PGRST116') {
            console.log(`🔄 Intentando crear indicador ${correctedCode} que no existe...`);
          }
        }
      } catch (updateError) {
        console.error(`Error updating ${correctedCode}:`, updateError);
        updateResults.push({
          code: correctedCode,
          value: indicator.value,
          success: false,
          error: updateError.message
        });
      }
    }

    const successCount = updateResults.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Actualizados ${successCount}/${updateResults.length} indicadores usando Claude`,
      results: updateResults,
      claude_response: parsedResponse,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in Claude fetch API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}