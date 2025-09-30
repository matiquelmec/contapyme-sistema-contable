import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// POST /api/accounting/balance-analyzer/mapping - Generar mapeo automático de cuentas
export async function POST(request: NextRequest) {
  try {
    const { external_accounts, company_id } = await request.json();

    if (!external_accounts || !company_id) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros: external_accounts y company_id son requeridos'
      }, { status: 400 });
    }

    console.log('🔄 Generando mapeo automático para', external_accounts.length, 'cuentas externas');

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la base de datos'
      }, { status: 500 });
    }

    // Obtener el plan de cuentas interno
    const { data: internalAccounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('code, name, account_type, level_type')
      .eq('is_active', true)
      .eq('level_type', 'Imputable');

    if (accountsError) {
      console.error('❌ Error obteniendo plan de cuentas:', accountsError);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo plan de cuentas: ' + accountsError.message
      }, { status: 500 });
    }

    // Generar mapeos para cada cuenta externa que tenga saldo
    const mappingResults = external_accounts
      .filter((extAccount: any) => calculateMappingAmount(extAccount) > 0) // Solo cuentas con saldo
      .map((extAccount: any) => {
        const mapping = generateAccountMapping(extAccount, internalAccounts || []);
        return {
          external_account: `${extAccount.code} - ${extAccount.description}`,
          external_code: extAccount.code,
          external_description: extAccount.description,
          mapped_code: mapping.code,
          mapped_name: mapping.name,
          amount: calculateMappingAmount(extAccount),
          side: determineSide(extAccount),
          confidence: mapping.confidence,
          mapping_reason: mapping.reason
        };
      });

    console.log(`✅ Mapeo generado: ${mappingResults.length} cuentas mapeadas`);

    return NextResponse.json({
      success: true,
      data: {
        mappings: mappingResults,
        summary: {
          total_accounts: mappingResults.length,
          high_confidence: mappingResults.filter(m => m.confidence >= 90).length,
          medium_confidence: mappingResults.filter(m => m.confidence >= 70 && m.confidence < 90).length,
          low_confidence: mappingResults.filter(m => m.confidence < 70).length,
          average_confidence: Math.round(mappingResults.reduce((sum, m) => sum + m.confidence, 0) / mappingResults.length)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/accounting/balance-analyzer/mapping:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Función principal de mapeo de cuentas
function generateAccountMapping(externalAccount: any, internalAccounts: any[]) {
  const extCode = externalAccount.code.toLowerCase();
  const extDesc = externalAccount.description.toLowerCase();

  // Reglas de mapeo por código (mayor confianza)
  const codeMapping = mapByCode(extCode, internalAccounts);
  if (codeMapping.confidence >= 95) {
    return codeMapping;
  }

  // Reglas de mapeo por descripción (menor confianza)
  const descMapping = mapByDescription(extDesc, internalAccounts);
  if (descMapping.confidence >= 85) {
    return descMapping;
  }

  // Reglas de mapeo por tipo de cuenta (confianza media)
  const typeMapping = mapByType(externalAccount, internalAccounts);
  if (typeMapping.confidence >= 70) {
    return typeMapping;
  }

  // Si nada coincide, mapeo por defecto
  return {
    code: '1.1.1.999',
    name: 'Cuenta por Clasificar',
    confidence: 30,
    reason: 'Sin coincidencia - requiere mapeo manual'
  };
}

// Mapeo por código de cuenta
function mapByCode(extCode: string, internalAccounts: any[]) {
  // Mapeos exactos de códigos comunes - AMPLIADO CON CUENTAS DE GASTROLOGICA
  const exactMappings: { [key: string]: { code: string, name: string, confidence: number } } = {
    // ACTIVOS - AMPLIADO CON MÁS CUENTAS TÍPICAS
    '1.1.1.001': { code: '1.1.1.001', name: 'Caja', confidence: 100 },
    '1.01.01.01': { code: '1.1.1.001', name: 'Caja', confidence: 98 },
    '1.01.01.02': { code: '1.1.2.001', name: 'Banco', confidence: 98 },
    '1.01.01.03': { code: '1.1.1.002', name: 'Caja Chica', confidence: 95 },
    '1.01.02.01': { code: '1.1.2.002', name: 'Banco Estado', confidence: 95 },
    '1.01.02.02': { code: '1.1.2.003', name: 'Banco Chile', confidence: 95 },
    '1.01.02.03': { code: '1.1.2.004', name: 'Banco Santander', confidence: 95 },
    '1.01.03.01': { code: '1.1.2.005', name: 'Fondos Mutuos', confidence: 90 },
    '1.01.04.01': { code: '1.1.3.002', name: 'Documentos por Cobrar', confidence: 95 },
    '1.01.05.01': { code: '1.1.3.001', name: 'Clientes', confidence: 95 },
    '1.01.05.02': { code: '1.1.3.003', name: 'Clientes Extranjeros', confidence: 95 },
    '1.01.06.01': { code: '1.1.3.004', name: 'Deudores Varios', confidence: 90 },
    '1.01.07.01': { code: '1.1.3.005', name: 'Cuentas por Cobrar Empleados', confidence: 90 },
    '1.01.08.01': { code: '1.1.3.006', name: 'Anticipos a Proveedores', confidence: 90 },
    '1.01.09.01': { code: '1.1.5.001', name: 'Inventarios', confidence: 95 },
    '1.01.09.02': { code: '1.1.5.002', name: 'Mercaderías en Tránsito', confidence: 90 },
    '1.01.10.01': { code: '1.1.4.001', name: 'IVA Crédito Fiscal', confidence: 98 },
    '1.01.10.02': { code: '1.1.4.002', name: 'PPM', confidence: 98 },
    '1.01.10.03': { code: '1.1.4.004', name: 'Crédito SENCE', confidence: 90 },
    '1.01.11.01': { code: '1.1.6.001', name: 'Gastos Pagados por Anticipado', confidence: 90 },
    '1.01.11.02': { code: '1.1.6.002', name: 'Seguros Vigentes', confidence: 90 },
    '1.3.1.001': { code: '1.1.4.003', name: 'Remanente Crédito Fiscal', confidence: 98 },
    '1.02.01.01': { code: '1.2.2.001', name: 'Terrenos', confidence: 95 },
    '1.02.02.01': { code: '1.2.2.002', name: 'Edificios', confidence: 95 },
    '1.02.03.01': { code: '1.2.1.003', name: 'Vehículos', confidence: 95 },
    '1.02.04.01': { code: '1.2.1.001', name: 'Muebles y Útiles', confidence: 95 },
    '1.02.04.02': { code: '1.2.1.002', name: 'Equipos Computacionales', confidence: 95 },
    '1.02.05.01': { code: '1.2.1.004', name: 'Maquinarias y Equipos', confidence: 95 },
    '1.02.06.01': { code: '1.2.3.001', name: 'Depreciación Acumulada', confidence: 95 },
    
    // PASIVOS - AMPLIADO CON MÁS CUENTAS TÍPICAS
    '2.1.1.001': { code: '2.1.1.001', name: 'Proveedores Por Pagar', confidence: 100 },
    '2.01.01.01': { code: '2.1.5.001', name: 'Préstamos Bancarios Corto Plazo', confidence: 95 },
    '2.01.02.01': { code: '2.1.5.002', name: 'Línea de Crédito', confidence: 95 },
    '2.01.03.01': { code: '2.1.5.003', name: 'Tarjetas de Crédito', confidence: 90 },
    '2.01.04.01': { code: '2.1.1.002', name: 'Documentos por Pagar', confidence: 95 },
    '2.01.05.01': { code: '2.1.1.003', name: 'Letras por Pagar', confidence: 95 },
    '2.01.06.01': { code: '2.1.1.004', name: 'Acreedores Varios', confidence: 90 },
    '2.01.07.01': { code: '2.1.1.001', name: 'Proveedores Nacionales', confidence: 98 },
    '2.01.07.02': { code: '2.1.1.005', name: 'Proveedores Extranjeros', confidence: 95 },
    '2.01.07.03': { code: '2.1.2.001', name: 'Honorarios por Pagar', confidence: 95 },
    '2.01.08.01': { code: '2.1.3.001', name: 'Sueldos por Pagar', confidence: 98 },
    '2.01.08.02': { code: '2.1.3.002', name: 'Vacaciones por Pagar', confidence: 95 },
    '2.01.09.01': { code: '2.1.3.003', name: 'Finiquitos por Pagar', confidence: 95 },
    '2.01.10.01': { code: '2.1.6.001', name: 'Retenciones por Pagar', confidence: 90 },
    '2.01.11.01': { code: '2.1.6.002', name: 'Anticipo de Clientes', confidence: 90 },
    '2.01.12.01': { code: '2.1.4.001', name: 'Imposiciones por Pagar', confidence: 98 },
    '2.01.12.02': { code: '2.1.4.003', name: 'PPM por Pagar', confidence: 95 },
    '2.01.12.03': { code: '2.1.4.004', name: 'Impuesto Único por Pagar', confidence: 95 },
    '2.01.12.04': { code: '2.1.4.002', name: 'IVA Débito Fiscal', confidence: 98 },
    '2.01.13.01': { code: '2.1.6.003', name: 'Provisiones Varias', confidence: 85 },
    '2.1.2.001': { code: '2.1.2.001', name: 'AFP por Pagar', confidence: 100 },
    '2.1.2.002': { code: '2.1.2.002', name: 'Salud por Pagar', confidence: 100 },
    '2.1.2.003': { code: '2.1.2.003', name: 'Cesantía por Pagar', confidence: 100 },
    '2.1.2.004': { code: '2.1.2.004', name: 'SIS por Pagar', confidence: 100 },
    '2.1.2.005': { code: '2.1.2.005', name: 'Esperanza Vida por Pagar', confidence: 100 },
    '2.1.2.006': { code: '2.1.2.006', name: 'Mutual por Pagar', confidence: 100 },
    '2.1.3.001': { code: '2.1.3.001', name: 'Impuesto 2da Categoría por Pagar', confidence: 100 },
    '2.1.3.002': { code: '2.1.4.002', name: 'IVA Débito Fiscal', confidence: 100 },
    '2.1.3.003': { code: '2.1.3.003', name: 'Impuesto por Pagar', confidence: 100 },
    '2.02.01.01': { code: '2.2.1.001', name: 'Préstamos Bancarios Largo Plazo', confidence: 95 },
    '2.02.02.01': { code: '2.2.1.002', name: 'Leasing por Pagar', confidence: 90 },
    
    // PATRIMONIO - AMPLIADO
    '2.03.01.01': { code: '3.1.1.001', name: 'Capital', confidence: 98 },
    '2.03.01.02': { code: '3.1.1.002', name: 'Capital Social', confidence: 95 },
    '2.03.02.01': { code: '3.1.2.001', name: 'Reservas', confidence: 90 },
    '2.03.03.01': { code: '3.1.3.001', name: 'Utilidades Acumuladas', confidence: 95 },
    '2.03.03.02': { code: '3.1.3.002', name: 'Utilidad del Ejercicio', confidence: 95 },
    '2.03.04.01': { code: '3.1.4.001', name: 'Pérdidas Acumuladas', confidence: 90 },
    '2.03.05.01': { code: '3.1.5.001', name: 'Aportes para Futuras Capitalizaciones', confidence: 85 },
    '3.01.01.99': { code: '3.1.1.999', name: 'Capital Inicial', confidence: 90 },
    
    // INGRESOS - MAPEO CORRECTO Y AMPLIADO:
    // Gastrologica 3.xx (INGRESOS) → Nuestro 4.xx (INGRESOS)
    '3.01.01.01': { code: '4.1.1.001', name: 'Ventas Afectas', confidence: 100 },
    '3.01.01.02': { code: '4.1.1.002', name: 'Ventas Exentas', confidence: 100 },
    '3.01.01.03': { code: '4.1.1.003', name: 'Ventas al Extranjero', confidence: 95 },
    '3.01.02.01': { code: '4.1.2.001', name: 'Ingresos por Servicios', confidence: 95 },
    '3.01.02.02': { code: '4.1.2.002', name: 'Servicios Profesionales', confidence: 90 },
    '3.01.03.01': { code: '4.1.3.001', name: 'Arriendos Percibidos', confidence: 90 },
    '3.01.04.01': { code: '4.1.4.001', name: 'Intereses Percibidos', confidence: 90 },
    '3.01.05.01': { code: '4.1.5.001', name: 'Otros Ingresos', confidence: 85 },
    '3.01.06.01': { code: '4.1.6.001', name: 'Descuentos Obtenidos', confidence: 85 },
    '3.01.07.01': { code: '4.1.7.001', name: 'Diferencias de Cambio Positivas', confidence: 80 },
    '3.01.08.01': { code: '4.1.8.001', name: 'Recuperaciones', confidence: 80 },
    '3.01.09.01': { code: '4.1.9.001', name: 'Bonificaciones Recibidas', confidence: 80 },
    '3.02.01.01': { code: '4.2.1.001', name: 'Ingresos Extraordinarios', confidence: 75 },
    '3.02.02.01': { code: '4.2.2.001', name: 'Utilidad en Venta de Activos', confidence: 75 },
    '3.02.03.02': { code: '4.1.9.002', name: 'DL 889 - Decretos Beneficio Tributario', confidence: 98 },
    
    // GASTOS - MAPEO CORRECTO Y COMPLETO:
    // Gastrologica 4.xx (GASTOS) → Nuestro 5.xx o 6.xx (GASTOS)
    '4.01.03.01': { code: '5.1.1.005', name: 'Honorarios Profesionales', confidence: 100 },
    '4.01.03.02': { code: '5.1.1.006', name: 'Gastos Notariales', confidence: 98 },
    '4.01.03.04': { code: '5.1.1.003', name: 'Artículos de Oficina', confidence: 98 },
    '4.01.03.05': { code: '5.1.1.007', name: 'Artículos de Aseo', confidence: 98 },
    '4.01.03.07': { code: '5.1.1.008', name: 'Aseo de Oficina', confidence: 98 },
    '4.01.03.09': { code: '5.1.1.009', name: 'Publicidad y Marketing', confidence: 98 },
    '4.01.03.12': { code: '5.1.3.002', name: 'Insumos', confidence: 98 },
    '4.01.03.14': { code: '5.1.4.004', name: 'Mantención y Reparaciones', confidence: 100 },
    '4.01.03.15': { code: '5.1.1.010', name: 'Patentes Comerciales', confidence: 98 },
    '4.01.03.16': { code: '5.1.4.005', name: 'Fletes', confidence: 98 },
    '4.01.03.17': { code: '5.1.4.002', name: 'Consumos Básicos', confidence: 100 },
    '4.01.03.18': { code: '5.1.4.003', name: 'Combustibles', confidence: 100 },
    '4.01.03.19': { code: '5.1.1.011', name: 'Asesorías Contables', confidence: 98 },
    '4.01.03.21': { code: '5.1.4.006', name: 'Remodelación', confidence: 95 },
    '4.01.03.22': { code: '5.1.1.012', name: 'Gastos Generales', confidence: 95 },
    '4.01.03.26': { code: '5.1.2.003', name: 'Uniforme del Personal', confidence: 95 },
    '4.01.03.27': { code: '5.1.1.013', name: 'Estampados', confidence: 90 },
    '4.01.03.28': { code: '5.1.1.014', name: 'Programas Computacionales', confidence: 98 },
    '4.02.04.01': { code: '5.1.2.001', name: 'Sueldos', confidence: 100 },
    '4.02.04.02': { code: '5.1.2.002', name: 'Leyes Sociales', confidence: 100 },
    '4.02.07.01': { code: '5.1.6.001', name: 'Gastos Bancarios', confidence: 100 },
    '4.02.07.06': { code: '5.1.6.002', name: 'Comisiones Portal de Pago', confidence: 98 },
    '4.02.10.03': { code: '5.1.6.003', name: 'Intereses y Multas', confidence: 95 },
    '4.02.11.01': { code: '5.1.7.001', name: 'Corrección Monetaria', confidence: 90 },
    // Mapeos genéricos para otros gastos comunes
    '4.01.01.01': { code: '5.1.3.001', name: 'Costo de Ventas', confidence: 95 },
    '4.01.02.01': { code: '5.1.1.001', name: 'Gastos de Administración', confidence: 90 },
    '4.01.04.01': { code: '5.1.1.002', name: 'Gastos de Ventas', confidence: 90 },
    '4.02.01.01': { code: '5.1.4.001', name: 'Arriendos', confidence: 95 },
    '4.02.02.01': { code: '5.1.4.002', name: 'Servicios Básicos', confidence: 95 },
    '4.02.05.01': { code: '5.1.4.004', name: 'Mantención y Reparaciones', confidence: 90 },
    '4.03.01.01': { code: '5.1.5.001', name: 'Depreciación', confidence: 95 },
    
    // GASTOS - REMUNERACIONES (Nuestro sistema 6.2.x)
    '6.2.1.001': { code: '6.2.1.001', name: 'Sueldo Base', confidence: 100 },
    '6.2.1.002': { code: '6.2.1.002', name: 'Horas Extras', confidence: 100 },
    '6.2.1.003': { code: '6.2.1.003', name: 'Colación', confidence: 100 },
    '6.2.1.004': { code: '6.2.1.004', name: 'Bonificaciones', confidence: 100 },
    '6.2.1.005': { code: '6.2.1.005', name: 'Gratificación Legal Art. 50', confidence: 100 },
    '6.2.1.006': { code: '6.2.1.006', name: 'Movilización', confidence: 100 },
    
    // GASTOS - CARGAS SOCIALES (Nuestro sistema 6.2.2.x)
    '6.2.2.001': { code: '6.2.2.001', name: 'AFP Empleador', confidence: 100 },
    '6.2.2.002': { code: '6.2.2.002', name: 'Cesantía Empleador', confidence: 100 },
    '6.2.2.003': { code: '6.2.2.003', name: 'SIS Empleador', confidence: 100 },
    '6.2.2.005': { code: '6.2.2.005', name: '1% Social Esperanza Vida', confidence: 100 },
    '6.2.2.006': { code: '6.2.2.006', name: 'Mutual de Seguridad', confidence: 100 },
    
    // GASTOS - OPERACIONALES (Nuestro sistema 6.3.x) - AMPLIADO
    '6.3.1.001': { code: '6.3.1.001', name: 'Gastos de Mercadería', confidence: 100 },
    '6.3.1.002': { code: '6.3.1.002', name: 'Gastos de oficina', confidence: 100 },
    '6.3.1.003': { code: '6.3.1.003', name: 'Gastos de Operación', confidence: 100 },
    '6.3.1.004': { code: '6.3.1.004', name: 'Gastos de combustible', confidence: 100 },
    '6.3.1.005': { code: '6.3.1.005', name: 'Gastos de Arriendo', confidence: 100 },
    '6.3.1.006': { code: '6.3.1.006', name: 'Servicios Contables', confidence: 100 },
    '6.3.1.007': { code: '6.3.1.007', name: 'Servicios Básicos', confidence: 100 },
    '6.3.1.008': { code: '6.3.1.008', name: 'Gastos Financieros', confidence: 100 },
    '6.3.1.009': { code: '6.3.1.009', name: 'Mantención y Reparación', confidence: 95 },
    '6.3.1.010': { code: '6.3.1.010', name: 'Publicidad y Marketing', confidence: 95 },
    '6.3.1.011': { code: '6.3.1.011', name: 'Gastos de Viaje', confidence: 90 },
    '6.3.1.012': { code: '6.3.1.012', name: 'Capacitación', confidence: 90 },
    '6.3.1.013': { code: '6.3.1.013', name: 'Seguros', confidence: 95 },
    '6.3.1.014': { code: '6.3.1.014', name: 'Patentes y Permisos', confidence: 95 },
    '6.3.1.015': { code: '6.3.1.015', name: 'Gastos Legales', confidence: 90 },
    '6.3.1.016': { code: '6.3.1.016', name: 'Depreciación', confidence: 95 },
    '6.3.1.017': { code: '6.3.1.017', name: 'Gastos de Representación', confidence: 85 },
    '6.3.1.018': { code: '6.3.1.018', name: 'Aseo y Ornato', confidence: 90 },
    '6.3.1.019': { code: '6.3.1.019', name: 'Gastos de Importación', confidence: 90 },
    '6.3.1.020': { code: '6.3.1.020', name: 'Fletes y Despachos', confidence: 90 },
    '6.3.1.021': { code: '6.3.1.021', name: 'Comisiones Bancarias', confidence: 95 },
    '6.3.1.022': { code: '6.3.1.022', name: 'Intereses y Multas', confidence: 90 },
    '6.3.1.023': { code: '6.3.1.023', name: 'Diferencias de Cambio', confidence: 85 },
    '6.3.1.024': { code: '6.3.1.024', name: 'Gastos No Deducibles', confidence: 85 },
    
    // Más gastos típicos de Gastrologica con códigos 4.xx
    '4.01.01.01': { code: '6.3.2.001', name: 'Costo de Ventas', confidence: 95 },
    '4.01.02.01': { code: '6.3.2.002', name: 'Mermas y Deterioros', confidence: 90 },
    '4.01.04.01': { code: '6.3.1.025', name: 'Gastos de Administración', confidence: 90 },
    '4.01.05.01': { code: '6.3.1.026', name: 'Gastos Generales', confidence: 85 },
    '4.02.01.01': { code: '6.2.1.007', name: 'Aguinaldos', confidence: 90 },
    '4.02.02.01': { code: '6.2.1.008', name: 'Asignación Familiar', confidence: 90 },
    '4.02.03.01': { code: '6.2.1.009', name: 'Indemnizaciones', confidence: 90 },
    '4.02.05.01': { code: '6.2.1.010', name: 'Viáticos', confidence: 90 }
  };

  if (exactMappings[extCode]) {
    return {
      ...exactMappings[extCode],
      reason: 'Mapeo exacto por código'
    };
  }

  // Mapeo por patrones de código - CORREGIDO COMPLETAMENTE
  const firstDigit = extCode.charAt(0);
  const patterns: { [key: string]: any } = {
    '1': { 
      pattern: /^1\./,
      defaultCode: '1.1.1.999',
      defaultName: 'Activos - Clasificar',
      confidence: 75,
      reason: 'Patrón de activos'
    },
    '2': {
      pattern: /^2\./,
      defaultCode: '2.1.1.999',
      defaultName: 'Pasivos - Clasificar',
      confidence: 75,
      reason: 'Patrón de pasivos'
    },
    '3': {
      // Gastrologica: 3.xx = INGRESOS → Nuestro: 4.xx = INGRESOS
      pattern: /^3\./,
      defaultCode: '4.1.1.999',
      defaultName: 'Ingresos - Clasificar',
      confidence: 75,
      reason: 'Patrón de ingresos (Gastrologica 3.xx)'
    },
    '4': {
      // Gastrologica: 4.xx = GASTOS → Nuestro: 5.xx/6.xx = GASTOS
      pattern: /^4\./,
      defaultCode: '5.1.1.999',
      defaultName: 'Gastos - Clasificar',
      confidence: 75,
      reason: 'Patrón de gastos (Gastrologica 4.xx)'
    },
    '5': {
      // Nuestro sistema: 5.xx = GASTOS
      pattern: /^5\./,
      defaultCode: '5.1.1.999',
      defaultName: 'Gastos - Clasificar',
      confidence: 75,
      reason: 'Patrón de gastos (sistema interno 5.xx)'
    },
    '6': {
      // Nuestro sistema: 6.xx = GASTOS
      pattern: /^6\./,
      defaultCode: '6.1.1.999',
      defaultName: 'Gastos - Clasificar',
      confidence: 75,
      reason: 'Patrón de gastos (sistema interno 6.xx)'
    }
  };

  if (patterns[firstDigit]?.pattern.test(extCode)) {
    return {
      code: patterns[firstDigit].defaultCode,
      name: patterns[firstDigit].defaultName,
      confidence: patterns[firstDigit].confidence,
      reason: patterns[firstDigit].reason
    };
  }

  return {
    code: '1.1.1.999',
    name: 'Sin Mapeo por Código',
    confidence: 40,
    reason: 'Código no reconocido'
  };
}

// Mapeo por descripción de cuenta
function mapByDescription(extDesc: string, internalAccounts: any[]) {
  const descMappings: { [key: string]: { code: string, name: string, confidence: number } } = {
    // ACTIVOS - AMPLIADO
    'caja': { code: '1.1.1.001', name: 'Caja', confidence: 90 },
    'caja chica': { code: '1.1.1.002', name: 'Caja Chica', confidence: 95 },
    'banco': { code: '1.1.2.001', name: 'Banco', confidence: 90 },
    'bancos': { code: '1.1.2.001', name: 'Banco', confidence: 90 },
    'banco estado': { code: '1.1.2.002', name: 'Banco Estado', confidence: 95 },
    'banco chile': { code: '1.1.2.003', name: 'Banco Chile', confidence: 95 },
    'santander': { code: '1.1.2.004', name: 'Banco Santander', confidence: 95 },
    'fondos mutuos': { code: '1.1.2.005', name: 'Fondos Mutuos', confidence: 90 },
    'clientes': { code: '1.1.3.001', name: 'Clientes', confidence: 88 },
    'deudores': { code: '1.1.3.001', name: 'Clientes', confidence: 85 },
    'documentos por cobrar': { code: '1.1.3.002', name: 'Documentos por Cobrar', confidence: 90 },
    'anticipos': { code: '1.1.3.006', name: 'Anticipos a Proveedores', confidence: 85 },
    'existencias': { code: '1.1.5.001', name: 'Inventarios', confidence: 92 },
    'inventarios': { code: '1.1.5.001', name: 'Inventarios', confidence: 92 },
    'mercaderias': { code: '1.1.5.001', name: 'Inventarios', confidence: 90 },
    'mercaderías': { code: '1.1.5.001', name: 'Inventarios', confidence: 90 },
    'iva credito': { code: '1.1.4.001', name: 'IVA Crédito Fiscal', confidence: 95 },
    'credito fiscal': { code: '1.1.4.001', name: 'IVA Crédito Fiscal', confidence: 95 },
    'remanente': { code: '1.1.4.003', name: 'Remanente Crédito Fiscal', confidence: 95 },
    'ppm': { code: '1.1.4.002', name: 'PPM', confidence: 98 },
    'sence': { code: '1.1.4.004', name: 'Crédito SENCE', confidence: 90 },
    'gastos anticipados': { code: '1.1.6.001', name: 'Gastos Pagados por Anticipado', confidence: 90 },
    'seguros': { code: '1.1.6.002', name: 'Seguros Vigentes', confidence: 90 },
    'terrenos': { code: '1.2.2.001', name: 'Terrenos', confidence: 95 },
    'edificios': { code: '1.2.2.002', name: 'Edificios', confidence: 95 },
    'vehiculos': { code: '1.2.1.003', name: 'Vehículos', confidence: 95 },
    'vehículos': { code: '1.2.1.003', name: 'Vehículos', confidence: 95 },
    'muebles': { code: '1.2.1.001', name: 'Muebles y Útiles', confidence: 85 },
    'equipos': { code: '1.2.1.002', name: 'Equipos', confidence: 80 },
    'computacionales': { code: '1.2.1.002', name: 'Equipos Computacionales', confidence: 90 },
    'maquinarias': { code: '1.2.1.004', name: 'Maquinarias y Equipos', confidence: 90 },
    'depreciacion': { code: '1.2.3.001', name: 'Depreciación Acumulada', confidence: 95 },
    'depreciación': { code: '1.2.3.001', name: 'Depreciación Acumulada', confidence: 95 },
    
    // PASIVOS
    'proveedores': { code: '2.1.1.001', name: 'Proveedores Nacionales', confidence: 90 },
    'afp': { code: '2.1.2.001', name: 'AFP por Pagar', confidence: 95 },
    'salud': { code: '2.1.2.002', name: 'Salud por Pagar', confidence: 95 },
    'cesantia': { code: '2.1.2.003', name: 'Cesantía por Pagar', confidence: 95 },
    'cesantía': { code: '2.1.2.003', name: 'Cesantía por Pagar', confidence: 95 },
    'sis': { code: '2.1.2.004', name: 'SIS por Pagar', confidence: 95 },
    'esperanza': { code: '2.1.2.005', name: 'Esperanza Vida por Pagar', confidence: 95 },
    'mutual': { code: '2.1.2.006', name: 'Mutual por Pagar', confidence: 95 },
    'honorarios': { code: '2.1.2.001', name: 'Honorarios por Pagar', confidence: 85 },
    'sueldos': { code: '2.1.3.001', name: 'Sueldos por Pagar', confidence: 90 },
    'imposiciones': { code: '2.1.4.001', name: 'Imposiciones por Pagar', confidence: 90 },
    'iva debito': { code: '2.1.4.002', name: 'IVA Débito Fiscal', confidence: 95 },
    'debito fiscal': { code: '2.1.4.002', name: 'IVA Débito Fiscal', confidence: 95 },
    'impuesto': { code: '2.1.3.003', name: 'Impuesto por Pagar', confidence: 85 },
    '2da categoria': { code: '2.1.3.001', name: 'Impuesto 2da Categoría por Pagar', confidence: 95 },
    'segunda categoria': { code: '2.1.3.001', name: 'Impuesto 2da Categoría por Pagar', confidence: 95 },
    
    // PATRIMONIO
    'capital': { code: '3.1.1.001', name: 'Capital', confidence: 95 },
    
    // INGRESOS
    'ventas': { code: '4.1.1.001', name: 'Ingresos por Ventas', confidence: 88 },
    'ingresos': { code: '4.1.1.001', name: 'Ingresos por Ventas', confidence: 85 },
    'ventas del giro': { code: '4.1.1.001', name: 'Ventas del giro', confidence: 95 },
    'ventas afectas': { code: '4.1.1.001', name: 'Ventas Afectas', confidence: 98 },
    'ventas exentas': { code: '4.1.1.002', name: 'Ventas Exentas', confidence: 98 },
    
    // GASTOS - REMUNERACIONES (Nuestro sistema usa 5.xx y 6.xx)
    'sueldo base': { code: '6.2.1.001', name: 'Sueldo Base', confidence: 95 },
    'horas extras': { code: '6.2.1.002', name: 'Horas Extras', confidence: 95 },
    'colacion': { code: '6.2.1.003', name: 'Colación', confidence: 95 },
    'colación': { code: '6.2.1.003', name: 'Colación', confidence: 95 },
    'bonificacion': { code: '6.2.1.004', name: 'Bonificaciones', confidence: 95 },
    'gratificacion': { code: '6.2.1.005', name: 'Gratificación Legal Art. 50', confidence: 95 },
    'gratificación': { code: '6.2.1.005', name: 'Gratificación Legal Art. 50', confidence: 95 },
    'movilizacion': { code: '6.2.1.006', name: 'Movilización', confidence: 95 },
    'movilización': { code: '6.2.1.006', name: 'Movilización', confidence: 95 },
    
    // GASTOS - OPERACIONALES  
    'mercaderia': { code: '6.3.1.001', name: 'Gastos de Mercadería', confidence: 90 },
    'mercadería': { code: '6.3.1.001', name: 'Gastos de Mercadería', confidence: 90 },
    'oficina': { code: '6.3.1.002', name: 'Gastos de oficina', confidence: 90 },
    'operacion': { code: '6.3.1.003', name: 'Gastos de Operación', confidence: 90 },
    'operación': { code: '6.3.1.003', name: 'Gastos de Operación', confidence: 90 },
    'combustible': { code: '6.3.1.004', name: 'Gastos de combustible', confidence: 95 },
    'arriendo': { code: '6.3.1.005', name: 'Gastos de Arriendo', confidence: 95 },
    'contables': { code: '6.3.1.006', name: 'Servicios Contables', confidence: 90 },
    'financieros': { code: '6.3.1.008', name: 'Gastos Financieros', confidence: 90 }
  };

  // Buscar coincidencias exactas
  for (const [keyword, mapping] of Object.entries(descMappings)) {
    if (extDesc.includes(keyword)) {
      return {
        ...mapping,
        reason: `Mapeo por descripción: "${keyword}"`
      };
    }
  }

  return {
    code: '1.1.1.999',
    name: 'Sin Mapeo por Descripción',
    confidence: 45,
    reason: 'Descripción no reconocida'
  };
}

// Mapeo por tipo de cuenta según su naturaleza
function mapByType(externalAccount: any, internalAccounts: any[]) {
  const { activo, pasivo, perdida, ganancia } = externalAccount;

  if (activo > 0) {
    return {
      code: '1.1.1.999',
      name: 'Activos - Clasificar',
      confidence: 70,
      reason: 'Cuenta con saldo en activos'
    };
  }

  if (pasivo > 0) {
    return {
      code: '2.1.1.999',
      name: 'Pasivos - Clasificar',
      confidence: 70,
      reason: 'Cuenta con saldo en pasivos'
    };
  }

  if (perdida > 0) {
    return {
      code: '5.1.1.999',
      name: 'Gastos - Clasificar',
      confidence: 70,
      reason: 'Cuenta con saldo en pérdidas'
    };
  }

  if (ganancia > 0) {
    return {
      code: '4.1.1.999',
      name: 'Ingresos - Clasificar',
      confidence: 70,
      reason: 'Cuenta con saldo en ganancias'
    };
  }

  return {
    code: '1.1.1.999',
    name: 'Cuenta sin Clasificar',
    confidence: 50,
    reason: 'Sin saldos significativos para clasificar'
  };
}

// Calcular el monto para el mapeo (saldo que va al asiento de apertura)
function calculateMappingAmount(externalAccount: any): number {
  const { activo, pasivo, perdida, ganancia } = externalAccount;

  // En un asiento de apertura van:
  // - Activos y Pasivos (balance)
  // - Ganancias y Pérdidas del período anterior (resultado)

  if (activo > 0) return activo;
  if (pasivo > 0) return pasivo;
  if (perdida > 0) return perdida;
  if (ganancia > 0) return ganancia;

  return 0;
}

// Determinar si va al debe o haber en el asiento de apertura
function determineSide(externalAccount: any): 'debit' | 'credit' {
  const { activo, pasivo, perdida, ganancia } = externalAccount;

  // En asiento de apertura:
  // - Activos van al DEBE (aumentan con débito)
  // - Pérdidas van al DEBE (saldo deudor)
  // - Pasivos van al HABER (aumentan con crédito) 
  // - Patrimonio va al HABER (aumentan con crédito)
  // - Ganancias van al HABER (saldo acreedor)

  if (activo > 0) return 'debit';
  if (perdida > 0) return 'debit';
  if (pasivo > 0) return 'credit';
  if (ganancia > 0) return 'credit';

  return 'debit'; // Por defecto
}