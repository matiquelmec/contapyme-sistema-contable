import { NextRequest, NextResponse } from 'next/server';
import { databaseSimple } from '@/lib/database/databaseSimple';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts/export - Exportar plan de cuentas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const companyId = searchParams.get('company_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = `
      SELECT 
        code,
        name,
        level_type,
        account_type,
        parent_code,
        is_active,
        created_at
      FROM chart_of_accounts
    `;

    const params: string[] = [];
    const conditions: string[] = [];

    if (companyId) {
      conditions.push(`company_id = $${params.length + 1}`);
      params.push(companyId);
    }

    if (!includeInactive) {
      conditions.push('is_active = true');
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY code ASC';

    const { data: accounts, error } = await databaseSimple.query(query, params);

    if (error) {
      console.error('Error fetching accounts for export:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener cuentas para exportar: ' + error.message
      }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay cuentas para exportar'
      }, { status: 404 });
    }

    if (format === 'json') {
      // Exportar como JSON
      const jsonData = {
        export_date: new Date().toISOString(),
        total_accounts: accounts.length,
        accounts: accounts
      };

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="plan_cuentas_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      // Exportar como CSV (por defecto)
      const headers = [
        'Código',
        'Nombre',
        'Tipo de Nivel',
        'Tipo de Cuenta',
        'Código Padre',
        'Activa',
        'Fecha Creación'
      ];

      const csvRows = [
        headers.join(','),
        ...accounts.map(account => [
          `"${account.code}"`,
          `"${account.name}"`,
          `"${account.level_type}"`,
          `"${account.account_type}"`,
          `"${account.parent_code || ''}"`,
          `"${account.is_active ? 'Sí' : 'No'}"`,
          `"${new Date(account.created_at).toLocaleDateString('es-CL')}"`
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="plan_cuentas_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

  } catch (error: any) {
    console.error('Error in export chart of accounts:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST /api/chart-of-accounts/export - Exportar cuentas seleccionadas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_ids, format = 'csv' } = body;

    if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de IDs de cuentas'
      }, { status: 400 });
    }

    const placeholders = account_ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT 
        code,
        name,
        level_type,
        account_type,
        parent_code,
        is_active,
        created_at
      FROM chart_of_accounts
      WHERE id IN (${placeholders})
      ORDER BY code ASC
    `;

    const { data: accounts, error } = await databaseSimple.query(query, account_ids);

    if (error) {
      console.error('Error fetching selected accounts:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener cuentas seleccionadas: ' + error.message
      }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron cuentas con los IDs proporcionados'
      }, { status: 404 });
    }

    if (format === 'json') {
      const jsonData = {
        export_date: new Date().toISOString(),
        total_accounts: accounts.length,
        accounts: accounts
      };

      return NextResponse.json({
        success: true,
        data: jsonData,
        filename: `cuentas_seleccionadas_${new Date().toISOString().split('T')[0]}.json`
      });
    } else {
      const headers = [
        'Código',
        'Nombre', 
        'Tipo de Nivel',
        'Tipo de Cuenta',
        'Código Padre',
        'Activa'
      ];

      const csvRows = [
        headers.join(','),
        ...accounts.map(account => [
          `"${account.code}"`,
          `"${account.name}"`,
          `"${account.level_type}"`,
          `"${account.account_type}"`,
          `"${account.parent_code || ''}"`,
          `"${account.is_active ? 'Sí' : 'No'}"`
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');

      return NextResponse.json({
        success: true,
        data: csvContent,
        filename: `cuentas_seleccionadas_${new Date().toISOString().split('T')[0]}.csv`
      });
    }

  } catch (error: any) {
    console.error('Error in export selected accounts:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}