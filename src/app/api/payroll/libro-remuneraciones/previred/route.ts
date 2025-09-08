import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generar archivo PREVIRED TXT con formato 105 campos por separador
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const period = searchParams.get('period');
    
    if (!companyId || !period) {
      return NextResponse.json(
        { error: 'company_id y period son requeridos' },
        { status: 400 }
      );
    }

    console.log('🔍 Generando archivo PREVIRED para:', { companyId, period });

    // Obtener datos del libro de remuneraciones
    const { data: book, error: bookError } = await supabase
      .from('payroll_books')
      .select(`
        *,
        payroll_book_details (*)
      `)
      .eq('company_id', companyId)
      .eq('period', period)
      .single();

    if (bookError || !book) {
      return NextResponse.json(
        { error: 'No se encontró libro de remuneraciones para el período especificado' },
        { status: 404 }
      );
    }

    // Obtener datos adicionales de empleados
    const employeeIds = book.payroll_book_details.map((detail: any) => detail.employee_id);
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select(`
        *,
        payroll_config (*),
        employment_contracts (*)
      `)
      .in('id', employeeIds)
      .eq('company_id', companyId);

    if (employeesError) {
      console.error('Error obteniendo empleados:', employeesError);
    }

    // Generar contenido PREVIRED
    const previredContent = generatePreviredTXT(book, employees || []);
    
    const fileName = `previred_${book.company_rut.replace(/\./g, '').replace('-', '')}_${period.replace('-', '')}.txt`;
    
    return new NextResponse(previredContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('Error generando archivo PREVIRED:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para generar el contenido del archivo PREVIRED TXT
function generatePreviredTXT(book: any, employees: any[]): string {
  const lines: string[] = [];
  const separator = ';'; // Separador estándar PREVIRED (punto y coma)
  
  // Crear mapa de empleados para acceso rápido
  const employeeMap = new Map();
  employees.forEach(emp => {
    employeeMap.set(emp.id, emp);
  });

  book.payroll_book_details.forEach((detail: any) => {
    const employee = employeeMap.get(detail.employee_id) || {};
    const payrollConfig = employee.payroll_config || {};
    const contract = employee.employment_contracts?.[0] || {};
    
    // Generar línea PREVIRED con 105 campos
    const fields = generatePreviredFields(detail, employee, payrollConfig, contract, book);
    lines.push(fields.join(separator));
  });

  return lines.join('\n');
}

// Función para generar los 105 campos PREVIRED según especificación
function generatePreviredFields(detail: any, employee: any, payrollConfig: any, contract: any, book: any): string[] {
  const fields: string[] = [];
  
  // 1. DATOS DEL TRABAJADOR (Columnas A-Y, campos 1-25)
  fields.push(employee.rut || detail.employee_rut || ''); // A1 - RUT
  fields.push(''); // A2 - DV (se calcula automáticamente)
  fields.push(detail.apellido_paterno || ''); // A3 - Apellido Paterno
  fields.push(detail.apellido_materno || ''); // A4 - Apellido Materno
  fields.push(detail.nombres || ''); // A5 - Nombres
  fields.push('M'); // A6 - Sexo (M/F) - Por defecto M
  fields.push('CL'); // A7 - Nacionalidad - Chile
  fields.push(''); // A8 - Fecha Nacimiento
  fields.push(''); // A9 - Fecha Inicio Contrato
  fields.push('I'); // A10 - Tipo Contrato (I=Indefinido, F=Fijo, H=Honorarios)
  fields.push('SIS'); // A11 - Régimen Previsional (SIS=Sistema actual, INP=Antiguo)
  fields.push('152'); // A12 - Código País (152=Chile)
  fields.push(''); // A13 - Región
  fields.push(''); // A14 - Comuna
  fields.push(''); // A15 - Dirección
  fields.push(''); // A16 - Teléfono
  fields.push(''); // A17 - Email
  fields.push((detail.dias_trabajados || 30).toString()); // A18 - Días Trabajados
  fields.push('A'); // A19 - Tipo Trabajador (A=Activo, P=Pensionado, N=Normal)
  fields.push(payrollConfig.afp_code || '032'); // A20 - Código AFP (032=Habitat por defecto)
  fields.push(''); // A21 - Fecha Afiliación AFP
  fields.push(payrollConfig.health_institution_code || '01'); // A22 - Código Salud (01=FONASA)
  fields.push(''); // A23 - Fecha Afiliación Salud
  fields.push('01'); // A24 - Código Mutual (01=ISL por defecto)
  fields.push('01'); // A25 - Código Caja Compensación (01=Los Andes por defecto)

  // 2. DATOS AFP (Columnas Z-AM, campos 26-39)
  fields.push((detail.base_imp_prevision || 0).toString()); // Z26 - Renta Imponible AFP
  fields.push(payrollConfig.afp_code || '032'); // AA27 - Código AFP (032=Habitat)
  fields.push((detail.prevision_afp || 0).toString()); // AB28 - Cotización Obligatoria AFP
  fields.push(''); // AC29 - SIS (Seguro de Invalidez y Sobrevivencia)
  fields.push(''); // AD30 - Comisión AFP
  fields.push(''); // AE31 - Aporte Adicional AFP
  fields.push(''); // AF32 - Depósito Convenido
  fields.push(''); // AG33 - Ahorro Voluntario AFP
  fields.push(''); // AH34 - APV A
  fields.push(''); // AI35 - APV B
  fields.push(''); // AJ36 - Cuenta 2 AFP
  fields.push(''); // AK37 - Forma de Pago
  fields.push(''); // AL38 - Cuotas Moratorias AFP
  fields.push(''); // AM39 - Número de Períodos

  // 3. AHORRO PREVISIONAL VOLUNTARIO INDIVIDUAL (Columnas AN-AR, campos 40-44)
  fields.push((detail.apv || 0).toString()); // AN40 - APV Individual
  fields.push(''); // AO41 - Forma de Pago APV
  fields.push(''); // AP42 - Código Institución APV
  fields.push(''); // AQ43 - Ahorro Volunt. Joven
  fields.push(''); // AR44 - Depósito Ahorro Joven

  // 4. AHORRO PREVISIONAL VOLUNTARIO COLECTIVO (Columnas AS-AW, campos 45-49)
  fields.push(''); // AS45 - APV Colectivo
  fields.push(''); // AT46 - Código AFP APV Colectivo
  fields.push(''); // AU47 - Forma de Pago APV Colectivo
  fields.push(''); // AV48 - Número Contrato APV
  fields.push(''); // AW49 - Número Períodos APV

  // 5. DATOS AFILIADO VOLUNTARIO (Columnas AX-BI, campos 50-61)
  for (let i = 0; i < 12; i++) {
    fields.push(''); // AX50-BI61 - Datos Afiliado Voluntario
  }

  // 6. DATOS IPS-ISL-FONASA (Columnas BJ-BV, campos 62-74)
  fields.push((detail.base_imp_cesantia || 0).toString()); // BJ62 - Renta Imponible Seguro Cesantía
  fields.push((detail.cesantia || 0).toString()); // BK63 - Aporte Trabajador Cesantía
  fields.push(''); // BL64 - Aporte Empleador Cesantía
  fields.push(''); // BM65 - Seguro de Accidentes
  fields.push(''); // BN66 - Aporte Empleador Accidente
  for (let i = 0; i < 9; i++) {
    fields.push(''); // BO67-BV74 - Otros datos IPS
  }

  // 7. DATOS SALUD (Columnas BW-CD, campos 75-82)
  fields.push((detail.base_imp_prevision || 0).toString()); // BW75 - Renta Imponible Salud
  fields.push((detail.salud || 0).toString()); // BX76 - Cotización Obligatoria Salud
  fields.push((detail.salud_voluntaria || 0).toString()); // BY77 - Cotización Voluntaria Salud
  fields.push(''); // BZ78 - Adicional Diferenciado
  fields.push(''); // CA79 - Código Salud
  fields.push(''); // CB80 - Pesos UF Salud
  fields.push(''); // CC81 - Código CCAF para Salud
  fields.push(''); // CD82 - Número de Períodos Salud

  // 8. DATOS CAJA DE COMPENSACIÓN (Columnas CE-CQ, campos 83-95)
  fields.push((detail.asignacion_familiar || 0).toString()); // CE83 - Asignación Familiar
  fields.push(''); // CF84 - Asignación Maternal
  fields.push(''); // CG85 - Asignación por Muerte
  fields.push(''); // CH86 - Carga Simple
  fields.push(''); // CI87 - Carga Maternal
  fields.push(''); // CJ88 - Carga Inválida
  fields.push(''); // CK89 - Código CCAF
  fields.push('0'); // CL90 - Aporte CCAF (normalmente 0.6%)
  for (let i = 0; i < 5; i++) {
    fields.push(''); // CM91-CQ95 - Otros datos CCAF
  }

  // 9. DATOS MUTUAL (Columnas CR-CU, campos 96-99)
  fields.push(''); // CR96 - Código Mutual
  fields.push('0'); // CS97 - Aporte Mutual (normalmente 0.95%)
  fields.push(''); // CT98 - Número de Períodos Mutual
  fields.push(''); // CU99 - Centro de Trabajo

  // 10. DATOS SEGURO CESANTÍA (Columnas CV-CX, campos 100-103)
  fields.push((detail.cesantia || 0).toString()); // CV100 - Aporte Trabajador Cesantía
  fields.push(''); // CW101 - Aporte Empleador Cesantía
  fields.push(''); // CX102 - Código AFC
  fields.push(''); // (campo 103)

  // 11. DATOS PAGADOR DE SUBSIDIO (Columnas CY-CZ, campos 104-105)
  fields.push(''); // CY104 - Código Pagador Subsidio
  fields.push(''); // CZ105 - Días Subsidiados

  // Asegurar que tenemos exactamente 105 campos
  while (fields.length < 105) {
    fields.push('');
  }
  
  // Truncar si hay más de 105 campos
  return fields.slice(0, 105);
}

// Función auxiliar para formatear montos (sin decimales)
function formatAmount(amount: number): string {
  return Math.round(amount || 0).toString();
}

// Función auxiliar para formatear RUT
function formatRUT(rut: string): string {
  if (!rut) return '';
  return rut.replace(/\./g, '').replace('-', '');
}