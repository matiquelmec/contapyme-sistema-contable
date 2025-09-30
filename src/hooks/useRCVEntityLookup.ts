import { useState, useCallback, useRef } from 'react';

interface RCVEntitySuggestion {
  id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  account_code: string;
  account_name: string;
  account_type: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
}

interface RCVLookupResult {
  found: boolean;
  entity?: RCVEntitySuggestion;
  message?: string;
}

export function useRCVEntityLookup() {
  const [loading, setLoading] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>('');
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expresión regular para detectar RUT chileno
  const rutRegex = /\b(\d{1,2}\.\d{3}\.\d{3}[-−]\w)\b/g;

  /**
   * Extrae RUTs de un texto usando regex
   */
  const extractRUTsFromText = useCallback((text: string): string[] => {
    if (!text || typeof text !== 'string') return [];
    
    const matches = text.match(rutRegex);
    if (!matches) return [];
    
    // Limpiar y normalizar RUTs encontrados
    return matches.map(rut => 
      rut.trim()
        .replace(/−/g, '-') // Normalizar guiones
        .replace(/\s+/g, '') // Remover espacios extra
    ).filter((rut, index, arr) => arr.indexOf(rut) === index); // Remover duplicados
  }, []);

  /**
   * Busca una entidad RCV por RUT específico
   */
  const lookupEntityByRUT = useCallback(async (rut: string): Promise<RCVLookupResult> => {
    if (!rut || rut === lastLookup) {
      return { found: false, message: 'RUT vacío o ya consultado' };
    }

    try {
      setLoading(true);
      setLastLookup(rut);

      const response = await fetch(`/api/accounting/rcv-entities/lookup?rut=${encodeURIComponent(rut)}`);
      const data = await response.json();

      if (data.success && data.entity_found) {
        return {
          found: true,
          entity: data.data,
          message: data.message
        };
      } else {
        return {
          found: false,
          message: data.error || 'Entidad no encontrada'
        };
      }
    } catch (error) {
      console.error('Error looking up RCV entity:', error);
      return {
        found: false,
        message: 'Error en búsqueda de entidad'
      };
    } finally {
      setLoading(false);
    }
  }, [lastLookup]);

  /**
   * Busca automáticamente entidades RCV desde un texto (descripción, documento, etc.)
   */
  const autoLookupFromText = useCallback(async (
    text: string,
    onEntityFound?: (entity: RCVEntitySuggestion) => void,
    onEntityNotFound?: (rut: string) => void
  ): Promise<RCVLookupResult[]> => {
    const ruts = extractRUTsFromText(text);
    
    if (ruts.length === 0) {
      return [];
    }

    console.log(`🔍 Auto-lookup encontró RUTs en texto: ${ruts.join(', ')}`);

    const results: RCVLookupResult[] = [];

    // Buscar cada RUT encontrado
    for (const rut of ruts) {
      try {
        const result = await lookupEntityByRUT(rut);
        results.push(result);

        if (result.found && result.entity && onEntityFound) {
          onEntityFound(result.entity);
        } else if (!result.found && onEntityNotFound) {
          onEntityNotFound(rut);
        }
      } catch (error) {
        console.error(`Error looking up RUT ${rut}:`, error);
        results.push({
          found: false,
          message: `Error buscando RUT ${rut}`
        });
      }
    }

    return results;
  }, [extractRUTsFromText, lookupEntityByRUT]);

  /**
   * Auto-lookup con debounce para evitar múltiples requests
   */
  const debouncedAutoLookup = useCallback((
    text: string,
    onEntityFound?: (entity: RCVEntitySuggestion) => void,
    onEntityNotFound?: (rut: string) => void,
    delay: number = 1000
  ) => {
    // Cancelar lookup anterior
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    // Programar nuevo lookup
    lookupTimeoutRef.current = setTimeout(() => {
      autoLookupFromText(text, onEntityFound, onEntityNotFound);
    }, delay);
  }, [autoLookupFromText]);

  /**
   * Genera sugerencias de cuentas basadas en el tipo de entidad
   */
  const generateAccountSuggestions = useCallback((entity: RCVEntitySuggestion, transactionType: 'debit' | 'credit' = 'debit') => {
    const suggestions = [];

    // Cuenta principal de la entidad
    suggestions.push({
      code: entity.account_code,
      name: entity.account_name,
      type: 'main',
      description: `Cuenta principal de ${entity.entity_name}`
    });

    // Sugerencias de IVA si aplica
    if (!entity.is_tax_exempt && entity.default_tax_rate > 0) {
      if (entity.entity_type === 'supplier' || entity.entity_type === 'both') {
        suggestions.push({
          code: '1.1.2.002', // IVA Crédito Fiscal  
          name: 'IVA Crédito Fiscal',
          type: 'tax',
          description: `IVA ${entity.default_tax_rate}% para compras`
        });
      }
      
      if (entity.entity_type === 'customer' || entity.entity_type === 'both') {
        suggestions.push({
          code: '2.1.2.001', // IVA Débito Fiscal
          name: 'IVA Débito Fiscal', 
          type: 'tax',
          description: `IVA ${entity.default_tax_rate}% para ventas`
        });
      }
    }

    return suggestions;
  }, []);

  return {
    loading,
    extractRUTsFromText,
    lookupEntityByRUT,
    autoLookupFromText,
    debouncedAutoLookup,
    generateAccountSuggestions,
    lastLookup
  };
}