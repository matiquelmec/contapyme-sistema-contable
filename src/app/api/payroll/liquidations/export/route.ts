import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayrollCalculator } from '@/modules/remuneraciones/services/calculadorService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generar HTML para la liquidación
function generateLiquidationHTML(liquidation: any, employee: any, company: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPeriod = (year: number, month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[month - 1]} ${year}`;
  };

  // Función para limpiar caracteres especiales malformados
  const cleanText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã/g, 'Á')
      .replace(/Ã/g, 'É')
      .replace(/Ã/g, 'Í')
      .replace(/Ã/g, 'Ó')
      .replace(/Ã/g, 'Ú')
      .replace(/Ã/g, 'Ñ')
      .replace(/�/g, 'é')
      .trim();
  };

  // ✅ FUNCIÓN PARA CALCULAR TOTAL DESCUENTOS DINÁMICAMENTE
  const calculateTotalDeductions = (liq: any) => {
    return (liq.afp_amount || 0) + 
           (liq.afp_commission_amount || 0) +
           (liq.health_amount || 0) + 
           (liq.additional_health_amount || 0) +
           (liq.unemployment_amount || 0) + 
           (liq.income_tax_amount || 0) +
           (liq.loan_deductions || 0) +
           (liq.advance_payments || 0) +
           (liq.apv_amount || 0) +
           (liq.other_deductions || 0);
  };

  // ✅ CALCULAR LÍQUIDO A PAGAR DINÁMICAMENTE
  const calculateNetSalary = (liq: any) => {
    return liq.total_gross_income - calculateTotalDeductions(liq);
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquidación de Sueldo - ${cleanText(employee.first_name)} ${cleanText(employee.last_name)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .company-info {
            margin-bottom: 10px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a1a1a;
        }
        .document-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
        }
        .period {
            text-align: center;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            background-color: #f0f0f0;
            padding: 5px 10px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 5px 10px;
            text-align: left;
        }
        th {
            background-color: #f8f8f8;
            font-weight: normal;
        }
        td.amount {
            text-align: right;
            font-family: 'Courier New', monospace;
        }
        .row-divider {
            border-top: 1px solid #ddd;
        }
        .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .net-salary {
            font-size: 16px;
            font-weight: bold;
            background-color: #e8f4f8;
            color: #0066cc;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
        }
        .signature-box {
            width: 40%;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 50px;
            padding-top: 5px;
        }
        @media print {
            .container {
                padding: 10px;
            }
            body {
                font-size: 11px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${company.name || 'CONTAPYME PUQ'}</div>
                <div>RUT: ${company.rut || '78.223.873-6'}</div>
                <div>${company.address || 'Punta Arenas, Chile'}</div>
            </div>
        </div>

        <!-- Title -->
        <div class="document-title">Liquidación de Sueldo</div>
        <div class="period">${formatPeriod(liquidation.period_year, liquidation.period_month)}</div>

        <!-- Employee Info -->
        <div class="section">
            <div class="section-title">DATOS DEL TRABAJADOR</div>
            <table>
                <tr>
                    <th style="width: 25%">Nombre:</th>
                    <td style="width: 25%">${cleanText(employee.first_name)} ${cleanText(employee.last_name)}</td>
                    <th style="width: 25%">RUT:</th>
                    <td style="width: 25%">${employee.rut}</td>
                </tr>
                <tr>
                    <th>Cargo:</th>
                    <td>${employee.position || 'No especificado'}</td>
                    <th>Días Trabajados:</th>
                    <td>${liquidation.days_worked}</td>
                </tr>
            </table>
        </div>

        <!-- Haberes -->
        <div class="section">
            <div class="section-title">HABERES</div>
            <table>
                <tr>
                    <th style="width: 70%">Concepto</th>
                    <th style="width: 30%" class="amount">Monto</th>
                </tr>
                <tr>
                    <td>Sueldo Base</td>
                    <td class="amount">${formatCurrency(liquidation.base_salary)}</td>
                </tr>
                ${liquidation.overtime_amount > 0 ? `
                <tr>
                    <td>Horas Extras${liquidation.overtime_hours > 0 ? ` (${liquidation.overtime_hours}h)` : ''}</td>
                    <td class="amount">${formatCurrency(liquidation.overtime_amount)}</td>
                </tr>` : ''}
                ${liquidation.bonuses > 0 ? `
                <tr>
                    <td>Bonos</td>
                    <td class="amount">${formatCurrency(liquidation.bonuses)}</td>
                </tr>` : ''}
                ${liquidation.commissions > 0 ? `
                <tr>
                    <td>Comisiones</td>
                    <td class="amount">${formatCurrency(liquidation.commissions)}</td>
                </tr>` : ''}
                ${liquidation.gratification > 0 ? `
                <tr>
                    <td>Gratificación</td>
                    <td class="amount">${formatCurrency(liquidation.gratification)}</td>
                </tr>` : ''}
                ${(liquidation.legal_gratification_art50 || 0) > 0 ? `
                <tr>
                    <td>Gratificación Legal Art. 50</td>
                    <td class="amount">${formatCurrency(liquidation.legal_gratification_art50)}</td>
                </tr>` : ''}
                <tr class="row-divider">
                    <td><strong>Total Imponible</strong></td>
                    <td class="amount"><strong>${formatCurrency(liquidation.total_taxable_income)}</strong></td>
                </tr>
                ${liquidation.food_allowance > 0 ? `
                <tr>
                    <td>Asignación Colación</td>
                    <td class="amount">${formatCurrency(liquidation.food_allowance)}</td>
                </tr>` : ''}
                ${liquidation.transport_allowance > 0 ? `
                <tr>
                    <td>Asignación Movilización</td>
                    <td class="amount">${formatCurrency(liquidation.transport_allowance)}</td>
                </tr>` : ''}
                ${liquidation.family_allowance > 0 ? `
                <tr>
                    <td>Asignación Familiar</td>
                    <td class="amount">${formatCurrency(liquidation.family_allowance)}</td>
                </tr>` : ''}
                <tr class="total-row">
                    <td>TOTAL HABERES</td>
                    <td class="amount">${formatCurrency(liquidation.total_gross_income)}</td>
                </tr>
            </table>
        </div>

        <!-- Descuentos -->
        <div class="section">
            <div class="section-title">DESCUENTOS PREVISIONALES</div>
            <table>
                <tr>
                    <th style="width: 70%">Concepto</th>
                    <th style="width: 30%" class="amount">Monto</th>
                </tr>
                <tr>
                    <td>AFP (${liquidation.afp_percentage}% + ${liquidation.afp_commission_percentage}%)</td>
                    <td class="amount">${formatCurrency(liquidation.afp_amount + liquidation.afp_commission_amount)}</td>
                </tr>
                <tr>
                    <td>Salud (${liquidation.health_percentage}%)</td>
                    <td class="amount">${formatCurrency(liquidation.health_amount)}</td>
                </tr>
                ${liquidation.unemployment_amount > 0 ? `
                <tr>
                    <td>Seguro Cesantía (${liquidation.unemployment_percentage}%)</td>
                    <td class="amount">${formatCurrency(liquidation.unemployment_amount)}</td>
                </tr>` : ''}
                ${liquidation.income_tax_amount > 0 ? `
                <tr>
                    <td>Impuesto Único</td>
                    <td class="amount">${formatCurrency(liquidation.income_tax_amount)}</td>
                </tr>` : ''}
                ${liquidation.loan_deductions > 0 ? `
                <tr>
                    <td>Préstamos Empresa</td>
                    <td class="amount">${formatCurrency(liquidation.loan_deductions)}</td>
                </tr>` : ''}
                ${liquidation.advance_payments > 0 ? `
                <tr>
                    <td>Anticipos</td>
                    <td class="amount">${formatCurrency(liquidation.advance_payments)}</td>
                </tr>` : ''}
                ${liquidation.apv_amount > 0 ? `
                <tr>
                    <td>APV</td>
                    <td class="amount">${formatCurrency(liquidation.apv_amount)}</td>
                </tr>` : ''}
                <tr class="total-row">
                    <td>TOTAL DESCUENTOS</td>
                    <td class="amount">${formatCurrency(calculateTotalDeductions(liquidation))}</td>
                </tr>
            </table>
        </div>

        <!-- Líquido a Pagar -->
        <div class="section">
            <table>
                <tr class="net-salary">
                    <td style="width: 70%; padding: 10px;">LÍQUIDO A PAGAR</td>
                    <td class="amount" style="padding: 10px; font-size: 16px;">${formatCurrency(calculateNetSalary(liquidation))}</td>
                </tr>
            </table>
        </div>

        <!-- Firmas -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">
                    <div>Empleador</div>
                    ${company.legal_representative_name ? `
                    <div style="font-size: 10px; margin-top: 5px;">
                        ${company.legal_representative_name}<br>
                        RUT: ${company.legal_representative_rut}<br>
                        ${company.legal_representative_position}
                    </div>` : `
                    <div style="font-size: 10px; margin-top: 5px;">Firma y Timbre</div>`}
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <div>Trabajador</div>
                    <div style="font-size: 10px; margin-top: 5px;">
                        ${cleanText(employee.first_name)} ${cleanText(employee.last_name)}<br>
                        RUT: ${employee.rut}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div style="text-align: center; font-size: 10px; color: #666;">
                Documento generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}<br>
                Sistema ContaPyme - Gestión de Remuneraciones
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// Exportar liquidación como HTML (para convertir a PDF en el cliente)
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

    const { liquidation_id, liquidation_data } = await request.json();

    let liquidation;
    let employee;

    // Si se proporciona un ID, obtener de la base de datos
    if (liquidation_id) {
      const { data: dbLiquidation, error } = await supabase
        .from('payroll_liquidations')
        .select(`
          *,
          employees (
            rut,
            first_name,
            last_name,
            email,
            employment_contracts (
              position
            )
          )
        `)
        .eq('id', liquidation_id)
        .eq('company_id', companyId)
        .single();

      if (error || !dbLiquidation) {
        return NextResponse.json(
          { success: false, error: 'Liquidación no encontrada' },
          { status: 404 }
        );
      }

      liquidation = dbLiquidation;
      employee = {
        ...dbLiquidation.employees,
        position: dbLiquidation.employees.employment_contracts?.[0]?.position
      };
    } else if (liquidation_data) {
      // Usar datos proporcionados directamente
      liquidation = liquidation_data;
      employee = liquidation_data.employee;
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere liquidation_id o liquidation_data' },
        { status: 400 }
      );
    }

    // Obtener información básica de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('name, rut, address')
      .eq('id', companyId)
      .single();

    // Obtener configuración de empresa desde payroll_settings
    const { data: payrollSettings } = await supabase
      .from('payroll_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();

    // Combinar datos de empresa con configuración de payroll_settings
    let finalCompanyData = company || {};
    
    if (payrollSettings?.settings?.company_info) {
      const companyInfo = payrollSettings.settings.company_info;
      const legalRep = companyInfo.legal_representative;
      
      finalCompanyData = {
        ...finalCompanyData,
        name: companyInfo.company_name || finalCompanyData.name,
        rut: companyInfo.company_rut || finalCompanyData.rut,
        address: companyInfo.company_address || finalCompanyData.address,
        city: companyInfo.company_city,
        phone: companyInfo.company_phone,
        email: companyInfo.company_email,
        legal_representative_name: legalRep?.full_name,
        legal_representative_rut: legalRep?.rut,
        legal_representative_position: legalRep?.position || 'GERENTE GENERAL'
      };
      
      console.log('✅ Liquidación usando representante legal de payroll_settings:', legalRep?.full_name);
    } else {
      console.log('⚠️ Liquidación usando datos básicos de companies table');
    }

    // Generar HTML
    const html = generateLiquidationHTML(liquidation, employee, finalCompanyData);

    return NextResponse.json({
      success: true,
      data: {
        html,
        filename: `liquidacion_${employee.rut}_${liquidation.period_year}_${liquidation.period_month}.pdf`
      }
    });

  } catch (error) {
    console.error('Error in POST /api/payroll/liquidations/export:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Exportar múltiples liquidaciones como CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id es requerido' },
        { status: 400 }
      );
    }

    // Función para limpiar caracteres especiales malformados (para CSV)
    const cleanText = (text: string) => {
      if (!text) return '';
      return text
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã/g, 'Á')
        .replace(/Ã/g, 'É')
        .replace(/Ã/g, 'Í')
        .replace(/Ã/g, 'Ó')
        .replace(/Ã/g, 'Ú')
        .replace(/Ã/g, 'Ñ')
        .replace(/�/g, 'é')
        .trim();
    };

    let query = supabase
      .from('payroll_liquidations')
      .select(`
        *,
        employees (
          rut,
          first_name,
          last_name
        )
      `)
      .eq('company_id', companyId);

    if (year) {
      query = query.eq('period_year', parseInt(year));
    }

    if (month) {
      query = query.eq('period_month', parseInt(month));
    }

    const { data: liquidations, error } = await query
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener liquidaciones' },
        { status: 500 }
      );
    }

    // Generar CSV
    const headers = [
      'RUT', 'Nombre', 'Año', 'Mes', 'Días Trabajados',
      'Sueldo Base', 'Gratificación Art. 50', 'Total Imponible', 'Total No Imponible',
      'AFP', 'Salud', 'Cesantía', 'Impuesto',
      'Total Descuentos', 'Líquido a Pagar'
    ];

    const rows = liquidations?.map(liq => [
      liq.employees.rut,
      `${cleanText(liq.employees.first_name)} ${cleanText(liq.employees.last_name)}`,
      liq.period_year,
      liq.period_month,
      liq.days_worked,
      liq.base_salary,
      liq.legal_gratification_art50 || 0,
      liq.total_taxable_income,
      liq.total_non_taxable_income,
      liq.afp_amount + liq.afp_commission_amount,
      liq.health_amount,
      liq.unemployment_amount,
      liq.income_tax_amount,
      liq.total_deductions,
      liq.net_salary
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="liquidaciones_${year || 'todas'}_${month || 'todos'}.csv"`
      }
    });

  } catch (error) {
    console.error('Error in GET /api/payroll/liquidations/export:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}