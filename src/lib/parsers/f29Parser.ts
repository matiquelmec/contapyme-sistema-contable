// ==========================================
// F29 PARSER - IMPLEMENTACIÓN VISUAL CON CLAUDE
// Sistema de análisis visual de formularios F29
// ==========================================

import { parseF29Visual, F29Data } from './f29VisualParser';

// Re-exportar tipos
export type { F29Data };

// Función principal que delega al parser visual
export async function parseF29(file: File): Promise<F29Data> {
  console.log('🚀 F29 Parser: Iniciando análisis visual del formulario...');
  console.log(`📄 Archivo recibido: ${file.name} (${file.size} bytes)`);
  
  try {
    // Verificar que tenemos la API key de Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY no está configurada');
      throw new Error('Se requiere ANTHROPIC_API_KEY para análisis de F29');
    }
    
    console.log('✅ Claude AI disponible para análisis');
    
    // Usar el parser visual
    const result = await parseF29Visual(file);
    
    console.log('✅ Análisis F29 completado exitosamente');
    return result;
    
  } catch (error) {
    console.error('❌ Error en análisis F29:', error);
    throw new Error(`Error analizando F29: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}