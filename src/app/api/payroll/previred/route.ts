import { NextRequest, NextResponse } from 'next/server';

// Estructura del formato Previred basada en el archivo TXT analizado
interface PreviredRecord {
  rut: string;
  dv: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  sexo: 'M' | 'F';
  nacionalidad: number; // 0=Chileno, 1=Extranjero
  tipoTrabajador: number; // 1=Activo, 0=Inactivo
  mesInicio: string; // MMAAAA
  mesTermino: string; // MMAAAA
  regimen: 'AFP' | 'SIP';
  tipoMovimiento: number;
  diasTrabajados: number;
  tipoLinea: number;
  ausencias: number;
  fechaInicioAusencia?: string;
  fechaFinAusencia?: string;
  codigoMovimientoPers?: string;
  centroCosto: string;
  // ... y muchos más campos según el formato
}

// Datos demo para simulación (basados en el archivo real)
const demoPreviredData = [
  {
    rut: '12345678',
    dv: '9',
    apellidoPaterno: 'González',
    apellidoMaterno: 'Silva',
    nombres: 'Juan Carlos',
    sexo: 'M' as const,
    nacionalidad: 0,
    tipoTrabajador: 1,
    mesInicio: '082025',
    mesTermino: '082025',
    regimen: 'AFP' as const,
    tipoMovimiento: 0,
    diasTrabajados: 30,
    tipoLinea: 0,
    ausencias: 0,
    centroCosto: 'D',
    // Valores monetarios de ejemplo
    remuneracionImponible: 1500000,
    subsidioPagado: 0,
    gratificacion: 150000,
    // Descuentos
    previsionAfp: 180000,
    saludIsapre: 120000,
    // Otros campos requeridos
    apv: 0,
    cesantia: 0,
    codigoAfp: 33,
    codigoIsapre: 0
  },
  {
    rut: '87654321',
    dv: '0',
    apellidoPaterno: 'Martínez',
    apellidoMaterno: 'López',
    nombres: 'María Elena',
    sexo: 'F' as const,
    nacionalidad: 0,
    tipoTrabajador: 1,
    mesInicio: '082025',
    mesTermino: '082025',
    regimen: 'AFP' as const,
    tipoMovimiento: 0,
    diasTrabajados: 30,
    tipoLinea: 0,
    ausencias: 0,
    centroCosto: 'D',
    remuneracionImponible: 1200000,
    subsidioPagado: 0,
    gratificacion: 120000,
    previsionAfp: 144000,
    saludIsapre: 96000,
    apv: 0,
    cesantia: 0,
    codigoAfp: 34,
    codigoIsapre: 0
  },
  {
    rut: '11222333',
    dv: '4',
    apellidoPaterno: 'Rodriguez',
    apellidoMaterno: 'Pérez',
    nombres: 'Carlos Alberto',
    sexo: 'M' as const,
    nacionalidad: 0,
    tipoTrabajador: 1,
    mesInicio: '082025',
    mesTermino: '082025',
    regimen: 'AFP' as const,
    tipoMovimiento: 0,
    diasTrabajados: 30,
    tipoLinea: 0,
    ausencias: 0,
    centroCosto: 'D',
    remuneracionImponible: 1800000,
    subsidioPagado: 0,
    gratificacion: 180000,
    previsionAfp: 216000,
    saludIsapre: 144000,
    apv: 0,
    cesantia: 0,
    codigoAfp: 29,
    codigoIsapre: 0
  }
];

// GET - Generar archivo TXT para Previred
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '2025-08';
    const companyId = searchParams.get('company_id');
    
    console.log('🔍 Generando archivo Previred para período:', period);

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Generar contenido TXT en formato Previred
    const txtContent = generatePreviredTXT(demoPreviredData, period);
    
    // Crear nombre del archivo con período
    const [year, month] = period.split('-');
    const fileName = `previred_${month}${year}.txt`;
    
    return new NextResponse(txtContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error generando archivo Previred:', error);
    return NextResponse.json(
      { error: 'Error generando archivo Previred' },
      { status: 500 }
    );
  }
}

// POST - Procesar liquidaciones y generar Previred
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, period, liquidaciones } = body;
    
    console.log('🔍 Procesando liquidaciones para Previred:', { company_id, period, count: liquidaciones?.length || 0 });

    if (!company_id || !period) {
      return NextResponse.json(
        { error: 'company_id y period son requeridos' },
        { status: 400 }
      );
    }

    // TODO: Aquí procesaríamos las liquidaciones reales
    // Por ahora usamos datos demo
    const previredData = liquidaciones ? 
      transformLiquidacionesToPrevired(liquidaciones, period) : 
      demoPreviredData;
    
    const txtContent = generatePreviredTXT(previredData, period);
    
    return NextResponse.json({
      success: true,
      message: 'Archivo Previred generado exitosamente',
      recordCount: previredData.length,
      period: period
    });
  } catch (error) {
    console.error('Error procesando liquidaciones para Previred:', error);
    return NextResponse.json(
      { error: 'Error procesando liquidaciones' },
      { status: 500 }
    );
  }
}

// Función para generar el contenido TXT en formato Previred
function generatePreviredTXT(data: any[], period: string): string {
  const lines: string[] = [];
  
  data.forEach((record, index) => {
    // Formato basado en el archivo original analizado
    // Cada línea tiene aproximadamente 300+ caracteres con campos separados por punto y coma
    const line = [
      record.rut,                        // RUT sin puntos
      record.dv,                         // Dígito verificador
      record.apellidoPaterno,            // Apellido paterno
      record.apellidoMaterno || '',      // Apellido materno
      record.nombres,                    // Nombres
      record.sexo,                       // M o F
      record.nacionalidad || 0,          // 0=Chileno, 1=Extranjero
      record.tipoTrabajador || 1,        // 1=Activo
      record.mesInicio || period.replace('-', ''), // MMAAAA
      record.mesInicio || period.replace('-', ''), // MMAAAA
      record.regimen || 'AFP',           // AFP o SIP
      record.tipoMovimiento || 0,        // Tipo de movimiento
      record.diasTrabajados || 30,       // Días trabajados
      record.tipoLinea || 0,             // Tipo de línea
      record.ausencias || 0,             // Ausencias
      record.fechaInicioAusencia || '',  // Fecha inicio ausencia
      record.fechaFinAusencia || '',     // Fecha fin ausencia
      record.centroCosto || 'D',         // Centro de costo
      0, // Campo 18
      0, // Campo 19
      0, // Campo 20
      0, // Campo 21
      0, // Campo 22
      0, // Campo 23
      'N', // Campo 24
      record.codigoAfp || 33,            // Código AFP
      record.remuneracionImponible || 0, // Remuneración imponible
      Math.round((record.remuneracionImponible || 0) * 0.12), // Descuento AFP (12%)
      Math.round((record.remuneracionImponible || 0) * 0.037), // Otras deducciones
      record.gratificacion || 0,         // Gratificación
      0, 0, 0, 0, // Campos vacíos
      '', '', '', '', // Campos texto vacíos
      0, 0, // Más campos numéricos
      '', '', '', '', // Más campos texto
      0, 0, // Campos numéricos
      '', '', '', '', // Campos texto
      0, 0, 0, // Campos numéricos
      '', '', '', '', '', // Campos texto
      0, // Campo numérico
      '', '', // Campos texto
      0, 0, 0, 0, 0, 0, // Campos numéricos
      record.remuneracionImponible || 0, // Total imponible
      0, 0, 0, 0, 0, // Campos adicionales
      Math.round((record.remuneracionImponible || 0) * 0.018), // Otros descuentos
      0, 0, 0, 0, // Más campos
      7, // Campo fijo
      '', // Campo texto
      0, 1, 0, 0, 0, 0, 1, // Campos de control
      record.remuneracionImponible || 0, // Repetir imponible
      0, 0, 0, 0, 0, // Campos adicionales
      Math.round((record.remuneracionImponible || 0) * 0.07), // Salud 7%
      0, 0, 0, 0, 0, 3, // Campos finales
      record.remuneracionImponible || 0, // Remuneración final
      Math.round((record.remuneracionImponible || 0) * 0.195), // Total descuentos aproximado
      0, // Campo final
      record.remuneracionImponible || 0, // Base final
      Math.round(Math.random() * 10000), // Valor aleatorio para variación
      Math.round((record.remuneracionImponible || 0) * 0.04), // Último descuento
      0, // Campo final
      '', // Campo texto final
      0 // Campo final
    ].join(';');
    
    lines.push(line);
  });
  
  return lines.join('\n') + '\n';
}

// Función para transformar liquidaciones a formato Previred
function transformLiquidacionesToPrevired(liquidaciones: any[], period: string): any[] {
  return liquidaciones.map((liquidacion: any) => {
    const employee = liquidacion.employee || {};
    const contract = employee.employment_contracts?.[0] || {};
    
    return {
      rut: employee.rut?.replace(/\D/g, '') || '',
      dv: employee.rut?.slice(-1) || '',
      apellidoPaterno: employee.last_name || '',
      apellidoMaterno: employee.middle_name || '',
      nombres: employee.first_name || '',
      sexo: employee.gender === 'female' ? 'F' : 'M',
      nacionalidad: 0,
      tipoTrabajador: 1,
      mesInicio: period.replace('-', ''),
      mesTermino: period.replace('-', ''),
      regimen: 'AFP',
      tipoMovimiento: 0,
      diasTrabajados: liquidacion.worked_days || 30,
      tipoLinea: 0,
      ausencias: 0,
      centroCosto: 'D',
      remuneracionImponible: liquidacion.gross_income || contract.base_salary || 0,
      subsidioPagado: 0,
      gratificacion: Math.round((liquidacion.gross_income || 0) * 0.1),
      previsionAfp: Math.round((liquidacion.gross_income || 0) * 0.12),
      saludIsapre: Math.round((liquidacion.gross_income || 0) * 0.07),
      apv: 0,
      cesantia: Math.round((liquidacion.gross_income || 0) * 0.006),
      codigoAfp: 33, // Código por defecto
      codigoIsapre: 0
    };
  });
}

// Función auxiliar para formatear período
function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}