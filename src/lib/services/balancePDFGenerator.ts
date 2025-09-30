import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface BalanceRow {
  account_code: string;
  account_name: string;
  trial_balance_debit: number;
  trial_balance_credit: number;
  adjusted_balance_debit: number;
  adjusted_balance_credit: number;
  balance_sheet_debit: number;
  balance_sheet_credit: number;
  income_statement_debit: number;
  income_statement_credit: number;
}

interface BalanceData {
  accounts: BalanceRow[];
  totals: {
    trial_balance_debit: number;
    trial_balance_credit: number;
    adjusted_balance_debit: number;
    adjusted_balance_credit: number;
    balance_sheet_debit: number;
    balance_sheet_credit: number;
    income_statement_debit: number;
    income_statement_credit: number;
  };
  net_income: number;
  period: string;
  companyName: string;
  generatedAt: Date;
}

export class BalancePDFGenerator {
  /**
   * Genera PDF del Balance de 8 Columnas
   */
  static async generateBalancePDF(data: BalanceData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let currentPage = pdfDoc.addPage([1100, 850]); // Horizontal para más espacio
    let { width, height } = currentPage.getSize();
    let yPosition = height - 50;
    
    // Título principal
    currentPage.drawText('BALANCE DE 8 COLUMNAS', {
      x: width / 2 - 120,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 25;
    
    // Información de la empresa
    currentPage.drawText(data.companyName, {
      x: width / 2 - (data.companyName.length * 6) / 2,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 20;
    
    // Período
    const periodText = `Período: ${data.period}`;
    currentPage.drawText(periodText, {
      x: width / 2 - (periodText.length * 5) / 2,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });
    yPosition -= 30;
    
    // Headers de las columnas
    const headers = [
      'Cuenta',
      'Descripción',
      'Debe',
      'Haber',
      'Deudor',
      'Acreedor',
      'Activos',
      'Pasivos',
      'Pérdidas',
      'Ganancias'
    ];
    
    const columnWidths = [60, 150, 80, 80, 80, 80, 80, 80, 80, 80];
    let xPosition = 50;
    
    // Dibujar headers principales
    currentPage.drawText('', { x: 50, y: yPosition + 20, size: 10, font: boldFont });
    currentPage.drawText('', { x: 210, y: yPosition + 20, size: 10, font: boldFont });
    currentPage.drawText('Balance de Comprobación', { x: 260, y: yPosition + 20, size: 10, font: boldFont });
    currentPage.drawText('Balance Ajustado', { x: 420, y: yPosition + 20, size: 10, font: boldFont });
    currentPage.drawText('Balance General', { x: 580, y: yPosition + 20, size: 10, font: boldFont });
    currentPage.drawText('Estado de Resultados', { x: 740, y: yPosition + 20, size: 10, font: boldFont });
    
    yPosition -= 20;
    
    // Dibujar líneas de separación de headers
    for (let i = 0; i < headers.length; i++) {
      const x = xPosition + (i === 0 ? 0 : columnWidths.slice(0, i).reduce((a, b) => a + b, 0));
      
      // Línea vertical
      if (i > 0) {
        currentPage.drawLine({
          start: { x: x, y: yPosition - 10 },
          end: { x: x, y: yPosition + 30 },
          thickness: 1,
          color: rgb(0, 0, 0)
        });
      }
      
      // Texto del header
      currentPage.drawText(headers[i], {
        x: x + 5,
        y: yPosition,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
    }
    
    // Línea horizontal bajo headers
    currentPage.drawLine({
      start: { x: 50, y: yPosition - 10 },
      end: { x: 50 + columnWidths.reduce((a, b) => a + b, 0), y: yPosition - 10 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    
    yPosition -= 25;
    
    // Función auxiliar para formatear moneda
    const formatCurrency = (amount: number): string => {
      if (amount === 0) return '-';
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(amount);
    };
    
    // Dibujar filas de datos
    for (const account of data.accounts) {
      // Verificar si necesitamos una nueva página
      if (yPosition < 100) {
        currentPage = pdfDoc.addPage([1100, 850]);
        yPosition = height - 50;
      }
      
      const rowData = [
        account.account_code,
        account.account_name.length > 20 
          ? account.account_name.substring(0, 20) + '...' 
          : account.account_name,
        formatCurrency(account.trial_balance_debit),
        formatCurrency(account.trial_balance_credit),
        formatCurrency(account.adjusted_balance_debit),
        formatCurrency(account.adjusted_balance_credit),
        formatCurrency(account.balance_sheet_debit),
        formatCurrency(account.balance_sheet_credit),
        formatCurrency(account.income_statement_debit),
        formatCurrency(account.income_statement_credit)
      ];
      
      xPosition = 50;
      for (let i = 0; i < rowData.length; i++) {
        const x = xPosition + (i === 0 ? 0 : columnWidths.slice(0, i).reduce((a, b) => a + b, 0));
        
        currentPage.drawText(rowData[i], {
          x: x + 5,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0, 0, 0)
        });
      }
      
      yPosition -= 15;
    }
    
    // Agregar fila de "Resultado Acumulado" si hay utilidad
    if (data.net_income !== 0) {
      yPosition -= 5;
      
      // Línea separadora
      currentPage.drawLine({
        start: { x: 50, y: yPosition + 10 },
        end: { x: 50 + columnWidths.reduce((a, b) => a + b, 0), y: yPosition + 10 },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      const resultRowData = [
        '',
        'Resultado Acumulado',
        '-',
        '-',
        '-',
        '-',
        data.net_income > 0 ? formatCurrency(data.net_income) : '-',
        data.net_income < 0 ? formatCurrency(Math.abs(data.net_income)) : '-',
        data.net_income < 0 ? formatCurrency(Math.abs(data.net_income)) : '-',
        data.net_income > 0 ? formatCurrency(data.net_income) : '-'
      ];
      
      xPosition = 50;
      for (let i = 0; i < resultRowData.length; i++) {
        const x = xPosition + (i === 0 ? 0 : columnWidths.slice(0, i).reduce((a, b) => a + b, 0));
        
        currentPage.drawText(resultRowData[i], {
          x: x + 5,
          y: yPosition,
          size: 8,
          font: i === 1 ? boldFont : font,
          color: rgb(0, 0, 0)
        });
      }
      
      yPosition -= 20;
    }
    
    // Línea antes de totales
    currentPage.drawLine({
      start: { x: 50, y: yPosition + 10 },
      end: { x: 50 + columnWidths.reduce((a, b) => a + b, 0), y: yPosition + 10 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    
    // Fila de totales
    const totalRowData = [
      '',
      'TOTALES',
      formatCurrency(data.totals.trial_balance_debit),
      formatCurrency(data.totals.trial_balance_credit),
      formatCurrency(data.totals.adjusted_balance_debit),
      formatCurrency(data.totals.adjusted_balance_credit),
      formatCurrency(data.totals.balance_sheet_debit),
      formatCurrency(data.totals.balance_sheet_credit),
      formatCurrency(data.totals.income_statement_debit),
      formatCurrency(data.totals.income_statement_credit)
    ];
    
    xPosition = 50;
    for (let i = 0; i < totalRowData.length; i++) {
      const x = xPosition + (i === 0 ? 0 : columnWidths.slice(0, i).reduce((a, b) => a + b, 0));
      
      currentPage.drawText(totalRowData[i], {
        x: x + 5,
        y: yPosition,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
    }
    
    // Línea doble bajo totales
    currentPage.drawLine({
      start: { x: 50, y: yPosition - 5 },
      end: { x: 50 + columnWidths.reduce((a, b) => a + b, 0), y: yPosition - 5 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    currentPage.drawLine({
      start: { x: 50, y: yPosition - 8 },
      end: { x: 50 + columnWidths.reduce((a, b) => a + b, 0), y: yPosition - 8 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    // Pie de página
    const footerY = 30;
    const footerText = `Generado el ${data.generatedAt.toLocaleString('es-CL')} por ContaPyme`;
    currentPage.drawText(footerText, {
      x: 50,
      y: footerY,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    
    // Página actual
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageText = `Página ${i + 1} de ${pages.length}`;
      page.drawText(pageText, {
        x: width - 100,
        y: footerY,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
    
    // Metadata del PDF
    pdfDoc.setTitle(`Balance de 8 Columnas - ${data.period}`);
    pdfDoc.setAuthor(data.companyName);
    pdfDoc.setSubject('Balance de 8 Columnas');
    pdfDoc.setKeywords(['balance', '8columnas', 'contabilidad', data.period]);
    pdfDoc.setProducer('ContaPyme');
    pdfDoc.setCreator('ContaPyme - Sistema Contable');
    pdfDoc.setCreationDate(data.generatedAt);
    pdfDoc.setModificationDate(data.generatedAt);
    
    return await pdfDoc.save();
  }
  
  /**
   * Genera datos de ejemplo para testing
   */
  static generateSampleData(): BalanceData {
    return {
      companyName: 'Empresa Demo ContaPyme',
      period: new Date().toISOString().substring(0, 7),
      generatedAt: new Date(),
      net_income: 5000000,
      accounts: [
        {
          account_code: '1.1.1.001',
          account_name: 'Caja',
          trial_balance_debit: 1000000,
          trial_balance_credit: 0,
          adjusted_balance_debit: 1000000,
          adjusted_balance_credit: 0,
          balance_sheet_debit: 1000000,
          balance_sheet_credit: 0,
          income_statement_debit: 0,
          income_statement_credit: 0
        },
        {
          account_code: '2.1.1.001',
          account_name: 'Proveedores',
          trial_balance_debit: 0,
          trial_balance_credit: 500000,
          adjusted_balance_debit: 0,
          adjusted_balance_credit: 500000,
          balance_sheet_debit: 0,
          balance_sheet_credit: 500000,
          income_statement_debit: 0,
          income_statement_credit: 0
        },
        {
          account_code: '4.1.1.001',
          account_name: 'Ingresos por Ventas',
          trial_balance_debit: 0,
          trial_balance_credit: 10000000,
          adjusted_balance_debit: 0,
          adjusted_balance_credit: 10000000,
          balance_sheet_debit: 0,
          balance_sheet_credit: 0,
          income_statement_debit: 0,
          income_statement_credit: 10000000
        }
      ],
      totals: {
        trial_balance_debit: 1000000,
        trial_balance_credit: 10500000,
        adjusted_balance_debit: 1000000,
        adjusted_balance_credit: 10500000,
        balance_sheet_debit: 1000000,
        balance_sheet_credit: 500000,
        income_statement_debit: 0,
        income_statement_credit: 10000000
      }
    };
  }
}