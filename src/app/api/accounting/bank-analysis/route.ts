import { NextRequest, NextResponse } from 'next/server';
import { UniversalBankStatementParser } from '@/lib/bankStatementParser';

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
  rut?: string;
  destinationMessage?: string;
  suggestedEntry?: {
    debitAccount: string;
    debitAccountName: string;
    creditAccount: string;
    creditAccountName: string;
    amount: number;
    description: string;
    type: 'cliente' | 'proveedor' | 'remuneracion' | 'otro';
  };
}

interface BankAnalysis {
  period: string;
  bank: string;
  account: string;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  transactionCount: number;
  transactions: BankTransaction[];
  insights: string[];
  confidence?: number;
}

// POST - Analyze bank statement
export async function POST(request: NextRequest) {
  try {
    console.log('🏦 Bank Analysis API: Starting analysis...');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log('📄 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Read file content
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder('utf-8').decode(buffer);

    // Determine file type and parse accordingly
    let analysis: BankAnalysis;

    if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      analysis = await parseCSVBankStatement(content, file.name, companyId);
    } else if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx') || 
               file.type === 'application/vnd.ms-excel' || 
               file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Excel files can be parsed as text/CSV after conversion
      console.log('📊 Treating Excel file as structured data...');
      analysis = await parseCSVBankStatement(content, file.name, companyId);
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      analysis = await parsePDFBankStatement(buffer, file.name);
    } else if (file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain') {
      analysis = await parseTextBankStatement(content, file.name, companyId);
    } else {
      // Try to parse as text anyway for unknown formats
      console.log('⚠️ Unknown format, attempting universal parse...');
      analysis = await parseCSVBankStatement(content, file.name, companyId);
    }

    console.log('✅ Bank analysis completed:', {
      transactions: analysis.transactionCount,
      totalCredits: analysis.totalCredits,
      totalDebits: analysis.totalDebits,
      netFlow: analysis.netFlow
    });

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Error in bank analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Error analyzing bank statement'
    }, { status: 500 });
  }
}

// Parse CSV bank statement with Universal Parser
async function parseCSVBankStatement(content: string, filename: string, companyId?: string): Promise<BankAnalysis> {
  console.log('📊 Parsing CSV bank statement with Universal Parser...');
  console.log(`📄 Content preview (first 500 chars): ${content.substring(0, 500)}`);
  
  // Use the new Universal Parser
  const parser = new UniversalBankStatementParser(content);
  const parsedData = await parser.parse(companyId);
  
  console.log('🔍 Parser results:', {
    transactions: parsedData.transactions.length,
    confidence: parsedData.confidence,
    bank: parsedData.bank,
    period: parsedData.period,
    totalCredits: parsedData.totalCredits,
    totalDebits: parsedData.totalDebits
  });
  
  console.log(`✅ Parsed ${parsedData.transactions.length} transactions with ${parsedData.confidence}% confidence`);
  
  // Generate insights based on transaction analysis
  const insights = generateAccountingInsights(
    parsedData.transactions, 
    parsedData.totalCredits, 
    parsedData.totalDebits
  );
  
  return {
    period: parsedData.period,
    bank: parsedData.bank,
    account: parsedData.account,
    totalCredits: parsedData.totalCredits,
    totalDebits: parsedData.totalDebits,
    netFlow: parsedData.totalCredits - parsedData.totalDebits,
    transactionCount: parsedData.transactions.length,
    transactions: parsedData.transactions,
    insights,
    confidence: parsedData.confidence
  };
}

// Parse PDF bank statement
async function parsePDFBankStatement(buffer: ArrayBuffer, filename: string): Promise<BankAnalysis> {
  console.log('📄 Attempting to parse PDF bank statement...');
  
  try {
    console.log('💡 PDF processing requires specialized handling...');
    
    // Try basic text extraction approach (limited success expected)
    const uint8Array = new Uint8Array(buffer);
    
    // Look for readable text patterns in the PDF
    let extractedText = '';
    try {
      // Simple approach: look for readable ASCII text
      const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
      const rawContent = decoder.decode(uint8Array);
      
      // Extract potential transaction data patterns
      const textSegments = rawContent.match(/[\x20-\x7E\n\r\t]{20,}/g);
      if (textSegments && textSegments.length > 0) {
        extractedText = textSegments.join('\n');
        console.log('📄 Found some readable text in PDF');
      }
    } catch (textError) {
      console.log('⚠️ Text extraction from PDF failed');
    }
    
    // If we found readable text, try to parse it
    if (extractedText.length > 50) {
      console.log('🔍 Trying to parse extracted text with Universal Parser...');
      const parser = new UniversalBankStatementParser(extractedText);
      const result = parser.parse();
      
      if (result.transactions.length > 0) {
        console.log(`✅ Successfully extracted ${result.transactions.length} transactions from PDF text`);
        const insights = generateAccountingInsights(result.transactions, result.totalCredits, result.totalDebits);
        
        return {
          period: result.period,
          bank: `${result.bank} (PDF extraído)`,
          account: result.account,
          totalCredits: result.totalCredits,
          totalDebits: result.totalDebits,
          netFlow: result.totalCredits - result.totalDebits,
          transactionCount: result.transactions.length,
          transactions: result.transactions,
          insights
        };
      }
    }
    
    // Fallback: Provide clear guidance to user
    console.log('📋 PDF requires conversion - providing user guidance');
    return {
      period: 'PDF - Conversión Requerida',
      bank: 'Archivo PDF Detectado',
      account: 'Requiere conversión manual',
      totalCredits: 0,
      totalDebits: 0,
      netFlow: 0,
      transactionCount: 0,
      transactions: [],
      insights: [
        'Archivo PDF detectado - Para mejor analisis automatico:',
        '',
        'Opciones recomendadas:',
        '   1. Descargar cartola en formato CSV desde tu banco online',
        '   2. Usar Excel para abrir el PDF y guardar como .xlsx',
        '   3. Copiar las transacciones del PDF y pegarlas en Excel como CSV',
        '',
        'Instrucciones por banco:',
        '   - Banco de Chile: Portal -> Cartolas -> Descargar CSV',
        '   - BCI: Online Banking -> Movimientos -> Exportar Excel',
        '   - Santander: Banca Online -> Consultas -> Exportar',
        '',
        'Una vez convertido a CSV/Excel, sube nuevamente el archivo',
        '   y veras todas las transacciones con RUTs y clasificacion automatica'
      ]
    };
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      period: 'Error PDF',
      bank: 'Error de Procesamiento',
      account: 'Ver logs',
      totalCredits: 0,
      totalDebits: 0,
      netFlow: 0,
      transactionCount: 0,
      transactions: [],
      insights: [
        'Error al procesar archivo PDF',
        'Para resolver:',
        '- Verifica que el archivo no este dañado',
        '- Convierte a formato CSV o Excel',
        '- Intenta con una cartola mas reciente'
      ]
    };
  }
}

// Parse text bank statement
async function parseTextBankStatement(content: string, filename: string, companyId?: string): Promise<BankAnalysis> {
  console.log('Parsing TXT bank statement...');
  
  // Use the Universal Parser for text files too
  const parser = new UniversalBankStatementParser(content);
  const parsedData = await parser.parse(companyId);
  
  const insights = generateAccountingInsights(
    parsedData.transactions,
    parsedData.totalCredits,
    parsedData.totalDebits
  );
  
  return {
    period: parsedData.period,
    bank: parsedData.bank,
    account: parsedData.account,
    totalCredits: parsedData.totalCredits,
    totalDebits: parsedData.totalDebits,
    netFlow: parsedData.totalCredits - parsedData.totalDebits,
    transactionCount: parsedData.transactions.length,
    transactions: parsedData.transactions,
    insights
  };
}

// Generate accounting insights based on transactions
function generateAccountingInsights(transactions: BankTransaction[], totalCredits: number, totalDebits: number): string[] {
  const insights: string[] = [];
  
  // Basic flow analysis
  const netFlow = totalCredits - totalDebits;
  if (netFlow > 0) {
    insights.push(`Flujo positivo: Ingresan ${((totalCredits - totalDebits) / totalCredits * 100).toFixed(1)}% mas de lo que sale`);
  } else {
    insights.push(`Flujo negativo: Salen ${Math.abs((netFlow / totalCredits * 100)).toFixed(1)}% mas de lo que ingresa`);
  }
  
  // Transaction frequency
  if (transactions.length > 50) {
    insights.push(`Alta actividad: ${transactions.length} transacciones detectadas`);
  } else if (transactions.length > 20) {
    insights.push(`Actividad moderada: ${transactions.length} transacciones en el periodo`);
  } else {
    insights.push(`Baja actividad: Solo ${transactions.length} transacciones en el periodo`);
  }
  
  // RUT analysis
  const transactionsWithRut = transactions.filter(t => t.rut);
  if (transactionsWithRut.length > 0) {
    const rutPercentage = (transactionsWithRut.length / transactions.length * 100).toFixed(1);
    insights.push(`${rutPercentage}% de transacciones incluyen RUT identificado`);
    
    // Analyze RUT patterns
    const companies = transactionsWithRut.filter(t => {
      const rutNumber = parseInt(t.rut?.replace(/\D/g, '') || '0');
      return rutNumber >= 50000000;
    });
    
    const individuals = transactionsWithRut.filter(t => {
      const rutNumber = parseInt(t.rut?.replace(/\D/g, '') || '0');
      return rutNumber < 50000000 && rutNumber > 0;
    });
    
    if (companies.length > 0) {
      insights.push(`${companies.length} transacciones con empresas identificadas`);
    }
    
    if (individuals.length > 0) {
      insights.push(`${individuals.length} transacciones con personas naturales`);
    }
  }
  
  return insights;
}