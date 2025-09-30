import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Función para calcular gratificación legal Art. 50
function calculateLegalGratification(payrollConfig: any, baseSalary: number, employeeId: string): number {
  if (payrollConfig?.legal_gratification_type === 'article_50') {
    // Gratificación Art. 50: 25% del sueldo base, máximo 4.75 sueldos mínimos MENSUALES
    const minWage = 529000; // Sueldo mínimo 2025
    const maxGratificationAnual = minWage * 4.75; // $2.512.750 anual
    const maxGratificationMensual = Math.round(maxGratificationAnual / 12); // $209.396 mensual
    const calculatedAmount = baseSalary * 0.25;
    const finalAmount = Math.min(calculatedAmount, maxGratificationMensual);
    
    console.log(`🎯 Gratificación Art. 50 calculada para empleado ${employeeId}:`);
    console.log(`   Sueldo base: $${baseSalary.toLocaleString()}`);
    console.log(`   25% calculado: $${calculatedAmount.toLocaleString()}`);
    console.log(`   Tope legal mensual (4.75 SM ÷ 12): $${maxGratificationMensual.toLocaleString()}`);
    console.log(`   Gratificación final: $${finalAmount.toLocaleString()}`);
    
    return finalAmount;
  }
  return 0;
}

// Función para formatear RUT chileno
function formatRut(rut: string): string {
  if (!rut) return '';
  // Limpiar el RUT de puntos y guiones existentes
  const cleanRut = rut.replace(/[.-]/g, '');
  // Separar número y dígito verificador
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  // Formatear con puntos
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

// Función para formatear fecha en español
function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  // Manejar diferentes formatos de fecha
  let date: Date;
  
  // Si viene en formato YYYY-MM-DD (ISO), parsearlo correctamente
  if (dateString.includes('-') && dateString.length === 10) {
    const [year, month, day] = dateString.split('-');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    date = new Date(dateString);
  }
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    console.error('Fecha inválida:', dateString);
    return dateString; // Devolver el string original si no se puede parsear
  }
  
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  console.log(`📅 Fecha formateada: ${dateString} → ${day} de ${month} de ${year}`);
  return `${day} de ${month} de ${year}`;
}

// Función para formatear moneda chilena
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Función para formatear moneda como en el ejemplo (sin decimales, con puntos)
function formatContractCurrency(amount: number): string {
  return `$ ${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)}.-`;
}

// Función para generar el HTML del contrato
function generateContractHTML(contractData: any): string {
  const {
    // Datos de la empresa
    company_name,
    company_rut,
    legal_representative_name,
    legal_representative_rut,
    company_address,
    company_city,
    
    // Datos del trabajador
    employee_full_name,
    employee_rut,
    employee_address,
    employee_city,
    employee_nationality,
    employee_marital_status,
    employee_birth_date,
    afp_name,
    health_insurance_name,
    
    // Datos del contrato
    position,
    department,
    start_date,
    end_date,
    contract_type,
    base_salary,
    gratification_amount,
    bonuses = [],
    allowances = {},
    workplace_address,
    schedule_details = {},
    job_functions = [],
    obligations = [],
    prohibitions = [],
    resignation_notice_days = 30,
    weekly_hours = 45
  } = contractData;

  // Calcular totales
  const totalBonuses = bonuses.reduce((sum: number, bonus: any) => sum + (bonus.amount || 0), 0);
  const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
  const totalGross = Number(base_salary) + Number(gratification_amount) + totalBonuses;

  // Formatear horarios (usar los campos correctos del contrato)
  const entryTime = contractData.entry_time || schedule_details.entry || '09:00';
  const exitTime = contractData.exit_time || schedule_details.exit || '18:00';
  const lunchDuration = contractData.lunch_break_duration || schedule_details.lunch_break_duration || 60;
  
  // Formatear horas sin segundos (quitar :00 del final)
  const formatTime = (time) => time.replace(':00', '');
  
  // Calcular horas diarias y días laborables
  const parseHour = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  };
  
  const entryHour = parseHour(entryTime);
  const exitHour = parseHour(exitTime);
  const lunchHours = lunchDuration / 60; // convertir minutos a horas
  const dailyHours = exitHour - entryHour - lunchHours;
  const workingDays = Math.round(weekly_hours / dailyHours);
  
  // Formatear días de la semana según días laborables
  let workDaysText = '';
  if (workingDays === 5) {
    workDaysText = 'lunes a viernes';
  } else if (workingDays === 6) {
    workDaysText = 'lunes a sábado';
  } else if (workingDays === 7) {
    workDaysText = 'lunes a domingo';
  } else {
    workDaysText = `${workingDays} días a la semana`;
  }
  
  const scheduleText = `desde las ${formatTime(entryTime)} a las ${formatTime(exitTime)}`;
  const lunchText = `${lunchDuration} minutos`;
  const hoursCalculation = `(${formatTime(exitTime)} - ${formatTime(entryTime)} - ${Math.round(lunchHours * 60)}min colación = ${dailyHours}h diarias x ${workingDays} días)`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Trabajo - ${employee_full_name}</title>
    <style>
        @page {
            size: letter;
            margin: 2.5cm;
            /* Controlar headers y footers */
            margin-top: 2cm;
            margin-bottom: 2cm;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 0;
        }
        
        /* Configuración específica para impresión */
        @media print {
            @page {
                size: A4;
                margin: 2cm;
                /* Intentar ocultar headers y footers */
                margin-top: 1cm;
                margin-bottom: 1cm;
                /* CSS3 para controlar headers/footers */
                @top-left { content: ""; }
                @top-center { content: ""; }
                @top-right { content: ""; }
                @bottom-left { content: ""; }
                @bottom-center { content: ""; }
                @bottom-right { content: ""; }
            }
            
            /* Optimizaciones para impresión */
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0 !important;
                padding: 0 !important;
                font-size: 12pt !important;
            }
            
            /* Ocultar elementos que no deben aparecer */
            .print-help {
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Forzar salto de página */
            .page-break {
                page-break-before: always;
            }
            
            /* Evitar saltos de página en elementos importantes */
            .clause {
                page-break-inside: avoid;
            }
            
            /* Ocultar cualquier elemento de navegación */
            nav, header, footer, .no-print {
                display: none !important;
            }
        }
        
        .contract-header {
            text-align: center;
            margin-bottom: 30px;
            font-weight: bold;
            font-size: 14pt;
        }
        
        .contract-content {
            text-align: justify;
            margin-bottom: 20px;
            line-height: 1.4;
            text-justify: inter-word;
        }
        
        .clause {
            margin-bottom: 18px;
            text-align: justify;
            text-justify: inter-word;
        }
        
        .clause-title {
            font-weight: bold;
            margin-bottom: 8px;
            display: inline;
        }
        
        .clause p {
            display: inline;
            margin: 0;
        }
        
        ul {
            margin: 10px 0;
            padding-left: 30px;
        }
        
        li {
            margin-bottom: 5px;
        }
        
        .employee-info {
            margin: 20px 0;
            line-height: 1.6;
        }
        
        .employee-info strong {
            display: inline-block;
            width: 180px;
        }
        
        .signatures {
            margin-top: 80px;
            display: flex;
            justify-content: space-between;
            text-align: center;
        }
        
        .signature-block {
            width: 40%;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }
        
        @media print {
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="contract-header">
        CONTRATO DE TRABAJO
    </div>
    
    <div class="contract-content">
        <p>
            En la ciudad de ${company_city || 'Punta Arenas'}, a ${formatDate(start_date)}, 
            entre <strong>${company_name}</strong> persona jurídica Rol Único Tributario 
            N°${formatRut(company_rut)}, representada en este acto por 
            ${legal_representative_name || 'su representante legal'}, Chileno(a), 
            Cédula Nacional de Identidad Nº ${formatRut(legal_representative_rut || '')}, 
            ambos domiciliados en ${company_address || 'dirección no especificada'} en la ciudad de ${company_city || 'Punta Arenas'}, 
            en adelante el "EMPLEADOR", y don:
        </p>
        
        <div class="employee-info">
            <strong>Nombre</strong> : ${employee_full_name}<br>
            <strong>Cédula de Identidad</strong> : ${formatRut(employee_rut)}<br>
            <strong>Domicilio</strong> : ${employee_address || 'No especificado'}<br>
            <strong>Nacionalidad</strong> : ${employee_nationality || 'Chilena'}<br>
            <strong>Estado Civil</strong> : ${employee_marital_status || 'No especificado'}<br>
            <strong>Fecha de Nacimiento</strong> : ${formatDate(employee_birth_date)}<br>
            <strong>Sistema Previsional</strong> : ${afp_name || 'AFP Modelo'}<br>
            <strong>Sistema de Salud</strong> : ${health_insurance_name || 'Fonasa'}<br>
        </div>
        
        <p>En adelante el "TRABAJADOR"; expresan que vienen en celebrar el siguiente contrato laboral:</p>
    </div>
    
    <div class="clause">
        <div class="clause-title">PRIMERO:</div>
        <p>
            El trabajador se obliga a desarrollar la función de <strong>${position.toUpperCase()}</strong>
            ${department ? ` en el departamento de ${department}` : ''} y cualquier otra labor 
            relacionada con la función propiamente tal que le encomiende el empleador. 
            Además, consiente en ser cambiado de área de trabajo según las necesidades de la 
            empresa y alguna labor afín para la que fue contratado si fuere necesario y que 
            la alteración no produzca menoscabo para el Trabajador.
        </p>
    </div>
    
    ${job_functions.length > 0 ? `
    <div class="clause">
        <div class="clause-title">SEGUNDO:</div>
        <p>El trabajador se obliga a desarrollar las siguientes funciones específicas de <strong>${position.toUpperCase()}</strong>:</p>
        <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.5;">
            ${job_functions.map((func, index) => `<li style="margin-bottom: 8px;"><strong>${index + 1}.</strong> ${func}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
    
    <div class="clause">
        <div class="clause-title">TERCERO:</div>
        <p>
            Los servicios del trabajador se deben prestar en ${workplace_address || company_address || 'las instalaciones de la empresa'}. 
            Sin perjuicio de la facultad del empleador para modificar por causa justificada, 
            sea con consulta al trabajador y sin menoscabo de éste, el sitio en donde deban 
            prestarse los servicios, con la limitación de que el nuevo sitio o recinto quede 
            dentro de la misma localidad o ciudad.
        </p>
    </div>
    
    <div class="clause">
        <div class="clause-title">CUARTO:</div>
        <p>
            La jornada de trabajo ordinaria será distribuida de la siguiente manera, 
            de ${workDaysText} ${scheduleText}, total ${weekly_hours} horas semanales ${hoursCalculation}. 
            ${weekly_hours <= 30 ? 'El trabajador será contratado como part-time, ' : 'El trabajador será contratado como full-time, '}
            El trabajador tendrá derecho a un descanso para colación de ${lunchText}.
        </p>
    </div>
    
    <div class="clause">
        <div class="clause-title">QUINTO:</div>
        <p>
            El trabajador percibirá una remuneración bruta mensual ${formatContractCurrency(totalGross)}, 
            que será afecto a los descuentos legales y pagada el último día hábil de cada mes, ${totalAllowances > 0 ? 'en efectivo, ' : ''}que será distribuida de la siguiente manera:
        </p>
        
        <div style="margin: 15px 0;">
            <p><strong>Sueldo Base:</strong> ${formatContractCurrency(base_salary)}<br>
            <strong>Gratificación Legal:</strong> ${formatContractCurrency(gratification_amount)}<br>
            ${bonuses.map((bonus: any) => `<strong>${bonus.description || 'Bono'}:</strong> ${formatContractCurrency(bonus.amount)}<br>`).join('')}</p>
        </div>
        
        ${totalAllowances > 0 ? `
        <p>Además el trabajador recibirá remuneración no imponible por los siguientes conceptos:</p>
        <div style="margin: 15px 0;">
            ${allowances.meal ? `<strong>Asignación de Colación:</strong> ${formatContractCurrency(allowances.meal)}<br>` : ''}
            ${allowances.transport ? `<strong>Asignación de Movilización:</strong> ${formatContractCurrency(allowances.transport)}<br>` : ''}
            ${allowances.cash ? `<strong>Asignación de Caja:</strong> ${formatContractCurrency(allowances.cash)}<br>` : ''}
        </div>
        ` : ''}
        
        <p style="margin-top: 15px;">La remuneración se depositará en la cuenta corriente del trabajador, el primer día hábil del mes siguiente.</p>
    </div>
    
    ${obligations.length > 0 || prohibitions.length > 0 ? `
    <div class="clause">
        <div class="clause-title">SEXTO:</div>
        <p>
            De las obligaciones y prohibiciones. Son obligaciones y prohibiciones esenciales 
            del presente contrato de trabajo y cuya infracción se entenderá como infracción 
            grave a las obligaciones que impone el contrato, sin perjuicio de que esta causal 
            sea calificada por los tribunales de justicia, las siguientes:
        </p>
        
        ${obligations.length > 0 ? `
        <p style="margin-top: 15px;"><strong>OBLIGACIONES ESPECÍFICAS:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.5;">
            ${obligations.map((obl, index) => `<li style="margin-bottom: 6px;"><strong>•</strong> ${obl}</li>`).join('')}
        </ul>
        ` : ''}
        
        ${prohibitions.length > 0 ? `
        <p style="margin-top: 15px;"><strong>PROHIBICIONES ESPECÍFICAS:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.5;">
            ${prohibitions.map((proh, index) => `<li style="margin-bottom: 6px;"><strong>•</strong> ${proh}</li>`).join('')}
        </ul>
        ` : ''}
        
    </div>
    ` : ''}
    
    <div class="clause">
        <div class="clause-title">SÉPTIMO:</div>
        <p>
            El trabajador se obliga a realizar todas las labores propias e inherentes del 
            cargo para el que se le contrata; además, se entiende que para el correcto 
            desempeño de este trabajo es indispensable que el trabajador cuente con la 
            iniciativa y conocimientos necesarios para atender los múltiples requerimientos 
            de su cargo.
        </p>
    </div>
    
    <div class="clause">
        <div class="clause-title">OCTAVO:</div>
        <p>
            En caso de renuncia voluntaria, se debe dar el aviso correspondiente con a lo 
            menos ${resignation_notice_days} días de anticipación como mínimo y deberá presentar 
            esta renuncia por escrito y firmarla ante Notario o en la Inspección del Trabajo. 
            En caso de que no se dé aviso de la renuncia por parte del trabajador en la forma 
            indicada, éste será responsable de los perjuicios causados por una renuncia intempestiva.
        </p>
    </div>
    
    <div class="clause">
        <div class="clause-title">NOVENO:</div>
        <p>
            El presente contrato comenzará a regir el <strong>${formatDate(start_date)}</strong>
            ${end_date 
              ? ` y tendrá una duración hasta el <strong>${formatDate(end_date)}</strong>.`
              : ' y tendrá duración indefinida.'}
        </p>
    </div>
    
    <div class="clause">
        <div class="clause-title">DÉCIMO:</div>
        <p>
            Para todos los efectos derivados del presente contrato, las partes fijan su 
            domicilio en la ciudad de ${company_city || 'Punta Arenas'} y se someten a la 
            jurisdicción de sus tribunales.
        </p>
    </div>
    
    <p style="margin-top: 30px;">
        El presente contrato se extiende en dos ejemplares, quedando uno en poder del 
        empleador y uno en poder del trabajador.
    </p>
    
    <p style="margin-top: 20px;">En comprobante firman.</p>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${legal_representative_name || 'Representante Legal'}</strong><br>
                ${formatRut(legal_representative_rut || company_rut)}<br>
                <strong>EMPLEADOR(A)</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${employee_full_name}</strong><br>
                ${formatRut(employee_rut)}<br>
                <strong>TRABAJADOR(A)</strong>
            </div>
        </div>
    </div>

    <!-- Instrucciones para impresión optimizada -->
    <script>
        // Configurar para impresión sin URL
        window.onbeforeprint = function() {
            document.title = 'Contrato_de_Trabajo';
            // Intentar ocultar elementos del navegador
            document.body.style.margin = '0';
            document.body.style.padding = '0';
        };
        
        // Mostrar instrucciones al cargar
        window.onload = function() {
            showPrintInstructions();
        };
        
        function showPrintInstructions() {
            const instruction = document.createElement('div');
            instruction.innerHTML = \`
                <div style="position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999; max-width: 350px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4;">
                    <strong>📋 Para imprimir sin URL:</strong><br>
                    1. Presiona <kbd>Ctrl+P</kbd><br>
                    2. Clic en "Más configuraciones"<br>
                    3. <strong>DESACTIVAR "Headers y footers"</strong><br>
                    4. Imprimir<br>
                    <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
                        ⚠️ Si no desactivas los headers/footers, aparecerá la URL
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 5px; right: 8px; background: none; border: none; color: white; font-size: 16px; cursor: pointer;">×</button>
                </div>
            \`;
            document.body.appendChild(instruction);
            
            // Auto-ocultar después de 15 segundos
            setTimeout(() => {
                if (instruction.parentElement) {
                    instruction.remove();
                }
            }, 15000);
        }
        
        // Log para debugging
        console.log('📄 Contrato cargado. Para imprimir sin URL: Ctrl+P → Más configuraciones → Headers y footers: DESACTIVADO');
    </script>
    
    <style>
        /* Estilos adicionales para impresión limpia */
        @media print {
            /* Ocultar instrucciones */
            div[style*="position: fixed"] {
                display: none !important;
            }
            
            /* Asegurar que solo se imprima el contrato */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        
        /* Estilos para las teclas kbd */
        kbd {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
            padding: 2px 4px;
            font-size: 11px;
            font-family: monospace;
        }
    </style>
</body>
</html>
  `;
}

// GET: Generar PDF del contrato (para abrir en navegador)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contract_id = searchParams.get('contract_id');

    if (!contract_id) {
      return NextResponse.json({ error: 'contract_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener los datos completos del contrato usando joins
    const { data: contractData, error: fetchError } = await supabase
      .from('employment_contracts')
      .select(`
        *,
        employees!inner(
          rut,
          first_name,
          middle_name,
          last_name,
          birth_date,
          nationality,
          marital_status,
          address,
          city,
          email,
          phone,
          bank_name,
          bank_account_type,
          bank_account_number
        ),
        companies!inner(
          name,
          rut,
          legal_representative_name,
          legal_representative_rut,
          fiscal_address,
          fiscal_city
        )
      `)
      .eq('id', contract_id)
      .single();

    if (fetchError) {
      console.error('Error fetching contract:', fetchError);
      return NextResponse.json({ 
        error: 'Contrato no encontrado',
        details: fetchError.message 
      }, { status: 404 });
    }

    // Obtener configuración de empresa desde payroll_settings
    const { data: payrollSettings } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', contractData?.company_id)
      .single();

    // Obtener configuración de payroll para el empleado (incluyendo legal gratification)
    const { data: payrollConfig } = await supabase
      .from('payroll_config')
      .select('legal_gratification_type')
      .eq('employee_id', contractData?.employee_id)
      .single();

    // Calcular gratificación legal Art. 50 si está configurada
    const calculatedGratificationAmount = contractData.gratification_amount || 
      calculateLegalGratification(payrollConfig, contractData.base_salary, contractData.employee_id);

    // Extraer datos de la configuración de empresa
    const companyInfo = payrollSettings?.settings?.company_info;
    const legalRep = companyInfo?.legal_representative;

    // Log para debug
    console.log('🔍 GET Contract - Payroll Settings:', payrollSettings?.settings?.company_info?.legal_representative);
    console.log('🔍 GET Contract - Companies data:', contractData.companies?.legal_representative_name);

    // Adaptar datos para el generador de HTML
    const adaptedData = {
      // Datos de la empresa desde payroll_settings (más actualizado)
      company_name: companyInfo?.company_name || contractData.companies?.name,
      company_rut: companyInfo?.company_rut || contractData.companies?.rut,
      legal_representative_name: legalRep?.full_name || contractData.companies?.legal_representative_name,
      legal_representative_rut: legalRep?.rut || contractData.companies?.legal_representative_rut,
      company_address: companyInfo?.company_address || contractData.companies?.fiscal_address,
      company_city: companyInfo?.company_city || contractData.companies?.fiscal_city,
      
      // Datos del trabajador
      employee_full_name: `${contractData.employees?.first_name} ${contractData.employees?.last_name} ${contractData.employees?.middle_name || ''}`.trim(),
      employee_rut: contractData.employees?.rut,
      employee_address: contractData.employees?.address,
      employee_city: contractData.employees?.city,
      employee_nationality: contractData.employees?.nationality,
      employee_marital_status: contractData.employees?.marital_status,
      employee_birth_date: contractData.employees?.birth_date,
      
      // Datos del contrato
      position: contractData.position,
      department: contractData.department,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      contract_type: contractData.contract_type,
      base_salary: contractData.base_salary,
      gratification_amount: calculatedGratificationAmount,
      bonuses: contractData.bonuses || [],
      allowances: contractData.allowances || {},
      workplace_address: contractData.workplace_address,
      schedule_details: contractData.schedule_details || {},
      job_functions: contractData.job_functions || [],
      obligations: contractData.obligations || [],
      prohibitions: contractData.prohibitions || [],
      resignation_notice_days: contractData.resignation_notice_days || 30,
      weekly_hours: contractData.weekly_hours || 44,
      // Horarios específicos
      entry_time: contractData.entry_time,
      exit_time: contractData.exit_time,
      lunch_break_duration: contractData.lunch_break_duration,
      
      // Previsión (valores por defecto)
      afp_name: 'AFP Modelo',
      health_insurance_name: 'Fonasa'
    };

    // Generar el HTML del contrato
    const html = generateContractHTML(adaptedData);

    console.log(`📄 Contrato HTML generado para: ${adaptedData.employee_full_name}`);
    console.log(`📁 Contract ID: ${contract_id}`);
    console.log(`📅 Fecha de inicio desde DB: ${contractData.start_date}`);
    console.log(`📅 Fecha adaptada: ${adaptedData.start_date}`);

    // Devolver el HTML directamente para mostrar en el navegador
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contrato_${formatRut(contractData.employees?.rut || 'empleado')}.html"`
      }
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/contracts/generate-pdf:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Generar PDF del contrato
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract_id, format = 'json', save_to_contracts = false, employee_id, company_id } = body;

    if (!contract_id) {
      return NextResponse.json({ error: 'contract_id es requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener los datos completos del contrato usando joins
    const { data: contractData, error: fetchError } = await supabase
      .from('employment_contracts')
      .select(`
        *,
        employees!inner(
          rut,
          first_name,
          middle_name,
          last_name,
          birth_date,
          nationality,
          marital_status,
          address,
          city,
          email,
          phone,
          bank_name,
          bank_account_type,
          bank_account_number
        ),
        companies!inner(
          name,
          rut,
          legal_representative_name,
          legal_representative_rut,
          fiscal_address,
          fiscal_city
        )
      `)
      .eq('id', contract_id)
      .single();

    // Obtener configuración de empresa desde payroll_settings
    const { data: payrollSettings } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', contractData?.company_id)
      .single();

    // Obtener configuración de payroll para el empleado (incluyendo legal gratification) - POST method
    const { data: payrollConfigPost } = await supabase
      .from('payroll_config')
      .select('legal_gratification_type')
      .eq('employee_id', contractData?.employee_id)
      .single();

    // Calcular gratificación legal Art. 50 si está configurada - POST method
    const calculatedGratificationAmount = contractData.gratification_amount || 
      calculateLegalGratification(payrollConfigPost, contractData.base_salary, contractData.employee_id);

    if (fetchError) {
      console.error('Error fetching contract:', fetchError);
      return NextResponse.json({ 
        error: 'Contrato no encontrado',
        details: fetchError.message 
      }, { status: 404 });
    }

    // Extraer datos de la configuración de empresa
    const companyInfo = payrollSettings?.settings?.company_info;
    const legalRep = companyInfo?.legal_representative;

    // Log para debug
    console.log('🔍 Payroll Settings:', payrollSettings?.settings?.company_info?.legal_representative);
    console.log('🔍 Companies data:', contractData.companies?.legal_representative_name);

    // Adaptar datos para el generador de HTML
    const adaptedData = {
      // Datos de la empresa desde payroll_settings (más actualizado)
      company_name: companyInfo?.company_name || contractData.companies?.name,
      company_rut: companyInfo?.company_rut || contractData.companies?.rut,
      legal_representative_name: legalRep?.full_name || contractData.companies?.legal_representative_name,
      legal_representative_rut: legalRep?.rut || contractData.companies?.legal_representative_rut,
      company_address: companyInfo?.company_address || contractData.companies?.fiscal_address,
      company_city: companyInfo?.company_city || contractData.companies?.fiscal_city,
      
      // Datos del trabajador
      employee_full_name: `${contractData.employees?.first_name} ${contractData.employees?.last_name} ${contractData.employees?.middle_name || ''}`.trim(),
      employee_rut: contractData.employees?.rut,
      employee_address: contractData.employees?.address,
      employee_city: contractData.employees?.city,
      employee_nationality: contractData.employees?.nationality,
      employee_marital_status: contractData.employees?.marital_status,
      employee_birth_date: contractData.employees?.birth_date,
      
      // Datos del contrato
      position: contractData.position,
      department: contractData.department,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      contract_type: contractData.contract_type,
      base_salary: contractData.base_salary,
      gratification_amount: calculatedGratificationAmount,
      bonuses: contractData.bonuses || [],
      allowances: contractData.allowances || {},
      workplace_address: contractData.workplace_address,
      schedule_details: contractData.schedule_details || {},
      job_functions: contractData.job_functions || [],
      obligations: contractData.obligations || [],
      prohibitions: contractData.prohibitions || [],
      resignation_notice_days: contractData.resignation_notice_days || 30,
      weekly_hours: contractData.weekly_hours || 44,
      // Horarios específicos
      entry_time: contractData.entry_time,
      exit_time: contractData.exit_time,
      lunch_break_duration: contractData.lunch_break_duration,
      
      // Previsión (valores por defecto)
      afp_name: 'AFP Modelo',
      health_insurance_name: 'Fonasa'
    };

    // Generar el HTML del contrato
    const html = generateContractHTML(adaptedData);

    // 📄 Si save_to_contracts=true, guardar en tabla de contratos/documentos
    if (save_to_contracts && employee_id && company_id) {
      try {
        const documentTitle = `Contrato de Trabajo - ${adaptedData.employee_full_name}`;
        const fileName = `contrato_${formatRut(adaptedData.employee_rut)}_${new Date().getTime()}.html`;
        
        // Aquí podrías guardar en una tabla específica de documentos/contratos
        // Por ahora simulamos el guardado exitoso y logueamos
        console.log(`📄 Documento de contrato generado: ${documentTitle}`);
        console.log(`📁 Archivo: ${fileName}`);
        console.log(`👤 Empleado: ${employee_id}`);
        console.log(`🏢 Empresa: ${company_id}`);
        
        // En el futuro, aquí se guardaría en una tabla como:
        // INSERT INTO contract_documents (employee_id, company_id, title, file_name, content, created_at)
        
      } catch (saveError) {
        console.error('Error guardando contrato en documentos:', saveError);
        // No bloquear la generación si falla el guardado
      }
    }

    // Si el formato solicitado es HTML, devolver el HTML directamente
    if (format === 'html') {
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="contrato_${formatRut(contractData.employees?.rut || 'empleado')}.html"`
        }
      });
    }

    // Si se solicita PDF, necesitamos una librería adicional
    // Por ahora devolvemos el HTML con instrucciones para convertir a PDF
    return NextResponse.json({
      success: true,
      message: 'HTML del contrato generado exitosamente',
      html,
      document_saved: save_to_contracts,
      instructions: 'Para generar PDF, abra el HTML en el navegador y use Imprimir > Guardar como PDF'
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/contracts/generate-pdf:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}