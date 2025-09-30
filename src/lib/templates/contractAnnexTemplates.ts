// Templates de Anexos Contractuales para empleados

export interface AnnexData {
  // Datos del empleado
  employeeName: string;
  employeeRut: string;
  employeeAddress?: string;
  employeePosition: string;
  employeeDepartment?: string;
  
  // Datos de la empresa
  companyName: string;
  companyRut: string;
  companyAddress?: string;
  legalRepresentativeName: string;
  legalRepresentativeRut: string;
  
  // Datos del contrato original
  originalContractDate: string;
  currentSalary: number;
  
  // Datos específicos del anexo
  annexDate: string;
  annexType: 'renovation' | 'night_shift' | 'vacation' | 'salary_change' | 'position_change' | 'schedule_change' | 'overtime_agreement';
  
  // Datos para renovación
  renovationType?: 'fixed_term' | 'indefinite';
  newEndDate?: string; // Solo para plazo fijo
  renovationReason?: string;
  
  // Datos para trabajo nocturno
  nightShiftPercentage?: number; // Recargo nocturno (20% por defecto)
  nightShiftStartTime?: string;
  nightShiftEndTime?: string;
  nightShiftDays?: string[];
  
  // Datos para feriado/vacaciones
  vacationStartDate?: string;
  vacationEndDate?: string;
  vacationDays?: number;
  vacationReason?: string;
  pendingVacationDays?: number;
  
  // Datos para pacto de horas extras
  overtimePercentage?: number; // Recargo de horas extras (50% por defecto)
  overtimeDuration?: number; // Duración en meses
  overtimeMaxHours?: number; // Máximo horas extras semanales
  overtimeJustification?: string;
  
  // Cambios generales
  newSalary?: number;
  newPosition?: string;
  newDepartment?: string;
  newSchedule?: string;
  effectiveDate?: string;
  
  // Adicionales
  additionalClauses?: string[];
  observations?: string;
}

// Función helper para formatear RUT
function formatRut(rut: string): string {
  if (!rut) return '';
  const cleanRut = rut.replace(/[.-]/g, '');
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

// Función para limpiar caracteres especiales
function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

// Función helper para formatear fecha
function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  // Parsear la fecha asegurándose de usar zona horaria local
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day); // month - 1 porque los meses en JS son 0-indexados
  
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const dayFormatted = date.getDate();
  const monthFormatted = months[date.getMonth()];
  const yearFormatted = date.getFullYear();
  
  return `${dayFormatted} de ${monthFormatted} de ${yearFormatted}`;
}

// Función helper para formatear moneda
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Template: Anexo de Renovación de Contrato
export function generateRenovationAnnex(data: AnnexData): string {
  const isIndefinite = data.renovationType === 'indefinite';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Anexo de Renovación de Contrato - ${data.employeeName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            font-size: 12pt;
        }
        h1 { 
            text-align: center; 
            font-size: 14pt;
            margin-bottom: 30px;
        }
        .content { 
            text-align: justify;
            margin-bottom: 20px;
        }
        .signatures {
            margin-top: 100px;
            display: flex;
            justify-content: space-between;
        }
        .signature-block {
            text-align: center;
            width: 40%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }
        @media print {
            body { margin: 20mm; }
        }
    </style>
</head>
<body>
    <h1>ANEXO DE RENOVACIÓN DE CONTRATO DE TRABAJO</h1>
    
    <div class="content">
        <p>En ${data.companyAddress || 'la ciudad'}, a ${formatDate(data.annexDate)}, entre <strong>${data.companyName}</strong>, 
        RUT ${formatRut(data.companyRut)}, representada por don(ña) <strong>${data.legalRepresentativeName}</strong>, 
        RUT ${formatRut(data.legalRepresentativeRut)}, en adelante "el empleador", y don(ña) <strong>${data.employeeName}</strong>, 
        RUT ${formatRut(data.employeeRut)}, en adelante "el trabajador", han acordado el siguiente anexo de contrato:</p>
        
        <p><strong>PRIMERO:</strong> Las partes dejan constancia que con fecha ${formatDate(data.originalContractDate)} 
        suscribieron un contrato de trabajo ${data.renovationType === 'fixed_term' ? 'a plazo fijo' : ''}, 
        en virtud del cual el trabajador presta servicios como <strong>${data.employeePosition}</strong>.</p>
        
        <p><strong>SEGUNDO:</strong> Por el presente instrumento, las partes acuerdan ${isIndefinite ? 
          'modificar el contrato de trabajo, transformándolo en un <strong>CONTRATO INDEFINIDO</strong>, a contar del ' + formatDate(data.effectiveDate || data.annexDate) :
          'renovar el contrato de trabajo a plazo fijo por el período comprendido entre el ' + formatDate(data.effectiveDate || data.annexDate) + 
          ' y el ' + formatDate(data.newEndDate || '')}, manteniendo todas las demás condiciones establecidas en el contrato original.</p>
        
        ${data.renovationReason ? `
        <p><strong>TERCERO:</strong> La renovación del contrato se fundamenta en: ${data.renovationReason}</p>
        ` : ''}
        
        ${data.newSalary && data.newSalary !== data.currentSalary ? `
        <p><strong>${data.renovationReason ? 'CUARTO' : 'TERCERO'}:</strong> A contar de la fecha de este anexo, 
        la remuneración del trabajador será de ${formatCurrency(data.newSalary)} mensuales brutos.</p>
        ` : ''}
        
        <p><strong>${data.renovationReason ? (data.newSalary ? 'QUINTO' : 'CUARTO') : 'TERCERO'}:</strong> 
        En todo lo no modificado por el presente anexo, continúan vigentes las estipulaciones del contrato original.</p>
        
        ${data.observations ? `
        <p><strong>OBSERVACIONES:</strong> ${cleanText(data.observations)}</p>
        ` : ''}
        
        <p>Para constancia, firman las partes en dos ejemplares, quedando uno en poder de cada una de ellas.</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.legalRepresentativeName}</strong><br>
                ${formatRut(data.legalRepresentativeRut)}<br>
                <strong>EMPLEADOR</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.employeeName}</strong><br>
                ${formatRut(data.employeeRut)}<br>
                <strong>TRABAJADOR</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Template: Pacto de Trabajo Nocturno
export function generateNightShiftAnnex(data: AnnexData): string {
  const nightBonus = data.nightShiftPercentage || 20;
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Pacto de Trabajo Nocturno - ${data.employeeName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            font-size: 12pt;
        }
        h1 { 
            text-align: center; 
            font-size: 14pt;
            margin-bottom: 30px;
        }
        .content { 
            text-align: justify;
            margin-bottom: 20px;
        }
        .signatures {
            margin-top: 100px;
            display: flex;
            justify-content: space-between;
        }
        .signature-block {
            text-align: center;
            width: 40%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }
        @media print {
            body { margin: 20mm; }
        }
    </style>
</head>
<body>
    <h1>PACTO DE TRABAJO EN HORARIO NOCTURNO</h1>
    
    <div class="content">
        <p>En ${data.companyAddress || 'la ciudad'}, a ${formatDate(data.annexDate)}, entre <strong>${data.companyName}</strong>, 
        RUT ${formatRut(data.companyRut)}, representada por don(ña) <strong>${data.legalRepresentativeName}</strong>, 
        RUT ${formatRut(data.legalRepresentativeRut)}, en adelante "el empleador", y don(ña) <strong>${data.employeeName}</strong>, 
        RUT ${formatRut(data.employeeRut)}, en adelante "el trabajador", han acordado el siguiente pacto:</p>
        
        <p><strong>PRIMERO:</strong> El trabajador que se desempeña como <strong>${data.employeePosition}</strong>, 
        acepta voluntariamente realizar trabajo en horario nocturno, de acuerdo a las necesidades operacionales de la empresa.</p>
        
        <p><strong>SEGUNDO:</strong> Se entenderá por trabajo nocturno aquel que se ejecuta entre las 
        ${data.nightShiftStartTime || '21:00'} horas y las ${data.nightShiftEndTime || '07:00'} horas.</p>
        
        <p><strong>TERCERO:</strong> El horario nocturno se desarrollará ${data.nightShiftDays?.length ? 
          'los días ' + data.nightShiftDays.join(', ') : 'según los turnos rotativos establecidos por la empresa'}.</p>
        
        <p><strong>CUARTO:</strong> Por el trabajo en horario nocturno, el trabajador percibirá un recargo del 
        <strong>${nightBonus}%</strong> sobre el valor de la hora ordinaria, el cual se pagará junto con la remuneración mensual.</p>
        
        <p><strong>QUINTO:</strong> El empleador se compromete a cumplir con todas las normas de seguridad y salud 
        ocupacional aplicables al trabajo nocturno, incluyendo:</p>
        <ul>
            <li>Proporcionar iluminación adecuada en todas las áreas de trabajo</li>
            <li>Garantizar transporte seguro al término de la jornada nocturna</li>
            <li>Establecer pausas de descanso según la normativa vigente</li>
            <li>Realizar evaluaciones médicas periódicas al trabajador</li>
        </ul>
        
        <p><strong>SEXTO:</strong> Este pacto tendrá vigencia a contar del ${formatDate(data.effectiveDate || data.annexDate)} 
        y se mantendrá vigente mientras subsistan las condiciones que lo hicieron procedente.</p>
        
        <p><strong>SÉPTIMO:</strong> Cualquiera de las partes podrá poner término a este pacto con un aviso previo de 
        30 días, volviendo el trabajador a su horario habitual.</p>
        
        ${data.observations ? `
        <p><strong>OBSERVACIONES:</strong> ${cleanText(data.observations)}</p>
        ` : ''}
        
        <p>Para constancia, firman las partes en dos ejemplares, quedando uno en poder de cada una de ellas.</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.legalRepresentativeName}</strong><br>
                ${formatRut(data.legalRepresentativeRut)}<br>
                <strong>EMPLEADOR</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.employeeName}</strong><br>
                ${formatRut(data.employeeRut)}<br>
                <strong>TRABAJADOR</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Template: Pacto de Horas Extras
export function generateOvertimeAgreementAnnex(data: AnnexData): string {
  const overtimePercentage = data.overtimePercentage || 50;
  const overtimeDuration = data.overtimeDuration || 3;
  const overtimeMaxHours = data.overtimeMaxHours || 10;
  
  // Calcular fecha de término del pacto (meses cerrados)
  const startDate = new Date(data.effectiveDate || data.annexDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + overtimeDuration);
  // Ajustar al último día del mes
  endDate.setDate(0); // Esto lo lleva al último día del mes anterior
  endDate.setMonth(endDate.getMonth() + 1); // Y luego al último día del mes correcto
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Pacto de Horas Extras - ${data.employeeName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            font-size: 12pt;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            font-weight: bold; 
        }
        .company-info { 
            margin-bottom: 20px; 
            text-align: center;
        }
        .content { 
            text-align: justify; 
            margin-bottom: 30px; 
        }
        .content p { 
            margin: 15px 0; 
        }
        .signatures { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 80px; 
        }
        .signature-block { 
            text-align: center; 
            width: 45%; 
        }
        .signature-line { 
            border-top: 2px solid #000; 
            margin-top: 60px; 
            padding-top: 10px;
        }
        .highlight { 
            background-color: #fffacd; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        .legal-ref {
            font-style: italic;
            color: #666;
            font-size: 10pt;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ANEXO CONTRACTUAL</h1>
        <h2>PACTO DE HORAS EXTRAORDINARIAS</h2>
        <p class="subtitle">Artículo 32 del Código del Trabajo</p>
    </div>
    
    <div class="content">
        <p>En ${data.companyAddress || 'Las Malvas 2775'}, a ${formatDate(data.annexDate)}, entre ${data.companyName}, 
        RUT ${formatRut(data.companyRut)}, representada por don(ña) <strong>${data.legalRepresentativeName}</strong>, 
        RUT ${formatRut(data.legalRepresentativeRut)}, en adelante "el empleador", y don(ña) 
        <strong>${data.employeeName}</strong>, RUT ${formatRut(data.employeeRut)}, en adelante "el trabajador", 
        han acordado el siguiente anexo de contrato:</p>
        
        <p><strong>PRIMERO:</strong> Las partes dejan constancia que con fecha ${formatDate(data.originalContractDate)} 
        suscribieron un contrato de trabajo, en virtud del cual el trabajador presta servicios como <strong>${data.employeePosition}</strong>${data.employeeDepartment ? ` en el departamento de ${data.employeeDepartment}` : ''}.</p>
        
        <p><strong>SEGUNDO:</strong> Por las necesidades del servicio y la naturaleza de las funciones desempeñadas, 
        las partes acuerdan establecer un <strong>PACTO DE HORAS EXTRAORDINARIAS</strong> con las siguientes condiciones:</p>
        
        <p><strong>TERCERO:</strong> Las horas extraordinarias se pagarán con un recargo del 
        <strong>${overtimePercentage}%</strong> sobre el valor de la hora ordinaria, conforme a lo establecido 
        en el artículo 32 del Código del Trabajo.</p>
        
        <p><strong>CUARTO:</strong> El trabajador no podrá realizar más de <strong>${overtimeMaxHours} horas extraordinarias 
        por semana</strong>, respetando el límite legal de 2 horas diarias establecido en el artículo 31 del Código del Trabajo.</p>
        
        <p><strong>QUINTO:</strong> La justificación del presente pacto se fundamenta en: 
        ${data.overtimeJustification || 'las necesidades operacionales de la empresa y el aumento temporal de la demanda de servicios'}.</p>
        
        <p><strong>SEXTO:</strong> Este pacto tendrá vigencia desde el ${formatDate(data.effectiveDate || data.annexDate)} 
        hasta el ${formatDate(endDate.toISOString().split('T')[0])}, es decir, por un período de <strong>${overtimeDuration} meses</strong>.</p>
        
        <p><strong>SÉPTIMO:</strong> El trabajador autoriza expresamente al empleador para distribuir las horas extraordinarias 
        según las necesidades del servicio, con previo aviso cuando las circunstancias lo permitan.</p>
        
        <p><strong>OCTAVO:</strong> Las horas extraordinarias trabajadas se liquidarán mensualmente junto con la remuneración, 
        indicándose claramente en la liquidación de sueldo la cantidad de horas y el recargo aplicado.</p>
        
        ${data.observations ? `
        <p><strong>NOVENO:</strong> ${cleanText(data.observations)}</p>
        
        <p><strong>DÉCIMO:</strong> En todo lo no modificado por el presente anexo, continúan vigentes las estipulaciones del contrato original.</p>
        ` : `
        <p><strong>NOVENO:</strong> En todo lo no modificado por el presente anexo, continúan vigentes las estipulaciones del contrato original.</p>
        `}
        
        <p>Para constancia, firman las partes en dos ejemplares, quedando uno en poder de cada una de ellas.</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.legalRepresentativeName}</strong><br>
                ${formatRut(data.legalRepresentativeRut)}<br>
                <strong>EMPLEADOR</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.employeeName}</strong><br>
                ${formatRut(data.employeeRut)}<br>
                <strong>TRABAJADOR</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Template: Comprobante de Feriado Legal
export function generateVacationCertificate(data: AnnexData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Feriado Legal - ${data.employeeName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            font-size: 12pt;
        }
        h1 { 
            text-align: center; 
            font-size: 14pt;
            margin-bottom: 30px;
        }
        .content { 
            text-align: justify;
            margin-bottom: 20px;
        }
        .info-box {
            border: 1px solid #000;
            padding: 15px;
            margin: 20px 0;
        }
        .signatures {
            margin-top: 100px;
            display: flex;
            justify-content: space-between;
        }
        .signature-block {
            text-align: center;
            width: 40%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }
        @media print {
            body { margin: 20mm; }
        }
    </style>
</head>
<body>
    <h1>COMPROBANTE DE FERIADO LEGAL</h1>
    
    <div class="content">
        <p>Por medio del presente documento, se deja constancia que don(ña) <strong>${data.employeeName}</strong>, 
        RUT ${formatRut(data.employeeRut)}, quien se desempeña como <strong>${data.employeePosition}</strong> 
        ${data.employeeDepartment ? `en el departamento de ${data.employeeDepartment}` : ''} 
        de la empresa <strong>${data.companyName}</strong>, RUT ${formatRut(data.companyRut)}, 
        hará uso de su feriado legal correspondiente.</p>
        
        <div class="info-box">
            <p><strong>DETALLE DEL FERIADO:</strong></p>
            <p>• <strong>Fecha de inicio:</strong> ${formatDate(data.vacationStartDate || '')}</p>
            <p>• <strong>Fecha de término:</strong> ${formatDate(data.vacationEndDate || '')}</p>
            <p>• <strong>Total días hábiles:</strong> ${data.vacationDays || 0} días</p>
            <p>• <strong>Fecha de reintegro:</strong> ${formatDate(data.vacationEndDate || '')}</p>
            ${data.pendingVacationDays ? `
            <p>• <strong>Días pendientes después de este período:</strong> ${data.pendingVacationDays} días</p>
            ` : ''}
        </div>
        
        ${data.vacationReason && data.vacationReason !== 'Feriado legal' ? `
        <p><strong>MOTIVO:</strong> ${data.vacationReason}</p>
        ` : ''}
        
        <p><strong>IMPORTANTE:</strong></p>
        <ul>
            <li>El trabajador deberá reintegrarse a sus labores el día ${formatDate(data.vacationEndDate || '')}.</li>
            <li>Durante el período de feriado, el trabajador mantendrá su remuneración íntegra.</li>
            <li>Este período se considera como efectivamente trabajado para todos los efectos legales.</li>
        </ul>
        
        <p>El trabajador declara estar en conocimiento de las fechas señaladas y se compromete a reintegrarse 
        en la fecha indicada.</p>
        
        ${data.observations ? `
        <p><strong>OBSERVACIONES:</strong> ${cleanText(data.observations)}</p>
        ` : ''}
        
        <p>Se extiende el presente comprobante en dos ejemplares, quedando uno en poder del empleador y 
        otro en poder del trabajador.</p>
        
        <p><strong>Fecha de emisión:</strong> ${formatDate(data.annexDate)}</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.legalRepresentativeName}</strong><br>
                ${formatRut(data.legalRepresentativeRut)}<br>
                <strong>EMPLEADOR</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.employeeName}</strong><br>
                ${formatRut(data.employeeRut)}<br>
                <strong>TRABAJADOR</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Template: Anexo de Cambio de Condiciones
export function generateChangeAnnex(data: AnnexData): string {
  const changes = [];
  
  if (data.newSalary && data.newSalary !== data.currentSalary) {
    changes.push(`Remuneración: De ${formatCurrency(data.currentSalary)} a ${formatCurrency(data.newSalary)}`);
  }
  if (data.newPosition) {
    changes.push(`Cargo: De ${data.employeePosition} a ${data.newPosition}`);
  }
  if (data.newDepartment) {
    changes.push(`Departamento: De ${data.employeeDepartment || 'N/A'} a ${data.newDepartment}`);
  }
  if (data.newSchedule) {
    changes.push(`Horario: ${data.newSchedule}`);
  }
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Anexo de Modificación Contractual - ${data.employeeName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            font-size: 12pt;
        }
        h1 { 
            text-align: center; 
            font-size: 14pt;
            margin-bottom: 30px;
        }
        .content { 
            text-align: justify;
            margin-bottom: 20px;
        }
        .changes-box {
            border: 1px solid #000;
            padding: 15px;
            margin: 20px 0;
        }
        .signatures {
            margin-top: 100px;
            display: flex;
            justify-content: space-between;
        }
        .signature-block {
            text-align: center;
            width: 40%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 5px;
        }
        @media print {
            body { margin: 20mm; }
        }
    </style>
</head>
<body>
    <h1>ANEXO DE MODIFICACIÓN DE CONTRATO DE TRABAJO</h1>
    
    <div class="content">
        <p>En ${data.companyAddress || 'la ciudad'}, a ${formatDate(data.annexDate)}, entre <strong>${data.companyName}</strong>, 
        RUT ${formatRut(data.companyRut)}, representada por don(ña) <strong>${data.legalRepresentativeName}</strong>, 
        RUT ${formatRut(data.legalRepresentativeRut)}, en adelante "el empleador", y don(ña) <strong>${data.employeeName}</strong>, 
        RUT ${formatRut(data.employeeRut)}, en adelante "el trabajador", han acordado las siguientes modificaciones al contrato de trabajo:</p>
        
        <p><strong>PRIMERO:</strong> Las partes dejan constancia que con fecha ${formatDate(data.originalContractDate)} 
        suscribieron un contrato de trabajo que se encuentra vigente a la fecha.</p>
        
        <p><strong>SEGUNDO:</strong> Por el presente instrumento, las partes acuerdan modificar las siguientes condiciones del contrato original:</p>
        
        <div class="changes-box">
            <p><strong>MODIFICACIONES ACORDADAS:</strong></p>
            <ul>
                ${changes.map(change => `<li>${change}</li>`).join('\n')}
            </ul>
            ${data.effectiveDate ? `
            <p><strong>Fecha de vigencia:</strong> ${formatDate(data.effectiveDate)}</p>
            ` : ''}
        </div>
        
        ${data.additionalClauses && data.additionalClauses.length > 0 ? `
        <p><strong>TERCERO:</strong> Cláusulas adicionales:</p>
        <ul>
            ${data.additionalClauses.map(clause => `<li>${clause}</li>`).join('\n')}
        </ul>
        ` : ''}
        
        <p><strong>${data.additionalClauses?.length ? 'CUARTO' : 'TERCERO'}:</strong> 
        En todo lo no modificado por el presente anexo, continúan vigentes las estipulaciones del contrato original 
        y sus anexos anteriores si los hubiere.</p>
        
        <p><strong>${data.additionalClauses?.length ? 'QUINTO' : 'CUARTO'}:</strong> 
        El trabajador declara aceptar expresamente las modificaciones acordadas.</p>
        
        ${data.observations ? `
        <p><strong>OBSERVACIONES:</strong> ${cleanText(data.observations)}</p>
        ` : ''}
        
        <p>Para constancia, firman las partes en dos ejemplares de igual tenor y valor, 
        quedando uno en poder de cada una de ellas.</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.legalRepresentativeName}</strong><br>
                ${formatRut(data.legalRepresentativeRut)}<br>
                <strong>EMPLEADOR</strong>
            </div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line">
                <strong>${data.employeeName}</strong><br>
                ${formatRut(data.employeeRut)}<br>
                <strong>TRABAJADOR</strong>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Función principal para generar cualquier tipo de anexo
export function generateAnnex(data: AnnexData): string {
  switch (data.annexType) {
    case 'renovation':
      return generateRenovationAnnex(data);
    case 'night_shift':
      return generateNightShiftAnnex(data);
    case 'overtime_agreement':
      return generateOvertimeAgreementAnnex(data);
    case 'vacation':
      return generateVacationCertificate(data);
    case 'salary_change':
    case 'position_change':
    case 'schedule_change':
      return generateChangeAnnex(data);
    default:
      throw new Error(`Tipo de anexo no válido: ${data.annexType}`);
  }
}