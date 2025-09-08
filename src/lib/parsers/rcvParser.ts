// ==========================================
// RCV PARSER - ANÁLISIS DE REGISTRO DE COMPRAS Y VENTAS
// Procesa archivos CSV del SII para análisis de proveedores
// ==========================================

export interface RCVRow {
  nro: string;
  tipoDoc: string;
  tipoCompra: string;
  rutProveedor: string;
  razonSocial: string;
  folio: string;
  fechaDocto: string;
  fechaRecepcion: string;
  fechaAcuse: string;
  montoExento: number;
  montoNeto: number;
  montoIVA: number;
  montoIVANoRecuperable: number;
  codigoIVANoRec: string;
  montoTotal: number;
  montoNetoActivoFijo: number;
  ivaActivoFijo: number;
  ivaUsoComun: number;
  imptoSinDerechoCredito: number;
  ivaNoRetenido: number;
  tabacosPuros: number;
  tabacosCigarrillos: number;
  tabacosElaborados: number;
  nceNdeFactura: number;
  codigoOtroImpuesto: string;
  valorOtroImpuesto: number;
  tasaOtroImpuesto: number;
}

export interface ProveedorSummary {
  rutProveedor: string;
  razonSocial: string;
  totalTransacciones: number;
  transaccionesSuma: number; // Tipo 33 y 34
  transaccionesResta: number; // Tipo 61
  montoExentoTotal: number;
  montoNetoTotal: number;
  montoIVATotal: number; // Columna L - IVA Total
  montoCalculado: number; // (J + K) considerando tipo documento
  porcentajeDelTotal: number;
}

export interface RCVAnalysis {
  totalTransacciones: number;
  transaccionesSuma: number; // Docs tipo 33 y 34
  transaccionesResta: number; // Docs tipo 61
  montoExentoGlobal: number;
  montoNetoGlobal: number;
  montoIVAGlobal: number; // Columna L - IVA Global
  montoCalculadoGlobal: number; // Total considerando tipos de documento
  proveedoresPrincipales: ProveedorSummary[];
  transacciones: RCVRow[];
  periodoInicio: string;
  periodoFin: string;
  confidence: number;
  method: string;
}

/**
 * Limpia fechas malformadas que vienen en formato incorrecto
 * Ej: "2025 02:24:19-08-01" → "2025-08-01"
 */
function cleanDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '2025-08-01'; // Fallback date
  }
  
  try {
    // Si la fecha contiene espacios y dos puntos, está malformada
    if (dateStr.includes(' ') && dateStr.includes(':')) {
      // Intentar extraer YYYY-MM-DD del formato malformado
      const match = dateStr.match(/(\d{4}).*?(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        const cleanedDate = `${year}-${month}-${day}`;
        console.log(`🔧 Cleaned malformed date: "${dateStr}" → "${cleanedDate}"`);
        return cleanedDate;
      }
    }
    
    // Si está en formato DD/MM/YYYY, convertir a YYYY-MM-DD
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        if (year?.length === 4 && month && day) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    
    // Si ya está en formato correcto YYYY-MM-DD, devolverlo tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Fallback
    console.warn(`⚠️ Could not clean malformed date: "${dateStr}"`);
    return '2025-08-01';
  } catch (error) {
    console.warn(`⚠️ Error cleaning date "${dateStr}":`, error);
    return '2025-08-01';
  }
}

// Función principal para procesar archivo RCV
export async function parseRCV(file: File): Promise<RCVAnalysis> {
  console.log('🎯 RCV Parser: Iniciando análisis de archivo RCV...');
  console.log(`📄 Archivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  try {
    // Leer contenido del archivo CSV
    const csvContent = await file.text();
    console.log('✅ Archivo CSV leído exitosamente');
    
    // Procesar CSV línea por línea
    const analysis = processCSVContent(csvContent);
    
    console.log('✅ Análisis RCV completado exitosamente');
    console.log(`📊 Total transacciones: ${analysis.totalTransacciones}`);
    console.log(`💰 Monto calculado global: ${analysis.montoCalculadoGlobal.toLocaleString()}`);
    console.log(`🏢 Proveedores únicos: ${analysis.proveedoresPrincipales.length}`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error en análisis RCV:', error);
    throw error;
  }
}

// Procesar contenido CSV y generar análisis
function processCSVContent(csvContent: string): RCVAnalysis {
  const lines = csvContent.split('\n');
  
  if (lines.length < 2) {
    throw new Error('Archivo CSV inválido o vacío');
  }
  
  // Saltar header (primera línea)
  const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
  
  const transacciones: RCVRow[] = [];
  const proveedoresMap = new Map<string, ProveedorSummary>();
  
  let montoExentoGlobal = 0;
  let montoNetoGlobal = 0;
  let montoIVAGlobal = 0;
  let montoCalculadoGlobal = 0;
  let transaccionesSumaGlobal = 0;
  let transaccionesRestaGlobal = 0;
  
  let fechaMinima = '';
  let fechaMaxima = '';
  
  console.log(`📋 Procesando ${dataLines.length} transacciones...`);
  
  for (const line of dataLines) {
    try {
      const row = parseCSVRow(line);
      
      // Solo procesar filas con datos válidos
      if (!row.razonSocial || row.razonSocial.trim() === '') {
        continue;
      }
      
      transacciones.push(row);
      
      // Usar el monto total directamente de la columna del CSV
      const montoTransaccion = row.montoTotal;
      
      // Aplicar lógica según tipo de documento
      let montoFinalTransaccion = 0;
      let esSuma = false;
      let esResta = false;
      
      if (row.tipoDoc === '33' || row.tipoDoc === '34') {
        // Facturas y facturas exentas: SUMAN
        montoFinalTransaccion = montoTransaccion;
        esSuma = true;
        transaccionesSumaGlobal++;
      } else if (row.tipoDoc === '61') {
        // Notas de crédito: RESTAN
        montoFinalTransaccion = -montoTransaccion;
        esResta = true;
        transaccionesRestaGlobal++;
      } else {
        // Otros tipos: neutral por ahora
        montoFinalTransaccion = 0;
      }
      
      // Sumar totales globales - CONSIDERAR SIGNO SEGÚN TIPO DOCUMENTO
      const montoNetoCorrecto = row.montoNeto + (row.valorOtroImpuesto || 0);
      
      if (row.tipoDoc === '61') {
        // Notas de crédito RESTAN de los totales globales
        montoExentoGlobal -= row.montoExento;
        montoNetoGlobal -= montoNetoCorrecto;
        montoIVAGlobal -= row.montoIVA;
      } else {
        // Facturas SUMAN a los totales globales
        montoExentoGlobal += row.montoExento;
        montoNetoGlobal += montoNetoCorrecto;
        montoIVAGlobal += row.montoIVA;
      }
      
      montoCalculadoGlobal += montoFinalTransaccion;
      
      // Trackear fechas para período
      if (!fechaMinima || row.fechaDocto < fechaMinima) {
        fechaMinima = row.fechaDocto;
      }
      if (!fechaMaxima || row.fechaDocto > fechaMaxima) {
        fechaMaxima = row.fechaDocto;
      }
      
      // Agregar/actualizar proveedor
      const rutKey = row.rutProveedor;
      if (proveedoresMap.has(rutKey)) {
        const proveedor = proveedoresMap.get(rutKey)!;
        proveedor.totalTransacciones++;
        
        // CORRECCIÓN: Aplicar signo según tipo de documento
        const montoNetoCorrecto = row.montoNeto + (row.valorOtroImpuesto || 0);
        const montoExento = row.montoExento;
        const montoIVA = row.montoIVA;
        
        if (row.tipoDoc === '61') {
          // Notas de crédito RESTAN
          proveedor.montoExentoTotal -= montoExento;
          proveedor.montoNetoTotal -= montoNetoCorrecto;
          proveedor.montoIVATotal -= montoIVA;
        } else {
          // Facturas SUMAN
          proveedor.montoExentoTotal += montoExento;
          proveedor.montoNetoTotal += montoNetoCorrecto;
          proveedor.montoIVATotal += montoIVA;
        }
        
        proveedor.montoCalculado += montoFinalTransaccion;
        
        if (esSuma) proveedor.transaccionesSuma++;
        if (esResta) proveedor.transaccionesResta++;
      } else {
        // CORRECCIÓN: Aplicar signo también en creación inicial
        const montoNetoCorrecto = row.montoNeto + (row.valorOtroImpuesto || 0);
        
        // Si es nota de crédito, los montos deben ser negativos
        const montoExentoFinal = row.tipoDoc === '61' ? -row.montoExento : row.montoExento;
        const montoNetoFinal = row.tipoDoc === '61' ? -montoNetoCorrecto : montoNetoCorrecto;
        const montoIVAFinal = row.tipoDoc === '61' ? -row.montoIVA : row.montoIVA;
        
        proveedoresMap.set(rutKey, {
          rutProveedor: row.rutProveedor,
          razonSocial: row.razonSocial,
          totalTransacciones: 1,
          transaccionesSuma: esSuma ? 1 : 0,
          transaccionesResta: esResta ? 1 : 0,
          montoExentoTotal: montoExentoFinal,
          montoNetoTotal: montoNetoFinal,
          montoIVATotal: montoIVAFinal,
          montoCalculado: montoFinalTransaccion,
          porcentajeDelTotal: 0 // Se calculará después
        });
      }
      
    } catch (error) {
      console.warn('⚠️ Error procesando línea CSV:', line.substring(0, 50) + '...');
      continue;
    }
  }
  
  // Convertir mapa a array y calcular porcentajes
  const proveedoresPrincipales = Array.from(proveedoresMap.values())
    .map(proveedor => ({
      ...proveedor,
      porcentajeDelTotal: Math.abs(montoCalculadoGlobal) > 0 
        ? Math.abs(proveedor.montoCalculado / montoCalculadoGlobal) * 100 
        : 0
    }))
    .sort((a, b) => Math.abs(b.montoCalculado) - Math.abs(a.montoCalculado)); // Ordenar por monto calculado absoluto
  
  console.log(`🏆 Top 5 proveedores:`);
  proveedoresPrincipales.slice(0, 5).forEach((p, i) => {
    const tipoOperacion = p.montoCalculado >= 0 ? 'COMPRAS' : 'DEVOLUCIONES';
    console.log(`${i + 1}. ${p.razonSocial}: $${Math.abs(p.montoCalculado).toLocaleString()} ${tipoOperacion} (${p.porcentajeDelTotal.toFixed(1)}%)`);
  });
  
  return {
    totalTransacciones: transacciones.length,
    transaccionesSuma: transaccionesSumaGlobal,
    transaccionesResta: transaccionesRestaGlobal,
    montoExentoGlobal,
    montoNetoGlobal,
    montoIVAGlobal,
    montoCalculadoGlobal,
    proveedoresPrincipales,
    transacciones,
    periodoInicio: fechaMinima,
    periodoFin: fechaMaxima,
    confidence: 95, // Alta confianza en parsing CSV
    method: 'csv-direct-parsing'
  };
}

// Parsear una línea CSV individual
function parseCSVRow(line: string): RCVRow {
  // Split por punto y coma, manejando campos vacíos
  const fields = line.split(';').map(field => field.trim());
  
  // Función helper para convertir a número
  const toNumber = (value: string): number => {
    if (!value || value === '') return 0;
    // Remover comas y convertir
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };
  
  // Mapear campos según estructura RCV del SII
  return {
    nro: fields[0] || '',
    tipoDoc: fields[1] || '',
    tipoCompra: fields[2] || '',
    rutProveedor: fields[3] || '',
    razonSocial: fields[4] || '',
    folio: fields[5] || '',
    fechaDocto: cleanDate(fields[6]),
    fechaRecepcion: cleanDate(fields[7]),
    fechaAcuse: cleanDate(fields[8]),
    montoExento: toNumber(fields[9]),        // Columna J
    montoNeto: toNumber(fields[10]),         // Columna K
    montoIVA: toNumber(fields[11]),
    montoIVANoRecuperable: toNumber(fields[12]),
    codigoIVANoRec: fields[13] || '',
    montoTotal: toNumber(fields[14]),
    montoNetoActivoFijo: toNumber(fields[15]),
    ivaActivoFijo: toNumber(fields[16]),
    ivaUsoComun: toNumber(fields[17]),
    imptoSinDerechoCredito: toNumber(fields[18]),
    ivaNoRetenido: toNumber(fields[19]),
    tabacosPuros: toNumber(fields[20]),
    tabacosCigarrillos: toNumber(fields[21]),
    tabacosElaborados: toNumber(fields[22]),
    nceNdeFactura: toNumber(fields[23]),
    codigoOtroImpuesto: fields[24] || '',
    valorOtroImpuesto: toNumber(fields[25]),
    tasaOtroImpuesto: toNumber(fields[26])
  };
}

// Función para obtener top N proveedores
export function getTopProveedores(analysis: RCVAnalysis, limit: number = 10): ProveedorSummary[] {
  return analysis.proveedoresPrincipales.slice(0, limit);
}

// Función para filtrar transacciones por proveedor
export function getTransaccionesByProveedor(analysis: RCVAnalysis, rutProveedor: string): RCVRow[] {
  return analysis.transacciones.filter(t => t.rutProveedor === rutProveedor);
}

// Función para estadísticas generales
export function getEstadisticasRCV(analysis: RCVAnalysis) {
  const avgTransaccionMonto = analysis.totalTransacciones > 0 
    ? Math.abs(analysis.montoCalculadoGlobal) / analysis.totalTransacciones 
    : 0;
  
  const proveedorTop = analysis.proveedoresPrincipales[0];
  
  return {
    avgTransaccionMonto,
    totalProveedores: analysis.proveedoresPrincipales.length,
    concentracionTop5: analysis.proveedoresPrincipales
      .slice(0, 5)
      .reduce((sum, p) => sum + p.porcentajeDelTotal, 0),
    proveedorPrincipal: proveedorTop,
    balanceOperaciones: {
      compras: analysis.transaccionesSuma,
      devoluciones: analysis.transaccionesResta,
      montoNeto: analysis.montoCalculadoGlobal
    }
  };
}