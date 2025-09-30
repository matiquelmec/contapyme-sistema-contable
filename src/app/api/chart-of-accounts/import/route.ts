import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// POST /api/chart-of-accounts/import - Importar plan de cuentas desde CSV/JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, format = 'csv', replace_existing = false, company_id = 'demo-company' } = body;

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Datos para importar son requeridos'
      }, { status: 400 });
    }

    let accounts: any[] = [];
    const errors: string[] = [];

    try {
      if (format === 'json') {
        // Parsear JSON
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        accounts = jsonData.accounts || jsonData;
      } else {
        // Parsear CSV
        accounts = parseCSVData(data);
      }
    } catch (parseError: any) {
      return NextResponse.json({
        success: false,
        error: 'Error al parsear datos: ' + parseError.message
      }, { status: 400 });
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron cuentas válidas para importar'
      }, { status: 400 });
    }

    // Validar estructura de cuentas
    const validationResults = validateAccounts(accounts);
    if (!validationResults.valid) {
      return NextResponse.json({
        success: false,
        error: 'Errores de validación encontrados',
        validation_errors: validationResults.errors
      }, { status: 400 });
    }

    const results = {
      total: accounts.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Si replace_existing es true, desactivar todas las cuentas existentes primero
    if (replace_existing) {
      const deactivateQuery = `UPDATE chart_of_accounts SET is_active = false WHERE company_id = $1`;
      await databaseSimple.query(deactivateQuery, [company_id]);
    }

    // Procesar cada cuenta
    for (const account of accounts) {
      try {
        // Verificar si la cuenta ya existe
        const existingQuery = `SELECT id, is_active FROM chart_of_accounts WHERE code = $1 AND company_id = $2`;
        const { data: existing } = await databaseSimple.query(existingQuery, [account.code, company_id]);

        if (existing && existing.length > 0) {
          if (replace_existing) {
            // Actualizar cuenta existente
            const updateQuery = `
              UPDATE chart_of_accounts 
              SET name = $1, level_type = $2, account_type = $3, parent_code = $4, is_active = $5
              WHERE code = $6 AND company_id = $7
            `;
            
            await databaseSimple.query(updateQuery, [
              account.name,
              account.level_type,
              account.account_type,
              account.parent_code || null,
              account.is_active !== undefined ? account.is_active : true,
              account.code,
              company_id
            ]);
            
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Crear nueva cuenta
          const insertQuery = `
            INSERT INTO chart_of_accounts (
              code, name, level_type, account_type, parent_code, is_active, company_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;

          await databaseSimple.query(insertQuery, [
            account.code,
            account.name,
            account.level_type,
            account.account_type,
            account.parent_code || null,
            account.is_active !== undefined ? account.is_active : true,
            company_id
          ]);

          results.created++;
        }
      } catch (accountError: any) {
        results.errors.push(`Error procesando cuenta ${account.code}: ${accountError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada. Creadas: ${results.created}, Actualizadas: ${results.updated}, Omitidas: ${results.skipped}`,
      results
    });

  } catch (error: any) {
    console.error('Error in import chart of accounts:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    }, { status: 500 });
  }
}

// Función para parsear datos CSV
function parseCSVData(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV debe tener al menos una fila de encabezados y una fila de datos');
  }

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const accounts: any[] = [];

  // Mapeo de columnas esperadas
  const columnMap: Record<string, string> = {
    'código': 'code',
    'codigo': 'code',
    'code': 'code',
    'nombre': 'name',
    'name': 'name',
    'tipo de nivel': 'level_type',
    'nivel': 'level_type',
    'level_type': 'level_type',
    'tipo de cuenta': 'account_type',
    'tipo': 'account_type',
    'account_type': 'account_type',
    'código padre': 'parent_code',
    'codigo padre': 'parent_code',
    'parent_code': 'parent_code',
    'padre': 'parent_code',
    'activa': 'is_active',
    'active': 'is_active',
    'is_active': 'is_active'
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const account: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const fieldName = columnMap[normalizedHeader];
      
      if (fieldName && values[index]) {
        if (fieldName === 'is_active') {
          account[fieldName] = ['sí', 'si', 'yes', 'true', '1'].includes(values[index].toLowerCase());
        } else {
          account[fieldName] = values[index];
        }
      }
    });

    if (account.code && account.name) {
      accounts.push(account);
    }
  }

  return accounts;
}

// Función para validar cuentas
function validateAccounts(accounts: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const usedCodes = new Set<string>();

  const validLevelTypes = ['1er Nivel', '2do Nivel', '3er Nivel', 'Imputable'];
  const validAccountTypes = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO'];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const lineNumber = i + 2; // +2 porque empezamos en línea 2 del CSV

    // Validar campos requeridos
    if (!account.code) {
      errors.push(`Línea ${lineNumber}: Código es requerido`);
      continue;
    }
    if (!account.name) {
      errors.push(`Línea ${lineNumber}: Nombre es requerido`);
      continue;
    }
    if (!account.level_type) {
      errors.push(`Línea ${lineNumber}: Tipo de nivel es requerido`);
      continue;
    }
    if (!account.account_type) {
      errors.push(`Línea ${lineNumber}: Tipo de cuenta es requerido`);
      continue;
    }

    // Validar código único
    if (usedCodes.has(account.code)) {
      errors.push(`Línea ${lineNumber}: Código duplicado: ${account.code}`);
    }
    usedCodes.add(account.code);

    // Validar tipo de nivel
    if (!validLevelTypes.includes(account.level_type)) {
      errors.push(`Línea ${lineNumber}: Tipo de nivel inválido: ${account.level_type}. Valores válidos: ${validLevelTypes.join(', ')}`);
    }

    // Validar tipo de cuenta
    if (!validAccountTypes.includes(account.account_type.toUpperCase())) {
      errors.push(`Línea ${lineNumber}: Tipo de cuenta inválido: ${account.account_type}. Valores válidos: ${validAccountTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}