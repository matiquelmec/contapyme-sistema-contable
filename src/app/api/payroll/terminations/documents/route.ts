import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection, isSupabaseConfigured } from '@/lib/database/databaseSimple';
import { SettlementCalculator } from '@/lib/services/settlementCalculator';

// GET - Obtener información sobre documentos disponibles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Return available document types and their status
    return NextResponse.json({
      success: true,
      data: {
        available_documents: [
          {
            type: 'notice_letter',
            name: 'Carta de Aviso',
            description: 'Carta de aviso previo según normativa laboral'
          },
          {
            type: 'settlement',
            name: 'Finiquito',
            description: 'Documento de finiquito con cálculos completos'
          }
        ],
        message: 'Documentos disponibles para generar'
      }
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/terminations/documents:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Generar documentos de finiquito (carta aviso o finiquito)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Base de datos no configurada' },
        { status: 503 }
      );
    }

    const supabase = getDatabaseConnection();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Error de configuración de base de datos' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { termination_id, document_type } = body; // document_type: 'notice_letter' | 'settlement'

    // 1. Obtener datos del finiquito (sin JOIN para evitar errores)
    const { data: termination, error: terminationError } = await supabase
      .from('employee_terminations')
      .select('*')
      .eq('id', termination_id)
      .eq('company_id', companyId)
      .single();

    if (terminationError || !termination) {
      console.error('Error fetching termination:', terminationError);
      return NextResponse.json(
        { success: false, error: 'Finiquito no encontrado' },
        { status: 404 }
      );
    }

    // 2. Obtener datos del empleado por separado
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, rut, first_name, last_name, address')
      .eq('id', termination.employee_id)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      return NextResponse.json(
        { success: false, error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // 3. Obtener contrato del empleado
    const { data: contracts } = await supabase
      .from('employment_contracts')
      .select('position, base_salary, weekly_hours, start_date, contract_type')
      .eq('employee_id', termination.employee_id)
      .eq('status', 'active')
      .limit(1);

    const contract = contracts?.[0];
    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    // 2. Obtener información de la empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, rut, address, legal_representative_name, legal_representative_rut')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    // 4. Crear objeto de resultado de cálculo a partir de los datos guardados
    const calculationResult = {
      employee: {
        employee_id: termination.employee_id,
        employee_rut: employee.rut,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        employee_address: employee.address,
        position: contract.position,
        contract_start_date: new Date(contract.start_date),
        contract_type: contract.contract_type,
        monthly_salary: contract.base_salary,
        weekly_hours: contract.weekly_hours || 45,
        termination_date: new Date(termination.termination_date),
        termination_cause_code: termination.termination_cause_code,
        last_work_date: new Date(termination.termination_date) // Asumimos mismo día si no se especifica
      },
      termination_cause: {
        article_code: termination.termination_cause_code,
        article_name: termination.termination_cause_description,
        requires_notice: termination.notice_given,
        notice_days: termination.notice_days,
        requires_severance: termination.severance_amount > 0,
        severance_calculation_type: null,
        is_with_just_cause: false,
        category: 'employer_initiative'
      },
      years_of_service: termination.severance_years_service || 0,
      months_of_service: 0,
      days_worked_last_month: termination.worked_days_last_month,
      pending_salary_days: termination.pending_salary_days,
      pending_salary_amount: termination.pending_salary_amount,
      total_vacation_days_earned: termination.total_vacation_days_earned,
      vacation_days_taken: termination.vacation_days_taken,
      pending_vacation_days: termination.pending_vacation_days,
      vacation_daily_rate: termination.vacation_daily_rate,
      pending_vacation_amount: termination.pending_vacation_amount,
      proportional_vacation_days: termination.proportional_vacation_days,
      proportional_vacation_amount: termination.proportional_vacation_amount,
      severance_entitled: termination.severance_amount > 0,
      severance_calculation_basis: `Según ${termination.termination_cause_description}`,
      severance_amount: termination.severance_amount,
      notice_indemnification_amount: termination.notice_indemnification_amount,
      christmas_bonus_amount: termination.christmas_bonus_amount,
      pending_overtime_amount: termination.pending_overtime_amount,
      other_bonuses_amount: termination.other_bonuses_amount,
      total_compensations: termination.total_to_pay,
      total_deductions: termination.total_deductions,
      final_net_amount: termination.final_net_amount,
      calculation_warnings: [],
      legal_references: [],
      calculation_date: new Date(termination.created_at)
    };

    // 4. Generar documento según tipo solicitado
    const calculator = new SettlementCalculator();
    let documentContent = '';
    let documentTitle = '';

    if (document_type === 'notice_letter') {
      documentContent = calculator.generateNoticeLetterText(calculationResult, company);
      documentTitle = `Carta Aviso - ${employee.first_name} ${employee.last_name}`;
      
      // Actualizar flag de carta generada
      await supabase
        .from('employee_terminations')
        .update({ notice_letter_generated: true })
        .eq('id', termination_id);
        
    } else if (document_type === 'settlement') {
      documentContent = calculator.generateSettlementText(calculationResult, company);
      documentTitle = `Finiquito - ${employee.first_name} ${employee.last_name}`;
      
      // Actualizar flag de finiquito generado
      await supabase
        .from('employee_terminations')
        .update({ settlement_generated: true })
        .eq('id', termination_id);
        
    } else {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento no válido. Use "notice_letter" o "settlement"' },
        { status: 400 }
      );
    }

    // 5. Generar HTML para el documento
    const htmlContent = generateDocumentHTML(documentContent, documentTitle, company);

    return NextResponse.json({
      success: true,
      data: {
        document_type,
        document_title: documentTitle,
        html_content: htmlContent,
        text_content: documentContent,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        employee_rut: employee.rut,
        company_name: company.name,
        termination_date: termination.termination_date
      }
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/terminations/documents:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function generateDocumentHTML(content: string, title: string, company: any): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            background: white;
            padding: 2cm;
            max-width: 21cm;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .company-details {
            font-size: 10pt;
            color: #333;
        }
        
        .document-title {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            text-transform: uppercase;
        }
        
        .content {
            white-space: pre-line;
            text-align: justify;
            margin-bottom: 40px;
        }
        
        .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-section {
            text-align: center;
            width: 45%;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 5px;
            font-size: 10pt;
        }
        
        .date {
            text-align: right;
            margin-bottom: 20px;
            font-style: italic;
        }
        
        @media print {
            body {
                padding: 1cm;
            }
            
            .no-print {
                display: none;
            }
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
        }
        
        .print-button:hover {
            background: #0056b3;
        }
    </style>
    <script>
        function printDocument() {
            window.print();
        }
        
        function downloadPDF() {
            window.print();
        }
    </script>
</head>
<body>
    <button class="print-button no-print" onclick="printDocument()">🖨️ Imprimir/PDF</button>
    
    <div class="header">
        <div class="company-name">${company.name || 'CONTAPYME DEMO ENTERPRISE'}</div>
        <div class="company-details">
            RUT: ${company.rut || '78.223.873-6'}<br>
            ${company.address || 'Las Malvas 2775, Punta Arenas'}
        </div>
    </div>
    
    <div class="date">
        ${new Date().toLocaleDateString('es-CL', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
    </div>
    
    <div class="document-title">${title}</div>
    
    <div class="content">${content}</div>
    
    <div class="signatures">
        <div class="signature-section">
            <div class="signature-line">
                EMPLEADOR<br>
                ${company.legal_representative_name || 'MIGUEL ANGEL RODRIGUEZ CABRERA'}<br>
                RUT: ${company.legal_representative_rut || '18.282.415-1'}
            </div>
        </div>
        
        <div class="signature-section">
            <div class="signature-line">
                TRABAJADOR<br>
                [FIRMA Y FECHA]
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}