// Servicio para validación inteligente de asientos contables
// integrado con entidades RCV

interface RCVEntity {
  id: string;
  entity_name: string;
  entity_rut: string;
  entity_type: 'supplier' | 'customer' | 'both';
  account_code: string;
  account_name: string;
  default_tax_rate: number;
  is_tax_exempt: boolean;
}

interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface ValidationSuggestion {
  type: 'missing_account' | 'tax_calculation' | 'balance_check' | 'entity_suggestion';
  level: 'error' | 'warning' | 'suggestion';
  message: string;
  suggested_account?: {
    code: string;
    name: string;
    amount?: number;
    type: 'debit' | 'credit';
  };
  details?: string;
}

export class JournalEntryValidator {
  
  /**
   * Valida un asiento considerando entidades RCV detectadas
   */
  static validateWithRCVEntities(
    lines: JournalEntryLine[],
    description: string,
    document: string,
    detectedEntities: RCVEntity[] = []
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    
    // 1. Validaciones básicas
    suggestions.push(...this.validateBasicBalance(lines));
    
    // 2. Sugerencias específicas por entidades RCV
    if (detectedEntities.length > 0) {
      suggestions.push(...this.validateRCVEntityIntegration(lines, detectedEntities, description));
    }
    
    // 3. Validaciones de IVA automáticas
    suggestions.push(...this.validateTaxAccounts(lines, detectedEntities));
    
    // 4. Sugerencias contextuales
    suggestions.push(...this.generateContextualSuggestions(lines, description, document));
    
    return suggestions;
  }
  
  /**
   * Validaciones básicas de balanceo
   */
  private static validateBasicBalance(lines: JournalEntryLine[]): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    
    const totalDebit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit_amount, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    
    if (difference > 0.01) {
      suggestions.push({
        type: 'balance_check',
        level: 'error',
        message: `Asiento desbalanceado: Diferencia de $${difference.toLocaleString('es-CL')}`,
        details: `Débito: $${totalDebit.toLocaleString('es-CL')} | Crédito: $${totalCredit.toLocaleString('es-CL')}`
      });
    }
    
    return suggestions;
  }
  
  /**
   * Validaciones específicas para entidades RCV
   */
  private static validateRCVEntityIntegration(
    lines: JournalEntryLine[],
    entities: RCVEntity[],
    description: string
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    
    for (const entity of entities) {
      const entityAccountUsed = lines.some(line => line.account_code === entity.account_code);
      
      if (!entityAccountUsed) {
        // Sugerir usar la cuenta de la entidad detectada
        const suggestedAmount = this.estimateAmountFromDescription(description);
        const isCustomerTransaction = this.isCustomerTransaction(description);
        
        suggestions.push({
          type: 'entity_suggestion',
          level: 'suggestion',
          message: `💡 Entidad RCV detectada: ${entity.entity_name}`,
          suggested_account: {
            code: entity.account_code,
            name: entity.account_name,
            amount: suggestedAmount,
            type: entity.entity_type === 'customer' ? 'debit' : 'credit'
          },
          details: `RUT: ${entity.entity_rut} | Tipo: ${entity.entity_type === 'supplier' ? 'Proveedor' : entity.entity_type === 'customer' ? 'Cliente' : 'Ambos'}`
        });
      }
      
      // Validar IVA para la entidad
      if (!entity.is_tax_exempt && entity.default_tax_rate > 0) {
        const hasIVAAccount = this.hasIVAAccount(lines);
        if (!hasIVAAccount) {
          const ivaAccount = entity.entity_type === 'supplier' 
            ? { code: '1.1.2.002', name: 'IVA Crédito Fiscal' }
            : { code: '2.1.2.001', name: 'IVA Débito Fiscal' };
            
          suggestions.push({
            type: 'tax_calculation',
            level: 'warning',
            message: `⚠️ Falta cuenta de IVA para ${entity.entity_name}`,
            suggested_account: {
              code: ivaAccount.code,
              name: ivaAccount.name,
              type: entity.entity_type === 'supplier' ? 'debit' : 'credit'
            },
            details: `Tasa de IVA: ${entity.default_tax_rate}%`
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Validaciones automáticas de cuentas de IVA
   */
  private static validateTaxAccounts(
    lines: JournalEntryLine[],
    entities: RCVEntity[]
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    
    // Buscar líneas que podrían necesitar IVA
    const mainAccountLines = lines.filter(line => 
      line.account_code.startsWith('4.') || // Ingresos
      line.account_code.startsWith('3.') || // Gastos  
      (line.debit_amount > 0 || line.credit_amount > 0)
    );
    
    for (const line of mainAccountLines) {
      const lineAmount = line.debit_amount || line.credit_amount;
      
      if (lineAmount > 0) {
        const possibleIVAAmount = Math.round(lineAmount * 0.19);
        const hasCorrespondingIVA = lines.some(ivaLine => 
          (ivaLine.account_code.includes('2.1.2') || ivaLine.account_code.includes('1.1.2')) &&
          Math.abs((ivaLine.debit_amount || ivaLine.credit_amount) - possibleIVAAmount) < 1
        );
        
        if (!hasCorrespondingIVA && lineAmount > 1000) {
          // Determinar si es ingreso o gasto para sugerir cuenta IVA correcta
          const isIncome = line.account_code.startsWith('4.') || line.credit_amount > 0;
          const ivaAccount = isIncome 
            ? { code: '2.1.2.001', name: 'IVA Débito Fiscal' }
            : { code: '1.1.2.002', name: 'IVA Crédito Fiscal' };
          
          suggestions.push({
            type: 'tax_calculation',
            level: 'warning',
            message: `💰 Posible IVA faltante en cuenta ${line.account_code}`,
            suggested_account: {
              code: ivaAccount.code,
              name: ivaAccount.name,
              amount: possibleIVAAmount,
              type: isIncome ? 'credit' : 'debit'
            },
            details: `Monto base: $${lineAmount.toLocaleString('es-CL')} → IVA 19%: $${possibleIVAAmount.toLocaleString('es-CL')}`
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Sugerencias contextuales basadas en descripción y patrón
   */
  private static generateContextualSuggestions(
    lines: JournalEntryLine[],
    description: string,
    document: string
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    const combinedText = `${description} ${document}`.toLowerCase();
    
    // Detectar tipos de transacción por palabras clave
    const transactionPatterns = {
      factura: { type: 'invoice', accounts: ['1.1.1.001', '4.1.1.001'] },
      compra: { type: 'purchase', accounts: ['3.1.1.001', '2.1.1.001'] },
      venta: { type: 'sale', accounts: ['1.1.1.001', '4.1.1.001'] },
      pago: { type: 'payment', accounts: ['1.1.1.001', '2.1.1.001'] },
      cobro: { type: 'collection', accounts: ['1.1.1.001', '1.1.1.002'] },
      reembolso: { type: 'refund', accounts: ['1.1.1.003', '3.1.1.002'] }
    };
    
    for (const [keyword, pattern] of Object.entries(transactionPatterns)) {
      if (combinedText.includes(keyword)) {
        const hasRelatedAccount = lines.some(line => 
          pattern.accounts.some(acc => line.account_code.startsWith(acc.substring(0, 3)))
        );
        
        if (!hasRelatedAccount) {
          suggestions.push({
            type: 'entity_suggestion',
            level: 'suggestion',
            message: `🔍 Palabra clave "${keyword}" detectada`,
            details: `Considera usar cuentas relacionadas con ${pattern.type}: ${pattern.accounts.join(', ')}`
          });
        }
      }
    }
    
    return suggestions;
  }
  
  // Funciones auxiliares
  private static hasIVAAccount(lines: JournalEntryLine[]): boolean {
    return lines.some(line => 
      line.account_code.includes('1.1.2') || // IVA Crédito Fiscal
      line.account_code.includes('2.1.2')    // IVA Débito Fiscal
    );
  }
  
  private static estimateAmountFromDescription(description: string): number {
    // Buscar números en la descripción que podrían ser montos
    const numberMatches = description.match(/\$?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
    if (numberMatches) {
      const amounts = numberMatches.map(match => 
        parseFloat(match.replace(/[$.,]/g, '').replace(',', '.'))
      ).filter(num => !isNaN(num) && num > 0);
      
      if (amounts.length > 0) {
        return Math.max(...amounts); // Retornar el monto más alto encontrado
      }
    }
    return 0;
  }
  
  private static isCustomerTransaction(description: string): boolean {
    const customerKeywords = ['venta', 'cliente', 'factura', 'cobro', 'ingreso'];
    return customerKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
  }
}