// ==========================================
// FUNCIONES PARA PLAN DE CUENTAS
// Exportar, importar y gestionar cuentas
// ==========================================

import { Account } from '@/types';

// Exportar plan de cuentas a CSV
export function exportToCSV(accounts: Account[]): string {
  const headers = ['Código', 'Nombre', 'Tipo', 'Nivel', 'Es Detalle', 'Activa'];
  const rows: string[][] = [headers];

  const flattenAccounts = (accs: Account[], parentCode = ''): void => {
    accs.forEach(account => {
      const tipo = {
        asset: 'Activo',
        liability: 'Pasivo',
        equity: 'Patrimonio',
        income: 'Ingreso',
        expense: 'Gasto'
      }[account.account_type];

      rows.push([
        account.code,
        account.name,
        tipo,
        account.level.toString(),
        account.is_detail ? 'Sí' : 'No',
        account.is_active ? 'Sí' : 'No'
      ]);

      if (account.children) {
        flattenAccounts(account.children, account.code);
      }
    });
  };

  flattenAccounts(accounts);
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Exportar plan de cuentas a JSON
export function exportToJSON(accounts: Account[]): string {
  return JSON.stringify(accounts, null, 2);
}

// Parsear CSV a cuentas
export function parseCSV(csvContent: string): Account[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const accounts: Account[] = [];
  const accountMap: { [key: string]: Account } = {};
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    
    const accountType = {
      'Activo': 'asset',
      'Pasivo': 'liability',
      'Patrimonio': 'equity',
      'Ingreso': 'income',
      'Gasto': 'expense'
    }[values[2]] as Account['account_type'];
    
    const account: Account = {
      id: values[0],
      code: values[0],
      name: values[1],
      account_type: accountType || 'asset',
      level: parseInt(values[3]) || 1,
      is_detail: values[4] === 'Sí',
      is_active: values[5] === 'Sí',
      children: []
    };
    
    accountMap[account.code] = account;
    
    // Determinar el padre basado en el código
    const codeParts = account.code.split('.');
    if (codeParts.length === 1) {
      // Cuenta de nivel 1
      accounts.push(account);
    } else {
      // Buscar cuenta padre
      let parentCode = codeParts.slice(0, -1).join('.');
      if (!parentCode) {
        // Si es código como "1.1", el padre es "1"
        parentCode = codeParts[0];
      }
      
      const parent = accountMap[parentCode];
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(account);
        account.parent_id = parent.id;
      }
    }
  }
  
  return accounts;
}

// Validar estructura del plan de cuentas
export function validateChartOfAccounts(accounts: Account[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const usedCodes = new Set<string>();
  
  const validateAccount = (account: Account, level: number = 1): void => {
    // Validar código único
    if (usedCodes.has(account.code)) {
      errors.push(`Código duplicado: ${account.code}`);
    }
    usedCodes.add(account.code);
    
    // Validar nivel
    if (account.level !== level) {
      errors.push(`Nivel incorrecto para cuenta ${account.code}: esperado ${level}, encontrado ${account.level}`);
    }
    
    // Validar tipo de cuenta
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(account.account_type)) {
      errors.push(`Tipo de cuenta inválido para ${account.code}: ${account.account_type}`);
    }
    
    // Validar hijos
    if (account.children) {
      account.children.forEach(child => {
        validateAccount(child, level + 1);
      });
    }
  };
  
  accounts.forEach(account => validateAccount(account));
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Generar código siguiente
export function generateNextCode(parentCode: string, existingCodes: string[]): string {
  const childCodes = existingCodes
    .filter(code => {
      if (parentCode) {
        return code.startsWith(parentCode + '.') && 
               code.split('.').length === parentCode.split('.').length + 1;
      } else {
        return !code.includes('.');
      }
    })
    .sort();
  
  if (childCodes.length === 0) {
    return parentCode ? `${parentCode}.01` : '1';
  }
  
  const lastCode = childCodes[childCodes.length - 1];
  const lastNumber = parseInt(lastCode.split('.').pop() || '0');
  const nextNumber = (lastNumber + 1).toString().padStart(2, '0');
  
  if (parentCode) {
    return `${parentCode}.${nextNumber}`;
  } else {
    return (lastNumber + 1).toString();
  }
}

// Generar template CSV para importar plan de cuentas
export function generateCSVTemplate(): string {
  const headers = ['Código', 'Nombre', 'Tipo', 'Nivel', 'Es Detalle', 'Activa'];
  const ejemplos = [
    ['1', 'ACTIVO', 'Activo', '1', 'No', 'Sí'],
    ['1.1', 'ACTIVO CORRIENTE', 'Activo', '2', 'No', 'Sí'],
    ['1.1.01', 'EFECTIVO Y EQUIVALENTES AL EFECTIVO', 'Activo', '3', 'No', 'Sí'],
    ['1.1.01.001', 'Caja', 'Activo', '4', 'Sí', 'Sí'],
    ['1.1.01.002', 'Banco Estado', 'Activo', '4', 'Sí', 'Sí'],
    ['1.2', 'ACTIVO NO CORRIENTE', 'Activo', '2', 'No', 'Sí'],
    ['2', 'PASIVO', 'Pasivo', '1', 'No', 'Sí'],
    ['2.1', 'PASIVO CORRIENTE', 'Pasivo', '2', 'No', 'Sí'],
    ['2.1.01', 'Proveedores Nacionales', 'Pasivo', '3', 'Sí', 'Sí'],
    ['2.3', 'PATRIMONIO', 'Patrimonio', '2', 'No', 'Sí'],
    ['2.3.01', 'Capital', 'Patrimonio', '3', 'Sí', 'Sí'],
    ['3', 'GASTOS', 'Gasto', '1', 'No', 'Sí'],
    ['3.1', 'GASTOS OPERACIONALES', 'Gasto', '2', 'No', 'Sí'],
    ['3.1.01', 'Costos de Venta', 'Gasto', '3', 'Sí', 'Sí'],
    ['4', 'INGRESOS', 'Ingreso', '1', 'No', 'Sí'],
    ['4.1', 'INGRESOS OPERACIONALES', 'Ingreso', '2', 'No', 'Sí'],
    ['4.1.01', 'Ventas', 'Ingreso', '3', 'Sí', 'Sí']
  ];

  const rows = [
    headers,
    // Agregar fila de instrucciones
    ['# INSTRUCCIONES:', 'Complete las cuentas necesarias siguiendo los ejemplos', 'Tipos válidos: Activo, Pasivo, Patrimonio, Gasto, Ingreso', 'Nivel según jerarquía (1-4)', 'Sí=cuenta de detalle, No=cuenta grupo', 'Sí=activa, No=inactiva'],
    // Agregar ejemplos
    ...ejemplos
  ];
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Descargar archivo
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}