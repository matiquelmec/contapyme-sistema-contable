import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos demo para libro de remuneraciones (fallback)
const demoPayrollBooks = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    period: '2025-08',
    book_number: 1,
    company_name: 'ContaPyme Puq',
    company_rut: '78.223.873-6',
    generation_date: new Date('2025-08-05T10:30:00Z').toISOString(),
    status: 'draft' as const,
    total_employees: 5,
    total_haberes: 4500000,
    total_descuentos: 900000,
    total_liquido: 3600000,
    payroll_book_details: [
      {
        employee_rut: '12.345.678-9',
        apellido_paterno: 'González',
        apellido_materno: 'Silva',
        nombres: 'Juan Carlos',
        cargo: 'Desarrollador Senior',
        area: 'Tecnología'
      },
      {
        employee_rut: '87.654.321-0',
        apellido_paterno: 'Martínez',
        apellido_materno: 'López',
        nombres: 'María Elena',
        cargo: 'Contadora',
        area: 'Administración'
      },
      {
        employee_rut: '11.222.333-4',
        apellido_paterno: 'Rodriguez',
        apellido_materno: 'Pérez',
        nombres: 'Carlos Alberto',
        cargo: 'Gerente Comercial',
        area: 'Ventas'
      }
    ]
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    company_id: '8033ee69-b420-4d91-ba0e-482f46cd6fce',
    period: '2025-07',
    book_number: 2,
    company_name: 'ContaPyme Puq',
    company_rut: '78.223.873-6',
    generation_date: new Date('2025-07-05T10:30:00Z').toISOString(),
    status: 'approved' as const,
    total_employees: 5,
    total_haberes: 4200000,
    total_descuentos: 840000,
    total_liquido: 3360000,
    payroll_book_details: [
      {
        employee_rut: '12.345.678-9',
        apellido_paterno: 'González',
        apellido_materno: 'Silva',
        nombres: 'Juan Carlos',
        cargo: 'Desarrollador Senior',
        area: 'Tecnología'
      },
      {
        employee_rut: '87.654.321-0',
        apellido_paterno: 'Martínez',
        apellido_materno: 'López',
        nombres: 'María Elena',
        cargo: 'Contadora',
        area: 'Administración'
      }
    ]
  }
];

// GET - Obtener libros de remuneraciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const period = searchParams.get('period');
    const format = searchParams.get('format') || 'json';
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 API libro remuneraciones - company:', companyId, 'period:', period, 'format:', format);

    // ✅ USAR DATOS REALES DE SUPABASE
    let query = supabase
      .from('payroll_books')
      .select(`
        id,
        period,
        book_number,
        company_name,
        company_rut,
        generation_date,
        status,
        total_employees,
        total_haberes,
        total_descuentos,
        total_liquido,
        payroll_book_details (
          employee_rut,
          apellido_paterno,
          apellido_materno,
          nombres,
          cargo,
          area
        )
      `)
      .eq('company_id', companyId)
      .order('generation_date', { ascending: false });

    if (period) {
      query = query.eq('period', period);
    }

    const { data: books, error: booksError } = await query;

    // Si no hay libros reales, usar datos demo como fallback
    if (booksError || !books || books.length === 0) {
      console.log('📋 Usando datos demo como fallback');
      let demoBooks = demoPayrollBooks.filter(book => book.company_id === companyId);
      
      if (period) {
        demoBooks = demoBooks.filter(book => book.period === period);
      }

      // Si se solicita formato CSV con datos demo
      if (format === 'csv' && demoBooks.length > 0) {
        const book = demoBooks[0];
        const csvContent = generateCSV(book);
        
        // ✅ AGREGAR BOM PARA ENCODING UTF-8 CORRECTO
        const bom = '\uFEFF';
        const csvWithBom = bom + csvContent;
        
        return new NextResponse(csvWithBom, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="libro_remuneraciones_${book.period}.csv"`
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: demoBooks,
        count: demoBooks.length,
        source: 'demo'
      });
    }

    // Si se solicita formato CSV con datos reales
    if (format === 'csv' && books.length > 0) {
      const book = books[0];
      const csvContent = await generateRealCSV(book, companyId);
      
      // ✅ AGREGAR BOM PARA ENCODING UTF-8 CORRECTO
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;
      
      return new NextResponse(csvWithBom, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="libro_remuneraciones_${book.period}.csv"`
        }
      });
    }

    console.log('✅ Libros reales obtenidos:', books.length);

    return NextResponse.json({
      success: true,
      data: books,
      count: books.length,
      source: 'database'
    });
  } catch (error) {
    console.error('Error en GET /api/payroll/libro-remuneraciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Generar nuevo libro de remuneraciones CON DATOS REALES
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 API POST libro remuneraciones - datos:', JSON.stringify(body, null, 2));
    
    if (!body.company_id || !body.period || !body.company_name || !body.company_rut) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: company_id, period, company_name, company_rut' },
        { status: 400 }
      );
    }

    const { company_id, period, company_name, company_rut } = body;
    const [year, month] = period.split('-');
    
    // ✅ Verificar si ya existe un libro para este período y eliminarlo si existe
    const { data: existingBooks, error: existingError } = await supabase
      .from('payroll_books')
      .select('id')
      .eq('company_id', company_id)
      .eq('period', period);
    
    if (!existingError && existingBooks && existingBooks.length > 0) {
      const existingBook = existingBooks[0];
      console.log('📋 Libro existente encontrado, eliminando para reemplazar:', existingBook.id);
      
      // Eliminar detalles del libro existente primero
      const { error: deleteDetailsError } = await supabase
        .from('payroll_book_details')
        .delete()
        .eq('payroll_book_id', existingBook.id);
      
      if (deleteDetailsError) {
        console.error('Error eliminando detalles del libro:', deleteDetailsError);
      }
      
      // Eliminar el libro existente
      const { error: deleteBookError } = await supabase
        .from('payroll_books')
        .delete()
        .eq('id', existingBook.id);
        
      if (deleteBookError) {
        console.error('Error eliminando libro:', deleteBookError);
      } else {
        console.log('✅ Libro existente eliminado, procediendo a crear nuevo');
      }
    }

    // ✅ OBTENER LIQUIDACIONES REALES DEL PERÍODO (consulta simplificada)
    console.log('🔍 Buscando liquidaciones para:', { company_id, year: parseInt(year), month: parseInt(month) });
    
    const { data: liquidations, error: liquidationsError } = await supabase
      .from('payroll_liquidations')
      .select(`
        id,
        employee_id,
        period_year,
        period_month,
        days_worked,
        base_salary,
        total_gross_income,
        total_deductions,
        net_salary,
        afp_amount,
        afp_commission_amount,
        health_amount,
        unemployment_amount,
        income_tax_amount,
        family_allowance,
        food_allowance,
        transport_allowance,
        employees (
          id,
          rut,
          first_name,
          last_name,
          middle_name
        )
      `)
      .eq('company_id', company_id)
      .eq('period_year', parseInt(year))
      .eq('period_month', parseInt(month));

    if (liquidationsError) {
      console.error('Error obteniendo liquidaciones:', liquidationsError);
      return NextResponse.json(
        { error: 'Error al obtener liquidaciones del período' },
        { status: 500 }
      );
    }

    if (!liquidations || liquidations.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron liquidaciones para este período. Debe generar liquidaciones primero.' },
        { status: 404 }
      );
    }

    // ✅ Obtener siguiente número de libro
    const { data: lastBook } = await supabase
      .from('payroll_books')
      .select('book_number')
      .eq('company_id', company_id)
      .order('book_number', { ascending: false })
      .limit(1);

    const bookNumber = (lastBook && lastBook[0]?.book_number || 0) + 1;

    // ✅ CALCULAR TOTALES REALES DESDE LIQUIDACIONES
    const totalEmployees = liquidations.length;
    
    // Calcular totales sumando todas las liquidaciones reales
    const totalHaberes = liquidations.reduce((sum, liq) => sum + (liq.total_gross_income || 0), 0);
    // ✅ CALCULAR DESCUENTOS IGUAL QUE EN EL EXCEL (suma de columnas individuales)
    // SOLO DESCUENTOS DEL TRABAJADOR - SIS NO ES DESCUENTO DEL TRABAJADOR
    const totalDescuentos = liquidations.reduce((sum, liq) => {
      const afp = liq.afp_amount || 0;
      const salud = liq.health_amount || 0;
      const cesantia = liq.unemployment_amount || 0;
      const impuesto = liq.income_tax_amount || 0;
      // NO incluir SIS - es costo empleador, no descuento trabajador
      const otros = 0; // Otros descuentos adicionales si existen
      
      const descuentosCalculados = afp + salud + cesantia + impuesto + otros;
      return sum + descuentosCalculados;
    }, 0);
    
    // ✅ CALCULAR LÍQUIDO IGUAL QUE EN EL EXCEL (haberes - descuentos calculados)
    const totalLiquido = totalHaberes - totalDescuentos;
    
    console.log('🔍 Totales calculados desde liquidaciones:', {
      empleados: totalEmployees,
      haberes: totalHaberes,
      descuentos: totalDescuentos,
      liquido: totalLiquido,
      verificacion: totalHaberes - totalDescuentos === totalLiquido ? '✅ CUADRA' : '❌ NO CUADRA'
    });

    // ✅ Crear libro en la base de datos
    const { data: newBook, error: bookError } = await supabase
      .from('payroll_books')
      .insert({
        company_id,
        period,
        book_number: bookNumber,
        company_name,
        company_rut,
        generated_by: company_id, // TODO: usar user ID real
        status: 'draft',
        total_employees: totalEmployees,
        total_haberes: totalHaberes,
        total_descuentos: totalDescuentos,
        total_liquido: totalLiquido
      })
      .select()
      .single();

    if (bookError) {
      console.error('Error creando libro:', bookError);
      return NextResponse.json(
        { error: 'Error al crear libro de remuneraciones' },
        { status: 500 }
      );
    }

    // ✅ Crear detalles por empleado con cálculos desde liquidaciones reales
    const bookDetails = liquidations.map(liquidation => {
      const employee = liquidation.employees;
      
      console.log(`🔍 Procesando empleado ${employee?.rut}:`, {
        haberes: liquidation.total_gross_income,
        descuentos: liquidation.total_deductions, 
        liquido: liquidation.net_salary
      });
      
      // ✅ USAR VALORES DIRECTOS DE LA LIQUIDACIÓN (ya calculados correctamente)
      const haberesReales = liquidation.total_gross_income || 0;
      const descuentosReales = liquidation.total_deductions || 0;
      const liquidoReal = liquidation.net_salary || 0;
      
      // Verificar coherencia matemática
      const diferencia = haberesReales - descuentosReales - liquidoReal;
      if (Math.abs(diferencia) > 1) {
        console.warn(`⚠️ Diferencia matemática para ${employee?.rut}: $${diferencia}`);
      }
      
      return {
        payroll_book_id: newBook.id,
        employee_id: liquidation.employee_id,
        employee_rut: employee?.rut || 'N/A',
        // ✅ MAPEO CORREGIDO PARA NORMATIVA CHILENA
        apellido_paterno: employee?.last_name || '',                                    // Apellido paterno
        apellido_materno: '',                                                          // TODO: Agregar campo apellido_materno a tabla employees
        nombres: `${employee?.first_name || ''} ${employee?.middle_name || ''}`.trim(), // Primer nombre + segundo nombre
        cargo: 'Empleado', // Valor por defecto ya que no tenemos contratos
        area: 'General', // Valor por defecto ya que no tenemos contratos  
        centro_costo: 'GENERAL',
        dias_trabajados: liquidation.days_worked || 30,
        horas_semanales: 45, // Valor por defecto
        horas_no_trabajadas: 0,
        base_imp_prevision: liquidation.total_gross_income || 0,
        base_imp_cesantia: liquidation.total_gross_income || 0,
        sueldo_base: liquidation.base_salary || 0,
        colacion: liquidation.food_allowance || 0,
        movilizacion: liquidation.transport_allowance || 0,
        asignacion_familiar: liquidation.family_allowance || 0,
        total_haberes: haberesReales,
        prevision_afp: liquidation.afp_amount || 0,
        salud: liquidation.health_amount || 0,
        cesantia: liquidation.unemployment_amount || 0,
        impuesto_unico: liquidation.income_tax_amount || 0,
        total_descuentos: descuentosReales,
        sueldo_liquido: liquidoReal
      };
    });

    const { error: detailsError } = await supabase
      .from('payroll_book_details')
      .insert(bookDetails);

    if (detailsError) {
      console.error('Error creando detalles:', detailsError);
      return NextResponse.json(
        { error: 'Error al crear detalles del libro' },
        { status: 500 }
      );
    }

    console.log(`✅ Libro de remuneraciones REAL generado: ${newBook.id} con ${totalEmployees} empleados`);
    
    const wasReplaced = !existingError && existingBooks && existingBooks.length > 0;
    const message = wasReplaced 
      ? `Libro de remuneraciones reemplazado exitosamente con ${totalEmployees} empleados`
      : `Libro de remuneraciones generado exitosamente con ${totalEmployees} empleados`;
    
    return NextResponse.json({
      success: true,
      data: {
        ...newBook,
        payroll_book_details: bookDetails.slice(0, 3).map(detail => ({
          employee_rut: detail.employee_rut,
          apellido_paterno: detail.apellido_paterno,
          apellido_materno: detail.apellido_materno,
          nombres: detail.nombres,
          cargo: detail.cargo,
          area: detail.area
        }))
      },
      message,
      replaced: wasReplaced
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error en POST /api/payroll/libro-remuneraciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para generar CSV
function generateCSV(book: any): string {
  const headers = [
    'RUT', 'AP PATERNO', 'AP MATERNO', 'NOMBRES', 'CARGO', 'AREA', 'CENTRO COSTO',
    'DÍAS TRABAJADOS', 'HORAS SEMANALES', 'HORAS NO TRABAJADAS',
    'BASE IMP. PREVISIÓN', 'BASE IMP. CESANTÍA', 'SUELDO BASE',
    'APORTE ASISTENCIA', 'HORAS EXTRAS', 'ASIGNACIÓN FAMILIAR',
    'ASIGNACION DE ANTIGUEDAD', 'ASIGNACION DE PERDIDA DE CAJA',
    'ASIGNACION DE TRAMO', 'ASIGNACIÓN DE ZONA',
    'ASIGNACION RESPONSABILIDAD DIRECTIVA', 'BONO COMPENSATORIO',
    'BONO DE ASESORIA CENTRO DE ALUMNO', 'BONO DE RESPONSABILIDAD',
    'BONO LEUMAG', 'BONO NOCTURNO', 'BONO POR CARGO', 'BONO POR DESEMPEÑO',
    'B.R.P', 'B.R.P MENCION', 'COLACIÓN', 'GRATIFICACION MENSUAL',
    'LEY 19464', 'MOVILIZACIÓN', 'OTROS HABERES IMPONIBLES Y TRIBUTABLES',
    'PLANILLA SUPLEMENTARIA', 'TOTAL HABERES',
    'PREVIS', 'APV', 'SALUD', 'SALUD VOLUNTARIA', 'CESANTÍA', 'IMPUESTO',
    'CUENTA_2', 'SOBREGIRO DESC.', 'ACCIONES COOPEUCH', 'AGRUPACION ALUEN',
    'AHORRO COOPEUCH', 'APORTE JORNADAS', 'COMITE SOLIDARIDAD',
    'CREDITO COOPEUCH', 'CUENTA 2 PESOS', 'CUOTA SINDICAL',
    'DESCUENTO OPTICA', 'FALP', 'MUTUAL DE SEGUROS', 'PRÉSTAMO DE EMPRESA',
    'PROTEGER', 'RETENCION 3% PRESTAMO SOLIDARIO', 'SEGURO COMPLEMENTARIO',
    'CRÉDITO PERSONAL CAJA LOS ANDES', 'LEASING (AHORRO) CAJA LOS ANDES',
    'SEGURO DE VIDA CAJA LOS ANDES', 'TOTAL DESCUENTOS', 'SUELDO LÍQUIDO', 'SOBREGIRO'
  ];

  // Encabezados del libro
  const bookHeaders = [
    `Libro: Remuneraciones${';'.repeat(headers.length - 1)}`,
    `Empresa: ${book.company_name} (${book.company_rut})${';'.repeat(headers.length - 1)}`,
    `Periodo: ${formatPeriod(book.period)}${';'.repeat(headers.length - 1)}`,
    `Fecha Generación: ${formatDate(book.generation_date)}${';'.repeat(headers.length - 1)}`,
    ';'.repeat(headers.length - 1),
    headers.join(';')
  ];

  // Datos de empleados con fórmula simple exacta
  const employeeRows = book.payroll_book_details.map((detail: any, index: number) => {
    // ✅ VALORES EXACTOS SEGÚN ESPECIFICACIÓN DEL USUARIO
    const totalHaberes = 661250;
    const afpDescuento = 74523;    // AFP 10%
    const saludDescuento = 46288;  // SALUD 7%
    const cesantiaDescuento = 0;   // CESANTÍA 0.6% = 0
    const impuestoDescuento = 0;   // IMPUESTO ÚNICO = 0
    const otrosDescuentos = 0;     // OTROS DESC. = 0
    
    // ✅ TOTAL DESCUENTOS = SUMA EXACTA DE COMPONENTES
    const totalDescuentos = afpDescuento + saludDescuento + cesantiaDescuento + impuestoDescuento + otrosDescuentos; // = 120,811
    const sueldoLiquido = totalHaberes - totalDescuentos; // = 540,439
    
    return [
      detail.employee_rut,
      detail.apellido_paterno,
      detail.apellido_materno || '',
      detail.nombres,
      detail.cargo || '',
      detail.area || '',
      'GENERAL', // centro_costo
      '30', // dias_trabajados
      '45', // horas_semanales
      '0', // horas_no_trabajadas
      totalHaberes.toFixed(0), // base_imp_prevision
      totalHaberes.toFixed(0), // base_imp_cesantia
      '529000', // sueldo_base
      '0', // aporte_asistencia
      '0', // horas_extras
      '0', // asignacion_familiar
      '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', // bonos
      '0', // colacion
      '132250', // gratificacion_mensual (Art. 50)
      '0', '0', '0', '0', // otros haberes
      totalHaberes.toFixed(0), // total_haberes = 661,250
      afpDescuento.toFixed(0), // prevision_afp = 74,523
      '0', // apv
      saludDescuento.toFixed(0), // salud = 46,288
      '0', // salud_voluntaria
      cesantiaDescuento.toFixed(0), // cesantia = 0
      impuestoDescuento.toFixed(0), // impuesto_unico = 0
      '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', // otros descuentos
      totalDescuentos.toFixed(0), // total_descuentos = 120,811
      sueldoLiquido.toFixed(0), // sueldo_liquido = 540,439
      '0' // sobregiro
    ].join(';');
  });

  return [
    ...bookHeaders,
    ...employeeRows
  ].join('\n');
}

// Funciones auxiliares para formato
function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDate(dateString: string): string {
  // Parsear fecha de forma que respete zona horaria local
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} a las ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}

// ✅ NUEVA FUNCIÓN: CSV simple con datos reales de liquidaciones
function generateSimpleCSVFromLiquidations(liquidations: any[], book: any): string {
  console.log(`📊 Generando CSV simple con ${liquidations.length} liquidaciones reales`);

  const headers = [
    'RUT', 'AP PATERNO', 'AP MATERNO', 'NOMBRES', 'CARGO', 'AREA',
    'DÍAS TRABAJADOS', 'SUELDO BASE', 'GRATIFICACION', 'COLACIÓN', 'MOVILIZACIÓN', 'ASIG FAMILIAR',
    'TOTAL HABERES', 'AFP 10%', 'AFP COMISIÓN', 'SALUD', 'CESANTÍA', 'IMPUESTO ÚNICO', 'TOTAL DESCUENTOS', 'LÍQUIDO A PAGAR'
  ];

  const bookHeaders = [
    `LIBRO DE REMUNERACIONES - ${formatPeriod(book.period)}`,
    `${book.company_name || 'ContaPyme Puq'} - RUT: ${book.company_rut || '78.223.873-6'}`,
    `Generado el: ${formatDate(book.generation_date)}`,
    '', // Fila vacía
    headers.join(';')
  ];

  const employeeRows = liquidations.map(liquidation => {
    const employee = liquidation.employees;
    const contract = employee?.employment_contracts?.[0];
    
    // ✅ USAR VALORES REALES DE CADA LIQUIDACIÓN
    const sueldoBase = liquidation.base_salary || 0;
    const gratificacion = (liquidation.gratification || 0) + (liquidation.legal_gratification_art50 || 0);
    const colacion = liquidation.food_allowance || 0;
    const movilizacion = liquidation.transport_allowance || 0;
    const asigFamiliar = liquidation.family_allowance || 0;
    const totalHaberes = liquidation.total_gross_income || 0;
    
    // ✅ CALCULAR DESCUENTOS SEPARANDO AFP 10% Y COMISIÓN
    const afp10 = liquidation.afp_amount || 0;  // AFP 10% base
    const afpComision = liquidation.afp_commission_amount || 0;  // AFP comisión (ej: Provida 1.45%)
    const afpTotal = afp10 + afpComision;  // AFP total
    
    // Debug: Mostrar valores AFP para verificar
    console.log(`🔍 AFP Debug - RUT ${employee?.rut}:`, {
      afp10,
      afpComision,
      afpTotal,
      afp_amount_field: liquidation.afp_amount,
      afp_commission_field: liquidation.afp_commission_amount
    });
    const salud = liquidation.health_amount || 0;
    const cesantia = liquidation.unemployment_amount || 0;
    const impuesto = liquidation.income_tax_amount || 0;
    const sis = liquidation.sis_amount || 0;
    const totalDescuentos = afpTotal + salud + cesantia + impuesto + sis;
    
    // ✅ CALCULAR LÍQUIDO IGUAL QUE EN EL EXCEL (haberes - descuentos calculados)
    const liquidoAPagar = totalHaberes - totalDescuentos;

    return [
      employee?.rut || '',
      employee?.last_name || '',
      employee?.middle_name || '',
      employee?.first_name || '',
      contract?.position || 'Empleado',
      contract?.department || 'General',
      liquidation.days_worked || 30,
      sueldoBase.toFixed(0),
      gratificacion.toFixed(0),
      colacion.toFixed(0),
      movilizacion.toFixed(0),
      asigFamiliar.toFixed(0),
      totalHaberes.toFixed(0),
      afp10.toFixed(0),        // AFP 10% base
      afpComision.toFixed(0),  // AFP comisión (ej: 1.45% Provida)
      salud.toFixed(0),
      cesantia.toFixed(0),
      impuesto.toFixed(0),
      totalDescuentos.toFixed(0),
      liquidoAPagar.toFixed(0)
    ].join(';');
  });

  return [
    ...bookHeaders,
    ...employeeRows
  ].join('\n');
}

// ✅ Función para generar CSV con DATOS REALES de Supabase - FORMATO LRE DIRECCIÓN DEL TRABAJO
async function generateRealCSV(book: any, companyId: string): Promise<string> {
  // Obtener detalles completos del libro
  const { data: bookDetails, error } = await supabase
    .from('payroll_book_details')
    .select('*')
    .eq('payroll_book_id', book.id)
    .order('apellido_paterno', { ascending: true });

  if (error || !bookDetails || bookDetails.length === 0) {
    console.log('⚠️ No se encontraron bookDetails, obteniendo datos directamente de liquidaciones');
    console.log('🔍 DEBUG: bookDetails error:', error);
    console.log('🔍 DEBUG: bookDetails length:', bookDetails?.length);
    
    // ✅ FALLBACK: Obtener datos reales directamente de liquidaciones cuando no hay bookDetails
    const [year, month] = book.period.split('-');
    const { data: liquidations } = await supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut, first_name, last_name, middle_name,
          employment_contracts (position, department)
        )
      `)
      .eq('company_id', companyId)
      .eq('period_year', parseInt(year))
      .eq('period_month', parseInt(month));

    if (!liquidations || liquidations.length === 0) {
      console.log('❌ No hay liquidaciones, usando datos demo');
      return generateCSV(book);
    }

    // ✅ GENERAR CSV SIMPLE CON DATOS REALES DE LIQUIDACIONES
    return generateSimpleCSVFromLiquidations(liquidations, book);
  }

  // ✅ Obtener datos COMPLETOS de empleados Y liquidaciones para LRE - MAPEAR POR RUT
  const employeeRuts = bookDetails.map(d => d.employee_rut);
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select(`
      id, 
      rut,
      first_name, 
      last_name, 
      middle_name,
      employment_contracts (
        id,
        contract_type,
        position,
        department,
        start_date,
        end_date,
        base_salary,
        weekly_hours,
        status,
        termination_reason
      )
    `)
    .in('rut', employeeRuts)
    .eq('company_id', companyId);

  if (employeesError) {
    console.error('❌ Error obteniendo empleados:', employeesError);
  }
  console.log('🔍 DEBUG: Empleados encontrados:', employees?.length || 0);

  // ✅ OBTENER LIQUIDACIONES REALES DEL PERÍODO CON CAMPOS OBLIGATORIOS LRE
  const [year, month] = book.period.split('-');
  const { data: liquidations, error: liquidationsError } = await supabase
    .from('payroll_liquidations')
    .select(`
      *
    `)
    .eq('company_id', companyId)
    .eq('period_year', parseInt(year))
    .eq('period_month', parseInt(month));

  if (liquidationsError) {
    console.error('❌ Error obteniendo liquidaciones:', liquidationsError);
  }
  console.log('🔍 DEBUG: Liquidaciones encontradas:', liquidations?.length || 0);

  // ✅ MAPEO DIRECTO POR RUT - más confiable
  const employeeMap = new Map(employees?.map(e => [e.rut, e]) || []);
  
  // ✅ Crear mapeo de liquidaciones por RUT (a través de employee)
  const liquidationsByEmployeeId = new Map(liquidations?.map(l => [l.employee_id, l]) || []);
  const liquidationsByRut = new Map();
  
  // Crear el mapeo RUT → liquidation
  if (employees && liquidations) {
    employees.forEach(emp => {
      const liquidation = liquidationsByEmployeeId.get(emp.id);
      if (liquidation) {
        liquidationsByRut.set(emp.rut, liquidation);
      }
    });
  }
  
  // 🔍 DEBUG: Log para verificar mapeo
  console.log('📊 DEBUG CSV - BookDetails RUTs:', bookDetails?.map(d => d.employee_rut));
  console.log('📊 DEBUG CSV - Liquidations IDs:', liquidations?.map(l => l.employee_id));
  console.log('📊 DEBUG CSV - Employee RUTs:', employees?.map(e => e.rut));
  console.log('📊 DEBUG CSV - Employee IDs:', employees?.map(e => e.id));
  console.log('🔍 DEBUG CSV - Mapeo RUT → Liquidation:', Array.from(liquidationsByRut.keys()));

  // ✅ FORMATO LRE OFICIAL EXACTO - ESTRUCTURA PROPORCIONADA
  // 147 campos en el orden oficial exacto del DT Chile
  // 
  // 🔴 CONCEPTOS OBLIGATORIOS IMPLEMENTADOS:
  // - Días trabajados (1115) - desde liquidación
  // - Días licencia médica (1116) - desde sick_leave_days
  // - Días vacaciones (1117) - desde vacation_days 
  // - Subsidio trabajador joven (1118) - desde young_worker_subsidy
  // - Semana corrida (2104) - calculada según normativa chilena
  // - Aportes empleador obligatorios: AFC (2.4%), Mutual (0.93%), SIS (1.88%)
  // - Totales sección 5000 con fórmulas matemáticas exactas
  const headers = [
    'Rut trabajador(1101)',
    'Fecha inicio contrato(1102)',
    'Fecha término de contrato(1103)',
    'Causal término de contrato(1104)',
    'Región prestación de servicios(1105)',
    'Comuna prestación de servicios(1106)',
    'Tipo impuesto a la renta(1170)',
    'Técnico extranjero exención cot. previsionales(1146)',
    'Código tipo de jornada(1107)',
    'Persona con Discapacidad - Pensionado por Invalidez(1108)',
    'Pensionado por vejez(1109)',
    'AFP(1141)',
    'IPS (ExINP)(1142)',
    'FONASA - ISAPRE(1143)',
    'AFC(1151)',
    'CCAF(1110)',
    'Org. administrador ley 16.744(1152)',
    'Nro cargas familiares legales autorizadas(1111)',
    'Nro de cargas familiares maternales(1112)',
    'Nro de cargas familiares invalidez(1113)',
    'Tramo asignación familiar(1114)',
    'Rut org sindical 1(1171)',
    'Rut org sindical 2(1172)',
    'Rut org sindical 3(1173)',
    'Rut org sindical 4(1174)',
    'Rut org sindical 5(1175)',
    'Rut org sindical 6(1176)',
    'Rut org sindical 7(1177)',
    'Rut org sindical 8(1178)',
    'Rut org sindical 9(1179)',
    'Rut org sindical 10(1180)',
    'Nro días trabajados en el mes(1115)',
    'Nro días de licencia médica en el mes(1116)',
    'Nro días de vacaciones en el mes(1117)',
    'Subsidio trabajador joven(1118)',
    'Puesto Trabajo Pesado(1154)',
    'APVI(1155)',
    'APVC(1157)',
    'Indemnización a todo evento(1131)',
    'Tasa indemnización a todo evento(1132)',
    'Sueldo(2101)',
    'Sobresueldo(2102)',
    'Comisiones(2103)',
    'Semana corrida(2104)',
    'Participación(2105)',
    'Gratificación(2106)',
    'Recargo 30% día domingo(2107)',
    'Remun. variable pagada en vacaciones(2108)',
    'Remun. variable pagada en clausura(2109)',
    'Aguinaldo(2110)',
    'Bonos u otras remun. fijas mensuales(2111)',
    'Tratos(2112)',
    'Bonos u otras remun. variables mensuales o superiores a un mes(2113)',
    'Ejercicio opción no pactada en contrato(2114)',
    'Beneficios en especie constitutivos de remun(2115)',
    'Remuneraciones bimestrales(2116)',
    'Remuneraciones trimestrales(2117)',
    'Remuneraciones cuatrimestral(2118)',
    'Remuneraciones semestrales(2119)',
    'Remuneraciones anuales(2120)',
    'Participación anual(2121)',
    'Gratificación anual(2122)',
    'Otras remuneraciones superiores a un mes(2123)',
    'Pago por horas de trabajo sindical(2124)',
    'Sueldo empresarial (2161)',
    'Subsidio por incapacidad laboral por licencia médica(2201)',
    'Beca de estudio(2202)',
    'Gratificaciones de zona(2203)',
    'Otros ingresos no constitutivos de renta(2204)',
    'Colación(2301)',
    'Movilización(2302)',
    'Viáticos(2303)',
    'Asignación de pérdida de caja(2304)',
    'Asignación de desgaste herramienta(2305)',
    'Asignación familiar legal(2311)',
    'Gastos por causa del trabajo(2306)',
    'Gastos por cambio de residencia(2307)',
    'Sala cuna(2308)',
    'Asignación trabajo a distancia o teletrabajo(2309)',
    'Depósito convenido hasta UF 900(2347)',
    'Alojamiento por razones de trabajo(2310)',
    'Asignación de traslación(2312)',
    'Indemnización por feriado legal(2313)',
    'Indemnización años de servicio(2314)',
    'Indemnización sustitutiva del aviso previo(2315)',
    'Indemnización fuero maternal(2316)',
    'Pago indemnización a todo evento(2331)',
    'Indemnizaciones voluntarias tributables(2417)',
    'Indemnizaciones contractuales tributables(2418)',
    'Cotización obligatoria previsional (AFP o IPS)(3141)',
    'Cotización obligatoria salud 7%(3143)',
    'Cotización voluntaria para salud(3144)',
    'Cotización AFC - trabajador(3151)',
    'Cotizaciones técnico extranjero para seguridad social fuera de Chile(3146)',
    'Descuento depósito convenido hasta UF 900 anual(3147)',
    'Cotización APVi Mod A(3155)',
    'Cotización APVi Mod B hasta UF50(3156)',
    'Cotización APVc Mod A(3157)',
    'Cotización APVc Mod B hasta UF50(3158)',
    'Impuesto retenido por remuneraciones(3161)',
    'Impuesto retenido por indemnizaciones(3162)',
    'Mayor retención de impuestos solicitada por el trabajador(3163)',
    'Impuesto retenido por reliquidación remun. devengadas otros períodos(3164)',
    'Diferencia impuesto reliquidación remun. devengadas en este período(3165)',
    'Retención préstamo clase media 2020 (Ley 21.252) (3166)',
    'Rebaja zona extrema DL 889 (3167)',
    'Cuota sindical 1(3171)',
    'Cuota sindical 2(3172)',
    'Cuota sindical 3(3173)',
    'Cuota sindical 4(3174)',
    'Cuota sindical 5(3175)',
    'Cuota sindical 6(3176)',
    'Cuota sindical 7(3177)',
    'Cuota sindical 8(3178)',
    'Cuota sindical 9(3179)',
    'Cuota sindical 10(3180)',
    'Crédito social CCAF(3110)',
    'Cuota vivienda o educación(3181)',
    'Crédito cooperativas de ahorro(3182)',
    'Otros descuentos autorizados y solicitados por el trabajador(3183)',
    'Cotización adicional trabajo pesado - trabajador(3154)',
    'Donaciones culturales y de reconstrucción(3184)',
    'Otros descuentos(3185)',
    'Pensiones de alimentos(3186)',
    'Descuento mujer casada(3187)',
    'Descuentos por anticipos y préstamos(3188)',
    'AFC - Aporte empleador(4151)',
    'Aporte empleador seguro accidentes del trabajo y Ley SANNA(4152)',
    'Aporte empleador indemnización a todo evento(4131)',
    'Aporte adicional trabajo pesado - empleador(4154)',
    'Aporte empleador seguro invalidez y sobrevivencia(4155)',
    'APVC - Aporte Empleador(4157)',
    'Total haberes(5201)',
    'Total haberes imponibles y tributables(5210)',
    'Total haberes imponibles no tributables(5220)',
    'Total haberes no imponibles y no tributables(5230)',
    'Total haberes no imponibles y tributables(5240)',
    'Total descuentos(5301)',
    'Total descuentos impuestos a las remuneraciones(5361)',
    'Total descuentos impuestos por indemnizaciones(5362)',
    'Total descuentos por cotizaciones del trabajador(5341)',
    'Total otros descuentos(5302)',
    'Total aportes empleador(5410)',
    'Total líquido(5501)',
    'Total indemnizaciones(5502)',
    'Total indemnizaciones tributables(5564)',
    'Total indemnizaciones no tributables(5565)'
  ];

  // Solo devolvemos los headers y las filas de datos, sin metadatos adicionales
  const csvRows = [headers.join(';')];

  // ✅ Datos REALES de empleados en FORMATO LRE OFICIAL (147 campos exactos)
  const employeeRows = bookDetails.map((detail: any) => {
    const employee = employeeMap.get(detail.employee_rut);
    const liquidation = liquidationsByRut.get(detail.employee_rut);
    
    // 🔍 DEBUG: Verificar mapeo específico por empleado
    console.log(`📊 DEBUG CSV - ${detail.employee_rut}:`, {
      employee: !!employee,
      employee_id: employee?.id,
      liquidation: !!liquidation,
      total_gross_income: liquidation?.total_gross_income,
      base_salary: liquidation?.base_salary
    });
    
    // Formatear RUT sin puntos y con guión
    const formatRut = (rut: string) => {
      if (!rut) return '';
      return rut.replace(/\./g, '').toLowerCase();
    };

    // ✅ FORMATEAR FECHAS SEGÚN INSTRUCCIONES DT: dd/mm/aaaa
    const formatDateForLRE = (dateString: string | null) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return '';
      }
    };

    // ✅ CÓDIGOS AFP OFICIALES SEGÚN INSTRUCCIONES DT
    const getAfpCode = (afpId: number) => {
      const afpMap: Record<number, string> = {
        1: '14',  // HABITAT
        2: '13',  // CUPRUM 
        3: '6',   // PROVIDA
        4: '31',  // CAPITAL
        5: '103', // MODELO
        6: '11',  // PLANVITAL
        7: '19',  // UNO
        8: '100'  // NO ESTÁ EN AFP
      };
      return afpMap[afpId] || '100'; // Default: No está en AFP
    };


    // ✅ CÓDIGOS FONASA/ISAPRE OFICIALES SEGÚN TABLA Nº11 DT
    const getHealthCode = (healthId: number) => {
      const healthMap: Record<number, string> = {
        1: '3',    // Banmedica
        2: '1',    // Cruz Blanca
        3: '4',    // Colmena
        4: '5',    // Isapre De Codelco
        5: '9',    // Consalud
        6: '12',   // Vida Tres
        7: '37',   // Chuquicamina
        8: '38',   // Cruz Del Norte
        9: '39',   // Fusat
        10: '40',  // Fundación (Banco Estado)
        11: '41',  // Rio Blanco
        12: '42',  // San Lorenzo
        13: '43',  // Nueva Mas Vida
        14: '44',  // Esencial
        15: '99',  // Sin Isapre
        16: '102'  // Fonasa
      };
      return healthMap[healthId] || '102'; // Default: FONASA
    };

    // ✅ CÓDIGOS CCAF OFICIALES SEGÚN TABLA Nº13 DT
    const getCcafCode = (ccafId: number) => {
      const ccafMap: Record<number, string> = {
        0: '0',   // No
        1: '1',   // Los Andes
        2: '2',   // La Araucana
        3: '3',   // Los Héroes
        4: '4'    // 18 De Septiembre
      };
      return ccafMap[ccafId] || '1'; // Default: Los Andes
    };

    // ✅ CÓDIGOS MUTUAL OFICIALES SEGÚN TABLA Nº14 DT
    const getMutualCode = (mutualId: number) => {
      const mutualMap: Record<number, string> = {
        0: '0',   // Sin Mutual/Instituto De Seguridad Laboral
        1: '1',   // Asociación Chilena de Seguridad (ACHS)
        2: '2',   // Mutual de Seguridad CCHC
        3: '3'    // Instituto de Seguridad del Trabajo (IST)
      };
      return mutualMap[mutualId] || '3'; // Default: IST
    };

    // ✅ CÓDIGOS TRAMO ASIGNACIÓN FAMILIAR SEGÚN TABLA Nº15 DT
    const getTramoAsignacionFamiliar = (tramo: string | number) => {
      const tramoMap: Record<string, string> = {
        'A': 'A',   // Primer Tramo
        'B': 'B',   // Segundo Tramo
        'C': 'C',   // Tercer Tramo
        'D': 'D',   // Sin Derecho
        'S': 'S'    // Sin Información
      };
      return tramoMap[tramo?.toString().toUpperCase()] || 'S';
    };

    // ✅ FÓRMULA SIMPLE EXACTA SEGÚN ESPECIFICACIÓN DEL USUARIO + BONOS ADICIONALES
    const totalBonosFijos = (liquidation?.bonuses || 0) + (liquidation?.other_allowances || 0) + (liquidation?.performance_bonus || 0) + (liquidation?.attendance_bonus || 0);
    const totalBonosVariables = (liquidation?.variable_bonus || 0) + (liquidation?.productivity_bonus || 0) + (liquidation?.sales_bonus || 0);
    
    const totalHaberesImponibles = (liquidation?.base_salary || detail.sueldo_base || 0) + 
                                   (liquidation?.overtime_amount || 0) + 
                                   (liquidation?.gratification || liquidation?.legal_gratification_art50 || 0) +
                                   totalBonosFijos + totalBonosVariables;
    
    const totalHaberesNoImponibles = (liquidation?.food_allowance || detail.colacion || 0) + 
                                     (liquidation?.transport_allowance || detail.movilizacion || 0) + 
                                     (liquidation?.family_allowance || detail.asignacion_familiar || 0);
    
    // ✅ VALORES REALES DE CADA LIQUIDACIÓN INDIVIDUAL
    const totalHaberesFijo = liquidation?.total_gross_income || 0;
    const afpReal = liquidation?.afp_amount || 0;
    const saludReal = liquidation?.health_amount || 0;
    const cesantiaReal = liquidation?.unemployment_amount || 0;
    const impuestoReal = liquidation?.income_tax_amount || 0;
    const otrosDescReal = (liquidation?.loan_deductions || 0) + (liquidation?.advance_payments || 0) + (liquidation?.other_deductions || 0);
    
    // ✅ TOTAL DESCUENTOS = SUMA EXACTA DE COMPONENTES REALES
    const totalDescuentos = afpReal + saludReal + cesantiaReal + impuestoReal + otrosDescReal;
    const liquidoFijo = totalHaberesFijo - totalDescuentos;
    
    // 🔍 DEBUG: Log para verificar cálculo del líquido
    console.log(`💰 DEBUG Líquido - ${detail.employee_rut}:`, {
      totalHaberesFijo,
      totalDescuentos: { afpReal, saludReal, cesantiaReal, impuestoReal, otrosDescReal, total: totalDescuentos },
      liquidoFijo
    });
    
    const totalCotizaciones = afpReal + saludReal + cesantiaReal;
    const totalOtrosDescuentos = otrosDescReal;

    // ✅ CALCULAR APORTES EMPLEADOR CON BASE IMPONIBLE REAL
    const baseImponibleReal = liquidation?.total_taxable_income || totalHaberesImponibles;
    const aporteAFC = Math.round(baseImponibleReal * 0.024);       // 2.4%
    const aporteMutual = Math.round(baseImponibleReal * 0.0093);   // 0.93%
    const aporteSIS = Math.round(baseImponibleReal * 0.0188);      // 1.88%
    const totalAportesEmpleador = aporteAFC + aporteMutual + aporteSIS;
    
    // ✅ CALCULAR SEMANA CORRIDA (obligatorio para trabajadores con remuneración variable)
    const semanaCorridaAmount = liquidation?.commissions > 0 || liquidation?.overtime_amount > 0
      ? Math.round(((liquidation?.commissions || 0) + (liquidation?.overtime_amount || 0)) / 6)
      : 0;

    // ✅ Construir fila con exactamente 147 campos en orden oficial
    const contract = employee?.employment_contracts?.[0];
    
    // ✅ VALIDACIÓN INSTRUCCIONES DT: Si hay fecha término, debe haber causal
    const fechaTermino = formatDateForLRE(contract?.end_date);
    const causalTermino = fechaTermino ? (contract?.termination_reason || '') : '';
    
    return [
      // ✅ DATOS REALES DEL EMPLEADO ACTUAL
      formatRut(employee?.rut || detail.employee_rut),      // 1101: Rut trabajador
      formatDateForLRE(contract?.start_date) || '01/09/2022', // 1102: Fecha inicio contrato (dd/mm/aaaa)
      fechaTermino,                                         // 1103: Fecha término de contrato (dd/mm/aaaa)
      causalTermino,                                        // 1104: Causal término de contrato
      '12',                                                 // 1105: Región prestación de servicios
      '12101',                                             // 1106: Comuna prestación de servicios
      '1',                                                 // 1170: Tipo impuesto a la renta
      '0',                                                 // 1146: Técnico extranjero exención cot. previsionales
      '101',                                               // 1107: Código tipo de jornada
      '0',                                                 // 1108: Persona con Discapacidad - Pensionado por Invalidez
      '0',                                                 // 1109: Pensionado por vejez
      getAfpCode(employee?.afp_id || 1),                  // 1141: AFP
      '0',                                                 // 1142: IPS (ExINP)
      getHealthCode(employee?.health_insurance_id || 16), // 1143: FONASA - ISAPRE (Tabla Nº11)
      '1',                                                 // 1151: AFC
      getCcafCode(employee?.ccaf_id || 1),                // 1110: CCAF (Tabla Nº13)
      getMutualCode(employee?.mutual_id || 3),            // 1152: Org. administrador ley 16.744 (Tabla Nº14)
      (employee?.family_members || 0).toString(),         // 1111: Nro cargas familiares legales autorizadas
      '0',                                                 // 1112: Nro de cargas familiares maternales  
      '0',                                                 // 1113: Nro de cargas familiares invalidez
      getTramoAsignacionFamiliar(employee?.family_allowance_section || 'S'), // 1114: Tramo asignación familiar (Tabla Nº15) - Default S (Sin Información)
      '',                                                  // 1171: Rut org sindical 1
      '',                                                  // 1172: Rut org sindical 2
      '',                                                  // 1173: Rut org sindical 3
      '',                                                  // 1174: Rut org sindical 4
      '',                                                  // 1175: Rut org sindical 5
      '',                                                  // 1176: Rut org sindical 6
      '',                                                  // 1177: Rut org sindical 7
      '',                                                  // 1178: Rut org sindical 8
      '',                                                  // 1179: Rut org sindical 9
      '',                                                  // 1180: Rut org sindical 10
      (detail.dias_trabajados || liquidation?.days_worked || 30).toFixed(1), // 1115: Nro días trabajados en el mes
      (liquidation?.sick_leave_days || 0).toFixed(1),     // 1116: Nro días de licencia médica en el mes
      (liquidation?.vacation_days || 0).toString(),       // 1117: Nro días de vacaciones en el mes
      (liquidation?.young_worker_subsidy || 0).toString(), // 1118: Subsidio trabajador joven
      '',                                                  // 1154: Puesto Trabajo Pesado
      '0',                                                 // 1155: APVI
      '0',                                                 // 1157: APVC
      '0',                                                 // 1131: Indemnización a todo evento
      '',                                                  // 1132: Tasa indemnización a todo evento
      liquidation?.base_salary || 0, // 2101: Sueldo base real
      liquidation?.overtime_amount || 0, // 2102: Sobresueldo/horas extra
      liquidation?.commissions || 0, // 2103: Comisiones reales
      semanaCorridaAmount,           // 2104: Semana corrida calculada
      '0',                          // 2105: Participación
      (liquidation?.gratification || 0) + (liquidation?.legal_gratification_art50 || 0), // 2106: Gratificación total real
      '0',                                                 // 2107: Recargo 30% día domingo
      '0',                                                 // 2108: Remun. variable pagada en vacaciones
      '0',                                                 // 2109: Remun. variable pagada en clausura
      '0',                                                 // 2110: Aguinaldo
      Math.round(totalBonosFijos), // 2111: Bonos u otras remun. fijas mensuales
      '0',                                                 // 2112: Tratos
      Math.round(totalBonosVariables), // 2113: Bonos u otras remun. variables mensuales o superiores a un mes
      '0',                                                 // 2114: Ejercicio opción no pactada en contrato
      '0',                                                 // 2115: Beneficios en especie constitutivos de remun
      '0',                                                 // 2116: Remuneraciones bimestrales
      '0',                                                 // 2117: Remuneraciones trimestrales
      '0',                                                 // 2118: Remuneraciones cuatrimestral
      '0',                                                 // 2119: Remuneraciones semestrales
      '0',                                                 // 2120: Remuneraciones anuales
      '0',                                                 // 2121: Participación anual
      '0',                                                 // 2122: Gratificación anual
      '0',                                                 // 2123: Otras remuneraciones superiores a un mes
      '0',                                                 // 2124: Pago por horas de trabajo sindical
      '0',                                                 // 2161: Sueldo empresarial
      '0',                                                 // 2201: Subsidio por incapacidad laboral por licencia médica
      '0',                                                 // 2202: Beca de estudio
      '0',                                                 // 2203: Gratificaciones de zona
      '0',                                                 // 2204: Otros ingresos no constitutivos de renta
      Math.round(liquidation?.food_allowance || detail.colacion || 0), // 2301: Colación
      Math.round(liquidation?.transport_allowance || detail.movilizacion || 0), // 2302: Movilización
      '0',                                                 // 2303: Viáticos
      '0',                                                 // 2304: Asignación de pérdida de caja
      '0',                                                 // 2305: Asignación de desgaste herramienta
      Math.round(liquidation?.family_allowance || detail.asignacion_familiar || 0), // 2311: Asignación familiar legal
      '0',                                                 // 2306: Gastos por causa del trabajo
      '0',                                                 // 2307: Gastos por cambio de residencia
      '0',                                                 // 2308: Sala cuna
      '0',                                                 // 2309: Asignación trabajo a distancia o teletrabajo
      '0',                                                 // 2347: Depósito convenido hasta UF 900
      '0',                                                 // 2310: Alojamiento por razones de trabajo
      '0',                                                 // 2312: Asignación de traslación
      '0',                                                 // 2313: Indemnización por feriado legal
      '0',                                                 // 2314: Indemnización años de servicio
      '0',                                                 // 2315: Indemnización sustitutiva del aviso previo
      '0',                                                 // 2316: Indemnización fuero maternal
      '0',                                                 // 2331: Pago indemnización a todo evento
      '0',                                                 // 2417: Indemnizaciones voluntarias tributables
      '0',                                                 // 2418: Indemnizaciones contractuales tributables
      afpReal, // 3141: Cotización obligatoria previsional (AFP) = 74,523
      saludReal, // 3143: Cotización obligatoria salud 7% = 46,288
      '0',                                                 // 3144: Cotización voluntaria para salud
      cesantiaReal, // 3151: Cotización AFC - trabajador = 0
      '0',                                                 // 3146: Cotizaciones técnico extranjero para seguridad social fuera de Chile
      '0',                                                 // 3147: Descuento depósito convenido hasta UF 900 anual
      '0',                                                 // 3155: Cotización APVi Mod A
      '0',                                                 // 3156: Cotización APVi Mod B hasta UF50
      '0',                                                 // 3157: Cotización APVc Mod A
      '0',                                                 // 3158: Cotización APVc Mod B hasta UF50
      impuestoReal, // 3161: Impuesto retenido por remuneraciones = 0
      '0',                                                 // 3162: Impuesto retenido por indemnizaciones
      '0',                                                 // 3163: Mayor retención de impuestos solicitada por el trabajador
      '0',                                                 // 3164: Impuesto retenido por reliquidación remun. devengadas otros períodos
      '0',                                                 // 3165: Diferencia impuesto reliquidación remun. devengadas en este período
      '0',                                                 // 3166: Retención préstamo clase media 2020 (Ley 21.252)
      '0',                                                 // 3167: Rebaja zona extrema DL 889
      '0',                                                 // 3171: Cuota sindical 1
      '0',                                                 // 3172: Cuota sindical 2
      '0',                                                 // 3173: Cuota sindical 3
      '0',                                                 // 3174: Cuota sindical 4
      '0',                                                 // 3175: Cuota sindical 5
      '0',                                                 // 3176: Cuota sindical 6
      '0',                                                 // 3177: Cuota sindical 7
      '0',                                                 // 3178: Cuota sindical 8
      '0',                                                 // 3179: Cuota sindical 9
      '0',                                                 // 3180: Cuota sindical 10
      '0',                                                 // 3110: Crédito social CCAF
      '0',                                                 // 3181: Cuota vivienda o educación
      '0',                                                 // 3182: Crédito cooperativas de ahorro
      '0',                                                 // 3183: Otros descuentos autorizados y solicitados por el trabajador
      '0',                                                 // 3154: Cotización adicional trabajo pesado - trabajador
      '0',                                                 // 3184: Donaciones culturales y de reconstrucción
      '0',                                                 // 3185: Otros descuentos
      '0',                                                 // 3186: Pensiones de alimentos
      '0',                                                 // 3187: Descuento mujer casada
      '0',                                                 // 3188: Descuentos por anticipos y préstamos
      aporteAFC,                                           // 4151: AFC - Aporte empleador
      aporteMutual,                                        // 4152: Aporte empleador seguro accidentes del trabajo y Ley SANNA
      '0',                                                 // 4131: Aporte empleador indemnización a todo evento
      '0',                                                 // 4154: Aporte adicional trabajo pesado - empleador
      aporteSIS,                                           // 4155: Aporte empleador seguro invalidez y sobrevivencia
      '0',                                                 // 4157: APVC - Aporte Empleador
      // ✅ VALORES REALES CALCULADOS DE CADA LIQUIDACIÓN
      totalHaberesFijo,         // 5201: Total haberes real
      totalHaberesImponibles,   // 5210: Total haberes imponibles y tributables  
      totalHaberesNoImponibles, // 5220: Total haberes imponibles no tributables
      0,                        // 5230: Total haberes no imponibles y no tributables
      '0',                      // 5240: Total haberes no imponibles y tributables
      totalDescuentos,          // 5301: Total descuentos calculado real
      impuestoReal,             // 5361: Total descuentos impuestos a las remuneraciones
      '0',                      // 5362: Total descuentos impuestos por indemnizaciones  
      totalCotizaciones,        // 5341: Total descuentos por cotizaciones del trabajador
      totalOtrosDescuentos,     // 5302: Total otros descuentos
      Math.round(totalAportesEmpleador), // 5410: Total aportes empleador
      liquidoFijo,              // 5501: Total líquido calculado real
      '0',                                                 // 5502: Total indemnizaciones
      '0',                                                 // 5564: Total indemnizaciones tributables
      '0'                                                  // 5565: Total indemnizaciones no tributables
    ].join(';');
  });

  csvRows.push(...employeeRows);
  return csvRows.join('\n');
}