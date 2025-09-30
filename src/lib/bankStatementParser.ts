// Enhanced Bank Statement Parser - Flexible and Robust
// Supports multiple formats and automatic detection

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
  rut?: string; // RUT extracted from description
  destinationMessage?: string; // Message or memo from bank statement
  suggestedEntry?: JournalEntrySuggestion; // Suggested accounting entry
  entityInfo?: { type?: string; name?: string; accountCode?: string } | null; // RCV entity information
}

interface JournalEntrySuggestion {
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  description: string;
  type: 'cliente' | 'proveedor' | 'remuneracion' | 'otro';
}

interface ParsedBankData {
  transactions: BankTransaction[];
  bank: string;
  account: string;
  period: string;
  totalCredits: number;
  totalDebits: number;
  confidence: number;
}

export class UniversalBankStatementParser {
  private content: string;
  private lines: string[];
  private delimiter: string = ',';
  private dateFormats = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,    // DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,    // YYYY-MM-DD
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/,    // DD/MM/YY
    /(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})/i, // DD MMM YYYY
  ];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split(/\r?\n/).filter(line => line.trim());
    this.detectDelimiter();
  }

  // Main parsing method
  public async parse(companyId?: string): Promise<ParsedBankData> {
    console.log('🔍 Starting universal bank statement parsing...');
    
    // Detect bank from content
    const bank = this.detectBank();
    const account = this.extractAccountNumber();
    
    // Try multiple parsing strategies
    let transactions: BankTransaction[] = [];
    let confidence = 0;

    // Strategy 1: Structured CSV/TSV parsing
    const structuredResult = this.parseStructuredFormat();
    if (structuredResult.transactions.length > 0) {
      transactions = structuredResult.transactions;
      confidence = structuredResult.confidence;
    }

    // Strategy 2: Pattern-based parsing
    if (transactions.length === 0) {
      const patternResult = this.parseWithPatterns();
      if (patternResult.transactions.length > 0) {
        transactions = patternResult.transactions;
        confidence = patternResult.confidence;
      }
    }

    // Strategy 3: AI-assisted parsing for complex formats
    if (transactions.length === 0) {
      const aiResult = this.parseWithHeuristics();
      transactions = aiResult.transactions;
      confidence = aiResult.confidence;
    }

    // Enrich transactions with RUT and accounting suggestions
    transactions = await Promise.all(transactions.map(t => this.enrichTransaction(t, companyId)));

    // Calculate totals
    let totalCredits = 0;
    let totalDebits = 0;
    
    transactions.forEach(t => {
      if (t.type === 'credit') {
        totalCredits += Math.abs(t.amount);
      } else {
        totalDebits += Math.abs(t.amount);
      }
    });

    // Detect period from transactions
    const period = this.detectPeriod(transactions);

    return {
      transactions,
      bank,
      account,
      period,
      totalCredits,
      totalDebits,
      confidence
    };
  }

  // Detect delimiter (comma, semicolon, tab, pipe)
  private detectDelimiter(): void {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    
    delimiters.forEach(delim => {
      const count = (this.lines[0] || '').split(delim).length;
      if (count > maxCount) {
        maxCount = count;
        this.delimiter = delim;
      }
    });
    
    console.log(`📌 Detected delimiter: "${this.delimiter}"`);
  }

  // Strategy 1: Parse structured format (CSV, TSV, etc.)
  private parseStructuredFormat(): { transactions: BankTransaction[], confidence: number } {
    console.log('📊 Trying structured format parsing...');
    const transactions: BankTransaction[] = [];
    
    // Find header row
    let headerIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(10, this.lines.length); i++) {
      const line = this.lines[i];
      const cols = this.splitLine(line);
      
      // Check if this could be a header
      if (this.looksLikeHeader(cols)) {
        headerIndex = i;
        headers = cols.map(h => h.toLowerCase().trim());
        console.log(`📋 Found headers at row ${i}:`, headers);
        break;
      }
    }

    // If no header found, try to parse without headers
    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;
    
    // Identify column mappings
    const columnMap = this.identifyColumns(headers);
    console.log('🗂️ Final column mapping:', columnMap);
    
    // Parse data rows
    for (let i = startIndex; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (!line.trim()) continue;
      
      const cols = this.splitLine(line);
      const transaction = this.parseRow(cols, columnMap);
      
      if (transaction) {
        transactions.push(transaction);
      }
    }

    const confidence = transactions.length > 0 ? 
      (headerIndex >= 0 ? 90 : 70) : 0;

    console.log(`✅ Structured parsing found ${transactions.length} transactions (confidence: ${confidence}%)`);
    return { transactions, confidence };
  }

  // Strategy 2: Pattern-based parsing
  private parseWithPatterns(): { transactions: BankTransaction[], confidence: number } {
    console.log('🔍 Trying pattern-based parsing...');
    const transactions: BankTransaction[] = [];
    
    for (const line of this.lines) {
      // Skip empty or very short lines
      if (line.trim().length < 10) continue;
      
      // Try to extract transaction from line
      const transaction = this.extractTransactionFromLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    const confidence = transactions.length > 0 ? 60 : 0;
    console.log(`✅ Pattern parsing found ${transactions.length} transactions (confidence: ${confidence}%)`);
    
    return { transactions, confidence };
  }

  // Strategy 3: Heuristic parsing for complex formats
  private parseWithHeuristics(): { transactions: BankTransaction[], confidence: number } {
    console.log('🧠 Trying heuristic parsing...');
    const transactions: BankTransaction[] = [];
    
    // Group lines that might belong together
    const groups = this.groupRelatedLines();
    
    for (const group of groups) {
      const transaction = this.parseTransactionGroup(group);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    const confidence = transactions.length > 0 ? 40 : 20;
    console.log(`✅ Heuristic parsing found ${transactions.length} transactions (confidence: ${confidence}%)`);
    
    return { transactions, confidence };
  }

  // Helper: Split line by delimiter
  private splitLine(line: string): string[] {
    // Handle quoted values
    const regex = new RegExp(`${this.delimiter}(?=(?:[^"]*"[^"]*")*[^"]*$)`);
    return line.split(regex).map(col => col.replace(/^"|"$/g, '').trim());
  }

  // Helper: Check if columns look like headers
  private looksLikeHeader(cols: string[]): boolean {
    const headerKeywords = [
      'fecha', 'date', 'dia',
      'descripcion', 'description', 'detalle', 'concepto',
      'monto', 'amount', 'valor', 'importe',
      'cargo', 'abono', 'debito', 'credito', 'debit', 'credit',
      'saldo', 'balance',
      'referencia', 'reference', 'ref'
    ];
    
    let matchCount = 0;
    for (const col of cols) {
      const colLower = col.toLowerCase();
      if (headerKeywords.some(keyword => colLower.includes(keyword))) {
        matchCount++;
      }
    }
    
    return matchCount >= 2;
  }

  // Helper: Identify column purposes
  private identifyColumns(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {
      date: -1,
      description: -1,
      amount: -1,
      debit: -1,
      credit: -1,
      balance: -1,
      reference: -1,
      destinationMessage: -1,
      rutColumn: -1
    };

    console.log('🗂️ Analyzing headers for column mapping:', headers);

    headers.forEach((header, index) => {
      const h = header.toLowerCase();
      
      // Date column
      if (h.includes('fecha') || h.includes('date') || h.includes('dia')) {
        map.date = index;
        console.log(`📅 Date column found at index ${index}: ${header}`);
      }
      // RUT column (specific for origen/destino columns)
      else if (h.includes('rut') && (h.includes('origen') || h.includes('destino'))) {
        map.rutColumn = index;
        console.log(`🆔 RUT column found at index ${index}: ${header}`);
      }
      // Description column - prioritize "nombre destino/origen" over generic description
      else if (h.includes('nombre') && (h.includes('destino') || h.includes('origen'))) {
        map.description = index;
        console.log(`📝 Description column found at index ${index}: ${header}`);
      }
      else if (!map.description && (h.includes('descripcion') || h.includes('description') || 
               h.includes('detalle') || h.includes('concepto'))) {
        map.description = index;
        console.log(`📝 Description column found at index ${index}: ${header}`);
      }
      // Amount columns - prioritize "monto $"
      else if ((h.includes('monto') && h.includes('$')) || h.includes('amount') || 
               h.includes('valor') || h.includes('importe')) {
        map.amount = index;
        console.log(`💰 Amount column found at index ${index}: ${header}`);
      }
      else if (!map.amount && (h.includes('monto') || h.includes('valor'))) {
        map.amount = index;
        console.log(`💰 Amount column found at index ${index}: ${header}`);
      }
      else if (h.includes('cargo') || h.includes('debito') || h.includes('debit')) {
        map.debit = index;
        console.log(`➖ Debit column found at index ${index}: ${header}`);
      }
      else if (h.includes('abono') || h.includes('credito') || h.includes('credit')) {
        map.credit = index;
        console.log(`➕ Credit column found at index ${index}: ${header}`);
      }
      // Balance column
      else if (h.includes('saldo') || h.includes('balance')) {
        map.balance = index;
        console.log(`⚖️ Balance column found at index ${index}: ${header}`);
      }
      // Reference column - prioritize "id transferencia" 
      else if (h.includes('id') && h.includes('transferencia')) {
        map.reference = index;
        console.log(`🔗 Reference column found at index ${index}: ${header}`);
      }
      else if (!map.reference && (h.includes('referencia') || h.includes('reference') || h.includes('ref'))) {
        map.reference = index;
        console.log(`🔗 Reference column found at index ${index}: ${header}`);
      }
      // Destination message column
      else if (h.includes('mensaje') && h.includes('destino')) {
        map.destinationMessage = index;
        console.log(`💬 Destination message column found at index ${index}: ${header}`);
      }
      else if (!map.destinationMessage && (h.includes('mensaje') || h.includes('memo') || h.includes('glosa'))) {
        map.destinationMessage = index;
        console.log(`💬 Message column found at index ${index}: ${header}`);
      }
    });

    // If no headers were provided, try to guess based on position
    if (headers.length === 0) {
      map.date = 0;
      map.description = 1;
      map.amount = 2;
      if (this.lines[0]?.split(this.delimiter).length > 3) {
        map.balance = 3;
      }
    }

    return map;
  }

  // Helper: Parse a row into a transaction
  private parseRow(cols: string[], columnMap: Record<string, number>): BankTransaction | null {
    try {
      // Extract date
      let date: string | null = null;
      if (columnMap.date >= 0 && cols[columnMap.date]) {
        date = this.parseDate(cols[columnMap.date]);
      } else {
        // Try to find date in any column
        for (const col of cols) {
          const parsedDate = this.parseDate(col);
          if (parsedDate) {
            date = parsedDate;
            break;
          }
        }
      }

      if (!date) return null;

      // Extract description
      let description = 'Transacción';
      if (columnMap.description >= 0 && cols[columnMap.description]) {
        description = cols[columnMap.description];
      } else {
        // Use the longest text column as description
        const textCols = cols.filter(c => isNaN(parseFloat(c.replace(/[^\d.-]/g, ''))));
        if (textCols.length > 0) {
          description = textCols.reduce((a, b) => a.length > b.length ? a : b);
        }
      }

      // Extract amount and type
      let amount = 0;
      let type: 'debit' | 'credit' = 'debit';

      // Check for separate debit/credit columns
      if (columnMap.debit >= 0 && columnMap.credit >= 0) {
        const debitVal = this.parseAmount(cols[columnMap.debit] || '0');
        const creditVal = this.parseAmount(cols[columnMap.credit] || '0');
        
        if (debitVal > 0) {
          amount = debitVal;
          type = 'debit';
        } else if (creditVal > 0) {
          amount = creditVal;
          type = 'credit';
        }
      }
      // Single amount column
      else if (columnMap.amount >= 0 && cols[columnMap.amount]) {
        const rawAmount = this.parseAmount(cols[columnMap.amount]);
        amount = Math.abs(rawAmount);
        type = rawAmount >= 0 ? 'credit' : 'debit';
      }
      // Try to find amount in any numeric column
      else {
        for (const col of cols) {
          const parsedAmount = this.parseAmount(col);
          if (parsedAmount !== 0) {
            amount = Math.abs(parsedAmount);
            type = parsedAmount >= 0 ? 'credit' : 'debit';
            break;
          }
        }
      }

      if (amount === 0) return null;

      // Extract balance
      let balance: number | undefined;
      if (columnMap.balance >= 0 && cols[columnMap.balance]) {
        balance = this.parseAmount(cols[columnMap.balance]);
      }

      // Extract reference
      let reference: string | undefined;
      if (columnMap.reference >= 0 && cols[columnMap.reference]) {
        reference = cols[columnMap.reference];
      }

      // Extract destination message
      let destinationMessage: string | undefined;
      if (columnMap.destinationMessage >= 0 && cols[columnMap.destinationMessage]) {
        destinationMessage = cols[columnMap.destinationMessage].trim();
      }

      // Extract RUT from specific RUT column (origen/destino)
      let rut: string | undefined;
      if (columnMap.rutColumn >= 0 && cols[columnMap.rutColumn]) {
        const rutValue = cols[columnMap.rutColumn].trim();
        if (rutValue && rutValue !== '' && rutValue !== '-') {
          rut = this.normalizeRut(rutValue);
          if (rut) {
            console.log(`🆔 RUT extracted from column ${columnMap.rutColumn}: ${rutValue} → ${rut}`);
          }
        }
      }

      // If no RUT found in specific column, try to extract from description
      if (!rut) {
        rut = this.extractRutFromDescription(description);
        if (rut) {
          console.log(`🆔 RUT extracted from description: ${rut}`);
        }
      }

      return {
        date,
        description: description.trim(),
        amount,
        type,
        balance,
        reference,
        destinationMessage,
        rut
      };

    } catch (error) {
      return null;
    }
  }

  // Helper: Extract transaction from unstructured line
  private extractTransactionFromLine(line: string): BankTransaction | null {
    // Look for date
    const date = this.parseDate(line);
    if (!date) return null;

    // Look for amounts
    const amounts = this.extractAmounts(line);
    if (amounts.length === 0) return null;

    // Determine transaction type from keywords
    const type = this.detectTransactionType(line);
    
    // Extract description (text between date and amount)
    const description = this.extractDescription(line);

    return {
      date,
      description,
      amount: Math.abs(amounts[0]),
      type
    };
  }

  // Helper: Group related lines
  private groupRelatedLines(): string[][] {
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    
    for (const line of this.lines) {
      if (this.parseDate(line)) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [line];
      } else if (currentGroup.length > 0) {
        currentGroup.push(line);
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  // Helper: Parse transaction from grouped lines
  private parseTransactionGroup(group: string[]): BankTransaction | null {
    const fullText = group.join(' ');
    
    const date = this.parseDate(fullText);
    if (!date) return null;
    
    const amounts = this.extractAmounts(fullText);
    if (amounts.length === 0) return null;
    
    const type = this.detectTransactionType(fullText);
    const description = this.extractDescription(fullText);
    
    return {
      date,
      description,
      amount: Math.abs(amounts[0]),
      type
    };
  }

  // Helper: Parse date from string
  private parseDate(text: string): string | null {
    for (const format of this.dateFormats) {
      const match = text.match(format);
      if (match) {
        let year, month, day;
        
        if (format.source.includes('ene|feb|mar')) {
          // Spanish month names
          day = parseInt(match[1]);
          month = this.parseSpanishMonth(match[2]);
          year = parseInt(match[3]);
        } else if (format.source.startsWith('(\\d{4})')) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // DD-MM-YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Validate date
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    return null;
  }

  // Helper: Parse Spanish month names
  private parseSpanishMonth(monthName: string): number {
    const months: Record<string, number> = {
      'ene': 1, 'enero': 1,
      'feb': 2, 'febrero': 2,
      'mar': 3, 'marzo': 3,
      'abr': 4, 'abril': 4,
      'may': 5, 'mayo': 5,
      'jun': 6, 'junio': 6,
      'jul': 7, 'julio': 7,
      'ago': 8, 'agosto': 8,
      'sep': 9, 'septiembre': 9,
      'oct': 10, 'octubre': 10,
      'nov': 11, 'noviembre': 11,
      'dic': 12, 'diciembre': 12
    };
    
    return months[monthName.toLowerCase()] || 0;
  }

  // Helper: Parse amount from string
  private parseAmount(text: string): number {
    // Remove common currency symbols and separators
    const cleaned = text
      .replace(/[$€£¥₡]/g, '')
      .replace(/\./g, '')   // Remove thousand separators
      .replace(/,/g, '.')   // Convert comma decimal to period
      .replace(/[^\d.-]/g, '');
    
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  // Helper: Extract all amounts from text
  private extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    
    // Look for patterns like: $1,234.56 or 1.234,56 or 1234.56
    const patterns = [
      /\$?\s?([\d,]+\.?\d*)/g,
      /\$?\s?([\d.]+,?\d*)/g,
      /([\d]+)/g
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const amount = this.parseAmount(match[1]);
        if (amount > 0) {
          amounts.push(amount);
        }
      }
      
      if (amounts.length > 0) break;
    }
    
    return amounts;
  }

  // Helper: Detect transaction type from keywords
  private detectTransactionType(text: string): 'debit' | 'credit' {
    const textLower = text.toLowerCase();
    
    const creditKeywords = [
      'abono', 'deposito', 'transferencia recibida', 'ingreso',
      'credito', 'pago recibido', 'reembolso', 'devolucion'
    ];
    
    const debitKeywords = [
      'cargo', 'pago', 'compra', 'giro', 'retiro',
      'debito', 'transferencia enviada', 'comision', 'mantencion'
    ];
    
    for (const keyword of creditKeywords) {
      if (textLower.includes(keyword)) return 'credit';
    }
    
    for (const keyword of debitKeywords) {
      if (textLower.includes(keyword)) return 'debit';
    }
    
    // Default to debit if unknown
    return 'debit';
  }

  // Helper: Extract description from text
  private extractDescription(text: string): string {
    // Remove date and amount patterns to get description
    let description = text;
    
    // Remove dates
    for (const format of this.dateFormats) {
      description = description.replace(format, '');
    }
    
    // Remove amounts
    description = description.replace(/\$?\s?[\d,]+\.?\d*/g, '');
    
    // Clean up
    description = description
      .replace(/\s+/g, ' ')
      .trim();
    
    return description || 'Transacción';
  }

  // Detect bank from content
  private detectBank(): string {
    const contentLower = this.content.toLowerCase();
    
    const banks: Record<string, string[]> = {
      'Banco de Chile': ['banco de chile', 'bchile', 'edwards', 'citi'],
      'Banco BCI': ['bci', 'banco credito', 'tbanc'],
      'Banco Santander': ['santander', 'santander chile'],
      'Banco Estado': ['bancoestado', 'banco estado', 'estado'],
      'Banco Falabella': ['falabella', 'cmr'],
      'Scotiabank': ['scotiabank', 'scotia'],
      'Banco BICE': ['bice', 'banco bice'],
      'Banco Security': ['security', 'banco security'],
      'Banco Itaú': ['itau', 'itaú', 'banco itau'],
      'Banco Consorcio': ['consorcio', 'banco consorcio']
    };
    
    for (const [bankName, keywords] of Object.entries(banks)) {
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          return bankName;
        }
      }
    }
    
    return 'Banco no identificado';
  }

  // Extract account number
  private extractAccountNumber(): string {
    // Look for patterns like: Cuenta: 12345678, N° 12345678, etc.
    const patterns = [
      /cuenta\s*[:nN°#]?\s*([\d\-]+)/i,
      /n[úu]mero\s*[:nN°#]?\s*([\d\-]+)/i,
      /account\s*[:nN°#]?\s*([\d\-]+)/i,
      /cta\s*[:nN°#]?\s*([\d\-]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.content.match(pattern);
      if (match && match[1]) {
        const account = match[1].replace(/\D/g, '');
        if (account.length >= 4) {
          return `****${account.slice(-4)}`;
        }
      }
    }
    
    return 'Cuenta no identificada';
  }

  // Detect period from transactions
  private detectPeriod(transactions: BankTransaction[]): string {
    if (transactions.length === 0) return 'Período no determinado';
    
    const dates = transactions
      .map(t => new Date(t.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    const formatMonth = (date: Date) => {
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };
    
    if (firstDate.getMonth() === lastDate.getMonth() && 
        firstDate.getFullYear() === lastDate.getFullYear()) {
      return formatMonth(firstDate);
    }
    
    return `${formatMonth(firstDate)} - ${formatMonth(lastDate)}`;
  }

  // Enrich transaction with RUT and accounting suggestions
  private async enrichTransaction(transaction: BankTransaction, companyId?: string): Promise<BankTransaction> {
    // Only extract RUT from description if no RUT was already extracted from a specific column
    let rut = transaction.rut; // Preserve existing RUT from column extraction
    if (!rut) {
      rut = this.extractRutFromDescription(transaction.description);
    }
    
    // Verify entity type by cross-referencing with RCV entities database
    let entityInfo: { type?: string; name?: string; accountCode?: string } | null = null;
    if (rut && companyId) {
      entityInfo = await this.verifyEntityWithRCV(rut, companyId);
    }
    
    // Generate accounting suggestion based on transaction type, RUT, and entity info
    const suggestedEntry = this.generateAccountingSuggestion(transaction, rut, entityInfo);
    
    return {
      ...transaction,
      rut,
      suggestedEntry,
      entityInfo // Add entity information to the transaction
    };
  }

  // Extract RUT from transaction description
  private extractRutFromDescription(description: string): string | undefined {
    // RUT patterns: XX.XXX.XXX-X or XXXXXXXX-X
    const rutPatterns = [
      /\b(\d{1,2}\.\d{3}\.\d{3}-[\dkK])\b/,  // Format: 12.345.678-9
      /\b(\d{7,8}-[\dkK])\b/,                  // Format: 12345678-9
      /RUT\s*[:]*\s*(\d{1,2}\.\d{3}\.\d{3}-[\dkK])/i,
      /RUT\s*[:]*\s*(\d{7,8}-[\dkK])/i
    ];
    
    for (const pattern of rutPatterns) {
      const match = description.match(pattern);
      if (match) {
        // Normalize RUT format
        const rut = match[1] || match[0];
        return rut.replace(/\./g, ''); // Remove dots, keep hyphen
      }
    }
    
    return undefined;
  }

  // Generate accounting suggestion based on transaction
  // Verify entity with RCV database
  private async verifyEntityWithRCV(
    rut: string, 
    companyId: string
  ): Promise<{ type?: string; name?: string; accountCode?: string } | null> {
    try {
      console.log(`🔍 Verificando entidad RCV para RUT: ${rut}`);
      
      // Call the RCV entities search API (use relative path for server-side)
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/accounting/rcv-entities/search?company_id=${companyId}&rut=${rut}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`✅ Entidad encontrada: ${data.data.entity_name} (${data.data.entity_type})`);
        return {
          type: data.data.entity_type,
          name: data.data.entity_name,
          accountCode: data.data.account_code
        };
      }
      
      return null;
    } catch (error) {
      console.log(`⚠️ Error verificando entidad RCV: ${error}`);
      return null;
    }
  }

  private generateAccountingSuggestion(transaction: BankTransaction, rut?: string, entityInfo?: { type?: string; name?: string; accountCode?: string } | null): JournalEntrySuggestion {
    const amount = transaction.amount;
    
    // For CREDIT transactions (money coming IN)
    if (transaction.type === 'credit') {
      // Use entity info if available for credits (customers)
      if (entityInfo && (entityInfo.type === 'customer' || entityInfo.type === 'both') && entityInfo.accountCode) {
        console.log(`💡 Usando cuenta específica de cliente: ${entityInfo.accountCode} - ${entityInfo.name}`);
        return {
          debitAccount: '1.1.1.010',
          debitAccountName: 'Banco',
          creditAccount: entityInfo.accountCode,
          creditAccountName: entityInfo.name || 'Cliente Específico',
          amount,
          description: `Cobro a ${entityInfo.name || 'cliente'} - ${transaction.description}`,
          type: 'cliente'
        };
      }
      
      // Default for credits
      return {
        debitAccount: '1.1.1.010',
        debitAccountName: 'Banco',
        creditAccount: '1.1.2.001',
        creditAccountName: 'Clientes',
        amount,
        description: `Cobro a cliente - ${transaction.description}`,
        type: 'cliente'
      };
    }
    
    // For DEBIT transactions (money going OUT)
    else {
      // Priority 1: Use entity info if available
      if (entityInfo && entityInfo.accountCode) {
        const entityTypeName = entityInfo.type === 'supplier' ? 'proveedor' : 
                              entityInfo.type === 'customer' ? 'cliente' : 
                              entityInfo.type;
        console.log(`💡 Usando cuenta específica de ${entityTypeName}: ${entityInfo.accountCode} - ${entityInfo.name}`);
        
        return {
          debitAccount: entityInfo.accountCode,
          debitAccountName: entityInfo.name || 'Entidad Específica',
          creditAccount: '1.1.1.010',
          creditAccountName: 'Banco',
          amount,
          description: `Pago a ${entityInfo.name || entityTypeName} - ${transaction.description}`,
          type: entityInfo.type === 'supplier' ? 'proveedor' : 'otro'
        };
      }
      
      // Priority 2: Check if RUT exists and determine if it's payroll or supplier
      if (rut) {
        const rutNumber = this.extractRutNumber(rut);
        
        // RUT < 40 million = Payroll (natural person)
        if (rutNumber && rutNumber < 40000000) {
          return {
            debitAccount: '4.1.1.001',
            debitAccountName: 'Remuneraciones',
            creditAccount: '1.1.1.010',
            creditAccountName: 'Banco',
            amount,
            description: `Pago de remuneraciones - ${transaction.description}`,
            type: 'remuneracion'
          };
        }
        // RUT >= 40 million = Supplier (company)
        else if (rutNumber && rutNumber >= 40000000) {
          return {
            debitAccount: '2.1.1.001',
            debitAccountName: 'Proveedores por Pagar',
            creditAccount: '1.1.1.010',
            creditAccountName: 'Banco',
            amount,
            description: `Pago a proveedor - ${transaction.description}`,
            type: 'proveedor'
          };
        }
      }
      
      // Default for debits without RUT or unidentifiable RUT
      // Check description for hints
      const descLower = transaction.description.toLowerCase();
      
      if (descLower.includes('sueldo') || descLower.includes('remuneracion') || 
          descLower.includes('nomina') || descLower.includes('planilla')) {
        return {
          debitAccount: '4.1.1.001',
          debitAccountName: 'Remuneraciones',
          creditAccount: '1.1.1.010',
          creditAccountName: 'Banco',
          amount,
          description: `Pago de remuneraciones - ${transaction.description}`,
          type: 'remuneracion'
        };
      }
      
      // Default to supplier payment
      return {
        debitAccount: '2.1.1.001',
        debitAccountName: 'Proveedores por Pagar',
        creditAccount: '1.1.1.010',
        creditAccountName: 'Banco',
        amount,
        description: `Pago a proveedor - ${transaction.description}`,
        type: 'proveedor'
      };
    }
  }

  // Extract numeric part of RUT
  private extractRutNumber(rut: string): number | null {
    const cleanRut = rut.replace(/[^\d]/g, ''); // Remove all non-digits
    const rutNumber = parseInt(cleanRut.slice(0, -1)); // Remove check digit
    return isNaN(rutNumber) ? null : rutNumber;
  }

  // Normalize RUT format
  private normalizeRut(rutValue: string): string | undefined {
    if (!rutValue || rutValue.trim() === '') return undefined;
    
    // Remove extra spaces and normalize
    const cleaned = rutValue.trim();
    
    // Check if it's already a valid RUT format
    const rutPatterns = [
      /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/,  // 12.345.678-9
      /^\d{7,8}-[\dkK]$/                  // 12345678-9
    ];
    
    for (const pattern of rutPatterns) {
      if (pattern.test(cleaned)) {
        // Remove dots and return in format without dots
        return cleaned.replace(/\./g, '');
      }
    }
    
    // Try to extract RUT pattern from string
    const rutMatch = cleaned.match(/(\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK])/);
    if (rutMatch) {
      const rut = rutMatch[1];
      // Normalize to format without dots
      return rut.replace(/\./g, '').replace(/(.{7,8})([\dkK])/, '$1-$2');
    }
    
    return undefined;
  }
}